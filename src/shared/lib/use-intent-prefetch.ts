import { useCallback, useEffect, useRef } from 'react';

/**
 * Prefetching on intent, with the brakes on.
 *
 * ## The idea
 *
 * A pointer resting on a link is the earliest honest signal that somebody is
 * about to go there — earlier than the click by a few hundred milliseconds,
 * which is most of what a request costs on this API. Starting the fetch on
 * hover spends that dead time instead of the user's.
 *
 * ## Why it needs guarding
 *
 * The naive version — `onMouseEnter={prefetch}` — is a request cannon. A mouse
 * crossing a dashboard of project cards on its way to the sidebar enters every
 * card it passes over, and each one fires. Moving back and forth between two
 * cards fires both, repeatedly, for as long as the user is undecided. On a
 * free-tier API that spins down when idle, a burst of speculative requests is
 * the single worst thing to point at it.
 *
 * So there are four brakes, and each one closes a different hole:
 *
 * 1. **A dwell delay.** Passing over is not intent; stopping is. Nothing fires
 *    until the pointer has been still on the target for `DWELL_MS`, and leaving
 *    before that cancels it outright.
 * 2. **A per-destination cooldown**, shared across the whole app via a module
 *    map. Hovering the same project ten times is one request, not ten — and
 *    because it is keyed on the destination rather than on the component, the
 *    sidebar link and the project card for the same project do not each get
 *    their own budget.
 * 3. **Never on touch.** There is no hover on a phone; the events that do fire
 *    arrive as part of the tap that is already navigating, so prefetching there
 *    is pure duplicate traffic.
 * 4. **Never on a connection that asked us not to.** Data Saver and 2G are
 *    explicit signals that speculative traffic is unwelcome.
 *
 * `prefetchQuery` is itself a no-op against fresh data, so the cooldown is
 * belt-and-braces for the *stale* case — which is exactly the case that would
 * otherwise hit the network on every pass of the mouse.
 */

/** How long the pointer must settle before this counts as intent. */
const DWELL_MS = 120;

/** How long one destination stays "already asked for". */
const COOLDOWN_MS = 30_000;

/** Last time each destination was prefetched, app-wide. */
const lastPrefetchedAt = new Map<string, number>();

/**
 * Trims the cooldown map so a long session cannot grow it without bound.
 *
 * Called on write rather than on a timer: the map only grows when something is
 * prefetched, so that is the only moment it can need trimming.
 */
const forget = (now: number): void => {
  if (lastPrefetchedAt.size < 200) return;
  for (const [key, at] of lastPrefetchedAt) {
    if (now - at > COOLDOWN_MS) lastPrefetchedAt.delete(key);
  }
};

const isSpeculationWelcome = (): boolean => {
  if (typeof window === 'undefined') return false;

  // No hover, no intent to read from — the tap is already the navigation.
  if (window.matchMedia?.('(pointer: coarse)').matches) return false;

  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;

  if (connection?.saveData) return false;
  if (connection?.effectiveType && /(^|-)2g$/.test(connection.effectiveType)) return false;

  return true;
};

export interface IntentHandlers {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onFocus: () => void;
  onBlur: () => void;
}

/**
 * Handlers to spread onto a link that is worth warming.
 *
 * `key` names the *destination*, not the element — two controls that lead to
 * the same place should share one cooldown. Pass `undefined` to disable, which
 * is what a card renders with before its data has arrived.
 *
 * Keyboard focus counts as intent too, and gets the same treatment: tabbing
 * through a list is the keyboard equivalent of sweeping a mouse across it, so
 * it goes through the same dwell timer rather than firing per stop.
 *
 * Deliberately not applied to every hoverable thing. Task cards, buttons and
 * chips are not destinations, and a page that prefetches on everything is
 * back to being a request cannon with extra steps.
 */
export const useIntentPrefetch = (key: string | undefined, prefetch: () => void): IntentHandlers => {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Read through a ref so the handlers stay stable: these get spread onto
  // memoised cards, and a new function identity per render would defeat that.
  const prefetchRef = useRef(prefetch);
  prefetchRef.current = prefetch;

  const cancel = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = undefined;
  }, []);

  useEffect(() => cancel, [cancel]);

  const arm = useCallback(() => {
    if (!key || timer.current !== undefined) return;
    if (!isSpeculationWelcome()) return;

    const since = lastPrefetchedAt.get(key);
    if (since !== undefined && Date.now() - since < COOLDOWN_MS) return;

    timer.current = setTimeout(() => {
      timer.current = undefined;

      const now = Date.now();
      // Re-checked after the dwell: another control for the same destination
      // may have fired while this one was waiting.
      const last = lastPrefetchedAt.get(key);
      if (last !== undefined && now - last < COOLDOWN_MS) return;

      lastPrefetchedAt.set(key, now);
      forget(now);
      prefetchRef.current();
    }, DWELL_MS);
  }, [key]);

  return { onMouseEnter: arm, onMouseLeave: cancel, onFocus: arm, onBlur: cancel };
};

/** Test seam: drops every cooldown so a fresh scenario starts cold. */
export const resetIntentPrefetch = (): void => lastPrefetchedAt.clear();
