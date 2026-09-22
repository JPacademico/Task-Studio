import type { Plan, PlanSource, SubscriptionStatus } from '@/entities/billing/model/types';

/** One account, as the moderation console sees it. */
/**
 * One page of the directory, with enough about the whole set to walk it.
 *
 * Mirrors the API's own `AdminUserPage`. `total` and `pageCount` are computed
 * against the *filtered* set rather than the whole table, so "37 accounts"
 * under a plan filter means thirty-seven on that plan — which is the number
 * somebody reading it is asking about.
 */
export interface AdminUserPage {
  rows: AdminUserRow[];
  total: number;
  /** One-based, and already clamped to at least 1 by the API. */
  page: number;
  pageSize: number;
  /** At least 1, including for an empty directory. */
  pageCount: number;
}

export interface AdminUserRow {
  id: string;
  /**
   * The full address, unmasked.
   *
   * Every other surface in the app gets `toDirectoryEntry`'s masked version,
   * because ordinary user search is reachable by anybody. This one is reachable
   * only by whoever holds the deployment's admin password, and an administrator
   * who cannot see the address cannot tell two people with the same display
   * name apart — which is the first thing a suspension has to get right.
   */
  email: string;
  displayName: string;
  avatarUrl: string | null;
  isVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  /** Null when the account is in good standing. */
  ban: {
    bannedAt: string;
    /** Null means permanent. */
    expiresAt: string | null;
    reason: string;
  } | null;
  /** How many suspensions this account has collected, lifted ones included. */
  banCount: number;
  /**
   * What this account is entitled to, and who decided.
   *
   * On the row rather than behind a second request, for the same reason
   * `reportCount` is: it is what decides whether an administrator opens an
   * account at all, and a directory that could not show it would make "find
   * everybody on Baron" a matter of clicking twenty-five rows one at a time.
   *
   * `planSource` is what separates a paying customer from a comped one, and the
   * console draws them differently — moving somebody who is being billed is a
   * different act, with a different consequence, from moving somebody who is
   * not.
   */
  plan: Plan;
  planSource: PlanSource;
  planSince: string | null;
  /** Why it was granted, in the administrator's words. Null unless `ADMIN`. */
  planNote: string | null;
  /**
   * The live subscription behind the plan, when there is one.
   *
   * Null for a free account and for a comped one — which this plus `planSource`
   * tell apart: `ADMIN` with no subscription is a grant, `STRIPE` with no
   * subscription is a plan whose payment has ended and whose row the
   * reconciler has not caught up with yet.
   */
  subscription: {
    status: SubscriptionStatus;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  /**
   * How many *distinct people* have a standing report against this account.
   *
   * People rather than clicks: the API keeps one report per reporter per
   * subject, so filing again edits the first. That is what makes this number
   * worth reading — it is "how many people are concerned", not "how many times
   * did somebody press a button".
   */
  reportCount: number;
}

/** One report, in the words of whoever filed it. */
export interface AdminReport {
  id: string;
  reason: string;
  createdAt: string;
  reviewedAt: string | null;
  /**
   * Named, and only here.
   *
   * The console has to be able to see that five reports came from one address
   * book. Nothing on the product surface ever says who filed one, and the
   * person reported is never told a report exists at all.
   */
  reporter: { id: string; displayName: string; email: string };
  /** Where the reporter was when they filed it. Context, not scope. */
  project: { id: string; name: string } | null;
}

export interface AdminStats {
  users: number;
  banned: number;
  unverified: number;
  /**
   * Accounts with something unread against them — not reports outstanding.
   *
   * Six colleagues reporting one person is one thing to look at, and a header
   * that read "6" would be counting the wrong noun.
   */
  reported: number;
  /**
   * Accounts on something other than Free, comped ones included.
   *
   * Deliberately not "paying customers": that is a question Stripe answers, and
   * answering it here would mean deciding what to do about the account whose
   * card failed yesterday. This is what the console is for — how many accounts
   * are working inside raised ceilings, whoever is footing the bill. The plan
   * filter beside it is how somebody splits that apart.
   */
  paid: number;
}

export interface AdminSession {
  token: string;
  expiresInSeconds: number;
}

export interface BanPayload {
  reason: string;
  /** Omitted or null for a permanent suspension. */
  days?: number | null;
}

/** The administrator's manual plan change. */
export interface SetPlanPayload {
  plan: Plan;
  /**
   * Why, optionally.
   *
   * Optional where `BanPayload.reason` is mandatory, and the contrast is
   * deliberate: a suspension is emailed verbatim to the person and has to be
   * justifiable, while a plan grant is a business decision recorded for
   * whoever reads the console next. Requiring a paragraph for the second would
   * train administrators to type "." into a box.
   */
  note?: string;
}
