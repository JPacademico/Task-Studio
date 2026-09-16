import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

import { useSkin } from '@/app/providers/theme-provider';

/** How often something notices you. A minute, so it is never quite expected. */
const APPEARANCE_INTERVAL = 60_000;

/**
 * How long a pair stays, and it must match `--hw-eye-life` in `index.css`.
 *
 * The number lives in both places on purpose rather than being threaded through
 * as an inline style: the stylesheet needs it to lay out three keyframe stops
 * as percentages of it, and this needs it to know when the element is finished.
 * Tying them together through a custom property would mean the CSS could not be
 * read on its own, which is a bad trade for a constant that changes never.
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

/**
 * Two eyes open somewhere in the dark, watch, and are gone.
 *
 * ## Why dots and not a drawing
 *
 * Because the drawing is the reader's. An almond with a pupil and a highlight
 * commits to a creature and then gets judged as an illustration of one; two
 * warm points at the right spacing are read as *something looking* before they
 * are read as shapes at all, and whatever the reader supplies behind them beats
 * anything that could be put there. It is also the difference between an effect
 * that survives being seen twice and one that does not.
 *
 * ## Why it is a sibling of the eldritch watcher rather than a variant of it
 *
 * They are the same mechanism and deliberately not the same component. The
 * watcher is a 64-unit SVG with limbs, veins and a slit pupil, and what makes
 * it work is being *specific* — it is a thing, and you can see what kind. This
 * is the opposite effect: it works by being nothing at all. Sharing a component
 * between them would mean a prop that swaps the entire contents, which is two
 * components with a function call in front of them.
 *
 * ## The contract, which is the same one every other decoration here signs
 *
 * One skin only, nothing under `prefers-reduced-motion`, and `fixed`,
 * `aria-hidden` and `pointer-events-none` so it can never intercept a click,
 * never lands in the accessibility tree, and never affects layout. A mood that
 * can eat a button is a bug.
 *
 * Mounted once by the app shell, which is why it costs nothing to leave in the
 * tree: on thirteen of the fourteen skins it returns `null` before it schedules
 * anything at all.
 */
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

  /*
   * It leaves on a timer, and the timer is the only thing that removes it.
   *
   * The obvious implementation is `<AnimatePresence>` with an `exit` variant,
   * and it is wrong for the reason this codebase has now hit four times (see
   * the route transitions in `app-layout`, the theme gallery's grid, and the
   * eldritch watcher): AnimatePresence will not unmount a child until its exit
   * animation *completes*, and Framer drives that on `requestAnimationFrame`.
   * In a backgrounded tab rAF stops, the exit never finishes, and the element
   * stays on screen — permanently, and no longer where a later sighting says
   * it is.
   *
   * So the whole life of the element is one CSS animation it carries from birth
   * (`.hw-eyes`), and removal is this `setTimeout`. Timers fire in hidden tabs;
   * animations do not have to finish for state to advance.
   */
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
      {/*
        The tilt goes on an inner element, because the outer one's `transform`
        belongs to the life animation — it scales up on arrival — and a rotation
        written alongside it would be overwritten on the animation's first
        frame.

        The gap is 2.4 eyes wide. Closer reads as a single smudge at these
        sizes; wider stops reading as one face and becomes two separate lights.
      */}
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
