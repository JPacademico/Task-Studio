import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

import { useSkin } from '@/app/providers/theme-provider';

/** How often something notices you. A minute, so it is never quite expected. */
const APPEARANCE_INTERVAL = 60_000;

/**
 * How long a pair stays, and it must match `--hw-eye-life` in `index.css`. The number lives in both
 * places on purpose rather than being threaded through as an inline style.
 */
const APPEARANCE_DURATION = 3_400;

interface Sighting {
  /** Percentages of the viewport, kept clear of the edges and the chrome. */
  x: number;
  y: number;
  /** How close it is. Drives the size of the eyes and the gap between them. */
  scale: number;
  /** Degrees. Nothing alive holds its head perfectly level. */
  tilt: number;
  key: number;
}

const nextSighting = (): Sighting => ({
  x: 10 + Math.random() * 76,
  y: 14 + Math.random() * 66,
  scale: 0.8 + Math.random() * 0.55,
  tilt: -9 + Math.random() * 18,
  key: Date.now(),
});

/** The resting width of one eye, before `scale`. */
const EYE_REM = 0.55;

/** Two eyes open somewhere in the dark, watch, and are gone. */
export const NightEyes = () => {
  const skin = useSkin();
  const reduceMotion = useReducedMotion();
  const [sighting, setSighting] = useState<Sighting | null>(null);

  const isWatching = skin === 'HALLOWEEN' && !reduceMotion;

  useEffect(() => {
    if (!isWatching) {
      setSighting(null);
      return;
    }

    const timer = setInterval(() => setSighting(nextSighting()), APPEARANCE_INTERVAL);
    return () => clearInterval(timer);
  }, [isWatching]);

  // It leaves on a timer, and the timer is the only thing that removes it. The obvious
  // implementation is `<AnimatePresence>` with an `exit` variant.
  useEffect(() => {
    if (!sighting) return;

    const timer = setTimeout(() => setSighting(null), APPEARANCE_DURATION);
    return () => clearTimeout(timer);
  }, [sighting]);

  if (!isWatching || !sighting) return null;

  const eye = `${(EYE_REM * sighting.scale).toFixed(3)}rem`;

  return (
    <span
      // Keyed so a new sighting is a new element and restarts the animation
      // rather than inheriting the previous one's progress.
      key={sighting.key}
      aria-hidden
      className="hw-eyes pointer-events-none fixed z-[70] block"
      style={{ left: `${sighting.x}vw`, top: `${sighting.y}vh` }}
    >
      {/* The tilt goes on an inner element, because the outer one's `transform` belongs to the
          life animation — it scales up on arrival. */}
      <span
        className="flex items-center"
        style={{ transform: `rotate(${sighting.tilt}deg)`, gap: `calc(${eye} * 2.4)` }}
      >
        <span className="hw-eye" style={{ width: eye, height: eye }} />
        <span className="hw-eye" style={{ width: eye, height: eye }} />
      </span>
    </span>
  );
};
