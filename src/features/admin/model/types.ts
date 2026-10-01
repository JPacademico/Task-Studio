import type { Plan, PlanSource, SubscriptionStatus } from '@/entities/billing/model/types';

/** One account, as the moderation console sees it. */
/**
 * One page of the directory, with enough about the whole set to walk it. Mirrors the API's own
 * `AdminUserPage`.
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
   * The full address, unmasked. Every other surface in the app gets `toDirectoryEntry`'s masked
   * version, because ordinary user search is reachable by anybody.
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
   * What this account is entitled to, and who decided. On the row rather than behind a second
   * request.
   */
  plan: Plan;
  planSource: PlanSource;
  planSince: string | null;
  /** Why it was granted, in the administrator's words. Null unless `ADMIN`. */
  planNote: string | null;
  /**
   * The live subscription behind the plan, when there is one. Null for a free account and for a
   * comped one — which this plus `planSource` tell apart: `ADMIN` with no subscription is a grant.
   */
  subscription: {
    status: SubscriptionStatus;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  /**
   * How many *distinct people* have a standing report against this account. People rather than
   * clicks: the API keeps one report per reporter per subject, so filing again edits the first.
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
   * Named, and only here. The console has to be able to see that five reports came from one address
   * book.
   */
  reporter: { id: string; displayName: string; email: string };
  /** Where the reporter was when they filed it. Context, not scope. */
  project: { id: string; name: string } | null;
}

export interface AdminStats {
  users: number;
  banned: number;
  unverified: number;
  /** Accounts with something unread against them — not reports outstanding. */
  reported: number;
  /**
   * Accounts on something other than Free, comped ones included. Deliberately not "paying
   * customers": that is a question Stripe answers.
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
   * Why, optionally. Optional where `BanPayload.reason` is mandatory, and the contrast is
   * deliberate: a suspension is emailed verbatim to the person and has to be justifiable.
   */
  note?: string;
}
