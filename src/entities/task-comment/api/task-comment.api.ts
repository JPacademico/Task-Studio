import { api } from '@/shared/api/client';
import type { TaskComment, TaskThread } from '../model/types';

export const taskCommentApi = {
  /** Every thread the caller can reach, newest activity first. */
  async threads(): Promise<TaskThread[]> {
    const { data } = await api.get<TaskThread[]>('/task-threads');
    return data;
  },

  /** Oldest first. `before` pages back into older comments. */
  async list(taskId: string, params: { before?: string; limit?: number } = {}) {
    const { data } = await api.get<TaskComment[]>(`/tasks/${taskId}/comments`, { params });
    return data;
  },

  async create(taskId: string, payload: { content: string; clientId: string }) {
    const { data } = await api.post<TaskComment>(`/tasks/${taskId}/comments`, payload);
    return data;
  },

  async remove(taskId: string, commentId: string): Promise<void> {
    await api.delete(`/tasks/${taskId}/comments/${commentId}`);
  },

  async markRead(taskId: string): Promise<void> {
    await api.post(`/tasks/${taskId}/comments/read`);
  },
};
