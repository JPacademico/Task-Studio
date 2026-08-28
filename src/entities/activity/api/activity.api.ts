import { api } from '@/shared/api/client';
import type { ActivityPage, RevertResult } from '../model/types';

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

  /**
   * Undo one line.
   *
   * `POST` on a sub-resource rather than `DELETE`, because nothing is deleted:
   * the line stays, marked, with a new one above it naming who reversed what.
   * A `DELETE` would describe the opposite of what happens and would invite
   * exactly the wrong idea of a log that can be edited.
   */
  async revert(projectId: string, activityId: string): Promise<RevertResult> {
    const { data } = await api.post<RevertResult>(
      `/projects/${projectId}/activity/${activityId}/revert`,
    );
    return data;
  },
};
