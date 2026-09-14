import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { useSkin } from '@/app/providers/theme-provider';
import { BatGlyph } from './halloween-icons';

/** How many bats leave. Enough to read as a swarm, few enough to stay legible. */
const COUNT = 9;

/**
 * A burst of bats out of a dialog, on the Halloween skin only.
 *
 * ## Why it renders nothing on the other thirteen skins
 *
 * Because it is mounted inside `Modal`, which every dialog in the product uses.
 * The cheapest possible answer on a skin that does not want it is `null` before
 * any work happens — no elements, no animation, no `AnimatePresence` bookkeeping
 * — and that is what the guard below buys. A seasonal flourish must not cost
 * the other skins a single node.
 *
 * ## Why the flight is computed once and never recomputed
 *
 * `useMemo` with an empty dependency list, seeded from nothing: the component
 * is mounted fresh on every open (it lives inside `AnimatePresence`, which
 * unmounts the whole dialog on close), so "once per mount" is exactly "once per
 * open". Deriving the angles during render without memoising would give every
 * bat a new trajectory on every parent re-render — and a dialog re-renders on
 * every keystroke in the form it contains, which would restart the swarm each
 * time somebody typed.
 *
 * The spread is deterministic rather than random for the same reason the hero
 * field's scatter is: a fan somebody has looked at and approved should be the
 * same fan next time. The jitter is a fixed per-index offset, not `Math.random`.
 *
 * ## Why they fly up and outward rather than in a circle
 *
 * A full circle sends half the swarm straight down into the dialog's own
 * footer, where they cross the buttons somebody is about to press. Biasing the
 * fan upward keeps the motion out of the content and matches the thing being
 * imitated: bats leave a space by going up and out of it.
 */
export const BatSwarm = () => {
  const skin = useSkin();
  const reduceMotion = useReducedMotion();

  const flight = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, index) => {
        /*
         * Fan across 200 degrees centred on straight up, so the extremes go
         * out sideways and slightly down but nothing goes through the footer.
         */
        const spread = (index / (COUNT - 1)) * 200 - 190;
        const angle = (spread * Math.PI) / 180;

        // A fixed wobble per index, so the fan is not a perfect arc.
        const jitter = ((index * 37) % 11) / 11;
        const distance = 150 + jitter * 130;

        return {
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance - 40,
          rotate: spread * 0.35 + (jitter - 0.5) * 40,
          scale: 0.55 + jitter * 0.5,
          delay: index * 0.035,
          duration: 0.85 + jitter * 0.45,
        };
      }),
    [],
  );

  /*
   * Reduced motion gets nothing at all rather than a static bat.
   *
   * This is pure decoration with no state to communicate — there is no
   * information a reader loses by not seeing it — so the honest reduced-motion
   * answer is to skip it entirely rather than to leave nine glyphs sitting on
   * top of the dialog.
   */
  if (skin !== 'HALLOWEEN' || reduceMotion) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-0 w-0 overflow-visible"
    >
      {flight.map((bat, index) => (
        <motion.span
          key={index}
          className="hw-bat absolute text-content"
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.3, rotate: 0 }}
          animate={{
            x: bat.x,
            y: bat.y,
            opacity: [0, 0.85, 0.85, 0],
            scale: bat.scale,
            rotate: bat.rotate,
          }}
          transition={{
            duration: bat.duration,
            delay: bat.delay,
            ease: [0.22, 0.61, 0.36, 1],
            opacity: { times: [0, 0.15, 0.6, 1], duration: bat.duration, delay: bat.delay },
          }}
        >
          <BatGlyph className="h-4 w-6" />
        </motion.span>
      ))}
    </div>
  );
};
