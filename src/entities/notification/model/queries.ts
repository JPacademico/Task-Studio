import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/shared/api/query-keys';
import { notificationApi } from '../api/notification.api';

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

export const useNotificationActions = () => {
  const queryClient = useQueryClient();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });

  return {
    markRead: useMutation({ mutationFn: notificationApi.markRead, onSuccess: refresh }),
    markAllRead: useMutation({ mutationFn: notificationApi.markAllRead, onSuccess: refresh }),
    clear: useMutation({ mutationFn: notificationApi.clear, onSuccess: refresh }),
  };
};
