import { STORAGE_KEYS } from '@/shared/config/constants';

/**
 * Token custody for the SPA.
 *
 * The API and the PWA live on different origins (Render + Vercel), so
 * `httpOnly; SameSite=None` cookies would be blocked as third-party in Safari
 * and Chrome. Bearer tokens in `localStorage` are the workable option:
 *   - the access token is short-lived (15 min) and rotated on every refresh,
 *   - the refresh token is single-use and revoked server-side on reuse.
 * Secrets themselves never reach the client.
 */
let accessToken: string | null = null;

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // Private mode / storage disabled.
  }
};

const write = (key: string, value: string | null): void => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* ignore — session simply won't survive a reload */
  }
};

export const tokenStore = {
  getAccessToken(): string | null {
    if (accessToken) return accessToken;
    accessToken = read(STORAGE_KEYS.accessToken);
    return accessToken;
  },

  getRefreshToken(): string | null {
    return read(STORAGE_KEYS.refreshToken);
  },

  set(tokens: { accessToken: string; refreshToken: string }): void {
    accessToken = tokens.accessToken;
    write(STORAGE_KEYS.accessToken, tokens.accessToken);
    write(STORAGE_KEYS.refreshToken, tokens.refreshToken);
  },

  clear(): void {
    accessToken = null;
    write(STORAGE_KEYS.accessToken, null);
    write(STORAGE_KEYS.refreshToken, null);
  },

  get isAuthenticated(): boolean {
    return Boolean(this.getAccessToken());
  },
};
