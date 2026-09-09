import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { translate } from '@/shared/i18n';
import { aiApi, type AiStatus } from '../api/ai.api';

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
    /*
     * Five minutes, unchanged — but the answer is no longer only about the
     * deployment.
     *
     * It now carries the reader's remaining allowance, which moves every time
     * they use the assistant. A shorter window would put a request in front of
     * every surface that draws an AI button; this one is refreshed on the
     * mutation instead — see `useSuggestDraftSubtasks` and friends, which
     * invalidate this key on settle.
     */
    staleTime: 5 * 60_000,
  });

/**
 * Whether this reader has an assistant call left to spend.
 *
 * `true` while the status is still loading, and that is deliberate: a button
 * greyed out for the half-second before the answer arrives reads as broken, and
 * the worst case of guessing optimistically is a 403 with a sentence in it —
 * which is exactly what the person would have been told anyway.
 */
export const hasAiCreditsLeft = (status: AiStatus | undefined): boolean =>
  !status?.allowance || status.allowance.remaining === null || status.allowance.remaining > 0;

/**
 * Marks the cached allowance stale after a call that spent one.
 *
 * `onSettled` rather than `onSuccess`, and that is the whole point: a
 * generation that *failed* has still spent the credit — the API charges before
 * it calls the model, because a meter that only advances on success is not a
 * meter (see `AiCreditsService`). Refreshing only on success would leave the
 * counter reading one higher than the truth for five minutes, which is exactly
 * the window somebody retries in.
 *
 * `invalidateQueries` rather than a refetch: the status is read by three
 * surfaces and React Query will fetch it once, when one of them next mounts or
 * refocuses.
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
 * Steps for a task that does not exist yet — the composer's version.
 *
 * No `taskId` and no accept step. `useSuggestSubtasks` proposes onto a saved
 * row and `useAcceptSubtasks` files the answer; here the answer goes into the
 * composer's own starting checklist, and it is the composer's Save that writes
 * anything at all. So this is the whole feature rather than half of it, and
 * nothing is invalidated: no cache is describing a task that has not been
 * created.
 *
 * The *allowance* is invalidated, though — a draft suggestion costs a credit
 * like any other, and it is the one most likely to be pressed repeatedly.
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
 * Files accepted steps onto the task's note checklist.
 *
 * Invalidates the task rather than patching it: the API decides how many of the
 * suggestions actually fit under the cap, and it can legitimately add fewer
 * than were proposed. Reconstructing that answer on the client would be
 * guessing at a number the server has just finished computing.
 *
 * ## Why the toast waits for the refetch
 *
 * `onSuccess` is `async` and the invalidation is **awaited**, which is the fix
 * for the notice arriving before the thing it was announcing. It used to be a
 * floating `void`: the toast fired on the same tick the request resolved, while
 * the refetch it had just started was still in the air — so "3 steps added"
 * appeared, sat there for the length of a round trip, and only then did three
 * Post-its fade in underneath it. The order read as a bug because it was one:
 * the app was reporting a result it had not yet fetched.
 *
 * `invalidateQueries` resolves once the active refetches it triggered have
 * settled, so awaiting it means the notes are in the cache — and therefore on
 * screen, since the sheet is what is being looked at — by the time the toast is
 * raised. React Query holds `onSettled` until this returns, which costs nothing
 * here: there is no `onSettled` on this mutation and the button's spinner is
 * driven by `isPending`, which stays true for exactly as long as the work
 * actually takes. The user sees the steps appear *and then* be announced,
 * which is the sequence they were told about.
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
