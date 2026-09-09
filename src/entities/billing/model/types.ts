/**
 * The three plans, spelled exactly as the API stores them.
 *
 * A string union rather than an enum: these values cross the wire as strings,
 * they are compared against strings, and a TypeScript enum would add a runtime
 * object whose only job is to hold three literals the compiler already knows.
 */
export type Plan = 'FREE' | 'STARTUP' | 'BARON';

export type BillingInterval = 'MONTH' | 'YEAR';

export type SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELED';

/** Where the account's plan came from. See `PlanSource` on the API. */
export type PlanSource = 'DEFAULT' | 'STRIPE' | 'ADMIN';

export type Currency = 'usd' | 'brl';

/**
 * One ceiling. `null` means no ceiling at all.
 *
 * The same distinction the API makes, and it has to survive the wire: `null`
 * renders as "Unlimited" and a number renders as itself, so a component that
 * treated the two the same would print "0" for the one thing somebody is
 * paying extra to get.
 */
export type Limit = number | null;

/** Everything a plan allows. Mirrors `PlanLimits` on the API, field for field. */
export interface PlanLimits {
  projectsPerOwner: Limit;
  projectsPerOwnerIncludingBinned: Limit;
  organizationsPerOwner: Limit;
  membersPerProject: Limit;
  membersPerOrganization: Limit;
  tasksPerProject: Limit;
  documentsPerProject: Limit;
  documentsPerUser: Limit;
  teamsPerScope: Limit;
  /** Bytes. Rendered with `formatFileSize`. */
  documentBoardBytes: Limit;
  aiCallsPerMonth: Limit;
  broadcastConnections: boolean;
  figmaConnections: boolean;
}

/** One buyable combination, as the pricing table draws it. */
export interface PlanPrice {
  interval: BillingInterval;
  currency: Currency;
  /** In the currency's smallest unit — cents, centavos. */
  amount: number;
}

export interface PlanOffer {
  plan: Plan;
  limits: PlanLimits;
  /** Empty on Free, and on a paid plan this deployment has no price for. */
  prices: PlanPrice[];
}

export interface PlanCatalogue {
  /** False on a deployment with no Stripe keys. The panel hides its buttons. */
  paymentsEnabled: boolean;
  /** The currencies at least one price exists in. */
  currencies: Currency[];
  plans: PlanOffer[];
}

/** What the settings panel draws, in one request. */
export interface BillingSummary {
  plan: Plan;
  source: PlanSource;
  limits: PlanLimits;
  paymentsEnabled: boolean;
  /** Whether there is a gateway customer to open the billing portal for. */
  canManage: boolean;
  subscription: {
    status: SubscriptionStatus;
    interval: BillingInterval;
    currency: string;
    /** ISO. Null on a subscription that has never had a period. */
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  usage: {
    projects: number;
    organizations: number;
    ai: { used: number; limit: Limit; resetsAt: string };
    personalBoardBytes: number;
  };
}

export interface StartCheckoutPayload {
  plan: Plan;
  interval: BillingInterval;
  currency: Currency;
}
