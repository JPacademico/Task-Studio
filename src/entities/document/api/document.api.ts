import { api } from '@/shared/api/client';
import type {
  CreateDocumentPayload,
  ProjectDocument,
  UpdateDocumentPayload,
} from '../model/types';

export const documentApi = {
  /**
   * Table of contents. Rows carry an excerpt rather than a body.
   *
   * With no `projectId` the server returns the caller's personal pages — the
   * scope is the absence of the parameter rather than a flag, because that is
   * exactly what "this page belongs to no project" means in the row itself.
   */
  async list(projectId?: string, taskId?: string): Promise<ProjectDocument[]> {
    const { data } = await api.get<ProjectDocument[]>('/documents', {
      params: {
        ...(projectId ? { projectId } : {}),
        ...(taskId ? { taskId } : {}),
      },
    });
    return data;
  },

  async detail(documentId: string): Promise<ProjectDocument> {
    const { data } = await api.get<ProjectDocument>(`/documents/${documentId}`);
    return data;
  },

  async create(payload: CreateDocumentPayload): Promise<ProjectDocument> {
    const { data } = await api.post<ProjectDocument>('/documents', payload);
    return data;
  },

  async update(documentId: string, payload: UpdateDocumentPayload): Promise<ProjectDocument> {
    const { data } = await api.patch<ProjectDocument>(`/documents/${documentId}`, payload);
    return data;
  },

  /**
   * Replaces the list of people who may edit this page.
   *
   * The whole set, not a diff — granting and revoking are the same act, and a
   * client that sends what it means cannot get out of step with a server
   * applying a sequence of adds and removes. Returns the page, so the caller
   * gets the recomputed `canEdit` back rather than guessing at it.
   */
  async setEditors(documentId: string, userIds: string[]): Promise<ProjectDocument> {
    const { data } = await api.put<ProjectDocument>(`/documents/${documentId}/editors`, {
      userIds,
    });
    return data;
  },

  async remove(documentId: string): Promise<void> {
    await api.delete(`/documents/${documentId}`);
  },
};
