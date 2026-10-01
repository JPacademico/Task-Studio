/**
 * The rate every live stream on the shared board is sent at: cursors, drags and ink in progress.
 * These streams used to be coalesced to `requestAnimationFrame`.
 */
export const LIVE_FRAME_MS = 33;

export interface ThrottledFlush {
  /** Asks for a flush: now if the interval has passed, otherwise on its trailing edge. */
  request: () => void;
  /** Flushes immediately, whatever the interval says. For a gesture's last frame. */
  flushNow: () => void;
  cancel: () => void;
}

/**
 * Leading- and trailing-edge throttle for a stream that keeps its own pending state. The caller
 * accumulates whatever it wants to send — a latest position, a batch of points.
 */
export const createThrottledFlush = (
  flush: () => void,
  intervalMs: number = LIVE_FRAME_MS,
): ThrottledFlush => {
  let last = Number.NEGATIVE_INFINITY;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const run = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    last = performance.now();
    flush();
  };

  return {
    request: () => {
      const wait = intervalMs - (performance.now() - last);
      if (wait <= 0) run();
      else if (timer === null) timer = setTimeout(run, wait);
    },
    flushNow: run,
    cancel: () => {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    },
  };
};

/**
 * Rounds a board pixel coordinate for the wire. A dragged note's position comes out of the gesture
 * as a float with fifteen significant digits.
 */
export const roundPx = (value: number): number => Math.round(value * 10) / 10;
