/**
 * The rate every live stream on the shared board is sent at: cursors, drags
 * and ink in progress.
 *
 * ## Why a fixed 30Hz and not one animation frame
 *
 * These streams used to be coalesced to `requestAnimationFrame`, which sounds
 * like "as often as is visible" and in practice meant "as often as the sender's
 * monitor refreshes" — 60 frames a second on one laptop, 144 on the next. Every
 * one of them is relayed to every peer in the room, and the API meters each
 * socket; three streams at a display's refresh rate were several times what the
 * meter allowed, so most frames were being dropped silently on the server. A
 * dropped cursor is invisible. A dropped *ink* frame is a gap in somebody's
 * stroke, and the lock requests metered alongside them were refused — which on
 * this board is a note that snaps back out of your hand.
 *
 * 30Hz is the rate the receiver can make look like 60: `LIVE_FRAME_MS` is also
 * the length of the glide each receiver animates between two positions (see
 * `applyRemoteDrag` and `.board-cursor`), so a frame arriving on time lands
 * exactly as the previous glide ends and the motion reads as continuous rather
 * than stepped. Anything faster is bandwidth nobody can see; anything much
 * slower and the glide starts to read as lag.
 *
 * The API's per-socket buckets (`SOCKET_LIMITS` in `socket-rate-limit.ts`) are
 * sized against this number. Raising it means raising those.
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
 * Leading- and trailing-edge throttle for a stream that keeps its own pending
 * state.
 *
 * The caller accumulates whatever it wants to send — a latest position, a
 * batch of points — and asks for a flush. The first request after a quiet
 * spell goes out immediately, so a gesture's first frame costs no latency;
 * requests inside the interval collapse into one trailing flush, so the
 * gesture's *last* position is never the frame that was thrown away.
 *
 * A timer rather than an animation frame, deliberately: the point is a rate
 * independent of the sender's display. A background tab's timers are slowed
 * to once a second, which is exactly right for a tab nobody is moving a mouse
 * in.
 *
 * The timer is only the trailing edge, though. While a gesture is moving,
 * requests arrive every frame, and the first one past the interval flushes
 * immediately and cancels the timer — so the steady rate is set by the clock,
 * not by timer resolution. Windows rounds timers up to its 15.6ms tick on
 * battery, which turned a 33ms wait into 47 and 30Hz into 21.
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
 * Rounds a board pixel coordinate for the wire.
 *
 * A dragged note's position comes out of the gesture as a float with fifteen
 * significant digits, which is ten characters of JSON per axis carrying
 * nothing a screen can show. One decimal place is sub-pixel on any display.
 */
export const roundPx = (value: number): number => Math.round(value * 10) / 10;
