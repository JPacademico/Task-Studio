import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/shared/api/query-keys';
import { notificationApi } from '../api/notification.api';
import type { AppNotification } from '../model/types';

export const useNotifications = (unreadOnly = false) =>
  useQuery({
    queryKey: queryKeys.notifications.list(unreadOnly),
    queryFn: () => notificationApi.list(unreadOnly),
    staleTime: 20_000,
  });

export const useUnreadCount = () =>
  useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: notificationApi.unreadCount,
    // The socket pushes new notifications; this is just the cold-load number.
    staleTime: 60_000,
  });

/**
 * Takes one notification out of every cached list, and off the badge.
 *
 * Both cache entries have to move together, and neither can wait for the
 * server: the panel is open and under the pointer when this runs, so a row
 * that lingers for a round trip reads as a click that did not register — and
 * the usual response to that is a second click on whatever has slid into its
 * place.
 *
 * The badge is only decremented for a notification that was actually unread;
 * dismissing one already marked read must not take the count below what is
 * genuinely outstanding.
 */
const dropNotification = (queryClient: QueryClient, id: string): void => {
  let wasUnread = false;

  for (const [key, data] of queryClient.getQueriesData<AppNotification[]>({
    queryKey: queryKeys.notifications.all,
  })) {
    if (!Array.isArray(data)) continue;

    const match = data.find((notification) => notification.id === id);
    if (match && !match.readAt) wasUnread = true;

    queryClient.setQueryData(
      key,
      data.filter((notification) => notification.id !== id),
    );
  }

  if (!wasUnread) return;

  queryClient.setQueryData<number>(queryKeys.notifications.unreadCount, (count) =>
    Math.max(0, (count ?? 1) - 1),
  );
};

export const useNotificationActions = () => {
  const queryClient = useQueryClient();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });

  return {
    markRead: useMutation({ mutationFn: notificationApi.markRead, onSuccess: refresh }),
    markAllRead: useMutation({ mutationFn: notificationApi.markAllRead, onSuccess: refresh }),

    /*
     * Optimistic, and deliberately quiet on failure.
     *
     * A dismissal that does not reach the server is worth exactly one
     * reconciliation: the row comes back on the next fetch and the user
     * dismisses it again. Rolling it back under the pointer mid-gesture — or
     * worse, toasting about it — would make a disappearing list item flicker
     * back into a list somebody is still clicking through.
     */
    dismiss: useMutation({
      mutationFn: notificationApi.dismiss,
      onMutate: (id: string) => dropNotification(queryClient, id),
      onError: refresh,
    }),

    clear: useMutation({ mutationFn: notificationApi.clear, onSuccess: refresh }),
  };
};
