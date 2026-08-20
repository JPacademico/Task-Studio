import { useCallback } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { boardApi, noteApi } from '../api/note.api';
import type {
  BoardSnapshot,
  CreateBoardStrokePayload,
  CreateNoteLinkPayload,
  CreateNotePayload,
  Note,
  UpdateNotePayload,
} from './types';
import { translate } from '@/shared/i18n';

/**
 * Board mutations write straight into the page snapshot.
 *
 * Every gesture on this surface — dropping a note, drawing a line, pulling an
 * arrow between two cards — has to land on the next frame. Refetching the whole
 * page after each one would make the board feel like a form.
 */
const useBoardCache = (pageIndex: number) => {
  const queryClient = useQueryClient();
  const key = queryKeys.notes.board(pageIndex);

  return {
    key,
    queryClient,
    /*
     * Memoised, like the project board's equivalent.
     *
     * `key` is a fresh array on every render, so a bare arrow here was a fresh
     * function on every render too — which quietly defeats any `useCallback`
     * built on top of it, and those are what keep a wall of memoised Post-its
     * from re-rendering together. The key's *contents* are what matter, and
     * they are the dependency.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
    patch: useCallback(
      (update: (snapshot: BoardSnapshot) => BoardSnapshot) =>
        queryClient.setQueryData<BoardSnapshot>(key, (snapshot) =>
          snapshot ? update(snapshot) : snapshot,
        ),
      [pageIndex, queryClient],
    ),
  };
};

export const useBoard = (pageIndex: number) =>
  useQuery({
    queryKey: queryKeys.notes.board(pageIndex),
    queryFn: () => boardApi.snapshot(pageIndex),
    staleTime: 20_000,
    /*
     * Each page is its own cache entry, so flipping tabs used to empty the
     * board — pager included, since the page list arrives inside the snapshot —
     * and rebuild it a round trip later. Holding the previous page keeps the
     * tabs in place and the surface populated while the next one loads, which
     * on a board is the difference between turning a page and losing your desk.
     */
    placeholderData: keepPreviousData,
  });

export const useCreateBoardNote = (pageIndex: number) => {
  const { patch } = useBoardCache(pageIndex);

  return useMutation({
    mutationFn: (payload: CreateNotePayload) =>
      noteApi.create({ ...payload, scope: 'PERSONAL', pageIndex }),
    onSuccess: (note) => patch((snapshot) => ({ ...snapshot, notes: [...snapshot.notes, note] })),
    onError: (error) => toast.error(errorMessage(error, translate('toast.boardAddFailed'))),
  });
};

export const useUpdateBoardNote = (pageIndex: number) => {
  const { key, queryClient, patch } = useBoardCache(pageIndex);

  return useMutation({
    mutationFn: ({ noteId, payload }: { noteId: string; payload: UpdateNotePayload }) =>
      noteApi.update(noteId, payload),

    // Synchronous, and holding one note rather than the page. See the longer
    // note on the project board's copy of this mutation: awaiting
    // `cancelQueries` delayed the optimistic paint by a microtask for no
    // benefit, and a page-wide snapshot is the wrong unit to roll back.
    onMutate: ({ noteId, payload }) => {
      const previous = queryClient
        .getQueryData<BoardSnapshot>(key)
        ?.notes.find((note) => note.id === noteId);

      patch((snapshot) => ({
        ...snapshot,
        notes: snapshot.notes.map((note) =>
          note.id === noteId ? { ...note, ...payload } : note,
        ),
      }));

      return { previous };
    },

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
  });
};

export const useDeleteBoardNote = (pageIndex: number) => {
  const { key, queryClient, patch } = useBoardCache(pageIndex);

  return useMutation({
    mutationFn: (noteId: string) => noteApi.remove(noteId),

    onMutate: async (noteId) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<BoardSnapshot>(key);

      // Connectors dangling off a removed note have to go with it.
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
      toast.error(errorMessage(error));
    },

    // It is not gone, it is in the bin — which has to know about it.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notes.recycleBin });
    },
  });
};

/**
 * Rewrites the page's note list, cache-only.
 *
 * The board's optimistic surfaces need a way to put an object on the wall
 * before the server has heard of it — see `useImageDrop` — and every existing
 * mutation here couples that to a request. This is the write on its own.
 */
export const usePatchBoardNotes = (pageIndex: number) => {
  const { patch } = useBoardCache(pageIndex);

  return useCallback(
    (update: (notes: Note[]) => Note[]) =>
      patch((snapshot) => ({ ...snapshot, notes: update(snapshot.notes) })),
    [patch],
  );
};

/**
 * Writes drag coordinates into the cache without touching the network.
 *
 * The batch endpoint below is what persists them; going through the normal
 * update mutation as well would fire a second, redundant PATCH per note for
 * coordinates the server is already about to receive.
 */
export const usePatchBoardPositions = (pageIndex: number) => {
  const queryClient = useQueryClient();
  const key = queryKeys.notes.board(pageIndex);

  return useCallback(
    (moves: { id: string; positionX: number; positionY: number }[]) => {
      const byId = new Map(moves.map((move) => [move.id, move]));

      queryClient.setQueryData<BoardSnapshot>(key, (snapshot) =>
        snapshot
          ? {
              ...snapshot,
              notes: snapshot.notes.map((note) => {
                const move = byId.get(note.id);
                return move
                  ? { ...note, positionX: move.positionX, positionY: move.positionY }
                  : note;
              }),
            }
          : snapshot,
      );
    },
    [key, queryClient],
  );
};

/** Batched position writes at the end of a drag — one request per gesture. */
export const useSaveBoardPositions = (pageIndex: number) => {
  const { key, queryClient } = useBoardCache(pageIndex);

  return useMutation({
    mutationFn: noteApi.savePositions,
    onError: (error) => {
      void queryClient.invalidateQueries({ queryKey: key });
      toast.error(errorMessage(error, translate('toast.layoutSaveFailed')));
    },
  });
};

export const useCreateNoteLink = (pageIndex: number) => {
  const { patch } = useBoardCache(pageIndex);

  return useMutation({
    mutationFn: (payload: CreateNoteLinkPayload) => boardApi.createLink(payload),
    onSuccess: (link) =>
      patch((snapshot) => ({
        ...snapshot,
        // An upsert on the server, so replace rather than append on a re-link.
        links: [...snapshot.links.filter((entry) => entry.id !== link.id), link],
      })),
    onError: (error) => toast.error(errorMessage(error, translate('toast.connectFailed'))),
  });
};

export const useDeleteNoteLink = (pageIndex: number) => {
  const { patch } = useBoardCache(pageIndex);

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

export const useAddBoardStroke = (pageIndex: number) => {
  const { patch } = useBoardCache(pageIndex);

  return useMutation({
    mutationFn: (payload: CreateBoardStrokePayload) =>
      boardApi.addStroke({ ...payload, pageIndex }),
    onSuccess: (stroke) =>
      patch((snapshot) => ({ ...snapshot, strokes: [...snapshot.strokes, stroke] })),
    onError: (error) => toast.error(errorMessage(error, translate('toast.strokeSaveFailed'))),
  });
};

export const useClearBoardStrokes = (pageIndex: number) => {
  const { patch } = useBoardCache(pageIndex);

  return useMutation({
    mutationFn: () => boardApi.clearStrokes(pageIndex),
    onSuccess: () => patch((snapshot) => ({ ...snapshot, strokes: [] })),
    onError: (error) => toast.error(errorMessage(error)),
  });
};

export const useClearBoard = (pageIndex: number) => {
  const { queryClient, key } = useBoardCache(pageIndex);

  return useMutation({
    mutationFn: () => boardApi.clearPage(pageIndex),
    onSuccess: ({ clearedNotes }) => {
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });
      toast.success(
        clearedNotes > 0
          ? `Page cleared. ${clearedNotes} note(s) are in the recycle bin.`
          : 'Page cleared.',
      );
    },
    onError: (error) => toast.error(errorMessage(error, translate('toast.clearPageFailed'))),
  });
};

export const useBoardPages = (pageIndex: number) => {
  const { queryClient, key, patch } = useBoardCache(pageIndex);

  const refreshPages = (pages: { index: number; name: string }[]) => {
    patch((snapshot) => ({ ...snapshot, pages }));
    // Sibling pages cache their own page list, so they have to hear about it.
    void queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });
  };

  return {
    add: useMutation({
      mutationFn: boardApi.addPage,
      onSuccess: (pages) => {
        refreshPages(pages);
        toast.success(translate('toast.pageAdded'));
      },
      onError: (error) => toast.error(errorMessage(error, translate('toast.pageAddFailed'))),
    }),
    rename: useMutation({
      mutationFn: ({ index, name }: { index: number; name: string }) =>
        boardApi.renamePage(index, name),
      onSuccess: refreshPages,
      onError: (error) => toast.error(errorMessage(error)),
    }),
    remove: useMutation({
      mutationFn: (index: number) => boardApi.removePage(index),
      onSuccess: (pages) => {
        refreshPages(pages);
        void queryClient.invalidateQueries({ queryKey: key });
        toast.success(translate('toast.pageRemoved'));
      },
      onError: (error) => toast.error(errorMessage(error)),
    }),
  };
};

export const useGroupNotes = (pageIndex: number) => {
  const { patch } = useBoardCache(pageIndex);

  return useMutation({
    mutationFn: ({ noteIds, groupId }: { noteIds: string[]; groupId?: string | null }) =>
      boardApi.group(noteIds, groupId),
    onSuccess: ({ groupId }, { noteIds }) => {
      const members = new Set(noteIds);
      patch((snapshot) => ({
        ...snapshot,
        notes: snapshot.notes.map((note: Note) =>
          members.has(note.id) ? { ...note, groupId } : note,
        ),
      }));
    },
    onError: (error) => toast.error(errorMessage(error, translate('toast.groupFailed'))),
  });
};
