/**
 * This tab's name for itself. Every write this tab makes carries it as `X-Client-Id`, and every
 * realtime event the server sends because of that write carries it back as `origin`.
 */

/**
 * A short opaque token, from `crypto.randomUUID` where it exists. The fallback is not paranoia:
 * `randomUUID` is only exposed on secure origins.
 */
const mint = (): string => {
  try {
    if (typeof crypto !== 'undefined') {
      if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();

      if (typeof crypto.getRandomValues === 'function') {
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
      }
    }
  } catch {
    /* falls through to the last resort below */
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
};

/**
 * Held for the life of the page. Module state rather than a store, because nothing renders from it
 * and it never changes.
 */
export const CLIENT_ID = mint();

/** The header the API reads it from. Kept next to the value it carries. */
export const CLIENT_ID_HEADER = 'X-Client-Id';

/**
 * Whether a realtime event was caused by this very tab. An event with no origin — a scheduled
 * sweep, a webhook, the CLI, an older server — is nobody's, and is treated as somebody else's.
 */
export const isOwnEvent = (meta: { origin?: string } | undefined): boolean =>
  meta?.origin !== undefined && meta.origin === CLIENT_ID;
