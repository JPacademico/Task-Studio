import { STORAGE_KEYS } from '@/shared/config/constants';

/** How long an unused invite is remembered across sign-up, verification and OAuth redirects. */
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TOKEN = /^[A-Za-z0-9_-]{16,64}$/;

/** A well-formed invite token, or null. */
export const readInviteToken = (value: string | null | undefined): string | null =>
  value && TOKEN.test(value) ? value : null;

export const rememberInvite = (token: string): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.pendingInvite, JSON.stringify({ token, at: Date.now() }));
  } catch {
    // Private windows can refuse storage; the invite then rides in the URL only.
  }
};

export const pendingInvite = (): string | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.pendingInvite);
    if (!raw) return null;
    const { token, at } = JSON.parse(raw) as { token?: string; at?: number };
    if (!at || Date.now() - at > TTL_MS) return null;
    return readInviteToken(token);
  } catch {
    return null;
  }
};

export const forgetInvite = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.pendingInvite);
  } catch {
    // Nothing to clean up when storage is unavailable.
  }
};

/** Where to go right after a session starts: the pending invite, or the fallback. */
export const afterSignIn = (fallback = '/'): string => {
  const token = pendingInvite();
  return token ? `/join/${token}` : fallback;
};
