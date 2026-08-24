import { useCallback, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useRealtime } from '@/app/providers/realtime-provider';
import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { documentApi } from '../api/document.api';
import type {
  CreateDocumentPayload,
  DocumentBroadcast,
  ProjectDocument,
  UpdateDocumentPayload,
} from './types';
import { translate } from '@/shared/i18n';

/**
 * A text board's table of contents.
 *
 * `undefined` is a scope, not a missing argument: it asks for the caller's own
 * personal pages. That is why there is no `enabled` gate here any more — the
 * only surfaces that mount a text board are a project tab, which cannot render
 * before its id resolves, and the personal desk, which never has one.
 */
export const useProjectDocuments = (projectId?: string, taskId?: string) =>
  useQuery({
    queryKey: queryKeys.documents.list(projectId, taskId),
    queryFn: () => documentApi.list(projectId, taskId),
    staleTime: 15_000,
  });

export const useProjectDocument = (documentId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.documents.detail(documentId ?? ''),
    queryFn: () => documentApi.detail(documentId as string),
    enabled: Boolean(documentId),
  });

/**
 * Edits one document's row wherever it is cached, without a refetch.
 *
 * Every table of contents is its own query — personal, per project, per task —
 * and a saved page can legitimately appear in more than one of them. Rather
 * than work out which, this walks the cached lists and rewrites the matching
 * row in place. `setQueriesData` with a prefix touches only what is already in
 * memory, so it costs nothing for lists nobody has opened.
 *
 * List rows carry `excerpt` and no `content` (see `ProjectDocument`), so the
 * body is deliberately dropped on the way in — writing it into a list row would
 * quietly double the memory a long table of contents occupies and make the
 * list's shape disagree with what the API returns for it.
 */
const useDocumentListCache = () => {
  const queryClient = useQueryClient();

  /*
   * Both helpers are memoised, and the realtime hook below is why.
   *
   * They end up in that effect's dependency array, and a fresh function
   * identity on every render would tear down and re-attach three socket
   * listeners on every render of every component holding a text board. That is
   * the quiet version of the bug this whole change set is about: not a wrong
   * result, just continuous pointless work.
   */
  const upsertRow = useCallback(
    (document: ProjectDocument | DocumentBroadcast) => {
      const { content: _content, ...row } = document;

      queryClient.setQueriesData<ProjectDocument[]>(
        { queryKey: queryKeys.documents.all },
        (rows) => {
          if (!Array.isArray(rows)) return rows;

          const index = rows.findIndex((entry) => entry.id === row.id);
          if (index === -1) {
            /*
             * A page created by somebody else. Newest first, matching the
             * API's ordering, so it lands where a refetch would have put it.
             *
             * A socket row has no permission flags at all, and a *new* row has
             * nothing to merge them from, so they default to false: this
             * reader may not edit a page somebody else has just written, which
             * is both the correct answer and the safe one to guess. Opening it
             * fetches the real answer.
             */
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

  return useMemo(() => ({ upsertRow, removeRow }), [removeRow, upsertRow]);
};

export const useCreateDocument = () => {
  const { upsertRow } = useDocumentListCache();

  return useMutation({
    mutationFn: (payload: CreateDocumentPayload) => documentApi.create(payload),
    // The API returns the finished row, so the table of contents can be edited
    // rather than thrown away and fetched again.
    onSuccess: (document) => upsertRow(document),
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
      /*
       * Both caches are written from the response, and neither is invalidated.
       *
       * This used to seed the detail cache and then invalidate `documents.all`,
       * which refetched every table of contents in memory — on every keystroke-
       * free save of a single page. The server has just told us exactly what
       * changed; asking it again immediately is the definition of a wasted
       * round trip, and on a cold Neon instance it is a slow one.
       */
      queryClient.setQueryData<ProjectDocument>(queryKeys.documents.detail(document.id), document);
      upsertRow(document);
    },

    onError: (error) => toast.error(errorMessage(error, translate('doc.saveFailed'))),
  });
};

/**
 * Hand the pen to some of the roster, or take it back.
 *
 * The response is the whole page with a recomputed `canEdit` and `editors`, so
 * both caches are written from it and neither is invalidated — the same
 * reasoning as `useUpdateDocument`.
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

export const useDeleteDocument = () => {
  const { removeRow } = useDocumentListCache();

  return useMutation({
    mutationFn: (documentId: string) => documentApi.remove(documentId),
    onSuccess: (_result, documentId) => {
      removeRow(documentId);
      toast.success(translate('doc.deleted'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
};

/**
 * Accepts a version of a page that arrived over the socket.
 *
 * Separate from the realtime hook because adopting is a *decision*, not an
 * event: when a teammate's save lands on a page somebody has open for editing,
 * the hook deliberately refuses to touch the buffer and hands the choice to the
 * person whose words are at stake. This is what runs if they choose to take it.
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
 * A project's text board, kept live.
 *
 * The API has emitted `document:created`, `document:updated` and
 * `document:deleted` into the project room since the feature shipped — see
 * `documents.service.ts` — and nothing on this side was listening. The result
 * was a board that looked live and was not: a teammate's save stayed invisible
 * until a `staleTime` expired and something happened to trigger a refetch,
 * which in practice meant switching windows.
 *
 * Modelled on `useProjectBoardRealtime`, which has done this correctly for the
 * Post-it board all along: apply the payload to the cache, never invalidate.
 * The event carries the whole row, so a refetch would fetch what we already
 * have.
 *
 * **The open editor is deliberately left alone.** Editing here is modal — read,
 * Edit, Save — precisely because there is no operational transform behind it
 * (see the note in `TextBoard`), and patching the detail cache under somebody
 * who is mid-sentence would destroy their draft to show them a version they did
 * not ask for. So an incoming update to the page you have open is written to
 * the *list* and announced, and the editor keeps your text until you decide.
 * Everything else patches silently.
 *
 * Personal pages never arrive here and that is correct rather than an omission:
 * they have no project, so there is no room to emit them into, and nobody but
 * their author can open them.
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

      /*
       * Merged over what is cached, never replacing it.
       *
       * The event carries no `canEdit` — see `DocumentBroadcast` — so writing
       * it wholesale would blank this reader's own answer, and the toolbar
       * reads that answer to decide whether to draw an Edit button. Nothing
       * cached yet means nothing to correct; the detail fetch on open is
       * authoritative either way.
       */
      queryClient.setQueryData<ProjectDocument>(
        queryKeys.documents.detail(document.id),
        (current) => (current ? { ...current, ...document } : undefined),
      );
    };

    const handleDelete = ({ documentId }: { documentId: string }) => removeRow(documentId);

    socket.on('document:created', handleUpsert);
    socket.on('document:updated', handleUpsert);
    socket.on('document:deleted', handleDelete);

    return () => {
      socket.off('document:created', handleUpsert);
      socket.off('document:updated', handleUpsert);
      socket.off('document:deleted', handleDelete);
    };
  }, [onRemoteEdit, openDocumentId, projectId, queryClient, removeRow, socket, upsertRow]);
};
