import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { noteApi } from '../api/note.api';
import type { CreateNotePayload, ListNotesParams, Note, UpdateNotePayload } from './types';
import { translate } from '@/shared/i18n';

export const useNotes = (params: ListNotesParams = {}) =>
  useQuery({
    queryKey: queryKeys.notes.list(params),
    queryFn: () => noteApi.list(params),
    staleTime: 20_000,
  });

/**
 * Everything the user has binned, across every board they write to.
 *
 * Deleting a note has always been a soft delete — the toast even says "moved to
 * the recycle bin" — but nothing ever listed them, so the notes were
 * unreachable in practice. This is the other half of that promise.
 */
export const useDeletedNotes = () =>
  useQuery({
    queryKey: queryKeys.notes.recycleBin,
    queryFn: () => noteApi.list({ includeDeleted: true }),
  });

export const useCreateNote = (params: ListNotesParams = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateNotePayload) => noteApi.create(payload),
    onSuccess: (note) => {
      queryClient.setQueryData<Note[]>(queryKeys.notes.list(params), (notes) =>
        notes ? [...notes, note] : [note],
      );
    },
    onError: (error) => toast.error(errorMessage(error, translate('toast.noteCreateFailed'))),
  });
};

/**
 * Post-it edits (text, colour, position) update the cache first — a sticky note
 * that lags behind the pointer feels broken, and the payloads are tiny.
 */
export const useUpdateNote = (params: ListNotesParams = {}) => {
  const queryClient = useQueryClient();
  const key = queryKeys.notes.list(params);

  return useMutation({
    mutationFn: ({ noteId, payload }: { noteId: string; payload: UpdateNotePayload }) =>
      noteApi.update(noteId, payload),

    onMutate: async ({ noteId, payload }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Note[]>(key);

      queryClient.setQueryData<Note[]>(key, (notes) =>
        notes?.map((note) => (note.id === noteId ? { ...note, ...payload } : note)),
      );

      return { previous };
    },

    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.error(errorMessage(error, translate('toast.noteSaveFailed')));
    },
  });
};

/** Fire-and-forget position sync at the end of a drag gesture. */
export const useSaveNotePositions = () =>
  useMutation({
    mutationFn: noteApi.savePositions,
    onError: (error) => toast.error(errorMessage(error, translate('toast.layoutSaveFailed'))),
  });

export const useDeleteNote = (params: ListNotesParams = {}) => {
  const queryClient = useQueryClient();
  const key = queryKeys.notes.list(params);

  return useMutation({
    mutationFn: (noteId: string) => noteApi.remove(noteId),
    onMutate: async (noteId) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Note[]>(key);
      queryClient.setQueryData<Note[]>(key, (notes) =>
        notes?.filter((note) => note.id !== noteId),
      );
      return { previous };
    },
    onError: (error, _noteId, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.error(errorMessage(error));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });
      toast.success(translate('toast.noteBinned'));
    },
  });
};

export const useRestoreNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteId: string) => noteApi.restore(noteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });
      toast.success(translate('toast.noteRestored'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
};

export const usePurgeNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteId: string) => noteApi.purge(noteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });
      toast.success(translate('toast.notePurged'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
};
