/** One account, as the moderation console sees it. */
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
