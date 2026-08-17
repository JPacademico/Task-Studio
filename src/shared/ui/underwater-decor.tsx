import type { CSSProperties } from 'react';
import { useReducedMotion } from 'framer-motion';

import { useSkin } from '@/app/providers/theme-provider';

/**
 * The one thing the underwater skin does that a stylesheet cannot.
 *
 * Everything else this skin owns — the caustic net, the godrays, the depth
 * gradient, the kelp in the corner of the page — is a variable or a
 * background-image, because that is what those things are. What is left needs
 * actual objects in actual positions: bubbles crossing the whole page.
 *
 * Decorative and inert: `aria-hidden`, `pointer-events-none`, and it stops dead
 * under `prefers-reduced-motion`, which is exactly the setting drifting
 * background motion exists for. Nothing here participates in layout, so a page
 * that stops drawing it is unchanged.
 *
 * Modelled on `AutumnFall` rather than on `RuneScribe`, and the difference is
 * worth recording: the rune scribe runs a `setInterval` because its marks are
 * *events* — one appears, lives, and is gone. Bubbles are a continuous field,
 * and a field does not need a scheduler. This is a fixed set of elements with
 * CSS animations on negative delays, so it costs zero JavaScript per frame and
 * there is no timer to leak.
 */

/**
 * Every bubble currently in the water, hand-placed.
 *
 * Not `Math.random()`, and not for the usual re-render reason: a random field
 * *clumps*. Ten bubbles at ten random columns will regularly stack three within
 * a few percent of each other and leave a third of the screen empty, which
 * reads as a bug rather than as water.
 *
 * The negative delays are what make the first frame work. Without them every
 * bubble starts at the bottom of the screen the instant the skin is chosen, and
 * the effect opens with a rank of bubbles rising in formation. Starting each
 * one part-way through its own climb means the very first frame already looks
 * like water that has been doing this for a while.
 *
 * Sizes run 5–16px and lives run 11–26s, both inversely: a big bubble is more
 * buoyant and gets there faster. That relationship is doing more work than it
 * looks — a field where size and speed are independent reads as confetti.
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
 * Bubbles going up past the whole page.
 *
 * Mounted once by the app shell and inert on every other skin, which is why it
 * is affordable to leave in the tree: on twelve of the thirteen themes this
 * returns `null` before rendering anything.
 *
 * It sits *above* the page content and *below* the chrome (z-25 against the
 * rails' z-40/z-50), for the same reason the autumn fall does. Behind the
 * content it would be invisible the moment a card covered it, which on this app
 * is most of the screen; above the chrome it would be bubbles drifting over the
 * menus and dialogs. Between the two, it is water in the room the app is in.
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
