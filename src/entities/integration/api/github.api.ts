import { api } from '@/shared/api/client';
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
};
