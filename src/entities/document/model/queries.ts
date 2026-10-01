import { useCallback, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/shared/lib/toast';

import { useRealtime } from '@/app/providers/realtime-provider';
import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { documentApi } from '../api/document.api';
import type {
  CreateDocumentPayload,
  CreateFigmaPagePayload,
  DocumentBroadcast,
  FolderContents,
  ImportDocumentPayload,
  ProjectDocument,
  UpdateDocumentPayload,
} from './types';
import { translate } from '@/shared/i18n';

/**
 * A text board's table of contents. `undefined` is a scope, not a missing argument: it asks for the
 * caller's own personal pages.
 */
export const useProjectDocuments = (projectId?: string, taskId?: string) =>
  useQuery({
    queryKey: queryKeys.documents.list(projectId, taskId),
    queryFn: () => documentApi.list(projectId, taskId),
    staleTime: 15_000,
  });

/** How full the board is, for the gauge above it. */
export const useBoardUsage = (projectId?: string) =>
  useQuery({
    queryKey: queryKeys.documents.usage(projectId),
    queryFn: () => documentApi.boardUsage(projectId),
    staleTime: 15_000,
  });

export const useProjectDocument = (documentId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.documents.detail(documentId ?? ''),
    queryFn: () => documentApi.detail(documentId as string),
    enabled: Boolean(documentId),
  });

/**
 * Edits one document's row wherever it is cached, without a refetch. Every table of contents is its
 * own query — personal, per project, per task.
 */
const useDocumentListCache = () => {
  const queryClient = useQueryClient();

  // Both helpers are memoised, and the realtime hook below is why. They end up in that effect's
  // dependency array.
  const upsertRow = useCallback(
    (document: ProjectDocument | DocumentBroadcast) => {
      const { content: _content, ...row } = document;

      queryClient.setQueriesData<ProjectDocument[]>(
        { queryKey: queryKeys.documents.all },
        (rows) => {
          if (!Array.isArray(rows)) return rows;

          const index = rows.findIndex((entry) => entry.id === row.id);
          if (index === -1) {
            // A page created by somebody else. Newest first, matching the API's ordering, so it
            // lands where a refetch would have put it.
            return [{ canEdit: false, canManageAccess: false, ...row } as ProjectDocument, ...rows];
          }

          // Spread order matters: a socket row carries no `canEdit`, so the
          // reader's own answer survives the merge. See `DocumentBroadcast`.
          const next = [...rows];
          next[index] = { ...next[index], ...row };
          return next;
        },
      );
    },
    [queryClient],
  );

  const removeRow = useCallback(
    (documentId: string) => {
      queryClient.setQueriesData<ProjectDocument[]>(
        { queryKey: queryKeys.documents.all },
        (rows) => (Array.isArray(rows) ? rows.filter((entry) => entry.id !== documentId) : rows),
      );
      queryClient.removeQueries({ queryKey: queryKeys.documents.detail(documentId) });
    },
    [queryClient],
  );

  /** Re-ask how full the board is, for the mutations that change its weight. */
  const refreshUsage = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: [...queryKeys.documents.all, 'usage'] });
  }, [queryClient]);

  return useMemo(
    () => ({ upsertRow, removeRow, refreshUsage }),
    [refreshUsage, removeRow, upsertRow],
  );
};

export const useCreateDocument = () => {
  const { upsertRow, refreshUsage } = useDocumentListCache();

  return useMutation({
    mutationFn: (payload: CreateDocumentPayload) => documentApi.create(payload),
    // The API returns the finished row, so the table of contents can be edited rather than thrown
    // away and fetched again.
    onSuccess: (document) => {
      upsertRow(document);
      refreshUsage();
    },
    onError: (error) => toast.error(errorMessage(error, translate('doc.createFailed'))),
  });
};

export const useUpdateDocument = () => {
  const queryClient = useQueryClient();
  const { upsertRow } = useDocumentListCache();

  return useMutation({
    mutationFn: ({ documentId, payload }: { documentId: string; payload: UpdateDocumentPayload }) =>
      documentApi.update(documentId, payload),

    onSuccess: (document) => {
      // Both caches are written from the response, and neither is invalidated. This used to seed
      // the detail cache and then invalidate `documents.all`.
      queryClient.setQueryData<ProjectDocument>(queryKeys.documents.detail(document.id), document);
      upsertRow(document);
    },

    onError: (error) => toast.error(errorMessage(error, translate('doc.saveFailed'))),
  });
};

/**
 * Hand the pen to some of the roster, or take it back. The response is the whole page with a
 * recomputed `canEdit` and `editors`.
 */
export const useSetDocumentEditors = () => {
  const queryClient = useQueryClient();
  const { upsertRow } = useDocumentListCache();

  return useMutation({
    mutationFn: ({ documentId, userIds }: { documentId: string; userIds: string[] }) =>
      documentApi.setEditors(documentId, userIds),

    onSuccess: (document) => {
      queryClient.setQueryData<ProjectDocument>(queryKeys.documents.detail(document.id), document);
      upsertRow(document);
      toast.success(translate('doc.editorsSaved'));
    },

    onError: (error) => toast.error(errorMessage(error, translate('doc.editorsFailed'))),
  });
};

/**
 * Registers an uploaded file as a page. Deliberately not folded into `useCreateDocument` with an
 * optional source.
 */
export const useImportDocument = () => {
  const { upsertRow, refreshUsage } = useDocumentListCache();

  return useMutation({
    mutationFn: (payload: ImportDocumentPayload) => documentApi.import(payload),
    onSuccess: (document) => {
      upsertRow(document);
      refreshUsage();
    },
    // No `onError`, deliberately. An import is two requests — a presigned PUT to storage, then this
    // — and only the caller knows which of them the person was waiting on.
  });
};

/**
 * What is inside an imported `.zip`. Cached for the session and never refetched on its own, because
 * the object it derives from is immutable.
 */
export const useDocumentArchive = (documentId: string | undefined, isArchive: boolean) =>
  useQuery({
    queryKey: ['documents', documentId ?? '', 'archive'] as const,
    queryFn: () => documentApi.archive(documentId as string),
    enabled: Boolean(documentId) && isArchive,
    staleTime: Infinity,
    // Not retried. The one failure this route has is an archive the reader on the API could not
    // follow, which is a 400 that will be a 400 next time as well.
    retry: false,
  });

/**
 * The pictures inside a written page. `enabled` is the whole design here: this is asked for by the
 * download menu when it opens, not by the page when it loads.
 */
export const useDocumentAssets = (documentId: string | undefined, enabled: boolean) =>
  useQuery({
    queryKey: ['documents', documentId ?? '', 'assets'] as const,
    queryFn: () => documentApi.assets(documentId as string),
    enabled: Boolean(documentId) && enabled,
    staleTime: 60_000,
    retry: false,
  });

/**
 * A folder page's pictures. Fetched when the folder is opened, never with the table of contents — a
 * whiteboard page can hold dozens of pictures, and the list only needs the count it already has.
 */
export const useDocumentFolder = (documentId: string | undefined, enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.documents.folder(documentId ?? ''),
    queryFn: () => documentApi.folder(documentId as string),
    enabled: Boolean(documentId) && enabled,
    staleTime: 15_000,
  });

/**
 * Takes a picture out of a folder. Optimistic, because it is a pruning gesture — "clear what I do
 * not need" is usually several clicks in a row.
 */
export const useRemoveFolderItem = (documentId: string) => {
  const queryClient = useQueryClient();
  const key = queryKeys.documents.folder(documentId);

  return useMutation({
    mutationFn: (itemId: string) => documentApi.removeFolderItem(documentId, itemId),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<FolderContents>(key);

      queryClient.setQueryData<FolderContents>(key, (current) =>
        current
          ? {
              ...current,
              items: current.items.filter((item) => item.id !== itemId),
              totalBytes:
                current.totalBytes -
                (current.items.find((item) => item.id === itemId)?.size ?? 0),
            }
          : current,
      );

      return { previous };
    },
    onError: (error, _itemId, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.error(errorMessage(error, translate('folder.removeFailed')));
    },
    onSettled: () => {
      // The list's picture count and the board's gauge both moved.
      void queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
    },
  });
};

/** Puts a Figma file on a project's board as a page. */
export const useCreateFigmaPage = () => {
  const { upsertRow, refreshUsage } = useDocumentListCache();

  return useMutation({
    mutationFn: (payload: CreateFigmaPagePayload) => documentApi.createFigmaPage(payload),
    onSuccess: (document) => {
      upsertRow(document);
      // A design page holds a link rather than a file, so it barely moves the needle — but it is a
      // page on the board.
      refreshUsage();
      toast.success(translate('figma.pageAdded'));
    },
    onError: (error) => toast.error(errorMessage(error, translate('figma.pageFailed'))),
  });
};

/**
 * Brings a design page back in step with Figma. Writes the answer into both caches rather than
 * invalidating them: the API hands back the whole page.
 */
export const useSyncFigmaDocument = () => {
  const queryClient = useQueryClient();
  const { upsertRow } = useDocumentListCache();

  return useMutation({
    mutationFn: (documentId: string) => documentApi.syncFigma(documentId),
    onSuccess: ({ changed, document }) => {
      queryClient.setQueryData<ProjectDocument>(queryKeys.documents.detail(document.id), document);
      upsertRow(document);
      toast.success(translate(changed ? 'figma.synced' : 'figma.alreadyCurrent'));
    },
    onError: (error) => toast.error(errorMessage(error, translate('figma.syncFailed'))),
  });
};

/** Rendered previews for one page of a design, as URLs the browser loads. */
export const useFigmaImages = (
  documentId: string | undefined,
  nodeIds: string[],
  version: string | null | undefined,
) =>
  useQuery({
    queryKey: ['documents', documentId ?? '', 'figma-images', version ?? 'none', nodeIds] as const,
    queryFn: () => documentApi.figmaImages(documentId as string, nodeIds),
    enabled: Boolean(documentId) && nodeIds.length > 0,
    // Ten minutes, which is shorter than the URLs live and longer than anybody spends flipping
    // between a design's pages.
    staleTime: 10 * 60_000,
    retry: false,
  });

/**
 * The assistant's reading of a design's structure. A mutation rather than a query, the same call
 * `usePreviewRepository` makes: it fires on a button press, the answer belongs to that press.
 */
export const useFigmaBrief = () =>
  useMutation({
    mutationFn: (documentId: string) => documentApi.figmaBrief(documentId),
    onError: (error) => toast.error(errorMessage(error, translate('figma.briefFailed'))),
  });

export const useDeleteDocument = () => {
  const { removeRow, refreshUsage } = useDocumentListCache();

  return useMutation({
    mutationFn: (documentId: string) => documentApi.remove(documentId),
    onSuccess: (_result, documentId) => {
      removeRow(documentId);
      refreshUsage();
      toast.success(translate('doc.deleted'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
};

/**
 * Accepts a version of a page that arrived over the socket. Separate from the realtime hook because
 * adopting is a *decision*, not an event.
 */
export const useAdoptDocument = () => {
  const queryClient = useQueryClient();
  const { upsertRow } = useDocumentListCache();

  return useCallback(
    (document: DocumentBroadcast) => {
      // Merged, not replaced: the socket row has no permission flags, and this
      // reader's own are the one thing the broadcast could not know.
      queryClient.setQueryData<ProjectDocument>(
        queryKeys.documents.detail(document.id),
        (current) =>
          current
            ? { ...current, ...document }
            : ({ canEdit: false, canManageAccess: false, ...document } as ProjectDocument),
      );
      upsertRow(document);
    },
    [queryClient, upsertRow],
  );
};

/**
 * A project's text board, kept live. The API has emitted `document:created`, `document:updated` and
 * `document:deleted` into the project room since the feature shipped — see `documents.service.ts`.
 */
export const useProjectDocumentsRealtime = (
  projectId: string | undefined,
  options: { openDocumentId?: string; onRemoteEdit?: (document: DocumentBroadcast) => void } = {},
) => {
  const { socket } = useRealtime();
  const queryClient = useQueryClient();
  const { upsertRow, removeRow } = useDocumentListCache();

  const { openDocumentId, onRemoteEdit } = options;

  useEffect(() => {
    if (!socket || !projectId) return;

    const handleUpsert = (document: DocumentBroadcast) => {
      if (document.projectId !== projectId) return;

      upsertRow(document);

      if (document.id === openDocumentId) {
        // Somebody saved the page currently open. Tell the surface; do not
        // touch its buffer.
        onRemoteEdit?.(document);
        return;
      }

      // Merged over what is cached, never replacing it. The event carries no `canEdit` — see
      // `DocumentBroadcast` — so writing it wholesale would blank this reader's own answer.
      queryClient.setQueryData<ProjectDocument>(
        queryKeys.documents.detail(document.id),
        (current) => (current ? { ...current, ...document } : undefined),
      );
    };

    const handleDelete = ({ documentId }: { documentId: string }) => removeRow(documentId);

    // A picture went up on the whiteboard and was filed on this board. The one event here that
    // carries no row: the folder is written by the whiteboard's side of the API.
    const handleFolder = (event: { projectId: string; documentId: string }) => {
      if (event.projectId !== projectId) return;
      void queryClient.invalidateQueries({ queryKey: ['documents', 'list', projectId] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.documents.usage(projectId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.documents.folder(event.documentId),
      });
    };

    socket.on('document:created', handleUpsert);
    socket.on('document:updated', handleUpsert);
    socket.on('document:deleted', handleDelete);
    socket.on('document:folder', handleFolder);

    return () => {
      socket.off('document:created', handleUpsert);
      socket.off('document:updated', handleUpsert);
      socket.off('document:deleted', handleDelete);
      socket.off('document:folder', handleFolder);
    };
  }, [onRemoteEdit, openDocumentId, projectId, queryClient, removeRow, socket, upsertRow]);
};
