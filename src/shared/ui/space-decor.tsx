import { useEffect, useState, type CSSProperties } from 'react';
import { useReducedMotion } from 'framer-motion';

import { useSkin } from '@/app/providers/theme-provider';

/** How often one goes by. */
const STAR_INTERVAL = 60_000;

/**
 * How long one crossing takes, and it must match `.shooting-star`'s animation
 * duration in `index.css` — the same duplicated constant `DragonFlight` keeps,
 * for the same reason: the stylesheet needs it to run the animation and this
 * needs it to know when the element can go.
 *
 * Under a second for a trip of a viewport and a half. A shooting star is the
 * one thing in a night sky you only ever see the end of.
 */
const STAR_DURATION = 900;

/**
 * The first one does not wait a full minute.
 *
 * The starfield drifts too slowly to notice, so a reader who has just picked
 * the skin would otherwise sit on a still sky for a minute before the thing
 * that makes it a sky happens. Once, shortly after arrival, then the minute.
 */
const FIRST_STAR_DELAY = 5_000;

interface Streak {
  /** Where it enters, as a percentage of the viewport height. */
  lane: number;
  /** Degrees below horizontal. Never level: a meteor is falling. */
  tilt: number;
  /** Tail length as a share of the usual, so no two look stamped. */
  length: number;
  key: number;
}

/*
 * The upper half of the window, where a sky is. Starting lower would put the
 * whole streak behind the working area of the page, and it would be seen only
 * as a flicker between two cards.
 */
const nextStreak = (): Streak => ({
  lane: 6 + Math.random() * 34,
  tilt: 9 + Math.random() * 9,
  length: 0.8 + Math.random() * 0.45,
  key: Date.now(),
});

/**
 * Once a minute, a shooting star crosses the page from left to right.
 *
 * ## The contract
 *
 * `DragonFlight`'s, to the letter: one skin, nothing under
 * `prefers-reduced-motion`, and `fixed`, `aria-hidden` and
 * `pointer-events-none`, so it can never take a click, reach the accessibility
 * tree or move layout. It sits at `z-0` with the starfield, under every panel,
 * so on a working screen it is a streak seen through the gaps between things
 * rather than a line drawn across somebody's task.
 *
 * ## Why the crossing is CSS and the removal is a timer
 *
 * The same argument again: an exit animation driven on
 * `requestAnimationFrame` never finishes in a background tab, so the streak
 * is one CSS animation it carries from birth, and `setTimeout`, which does
 * fire in hidden tabs, takes it away.
 *
 * ## Why the slope is worked out here
 *
 * The streak is drawn rotated to its tilt, and it has to *travel* along that
 * same line, or it slides sideways like a tilted stick. The vertical travel is
 * therefore the horizontal travel times the tangent of the tilt, computed per
 * streak and handed to the keyframes as two lengths. Both are in `vw`, so the
 * ratio holds at every window shape.
 */
export const ShootingStar = () => {
  const skin = useSkin();
  const reduceMotion = useReducedMotion();
  const [streak, setStreak] = useState<Streak | null>(null);

  const isOn = skin === 'SPACE' && !reduceMotion;

  useEffect(() => {
    if (!isOn) {
      setStreak(null);
      return;
    }

    // A timeout that starts an interval; both cleared on the way out. See
    // `DragonFlight` for why the order matters.
    let repeat: ReturnType<typeof setInterval> | undefined;

    const first = setTimeout(() => {
      setStreak(nextStreak());
      repeat = setInterval(() => setStreak(nextStreak()), STAR_INTERVAL);
    }, FIRST_STAR_DELAY);

    return () => {
      clearTimeout(first);
      clearInterval(repeat);
    };
  }, [isOn]);

  useEffect(() => {
    if (!streak) return;

    const timer = setTimeout(() => setStreak(null), STAR_DURATION + 100);
    return () => clearTimeout(timer);
  }, [streak]);

  if (!isOn || !streak) return null;

  const slope = Math.tan((streak.tilt * Math.PI) / 180);

  return (
    <span
      // Keyed so each streak is a new element and its animation starts fresh.
      key={streak.key}
      aria-hidden
      className="shooting-star pointer-events-none fixed left-0 z-0 block"
      style={
        {
          top: `${streak.lane}vh`,
          '--star-tilt': `${streak.tilt.toFixed(1)}deg`,
          '--star-rise': `${(-30 * slope).toFixed(2)}vw`,
          '--star-fall': `${(130 * slope).toFixed(2)}vw`,
          '--star-length': streak.length.toFixed(2),
        } as CSSProperties
      }
    />
  );
};
