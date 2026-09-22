import { useLayoutEffect, useMemo, useState, type RefObject } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { useSkin } from '@/app/providers/theme-provider';

/** How many go off, and how many pieces each one throws. */
const BURSTS = 4;
const SPARKS = 9;

/**
 * The three colours a firework is, in this room.
 *
 * Gold, cinnabar and jade — the skin's own three materials, which is what keeps
 * this from being a generic particle effect that happens to be mounted on one
 * theme. A firework in any other palette would be the same shape saying
 * nothing about where it is.
 */
const TONES = [
  'var(--dragon-scale)',
  'var(--dragon-cinnabar)',
  'var(--dragon-jade-lit)',
] as const;

interface FireworkBurstProps {
  /**
   * The dialog the bursts go off around.
   *
   * A ref rather than a parent, and that is the whole trick — see the note
   * below on the clip, and the identical arrangement in `BatSwarm`.
   */
  anchor: RefObject<HTMLElement | null>;
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Fireworks off the edges of a dialog, on the Dragon skin only.
 *
 * ## Why this is a second component rather than a parameter on `BatSwarm`
 *
 * They share a mounting problem and nothing else. The bats are one flight of
 * nine glyphs leaving on a shallow S; this is four separate detonations of nine
 * sparks each, staggered, with gravity on the way down and a flash at the
 * origin of each. Folding both into one component would mean a `kind` prop
 * selecting between two entirely disjoint sets of geometry, which is two
 * components with a switch statement bolted to the front.
 *
 * What *is* shared is the hard-won part, and it is repeated here deliberately:
 *
 * ## Why the sparks are not inside the dialog
 *
 * The panel is `overflow-hidden` — it has to be, or a scrolling body would
 * paint over the rounded corners — so anything launched from inside it is
 * clipped at exactly the border it is meant to be crossing. This is a *sibling*
 * of the panel inside the dialog's own full-screen layer, positioned over it
 * from a measurement rather than by containment.
 *
 * `position: fixed` against the measured rect rather than `absolute` inside a
 * relative wrapper, because a wrapper would have to carry the panel's own
 * sizing — and the panel's width is set by `className` at something like forty
 * call sites. A measurement costs one `getBoundingClientRect` per dialog
 * opening and changes no layout at all.
 *
 * ## Why the measurement is taken after a frame
 *
 * The panel animates in from `scale: 0.985`, so measuring during the same
 * commit returns the box it is arriving *from*, about 1.5% small. One
 * `requestAnimationFrame` is enough to read it settled, and since the first
 * burst is on a 60ms delay there is nothing on screen during the wait.
 *
 * ## Why the geometry is computed once and never recomputed
 *
 * `useMemo` with an empty dependency list: the component is mounted fresh on
 * every open (it lives inside `AnimatePresence`, which unmounts the whole
 * dialog on close), so "once per mount" is exactly "once per open". Deriving
 * the angles during render without memoising would give every spark a new
 * trajectory on every parent re-render — and a dialog re-renders on every
 * keystroke in the form it contains, which would restart the display each time
 * somebody typed.
 *
 * The scatter is deterministic rather than random, for the same reason the
 * hero field's is: a display somebody has looked at and approved should be the
 * same display next time. The jitter is a fixed per-index offset, not
 * `Math.random`.
 */
export const FireworkBurst = ({ anchor }: FireworkBurstProps) => {
  const skin = useSkin();
  const reduceMotion = useReducedMotion();
  const [box, setBox] = useState<Box | null>(null);

  const isFiring = skin === 'DRAGON' && !reduceMotion;

  useLayoutEffect(() => {
    if (!isFiring) return;

    const frame = requestAnimationFrame(() => {
      const rect = anchor.current?.getBoundingClientRect();
      if (rect) {
        setBox({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [anchor, isFiring]);

  const display = useMemo(
    () =>
      Array.from({ length: BURSTS }, (_, burst) => {
        /*
         * Where on the border this one goes off.
         *
         * Evenly round the dialog, starting a little past due-right so that no
         * burst begins life sitting exactly on a corner — a detonation on a
         * corner reads as a decoration somebody placed there rather than as
         * something happening.
         */
        const angle = ((burst + 0.4) / BURSTS) * Math.PI * 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        /*
         * The circle mapped onto the border of the box.
         *
         * Dividing by the larger of the two components pushes the point out
         * until one axis is at the full half-extent, which is the definition of
         * the rectangle's edge. Without it the origins land on the *inscribed
         * ellipse* and only the four midpoints touch the border.
         */
        const reach = Math.max(Math.abs(cos), Math.abs(sin));
        const jitter = ((burst * 37) % 11) / 11;

        return {
          left: 50 + (cos / reach) * 50,
          top: 50 + (sin / reach) * 50,
          // Staggered, because four simultaneous bangs are one bang. A tenth of
          // a second apart is enough to read as a sequence and short enough
          // that the whole display is over before the dialog has settled.
          delay: 0.06 + burst * 0.11,
          tone: TONES[burst % TONES.length],
          sparks: Array.from({ length: SPARKS }, (_, index) => {
            const spread = ((index + jitter) / SPARKS) * Math.PI * 2;
            const wobble = ((index * 29) % 13) / 13;
            const distance = 46 + wobble * 44;

            return {
              x: Math.cos(spread) * distance,
              /*
               * Gravity, and it is what separates a firework from a starburst.
               *
               * The vertical travel is the radial component *plus* a constant
               * fall, so pieces thrown upward slow and turn over while pieces
               * thrown downward get further than they were aimed. Without it
               * the nine sparks land on a perfect circle, which is a diagram.
               */
              y: Math.sin(spread) * distance + 20 + wobble * 14,
              size: 2.5 + wobble * 2,
              duration: 0.72 + wobble * 0.38,
            };
          }),
        };
      }),
    [],
  );

  /*
   * Reduced motion gets nothing at all rather than a static spark.
   *
   * This is pure decoration with no state to communicate — there is no
   * information a reader loses by not seeing it — so the honest reduced-motion
   * answer is to skip it entirely rather than to leave thirty-six dots sitting
   * on top of the dialog.
   */
  if (!isFiring || !box) return null;

  return (
    <div
      aria-hidden
      /*
       * Above the panel's own `z-10`, so a spark crossing the dialog's edge
       * passes in front of it rather than disappearing behind the very border
       * it is leaving.
       */
      className="pointer-events-none fixed z-20 overflow-visible"
      style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
    >
      {display.map((burst, index) => (
        <div
          key={index}
          className="absolute"
          style={{ left: `${burst.left}%`, top: `${burst.top}%` }}
        >
          {/* The flash. A firework is a *light* before it is a set of sparks,
              and without one the pieces appear to have always been there and
              merely started moving. */}
          <motion.span
            className="absolute rounded-full"
            style={{
              width: 26,
              height: 26,
              marginLeft: -13,
              marginTop: -13,
              background: `radial-gradient(circle, rgb(${burst.tone} / 0.9), transparent 68%)`,
            }}
            initial={{ opacity: 0, scale: 0.2 }}
            animate={{ opacity: [0, 1, 0], scale: [0.2, 1.5, 2.1] }}
            transition={{ duration: 0.34, delay: burst.delay, ease: 'easeOut' }}
          />

          {burst.sparks.map((spark, sparkIndex) => (
            <motion.span
              key={sparkIndex}
              className="absolute rounded-full"
              style={{
                width: spark.size,
                height: spark.size,
                marginLeft: -spark.size / 2,
                marginTop: -spark.size / 2,
                background: `rgb(${burst.tone})`,
                // The glow is the difference between a spark and a dot. It is a
                // shadow rather than a second element, so thirty-six of them
                // cost thirty-six nodes and not seventy-two.
                boxShadow: `0 0 6px 1px rgb(${burst.tone} / 0.75)`,
              }}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
              animate={{
                x: spark.x,
                y: spark.y,
                opacity: [0, 1, 1, 0],
                scale: [0.4, 1, 0.5],
              }}
              transition={{
                duration: spark.duration,
                delay: burst.delay,
                // `easeOut` on the travel: a piece of a firework leaves fast
                // and is slowed by the air, which is the one bit of physics
                // that has to be right for the effect to read.
                ease: 'easeOut',
                opacity: {
                  times: [0, 0.08, 0.55, 1],
                  duration: spark.duration,
                  delay: burst.delay,
                },
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
