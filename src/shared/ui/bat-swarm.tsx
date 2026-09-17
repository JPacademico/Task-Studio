import { useLayoutEffect, useMemo, useState, type RefObject } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { useSkin } from '@/app/providers/theme-provider';
import { BatGlyph } from './halloween-icons';

/** How many bats leave. Enough to read as a swarm, few enough to stay legible. */
const COUNT = 9;

interface BatSwarmProps {
  /**
   * The dialog the bats come off.
   *
   * A ref rather than a parent, and that is the whole fix — see the note below
   * on the clip.
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
 * A burst of bats off the edges of a dialog, on the Halloween skin only.
 *
 * ## Why it renders nothing on the other thirteen skins
 *
 * Because it is mounted by `Modal`, which every dialog in the product uses. The
 * cheapest possible answer on a skin that does not want it is `null` before any
 * work happens — no elements, no animation, no measurement — and that is what
 * the guard below buys. A seasonal flourish must not cost the other skins a
 * single node.
 *
 * ## Why the bats are no longer inside the dialog
 *
 * They were, and it is why they appeared to come *out of the middle* of it. The
 * panel is `overflow-hidden` — it has to be, or a scrolling body would paint
 * over the rounded corners — so a bat launched from the centre was clipped the
 * instant it reached the edge. What anybody actually saw was nine glyphs
 * materialising in the middle of a form and being cut off halfway out, which
 * reads as a rendering fault rather than as a swarm.
 *
 * So this is now a *sibling* of the panel inside the dialog's own full-screen
 * layer, positioned over it from a measurement rather than by containment.
 * Nothing clips it, and the bats start where the swarm was always supposed to
 * start: on the border, going away from it.
 *
 * `position: fixed` against the measured rect rather than `absolute` inside a
 * relative wrapper, because a wrapper would have to carry the panel's own
 * sizing — and the panel's width is set by `className` at something like forty
 * call sites, half of which override `sm:max-w-lg` with something wider. A
 * measurement costs one `getBoundingClientRect` per dialog opening and changes
 * no layout at all.
 *
 * ## Why the measurement is taken after a frame
 *
 * The panel animates in from `scale: 0.985`, so measuring during the same
 * commit returns the box it is arriving *from*, about 1.5% small. One
 * `requestAnimationFrame` is enough to read it settled, and since the bats fade
 * up over their first 150ms there is nothing on screen during the wait.
 *
 * ## Why the flight is computed once and never recomputed
 *
 * `useMemo` with an empty dependency list: the component is mounted fresh on
 * every open (it lives inside `AnimatePresence`, which unmounts the whole
 * dialog on close), so "once per mount" is exactly "once per open". Deriving
 * the angles during render without memoising would give every bat a new
 * trajectory on every parent re-render — and a dialog re-renders on every
 * keystroke in the form it contains, which would restart the swarm each time
 * somebody typed.
 *
 * The spread is deterministic rather than random, for the same reason the hero
 * field's scatter is: a fan somebody has looked at and approved should be the
 * same fan next time. The jitter is a fixed per-index offset, not `Math.random`.
 */
export const BatSwarm = ({ anchor }: BatSwarmProps) => {
  const skin = useSkin();
  const reduceMotion = useReducedMotion();
  const [box, setBox] = useState<Box | null>(null);

  const isFlying = skin === 'HALLOWEEN' && !reduceMotion;

  useLayoutEffect(() => {
    if (!isFlying) return;

    const frame = requestAnimationFrame(() => {
      const rect = anchor.current?.getBoundingClientRect();
      if (rect) {
        setBox({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [anchor, isFlying]);

  const flight = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, index) => {
        /*
         * Evenly around the dialog, starting a little past due-right so that no
         * bat begins life sitting exactly on a corner — a glyph on a corner
         * reads as a decoration somebody placed there rather than as something
         * leaving.
         */
        const angle = ((index + 0.35) / COUNT) * Math.PI * 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        /*
         * The circle mapped onto the border of the box.
         *
         * Dividing by the larger of the two components pushes the point out
         * until one axis is at the full half-extent, which is the definition of
         * the rectangle's edge. Without it the starting points land on the
         * *inscribed ellipse* and only the four midpoints touch the border —
         * the corners of the dialog would have no bats near them at all, which
         * is the half of "from around the border" that is most visible.
         */
        const reach = Math.max(Math.abs(cos), Math.abs(sin));
        const edgeX = cos / reach;
        const edgeY = sin / reach;

        // A fixed wobble per index, so the ring is not a perfect clock face.
        const jitter = ((index * 37) % 11) / 11;
        const distance = 140 + jitter * 130;

        /*
         * The sway, and why the travel is three points rather than one.
         *
         * Straight out along the radius is how a firework leaves, not how a bat
         * does. Real flight is a line with a lateral wander on it — the animal
         * is being carried by its own wingbeats, so it crabs a little to one
         * side and then the other on its way out.
         *
         * `swayX`/`swayY` is the radial direction turned ninety degrees, scaled
         * by a per-index amount and signed by whether the index is odd. Framer
         * reads the three-element arrays below as a path through those points,
         * so each bat leaves on a shallow S rather than on a ray. It is the one
         * change that makes nine of them read as a swarm rather than as an
         * explosion diagram.
         */
        const swing = (28 + jitter * 34) * (index % 2 === 0 ? 1 : -1);
        const swayX = -sin * swing;
        const swayY = cos * swing;

        return {
          // Percentages of the dialog's own box, so one set of numbers is
          // correct for a 512px form and a full-width bottom sheet alike.
          left: 50 + edgeX * 50,
          top: 50 + edgeY * 50,
          // Out along the radius, with a lateral wander on the way — see the
          // note on `swing`. The travel is what carries them off the dialog;
          // the starting point is what puts them on its edge.
          x: [0, cos * distance * 0.45 + swayX, cos * distance],
          y: [0, sin * distance * 0.45 + swayY, sin * distance],
          /*
           * Banked, and banked *through* the sway rather than into a fixed
           * angle: the middle value leans the bat towards the side it is
           * drifting to and the last one levels it off, which is the same
           * three points the travel uses and therefore lands on the same beats.
           */
          rotate: [
            0,
            ((angle * 180) / Math.PI) * 0.2 + (swing > 0 ? 14 : -14),
            ((angle * 180) / Math.PI) * 0.2 + (jitter - 0.5) * 36,
          ],
          scale: 0.55 + jitter * 0.5,
          delay: index * 0.028,
          // Longer than it was: a bat that crosses 200px in three quarters of a
          // second is a projectile. Slower is also what makes the wingbeat
          // visible, which is the whole point of having rigged it.
          duration: 1.3 + jitter * 0.6,
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
  if (!isFlying || !box) return null;

  return (
    <div
      aria-hidden
      /*
       * Above the panel's own `z-10`, so a bat crossing the dialog's edge
       * passes in front of it rather than disappearing behind the very border
       * it is leaving.
       */
      className="pointer-events-none fixed z-20 overflow-visible"
      style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
    >
      {flight.map((bat, index) => (
        <motion.span
          key={index}
          /* The colour and the halo are `.hw-bat`'s — see `--hw-bat-ink`. */
          className="hw-bat absolute"
          /*
           * Negative margins rather than a `translate(-50%, -50%)`, because
           * Framer owns `transform` on this element — it is animating `x`, `y`,
           * `scale` and `rotate` through it — and a CSS translate written
           * alongside would simply be overwritten on the first frame.
           * `BatGlyph` is `h-4 w-6`, so half of that is 0.5rem and 0.75rem.
           */
          style={{
            left: `${bat.left}%`,
            top: `${bat.top}%`,
            marginLeft: '-0.75rem',
            marginTop: '-0.5rem',
          }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.3, rotate: 0 }}
          animate={{
            x: bat.x,
            y: bat.y,
            opacity: [0, 0.9, 0.9, 0],
            scale: bat.scale,
            rotate: bat.rotate,
          }}
          transition={{
            duration: bat.duration,
            delay: bat.delay,
            /*
             * `easeOut` rather than the custom curve, now that the travel is a
             * three-point path. A cubic-bezier is applied *between each pair* of
             * keyframes, so the old curve made the bat sprint to the midpoint,
             * stop, and sprint again — a stutter exactly where the sway is
             * supposed to read as one continuous arc.
             */
            ease: 'easeOut',
            opacity: { times: [0, 0.15, 0.62, 1], duration: bat.duration, delay: bat.delay },
          }}
        >
          <BatGlyph className="h-4 w-6" />
        </motion.span>
      ))}
    </div>
  );
};
