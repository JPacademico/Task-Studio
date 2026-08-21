import { useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useRealtime } from '@/app/providers/realtime-provider';
import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { markLocalNoteEdit, mergeRemoteNote, releaseLocalNoteEdit } from '../lib/local-edits';
import {
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
  ProjectBoardSnapshot,
  UpdateNotePayload,
} from './types';
import { translate } from '@/shared/i18n';

/**
 * The project whiteboard's Post-it layer.
 *
 * Same optimistic-cache strategy as the personal board — a gesture has to land
 * on the next frame — with one addition the personal board does not need:
 * everything a teammate does arrives over the socket and is merged into the
 * same snapshot, so two people rearranging the wall see one wall.
 */
const useProjectBoardCache = (projectId: string) => {
  const queryClient = useQueryClient();
  const key = queryKeys.notes.projectBoard(projectId);

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
      [projectId, queryClient],
    ),
  };
};

export const useProjectBoard = (projectId: string) =>
  useQuery({
    queryKey: queryKeys.notes.projectBoard(projectId),
    queryFn: () => boardApi.projectSnapshot(projectId),
    enabled: Boolean(projectId),
    staleTime: 20_000,
  });

/** Applies every teammate's board event to the cached snapshot. */
export const useProjectBoardRealtime = (projectId: string) => {
  const { socket } = useRealtime();
  const { patch } = useProjectBoardCache(projectId);

  useEffect(() => {
    if (!socket || !projectId) return;

    /*
     * A teammate's change, merged rather than assigned.
     *
     * The server broadcasts to the whole room including whoever caused the
     * event, so this handler also sees the echo of our own writes — always at
     * least one round trip stale. Replacing the cached note with it wholesale
     * is what used to rewind a title under the cursor mid-word. See
     * `mergeRemoteNote`: everything the server says lands except the fields
     * this client is still holding.
     */
    const upsertNote = (note: Note) => {
      if (note.projectId !== projectId) return;
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
  }, [patch, projectId, socket]);
};

/**
 * The personal board's optimistic create, on a wall other people are watching.
 *
 * See `useCreateBoardNote` for why the note goes up before the request does.
 * The one addition here is the echo: the server broadcasts `note:created` to
 * the whole room including us, and that handler upserts by id — so the real row
 * can arrive over the socket *before* the mutation resolves. The swap below
 * therefore drops the placeholder rather than replacing it whenever the row is
 * already on the wall, which is the difference between one note and two.
 *
 * `currentUserId` matters more here than on the personal board: it is what
 * decides whether the card draws its own delete button and whose stamp goes in
 * the corner. Without it a note would be un-deletable by its author for as long
 * as the request took.
 */
export const useCreateProjectNote = (projectId: string, currentUserId?: string) => {
  const { patch } = useProjectBoardCache(projectId);

  return useMutation({
    mutationFn: (request: CreateNoteRequest) =>
      noteApi.create({ ...splitCreateRequest(request).payload, scope: 'PROJECT', projectId }),

    onMutate: (request) => {
      const { payload, replacesId } = splitCreateRequest(request);

      /*
       * A sheet the caller already drew is adopted, not duplicated.
       *
       * `useImageDrop` puts a picture on the wall the moment the file is
       * chosen and only calls this once the upload finishes, so by now there is
       * already a note there showing a `blob:` preview. Appending a second
       * placeholder would show the same picture twice; taking the first one
       * down first would blink it out of existence for the length of this
       * request. Adopting its id does neither — the sheet never moves, and the
       * swap below simply replaces it with the server's row.
       */
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
          }),
        ],
      }));

      return { placeholderId };
    },

    onSuccess: (note, _request, context) =>
      patch((snapshot) => {
        const alreadyArrived = snapshot.notes.some((entry) => entry.id === note.id);

        return {
          ...snapshot,
          notes: alreadyArrived
            ? snapshot.notes.filter((entry) => entry.id !== context?.placeholderId)
            : snapshot.notes.map((entry) =>
                entry.id === context?.placeholderId ? note : entry,
              ),
        };
      }),

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

export const useUpdateProjectNote = (projectId: string) => {
  const { queryClient, patch } = useProjectBoardCache(projectId);

  return useMutation({
    mutationFn: ({ noteId, payload }: { noteId: string; payload: UpdateNotePayload }) =>
      noteApi.update(noteId, payload),

    onMutate: ({ noteId, payload }) => {
      /*
       * No `cancelQueries` here, and that is a deliberate removal.
       *
       * It was awaited, which made every keystroke's optimistic write land a
       * microtask late and — worse — cancelled the board's own background
       * refetch on a surface where several of these can be in flight at once.
       * A note write does not race the snapshot query for the same field: the
       * merge below and `markLocalNoteEdit` are what settle that argument.
       */
      const previous = queryClient
        .getQueryData<ProjectBoardSnapshot>(queryKeys.notes.projectBoard(projectId))
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

    /*
     * Roll back one note, not the whole board.
     *
     * Restoring a snapshot taken before the write would also undo every other
     * change made since — a teammate's drag, another note's colour — because
     * the snapshot is the entire page. On a live surface that is a much bigger
     * lie than the failed write it is trying to correct.
     */
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

export const useDeleteProjectNote = (projectId: string) => {
  const { key, queryClient, patch } = useProjectBoardCache(projectId);

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
export const usePatchProjectNotes = (projectId: string) => {
  const { patch } = useProjectBoardCache(projectId);

  return useCallback(
    (update: (notes: Note[]) => Note[]) =>
      patch((snapshot) => ({ ...snapshot, notes: update(snapshot.notes) })),
    [patch],
  );
};

/** Writes drag coordinates into the cache without touching the network. */
export const usePatchProjectPositions = (projectId: string) => {
  const { patch } = useProjectBoardCache(projectId);

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

export const useSaveProjectPositions = (projectId: string) => {
  const { key, queryClient } = useProjectBoardCache(projectId);

  return useMutation({
    mutationFn: noteApi.savePositions,
    onError: (error) => {
      void queryClient.invalidateQueries({ queryKey: key });
      toast.error(errorMessage(error, translate('toast.layoutSaveFailed')));
    },
  });
};

export const useCreateProjectNoteLink = (projectId: string) => {
  const { patch } = useProjectBoardCache(projectId);

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

export const useDeleteProjectNoteLink = (projectId: string) => {
  const { patch } = useProjectBoardCache(projectId);

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

export const useGroupProjectNotes = (projectId: string) => {
  const { patch } = useProjectBoardCache(projectId);

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
