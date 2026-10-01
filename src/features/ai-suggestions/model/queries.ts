import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/shared/lib/toast';

import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { translate } from '@/shared/i18n';
import { aiApi, type AiStatus } from '../api/ai.api';

/**
 * Whether this deployment has a model behind it at all. `GEMINI_API_KEY` is optional, and a server
 * without one answers every generation route with a 503.
 */
export const useAiStatus = () =>
  useQuery({
    queryKey: queryKeys.ai.status,
    queryFn: aiApi.status,
    // Five minutes, unchanged — but the answer is no longer only about the deployment. It now
    // carries the reader's remaining allowance, which moves every time they use the assistant.
    staleTime: 5 * 60_000,
  });

/**
 * Whether this reader has an assistant call left to spend. `true` while the status is still
 * loading, and that is deliberate.
 */
export const hasAiCreditsLeft = (status: AiStatus | undefined): boolean =>
  !status?.allowance || status.allowance.remaining === null || status.allowance.remaining > 0;

/**
 * Marks the cached allowance stale after a call that spent one. `onSettled` rather than
 * `onSuccess`, and that is the whole point: a generation that *failed* has still spent the credit.
 */
const useInvalidateAllowance = () => {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.ai.status });
  };
};

/** Asks for 1-3 steps for one task. Does not file them — see `useAcceptSubtasks`. */
export const useSuggestSubtasks = (taskId: string) => {
  const invalidateAllowance = useInvalidateAllowance();

  return useMutation({
    mutationFn: () => aiApi.suggestSubtasks(taskId),
    onError: (error) => toast.error(errorMessage(error, translate('ai.suggestFailed'))),
    onSettled: invalidateAllowance,
  });
};

/**
 * Steps for a task that does not exist yet — the composer's version. No `taskId` and no accept
 * step.
 */
export const useSuggestDraftSubtasks = () => {
  const invalidateAllowance = useInvalidateAllowance();

  return useMutation({
    mutationFn: (draft: { title: string; description: string }) =>
      aiApi.suggestDraftSubtasks(draft),
    onError: (error) => toast.error(errorMessage(error, translate('ai.suggestFailed'))),
    onSettled: invalidateAllowance,
  });
};

/**
 * Files accepted steps onto the task's note checklist. Invalidates the task rather than patching
 * it: the API decides how many of the suggestions actually fit under the cap.
 */
export const useAcceptSubtasks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ suggestionId, titles }: { suggestionId: string; titles?: string[] }) =>
      aiApi.acceptSubtasks(suggestionId, titles),

    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });

      if (result.added === 0) {
        toast.info(translate('ai.noStepsAdded'));
        return;
      }
      toast.success(translate('ai.stepsAdded', { count: String(result.added) }));
    },

    onError: (error) => toast.error(errorMessage(error, translate('ai.addFailed'))),
  });
};
