import { SLOW_ROUTE_TIMEOUT_MS, api } from '@/shared/api/client';
import type {
  RepositoryImportPayload,
  RepositoryImportResult,
  RepositoryPreview,
} from '../model/types';

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
   * Create the project.
   *
   * On the slow-route ceiling, because it genuinely is one: five requests to
   * GitHub, then a heavier model reading a whole repository, then a
   * transaction. The default warm ceiling is twenty seconds and this routinely
   * costs more than that while working perfectly — which is exactly the
   * failure `SLOW_ROUTE_TIMEOUT_MS` exists to prevent. The API bounds each of
   * its own steps well inside this, so the server is what decides, and it can
   * say something specific about which step gave up.
   */
  async import(payload: RepositoryImportPayload): Promise<RepositoryImportResult> {
    const { data } = await api.post<RepositoryImportResult>(
      '/integrations/github/import',
      payload,
      { timeout: SLOW_ROUTE_TIMEOUT_MS },
    );
    return data;
  },
};
