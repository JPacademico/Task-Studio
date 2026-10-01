import type { CSSProperties } from 'react';
import { useReducedMotion } from 'framer-motion';

import { useSkin } from '@/app/providers/theme-provider';

/**
 * The one thing the underwater skin does that a stylesheet cannot. Everything else this skin owns —
 * the caustic net, the godrays, the depth gradient, the kelp in the corner of the page.
 */

/**
 * Every bubble currently in the water, hand-placed. Not `Math.random()`, and not for the usual
 * re-render reason: a random field *clumps*.
 */
const BUBBLES: {
  left: number;
  size: number;
  life: number;
  delay: number;
  drift: number;
  opacity: number;
}[] = [
  { left: 6, size: 9, life: 18, delay: -3, drift: 2.4, opacity: 0.5 },
  { left: 15, size: 5, life: 26, delay: -17, drift: -1.6, opacity: 0.34 },
  { left: 24, size: 14, life: 13, delay: -8, drift: 3.1, opacity: 0.42 },
  { left: 33, size: 7, life: 22, delay: -12, drift: -2.2, opacity: 0.46 },
  { left: 44, size: 11, life: 16, delay: -5, drift: 1.8, opacity: 0.38 },
  { left: 54, size: 6, life: 24, delay: -19, drift: -2.8, opacity: 0.44 },
  { left: 64, size: 16, life: 11, delay: -2, drift: 2.6, opacity: 0.36 },
  { left: 73, size: 8, life: 20, delay: -14, drift: -1.9, opacity: 0.48 },
  { left: 83, size: 12, life: 15, delay: -6, drift: 2.9, opacity: 0.4 },
  { left: 92, size: 6, life: 23, delay: -10, drift: -2.4, opacity: 0.45 },
];

/**
 * Bubbles going up past the whole page. Mounted once by the app shell and inert on every other
 * skin, which is why it is affordable to leave in the tree.
 */
export const BubbleRise = () => {
  const reduceMotion = useReducedMotion();
  if (useSkin() !== 'UNDERWATER' || reduceMotion) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[25] overflow-hidden">
      {BUBBLES.map((bubble, index) => (
        <span
          key={index}
          className="tide-bubble"
          style={
            {
              left: `${bubble.left}%`,
              '--bubble-size': `${bubble.size}px`,
              '--bubble-life': `${bubble.life}s`,
              '--bubble-delay': `${bubble.delay}s`,
              '--bubble-drift': `${bubble.drift}vw`,
              '--bubble-opacity': bubble.opacity,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
};
