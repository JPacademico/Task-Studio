import type { CSSProperties } from 'react';
import { useReducedMotion } from 'framer-motion';

import { useSkin } from '@/app/providers/theme-provider';

/**
 * What is leaking, drifting up off the whole page. Everything else this skin owns — the stencil
 * hatching, the tape down every rail, the sludge pooled in the bottom of each card.
 */

/**
 * Every mote currently in the air, hand-placed. Not `Math.random()`, for the same reason the
 * embers, the leaves and the bubbles are not: a random field clumps.
 */
const MOTES: {
  left: number;
  size: number;
  life: number;
  delay: number;
  drift: number;
  opacity: number;
}[] = [
  { left: 4, size: 3, life: 26, delay: -17, drift: 4.2, opacity: 0.32 },
  { left: 13, size: 2, life: 31, delay: -6, drift: -3.4, opacity: 0.26 },
  { left: 22, size: 4, life: 22, delay: -12, drift: 5.1, opacity: 0.4 },
  { left: 30, size: 2, life: 29, delay: -24, drift: -4.6, opacity: 0.24 },
  { left: 39, size: 3, life: 25, delay: -3, drift: 3.8, opacity: 0.34 },
  { left: 48, size: 5, life: 19, delay: -15, drift: -5.4, opacity: 0.46 },
  { left: 57, size: 2, life: 33, delay: -9, drift: 4.4, opacity: 0.22 },
  { left: 66, size: 4, life: 23, delay: -20, drift: -3.2, opacity: 0.38 },
  { left: 75, size: 3, life: 27, delay: -1, drift: 5.6, opacity: 0.3 },
  { left: 83, size: 2, life: 30, delay: -13, drift: -4.1, opacity: 0.25 },
  { left: 91, size: 4, life: 21, delay: -8, drift: 3.6, opacity: 0.42 },
  { left: 97, size: 3, life: 28, delay: -22, drift: -4.8, opacity: 0.28 },
];

/**
 * Contamination drifting up past the whole page. Mounted once by the app shell and inert on every
 * other skin — on twelve of the thirteen themes this returns `null` before rendering anything.
 */
export const HazardDrift = () => {
  const reduceMotion = useReducedMotion();
  if (useSkin() !== 'HAZARD' || reduceMotion) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[25] overflow-hidden">
      {MOTES.map((mote, index) => (
        <span
          key={index}
          className="hazard-mote"
          style={
            {
              left: `${mote.left}%`,
              '--mote-size': `${mote.size}px`,
              '--mote-life': `${mote.life}s`,
              '--mote-delay': `${mote.delay}s`,
              '--mote-drift': `${mote.drift}vw`,
              '--mote-opacity': mote.opacity,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
};
