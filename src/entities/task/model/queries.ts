import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { taskApi } from '../api/task.api';
import type {
  CreateTaskPayload,
  ListTasksParams,
  Task,
  TaskStatus,
  UpdateTaskPayload,
} from './types';

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
      const snapshot = queryClient.getQueriesData<Task[]>({ queryKey: queryKeys.tasks.all });

      queryClient.setQueriesData<Task[]>({ queryKey: queryKeys.tasks.all }, (tasks) =>
        Array.isArray(tasks)
          ? tasks.map((task) =>
              task.id === taskId
                ? {
                    ...task,
                    status,
                    completedAt: status === 'COMPLETED' ? new Date().toISOString() : null,
                    isCompletedByMe: status === 'COMPLETED',
                  }
                : task,
            )
          : tasks,
      );

      return { snapshot };
    },

    onError: (error, _variables, context) => {
      context?.snapshot.forEach(([key, value]) => queryClient.setQueryData(key, value));
      toast.error(errorMessage(error, 'Could not change the status.'));
    },

    onSuccess: (task) => invalidate(task.project.id),
  });
};

export const useToggleMyCompletion = () => {
  const invalidate = useInvalidateTasks();

  return useMutation({
    mutationFn: ({ taskId, completed }: { taskId: string; completed: boolean }) =>
      taskApi.setMyCompletion(taskId, completed),
    onSuccess: (task) => {
      invalidate(task.project.id);
      if (task.status === 'COMPLETED') toast.success(`"${task.title}" is done.`);
    },
    onError: (error) => toast.error(errorMessage(error)),
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
