import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { translate } from '@/shared/i18n';
import { aiApi } from '../api/ai.api';

/**
 * Whether this deployment has a model behind it at all.
 *
 * `GEMINI_API_KEY` is optional, and a server without one answers every
 * generation route with a 503. So the answer is asked for once and cached for
 * five minutes: it changes on redeploy and not otherwise, and every surface
 * that offers an AI button needs it before deciding whether to draw one.
 *
 * A hook rather than an inline `useQuery` in each caller, because there are two
 * of them now — the assistant tab and the task sheet's note checklist — and two
 * copies of a cache key is how one of them ends up on a different `staleTime`.
 */
export const useAiStatus = () =>
  useQuery({
    queryKey: queryKeys.ai.status,
    queryFn: aiApi.status,
    staleTime: 5 * 60_000,
  });

/** Asks for 1-3 steps for one task. Does not file them — see `useAcceptSubtasks`. */
export const useSuggestSubtasks = (taskId: string) =>
  useMutation({
    mutationFn: () => aiApi.suggestSubtasks(taskId),
    onError: (error) => toast.error(errorMessage(error, translate('ai.suggestFailed'))),
  });

/**
 * Files accepted steps onto the task's note checklist.
 *
 * Invalidates the task rather than patching it: the API decides how many of the
 * suggestions actually fit under the cap, and it can legitimately add fewer
 * than were proposed. Reconstructing that answer on the client would be
 * guessing at a number the server has just finished computing.
 */
export const useAcceptSubtasks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ suggestionId, titles }: { suggestionId: string; titles?: string[] }) =>
      aiApi.acceptSubtasks(suggestionId, titles),

    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });

      if (result.added === 0) {
        toast.info(translate('ai.noStepsAdded'));
        return;
      }
      toast.success(translate('ai.stepsAdded', { count: String(result.added) }));
    },

    onError: (error) => toast.error(errorMessage(error, translate('ai.addFailed'))),
  });
};
