import { api } from '@/shared/api/client';
import type { BillingSummary, PlanCatalogue, StartCheckoutPayload } from '../model/types';

export const billingApi = {
  /** The plans and their prices. Unauthenticated on the API. */
  async catalogue(): Promise<PlanCatalogue> {
    const { data } = await api.get<PlanCatalogue>('/billing/plans');
    return data;
  },

  /** This account's plan, subscription and usage. */
  async summary(): Promise<BillingSummary> {
    const { data } = await api.get<BillingSummary>('/billing/me');
    return data;
  },

  /**
   * Opens a hosted checkout and answers with a URL to send the browser to.
   *
   * The client never names a price — only a plan, a cadence and a currency —
   * and the API resolves what that costs. See `BillingService.startCheckout`
   * for why accepting a price id from a browser is the one thing this must not
   * do.
   */
  async checkout(payload: StartCheckoutPayload): Promise<{ url: string }> {
    const { data } = await api.post<{ url: string }>('/billing/checkout', payload);
    return data;
  },

  /** A hosted page for changing a card, switching cadence, or cancelling. */
  async portal(): Promise<{ url: string }> {
    const { data } = await api.post<{ url: string }>('/billing/portal');
    return data;
  },
};
