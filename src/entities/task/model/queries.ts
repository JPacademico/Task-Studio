import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { toast } from '@/shared/lib/toast';

import { noteApi } from '@/entities/note/api/note.api';
import { patchUserOverview } from '@/entities/project/model/queries';
import type { UserOverview } from '@/entities/project/model/types';
import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { inWriteOrder, writeSequence } from '@/shared/lib/write-order';
import { taskApi } from '../api/task.api';
import { overviewDeltaFor } from '../lib/overview-delta';
import { useCommitPrompt } from './commit-prompt.store';
import { taskSync } from './sync.store';
import type {
  CreateTaskPayload,
  ListTasksParams,
  Task,
  TaskAgenda,
  TaskStatus,
  UpdateTaskPayload,
} from './types';
import { translate } from '@/shared/i18n';

/**
 * Applies a change to one task everywhere it is currently cached. The same task lives in three
 * differently shaped caches — a flat `Task[]` for every board and list.
 */
const patchCachedTask = (
  queryClient: QueryClient,
  taskId: string,
  patch: (task: Task) => Task,
): void => {
  const applyTo = (task: Task): Task => (task.id === taskId ? patch(task) : task);

  queryClient.setQueriesData({ queryKey: queryKeys.tasks.all }, (data: unknown) => {
    if (!data) return data;

    if (Array.isArray(data)) return (data as Task[]).map(applyTo);

    const agenda = data as TaskAgenda;
    if (Array.isArray(agenda.days)) {
      return {
        days: agenda.days.map((day) => ({ ...day, tasks: day.tasks.map(applyTo) })),
        unscheduled: agenda.unscheduled.map(applyTo),
      } satisfies TaskAgenda;
    }

    const single = data as Task;
    return typeof single.id === 'string' ? applyTo(single) : data;
  });
};

/**
 * The first cached copy of a task, whatever shape the cache holding it is. Needed because an
 * optimistic write has to know what it is changing *from*: the dashboard counters move by a delta.
 */
const findCachedTask = (queryClient: QueryClient, taskId: string): Task | undefined => {
  for (const [, data] of queryClient.getQueriesData({ queryKey: queryKeys.tasks.all })) {
    if (!data) continue;

    if (Array.isArray(data)) {
      const hit = (data as Task[]).find((task) => task.id === taskId);
      if (hit) return hit;
      continue;
    }

    const agenda = data as TaskAgenda;
    if (Array.isArray(agenda.days)) {
      const hit =
        agenda.days.flatMap((day) => day.tasks).find((task) => task.id === taskId) ??
        agenda.unscheduled.find((task) => task.id === taskId);
      if (hit) return hit;
      continue;
    }

    const single = data as Task;
    if (single.id === taskId) return single;
  }

  return undefined;
};

/** What an optimistic task write has to be able to put back. */
interface TaskRollback {
  snapshot: [readonly unknown[], unknown][];
  overview: UserOverview | undefined;
}

/**
 * One optimistic task write: patch every cache, and move the counters with it. Both callers were
 * doing the first half already.
 */
const applyOptimisticTaskWrite = async (
  queryClient: QueryClient,
  taskId: string,
  patch: (task: Task) => Task,
): Promise<TaskRollback> => {
  await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all });

  const snapshot = queryClient.getQueriesData({ queryKey: queryKeys.tasks.all });
  const overview = queryClient.getQueryData<UserOverview>(queryKeys.projects.overview);

  const before = findCachedTask(queryClient, taskId);
  patchCachedTask(queryClient, taskId, patch);
  patchUserOverview(queryClient, overviewDeltaFor(before, before ? patch(before) : undefined));

  return { snapshot, overview };
};

/** Puts back exactly what `applyOptimisticTaskWrite` changed. */
const rollbackTaskWrite = (queryClient: QueryClient, context: TaskRollback | undefined): void => {
  if (!context) return;

  context.snapshot.forEach(([key, value]) => queryClient.setQueryData(key, value));
  queryClient.setQueryData(queryKeys.projects.overview, context.overview);
};

/**
 * Whether a freshly created task belongs in a list that was fetched with `params` — or whether we
 * cannot tell. Three answers, not two.
 */
const matchesListParams = (task: Task, params: ListTasksParams): boolean | 'unknown' => {
  if (params.search || params.lateness || params.from || params.to) return 'unknown';

  if (params.projectId && params.projectId !== task.project?.id) return false;
  if (params.personalOnly && task.project !== null) return false;
  if (params.status && params.status !== task.status) return false;
  if (params.type && params.type !== task.type) return false;
  if (params.priority && params.priority !== task.priority) return false;
  if (params.scope === 'mine' && !task.isMine) return false;
  if (params.pinnedOnly && !task.isPinned) return false;
  if (params.hasNotes && task.notes.length === 0) return false;
  if (params.hideCompleted && task.status === 'COMPLETED') return false;

  return true;
};

/**
 * Puts a newly created task into every cache that should already be showing it. Creating a task
 * used to cost two sequential round trips: the POST.
 */
const insertCachedTask = (queryClient: QueryClient, task: Task): void => {
  for (const [key, data] of queryClient.getQueriesData({ queryKey: queryKeys.tasks.all })) {
    if (!data) continue;

    const [, kind, rawParams] = key as readonly [string, string?, ListTasksParams?];
    const params = rawParams ?? {};

    if (kind === 'list' && Array.isArray(data)) {
      const list = data as Task[];
      if (list.some((entry) => entry.id === task.id)) continue;

      const verdict = matchesListParams(task, params);
      if (verdict !== true) continue;

      // Appended, not prepended: every board and list here reads oldest-first within a column, so
      // the newest card belongs at the bottom.
      queryClient.setQueryData(key, [...list, task]);
      continue;
    }

    if (kind === 'agenda') {
      const agenda = data as TaskAgenda;
      if (!Array.isArray(agenda.days)) continue;

      const verdict = matchesListParams(task, params);
      if (verdict !== true) continue;

      const alreadyThere =
        agenda.days.some((day) => day.tasks.some((entry) => entry.id === task.id)) ||
        agenda.unscheduled.some((entry) => entry.id === task.id);
      if (alreadyThere) continue;

      if (!task.dueAt) {
        queryClient.setQueryData(key, {
          ...agenda,
          unscheduled: [...agenda.unscheduled, task],
        } satisfies TaskAgenda);
        continue;
      }

      // Only into a bucket that already exists. Inventing a new day would mean
      // guessing the agenda's range and its ordering; the refetch knows both.
      const dueDate = task.dueAt.slice(0, 10);
      if (!agenda.days.some((day) => day.date.slice(0, 10) === dueDate)) continue;

      queryClient.setQueryData(key, {
        ...agenda,
        days: agenda.days.map((day) =>
          day.date.slice(0, 10) === dueDate ? { ...day, tasks: [...day.tasks, task] } : day,
        ),
      } satisfies TaskAgenda);
    }
  }
};


/**
 * Every task this client already holds, wherever it came from. The same task object appears in
 * several caches at once — the dashboard's "Up next", the task menu's agenda.
 */
const collectCachedTasks = (queryClient: QueryClient): Map<string, Task> => {
  const byId = new Map<string, Task>();
  const seenAt = new Map<string, number>();

  const offer = (task: Task, updatedAt: number) => {
    if ((seenAt.get(task.id) ?? -1) >= updatedAt) return;
    byId.set(task.id, task);
    seenAt.set(task.id, updatedAt);
  };

  for (const query of queryClient.getQueryCache().findAll({ queryKey: queryKeys.tasks.all })) {
    const data = query.state.data;
    if (!data || query.state.status !== 'success') continue;

    const updatedAt = query.state.dataUpdatedAt;

    if (Array.isArray(data)) {
      for (const task of data as Task[]) offer(task, updatedAt);
      continue;
    }

    const agenda = data as TaskAgenda;
    if (Array.isArray(agenda.days)) {
      for (const day of agenda.days) for (const task of day.tasks) offer(task, updatedAt);
      for (const task of agenda.unscheduled) offer(task, updatedAt);
      continue;
    }

    const single = data as Task;
    if (typeof single.id === 'string') offer(single, updatedAt);
  }

  return byId;
};

/**
 * The subset of what we already hold that a given query would return. Arriving at the task menu or
 * a project board meant a blank surface until its own request landed.
 */
const seedTasksFor = (queryClient: QueryClient, params: ListTasksParams): Task[] | undefined => {
  const matched: Task[] = [];

  for (const task of collectCachedTasks(queryClient).values()) {
    if (matchesListParams(task, params) !== true) continue;
    matched.push(task);
  }

  if (matched.length === 0) return undefined;

  // The server's ordering, so the rows do not visibly reshuffle when the real
  // response replaces this one.
  matched.sort((a, b) => {
    const left = a.dueAt ? Date.parse(a.dueAt) : Number.POSITIVE_INFINITY;
    const right = b.dueAt ? Date.parse(b.dueAt) : Number.POSITIVE_INFINITY;
    if (left !== right) return left - right;
    if (a.order !== b.order) return a.order - b.order;
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });

  return params.limit ? matched.slice(0, params.limit) : matched;
};

/**
 * The same seed, in the agenda's shape. Mirrors `TasksService.agenda` exactly — bucket on `dueAt ??
 * startAt`, one bucket per calendar day, everything undated in `unscheduled`.
 */
const seedAgendaFor = (
  queryClient: QueryClient,
  params: ListTasksParams,
): TaskAgenda | undefined => {
  const seed = seedTasksFor(queryClient, params);
  if (!seed) return undefined;

  const buckets = new Map<string, Task[]>();
  const unscheduled: Task[] = [];

  for (const task of seed) {
    const anchor = task.dueAt ?? task.startAt;
    if (!anchor) {
      unscheduled.push(task);
      continue;
    }
    const day = anchor.slice(0, 10);
    const bucket = buckets.get(day) ?? [];
    bucket.push(task);
    buckets.set(day, bucket);
  }

  const days = [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, tasks]) => ({
      date,
      tasks: tasks.sort(
        (a, b) =>
          Date.parse(a.dueAt ?? a.startAt ?? '0') - Date.parse(b.dueAt ?? b.startAt ?? '0'),
      ),
    }));

  return { days, unscheduled };
};

// How long a task list is trusted without asking again. Raised from 15s, and the reason it can be
// is that this cache is not really kept fresh by polling — it is kept fresh by the socket.
const TASK_STALE_TIME = 60_000;

// Two fallbacks, in order of how close they are to the truth.
export const useTasks = (params: ListTasksParams = {}) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.tasks.list(params),
    queryFn: () => taskApi.list(params),
    staleTime: TASK_STALE_TIME,
    placeholderData: (previous: Task[] | undefined) =>
      previous ?? seedTasksFor(queryClient, params),
  });
};

export const useTaskAgenda = (params: ListTasksParams = {}) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.tasks.agenda(params),
    queryFn: () => taskApi.agenda(params),
    staleTime: TASK_STALE_TIME,
    placeholderData: (previous: TaskAgenda | undefined) =>
      previous ?? seedAgendaFor(queryClient, params),
  });
};

/**
 * One task, opened from a card that was already holding it. The detail modal used to mount, find an
 * empty cache and render a spinner while it fetched.
 */
export const useTask = (taskId: string | undefined) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.tasks.detail(taskId ?? ''),
    queryFn: () => taskApi.detail(taskId as string),
    enabled: Boolean(taskId),
    placeholderData: () => (taskId ? findCachedTask(queryClient, taskId) : undefined),
  });
};

export const useRecycleBin = (projectId?: string) =>
  useQuery({
    queryKey: queryKeys.tasks.recycleBin(projectId),
    queryFn: () => taskApi.recycleBin(projectId),
  });

/**
 * Everything a task write touches: lists, agenda, dashboards, counters. This is reconciliation, not
 * the update.
 */
const useInvalidateTasks = () => {
  const queryClient = useQueryClient();

  return (projectId?: string) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.projects.overview });
    if (projectId) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.dashboard(projectId) });
    }
  };
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateTasks();

  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => taskApi.create(payload),
    onSuccess: (task) => {
      // Show it from the response we already have, then reconcile in the
      // background. See `insertCachedTask` for why both halves are here.
      insertCachedTask(queryClient, task);
      invalidate(task.project?.id);
      toast.success(translate('toast.taskCreated', { title: task.title }));
    },
    onError: (error) => toast.error(errorMessage(error, translate('toast.taskCreateFailed'))),
  });
};

/**
 * Puts tasks the server has just created into every cache showing them. The AI panel accepts
 * suggestions in bulk and gets the created rows back.
 */
export const useAddCreatedTasks = () => {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateTasks();

  return (tasks: Task[]) => {
    for (const task of tasks) insertCachedTask(queryClient, task);
    invalidate(tasks[0]?.project?.id);
  };
};

export const useUpdateTask = () => {
  const invalidate = useInvalidateTasks();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, payload }: { taskId: string; payload: UpdateTaskPayload }) =>
      taskApi.update(taskId, payload),
    onSuccess: (task, { payload }) => {
      invalidate(task.project?.id);
      // A thread switched on or off joins or leaves the thread list.
      if (payload.commentsEnabled !== undefined) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.taskComments.threads });
      }
    },
    onError: (error) => toast.error(errorMessage(error, translate('toast.taskUpdateFailed'))),
  });
};

/**
 * Status changes are optimistic across every cached task list: dragging a card
 * between columns must not wait for a round-trip.
 */
export const useUpdateTaskStatus = () => {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateTasks();

  return useMutation({
    // The request waits its turn; the card does not. Two drags of the same card in quick succession
    // used to produce a visible lie: the card landed where it was dropped.
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      inWriteOrder(`task-status:${taskId}`, () => taskApi.updateStatus(taskId, status)),

    onMutate: async ({ taskId, status }) => {
      const now = new Date().toISOString();
      const completed = status === 'COMPLETED';

      // Stamped before the optimistic write, so every handler below can ask
      // whether it is still describing the move the user last made.
      const token = writeSequence.claim(`task-status:${taskId}`);

      const context = await applyOptimisticTaskWrite(queryClient, taskId, (task) => ({
        ...task,
        status,
        completedAt: completed ? now : null,
        isCompletedByMe: completed,
        // Completing the task completes every assignment with it, and clearing
        // the status re-opens all of them — the same transaction the API runs.
        assignees: task.assignees.map((assignee) => ({
          ...assignee,
          completedAt: completed ? now : null,
        })),
      }));

      return { ...context, token };
    },

    onError: (error, variables, context) => {
      // A superseded write does not roll anything back. Its snapshot is of a board two moves ago,
      // and restoring it would undo the move the user has since made and is currently looking at.
      if (context && !writeSequence.isCurrent(`task-status:${variables.taskId}`, context.token)) {
        return;
      }

      rollbackTaskWrite(queryClient, context);
      toast.error(errorMessage(error, translate('toast.statusFailed')));
    },

    // The server's own copy, written straight in: the refetch below is then reconciliation nobody
    // is waiting on rather than the thing that finally makes the card correct.
    onSuccess: (task, variables, context) => {
      // …unless the answer is already out of date. This is the half of the bug people actually see.
      if (context && !writeSequence.isCurrent(`task-status:${variables.taskId}`, context.token)) {
        return;
      }

      patchCachedTask(queryClient, task.id, () => task);

      // A finished task that named a branch gets one offer to go and open it. Announced from here
      // rather than from the five surfaces that complete a task.
      if (variables.status === 'COMPLETED') useCommitPrompt.getState().present(task);
    },

    // `onSettled`, not `onSuccess`: a failed write has just been rolled back from a snapshot that
    // may itself be stale.
    onSettled: (task, _error, variables, context) => {
      const key = `task-status:${variables.taskId}`;
      if (context && !writeSequence.isCurrent(key, context.token)) return;

      if (context) writeSequence.release(key, context.token);
      invalidate(task?.project?.id);
    },
  });
};

/**
 * Ticking your own box. Optimistic, because this is the single most-used control in the app and it
 * used to be the slowest.
 */
export const useToggleMyCompletion = (currentUserId?: string) => {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateTasks();

  return useMutation({
    // Ordered per row, not across the app. This used to carry `scope: { id: 'task-completion' }` —
    // one queue for every completion in the application.
    mutationFn: ({ taskId, completed }: { taskId: string; completed: boolean }) =>
      inWriteOrder(`task-completion:${taskId}`, () =>
        taskApi.setMyCompletion(taskId, completed),
      ),

    onMutate: async ({ taskId, completed }) => {
      // Locks this task's checkbox for the length of the round trip. Released
      // in `onSettled`, which runs on both success and failure.
      taskSync.begin(taskId);

      const token = writeSequence.claim(`task-completion:${taskId}`);
      const now = new Date().toISOString();

      const context = await applyOptimisticTaskWrite(queryClient, taskId, (task) => {
        const assignees = task.assignees.map((assignee) =>
          assignee.id === currentUserId
            ? { ...assignee, completedAt: completed ? now : null }
            : assignee,
        );

        const everyoneDone =
          assignees.length > 0 && assignees.every((assignee) => assignee.completedAt !== null);

        return {
          ...task,
          assignees,
          isCompletedByMe: completed,
          status: everyoneDone
            ? 'COMPLETED'
            : task.status === 'COMPLETED'
              ? 'IN_PROGRESS'
              : task.status,
          completedAt: everyoneDone ? now : null,
        };
      });

      return { ...context, token };
    },

    onError: (error, variables, context) => {
      // A superseded write's snapshot is of a card two clicks ago; restoring it would undo the
      // state the user is currently looking at.
      if (context && !writeSequence.isCurrent(`task-completion:${variables.taskId}`, context.token)) {
        return;
      }

      rollbackTaskWrite(queryClient, context);
      toast.error(errorMessage(error));
    },

    onSuccess: (task, variables, context) => {
      // …and a superseded write's *answer* is equally out of date. A newer
      // request is already on its way with the one that matches the screen.
      if (context && !writeSequence.isCurrent(`task-completion:${variables.taskId}`, context.token)) {
        return;
      }

      patchCachedTask(queryClient, task.id, () => task);
      if (task.status === 'COMPLETED')
        toast.success(translate('toast.taskDone', { title: task.title }));
    },

    onSettled: (task, _error, variables, context) => {
      taskSync.end(variables.taskId);

      // The refetch belongs to the last write out. A second toggle for the same task may still be
      // in flight.
      const key = `task-completion:${variables.taskId}`;
      if (context && !writeSequence.isCurrent(key, context.token)) return;

      if (context) writeSequence.release(key, context.token);
      invalidate(task?.project?.id);
    },
  });
};

/**
 * The same fix as the project pin, for the same reason. This had the identical shape — write, then
 * invalidate, and nothing on screen moves until both have landed.
 */
export const useToggleTaskPin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, pinned }: { taskId: string; pinned: boolean }) =>
      inWriteOrder(`task-pin:${taskId}`, () => taskApi.setPinned(taskId, pinned)),

    onMutate: ({ taskId, pinned }) => {
      const token = writeSequence.claim(`task-pin:${taskId}`);
      const snapshot = queryClient.getQueriesData({ queryKey: queryKeys.tasks.all });
      patchCachedTask(queryClient, taskId, (task) => ({ ...task, isPinned: pinned }));
      return { snapshot, token };
    },

    onError: (error, variables, context) => {
      // Superseded writes stay quiet — see the same guard on the status
      // mutation above. A pin toggled twice quickly is the same race.
      if (context && !writeSequence.isCurrent(`task-pin:${variables.taskId}`, context.token)) {
        return;
      }

      context?.snapshot.forEach(([key, value]) => queryClient.setQueryData(key, value));
      toast.error(errorMessage(error));
    },

    onSettled: (_data, _error, variables, context) => {
      const key = `task-pin:${variables.taskId}`;
      if (context && !writeSequence.isCurrent(key, context.token)) return;

      if (context) writeSequence.release(key, context.token);
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
};

export const useDeleteTask = () => {
  const invalidate = useInvalidateTasks();

  return useMutation({
    mutationFn: (taskId: string) => taskApi.remove(taskId),
    onSuccess: () => {
      invalidate();
      toast.success(translate('toast.taskBinned'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
};

export const useRestoreTask = () => {
  const invalidate = useInvalidateTasks();

  return useMutation({
    mutationFn: (taskId: string) => taskApi.restore(taskId),
    onSuccess: (task) => {
      invalidate(task.project?.id);
      toast.success(translate('toast.taskRestored', { title: task.title }));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
};

export const usePurgeTask = () => {
  const invalidate = useInvalidateTasks();

  return useMutation({
    mutationFn: (taskId: string) => taskApi.purge(taskId),
    onSuccess: () => {
      invalidate();
      toast.success(translate('toast.taskPurged'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
};

/** The note checklist on one task: add a step, tick one off, tear one up. */
export const useTaskNoteMutations = (taskId: string) => {
  const queryClient = useQueryClient();

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
  };

  return {
    add: useMutation({
      mutationFn: (payload: { content: string; color: string }) =>
        noteApi.create({
          content: payload.content,
          color: payload.color,
          scope: 'TASK',
          taskId,
        }),
      onSuccess: refresh,
      onError: (error) => toast.error(errorMessage(error)),
    }),

    edit: useMutation({
      mutationFn: ({ noteId, content }: { noteId: string; content: string }) =>
        noteApi.update(noteId, { content }),
      onSuccess: refresh,
      onError: (error) => toast.error(errorMessage(error)),
    }),

    /**
     * Ticking a step, felt on the click. Optimistic for the same reason the card's own box is: the
     * tick *is* the feedback.
     */
    toggle: useMutation({
      mutationFn: ({ noteId, isCompleted }: { noteId: string; isCompleted: boolean }) =>
        inWriteOrder(`task-note:${noteId}`, () => noteApi.setCompletion(noteId, isCompleted)),

      onMutate: ({ noteId, isCompleted }) => {
        // Stamped before the write, so every handler below can ask whether it
        // is still describing the tick the user last made.
        const token = writeSequence.claim(`task-note:${noteId}`);
        const snapshot = queryClient.getQueriesData({ queryKey: queryKeys.tasks.all });

        patchCachedTask(queryClient, taskId, (task) => {
          const notes = task.notes.map((note) =>
            note.id === noteId ? { ...note, isCompleted } : note,
          );

          return {
            ...task,
            notes,
            // The badge on the card counts from this, so it has to move with
            // the tick or the sheet and the card behind it disagree.
            noteProgress: {
              total: notes.length,
              done: notes.filter((note) => note.isCompleted).length,
            },
          };
        });

        return { snapshot, token };
      },

      onError: (error, variables, context) => {
        // A superseded write rolls nothing back. Its snapshot is of a sheet two ticks ago, and
        // restoring it would undo the tick the user has since made and is currently looking at.
        if (context && !writeSequence.isCurrent(`task-note:${variables.noteId}`, context.token)) {
          return;
        }

        context?.snapshot.forEach(([key, value]) => queryClient.setQueryData(key, value));
        toast.error(errorMessage(error));
      },

      // The refetch belongs to the last write out. Refetching while a newer tick for the same box
      // is still in flight asks the server for a note it has not finished being told about.
      onSettled: (_data, _error, variables, context) => {
        const key = `task-note:${variables.noteId}`;
        if (context && !writeSequence.isCurrent(key, context.token)) return;

        if (context) writeSequence.release(key, context.token);
        refresh();
      },
    }),

    remove: useMutation({
      mutationFn: (noteId: string) => noteApi.remove(noteId),
      onSuccess: refresh,
      onError: (error) => toast.error(errorMessage(error)),
    }),
  };
};
