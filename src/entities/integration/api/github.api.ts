import { api } from '@/shared/api/client';
import type { ProjectRepository } from '@/entities/project/model/types';
import type { RepositoryPreview } from '../model/types';

export const githubApi = {
  /**
   * What the import would produce, without producing it. A POST even though it reads: the
   * repository address travels in the body rather than in a query string.
   */
  async preview(url: string): Promise<RepositoryPreview> {
    const { data } = await api.post<RepositoryPreview>('/integrations/github/preview', { url });
    return data;
  },

  /**
   * Point an existing project at a repository. Under `/integrations/github/` and not under
   * `/projects/` because the API puts it there.
   */
  async link(projectId: string, url: string): Promise<ProjectRepository> {
    const { data } = await api.post<ProjectRepository>(
      `/integrations/github/projects/${projectId}/repository`,
      { url },
    );
    return data;
  },

  async unlink(projectId: string): Promise<void> {
    await api.delete(`/integrations/github/projects/${projectId}/repository`);
  },
};
