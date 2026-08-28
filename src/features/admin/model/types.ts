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
}

export interface AdminStats {
  users: number;
  banned: number;
  unverified: number;
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
