/**
 * A place to stand in front of the router when the browser goes back or
 * forward.
 *
 * ## Why this has to exist before React does
 *
 * Back and forward arrive as `popstate` on `window`, and the router hears them
 * through a listener it adds when it first renders. Listeners on `window` run
 * in the order they were added — `capture: true` does not move one ahead, as
 * was measured when it was tried — so anything that wants to look at a back
 * press *before* the router acts on it has to have been added before the
 * router's own. The only moment that is guaranteed is module evaluation, ahead
 * of the first render, which is why `main.tsx` imports this file for its side
 * effect and nothing else.
 *
 * The listener installed here does nothing on its own. A component that needs
 * to intercept history (today, only `LiveCallGuard`) plugs a handler in with
 * `setHistoryGate` and unplugs it when it is done; the handler may call
 * `event.stopImmediatePropagation()`, and the router then never sees the move.
 */

type Gate = (event: PopStateEvent) => void;

let gate: Gate | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', (event) => gate?.(event));
}

/** Plug a handler into the gate, or `null` to take it out. One at a time. */
export const setHistoryGate = (next: Gate | null): void => {
  gate = next;
};
