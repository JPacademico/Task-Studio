import { useLayoutEffect, useMemo, useState, type RefObject } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { useSkin } from '@/app/providers/theme-provider';
import { BatGlyph } from './halloween-icons';

/** How many bats leave. Enough to read as a swarm, few enough to stay legible. */
const COUNT = 9;

interface BatSwarmProps {
  /**
   * The dialog the bats come off. A ref rather than a parent, and that is the whole fix — see the
   * note below on the clip.
   */
  anchor: RefObject<HTMLElement | null>;
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** A burst of bats off the edges of a dialog, on the Halloween skin only. */
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
        // Evenly around the dialog, starting a little past due-right so that no bat begins life
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
        // Further, because they are bigger. The travel used to end about 140-270px out, which
        // cleared a 24px bat comfortably.
        const distance = 190 + jitter * 150;

        // The sway, and why the travel is three points rather than one. Straight out along the
        // radius is how a firework leaves, not how a bat does.
        const swing = (28 + jitter * 34) * (index % 2 === 0 ? 1 : -1);
        const swayX = -sin * swing;
        const swayY = cos * swing;

        return {
          // Percentages of the dialog's own box, so one set of numbers is
          // correct for a 512px form and a full-width bottom sheet alike.
          left: 50 + edgeX * 50,
          top: 50 + edgeY * 50,
          // Out along the radius, with a lateral wander on the way — see the note on `swing`. The
          // travel is what carries them off the dialog.
          x: [0, cos * distance * 0.45 + swayX, cos * distance],
          y: [0, sin * distance * 0.45 + swayY, sin * distance],
          // Banked, and banked *through* the sway rather than into a fixed angle: the middle value
          // leans the bat towards the side it is drifting to and the last one levels it off.
          rotate: [
            0,
            ((angle * 180) / Math.PI) * 0.2 + (swing > 0 ? 14 : -14),
            ((angle * 180) / Math.PI) * 0.2 + (jitter - 0.5) * 36,
          ],
          scale: 0.55 + jitter * 0.5,
          delay: index * 0.028,
          // Longer than it was: a bat that crosses 200px in three quarters of a second is a
          // projectile.
          duration: 1.3 + jitter * 0.6,
        };
      }),
    [],
  );

  // Reduced motion gets nothing at all rather than a static bat. This is pure decoration with no
  // state to communicate.
  if (!isFlying || !box) return null;

  return (
    <div
      aria-hidden
      /* Above the panel's own `z-10`, so a bat crossing the dialog's edge passes in front of it
         rather than disappearing behind the very border it is leaving. */
      className="pointer-events-none fixed z-20 overflow-visible"
      style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
    >
      {flight.map((bat, index) => (
        <motion.span
          key={index}
          /* The colour and the halo are `.hw-bat`'s — see `--hw-bat-ink`. */
          className="hw-bat absolute"
          /* Negative margins rather than a `translate(-50%, -50%)`, because Framer owns `transform`
             on this element — it is animating `x`, `y`. */
          style={{
            left: `${bat.left}%`,
            top: `${bat.top}%`,
            marginLeft: '-1.5rem',
            marginTop: '-1rem',
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
            /* `easeOut` rather than the custom curve, now that the travel is a three-point path. A
               cubic-bezier is applied *between each pair* of keyframes. */
            ease: 'easeOut',
            opacity: { times: [0, 0.15, 0.62, 1], duration: bat.duration, delay: bat.delay },
          }}
        >
          {/* Twice what it was. At 16 pixels the rig was there and nobody could see it — the
              wings, the ears and the notched trailing edge are all features of a *shape*. */}
          <BatGlyph className="h-8 w-12" />
        </motion.span>
      ))}
    </div>
  );
};
