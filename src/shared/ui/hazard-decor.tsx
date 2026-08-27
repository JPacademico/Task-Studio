import type { CSSProperties } from 'react';
import { useReducedMotion } from 'framer-motion';

import { useSkin } from '@/app/providers/theme-provider';

/**
 * What is leaking, drifting up off the whole page.
 *
 * Everything else this skin owns — the stencil hatching, the tape down every
 * rail, the sludge pooled in the bottom of each card, the trefoil turning in
 * the corner — is a variable or a background-image. What was missing needs
 * actual objects in actual positions: motes of contamination coming up out of
 * the tanks.
 *
 * The same mechanic as `EmberRise`, read in a different world. An ember is hot
 * and *cools* as it climbs; a mote of this is not hot at all — it is airborne
 * particulate, so it does not change colour, it **fades and disperses**: rising
 * slower, wandering further sideways, and thinning out rather than burning
 * down. Same contract, opposite physics.
 *
 * ## Why this one is cheaper than the embers
 *
 * `lava-ember-rise` animates `background` and `box-shadow` as well as
 * `transform`, which is a repaint per frame per particle — affordable there
 * only because the elements are 4px and few, and flagged in that file as a
 * pattern not to copy. So this does not copy it. Every frame here changes
 * `transform` and `opacity` only, which the compositor handles on its own
 * thread with no repaint at all; the glow that makes a mote look like it is
 * emitting is a static `box-shadow` set once and left alone.
 *
 * Decorative and inert: `aria-hidden`, `pointer-events-none`, and it stops dead
 * under `prefers-reduced-motion`. Nothing here participates in layout.
 */

/**
 * Every mote currently in the air, hand-placed.
 *
 * Not `Math.random()`, for the same reason the embers, the leaves and the
 * bubbles are not: a random field clumps, and a clumped field reads as a bug
 * rather than as weather.
 *
 * Spread wider and flatter than the ember field. Embers come off a vent, so
 * they are weighted to the middle; a leak has no single source — the whole
 * floor is the source — so these are even across the width, longer-lived, and
 * dimmer. Twelve of them, which is the point at which the field reads as
 * continuous without any two ever being close enough to look paired.
 *
 * The negative delays are what make the first frame look like something
 * already happening rather than a volley launched the moment the theme was
 * picked.
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
 * Contamination drifting up past the whole page.
 *
 * Mounted once by the app shell and inert on every other skin — on twelve of
 * the thirteen themes this returns `null` before rendering anything.
 *
 * Same z-25 band as the autumn fall, the bubbles and the embers, and for the
 * same reason: above the content so a card cannot hide it, below the chrome so
 * it never drifts across a menu or a dialog.
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
