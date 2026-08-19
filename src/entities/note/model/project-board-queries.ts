import { useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useRealtime } from '@/app/providers/realtime-provider';
import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { boardApi, noteApi } from '../api/note.api';
import type {
  CreateNoteLinkPayload,
  CreateNotePayload,
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

    const upsertNote = (note: Note) => {
      if (note.projectId !== projectId) return;
      patch((snapshot) => ({
        ...snapshot,
        notes: snapshot.notes.some((entry) => entry.id === note.id)
          ? snapshot.notes.map((entry) => (entry.id === note.id ? note : entry))
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

export const useCreateProjectNote = (projectId: string) => {
  const { patch } = useProjectBoardCache(projectId);

  return useMutation({
    mutationFn: (payload: CreateNotePayload) =>
      noteApi.create({ ...payload, scope: 'PROJECT', projectId }),
    onSuccess: (note) => patch((snapshot) => ({ ...snapshot, notes: [...snapshot.notes, note] })),
    onError: (error) => toast.error(errorMessage(error, translate('toast.boardAddFailed'))),
  });
};

export const useUpdateProjectNote = (projectId: string) => {
  const { key, queryClient, patch } = useProjectBoardCache(projectId);

  return useMutation({
    mutationFn: ({ noteId, payload }: { noteId: string; payload: UpdateNotePayload }) =>
      noteApi.update(noteId, payload),

    onMutate: async ({ noteId, payload }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ProjectBoardSnapshot>(key);

      patch((snapshot) => ({
        ...snapshot,
        notes: snapshot.notes.map((note) =>
          note.id === noteId ? { ...note, ...payload } : note,
        ),
      }));

      return { previous };
    },

    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.error(errorMessage(error, translate('toast.noteSaveFailed')));
    },
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
