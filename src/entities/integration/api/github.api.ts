import { api } from '@/shared/api/client';
import type {
  CancelImportResult,
  RepositoryImportJob,
  RepositoryImportPayload,
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
   * Start the import, and return before any of it has happened.
   *
   * ## Why the slow-route timeout came off
   *
   * This used to be on `SLOW_ROUTE_TIMEOUT_MS` — ninety seconds — because it
   * genuinely was one: five requests to GitHub, then a heavier model reading a
   * whole repository, then a transaction, all inside the request. It no longer
   * does any of that. It writes a row and answers, which is a few milliseconds
   * on a warm container, so the ordinary ceiling is not merely adequate but
   * *correct* — a ninety-second budget on a route that should answer instantly
   * is ninety seconds of nobody being told the server is down.
   *
   * The work still takes as long as it ever did. It just happens somewhere the
   * browser is not waiting.
   */
  async start(payload: RepositoryImportPayload): Promise<RepositoryImportJob> {
    const { data } = await api.post<RepositoryImportJob>('/integrations/github/import', payload);
    return data;
  },

  /**
   * Everything live, plus anything that finished in the last quarter of an hour.
   *
   * The tail is what makes a reload harmless in the other direction: somebody
   * who started an import and immediately refreshed still sees it land, rather
   * than being left to wonder whether it happened.
   */
  async listJobs(): Promise<RepositoryImportJob[]> {
    const { data } = await api.get<RepositoryImportJob[]>('/integrations/github/imports');
    return data;
  },

  async cancel(jobId: string): Promise<CancelImportResult> {
    const { data } = await api.delete<CancelImportResult>(
      `/integrations/github/imports/${jobId}`,
    );
    return data;
  },
};
