import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { documentApi } from '../api/document.api';
import type { CreateDocumentPayload, ProjectDocument, UpdateDocumentPayload } from './types';

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

const useInvalidateDocuments = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
};

export const useCreateDocument = () => {
  const invalidate = useInvalidateDocuments();

  return useMutation({
    mutationFn: (payload: CreateDocumentPayload) => documentApi.create(payload),
    onSuccess: () => void invalidate(),
    onError: (error) => toast.error(errorMessage(error, 'Could not create the document.')),
  });
};

export const useUpdateDocument = () => {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateDocuments();

  return useMutation({
    mutationFn: ({ documentId, payload }: { documentId: string; payload: UpdateDocumentPayload }) =>
      documentApi.update(documentId, payload),

    onSuccess: (document) => {
      // Seed the detail cache with what the server just returned, so reopening
      // the page it was saved from does not flash the pre-save body while a
      // refetch is in flight.
      queryClient.setQueryData<ProjectDocument>(queryKeys.documents.detail(document.id), document);
      void invalidate();
    },

    onError: (error) => toast.error(errorMessage(error, 'Could not save the document.')),
  });
};

export const useDeleteDocument = () => {
  const invalidate = useInvalidateDocuments();

  return useMutation({
    mutationFn: (documentId: string) => documentApi.remove(documentId),
    onSuccess: () => {
      void invalidate();
      toast.success('Document deleted.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
};
