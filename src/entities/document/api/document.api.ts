import axios from 'axios';

import { api, SLOW_ROUTE_TIMEOUT_MS } from '@/shared/api/client';
import type {
  CreateDocumentPayload,
  DocumentExportFormat,
  ImportDocumentPayload,
  ProjectDocument,
  UpdateDocumentPayload,
} from '../model/types';

/**
 * Makes a failed `responseType: 'blob'` request explain itself.
 *
 * Asking axios for a blob applies to *every* response, including the 400 that
 * says this page is still the uploaded file — so `error.response.data` arrives
 * as a `Blob` holding JSON rather than as the parsed object every other call in
 * the app gets. `errorMessage` then finds no `message` field and falls back to
 * "Request failed with status code 400", which is the least useful sentence
 * available for the one route where the server has something specific to say.
 *
 * Reading the blob and putting the parsed body back where it would have been
 * lets the ordinary error handling downstream work unchanged.
 */
const rethrowWithReadableBody = async (error: unknown): Promise<never> => {
  if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
    try {
      const parsed = JSON.parse(await error.response.data.text()) as {
        message?: string | string[];
      };
      if (parsed.message) error.response.data = parsed;
    } catch {
      // Not JSON after all — the original axios error is still the best there is.
    }
  }

  throw error;
};

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

  /** Registers a file that has already been PUT to storage as a page. */
  async import(payload: ImportDocumentPayload): Promise<ProjectDocument> {
    const { data } = await api.post<ProjectDocument>('/documents/import', payload);
    return data;
  },

  /**
   * The page as a file, in the format the reader picked.
   *
   * A `POST` for a read, because the editor's unsaved buffer travels with it:
   * downloading mid-edit has always given what is on the screen rather than
   * the last save, and a draft is far too big for a query string.
   *
   * Returns a `Blob` rather than saving it. Who turns a blob into a download
   * is the caller's business, and putting `document.createElement('a')` inside
   * an API module would make this the one function here that cannot be called
   * without a DOM.
   */
  async exportAs(
    documentId: string,
    format: DocumentExportFormat,
    content?: string,
  ): Promise<Blob> {
    const { data } = await api
      .post<Blob>(
        `/documents/${documentId}/export`,
        { format, content },
        { responseType: 'blob', timeout: SLOW_ROUTE_TIMEOUT_MS },
      )
      .catch(rethrowWithReadableBody);
    return data;
  },

  /**
   * The uploaded original, fetched through the API rather than from the bucket.
   *
   * Two things fall out of proxying it. The file is behind the same roster
   * check as the page it belongs to, instead of behind an unguessable URL. And
   * the preview can render it from a `blob:` URL, which is why the app's
   * `frame-src` can stay at `'self' blob:` rather than trusting a storage
   * origin — see the CSP in `vercel.json`.
   *
   * `mimeType` is the type the API recorded for the file at upload, and it is
   * re-applied to the blob rather than taken from the response. That is what
   * makes framing the result safe: a `blob:` URL's recorded type is
   * authoritative — the browser does not sniff it — so a blob built as
   * `application/pdf` is handed to the PDF viewer whatever its bytes turn out
   * to say, and can never be interpreted as same-origin HTML.
   *
   * The caller owns the returned object URL and has to revoke it.
   */
  async sourceObjectUrl(documentId: string, mimeType: string): Promise<string> {
    const { data } = await api
      .get<Blob>(`/documents/${documentId}/source`, { responseType: 'blob' })
      .catch(rethrowWithReadableBody);

    return URL.createObjectURL(new Blob([data], { type: mimeType }));
  },
};
