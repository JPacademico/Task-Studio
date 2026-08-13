import { api } from '@/shared/api/client';
import type {
  CreateDocumentPayload,
  ProjectDocument,
  UpdateDocumentPayload,
} from '../model/types';

export const documentApi = {
  /** Table of contents. Rows carry an excerpt rather than a body. */
  async list(projectId: string, taskId?: string): Promise<ProjectDocument[]> {
    const { data } = await api.get<ProjectDocument[]>('/documents', {
      params: { projectId, ...(taskId ? { taskId } : {}) },
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

  async remove(documentId: string): Promise<void> {
    await api.delete(`/documents/${documentId}`);
  },
};
