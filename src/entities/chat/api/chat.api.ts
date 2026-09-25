import { api } from '@/shared/api/client';
import type { ChatMessage, WhiteboardElement } from '../model/types';

export const chatApi = {
  /**
   * Oldest-first, ready to append.
   *
   * `before` pages backwards into older history; `after` asks only for what
   * is newer than a message already held. See `loadConversation`.
   */
  async history(
    projectId: string,
    params: { limit?: number; before?: string; after?: string } = {},
  ) {
    const { data } = await api.get<ChatMessage[]>(`/projects/${projectId}/messages`, { params });
    return data;
  },

  async removeMessage(projectId: string, messageId: string): Promise<void> {
    await api.delete(`/projects/${projectId}/messages/${messageId}`);
  },
};

export const whiteboardApi = {
  /** The ink on one page of the whiteboard. */
  async scene(projectId: string, pageIndex = 0): Promise<WhiteboardElement[]> {
    const { data } = await api.get<WhiteboardElement[]>(`/projects/${projectId}/whiteboard`, {
      params: { pageIndex },
    });
    return data;
  },

  /** Wipes one page's ink. Admins only. */
  async clear(projectId: string, pageIndex = 0): Promise<{ cleared: number }> {
    const { data } = await api.post<{ cleared: number }>(
      `/projects/${projectId}/whiteboard/clear`,
      undefined,
      { params: { pageIndex } },
    );
    return data;
  },
};
