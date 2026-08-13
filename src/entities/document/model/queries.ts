import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { documentApi } from '../api/document.api';
import type { CreateDocumentPayload, ProjectDocument, UpdateDocumentPayload } from './types';

export const useProjectDocuments = (projectId: string | undefined, taskId?: string) =>
  useQuery({
    queryKey: queryKeys.documents.list(projectId ?? '', taskId),
    queryFn: () => documentApi.list(projectId as string, taskId),
    enabled: Boolean(projectId),
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
