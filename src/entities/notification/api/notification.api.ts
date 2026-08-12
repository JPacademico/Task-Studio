import { api } from '@/shared/api/client';
import type { AppNotification } from '../model/types';

export const notificationApi = {
  async list(unreadOnly = false): Promise<AppNotification[]> {
    const { data } = await api.get<AppNotification[]>('/notifications', {
      params: unreadOnly ? { unread: 'true' } : undefined,
    });
    return data;
  },

  async unreadCount(): Promise<number> {
    const { data } = await api.get<{ count: number }>('/notifications/unread-count');
    return data.count;
  },

  async markRead(id: string): Promise<void> {
    await api.patch(`/notifications/${id}/read`);
  },

  async markAllRead(): Promise<void> {
    await api.patch('/notifications/read-all');
  },

  async clear(): Promise<void> {
    await api.delete('/notifications');
  },
};
