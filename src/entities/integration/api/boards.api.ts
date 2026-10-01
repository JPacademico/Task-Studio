import { api } from '@/shared/api/client';
import type {
  BoardChoice,
  BoardProvider,
  BoardStatus,
  BoardSyncStatus,
  ConnectedImportPayload,
  LinkBoardPayload,
  RepositoryImportJob,
} from '../model/types';

const path = (provider: BoardProvider) => provider.toLowerCase();

/** Trello and Jira: the person's accounts, a project's link, and connected imports. */
export const boardsApi = {
  async status(): Promise<BoardStatus> {
    const { data } = await api.get<BoardStatus>('/integrations/boards/status');
    return data;
  },

  /** Where to send the browser to grant access; it comes back to `returnTo`. */
  async connectUrl(provider: BoardProvider, returnTo: string): Promise<string> {
    const { data } = await api.get<{ url: string }>(`/integrations/boards/${path(provider)}/connect`, {
      params: { returnTo },
    });
    return data.url;
  },

  async saveTrelloToken(token: string, state: string): Promise<{ returnTo: string }> {
    const { data } = await api.post<{ returnTo: string }>('/integrations/boards/trello/token', {
      token,
      state,
    });
    return data;
  },

  async disconnect(provider: BoardProvider): Promise<void> {
    await api.delete(`/integrations/boards/${path(provider)}`);
  },

  async choices(provider: BoardProvider): Promise<BoardChoice[]> {
    const { data } = await api.get<BoardChoice[]>(`/integrations/boards/${path(provider)}/boards`);
    return data;
  },

  async projectStatus(projectId: string): Promise<BoardSyncStatus> {
    const { data } = await api.get<BoardSyncStatus>(`/projects/${projectId}/board-sync`);
    return data;
  },

  async link(projectId: string, payload: LinkBoardPayload): Promise<BoardSyncStatus> {
    const { data } = await api.post<BoardSyncStatus>(`/projects/${projectId}/board-sync`, payload);
    return data;
  },

  async run(projectId: string): Promise<BoardSyncStatus> {
    const { data } = await api.post<BoardSyncStatus>(`/projects/${projectId}/board-sync/run`);
    return data;
  },

  async update(projectId: string, autoSync: boolean): Promise<BoardSyncStatus> {
    const { data } = await api.patch<BoardSyncStatus>(`/projects/${projectId}/board-sync`, {
      autoSync,
    });
    return data;
  },

  async unlink(projectId: string): Promise<void> {
    await api.delete(`/projects/${projectId}/board-sync`);
  },

  async startImport(payload: ConnectedImportPayload): Promise<RepositoryImportJob> {
    const { data } = await api.post<RepositoryImportJob>('/integrations/imports/connected', payload);
    return data;
  },
};
