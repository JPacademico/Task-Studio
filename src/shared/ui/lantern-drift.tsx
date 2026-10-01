import { useLayoutEffect, useMemo, useState, type RefObject } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { useSkin } from '@/app/providers/theme-provider';
import { LanternGlyph } from './dragon-icons';

/**
 * How many lanterns leave. Fewer than the bats' nine, and the reason is size rather than taste: a
 * lantern at 44px is nearly three times the area of a bat glyph.
 */
const COUNT = 7;

interface LanternDriftProps {
  /**
   * The dialog the lanterns come off. A ref rather than a parent, and that is the whole fix — see
   * the note below on the clip, and the identical arrangement in `BatSwarm`.
   */
  anchor: RefObject<HTMLElement | null>;
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Paper lanterns drifting off the edges of a dialog, on the Dragon skin only. */
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

      // Twenty frames is a third of a second at 60Hz — several times the dialog's own 180ms enter —
      // so the cap is a guard against a dialog that never stops moving.
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
        // Evenly around the dialog, starting a little past due-right so that no lantern begins life
        // sitting exactly on a corner.
        const angle = ((index + 0.35) / COUNT) * Math.PI * 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        // The circle mapped onto the border of the box. Dividing by the larger of the two
        // components pushes the point out until one axis is at the full half-extent.
        const reach = Math.max(Math.abs(cos), Math.abs(sin));
        const edgeX = cos / reach;
        const edgeY = sin / reach;

        // A fixed wobble per index, so the ring is not a perfect clock face.
        const jitter = ((index * 37) % 11) / 11;
        const distance = 120 + jitter * 90;

        // Buoyancy, and it is what separates a lantern from a firework. The vertical travel is the
        // radial component *minus* a constant rise.
        const lift = 150 + jitter * 70;

        // The sway, and why the travel is three points rather than one. A lantern on a cord is a
        // pendulum being carried by a draught, so it does not rise on a line.
        const swing = (22 + jitter * 26) * (index % 2 === 0 ? 1 : -1);

        return {
          // Percentages of the dialog's own box, so one set of numbers is
          // correct for a 512px form and a full-width bottom sheet alike.
          left: 50 + edgeX * 50,
          top: 50 + edgeY * 50,
          x: [0, cos * distance * 0.45 + swing, cos * distance],
          // The rise is applied to both waypoints rather than only the last, so the lantern is
          // already climbing at the midpoint instead of travelling flat and then turning a corner.
          y: [0, sin * distance * 0.45 - lift * 0.4, sin * distance - lift],
          // Swung, not banked. This is the one place the two effects genuinely disagree. A bat
          // rotates *into* its direction of travel because it is flying.
          rotate: [0, swing > 0 ? 9 : -9, (jitter - 0.5) * 8],
          scale: 0.6 + jitter * 0.45,
          // Wider than the bats' 28ms. Lanterns are let go of one at a time.
          delay: index * 0.075,
          // Slow, and slower than anything else in the product. A bat crossing 200px in 1.3s is
          // already a compromise.
          duration: 2.1 + jitter * 0.8,
        };
      }),
    [],
  );

  // Reduced motion gets nothing at all rather than a static lantern. This is pure decoration with
  // no state to communicate.
  if (!isDrifting || !box) return null;

  return (
    <div
      aria-hidden
      /* Above the panel's own `z-10`, so a lantern crossing the dialog's edge passes in front of it
         rather than disappearing behind the very border it is leaving. */
      className="pointer-events-none fixed z-20 overflow-visible"
      style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
    >
      {flight.map((lantern, index) => (
        <motion.span
          key={index}
          /* The warm halo is `.dragon-lantern`'s — see `index.css`. */
          className="dragon-lantern absolute"
          /* Negative margins rather than a `translate(-50%, -50%)`, because Framer owns `transform`
             on this element — it is animating `x`, `y`. */
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
            /* `easeOut` rather than a custom curve, for the same reason the bats use it: a
               cubic-bezier is applied *between each pair* of keyframes. */
            ease: 'easeOut',
            /* Held at full opacity for longer than the bats hold theirs (0.62 → 0.72 of the
               travel). */
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
