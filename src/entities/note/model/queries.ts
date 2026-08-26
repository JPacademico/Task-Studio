import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { noteApi } from '../api/note.api';
import { translate } from '@/shared/i18n';

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

/*
 * `useNotes`, `useCreateNote`, `useUpdateNote` and `useDeleteNote` used to live
 * here, keyed on a `ListNotesParams` cache of their own.
 *
 * Their only caller was the task sheet's notes section, which is gone: a task's
 * notes now arrive *inside the task* — `task.notes`, alongside the progress the
 * card draws — so there is no separate notes cache for a task to keep in step
 * with, and the writes go through `useTaskNoteMutations`. The two boards never
 * used these either; they have their own snapshot queries, because a canvas
 * needs its Post-its, its connectors and its ink in one read.
 */

/** Fire-and-forget position sync at the end of a drag gesture. */
export const useSaveNotePositions = () =>
  useMutation({
    mutationFn: noteApi.savePositions,
    onError: (error) => toast.error(errorMessage(error, translate('toast.layoutSaveFailed'))),
  });

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
