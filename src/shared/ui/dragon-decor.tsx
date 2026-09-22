import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

import { useSkin } from '@/app/providers/theme-provider';
import { DragonGlyph } from './dragon-icons';

/** How often it comes back. */
const FLIGHT_INTERVAL = 60_000;

/**
 * How long one crossing takes, and it must match `--dragon-flight-life` in
 * `index.css`.
 *
 * The number lives in both places for the same reason `NightEyes` duplicates
 * its own: the stylesheet needs it to place keyframe stops as percentages, and
 * this needs it to know when the element is finished and can be dropped. Tying
 * them together through a custom property would leave the CSS unreadable on its
 * own, which is a bad trade for a constant that never changes.
 *
 * Eleven seconds for roughly 160vw of travel. Slower and it stops reading as
 * flight; faster and a 260-unit-long animal is a streak.
 */
const FLIGHT_DURATION = 11_000;

/**
 * The first one does not wait a full minute.
 *
 * `NightEyes` does, and it is right to: the whole effect there is being
 * unexpected, and one that greeted you on arrival would be a mascot. This is
 * the opposite — it is the thing the theme is named after and the reason
 * somebody picked it, so making them sit on an apparently ordinary red page for
 * sixty seconds before it does anything is hiding the feature. It arrives once,
 * shortly after the skin does, and then keeps the minute.
 */
const FIRST_FLIGHT_DELAY = 3_500;

interface Flight {
  /** Which horizontal band it crosses, as a percentage of the viewport height. */
  lane: number;
  /** How close it is: drives its size and, with it, how fast it appears to move. */
  scale: number;
  /** Degrees of climb or dive across the crossing. Nothing flies dead level. */
  pitch: number;
  key: number;
}

/*
 * Kept off the top and bottom eighths of the window.
 *
 * Those are where the top bar and a bottom sheet live, and a dragon passing
 * behind a fixed control reads as a rendering fault rather than as depth —
 * the control does not move with it, so the animal appears to slide under a
 * sticker. The middle three quarters is all page.
 */
const nextFlight = (): Flight => ({
  lane: 16 + Math.random() * 60,
  scale: 0.72 + Math.random() * 0.68,
  pitch: -7 + Math.random() * 14,
  key: Date.now(),
});

/**
 * Once a minute, something long crosses the hall.
 *
 * ## Why it is behind everything and drawn at almost nothing
 *
 * The skin is already loud — lacquer red, gold mounting rules on every panel, a
 * brush face — and a fully opaque dragon travelling across a task board would
 * be an interruption rather than an atmosphere. At the opacity `.dragon-flight`
 * sets it is closer to a shadow passing over the room than to an illustration:
 * you notice that something went by, and if you look directly at it you can see
 * what it was. That is the whole intended experience, and it is also what makes
 * it survivable sixty times an hour.
 *
 * ## Why the animation is CSS and the removal is a timer
 *
 * Exactly the argument `NightEyes` makes, and it is worth restating because it
 * is the one thing that is easy to get wrong here. `AnimatePresence` will not
 * unmount a child until its exit animation completes, and Framer advances
 * animations on `requestAnimationFrame` — which stops in a background tab. A
 * dragon that left the viewport while the tab was hidden would never be
 * removed, and would still be sitting in the DOM, mid-flight, when the reader
 * came back. So the crossing is one CSS animation the element carries from
 * birth, and `setTimeout` is what takes it away. Timers fire in hidden tabs.
 *
 * ## The contract
 *
 * One skin, nothing under `prefers-reduced-motion`, and `fixed`, `aria-hidden`
 * and `pointer-events-none` throughout — so it cannot intercept a click, cannot
 * reach the accessibility tree, and cannot affect layout. Mounted once by the
 * app shell, where it returns `null` before scheduling anything on every other
 * skin in the catalogue.
 */
export const DragonFlight = () => {
  const skin = useSkin();
  const reduceMotion = useReducedMotion();
  const [flight, setFlight] = useState<Flight | null>(null);

  const isFlying = skin === 'DRAGON' && !reduceMotion;

  useEffect(() => {
    if (!isFlying) {
      setFlight(null);
      return;
    }

    /*
     * A timeout that starts an interval, rather than an interval alone.
     *
     * Both handles are cleared on the way out, including the interval the
     * timeout has not created yet — `clearInterval(undefined)` is a no-op, so
     * the unmount path is correct whether or not the first flight has happened.
     * Without this, switching away from the skin inside the first three seconds
     * would leave an interval running for the life of the tab.
     */
    let repeat: ReturnType<typeof setInterval> | undefined;

    const first = setTimeout(() => {
      setFlight(nextFlight());
      repeat = setInterval(() => setFlight(nextFlight()), FLIGHT_INTERVAL);
    }, FIRST_FLIGHT_DELAY);

    return () => {
      clearTimeout(first);
      clearInterval(repeat);
    };
  }, [isFlying]);

  useEffect(() => {
    if (!flight) return;

    const timer = setTimeout(() => setFlight(null), FLIGHT_DURATION);
    return () => clearTimeout(timer);
  }, [flight]);

  if (!isFlying || !flight) return null;

  return (
    <span
      // Keyed so each crossing is a new element and restarts the animation
      // rather than inheriting the previous one's progress.
      key={flight.key}
      aria-hidden
      className="dragon-flight pointer-events-none fixed left-0 z-0 block"
      style={{ top: `${flight.lane}vh` }}
    >
      {/*
        Three transforms, three elements, and they have to be separate.

        The outer element's `transform` is the crossing itself — it belongs to
        `.dragon-flight` and is overwritten on that animation's first frame, so
        anything written beside it is lost. The middle one carries everything
        that is *fixed* for this flight, pitch and size together in one
        declaration for the same reason. The inner one undulates, and has to be
        its own element rather than sharing the middle one: an animated
        `transform` would overwrite the pitch and the scale written there, which
        is the same trap one level down.
      */}
      <span
        className="block"
        style={{ transform: `rotate(${flight.pitch}deg) scale(${flight.scale.toFixed(2)})` }}
      >
        <span className="dragon-flight__body block">
          <DragonGlyph className="h-[7.5rem] w-auto text-brand" />
        </span>
      </span>
    </span>
  );
};
