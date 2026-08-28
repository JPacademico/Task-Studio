import { useEffect } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useRealtime } from '@/app/providers/realtime-provider';
import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { translate } from '@/shared/i18n';
import { activityApi } from '../api/activity.api';
import type { ActivityEntry, ActivityPage } from './types';

const PAGE_SIZE = 30;

/**
 * A project's changelog, a page at a time.
 *
 * `useInfiniteQuery` rather than a plain one, because this is the only list in
 * the app that genuinely has no ceiling: every list elsewhere is bounded by
 * something real — a roster, a board, a shelf of documents — and a changelog
 * is bounded only by how long the project has existed. Fetching all of it to
 * render the last twenty lines would get slower every week the project runs.
 *
 * `staleTime` is deliberately generous. The socket pushes new lines as they
 * happen (see `useProjectActivityRealtime`), so a refetch on focus would be
 * asking for something the app has already been told.
 */
export const useProjectActivity = (projectId: string | undefined, enabled = true) =>
  useInfiniteQuery({
    queryKey: queryKeys.activity.list(projectId ?? ''),
    queryFn: ({ pageParam }) => activityApi.list(projectId as string, pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (last: ActivityPage) => (last.hasMore ? last.page + 1 : undefined),
    enabled: Boolean(projectId) && enabled,
    staleTime: 60_000,
  });

/**
 * New lines, live, while the tab is open.
 *
 * Prepended into the first cached page rather than invalidating, and that is
 * worth being deliberate about: an invalidation would refetch every page the
 * reader has scrolled through — which on a project with a long history is
 * several requests to learn about one new row, and it would also snap their
 * scroll position as the list rebuilt.
 *
 * `activity:changed` is the other half. It is emitted by the operations that
 * write a *batch* — the GitHub import writes a project, three tasks and a
 * shelf of documents at once — where prepending twenty rows one at a time is
 * worse than simply asking again.
 */
export const useProjectActivityRealtime = (
  projectId: string | undefined,
  /**
   * The reader, so a line they wrote themselves comes back with its undo
   * button attached. See `handleNew`.
   *
   * A parameter rather than a lookup, because reaching for the session store
   * from `entities` would be a layer inversion — and the widget that calls
   * this is allowed to know who is signed in. Omitting it costs only the
   * refinement below.
   */
  currentUserId?: string,
): void => {
  const { socket } = useRealtime();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !projectId) return;

    const key = queryKeys.activity.list(projectId);

    const handleNew = (entry: ActivityEntry) => {
      /*
       * A line the reader wrote themselves is refetched rather than prepended.
       *
       * `canRevert` is a *per-reader* answer — it depends on whether you are
       * the actor or an admin above them — and the socket event goes to the
       * whole project room at once, so the API sends `false`, which is the
       * only value that is safe for everybody. That is right for the room and
       * wrong for exactly one person in it: the one who just acted, who is
       * also the one most likely to want to undo it.
       *
       * So their client asks again. It is one request, only when you act while
       * watching the changelog, and it keeps the decision about who may undo
       * what in the single place that is allowed to make it.
       */
      if (currentUserId && entry.actor?.id === currentUserId) {
        void queryClient.invalidateQueries({ queryKey: key });
        return;
      }

      queryClient.setQueryData<{ pages: ActivityPage[]; pageParams: unknown[] }>(
        key,
        (current) => {
          if (!current || current.pages.length === 0) return current;

          const [first, ...rest] = current.pages;
          // A socket can deliver the same event twice across a reconnect; the
          // id is what makes prepending idempotent.
          if (first.items.some((item) => item.id === entry.id)) return current;

          return {
            ...current,
            pages: [
              { ...first, items: [entry, ...first.items], total: first.total + 1 },
              ...rest,
            ],
          };
        },
      );
    };

    const handleChanged = () => {
      void queryClient.invalidateQueries({ queryKey: key });
    };

    /*
     * A revert changes two things at once, in two different caches.
     *
     * The changelog gains a line and loses the strike-through state of
     * another; the project gains back a task, or a page, or a member. This
     * refetches both rather than patching either, and that is the right trade
     * *here* specifically — unlike `activity:new`, a revert is rare, it is
     * never a burst, and the second half of what it changed is a domain this
     * hook has no business reaching into.
     */
    const handleReverted = () => {
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.meetings.all });
    };

    socket.on('activity:new', handleNew);
    socket.on('activity:changed', handleChanged);
    socket.on('activity:reverted', handleReverted);

    return () => {
      socket.off('activity:new', handleNew);
      socket.off('activity:changed', handleChanged);
      socket.off('activity:reverted', handleReverted);
    };
  }, [currentUserId, projectId, queryClient, socket]);
};

/**
 * Undoing one line of the changelog.
 *
 * ## Why nothing is optimistic here
 *
 * Every other mutation in this app writes the cache before the request leaves,
 * because the outcome is knowable — a rename renames, a pin pins. A revert is
 * not knowable from here. Whether it succeeds depends on facts this client
 * does not have: whether the task has been purged since the page was fetched,
 * whether the project has been finished, whether the reader has been demoted
 * in the last minute. The API answers all three, and it answers them
 * *specifically* — "that task was deleted permanently and cannot be brought
 * back" is a sentence worth waiting a moment for.
 *
 * So this waits, and reports what actually happened. The refetch afterwards is
 * broad for the same reason: a revert can restore a task, a page, a member or
 * a meeting, and narrowing it would mean this hook knowing which — which is
 * precisely the coupling the API avoided by emitting one `activity:reverted`
 * rather than each domain's own event.
 */
export const useRevertActivity = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (activityId: string) => activityApi.revert(projectId, activityId),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.activity.list(projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.meetings.all });

      // The API's own sentence, not a generic one. See the note above.
      toast.success(result.message);
    },
    onError: (error) => toast.error(errorMessage(error, translate('activity.revertFailed'))),
  });
};
