import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

import { useSkin } from '@/app/providers/theme-provider';
import { DragonGlyph } from './dragon-icons';

/** How often it comes back. */
const FLIGHT_INTERVAL = 60_000;

/**
 * How long one crossing takes, and it must match `--dragon-flight-life` in `index.css`. The number
 * lives in both places for the same reason `NightEyes` duplicates its own.
 */
const FLIGHT_DURATION = 11_000;

/**
 * The first one does not wait a full minute. `NightEyes` does, and it is right to: the whole effect
 * there is being unexpected, and one that greeted you on arrival would be a mascot.
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

// Kept off the top and bottom eighths of the window. Those are where the top bar and a bottom sheet
// live.
const nextFlight = (): Flight => ({
  lane: 16 + Math.random() * 60,
  scale: 0.72 + Math.random() * 0.68,
  pitch: -7 + Math.random() * 14,
  key: Date.now(),
});

/**
 * Once a minute, something long crosses the hall. The skin is already loud — lacquer red, gold
 * mounting rules on every panel, a brush face.
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

    // A timeout that starts an interval, rather than an interval alone. Both handles are cleared on
    // the way out, including the interval the timeout has not created yet.
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
      {/* Two transforms, two elements, and they still have to be separate. The outer element's
          `transform` is the crossing itself. */}
      <span
        className="block"
        style={{ transform: `rotate(${flight.pitch}deg) scale(${flight.scale.toFixed(2)})` }}
      >
        <span className="dragon-flight__body block">
          {/* Taller than the old glyph was, and shorter across. The previous drawing was a
              264×68 outline — nearly four to one. */}
          <DragonGlyph className="h-[11rem] w-auto" />
        </span>
      </span>
    </span>
  );
};
