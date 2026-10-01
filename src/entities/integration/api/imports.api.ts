import { api } from '@/shared/api/client';
import type {
  BoardImportPayload,
  CancelImportResult,
  RepositoryImportJob,
  RepositoryImportPayload,
} from '../model/types';

/**
 * Starting and watching background imports. It used to live under `/integrations/github/imports`,
 * which was honest when there was one importer and became a small lie when there were two.
 */
export const importsApi = {
  /**
   * Start a repository import, and return before any of it has happened. Deliberately on the
   * ordinary timeout rather than the slow-route one: this writes a row and answers.
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
   * Everything live, plus anything that finished in the last quarter of an hour. The tail is what
   * makes a reload harmless in the other direction.
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
