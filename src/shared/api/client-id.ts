/**
 * This tab's name for itself.
 *
 * ## What it is for
 *
 * Every write this tab makes carries it as `X-Client-Id`, and every realtime
 * event the server sends because of that write carries it back as `origin`. So
 * a socket handler can ask the one question that decides whether it has any
 * work to do: *did I cause this?*
 *
 * The answer matters because a client that caused a change is already showing
 * the result of it, optimistically, and is frequently showing something *newer*
 * than the event describes. Dragging a card to Completed and straight back to
 * To do is the case that made this necessary: the first write's `task:updated`
 * arrived while the second was still in flight, the tab refetched, and the
 * server — one write behind — answered `COMPLETED`, which was painted over the
 * `TODO` on screen. The card jumped back on its own and then corrected itself a
 * second later.
 *
 * Everybody else keeps syncing exactly as before. A teammate's tab, a second
 * tab of the same account, the same user's phone: all of them see an origin
 * that is not theirs and refetch.
 *
 * ## Why per tab rather than per user or per session
 *
 * Per *user* would be wrong: somebody with the board open on two screens would
 * stop seeing their own changes on the second one, which is the feature the
 * socket exists for. Per tab is the exact unit of "is already showing this",
 * because the optimistic cache it protects is per tab too.
 *
 * ## Why it is not persisted
 *
 * A reload throws away the cache the id exists to protect, so a reloaded tab
 * has nothing to defend and every reason to accept the server's version of
 * events. A fresh id per page load says precisely that.
 *
 * ## Why it is not a security boundary
 *
 * It is not secret, not authenticated, and trivially forgeable — and nothing on
 * the server ever decides anything with it. Sending somebody else's id costs
 * the sender a refetch they needed and costs nobody else anything at all.
 */

/**
 * A short opaque token, from `crypto.randomUUID` where it exists.
 *
 * The fallback is not paranoia: `randomUUID` is only exposed on secure origins,
 * so a colleague opening the dev server at `http://192.168.x.x` to try it on a
 * phone has `crypto` but not that method. A collision between two tabs would
 * mean one of them ignoring the other's events, so the fallback still draws
 * from `getRandomValues` when it can and only falls back to `Math.random` when
 * there is no `crypto` at all.
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
 * Held for the life of the page.
 *
 * Module state rather than a store, because nothing renders from it and it
 * never changes — a component subscribing to a constant is a subscription that
 * can only cost something.
 */
export const CLIENT_ID = mint();

/** The header the API reads it from. Kept next to the value it carries. */
export const CLIENT_ID_HEADER = 'X-Client-Id';

/**
 * Whether a realtime event was caused by this very tab.
 *
 * An event with no origin — a scheduled sweep, a webhook, the CLI, an older
 * server — is nobody's, and is treated as somebody else's. That is the safe
 * direction to be wrong in: a redundant refetch rather than a change nobody
 * ever sees.
 */
export const isOwnEvent = (meta: { origin?: string } | undefined): boolean =>
  meta?.origin !== undefined && meta.origin === CLIENT_ID;
