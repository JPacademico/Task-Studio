import type { CSSProperties } from 'react';
import { useReducedMotion } from 'framer-motion';

import { useSkin } from '@/app/providers/theme-provider';

/**
 * The one thing the volcano skin does that a stylesheet cannot. Everything else this skin owns —
 * the crazed basalt, the hot seam under every edge.
 */

/**
 * Every ember currently in the air, hand-placed. Not `Math.random()`, for the same reason
 * `AutumnFall` and `BubbleRise` are not: a random field clumps.
 */
const EMBERS: {
  left: number;
  size: number;
  life: number;
  delay: number;
  drift: number;
  opacity: number;
}[] = [
  { left: 8, size: 3, life: 21, delay: -13, drift: 2.8, opacity: 0.4 },
  { left: 19, size: 4, life: 17, delay: -4, drift: -2.2, opacity: 0.5 },
  { left: 29, size: 5, life: 14, delay: -9, drift: 3.4, opacity: 0.6 },
  { left: 38, size: 3, life: 19, delay: -16, drift: -1.8, opacity: 0.45 },
  { left: 47, size: 6, life: 12, delay: -2, drift: 2.4, opacity: 0.7 },
  { left: 55, size: 5, life: 15, delay: -7, drift: -3.1, opacity: 0.62 },
  { left: 63, size: 4, life: 18, delay: -11, drift: 1.9, opacity: 0.52 },
  { left: 73, size: 3, life: 23, delay: -18, drift: -2.6, opacity: 0.38 },
  { left: 82, size: 5, life: 16, delay: -6, drift: 3.2, opacity: 0.55 },
  { left: 92, size: 3, life: 20, delay: -14, drift: -2, opacity: 0.42 },
];

/**
 * Embers going up past the whole page. Mounted once by the app shell and inert on every other skin
 * — on twelve of the thirteen themes this returns `null` before rendering anything.
 */
export const EmberRise = () => {
  const reduceMotion = useReducedMotion();
  if (useSkin() !== 'VOLCANO' || reduceMotion) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[25] overflow-hidden">
      {EMBERS.map((ember, index) => (
        <span
          key={index}
          className="lava-ember"
          style={
            {
              left: `${ember.left}%`,
              '--ember-size': `${ember.size}px`,
              '--ember-life': `${ember.life}s`,
              '--ember-delay': `${ember.delay}s`,
              '--ember-drift': `${ember.drift}vw`,
              '--ember-opacity': ember.opacity,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
};
