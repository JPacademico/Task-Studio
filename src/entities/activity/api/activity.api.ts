import { api } from '@/shared/api/client';
import type { ActivityPage, RevertResult } from '../model/types';

export const activityApi = {
  /** One page of a project's changelog, newest first. */
  async list(projectId: string, page = 1, limit = 30): Promise<ActivityPage> {
    const { data } = await api.get<ActivityPage>(`/projects/${projectId}/activity`, {
      params: { page, limit },
    });
    return data;
  },

  /**
   * Undo one line. `POST` on a sub-resource rather than `DELETE`, because nothing is deleted: the
   * line stays, marked, with a new one above it naming who reversed what.
   */
  async revert(projectId: string, activityId: string): Promise<RevertResult> {
    const { data } = await api.post<RevertResult>(
      `/projects/${projectId}/activity/${activityId}/revert`,
    );
    return data;
  },
};
