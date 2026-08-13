import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { taskApi } from '../api/task.api';
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

/** Everything a task write touches: lists, agenda, dashboards, counters. */
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

    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all });
      const snapshot = queryClient.getQueriesData({ queryKey: queryKeys.tasks.all });
      const now = new Date().toISOString();
      const completed = status === 'COMPLETED';

      patchCachedTask(queryClient, taskId, (task) => ({
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

      return { snapshot };
    },

    onError: (error, _variables, context) => {
      context?.snapshot.forEach(([key, value]) => queryClient.setQueryData(key, value));
      toast.error(errorMessage(error, 'Could not change the status.'));
    },

    onSuccess: (task) => invalidate(task.project.id),
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

    onMutate: async ({ taskId, completed }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all });
      const snapshot = queryClient.getQueriesData({ queryKey: queryKeys.tasks.all });

      const now = new Date().toISOString();

      patchCachedTask(queryClient, taskId, (task) => {
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

      return { snapshot };
    },

    onError: (error, _variables, context) => {
      context?.snapshot.forEach(([key, value]) => queryClient.setQueryData(key, value));
      toast.error(errorMessage(error));
    },

    onSuccess: (task) => {
      invalidate(task.project.id);
      if (task.status === 'COMPLETED') toast.success(`"${task.title}" is done.`);
    },
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
