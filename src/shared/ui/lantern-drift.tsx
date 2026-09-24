import { useLayoutEffect, useMemo, useState, type RefObject } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { useSkin } from '@/app/providers/theme-provider';
import { LanternGlyph } from './dragon-icons';

/**
 * How many lanterns leave.
 *
 * Fewer than the bats' nine, and the reason is size rather than taste: a
 * lantern at 44px is nearly three times the area of a bat glyph, so nine of
 * them is a wall of red around the dialog rather than a few objects drifting
 * off it. Seven fills the border without any two ever overlapping.
 */
const COUNT = 7;

interface LanternDriftProps {
  /**
   * The dialog the lanterns come off.
   *
   * A ref rather than a parent, and that is the whole fix — see the note below
   * on the clip, and the identical arrangement in `BatSwarm`.
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
 * Paper lanterns drifting off the edges of a dialog, on the Dragon skin only.
 *
 * ## What this replaced
 *
 * A firework burst: four staggered detonations of nine sparks each, thrown off
 * the border with gravity on the way down. It was the wrong object for the
 * room twice over.
 *
 * A firework is an *event* — it happens, it is loud, and it is over. Opening a
 * dialog is not an event, it is a step in the middle of some work, and an
 * explosion every time somebody presses "New task" is a celebration of nothing
 * that gets tiring by the third one. A lantern is not an event, it is a thing
 * that is already there and has been let go of, which is a much better match
 * for what a dialog actually is.
 *
 * And a firework is *fast*. Thirty-six sparks travelling 90px in under a
 * second across the border of a panel that is itself animating in is a lot of
 * simultaneous movement in the exact region the reader is about to start
 * reading. Seven lanterns rising over two and a half seconds occupy the same
 * space and ask for none of the attention.
 *
 * The three colours are unchanged — the skin's gold, vermilion and lacquer —
 * because they were never the problem.
 *
 * ## Why this is a second component rather than a parameter on `BatSwarm`
 *
 * They share a mounting problem and a *little* of the geometry, and nothing
 * else. Both start on a measured border and travel outward with a lateral
 * wander, which is about fifteen lines; after that a bat banks into its turn
 * and beats its wings, while a lantern stays upright, is carried *up* whatever
 * direction it was released in, and swings on its cord like the pendulum it
 * is. Folding both into one component would mean a `kind` prop selecting
 * between two disjoint sets of keyframes, which is two components with a
 * switch statement bolted to the front.
 *
 * What *is* shared is the hard-won part, and it is repeated here deliberately:
 *
 * ## Why the lanterns are not inside the dialog
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
 * ## Why the measurement waits for the panel to stop moving
 *
 * The panel animates in from `scale: 0.985` and `y: 16`, and
 * `getBoundingClientRect` reports the *visual* box — transform included — so a
 * measurement taken during that tween returns a box that is a few pixels small
 * and a few pixels high. `BatSwarm` waits one `requestAnimationFrame` and
 * accepts the error; measured, one frame in leaves it still at about 98.7% of
 * final, which is roughly 7px on a 534px dialog.
 *
 * For nine bats crossing 200px in 1.3s that is genuinely invisible. For seven
 * lanterns that rise slowly and are meant to be *watched* leaving the border,
 * starting 7px inside it is the kind of thing somebody notices without being
 * able to say what is wrong. So this waits for the box to settle instead:
 * successive frames until two of them agree to the pixel, capped so a dialog
 * that never stops moving cannot spin.
 *
 * Polling frames rather than timing the tween, because the tween's duration is
 * `Modal`'s to change and a number copied out of it here would rot silently.
 * In practice it settles in five or six frames — well inside the 200ms the
 * lanterns spend fading up, so nothing is on screen during the wait.
 *
 * ## Why the flight is computed once and never recomputed
 *
 * `useMemo` with an empty dependency list: the component is mounted fresh on
 * every open (it lives inside `AnimatePresence`, which unmounts the whole
 * dialog on close), so "once per mount" is exactly "once per open". Deriving
 * the angles during render without memoising would give every lantern a new
 * trajectory on every parent re-render — and a dialog re-renders on every
 * keystroke in the form it contains, which would restart the drift each time
 * somebody typed.
 *
 * The spread is deterministic rather than random, for the same reason the hero
 * field's scatter is: a display somebody has looked at and approved should be
 * the same display next time. The jitter is a fixed per-index offset, not
 * `Math.random`.
 */
export const LanternDrift = ({ anchor }: LanternDriftProps) => {
  const skin = useSkin();
  const reduceMotion = useReducedMotion();
  const [box, setBox] = useState<Box | null>(null);

  const isDrifting = skin === 'DRAGON' && !reduceMotion;

  useLayoutEffect(() => {
    if (!isDrifting) return;

    let frame = 0;
    let attempts = 0;
    let previous: Box | null = null;

    const read = () => {
      const rect = anchor.current?.getBoundingClientRect();
      if (!rect) return;

      const next = {
        // Rounded before they are compared, because a transform that has all
        // but finished still reports a fractional difference forever.
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };

      const settled =
        previous !== null &&
        previous.top === next.top &&
        previous.left === next.left &&
        previous.width === next.width &&
        previous.height === next.height;

      // Twenty frames is a third of a second at 60Hz — several times the
      // dialog's own 180ms enter — so the cap is a guard against a dialog
      // that never stops moving, not a deadline the normal case runs into.
      if (settled || ++attempts >= 20) {
        setBox(next);
        return;
      }

      previous = next;
      frame = requestAnimationFrame(read);
    };

    frame = requestAnimationFrame(read);
    return () => cancelAnimationFrame(frame);
  }, [anchor, isDrifting]);

  const flight = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, index) => {
        /*
         * Evenly around the dialog, starting a little past due-right so that
         * no lantern begins life sitting exactly on a corner — an object on a
         * corner reads as a decoration somebody placed there rather than as
         * something leaving.
         */
        const angle = ((index + 0.35) / COUNT) * Math.PI * 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        /*
         * The circle mapped onto the border of the box.
         *
         * Dividing by the larger of the two components pushes the point out
         * until one axis is at the full half-extent, which is the definition
         * of the rectangle's edge. Without it the starting points land on the
         * *inscribed ellipse* and only the four midpoints touch the border —
         * the corners of the dialog would have no lanterns near them at all,
         * which is the half of "from around the border" that is most visible.
         */
        const reach = Math.max(Math.abs(cos), Math.abs(sin));
        const edgeX = cos / reach;
        const edgeY = sin / reach;

        // A fixed wobble per index, so the ring is not a perfect clock face.
        const jitter = ((index * 37) % 11) / 11;
        const distance = 120 + jitter * 90;

        /*
         * Buoyancy, and it is what separates a lantern from a firework.
         *
         * The vertical travel is the radial component *minus* a constant rise,
         * which is precisely the sign the burst this replaced had on it. A
         * lantern released downward slows, turns over and comes back up; one
         * released upward gets further than it was aimed. Without it all seven
         * land on a circle, which is a diagram of a dialog rather than a set
         * of objects that have been let go of.
         *
         * The lift is larger than the horizontal reach on purpose: hot air
         * wins over whatever push the thing left with, so by the end of the
         * travel every lantern is heading in more or less the same direction
         * regardless of which edge it started on. That convergence is most of
         * what makes seven separate objects read as one release.
         */
        const lift = 150 + jitter * 70;

        /*
         * The sway, and why the travel is three points rather than one.
         *
         * A lantern on a cord is a pendulum being carried by a draught, so it
         * does not rise on a line — it crabs to one side, overshoots, and
         * comes back. `swayX` is a lateral offset applied only at the midpoint;
         * Framer reads the three-element arrays below as a path through those
         * points, so each lantern leaves on a shallow S and arrives travelling
         * straight up.
         *
         * Signed by whether the index is odd, so adjacent lanterns lean
         * opposite ways and the group never reads as a single gust.
         */
        const swing = (22 + jitter * 26) * (index % 2 === 0 ? 1 : -1);

        return {
          // Percentages of the dialog's own box, so one set of numbers is
          // correct for a 512px form and a full-width bottom sheet alike.
          left: 50 + edgeX * 50,
          top: 50 + edgeY * 50,
          x: [0, cos * distance * 0.45 + swing, cos * distance],
          // The rise is applied to both waypoints rather than only the last,
          // so the lantern is already climbing at the midpoint instead of
          // travelling flat and then turning a corner.
          y: [0, sin * distance * 0.45 - lift * 0.4, sin * distance - lift],
          /*
           * Swung, not banked.
           *
           * This is the one place the two effects genuinely disagree. A bat
           * rotates *into* its direction of travel because it is flying; a
           * lantern hangs from a fixed point above its own centre and can only
           * do one thing, which is swing about it. So the rotation is a small
           * pendulum that leads the sway and settles, and it never points the
           * object anywhere — an upside-down lantern is a rendering fault.
           *
           * `transform-origin` is the top of the glyph rather than its middle
           * (see the element below), because that is where the cord is, and a
           * pendulum rotated about its belly reads as a spin.
           */
          rotate: [0, swing > 0 ? 9 : -9, (jitter - 0.5) * 8],
          scale: 0.6 + jitter * 0.45,
          // Wider than the bats' 28ms. Lanterns are let go of one at a time.
          delay: index * 0.075,
          /*
           * Slow, and slower than anything else in the product.
           *
           * A bat crossing 200px in 1.3s is already a compromise. A lantern is
           * buoyant rather than propelled — it has no hurry and nothing is
           * chasing it — and at any less than about two seconds the rise reads
           * as a throw. This is also what keeps the effect out of the reader's
           * way: something this slow is peripheral by construction.
           */
          duration: 2.1 + jitter * 0.8,
        };
      }),
    [],
  );

  /*
   * Reduced motion gets nothing at all rather than a static lantern.
   *
   * This is pure decoration with no state to communicate — there is no
   * information a reader loses by not seeing it — so the honest reduced-motion
   * answer is to skip it entirely rather than to leave seven glyphs sitting on
   * top of the dialog.
   */
  if (!isDrifting || !box) return null;

  return (
    <div
      aria-hidden
      /*
       * Above the panel's own `z-10`, so a lantern crossing the dialog's edge
       * passes in front of it rather than disappearing behind the very border
       * it is leaving.
       */
      className="pointer-events-none fixed z-20 overflow-visible"
      style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
    >
      {flight.map((lantern, index) => (
        <motion.span
          key={index}
          /* The warm halo is `.dragon-lantern`'s — see `index.css`. */
          className="dragon-lantern absolute"
          /*
           * Negative margins rather than a `translate(-50%, -50%)`, because
           * Framer owns `transform` on this element — it is animating `x`,
           * `y`, `scale` and `rotate` through it — and a CSS translate written
           * alongside would simply be overwritten on the first frame.
           * `LanternGlyph` is `h-11 w-7`, so half of that is 1.375rem and
           * 0.875rem.
           *
           * `transformOrigin` is the *top* of the glyph, which is where the
           * cord is. See the note on `rotate` above: this is the difference
           * between a lantern swinging and a lantern tumbling.
           */
          style={{
            left: `${lantern.left}%`,
            top: `${lantern.top}%`,
            marginLeft: '-0.875rem',
            marginTop: '-1.375rem',
            transformOrigin: '50% 6%',
          }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.35, rotate: 0 }}
          animate={{
            x: lantern.x,
            y: lantern.y,
            opacity: [0, 0.95, 0.95, 0],
            scale: lantern.scale,
            rotate: lantern.rotate,
          }}
          transition={{
            duration: lantern.duration,
            delay: lantern.delay,
            /*
             * `easeOut` rather than a custom curve, for the same reason the
             * bats use it: a cubic-bezier is applied *between each pair* of
             * keyframes, so a sharper curve makes the object sprint to the
             * midpoint, stop, and sprint again — a stutter exactly where the
             * sway is supposed to read as one continuous arc.
             */
            ease: 'easeOut',
            /*
             * Held at full opacity for longer than the bats hold theirs
             * (0.62 → 0.72 of the travel). A bat leaving is supposed to be
             * half-missed; a lantern is supposed to be watched, and fading it
             * out at two-thirds of a rise this slow reads as the thing burning
             * out rather than as it getting away.
             */
            opacity: {
              times: [0, 0.12, 0.72, 1],
              duration: lantern.duration,
              delay: lantern.delay,
            },
          }}
        >
          <LanternGlyph className="h-11 w-7" />
        </motion.span>
      ))}
    </div>
  );
};
