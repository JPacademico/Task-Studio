import type { CSSProperties } from 'react';
import { useReducedMotion } from 'framer-motion';

import { useSkin } from '@/app/providers/theme-provider';

/**
 * The one thing the volcano skin does that a stylesheet cannot.
 *
 * Everything else this skin owns — the crazed basalt, the hot seam under every
 * edge, the caldera glowing below the bottom of the page, the vent on the
 * horizon — is a variable or a background-image. What is left needs actual
 * objects in actual positions: embers going up off the whole page.
 *
 * Decorative and inert: `aria-hidden`, `pointer-events-none`, and it stops dead
 * under `prefers-reduced-motion`. Nothing here participates in layout.
 *
 * This is deliberately the autumn fall with the sign flipped, and the two are
 * meant to be recognisable as the same mechanic read in opposite directions —
 * one skin's world falls, the other's rises. What stops it being a recolour is
 * that an ember *cools* as it climbs: the CSS walks its colour down the
 * temperature ramp from core to crust, so the field is dense and bright at the
 * bottom of the screen and nearly gone by the top. A leaf is the same leaf all
 * the way down; an ember is not.
 */

/**
 * Every ember currently in the air, hand-placed.
 *
 * Not `Math.random()`, for the same reason `AutumnFall` and `BubbleRise` are
 * not: a random field clumps, and a clumped field reads as a bug rather than as
 * weather.
 *
 * Weighted toward the bottom-centre of the screen — the lives are shortest and
 * the sizes largest in the middle columns, because that is where the vent is on
 * the page wash. A field spread evenly across the width would be embers coming
 * off nothing.
 *
 * The negative delays are what make the first frame look like something already
 * happening rather than a volley launched the moment the theme was picked.
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
 * Embers going up past the whole page.
 *
 * Mounted once by the app shell and inert on every other skin — on twelve of
 * the thirteen themes this returns `null` before rendering anything.
 *
 * Same z-25 band as the autumn fall and the bubbles, and for the same reason:
 * above the content so a card cannot hide it, below the chrome so it never
 * drifts across a menu or a dialog.
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
