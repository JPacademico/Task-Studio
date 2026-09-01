import { api } from '@/shared/api/client';
import type { ProjectRepository } from '@/entities/project/model/types';
import type { RepositoryPreview } from '../model/types';

export const githubApi = {
  /**
   * What the import would produce, without producing it.
   *
   * A POST even though it reads: the repository address travels in the body
   * rather than in a query string, so it stays out of access logs and out of
   * the `Referer` of anything the page loads next. See the controller.
   */
  async preview(url: string): Promise<RepositoryPreview> {
    const { data } = await api.post<RepositoryPreview>('/integrations/github/preview', { url });
    return data;
  },

  /**
   * Point an existing project at a repository.
   *
   * Under `/integrations/github/` and not under `/projects/` because the API
   * puts it there: it verifies the address against GitHub before storing it,
   * which is a GitHub operation that happens to name a project. Answers with
   * the link, so the caller writes it into the cache rather than refetching a
   * project it is already holding.
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
