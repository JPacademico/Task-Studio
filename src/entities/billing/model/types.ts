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
  /** Pages on the personal Post-it board: 3 on the free tier, 10 on any paid plan. */
  boardPagesPerUser: Limit;
  /**
   * Pages on a project's shared whiteboard — the same 3 / 10, counted against
   * the project *owner's* plan. Optional only so a summary from an API that
   * predates project pages still parses.
   */
  whiteboardPagesPerProject?: Limit;
  teamsPerScope: Limit;
  /** Bytes. Rendered with `formatFileSize`. */
  documentBoardBytes: Limit;
  aiCallsPerMonth: Limit;
  /**
   * Which destinations a plan may post its events to. `null` is all of them.
   *
   * A list rather than the boolean it used to be, because the free tier sells
   * Discord and not the other two — see `PlanLimits.broadcastFlavours` on the
   * API. The comparison table renders it per destination rather than as one
   * row, so a free reader can see what they already have.
   */
  broadcastFlavours: readonly BroadcastFlavour[] | null;
  figmaConnections: boolean;
  /**
   * Every skin beyond Studio and Paper. Free accounts may preview them on the
   * landing page; only a paid plan may wear them. See `FREE_SKINS`.
   */
  customThemes: boolean;
}

/** The destinations a project can broadcast to. Mirrors the API's own union. */
export type BroadcastFlavour = 'discord' | 'slack' | 'generic';

/** Whether a plan may post to one destination. Mirrors `allowsFlavour`. */
export const allowsFlavour = (
  allowance: readonly BroadcastFlavour[] | null | undefined,
  flavour: BroadcastFlavour,
): boolean => !allowance || allowance.includes(flavour);

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
