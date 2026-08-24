import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';

import { patchUserOverview } from '@/entities/project/model/queries';
import type { UserOverview } from '@/entities/project/model/types';
import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { taskApi } from '../api/task.api';
import { overviewDeltaFor } from '../lib/overview-delta';
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
 * Applies a change to one task everywhere it is currently cached.
 *
 * The same task lives in three differently shaped caches — a flat `Task[]` for
 * every board and list, a `TaskAgenda` of day buckets for the task menu, and a
 * lone `Task` for the detail modal — so an optimistic update that only knew
 * about arrays left the agenda and the open modal showing the old value until
 * the refetch landed. That was most of the lag on ticking a box: the write was
 * optimistic on one surface and pessimistic on the two next to it.
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
 * The first cached copy of a task, whatever shape the cache holding it is.
 *
 * Needed because an optimistic write has to know what it is changing *from*:
 * the dashboard counters move by a delta, and a delta computed against a task
 * we never read is a guess. Every cache holds the same server object, so the
 * first hit is as good as any.
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
 * One optimistic task write: patch every cache, and move the counters with it.
 *
 * Both callers were doing the first half already. The second half is what the
 * dashboard was missing — the tiles are server-computed counts, so they cannot
 * be derived from the patched task and used to sit at the old number until a
 * second round trip replaced them.
 *
 * Returns everything needed to undo it, including the counters: rolling the
 * task back but not the tile it moved would leave the dashboard claiming a
 * completion that failed.
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
 * Whether a freshly created task belongs in a list that was fetched with
 * `params` — or whether we cannot tell.
 *
 * Three answers, not two. `false` means the server would not have returned this
 * task for that query and inserting it would put a card somewhere it does not
 * belong; `'unknown'` means the filter is one this function will not try to
 * reproduce, and the caller should leave that cache alone and let the
 * background refetch settle it.
 *
 * The list is deliberately short. Re-implementing the server's filtering on the
 * client is how the two quietly drift apart, and a card that appears in the
 * wrong column and then vanishes is worse than a card that takes another moment
 * to appear. So only the filters that are a plain equality check on a field the
 * task already carries are answered here; `search`, `lateness`, `from`/`to` and
 * the `team` scope are all conceded to the refetch.
 */
const matchesListParams = (task: Task, params: ListTasksParams): boolean | 'unknown' => {
  if (params.search || params.lateness || params.from || params.to) return 'unknown';
  if (params.scope === 'team') return 'unknown';

  if (params.projectId && params.projectId !== task.project?.id) return false;
  if (params.personalOnly && task.project !== null) return false;
  if (params.status && params.status !== task.status) return false;
  if (params.type && params.type !== task.type) return false;
  if (params.priority && params.priority !== task.priority) return false;
  if (params.scope === 'mine' && !task.isMine) return false;
  if (params.pinnedOnly && !task.isPinned) return false;
  if (params.hasNotes && task.noteCount === 0) return false;
  if (params.hideCompleted && task.status === 'COMPLETED') return false;

  return true;
};

/**
 * Puts a newly created task into every cache that should already be showing it.
 *
 * Creating a task used to cost two sequential round trips: the POST, and then
 * the refetch its invalidation triggered. The card could not appear until both
 * had landed, which on a free-tier API is most of a second on a good day and
 * conspicuous on a bad one — and the second trip was spent re-downloading a
 * list to learn something the first trip had already returned in full.
 *
 * So the server's own response is written straight into the caches and the
 * invalidation is kept behind it. The card is on screen immediately; the
 * refetch that follows confirms it and repairs anything `matchesListParams`
 * declined to judge. Nothing here has to be exactly right for the UI to end up
 * correct — it only has to be right often enough that the common case feels
 * instant.
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

      // Appended, not prepended: every board and list here reads oldest-first
      // within a column, so the newest card belongs at the bottom — which is
      // also where the person who just created it is looking.
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
 * Every task this client already holds, wherever it came from.
 *
 * The same task object appears in several caches at once — the dashboard's
 * "Up next", the task menu's agenda, a project board's list — because the API
 * builds all of them from one `taskInclude` and one `shape()`. So a task the
 * dashboard fetched is, field for field, the task the project board is about
 * to ask for.
 *
 * Deduped on id, keeping whichever copy was fetched most recently: two caches
 * can legitimately disagree if one was invalidated and the other was not, and
 * the newer one is the better guess by definition.
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
 * The subset of what we already hold that a given query would return.
 *
 * ## Why this exists
 *
 * Arriving at the task menu or a project board meant a blank surface until its
 * own request landed — even though the dashboard the user had just come from
 * had already fetched most of the very same rows. The data was in memory; the
 * page simply had no way to reach it, because React Query caches by key and a
 * different filter is a different key.
 *
 * ## What it is, and what it is not
 *
 * It is a *placeholder*: shown immediately, never written to the cache, and
 * always followed by the real request. It is not a substitute for that request
 * and cannot be — this client cannot know about tasks it has never seen, which
 * on a project board is most of them, since the dashboard only ever fetched
 * the user's own. That gap is the honest part: the surfaces that use this also
 * show `PendingTasks` while the fetch completes, so a partial list never
 * pretends to be a whole one.
 *
 * ## Correctness
 *
 * `matchesListParams` is the same predicate that decides where a newly created
 * task belongs, and only a definite `true` is accepted here. A filter it
 * declines to reproduce (`search`, `lateness`, a date window, the `team` scope)
 * seeds nothing at all rather than seeding a guess — showing the wrong rows for
 * a moment is worse than showing none.
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
 * The same seed, in the agenda's shape.
 *
 * Mirrors `TasksService.agenda` exactly — bucket on `dueAt ?? startAt`, one
 * bucket per calendar day, everything undated in `unscheduled` — because a
 * placeholder that groups differently from the response would reshuffle the
 * whole page the moment the real data arrived, which is louder than the blank
 * screen it replaced.
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

/*
 * How long a task list is trusted without asking again.
 *
 * Raised from 15s, and the reason it can be is that this cache is not really
 * kept fresh by polling — it is kept fresh by the socket. `task:created`,
 * `task:updated`, `task:deleted` and `checklist:changed` all invalidate
 * `tasks.all` in the realtime provider, and every mutation writes the server's
 * own response straight into the cache. A short `staleTime` on top of that does
 * not make anything more correct; it just means every navigation between two
 * surfaces that show the same work pays for the same rows again.
 *
 * A minute is comfortably inside the window where the only thing that could
 * have changed without telling us is something changed on another device while
 * this one was disconnected — which `refetchOnReconnect` already covers.
 */
const TASK_STALE_TIME = 60_000;

/*
 * Two fallbacks, in order of how close they are to the truth.
 *
 * 1. The previous data for this same hook — a filter changed, and the rows on
 *    screen are the right *shape*, just the wrong selection. Holding them keeps
 *    a filter feeling like a control rather than a page reload.
 * 2. Failing that, whatever other caches already hold that this query would
 *    have returned. That is what stops a surface the user navigates *to* from
 *    starting empty when the surface they came *from* already fetched the rows.
 *
 * Both are placeholders: neither is cached, and the request goes out either
 * way. `isPlaceholderData` is what the surfaces read to admit the list may
 * still be short.
 */
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
 * One task, opened from a card that was already holding it.
 *
 * The detail modal used to mount, find an empty cache and render a spinner
 * while it fetched — despite the fact that the card the user just clicked was
 * drawn from `tasks.list`, which holds the *same object*. The API builds list
 * rows and detail responses from one `taskInclude` and passes both through the
 * same `shape()`, so there is no field the modal needs that the list does not
 * already have. The wait was for data the app was sitting on.
 *
 * `placeholderData` rather than `initialData`, and the distinction is the whole
 * behaviour. `initialData` is written into the cache and treated as a real
 * fetch, so it would inherit `staleTime` and could leave the modal showing a
 * stale copy without ever going to the network. `placeholderData` is displayed
 * but never cached and never counts as fresh: the request still goes out, and
 * the modal simply has something correct to draw while it does.
 *
 * So the common case — open a card you can see — is instant, and the case that
 * needs the network — a deep link, a task scrolled out of a truncated list —
 * behaves exactly as it did before, because there is nothing cached to stand in.
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
 * Everything a task write touches: lists, agenda, dashboards, counters.
 *
 * This is reconciliation, not the update. The mutations above have already put
 * the correct values on screen — the task in every cache that holds it, and the
 * dashboard counters by delta — so what this refetch is actually for is the
 * things a client cannot know: which rows a filtered list should now contain,
 * and whether anybody else changed something in the meantime.
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
 * Puts tasks the server has just created into every cache showing them.
 *
 * The AI panel accepts suggestions in bulk and gets the created rows back, so
 * it is in exactly the position `useCreateTask` is in: holding authoritative
 * objects while the board behind it still shows the old list. Same treatment —
 * write them in, then let the invalidation reconcile.
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

  return useMutation({
    mutationFn: ({ taskId, payload }: { taskId: string; payload: UpdateTaskPayload }) =>
      taskApi.update(taskId, payload),
    onSuccess: (task) => invalidate(task.project?.id),
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
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      taskApi.updateStatus(taskId, status),

    onMutate: ({ taskId, status }) => {
      const now = new Date().toISOString();
      const completed = status === 'COMPLETED';

      return applyOptimisticTaskWrite(queryClient, taskId, (task) => ({
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
    },

    onError: (error, _variables, context) => {
      rollbackTaskWrite(queryClient, context);
      toast.error(errorMessage(error, translate('toast.statusFailed')));
    },

    // The server's own copy, written straight in: the refetch below is then
    // reconciliation nobody is waiting on rather than the thing that finally
    // makes the card correct.
    onSuccess: (task) => patchCachedTask(queryClient, task.id, () => task),

    // `onSettled`, not `onSuccess`: a failed write has just been rolled back
    // from a snapshot that may itself be stale, and that is exactly when the
    // caches most need to be told to go and look again.
    onSettled: (task) => invalidate(task?.project?.id),
  });
};

/**
 * Ticking your own box.
 *
 * Optimistic, because this is the single most-used control in the app and it
 * used to be the slowest: the box waited for a round trip to the API *and* for
 * the refetch that followed it before anything on screen moved, which on a
 * remote database reads as the click not having registered. The whole rule the
 * server applies is reproduced here — my assignment flips, and the task itself
 * only completes once every assignment has — so the optimistic state is the
 * state the server is about to return, not an approximation of it.
 *
 * `currentUserId` is a parameter rather than a read of the session store
 * because that store lives in `features/`, and an entity that reaches upwards
 * into a feature is the one import that unpicks the whole dependency rule. The
 * pages calling this already hold the user.
 */
export const useToggleMyCompletion = (currentUserId?: string) => {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateTasks();

  return useMutation({
    /*
     * Serialised, which is the half of the fix the user cannot see.
     *
     * React Query runs mutations sharing a `scope.id` one after another instead
     * of concurrently. Two writes for the same row therefore cannot be in the
     * air together, so they cannot land out of order — which is what made a
     * quick tick-untick settle as "done", flash back, and settle again.
     *
     * The scope is a constant rather than one id per task, because `scope` is
     * fixed when the hook is created and cannot read the variables. That is a
     * blunter instrument than it needs to be — ticking two *different* tasks
     * quickly now queues the second behind the first — and it costs nothing
     * observable: both cards changed optimistically on the click, and all that
     * is being ordered is the acknowledgement. Given the box is also disabled
     * for the length of the round trip, a queue of more than one is already the
     * rare case.
     */
    scope: { id: 'task-completion' },

    mutationFn: ({ taskId, completed }: { taskId: string; completed: boolean }) =>
      taskApi.setMyCompletion(taskId, completed),

    onMutate: ({ taskId, completed }) => {
      // Locks this task's checkbox for the length of the round trip. Released
      // in `onSettled`, which runs on both success and failure.
      taskSync.begin(taskId);

      const now = new Date().toISOString();

      return applyOptimisticTaskWrite(queryClient, taskId, (task) => {
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
    },

    onError: (error, _variables, context) => {
      rollbackTaskWrite(queryClient, context);
      toast.error(errorMessage(error));
    },

    onSuccess: (task) => {
      patchCachedTask(queryClient, task.id, () => task);
      if (task.status === 'COMPLETED') toast.success(`"${task.title}" is done.`);
    },

    onSettled: (task, _error, variables) => {
      taskSync.end(variables.taskId);

      /*
       * The refetch waits for this task's queue to drain.
       *
       * A second toggle for the same task may be sitting behind this one.
       * Invalidating now would refetch a server that has heard about the first
       * write and not the second, and paint that answer over an optimistic
       * state that is already correct — the card would visibly flip back and
       * then forward again, which is the exact symptom being fixed.
       *
       * `isMutating` counts only *pending* mutations, and this one has already
       * settled by the time `onSettled` runs — so any count at all means
       * somebody else is still queued for this task and will invalidate when
       * they are done.
       */
      const queuedForThisTask = queryClient.isMutating({
        predicate: (mutation) =>
          (mutation.state.variables as { taskId?: string } | undefined)?.taskId ===
          variables.taskId,
      });

      if (queuedForThisTask > 0) return;
      invalidate(task?.project?.id);
    },
  });
};

/**
 * The same fix as the project pin, for the same reason.
 *
 * This had the identical shape — write, then invalidate, and nothing on screen
 * moves until both have landed — so the pin on a task card was as unresponsive
 * as the one on a project, just less often noticed. `patchCachedTask` already
 * knows how to reach a task in all three cache shapes, so the optimistic half
 * is a two-line change.
 *
 * No overview delta: pinning changes nothing the dashboard counters count.
 */
export const useToggleTaskPin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, pinned }: { taskId: string; pinned: boolean }) =>
      taskApi.setPinned(taskId, pinned),

    onMutate: ({ taskId, pinned }) => {
      const snapshot = queryClient.getQueriesData({ queryKey: queryKeys.tasks.all });
      patchCachedTask(queryClient, taskId, (task) => ({ ...task, isPinned: pinned }));
      return { snapshot };
    },

    onError: (error, _variables, context) => {
      context?.snapshot.forEach(([key, value]) => queryClient.setQueryData(key, value));
      toast.error(errorMessage(error));
    },

    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all }),
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
      toast.success(`"${task.title}" restored.`);
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

export const useChecklistMutations = (taskId: string) => {
  const queryClient = useQueryClient();

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
  };

  return {
    add: useMutation({
      mutationFn: (content: string) => taskApi.addChecklistItem(taskId, content),
      onSuccess: refresh,
      onError: (error) => toast.error(errorMessage(error)),
    }),
    /**
     * Ticking a checklist item, felt on the click.
     *
     * This was the last pessimistic tick left in the app: the box did nothing
     * until the PATCH *and* the refetch it triggered had both landed, which on
     * a list of eight subtasks meant eight visible waits to work through one
     * task. The card's own box has been optimistic for a while; the small one
     * inside the sheet was simply missed.
     *
     * `scope` serialises the writes so that running down a list quickly cannot
     * land them out of order — the same guarantee `useToggleMyCompletion` has,
     * and for the same reason. Scoped to this task rather than globally,
     * because `useChecklistMutations` is already per task and the id is
     * therefore available where `scope` is declared.
     */
    toggle: useMutation({
      scope: { id: `checklist:${taskId}` },

      mutationFn: ({ itemId, isCompleted }: { itemId: string; isCompleted: boolean }) =>
        taskApi.updateChecklistItem(taskId, itemId, { isCompleted }),

      onMutate: ({ itemId, isCompleted }) => {
        const snapshot = queryClient.getQueriesData({ queryKey: queryKeys.tasks.all });

        patchCachedTask(queryClient, taskId, (task) => {
          const checklist = task.checklist.map((item) =>
            item.id === itemId ? { ...item, isCompleted } : item,
          );

          return {
            ...task,
            checklist,
            // The badge on the card counts from this, so it has to move with
            // the tick or the sheet and the card behind it disagree.
            checklistProgress: {
              total: checklist.length,
              done: checklist.filter((item) => item.isCompleted).length,
            },
          };
        });

        return { snapshot };
      },

      onError: (error, _variables, context) => {
        context?.snapshot.forEach(([key, value]) => queryClient.setQueryData(key, value));
        toast.error(errorMessage(error));
      },

      onSettled: refresh,
    }),
    remove: useMutation({
      mutationFn: (itemId: string) => taskApi.removeChecklistItem(taskId, itemId),
      onSuccess: refresh,
      onError: (error) => toast.error(errorMessage(error)),
    }),
    reorder: useMutation({
      mutationFn: (orderedIds: string[]) => taskApi.reorderChecklist(taskId, orderedIds),
      onSuccess: refresh,
      onError: (error) => toast.error(errorMessage(error)),
    }),
  };
};
