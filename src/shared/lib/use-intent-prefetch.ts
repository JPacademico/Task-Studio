import { useCallback, useEffect, useRef } from 'react';

/**
 * Prefetching on intent, with the brakes on. A pointer resting on a link is the earliest honest
 * signal that somebody is about to go there — earlier than the click by a few hundred milliseconds.
 */

/** How long the pointer must settle before this counts as intent. */
const DWELL_MS = 120;

/** How long one destination stays "already asked for". */
const COOLDOWN_MS = 30_000;

/** Last time each destination was prefetched, app-wide. */
const lastPrefetchedAt = new Map<string, number>();

/**
 * Trims the cooldown map so a long session cannot grow it without bound. Called on write rather
 * than on a timer: the map only grows when something is prefetched.
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
 * Handlers to spread onto a link that is worth warming. `key` names the *destination*, not the
 * element — two controls that lead to the same place should share one cooldown.
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
