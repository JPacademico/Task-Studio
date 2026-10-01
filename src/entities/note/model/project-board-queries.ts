import { useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/shared/lib/toast';

import { useRealtime } from '@/app/providers/realtime-provider';
import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { markLocalNoteEdit, mergeRemoteNote, releaseLocalNoteEdit } from '../lib/local-edits';
import {
  adoptServerNote,
  geometryDiffers,
  optimisticNote,
  pendingNoteId,
  splitCreateRequest,
  type CreateNoteRequest,
} from '../lib/optimistic';
import { boardApi, noteApi } from '../api/note.api';
import type {
  CreateNoteLinkPayload,
  Note,
  NoteLink,
  ProjectBoardPages,
  ProjectBoardSnapshot,
  UpdateNotePayload,
} from './types';
import { translate } from '@/shared/i18n';

/**
 * The project whiteboard's Post-it layer. Same optimistic-cache strategy as the personal board — a
 * gesture has to land on the next frame — with one addition the personal board does not need.
 */
const useProjectBoardCache = (projectId: string, pageIndex: number) => {
  const queryClient = useQueryClient();
  const key = queryKeys.notes.projectBoard(projectId, pageIndex);

  return {
    key,
    queryClient,
    patch: useCallback(
      (update: (snapshot: ProjectBoardSnapshot) => ProjectBoardSnapshot) =>
        queryClient.setQueryData<ProjectBoardSnapshot>(key, (snapshot) =>
          snapshot ? update(snapshot) : snapshot,
        ),
      // The key array is rebuilt each render; its contents are what matter.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [pageIndex, projectId, queryClient],
    ),
  };
};

export const useProjectBoard = (projectId: string, pageIndex = 0) =>
  useQuery({
    queryKey: queryKeys.notes.projectBoard(projectId, pageIndex),
    queryFn: () => boardApi.projectSnapshot(projectId, pageIndex),
    enabled: Boolean(projectId),
    staleTime: 20_000,
    // Switching pages keeps the pager and the old wall on screen until the
    // new one lands, rather than flashing the skeleton on every tab click.
    placeholderData: (previous) =>
      previous && previous.projectId === projectId
        ? { ...previous, pageIndex, notes: [], links: [] }
        : undefined,
  });

/** Applies every teammate's board event to the cached snapshot. */
export const useProjectBoardRealtime = (projectId: string, pageIndex = 0) => {
  const { socket } = useRealtime();
  const { patch } = useProjectBoardCache(projectId, pageIndex);

  useEffect(() => {
    if (!socket || !projectId) return;

    // A teammate's change, merged rather than assigned. The server broadcasts to the whole room
    // including whoever caused the event, so this handler also sees the echo of our own writes.
    const upsertNote = (note: Note) => {
      if (note.projectId !== projectId) return;

      // A note on another page — or one just moved to another page — is not
      // on this wall.
      if ((note.pageIndex ?? 0) !== pageIndex) {
        patch((snapshot) =>
          snapshot.notes.some((entry) => entry.id === note.id)
            ? { ...snapshot, notes: snapshot.notes.filter((entry) => entry.id !== note.id) }
            : snapshot,
        );
        return;
      }

      patch((snapshot) => ({
        ...snapshot,
        notes: snapshot.notes.some((entry) => entry.id === note.id)
          ? snapshot.notes.map((entry) =>
              entry.id === note.id ? mergeRemoteNote(entry, note) : entry,
            )
          : [...snapshot.notes, note],
      }));
    };

    const removeNote = ({ noteId }: { noteId: string }) => {
      patch((snapshot) => ({
        ...snapshot,
        notes: snapshot.notes.filter((note) => note.id !== noteId),
        links: snapshot.links.filter(
          (link) => link.sourceId !== noteId && link.targetId !== noteId,
        ),
      }));
    };

    const applyMoves = (payload: {
      projectId: string;
      moves: { id: string; positionX: number; positionY: number }[];
    }) => {
      if (payload.projectId !== projectId) return;

      const byId = new Map(payload.moves.map((move) => [move.id, move]));
      patch((snapshot) => ({
        ...snapshot,
        notes: snapshot.notes.map((note) => {
          const move = byId.get(note.id);
          return move ? { ...note, positionX: move.positionX, positionY: move.positionY } : note;
        }),
      }));
    };

    const addLink = (link: NoteLink) =>
      patch((snapshot) => ({
        ...snapshot,
        links: [...snapshot.links.filter((entry) => entry.id !== link.id), link],
      }));

    const removeLink = ({ linkId }: { linkId: string }) =>
      patch((snapshot) => ({
        ...snapshot,
        links: snapshot.links.filter((link) => link.id !== linkId),
      }));

    const applyGroup = ({ groupId, noteIds }: { groupId: string | null; noteIds: string[] }) => {
      const members = new Set(noteIds);
      patch((snapshot) => ({
        ...snapshot,
        notes: snapshot.notes.map((note) =>
          members.has(note.id) ? { ...note, groupId } : note,
        ),
      }));
    };

    socket.on('note:created', upsertNote);
    socket.on('note:updated', upsertNote);
    socket.on('note:deleted', removeNote);
    socket.on('note:moved', applyMoves);
    socket.on('note:linked', addLink);
    socket.on('note:unlinked', removeLink);
    socket.on('note:grouped', applyGroup);

    return () => {
      socket.off('note:created', upsertNote);
      socket.off('note:updated', upsertNote);
      socket.off('note:deleted', removeNote);
      socket.off('note:moved', applyMoves);
      socket.off('note:linked', addLink);
      socket.off('note:unlinked', removeLink);
      socket.off('note:grouped', applyGroup);
    };
  }, [pageIndex, patch, projectId, socket]);
};

/**
 * The wall's pages: add, rename, remove — and everybody else's doing so. The page list rides on
 * every page's snapshot, so a change is written into all of them at once.
 */
export const useProjectBoardPages = (projectId: string) => {
  const queryClient = useQueryClient();
  const { socket } = useRealtime();

  const apply = useCallback(
    (payload: ProjectBoardPages) => {
      if (payload.projectId !== projectId) return;

      queryClient.setQueriesData<ProjectBoardSnapshot>(
        { queryKey: queryKeys.notes.projectBoardAll(projectId) },
        (snapshot) =>
          snapshot
            ? { ...snapshot, pages: payload.pages, pageLimit: payload.pageLimit }
            : snapshot,
      );

      // The removed page's Post-its and ink went to the bin with it; its
      // caches are wrong now, and a later page may reuse the index.
      if (payload.removedIndex !== undefined) {
        queryClient.removeQueries({
          queryKey: queryKeys.notes.projectBoard(projectId, payload.removedIndex),
        });
        queryClient.removeQueries({
          queryKey: queryKeys.whiteboard.scene(projectId, payload.removedIndex),
        });
        void queryClient.invalidateQueries({ queryKey: queryKeys.notes.recycleBin });
      }
    },
    [projectId, queryClient],
  );

  useEffect(() => {
    if (!socket || !projectId) return;
    socket.on('whiteboard:pages', apply);
    return () => {
      socket.off('whiteboard:pages', apply);
    };
  }, [apply, projectId, socket]);

  return {
    add: useMutation({
      mutationFn: () => boardApi.addProjectPage(projectId),
      onSuccess: (payload) => {
        apply(payload);
        toast.success(translate('toast.pageAdded'));
      },
      onError: (error) => toast.error(errorMessage(error, translate('toast.pageAddFailed'))),
    }),
    rename: useMutation({
      mutationFn: ({ index, name }: { index: number; name: string }) =>
        boardApi.renameProjectPage(projectId, index, name),
      onSuccess: apply,
      onError: (error) => toast.error(errorMessage(error)),
    }),
    remove: useMutation({
      mutationFn: (index: number) => boardApi.removeProjectPage(projectId, index),
      onSuccess: (payload) => {
        apply(payload);
        toast.success(translate('toast.pageRemoved'));
      },
      onError: (error) => toast.error(errorMessage(error)),
    }),
  };
};

/** The personal board's optimistic create, on a wall other people are watching. */
export const useCreateProjectNote = (
  projectId: string,
  currentUserId?: string,
  pageIndex = 0,
) => {
  const { patch } = useProjectBoardCache(projectId, pageIndex);

  return useMutation({
    mutationFn: (request: CreateNoteRequest) =>
      noteApi.create({
        ...splitCreateRequest(request).payload,
        scope: 'PROJECT',
        projectId,
        pageIndex,
      }),

    onMutate: (request) => {
      const { payload, replacesId } = splitCreateRequest(request);

      // A sheet the caller already drew is adopted, not duplicated. `useImageDrop` puts a picture
      // on the wall the moment the file is chosen and only calls this once the upload finishes.
      if (replacesId) return { placeholderId: replacesId };

      const placeholderId = pendingNoteId();

      patch((snapshot) => ({
        ...snapshot,
        notes: [
          ...snapshot.notes,
          optimisticNote(payload, {
            id: placeholderId,
            userId: currentUserId,
            scope: 'PROJECT',
            projectId,
            pageIndex,
          }),
        ],
      }));

      return { placeholderId };
    },

    // The swap is an adoption — see `adoptServerNote`.
    onSuccess: (note, _request, context) => {
      let moved: Note | null = null;

      patch((snapshot) => {
        const alreadyArrived = snapshot.notes.some((entry) => entry.id === note.id);

        return {
          ...snapshot,
          notes: alreadyArrived
            ? snapshot.notes.filter((entry) => entry.id !== context?.placeholderId)
            : snapshot.notes.map((entry) => {
                if (entry.id !== context?.placeholderId) return entry;

                if (geometryDiffers(entry, note)) moved = entry;
                return adoptServerNote(entry, note);
              }),
        };
      });

      // Dragged while the create was in flight, so the server's copy is in the wrong place. This is
      // the one moment the real id and the intended position are both known.
      if (moved) {
        const local: Note = moved;
        const geometry = {
          positionX: local.positionX,
          positionY: local.positionY,
          width: local.width,
          height: local.height,
        };

        // Marked as a local edit so this client's own socket echo does not
        // arrive a moment later and undo it. See `local-edits`.
        markLocalNoteEdit(note.id, geometry);
        void noteApi
          .update(note.id, geometry)
          .catch(() => undefined)
          .finally(() => releaseLocalNoteEdit(note.id, geometry));
      }
    },

    onError: (error, _request, context) => {
      if (context?.placeholderId) {
        patch((snapshot) => ({
          ...snapshot,
          notes: snapshot.notes.filter((entry) => entry.id !== context.placeholderId),
        }));
      }
      toast.error(errorMessage(error, translate('toast.boardAddFailed')));
    },
  });
};

export const useUpdateProjectNote = (projectId: string, pageIndex = 0) => {
  const { queryClient, patch, key } = useProjectBoardCache(projectId, pageIndex);

  return useMutation({
    mutationFn: ({ noteId, payload }: { noteId: string; payload: UpdateNotePayload }) =>
      noteApi.update(noteId, payload),

    onMutate: ({ noteId, payload }) => {
      // No `cancelQueries` here, and that is a deliberate removal. It was awaited, which made every
      // keystroke's optimistic write land a microtask late and — worse.
      const previous = queryClient
        .getQueryData<ProjectBoardSnapshot>(key)
        ?.notes.find((note) => note.id === noteId);

      // This client now owns these fields until the server catches up.
      markLocalNoteEdit(noteId, payload);

      patch((snapshot) => ({
        ...snapshot,
        notes: snapshot.notes.map((note) =>
          note.id === noteId ? { ...note, ...payload } : note,
        ),
      }));

      return { previous };
    },

    // Roll back one note, not the whole board. Restoring a snapshot taken before the write would
    // also undo every other change made since — a teammate's drag, another note's colour.
    onError: (error, { noteId }, context) => {
      const previous = context?.previous;
      if (previous) {
        patch((snapshot) => ({
          ...snapshot,
          notes: snapshot.notes.map((note) => (note.id === noteId ? previous : note)),
        }));
      }
      toast.error(errorMessage(error, translate('toast.noteSaveFailed')));
    },

    onSettled: (_data, _error, { noteId, payload }) => releaseLocalNoteEdit(noteId, payload),
  });
};

export const useDeleteProjectNote = (projectId: string, pageIndex = 0) => {
  const { key, queryClient, patch } = useProjectBoardCache(projectId, pageIndex);

  return useMutation({
    mutationFn: (noteId: string) => noteApi.remove(noteId),

    onMutate: async (noteId) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ProjectBoardSnapshot>(key);

      patch((snapshot) => ({
        ...snapshot,
        notes: snapshot.notes.filter((note) => note.id !== noteId),
        links: snapshot.links.filter(
          (link) => link.sourceId !== noteId && link.targetId !== noteId,
        ),
      }));

      return { previous };
    },

    onError: (error, _noteId, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.error(errorMessage(error, translate('toast.authorOnlyRemove')));
    },

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notes.recycleBin });
    },
  });
};

/** Rewrites the wall's note list, cache-only. See the personal board's copy. */
/** Putting a binned note back, with the id it had. */
export const useRestoreProjectNote = (projectId: string, pageIndex = 0) => {
  const { patch } = useProjectBoardCache(projectId, pageIndex);

  return useMutation({
    mutationFn: (noteId: string) => noteApi.restore(noteId),
    // A note whose page has since gone comes back on page 0 (see
    // `NotesService.restore`), so it only lands here if this is its page.
    onSuccess: (note) =>
      patch((snapshot) =>
        (note.pageIndex ?? 0) === pageIndex
          ? { ...snapshot, notes: [...snapshot.notes.filter((entry) => entry.id !== note.id), note] }
          : snapshot,
      ),
    onError: (error) => toast.error(errorMessage(error)),
  });
};

export const usePatchProjectNotes = (projectId: string, pageIndex = 0) => {
  const { patch } = useProjectBoardCache(projectId, pageIndex);

  return useCallback(
    (update: (notes: Note[]) => Note[]) =>
      patch((snapshot) => ({ ...snapshot, notes: update(snapshot.notes) })),
    [patch],
  );
};

/** Writes drag coordinates into the cache without touching the network. */
export const usePatchProjectPositions = (projectId: string, pageIndex = 0) => {
  const { patch } = useProjectBoardCache(projectId, pageIndex);

  return useCallback(
    (moves: { id: string; positionX: number; positionY: number }[]) => {
      const byId = new Map(moves.map((move) => [move.id, move]));

      patch((snapshot) => ({
        ...snapshot,
        notes: snapshot.notes.map((note) => {
          const move = byId.get(note.id);
          return move ? { ...note, positionX: move.positionX, positionY: move.positionY } : note;
        }),
      }));
    },
    [patch],
  );
};

export const useSaveProjectPositions = (projectId: string, pageIndex = 0) => {
  const { key, queryClient } = useProjectBoardCache(projectId, pageIndex);

  return useMutation({
    mutationFn: noteApi.savePositions,
    onError: (error) => {
      void queryClient.invalidateQueries({ queryKey: key });
      toast.error(errorMessage(error, translate('toast.layoutSaveFailed')));
    },
  });
};

export const useCreateProjectNoteLink = (projectId: string, pageIndex = 0) => {
  const { patch } = useProjectBoardCache(projectId, pageIndex);

  return useMutation({
    mutationFn: (payload: CreateNoteLinkPayload) => boardApi.createLink(payload),
    onSuccess: (link) =>
      patch((snapshot) => ({
        ...snapshot,
        links: [...snapshot.links.filter((entry) => entry.id !== link.id), link],
      })),
    onError: (error) => toast.error(errorMessage(error, translate('toast.connectFailed'))),
  });
};

export const useDeleteProjectNoteLink = (projectId: string, pageIndex = 0) => {
  const { patch } = useProjectBoardCache(projectId, pageIndex);

  return useMutation({
    mutationFn: (linkId: string) => boardApi.removeLink(linkId),
    onMutate: (linkId) =>
      patch((snapshot) => ({
        ...snapshot,
        links: snapshot.links.filter((link) => link.id !== linkId),
      })),
    onError: (error) => toast.error(errorMessage(error)),
  });
};

export const useGroupProjectNotes = (projectId: string, pageIndex = 0) => {
  const { patch } = useProjectBoardCache(projectId, pageIndex);

  return useMutation({
    mutationFn: ({ noteIds, groupId }: { noteIds: string[]; groupId?: string | null }) =>
      boardApi.group(noteIds, groupId),
    onSuccess: ({ groupId }, { noteIds }) => {
      const members = new Set(noteIds);
      patch((snapshot) => ({
        ...snapshot,
        notes: snapshot.notes.map((note) =>
          members.has(note.id) ? { ...note, groupId } : note,
        ),
      }));
    },
    onError: (error) => toast.error(errorMessage(error, translate('toast.groupFailed'))),
  });
};
