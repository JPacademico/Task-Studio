import { api } from '@/shared/api/client';
import type { ActivityPage } from '../model/types';

export const activityApi = {
  /**
   * One page of a project's changelog, newest first.
   *
   * Page-numbered rather than cursor-based, because the shared
   * `PaginationQueryDto` on the API is — and a changelog is read the way
   * somebody reads a feed: the top, then a bit more if the answer is not there
   * yet. Nobody deep-links to page 40 of a project's history.
   */
  async list(projectId: string, page = 1, limit = 30): Promise<ActivityPage> {
    const { data } = await api.get<ActivityPage>(`/projects/${projectId}/activity`, {
      params: { page, limit },
    });
    return data;
  },
};
