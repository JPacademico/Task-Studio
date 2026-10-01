/**
 * A place to stand in front of the router when the browser goes back or forward. Back and forward
 * arrive as `popstate` on `window`.
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
