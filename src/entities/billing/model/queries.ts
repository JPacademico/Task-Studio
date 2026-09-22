import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/shared/lib/toast';

import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { translate } from '@/shared/i18n';
import { billingApi } from '../api/billing.api';
import type { BillingSummary, PlanCatalogue, StartCheckoutPayload } from './types';

/**
 * The plans and their prices.
 *
 * Cached effectively forever, because it is: the same table for every reader,
 * changing only when the deployment is redeployed with different price ids.
 * `staleTime: Infinity` means a settings page opened four times in a session
 * fetches it once, which matters on an API that may be cold-starting.
 */
export const usePlanCatalogue = () =>
  useQuery<PlanCatalogue>({
    queryKey: queryKeys.billing.catalogue,
    queryFn: () => billingApi.catalogue(),
    staleTime: Infinity,
    gcTime: Infinity,
  });

/**
 * This account's plan, subscription and usage.
 *
 * A short stale time rather than `Infinity`, and the difference from the
 * catalogue above is the point: this changes underneath the reader. A webhook
 * grants the plan a second after the browser returns from Stripe, and the
 * usage numbers move every time anything is created anywhere in the app.
 */
export const useBillingSummary = (enabled = true) =>
  useQuery<BillingSummary>({
    queryKey: queryKeys.billing.summary,
    queryFn: () => billingApi.summary(),
    enabled,
    staleTime: 30_000,
  });

/**
 * Sends the browser to a hosted checkout.
 *
 * ## Why this is `location.assign` and not a router navigation
 *
 * Because the destination is not this application. Stripe's checkout is a page
 * on `checkout.stripe.com`, and the whole point of using it is that the card
 * details are entered somewhere this code cannot see. A full navigation is the
 * honest thing to do; the browser's own back button is what returns.
 *
 * The success URL Stripe sends them back to is `/settings?checkout=done`, which
 * the settings page watches for — see `PlanPanel`.
 */
export const useStartCheckout = () =>
  useMutation({
    mutationFn: (payload: StartCheckoutPayload) => billingApi.checkout(payload),
    onSuccess: ({ url }) => {
      window.location.assign(url);
    },
    onError: (error) => toast.error(errorMessage(error, translate('billing.checkoutFailed'))),
  });

/** Sends the browser to the hosted billing portal. Same reasoning as above. */
export const useOpenBillingPortal = () =>
  useMutation({
    mutationFn: () => billingApi.portal(),
    onSuccess: ({ url }) => {
      window.location.assign(url);
    },
    onError: (error) => toast.error(errorMessage(error, translate('billing.portalFailed'))),
  });

/**
 * Re-reads the plan, for the moment the browser comes back from Stripe.
 *
 * ## Why a refetch and not a single invalidate
 *
 * Because of a race that is guaranteed rather than unlikely. The browser is
 * redirected back the instant the payment succeeds, and the webhook that
 * actually grants the plan is a *separate* request from Stripe to the API —
 * which on a free-tier container may be waking up. So the first read after a
 * checkout very often still says Free.
 *
 * A handful of retries a couple of seconds apart covers the gap without
 * polling forever, and the panel shows what it has in the meantime rather than
 * a spinner over a plan the reader does own. If every attempt misses, the next
 * ordinary visit to the page picks it up.
 */
export const useRefreshPlanAfterCheckout = () => {
  const queryClient = useQueryClient();

  return async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const before = queryClient.getQueryData<BillingSummary>(queryKeys.billing.summary);
      await queryClient.refetchQueries({ queryKey: queryKeys.billing.summary });
      const after = queryClient.getQueryData<BillingSummary>(queryKeys.billing.summary);

      // Stop the moment the plan actually moves. Comparing the plan rather than
      // the whole object because the usage counters change on their own and
      // would make every attempt look like the answer.
      if (after && before && after.plan !== before.plan) return;
      if (after && !before) return;

      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
  };
};
