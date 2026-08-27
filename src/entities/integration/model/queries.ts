import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { translate } from '@/shared/i18n';
import { githubApi } from '../api/github.api';
import type { RepositoryImportPayload } from './types';

/**
 * Looking a repository up, before anything is created.
 *
 * A mutation rather than a query, which is unusual for something that only
 * reads — and deliberate. A query is keyed and cached, and what is wanted here
 * is the opposite: the lookup fires when somebody presses a button, its result
 * belongs to that press, and pasting a different URL must not show the
 * previous repository while the new one loads. `useMutation` is React Query's
 * name for "an imperative request with a result", which is exactly this.
 */
export const usePreviewRepository = () =>
  useMutation({
    mutationFn: githubApi.preview,
    onError: (error) => toast.error(errorMessage(error, translate('github.previewFailed'))),
  });

export const useImportRepository = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RepositoryImportPayload) => githubApi.import(payload),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      /*
       * Two lines, because two different things happened.
       *
       * The project existing is the success. What was *generated* into it —
       * tasks nobody typed, pages nobody wrote, invitations to real people —
       * is a separate fact the person should hear about before they discover
       * it, and the description is where a toast can say so without becoming
       * a paragraph.
       */
      toast.success(translate('toast.projectReady', { name: result.project.name }), {
        description: translate('github.importedSummary', {
          tasks: String(result.taskCount),
          documents: String(result.documentCount),
          invited: String(result.invited.length),
        }),
      });
    },
    onError: (error) => toast.error(errorMessage(error, translate('github.importFailed'))),
  });
};
