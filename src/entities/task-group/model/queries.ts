import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { translate } from '@/shared/i18n';
import { taskApi } from '@/entities/task/api/task.api';
import { taskGroupApi } from '../api/task-group.api';
import type {
  CreateTaskGroupPayload,
  GroupedTask,
  TaskGroupBoard,
  UpdateTaskGroupPayload,
} from './types';

/**
 * The project's columns, for the composer's tag picker.
 *
 * `enabled` on the project id, because a **personal** task has no board to be
 * grouped on — the composer opens for both, and asking for the columns of
 * `undefined` would be a request that can only 404.
 *
 * Cached for a minute: columns are a vocabulary somebody sets up once and then
 * types against for weeks, so re-reading them on every composer open is a round
 * trip to learn nothing changed.
 */
export const useTaskGroups = (projectId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.taskGroups.list(projectId ?? ''),
    queryFn: () => taskGroupApi.list(projectId as string),
    enabled: Boolean(projectId),
    staleTime: 60_000,
  });

export const useTaskGroupBoard = (projectId: string | undefined, enabled = true) =>
  useQuery({
    queryKey: queryKeys.taskGroups.board(projectId ?? ''),
    queryFn: () => taskGroupApi.board(projectId as string),
    enabled: Boolean(projectId) && enabled,
    staleTime: 15_000,
  });

/**
 * Everything a column write has to refresh.
 *
 * Both keys, always. The picker reads `list` and the board reads `board`, and a
 * rename that updated one of them would leave the other showing the old word
 * until something else happened to invalidate it — which is the kind of bug
 * that only ever reproduces for the person who did the renaming.
 */
const invalidateGroups = (
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string,
): void => {
  void queryClient.invalidateQueries({ queryKey: queryKeys.taskGroups.list(projectId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.taskGroups.board(projectId) });
};

export const useCreateTaskGroup = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTaskGroupPayload) => taskGroupApi.create(projectId, payload),
    onSuccess: () => invalidateGroups(queryClient, projectId),
    onError: (error) => toast.error(errorMessage(error, translate('groups.createFailed'))),
  });
};

export const useUpdateTaskGroup = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, payload }: { groupId: string; payload: UpdateTaskGroupPayload }) =>
      taskGroupApi.update(projectId, groupId, payload),
    onSuccess: () => invalidateGroups(queryClient, projectId),
    onError: (error) => toast.error(errorMessage(error)),
  });
};

export const useDeleteTaskGroup = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) => taskGroupApi.remove(projectId, groupId),
    onSuccess: (result) => {
      invalidateGroups(queryClient, projectId);
      /*
       * The tasks lost a tag, so every cached task list is now describing them
       * wrongly — a card's chip is part of its shape. Only invalidated when
       * something was actually untagged: deleting an empty column touches no
       * task at all, and refetching the board for it is pure waste.
       */
      if (result.untagged > 0) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      }
      toast.success(translate('groups.deleted', { count: String(result.untagged) }));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
};

/**
 * Reordering, felt on the drop.
 *
 * Optimistic because the gesture *is* the feedback: a column that snaps back to
 * where it was for 200ms and then jumps forward reads as a failed drag, even
 * though it succeeded. The rollback restores the exact previous board rather
 * than re-deriving one, which is the only version that cannot be subtly wrong.
 */
export const useReorderTaskGroups = (projectId: string) => {
  const queryClient = useQueryClient();
  const boardKey = queryKeys.taskGroups.board(projectId);

  return useMutation({
    mutationFn: (orderedIds: string[]) => taskGroupApi.reorder(projectId, orderedIds),

    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey: boardKey });
      const previous = queryClient.getQueryData<TaskGroupBoard>(boardKey);

      queryClient.setQueryData<TaskGroupBoard>(boardKey, (board) => {
        if (!board) return board;

        const byId = new Map(board.groups.map((group) => [group.id, group]));
        const reordered = orderedIds
          .map((id) => byId.get(id))
          .filter((group): group is NonNullable<typeof group> => Boolean(group));

        // Anything the client did not name keeps its place at the end, so a
        // column created by somebody else mid-drag is not dropped from view.
        const named = new Set(orderedIds);
        const rest = board.groups.filter((group) => !named.has(group.id));

        return { ...board, groups: [...reordered, ...rest] };
      });

      return { previous };
    },

    onError: (error, _ids, context) => {
      if (context?.previous) queryClient.setQueryData(boardKey, context.previous);
      toast.error(errorMessage(error));
    },

    onSettled: () => invalidateGroups(queryClient, projectId),
  });
};

/**
 * Moves one task between columns, felt on the drop.
 *
 * ## Why this is not `useUpdateTask`
 *
 * It could be — tagging *is* a task update, and it goes to the same endpoint.
 * What differs is the cache it has to move the card in. `useUpdateTask`
 * invalidates the task lists, which is right for a rename and wrong here: the
 * grouping board keeps its own read (`taskGroups.board`), and invalidating it
 * means the card sits in the column it was dragged out of until a round trip
 * finishes. On a board that is entirely about where cards *are*, that reads as
 * a failed drag.
 *
 * So this patches the board first and lets the request confirm it. The rollback
 * restores the exact previous board rather than re-deriving one, which is the
 * only version that cannot be subtly wrong when two people drag at once.
 */
export const useTagTask = (projectId: string) => {
  const queryClient = useQueryClient();
  const boardKey = queryKeys.taskGroups.board(projectId);

  return useMutation({
    mutationFn: ({ taskId, groupId }: { taskId: string; groupId: string | null }) =>
      taskApi.update(taskId, { groupId }),

    onMutate: async ({ taskId, groupId }) => {
      await queryClient.cancelQueries({ queryKey: boardKey });
      const previous = queryClient.getQueryData<TaskGroupBoard>(boardKey);

      queryClient.setQueryData<TaskGroupBoard>(boardKey, (board) => {
        if (!board) return board;

        // Found before anything is removed, so a drop onto the lane a card is
        // already in is a no-op rather than a disappearance.
        const moving =
          board.groups.flatMap((group) => group.tasks).find((task) => task.id === taskId) ??
          board.untagged.find((task) => task.id === taskId);
        if (!moving) return board;

        const without = (tasks: GroupedTask[]) => tasks.filter((task) => task.id !== taskId);
        const moved: GroupedTask = { ...moving, groupId };

        return {
          ...board,
          groups: board.groups.map((group) => ({
            ...group,
            tasks:
              group.id === groupId ? [...without(group.tasks), moved] : without(group.tasks),
          })),
          untagged: groupId === null ? [...without(board.untagged), moved] : without(board.untagged),
        };
      });

      return { previous };
    },

    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(boardKey, context.previous);
      toast.error(errorMessage(error));
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: boardKey });
      // The chip on the card is part of a task's shape, so every other surface
      // drawing that task is now describing it wrongly.
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
};
