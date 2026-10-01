import axios from 'axios';

import { api, SLOW_ROUTE_TIMEOUT_MS } from '@/shared/api/client';
import type {
  ArchiveListing,
  BoardUsage,
  CreateDocumentPayload,
  DocumentAsset,
  CreateFigmaPagePayload,
  DocumentExportFormat,
  FigmaBrief,
  FolderContents,
  FigmaExportFormat,
  ImportDocumentPayload,
  ProjectDocument,
  UpdateDocumentPayload,
} from '../model/types';

/**
 * Makes a failed `responseType: 'blob'` request explain itself. Asking axios for a blob applies to
 * *every* response, including the 400 that says this page is still the uploaded file.
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
   * Table of contents. Rows carry an excerpt rather than a body. With no `projectId` the server
   * returns the caller's personal pages.
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

  /**
   * How full this board is, and how full it may get. A request of its own rather than a field on
   * the list, because the two have completely different lifetimes.
   */
  async boardUsage(projectId?: string): Promise<BoardUsage> {
    const { data } = await api.get<BoardUsage>('/documents/board-usage', {
      params: projectId ? { projectId } : {},
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
   * Replaces the list of people who may edit this page. The whole set, not a diff — granting and
   * revoking are the same act.
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
   * What is inside an imported `.zip`. Names and sizes, read from the archive's central directory
   * on the API — nothing is unpacked, here or there.
   */
  async archive(documentId: string): Promise<ArchiveListing> {
    const { data } = await api.get<ArchiveListing>(`/documents/${documentId}/archive`);
    return data;
  },

  /** Every picture inside a written page, as a list to pick from. */
  async assets(documentId: string): Promise<DocumentAsset[]> {
    const { data } = await api.get<DocumentAsset[]>(`/documents/${documentId}/assets`);
    return data;
  },

  /**
   * One of those pictures, as bytes. Fetched rather than linked for the reason the route exists at
   * all: the picture is on the bucket's origin, and a cross-origin `download` attribute is ignored.
   */
  async asset(documentId: string, index: number): Promise<Blob> {
    const { data } = await api
      .get<Blob>(`/documents/${documentId}/assets/${index}`, { responseType: 'blob' })
      .catch(rethrowWithReadableBody);
    return data;
  },

  /**
   * Every picture in a page, as one `.zip`. Built on the API rather than here, and the reasoning
   * lives with the route that does it (`DocumentsService.readAssetsArchive`).
   */
  async assetsArchive(documentId: string): Promise<{ blob: Blob; count: number | null }> {
    const response = await api
      .get<Blob>(`/documents/${documentId}/assets.zip`, { responseType: 'blob' })
      .catch(rethrowWithReadableBody);

    const header = response.headers['x-asset-count'];
    const count = Number(header);

    return {
      blob: response.data,
      count: header !== undefined && Number.isFinite(count) ? count : null,
    };
  },

  /** A folder page's pictures, in the order they were pinned. */
  async folder(documentId: string): Promise<FolderContents> {
    const { data } = await api.get<FolderContents>(`/documents/${documentId}/folder`);
    return data;
  },

  /**
   * One picture out of a folder, as a blob to save. Fetched through the API for the same reason
   * `asset` is: the bucket is another origin, and a cross-origin `download` attribute is ignored.
   */
  async folderItem(documentId: string, itemId: string): Promise<Blob> {
    const { data } = await api
      .get<Blob>(`/documents/${documentId}/folder/${itemId}`, { responseType: 'blob' })
      .catch(rethrowWithReadableBody);
    return data;
  },

  /**
   * The whole folder as one `.zip`, built by the API on request. Two numbers come back with it —
   * how many pictures made it in and how many the folder holds.
   */
  async folderArchive(
    documentId: string,
  ): Promise<{ blob: Blob; count: number | null; total: number | null }> {
    const response = await api
      .get<Blob>(`/documents/${documentId}/folder.zip`, {
        responseType: 'blob',
        timeout: SLOW_ROUTE_TIMEOUT_MS,
      })
      .catch(rethrowWithReadableBody);

    const read = (header: unknown) => {
      const value = Number(header);
      return header !== undefined && Number.isFinite(value) ? value : null;
    };

    return {
      blob: response.data,
      count: read(response.headers['x-asset-count']),
      total: read(response.headers['x-asset-total']),
    };
  },

  /** Takes a picture out of a folder — the board's weight drops at once. */
  async removeFolderItem(documentId: string, itemId: string): Promise<void> {
    await api.delete(`/documents/${documentId}/folder/${itemId}`);
  },

  /**
   * "Is this picture already on this project's boards?", asked with the MD5 of the prepared file
   * before uploading it. A match is used instead of the upload.
   */
  async lookupBoardAsset(
    projectId: string,
    md5: string,
  ): Promise<{ key: string; publicUrl: string } | null> {
    const { data } = await api.get<{ match: { key: string; publicUrl: string } | null }>(
      `/projects/${projectId}/board-assets/${md5}`,
    );
    return data.match;
  },

  /** Puts a Figma file on a project's board as a page. */
  async createFigmaPage(payload: CreateFigmaPagePayload): Promise<ProjectDocument> {
    const { data } = await api.post<ProjectDocument>('/documents/figma', payload);
    return data;
  },

  /**
   * Brings a design page back in step with the file it mirrors. `changed` is the interesting half
   * of the answer.
   */
  async syncFigma(documentId: string): Promise<{ changed: boolean; document: ProjectDocument }> {
    const { data } = await api.post<{ changed: boolean; document: ProjectDocument }>(
      `/documents/${documentId}/figma/sync`,
      {},
      { timeout: SLOW_ROUTE_TIMEOUT_MS },
    );
    return data;
  },

  /**
   * Rendered previews for some of a design's objects. Answers with Figma's own short-lived URLs,
   * which the browser then loads directly — the bytes never come through the API.
   */
  async figmaImages(
    documentId: string,
    nodeIds: string[],
    options: { format?: FigmaExportFormat; scale?: number } = {},
  ): Promise<Record<string, string>> {
    const { data } = await api.get<{ images: Record<string, string> }>(
      `/documents/${documentId}/figma/images`,
      { params: { ids: nodeIds.join(','), ...options } },
    );
    return data.images;
  },

  /**
   * One object out of a design, as bytes to save. Fetched rather than linked, for the reason the
   * API proxies it at all: a cross-origin `download` attribute is ignored.
   */
  async figmaExport(
    documentId: string,
    nodeId: string,
    format: FigmaExportFormat,
    scale?: number,
  ): Promise<Blob> {
    const { data } = await api
      .get<Blob>(`/documents/${documentId}/figma/export`, {
        params: { nodeId, format, ...(scale ? { scale } : {}) },
        responseType: 'blob',
        timeout: SLOW_ROUTE_TIMEOUT_MS,
      })
      .catch(rethrowWithReadableBody);
    return data;
  },

  /**
   * The assistant's reading of a design's structure. Slow-route timeout, like every other call that
   * waits on a model: the client has to be the one that keeps waiting.
   */
  async figmaBrief(documentId: string): Promise<FigmaBrief> {
    const { data } = await api.post<FigmaBrief>(
      `/documents/${documentId}/figma/brief`,
      {},
      { timeout: SLOW_ROUTE_TIMEOUT_MS },
    );
    return data;
  },

  /** The page as a file, in the format the reader picked. */
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

  /** The uploaded original, fetched through the API rather than from the bucket. */
  async sourceObjectUrl(documentId: string, mimeType: string): Promise<string> {
    const { data } = await api
      .get<Blob>(`/documents/${documentId}/source`, { responseType: 'blob' })
      .catch(rethrowWithReadableBody);

    return URL.createObjectURL(new Blob([data], { type: mimeType }));
  },
};
