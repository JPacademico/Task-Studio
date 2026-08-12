import { api } from '@/shared/api/client';
import type { ChatMessage, WhiteboardElement } from '../model/types';

export const chatApi = {
  /** Oldest-first, ready to append. */
  async history(projectId: string, params: { limit?: number; before?: string } = {}) {
    const { data } = await api.get<ChatMessage[]>(`/projects/${projectId}/messages`, { params });
    return data;
  },

  async removeMessage(projectId: string, messageId: string): Promise<void> {
    await api.delete(`/projects/${projectId}/messages/${messageId}`);
  },
};

export const whiteboardApi = {
  async scene(projectId: string): Promise<WhiteboardElement[]> {
    const { data } = await api.get<WhiteboardElement[]>(`/projects/${projectId}/whiteboard`);
    return data;
  },

  async clear(projectId: string): Promise<{ cleared: number }> {
    const { data } = await api.post<{ cleared: number }>(
      `/projects/${projectId}/whiteboard/clear`,
    );
    return data;
  },
};
