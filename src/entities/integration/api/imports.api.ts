import { api } from '@/shared/api/client';
import type {
  BoardImportPayload,
  CancelImportResult,
  RepositoryImportJob,
  RepositoryImportPayload,
} from '../model/types';

/**
 * Starting and watching background imports.
 *
 * ## Why watching moved off the GitHub path
 *
 * It used to live under `/integrations/github/imports`, which was honest when
 * there was one importer and became a small lie when there were two: a Trello
 * import appearing under a `github` path is the kind of thing a client author
 * has to be *told*, rather than being able to read off the route table.
 *
 * Starting one is still source-specific, because the payloads genuinely
 * differ — a repository takes a URL, a board takes an uploaded file — and a
 * single endpoint would take the union of both with a comment explaining which
 * half applies.
 */
export const importsApi = {
  /**
   * Start a repository import, and return before any of it has happened.
   *
   * Deliberately on the ordinary timeout rather than the slow-route one: this
   * writes a row and answers, which is milliseconds on a warm container. The
   * work still takes as long as it ever did — it just happens somewhere the
   * browser is not waiting.
   */
  async startRepository(payload: RepositoryImportPayload): Promise<RepositoryImportJob> {
    const { data } = await api.post<RepositoryImportJob>('/integrations/github/import', payload);
    return data;
  },

  /** The same, for a board export that has already been uploaded. */
  async startBoard(payload: BoardImportPayload): Promise<RepositoryImportJob> {
    const { data } = await api.post<RepositoryImportJob>('/integrations/imports/board', payload);
    return data;
  },

  /**
   * Everything live, plus anything that finished in the last quarter of an hour.
   *
   * The tail is what makes a reload harmless in the other direction: somebody
   * who started an import and immediately refreshed still sees it land, rather
   * than being left to wonder whether it happened.
   */
  async list(): Promise<RepositoryImportJob[]> {
    const { data } = await api.get<RepositoryImportJob[]>('/integrations/imports');
    return data;
  },

  async cancel(jobId: string): Promise<CancelImportResult> {
    const { data } = await api.delete<CancelImportResult>(`/integrations/imports/${jobId}`);
    return data;
  },
};
