import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { patchUserOverview } from '@/entities/project/model/queries';
import type { UserOverview } from '@/entities/project/model/types';
import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { taskApi } from '../api/task.api';
import { overviewDeltaFor } from '../lib/overview-delta';
import type {
  CreateTaskPayload,
  ListTasksParams,
  Task,
  TaskAgenda,
  TaskStatus,
  UpdateTaskPayload,
} from './types';

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

export const useTasks = (params: ListTasksParams = {}) =>
  useQuery({
    queryKey: queryKeys.tasks.list(params),
    queryFn: () => taskApi.list(params),
    staleTime: 15_000,
  });

export const useTaskAgenda = (params: ListTasksParams = {}) =>
  useQuery({
    queryKey: queryKeys.tasks.agenda(params),
    queryFn: () => taskApi.agenda(params),
    staleTime: 15_000,
  });

export const useTask = (taskId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.tasks.detail(taskId ?? ''),
    queryFn: () => taskApi.detail(taskId as string),
    enabled: Boolean(taskId),
  });

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
  const invalidate = useInvalidateTasks();

  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => taskApi.create(payload),
    onSuccess: (task) => {
      invalidate(task.project.id);
      toast.success(`"${task.title}" created.`);
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not create the task.')),
  });
};

export const useUpdateTask = () => {
  const invalidate = useInvalidateTasks();

  return useMutation({
    mutationFn: ({ taskId, payload }: { taskId: string; payload: UpdateTaskPayload }) =>
      taskApi.update(taskId, payload),
    onSuccess: (task) => invalidate(task.project.id),
    onError: (error) => toast.error(errorMessage(error, 'Could not update the task.')),
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
      toast.error(errorMessage(error, 'Could not change the status.'));
    },

    // The server's own copy, written straight in: the refetch below is then
    // reconciliation nobody is waiting on rather than the thing that finally
    // makes the card correct.
    onSuccess: (task) => patchCachedTask(queryClient, task.id, () => task),

    // `onSettled`, not `onSuccess`: a failed write has just been rolled back
    // from a snapshot that may itself be stale, and that is exactly when the
    // caches most need to be told to go and look again.
    onSettled: (task) => invalidate(task?.project.id),
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
    mutationFn: ({ taskId, completed }: { taskId: string; completed: boolean }) =>
      taskApi.setMyCompletion(taskId, completed),

    onMutate: ({ taskId, completed }) => {
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

    onSettled: (task) => invalidate(task?.project.id),
  });
};

export const useToggleTaskPin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, pinned }: { taskId: string; pinned: boolean }) =>
      taskApi.setPinned(taskId, pinned),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all }),
    onError: (error) => toast.error(errorMessage(error)),
  });
};

export const useDeleteTask = () => {
  const invalidate = useInvalidateTasks();

  return useMutation({
    mutationFn: (taskId: string) => taskApi.remove(taskId),
    onSuccess: () => {
      invalidate();
      toast.success('Task moved to the recycle bin.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
};

export const useRestoreTask = () => {
  const invalidate = useInvalidateTasks();

  return useMutation({
    mutationFn: (taskId: string) => taskApi.restore(taskId),
    onSuccess: (task) => {
      invalidate(task.project.id);
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
      toast.success('Task deleted for good.');
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
    toggle: useMutation({
      mutationFn: ({ itemId, isCompleted }: { itemId: string; isCompleted: boolean }) =>
        taskApi.updateChecklistItem(taskId, itemId, { isCompleted }),
      onSuccess: refresh,
      onError: (error) => toast.error(errorMessage(error)),
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
