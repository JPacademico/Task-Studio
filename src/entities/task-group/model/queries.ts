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
 * The scope every write to one project's grouping board shares.
 *
 * React Query runs mutations that name the same `scope.id` one after another
 * instead of concurrently, and that is the half of the fast-drag fix the user
 * cannot see. Two writes to the same board can no longer be in the air at once,
 * so they cannot land out of order — which is what made a quick run of drags
 * settle, flash backwards and settle again.
 *
 * Shared between tagging and ticking rather than one scope each, because the
 * thing being serialised is not the endpoint: it is the board they both rewrite.
 * A tick that overtook the tag of the same card would reintroduce the bug from
 * the other side.
 */
const boardScope = (projectId: string) => ({ id: `task-group-board:${projectId}` });

/**
 * Whether some *other* write to this board is still queued behind this one.
 *
 * This is the visible half of the fast-drag fix. Refetching after every drop
 * asked the server for a board that had heard about drop three and not yet
 * about drop four, and painted that answer over an optimistic state that was
 * already right — the card the user had just moved jumped back to where it came
 * from and then forward again. Waiting for the queue to drain means exactly one
 * refetch happens, at the end, when the server and the screen finally agree.
 *
 * ## Why the threshold is one and not zero
 *
 * Because the mutation asking the question is still in the answer. It is
 * tempting to read `isMutating() > 0` as "somebody else is working", and it is
 * wrong: `isMutating` counts mutations whose status is `pending`, and React
 * Query does not dispatch `success` until *after* every `onSettled` callback
 * has resolved (see `Mutation.execute`). So a mutation asking this from inside
 * its own `onSettled` always counts itself, `> 0` is true even when the queue
 * is otherwise empty, and the refetch it guards would never run at all.
 *
 * `> 1` is the honest test: one is me, more than one is me and somebody behind
 * me — and that somebody will ask again, with a shorter queue, when they are
 * done. The last one out turns the lights off.
 */
const isBoardBusy = (
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string,
): boolean => {
  const scopeId = boardScope(projectId).id;
  return (
    queryClient.isMutating({
      predicate: (mutation) => mutation.options.scope?.id === scopeId,
    }) > 1
  );
};

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
    // The same queue the drags use: two arrow presses in quick succession are
    // the column-level version of the same race. See `boardScope`.
    scope: boardScope(projectId),

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

    onSettled: () => {
      if (isBoardBusy(queryClient, projectId)) return;
      invalidateGroups(queryClient, projectId);
    },
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
 *
 * ## Dragging faster than the network
 *
 * Both halves of that are handled above rather than here: `boardScope` puts the
 * writes in a queue so they cannot land out of order, and `isBoardBusy` holds
 * the refetch until the queue is empty. Without them a run of quick drags
 * produced exactly the symptom optimism exists to prevent — cards snapping back
 * to where they came from a beat after being moved.
 */
export const useTagTask = (projectId: string) => {
  const queryClient = useQueryClient();
  const boardKey = queryKeys.taskGroups.board(projectId);

  return useMutation({
    scope: boardScope(projectId),

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
      // Only the last write of a burst refetches. See `isBoardBusy`.
      if (isBoardBusy(queryClient, projectId)) return;

      void queryClient.invalidateQueries({ queryKey: boardKey });
      // The chip on the card is part of a task's shape, so every other surface
      // drawing that task is now describing it wrongly.
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
};

/**
 * Ticking a card off, from the grouping board.
 *
 * ## Why the board has a tick box at all
 *
 * It did not, and the reasoning was sound: this board is about *where* work
 * sits, the status board is about what state it is in, and giving the grouping
 * board a gesture that changed status would blur the one line that keeps the
 * two from contradicting each other.
 *
 * What that missed is that dragging and ticking are not the same gesture. The
 * danger the original rule guarded against was a *drag* silently completing
 * somebody's work — an accident of a few pixels. A checkbox is deliberate, it
 * is labelled, and it is the single most-used control in the app. Refusing it
 * here meant the reader had to leave the board they were reading to tick a box
 * they could already see.
 *
 * ## Two endpoints behind one box
 *
 * Because "done" means two different things depending on who is asking, and the
 * API already draws that line:
 *
 *   - an **assignee** ticks their own row (`setMyCompletion`). On a shared task
 *     that is a sign-off, not a closure: the task completes itself only when the
 *     last outstanding assignee ticks.
 *   - an **owner or admin who is not assigned** closes the task outright
 *     (`updateStatus`). Somebody has to be able to finish work the person who
 *     left the company was assigned to.
 *
 * The card decides which of the two it is offering and says so in its tooltip;
 * this decides which request that becomes. Nobody else gets a box — the server
 * would refuse the write, and a control that fails is worse than no control.
 */
export const useToggleGroupTaskCompletion = (projectId: string) => {
  const queryClient = useQueryClient();
  const boardKey = queryKeys.taskGroups.board(projectId);

  return useMutation({
    scope: boardScope(projectId),

    mutationFn: ({
      taskId,
      completed,
      asAssignee,
    }: {
      taskId: string;
      completed: boolean;
      /** True when the reader is on the task; false when they are closing it as an admin. */
      asAssignee: boolean;
    }) =>
      asAssignee
        ? taskApi.setMyCompletion(taskId, completed)
        : taskApi.updateStatus(taskId, completed ? 'COMPLETED' : 'TODO'),

    onMutate: async ({ taskId, completed, asAssignee }) => {
      await queryClient.cancelQueries({ queryKey: boardKey });
      const previous = queryClient.getQueryData<TaskGroupBoard>(boardKey);

      const now = new Date().toISOString();

      /*
       * The server's own rule, reproduced — not approximated.
       *
       * An assignee's tick moves one row of the sign-off; the task completes
       * only when that row was the last one outstanding. An admin's tick
       * completes every assignment with it, which is the transaction
       * `updateStatus` runs. Predicting the wrong one here would show a card as
       * done for the length of a round trip and then take it back, which is the
       * exact flicker this whole file is arranged to avoid.
       */
      const patch = (task: GroupedTask): GroupedTask => {
        if (task.id !== taskId) return task;

        const total = task.signOff.total;
        const done = asAssignee
          ? Math.min(total, Math.max(0, task.signOff.done + (completed ? 1 : -1)))
          : completed
            ? total
            : 0;

        const isDone = completed && (!asAssignee || (total > 0 && done === total));

        return {
          ...task,
          signOff: { done, total },
          isCompletedByMe: asAssignee ? completed : task.isCompletedByMe,
          status: isDone ? 'COMPLETED' : task.status === 'COMPLETED' ? 'TODO' : task.status,
          completedAt: isDone ? now : null,
          // A finished task is not late; it was late, and the card says so
          // through `completedAt` instead.
          isLate: isDone ? false : task.isLate,
        };
      };

      queryClient.setQueryData<TaskGroupBoard>(boardKey, (board) =>
        board
          ? {
              ...board,
              groups: board.groups.map((group) => ({
                ...group,
                tasks: group.tasks.map(patch),
              })),
              untagged: board.untagged.map(patch),
            }
          : board,
      );

      return { previous };
    },

    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(boardKey, context.previous);
      toast.error(errorMessage(error));
    },

    onSettled: () => {
      if (isBoardBusy(queryClient, projectId)) return;

      void queryClient.invalidateQueries({ queryKey: boardKey });
      // A completion changes the card on every other surface too.
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
};
