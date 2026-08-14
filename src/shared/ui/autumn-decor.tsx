import type { CSSProperties } from 'react';
import { useReducedMotion } from 'framer-motion';

import { useSkin } from '@/app/providers/theme-provider';
import { cn } from '@/shared/lib/cn';
import type { NavEdge } from '@/shared/lib/nav-preferences.store';

/**
 * The things the autumn skin does that a stylesheet cannot.
 *
 * Everything else this skin owns — the parchment, the warm shadows, the bough
 * hanging in the corner of the page, the leaf resting on every card — is a
 * variable or a background-image, because that is what those things are. What
 * is left needs actual shapes in actual positions: leaves coming down across
 * the page, and a hedge growing out of the seam where a rail meets it.
 *
 * Both are decorative and inert: `aria-hidden`, `pointer-events-none`, and both
 * stop dead under `prefers-reduced-motion` (falling leaves are exactly the kind
 * of drifting background motion that setting exists for). Neither participates
 * in layout, so nothing here can break a page that stops drawing it.
 *
 * The animations are CSS, not Framer keyframes — the same rule the Post-it
 * flutter and the eldritch tendrils follow. A dozen JavaScript-driven loops
 * running forever behind the whole app is a frame budget spent on scenery.
 */

/* ------------------------------------------------------------------------ *
 * The leaves themselves
 * ------------------------------------------------------------------------ */

type LeafTone = 'ember' | 'gold' | 'moss' | 'brand';

/** Which variable each tone paints out of. */
const TONE_FILL: Record<LeafTone, string> = {
  ember: 'rgb(var(--autumn-ember))',
  gold: 'rgb(var(--autumn-gold))',
  moss: 'rgb(var(--autumn-moss))',
  brand: 'rgb(var(--brand))',
};

interface LeafProps {
  tone: LeafTone;
  /** Maple or a plain blade — a set of one shape reads as a repeated sprite. */
  shape: 'maple' | 'blade';
  className?: string;
  style?: CSSProperties;
}

/**
 * One leaf.
 *
 * Filled, with the midrib and two side veins drawn over it in bark. The veins
 * are what stop it reading as an orange blob at 16px: they give the shape a
 * direction, so even when it is too small to identify it is still obviously a
 * leaf pointing somewhere.
 */
const Leaf = ({ tone, shape, className, style }: LeafProps) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className} style={style}>
    {shape === 'maple' ? (
      <path
        d="M12 1.4 13.4 4.5 15.8 3.4 15.1 6.4 18.5 5.7 16.9 8.2 20.6 8.6 18 10.6 21.4 12.3 17.8 13.5
           19.7 16.1 16 15.8 16.9 19 13.4 17.2 12.9 22.6 11.1 22.6 10.6 17.2 7.1 19 8 15.8 4.3 16.1
           6.2 13.5 2.6 12.3 6 10.6 3.4 8.6 7.1 8.2 5.5 5.7 8.9 6.4 8.2 3.4 10.6 4.5Z"
        fill={TONE_FILL[tone]}
      />
    ) : (
      <path
        d="M12 1.6c5.6 3.4 8.6 8 8.6 12.4 0 4.4-3.4 7.4-8.6 8.4-5.2-1-8.6-4-8.6-8.4C3.4 9.6 6.4 5 12 1.6Z"
        fill={TONE_FILL[tone]}
      />
    )}

    <g
      stroke="rgb(var(--autumn-bark))"
      strokeOpacity="0.45"
      strokeWidth="1.1"
      strokeLinecap="round"
      fill="none"
    >
      <path d="M12 22.6V8.4" />
      <path d="m12 13.4-4-4" />
      <path d="m12 11.6 4-4" />
    </g>
  </svg>
);

/* ------------------------------------------------------------------------ *
 * The fall
 * ------------------------------------------------------------------------ */

/**
 * Every leaf currently in the air, hand-placed.
 *
 * Not `Math.random()`, and not for the usual re-render reason: a random field
 * *clumps*. Ten leaves at ten random columns will regularly drop three of them
 * within a few percent of each other and leave a third of the screen empty,
 * which reads as a bug rather than as weather. These are spread across the
 * viewport, and everything else about each one — how long it takes to come
 * down, how far it swings, how fast it turns, which way it turns — is varied
 * enough that no two are ever in step.
 *
 * The negative delays matter: without them every leaf starts at the top of the
 * screen on the first frame after the skin is chosen, and the effect opens with
 * a curtain of leaves coming down in a line. Starting each one part-way through
 * its own fall means the first frame already looks like weather that has been
 * going on for a while.
 */
const FALLING: {
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  spin: number;
  opacity: number;
  tone: LeafTone;
  shape: 'maple' | 'blade';
}[] = [
  { left: 4, size: 22, duration: 15, delay: -2, drift: 46, spin: 7, opacity: 0.55, tone: 'ember', shape: 'maple' },
  { left: 17, size: 15, duration: 21, delay: -13, drift: -34, spin: 9.5, opacity: 0.4, tone: 'gold', shape: 'blade' },
  { left: 28, size: 26, duration: 18, delay: -7, drift: 58, spin: 6, opacity: 0.5, tone: 'brand', shape: 'maple' },
  { left: 39, size: 13, duration: 24, delay: -19, drift: -28, spin: 11, opacity: 0.34, tone: 'moss', shape: 'blade' },
  { left: 51, size: 19, duration: 16.5, delay: -4, drift: 40, spin: 8, opacity: 0.48, tone: 'gold', shape: 'maple' },
  { left: 63, size: 24, duration: 20, delay: -11, drift: -52, spin: 6.5, opacity: 0.52, tone: 'ember', shape: 'blade' },
  { left: 74, size: 14, duration: 23, delay: -16, drift: 30, spin: 10, opacity: 0.36, tone: 'brand', shape: 'maple' },
  { left: 84, size: 20, duration: 17.5, delay: -6, drift: -44, spin: 7.5, opacity: 0.46, tone: 'gold', shape: 'blade' },
  { left: 93, size: 17, duration: 22, delay: -14, drift: 36, spin: 9, opacity: 0.42, tone: 'moss', shape: 'maple' },
];

/**
 * Leaves coming down over the whole page.
 *
 * Mounted once by the app shell and inert on every other skin, which is why it
 * is affordable to leave in the tree: on eight of the nine themes this returns
 * `null` before it renders anything at all.
 *
 * It sits *above* the page content and *below* the chrome (z-25 against the
 * rails' z-40/z-50). Behind the content it would be invisible the moment a card
 * covered it, which on this app is most of the screen; above the chrome it
 * would be litter drifting over the menus and the dialogs. Between the two, it
 * is weather happening in the room the app is in.
 *
 * Each leaf is two nested elements on purpose: the outer one owns the fall and
 * the sway, the inner one owns the tumble. One element cannot hold both, since
 * the second `transform` would simply replace the first.
 */
export const AutumnFall = () => {
  const reduceMotion = useReducedMotion();
  if (useSkin() !== 'AUTUMN' || reduceMotion) return null;

  return (
    <div aria-hidden className="autumn-fall pointer-events-none fixed inset-0 z-[25] overflow-hidden">
      {FALLING.map((leaf, index) => (
        <span
          key={index}
          className="autumn-fall__leaf"
          style={
            {
              left: `${leaf.left}%`,
              opacity: leaf.opacity,
              '--leaf-size': `${leaf.size}px`,
              '--leaf-duration': `${leaf.duration}s`,
              '--leaf-delay': `${leaf.delay}s`,
              '--leaf-drift': `${leaf.drift}px`,
            } as CSSProperties
          }
        >
          <span
            className="autumn-fall__spin"
            style={
              {
                // Alternating direction, so half the field turns each way.
                '--leaf-spin': `${leaf.spin}s`,
                '--leaf-spin-dir': index % 2 === 0 ? 'normal' : 'reverse',
              } as CSSProperties
            }
          >
            <Leaf tone={leaf.tone} shape={leaf.shape} className="h-full w-full" />
          </span>
        </span>
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------------ *
 * The hedge
 * ------------------------------------------------------------------------ */

/**
 * How many sprigs grow out of one seam.
 *
 * Six, spread down the edge on an offset that is not a clean fraction so the
 * row never reads as a comb — the same reasoning as the eldritch tendril count,
 * and the same ceiling: each sprig is one compositor animation, and two rails
 * together already hold a dozen. They also stop when the rail they belong to is
 * shut, so a hidden menu costs nothing.
 */
const SPRIG_COUNT = 6;

/** Three leaves and a twig, fanned out from the seam. */
const Sprig = ({ index }: { index: number }) => (
  <span
    className="autumn-sprig"
    style={
      {
        top: `${2 + index * 15.7}%`,
        // Per-sprig, so six of them never breathe in step.
        '--sprig-duration': `${(5.2 + (index % 3) * 1.4).toFixed(1)}s`,
        '--sprig-delay': `${(index * 0.71).toFixed(2)}s`,
      } as CSSProperties
    }
  >
    <svg viewBox="0 0 48 56" fill="none" aria-hidden className="h-16 w-12">
      {/* The twig. Bolted to the rail's border: nothing at x=0 ever moves,
          which is what keeps the growth attached to the thing it grows out
          of rather than floating alongside it. */}
      <path
        d="M0 28 C 10 27, 18 22, 26 16 M6 28 C 14 30, 20 36, 25 44 M10 28 C 18 28, 26 27, 34 25"
        stroke="rgb(var(--autumn-bark))"
        strokeOpacity="0.85"
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      {/* The leaves it carries. Ellipses rather than the drawn maple: at this
          size a five-lobed silhouette turns to mush, and a simple blade with a
          midrib stays legible down to a few pixels. */}
      <g className="autumn-sprig__leaves">
        <g transform="rotate(-38 27 15)">
          <ellipse cx="27" cy="15" rx="11" ry="6" fill="rgb(var(--autumn-ember))" fillOpacity="0.9" />
          <path d="M16 15h22" stroke="rgb(var(--autumn-bark))" strokeOpacity="0.5" strokeWidth="1.2" />
        </g>
        <g transform="rotate(52 26 45)">
          <ellipse cx="26" cy="45" rx="10" ry="5.5" fill="rgb(var(--autumn-gold))" fillOpacity="0.9" />
          <path d="M16 45h20" stroke="rgb(var(--autumn-bark))" strokeOpacity="0.5" strokeWidth="1.2" />
        </g>
        <g transform="rotate(12 36 25)">
          <ellipse cx="36" cy="25" rx="10" ry="5.5" fill="rgb(var(--brand))" fillOpacity="0.85" />
          <path d="M26 25h20" stroke="rgb(var(--autumn-bark))" strokeOpacity="0.5" strokeWidth="1.2" />
        </g>
        <g transform="rotate(-12 18 36)">
          <ellipse cx="18" cy="36" rx="8" ry="4.5" fill="rgb(var(--autumn-moss))" fillOpacity="0.8" />
        </g>
      </g>
    </svg>
  </span>
);

interface AutumnHedgeProps {
  /**
   * Which edge of the screen the rail this belongs to is anchored to.
   *
   * Only the two full-height side rails grow one. The top bar is 56px tall and
   * sits directly over the page content — a hedge hanging out of the bottom of
   * it would cross the first line of every screen, which is decoration getting
   * in the way of the app.
   */
  edge: NavEdge;
  /** A hedge on a shut rail stops moving — see the note on SPRIG_COUNT. */
  isActive: boolean;
}

/**
 * What has grown over the seam while the menu was hidden.
 *
 * Every skin marks the join between a hidden rail and the page: the studio look
 * glows, the deep field sinks a singularity into it, the eldritch one grips it.
 * This one has simply been left alone long enough for something to take root in
 * it. Anchored *past* the rail's border rather than inside it, so the sprigs
 * come out of the edge and onto the page instead of looking like a pattern
 * printed on the sidebar.
 */
export const AutumnHedge = ({ edge, isActive }: AutumnHedgeProps) => {
  const reduceMotion = useReducedMotion();
  if (useSkin() !== 'AUTUMN' || edge === 'top') return null;

  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-y-0 w-12',
        'transition-opacity duration-300 ease-studio',
        edge === 'left' ? 'left-full' : 'right-full -scale-x-100',
        // Hidden with the rail, not just stopped: the strip sits outside the
        // panel, so it does not travel fully off-screen with it, and a frozen
        // fringe of leaves at the screen edge would sit exactly where the edge
        // affordance needs to be legible.
        isActive ? 'opacity-100' : 'opacity-0',
        (!isActive || reduceMotion) && 'autumn-hedge--still',
      )}
    >
      {Array.from({ length: SPRIG_COUNT }, (_, index) => (
        <Sprig key={index} index={index} />
      ))}
    </span>
  );
};
