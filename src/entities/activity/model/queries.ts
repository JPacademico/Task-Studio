import { useEffect } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/shared/lib/toast';

import { useRealtime } from '@/app/providers/realtime-provider';
import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { translate } from '@/shared/i18n';
import { activityApi } from '../api/activity.api';
import type { ActivityEntry, ActivityPage } from './types';

const PAGE_SIZE = 30;

/**
 * A project's changelog, a page at a time. `useInfiniteQuery` rather than a plain one, because this
 * is the only list in the app that genuinely has no ceiling.
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
 * New lines, live, while the tab is open. Prepended into the first cached page rather than
 * invalidating, and that is worth being deliberate about.
 */
export const useProjectActivityRealtime = (
  projectId: string | undefined,
  /** The reader, so a line they wrote themselves comes back with its undo button attached. */
  currentUserId?: string,
): void => {
  const { socket } = useRealtime();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !projectId) return;

    const key = queryKeys.activity.list(projectId);

    const handleNew = (entry: ActivityEntry) => {
      // A line the reader wrote themselves is refetched rather than prepended. `canRevert` is a
      // *per-reader* answer — it depends on whether you are the actor or an admin above them.
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

    // A revert changes two things at once, in two different caches. The changelog gains a line and
    // loses the strike-through state of another; the project gains back a task, or a page.
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
 * Undoing one line of the changelog. Every other mutation in this app writes the cache before the
 * request leaves, because the outcome is knowable — a rename renames, a pin pins.
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
