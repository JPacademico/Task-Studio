import { useEffect, useState, type CSSProperties } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

import { useSkin } from '@/app/providers/theme-provider';
import { cn } from '@/shared/lib/cn';
import type { NavEdge } from '@/shared/lib/nav-preferences.store';

/**
 * The things the eldritch skin does that a stylesheet cannot.
 *
 * Everything else a skin owns — colour, radius, type, texture, motion curve —
 * resolves through CSS variables, and that is deliberately where it stops. This
 * file is the exception: three effects that need actual geometry or actual
 * scheduling, and would otherwise be a pile of gradients pretending to be
 * shapes.
 *
 * All three are decorative and inert: `aria-hidden`, `pointer-events-none`, and
 * gone entirely under `prefers-reduced-motion`. Nothing here participates in
 * layout, so nothing here can break a page that stops rendering it.
 */

/* ------------------------------------------------------------------------ *
 * Tendrils
 * ------------------------------------------------------------------------ */

/**
 * How many reach out of one seam.
 *
 * Seven, not seventy. Each one carries its own compositor animation, and the
 * three rails together already hold twenty-one — enough to read as *many*
 * without turning the chrome into a particle system. They also pause when the
 * rail they belong to is shut, so a hidden menu costs nothing.
 */
const TENDRIL_COUNT = 7;

/**
 * One limb, drawn once. Length and phase come from its index.
 *
 * Two things about how this is built, both of which are the difference between
 * a tentacle and a decoration:
 *
 * **It is filled, not stroked.** A stroke has one width along its whole
 * length, which is a piece of wire. What makes a tentacle read as a tentacle
 * is that it is fat where it leaves the body and comes to a point, so each
 * outline goes out along one side and returns along the other.
 *
 * **It is jointed, and the root joint does not move.** The first version
 * rotated the whole drawing about a point in the middle of its base, which
 * swung the base edge off the rail's border — a tentacle visibly detaching
 * from the thing it grows out of. So the limb is three pieces: a static wedge
 * bolted to the border, then two segments that rotate about the joint where
 * each meets the one before it. Nothing at x=0 ever moves.
 *
 * The segments also lag: the tip's animation starts a beat after the mid's, so
 * the bend travels outward instead of the whole limb swinging as one rigid
 * piece. That travelling wave is the entire reason it looks alive, and it
 * costs one extra `animation-delay`.
 */
const Tendril = ({ index }: { index: number }) => {
  const curlsDown = index % 2 === 0;

  return (
    <svg
      viewBox="0 0 44 48"
      fill="none"
      aria-hidden
      className="eldritch-tendril absolute h-10 w-8"
      style={
        {
          // Spread down the seam with an offset that is not a clean fraction,
          // so the row never reads as a comb.
          top: `${4 + index * 13.4}%`,
          // Read by the joints below. Per-limb, so seven of them never move
          // in step.
          //
          // Roughly half what they were. At four to seven seconds a limb the
          // set read as underwater weed rather than as something gripping the
          // page — slow enough that you had to watch it to see it move at all.
          // Two to four is the speed of something alive and impatient.
          '--tendril-duration': `${(2.3 + (index % 3) * 0.8).toFixed(1)}s`,
          '--tendril-delay': `${(index * 0.31).toFixed(2)}s`,
        } as CSSProperties
      }
    >
      <g fill="rgb(var(--eldritch-ichor))" fillOpacity="0.78">
        {/* Root. Bolted to the border: no transform, ever. */}
        <path
          d="M0 13 C 6 12.4, 12 14.6, 16 17 L 16 31 C 12 33.4, 6 35.6, 0 35 Z"
          stroke="rgb(var(--brand))"
          strokeOpacity="0.3"
          strokeWidth="1"
          strokeLinejoin="round"
        />

        {/* Everything past here bends. The attribute transform positions each
            joint; the CSS animation lives on a child, because a CSS transform
            on an SVG element *replaces* its transform attribute rather than
            composing with it. */}
        <g transform="translate(16 24)">
          <g className="eldritch-tendril__joint eldritch-tendril__joint--mid">
            {/* Starts at x=-3, i.e. slightly *inside* the segment before it.
                Two polygons meeting exactly on the joint line separate on the
                outside of every bend and open a hairline crease; overlapping
                them means the bend can only ever close, never gap. It also
                sets the pivot 3 units back into the flesh, which is where a
                joint actually is. */}
            <path
              d="M-3 -7 C 5 -7.2, 10 -5.8, 13 -4.6 L 13 4.6 C 10 5.8, 5 7.2, -3 7 Z"
              stroke="rgb(var(--brand))"
              strokeOpacity="0.3"
              strokeWidth="0.9"
              strokeLinejoin="round"
            />
            <ellipse cx="6" cy={curlsDown ? 3.6 : -3.6} rx="2.1" ry="1.6" fill="rgb(var(--eldritch-glow))" fillOpacity="0.6" />

            <g transform="translate(13 0)">
              <g className="eldritch-tendril__joint eldritch-tendril__joint--tip">
                {/* The tip curls back on itself — the one asymmetric piece,
                    flipped for every other limb so the row is not a pattern. */}
                <path
                  d={
                    curlsDown
                      ? 'M-3 -4.6 C 5 -4.6, 9.4 -1.8, 11 2.4 C 12 5.6, 10.2 8.6, 7.6 7.9 C 9.8 6.4, 9.2 3.4, 6.6 1.6 C 4.2 0, 2 3, -3 4.6 Z'
                      : 'M-3 4.6 C 5 4.6, 9.4 1.8, 11 -2.4 C 12 -5.6, 10.2 -8.6, 7.6 -7.9 C 9.8 -6.4, 9.2 -3.4, 6.6 -1.6 C 4.2 0, 2 -3, -3 -4.6 Z'
                  }
                  stroke="rgb(var(--brand))"
                  strokeOpacity="0.3"
                  strokeWidth="0.9"
                  strokeLinejoin="round"
                />
                <ellipse
                  cx="4.6"
                  cy={curlsDown ? 2.4 : -2.4}
                  rx="1.4"
                  ry="1.1"
                  fill="rgb(var(--eldritch-glow))"
                  fillOpacity="0.5"
                />
              </g>
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
};

interface EldritchTendrilsProps {
  /**
   * Which edge of the screen the rail this belongs to is anchored to.
   *
   * Only the two full-height side rails grow them. The top bar is 56px tall
   * and sits directly over the page content — limbs hanging out of the bottom
   * of it would cross the first line of every screen, which is decoration
   * getting in the way of the app. That seam keeps the membrane and nothing
   * else.
   */
  edge: NavEdge;
  /** Tendrils on a shut rail stop moving — see the note on TENDRIL_COUNT. */
  isActive: boolean;
}

/**
 * What is holding the rail onto the page.
 *
 * The seam between a hidden menu and the page is the one place every skin
 * marks: the studio glows, the deep field sinks a singularity into it. The
 * first pass here reached for the same radial-gradient well the deep field
 * uses, which made the two skins read as the same idea in two palettes — the
 * single most common failure mode of a dark theme. So this seam is not lit at
 * all. Something is gripping the edge of the page, and you can see the ends of
 * it moving.
 */
export const EldritchTendrils = ({ edge, isActive }: EldritchTendrilsProps) => {
  const reduceMotion = useReducedMotion();
  if (useSkin() !== 'ELDRITCH' || edge === 'top') return null;

  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-y-0 w-10',
        'transition-opacity duration-300 ease-studio',
        // Anchored *past* the rail's border, not inside it. Drawn within the
        // panel the limbs looked like a pattern printed on the sidebar; the
        // whole idea is that they come out of its edge and onto the page, so
        // the strip starts exactly where the rail stops.
        edge === 'left' ? 'left-full' : 'right-full -scale-x-100',
        // Hidden with the rail, not just stopped.
        //
        // Sitting outside the panel means these do not slide fully off-screen
        // with it: the rail travels its own width plus 12px, so a strip
        // anchored to its far border leaves about 28px of limb showing at the
        // screen edge — frozen, because they are also paused. A permanent
        // fringe of motionless tentacles is not the effect, and it sits
        // exactly where the edge affordance needs to be legible.
        isActive ? 'opacity-100' : 'opacity-0',
        (!isActive || reduceMotion) && 'eldritch-tendrils--still',
      )}
    >
      {Array.from({ length: TENDRIL_COUNT }, (_, index) => (
        <Tendril key={index} index={index} />
      ))}
    </span>
  );
};

/* ------------------------------------------------------------------------ *
 * The gaze
 * ------------------------------------------------------------------------ */

interface GazeArrowProps {
  direction: 'left' | 'right';
  /** Drawn by every skin that is not the eldritch one. */
  fallback: LucideIcon;
  className?: string;
}

/**
 * "Previous" and "next", as an eye that looks that way.
 *
 * An arrow is a sign that points; this world does not have signs, it has
 * things that notice you. The pupil sits hard against the corner it is
 * travelling towards, so the direction is still readable at 16px — which is
 * the whole job, and the reason the eye is a wide lens rather than a circle.
 */
export const GazeArrow = ({ direction, fallback: Fallback, className }: GazeArrowProps) => {
  if (useSkin() !== 'ELDRITCH') return <Fallback className={className} />;

  // Pupil offset. Left looks left, right looks right — no mirroring transform,
  // because the highlight has to stay top-left in both or the eye reads as wet
  // on one side and dry on the other.
  const pupilX = direction === 'left' ? 8.4 : 15.6;

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={cn('h-4 w-4', className)}>
      <path
        d="M1.8 12S5.6 6 12 6s10.2 6 10.2 6-3.8 6-10.2 6S1.8 12 1.8 12Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx={pupilX} cy="12" r="3.5" fill="rgb(var(--eldritch-glow))" fillOpacity="0.45" />
      <circle cx={pupilX} cy="12" r="2.1" fill="currentColor" />
      <circle cx={pupilX - 0.7} cy="11.2" r="0.6" fill="rgb(var(--surface-raised))" opacity="0.9" />
    </svg>
  );
};

/* ------------------------------------------------------------------------ *
 * The watcher
 * ------------------------------------------------------------------------ */

/** How often something opens. Long enough that it is never quite expected. */
const APPEARANCE_INTERVAL = 20_000;
/**
 * How long it stays: open, one blink, gone.
 *
 * It used to linger for four and a half seconds and blink twice, which gave
 * you time to look straight at it — and a thing you can study is a decoration,
 * not a fright. Under three seconds it is over before you have finished
 * turning your head, which is the entire effect.
 */
const APPEARANCE_DURATION = 2_600;

interface Sighting {
  /** Percentages of the viewport, kept clear of the edges and the chrome. */
  x: number;
  y: number;
  scale: number;
  key: number;
}

const nextSighting = (): Sighting => ({
  x: 8 + Math.random() * 78,
  y: 12 + Math.random() * 70,
  scale: 0.8 + Math.random() * 0.55,
  key: Date.now(),
});

/**
 * Something opens an eye somewhere on the page, watches, and closes it.
 *
 * Every twenty seconds, in a place you were not looking. It is `position:
 * fixed`, `pointer-events-none` and `aria-hidden`, so it can never intercept a
 * click, never lands in the accessibility tree, and never affects layout — it
 * is a mood, and a mood that can eat a button is a bug.
 *
 * Mounted once by the app shell and inert on every other skin, which is why it
 * costs nothing to leave in the tree: on seven of the eight themes this
 * component returns `null` before it schedules anything.
 */
export const WanderingEye = () => {
  const skin = useSkin();
  const reduceMotion = useReducedMotion();
  const [sighting, setSighting] = useState<Sighting | null>(null);

  const isWatching = skin === 'ELDRITCH' && !reduceMotion;

  useEffect(() => {
    if (!isWatching) {
      setSighting(null);
      return;
    }

    const timer = setInterval(() => setSighting(nextSighting()), APPEARANCE_INTERVAL);
    return () => clearInterval(timer);
  }, [isWatching]);

  /*
   * It leaves on a timer, and the timer is the only thing that removes it.
   *
   * The first version wrapped this in `<AnimatePresence>` with an `exit`
   * variant, which is the obvious way to fade something out — and it was
   * wrong for the reason this codebase has now hit three times (see the route
   * transitions in `app-layout.tsx` and the grid in the theme gallery):
   * AnimatePresence will not unmount a child until its exit animation
   * *completes*, and Framer drives that on `requestAnimationFrame`. In a
   * backgrounded tab rAF stops, the exit never finishes, and the eye stays on
   * screen — permanently, and no longer where a later sighting says it is.
   *
   * So the fade is a CSS animation the element carries for its whole life
   * (`.eldritch-watcher-life`), and removal is this `setTimeout`. Timers fire
   * in hidden tabs; animations do not have to finish for state to advance.
   */
  useEffect(() => {
    if (!sighting) return;

    const timer = setTimeout(() => setSighting(null), APPEARANCE_DURATION);
    return () => clearTimeout(timer);
  }, [sighting]);

  if (!isWatching || !sighting) return null;

  return (
    <span
      // Keyed so a new sighting is a new element and restarts the animation
      // rather than inheriting the previous one's progress.
      key={sighting.key}
      aria-hidden
      className="eldritch-watcher-life pointer-events-none fixed z-[70] block"
      style={{
        left: `${sighting.x}vw`,
        top: `${sighting.y}vh`,
        width: `${(3.4 * sighting.scale).toFixed(2)}rem`,
      }}
    >
      {/*
        Not a human eye.

        The first version was an almond with a round pupil and a highlight —
        which is the eye on every emoji keyboard, and reads as *someone*
        looking rather than as *something*. Four things take it off the
        mammal branch:

          - The orb is a lumpy sphere, not a symmetric lens. Its outline is
            deliberately uneven from one side to the other.
          - The pupil is a vertical slit. Nothing with a slit pupil is going
            to reassure anybody.
          - The sclera is veined, in the wrong colour, radiating outwards from
            the iris — the one detail that says the thing is alive and
            unwell.
          - Small limbs grip the orb from outside. It is not set in a face; it
            is being held.
      */}
      <svg viewBox="0 0 64 64" fill="none" className="eldritch-watcher h-auto w-full">
        {/* The glow it sits in — no light source on the page could produce
            it, which is the point. */}
        <circle cx="32" cy="32" r="30" fill="rgb(var(--eldritch-glow))" opacity="0.18" />

        {/* What is holding it. Outside the lid group, so a blink does not
            take the grip with it. */}
        <g
          stroke="rgb(var(--eldritch-ichor))"
          strokeWidth="2.6"
          strokeLinecap="round"
          opacity="0.85"
        >
          <path d="M9 20 C 3 15, 2 8, 6 4" />
          <path d="M55 20 C 61 15, 62 8, 58 4" />
          <path d="M8 44 C 2 48, 1 56, 5 60" />
          <path d="M56 44 C 62 48, 63 56, 59 60" />
          <path d="M32 60 C 30 63, 26 64, 23 62" />
        </g>

        {/* The orb. Blinks by collapsing its own height — one `scaleY` on the
            compositor, and it takes the iris and the slit with it. */}
        <g className="eldritch-watcher__lid">
          {/* Lumpy on purpose: the right side bulges lower than the left. */}
          <path
            d="M32 6 C 46 6, 58 16, 58 31 C 58 45, 47 57, 32 57 C 18 57, 7 46, 7 32 C 7 17, 19 6, 32 6 Z"
            fill="rgb(var(--surface-raised))"
            fillOpacity="0.72"
            stroke="rgb(var(--brand))"
            strokeWidth="2"
          />

          {/* Veins. Short, crooked, and reaching the rim. */}
          <g
            stroke="rgb(var(--danger))"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.5"
            fill="none"
          >
            <path d="M22 26 C 16 22, 13 18, 11 14" />
            <path d="M42 25 C 48 22, 52 19, 54 15" />
            <path d="M23 40 C 17 43, 14 47, 12 51" />
            <path d="M43 39 C 49 42, 52 46, 54 50" />
            <path d="M32 44 C 31 50, 32 54, 33 56" />
          </g>

          {/* The iris — a hot ring rather than a flat disc. */}
          <circle cx="32" cy="32" r="13" fill="rgb(var(--eldritch-ichor))" fillOpacity="0.55" />
          <circle cx="32" cy="32" r="13" stroke="rgb(var(--eldritch-glow))" strokeWidth="1.8" />
          <circle
            cx="32"
            cy="32"
            r="8.5"
            stroke="rgb(var(--brand))"
            strokeWidth="1"
            opacity="0.7"
          />

          {/* The slit, drifting. No highlight: a wet catchlight is the single
              most humanising mark you can put on an eye. */}
          <g className="eldritch-watcher__pupil">
            <ellipse cx="32" cy="32" rx="3.1" ry="12" fill="rgb(0 0 0)" />
            <ellipse cx="32" cy="32" rx="1.4" ry="9" fill="rgb(var(--eldritch-glow))" opacity="0.4" />
          </g>
        </g>
      </svg>
    </span>
  );
};
