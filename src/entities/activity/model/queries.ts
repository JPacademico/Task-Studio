import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from '@/shared/lib/toast';

import { useRealtime } from '@/app/providers/realtime-provider';
import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { translate } from '@/shared/i18n';
import { activityApi } from '../api/activity.api';
import type { ActivityEntry, ActivityPage, ActivityType } from './types';

/**
 * What a revert can have changed, by the type of line undone: the same caches the domain's own
 * events refresh, rather than every list in the app on every tab.
 */
const refreshAfterRevert = (queryClient: QueryClient, projectId: string, type: ActivityType) => {
  void queryClient.invalidateQueries({ queryKey: queryKeys.activity.list(projectId) });

  if (type.startsWith('TASK_')) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.projects.overview });
  } else if (type.startsWith('DOCUMENT_')) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
  } else if (type.startsWith('MEETING_')) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.meetings.all });
  } else {
    void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
  }
};

/**
 * A project's changelog. One request: the API keeps the latest few lines and deletes the oldest
 * as new ones arrive, so there is nothing further back to page through.
 */
export const useProjectActivity = (projectId: string | undefined, enabled = true) =>
  useQuery({
    queryKey: queryKeys.activity.list(projectId ?? ''),
    queryFn: () => activityApi.list(projectId as string),
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

      queryClient.setQueryData<ActivityPage>(key, (current) => {
        if (!current) return current;
        // A socket can deliver the same event twice across a reconnect; the id is what makes
        // prepending idempotent.
        if (current.items.some((item) => item.id === entry.id)) return current;

        // The API deleted its oldest line to make room for this one; the list drops it too.
        const items = [entry, ...current.items].slice(0, current.limit);
        return { ...current, items, total: items.length };
      });
    };

    const handleChanged = () => {
      void queryClient.invalidateQueries({ queryKey: key });
    };

    // A revert changes two things at once, in two different caches. The changelog gains a line and
    // loses the strike-through state of another; the project gains back a task, or a page.
    const handleReverted = (payload: { type: ActivityType }) => {
      refreshAfterRevert(queryClient, projectId, payload.type);
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
      refreshAfterRevert(queryClient, projectId, result.type);

      // The API's own sentence, not a generic one. See the note above.
      toast.success(result.message);
    },
    onError: (error) => toast.error(errorMessage(error, translate('activity.revertFailed'))),
  });
};
