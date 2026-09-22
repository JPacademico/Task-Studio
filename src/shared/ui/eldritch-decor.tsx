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
 * What is under the page
 * ------------------------------------------------------------------------ */

/**
 * How often something reaches up over the bottom edge.
 *
 * A minute, against the watcher's twenty seconds. This is a much larger event
 * — a quarter of the window rather than a 3rem glyph, and four seconds rather
 * than under three — so it has to be correspondingly rarer or it stops being
 * an intrusion and becomes a metronome somebody is trying to work through.
 */
const RISE_INTERVAL = 60_000;

/**
 * The whole life of one appearance, and it must match `kraken-life` in
 * `index.css`.
 *
 * The number lives in both places for the reason the dragon's and the
 * watcher's did: the stylesheet needs it to place keyframe stops as
 * percentages, and this needs it to know when the element is finished and can
 * be dropped. Tying them together through a custom property would leave the
 * CSS unreadable on its own, which is a bad trade for a constant that never
 * changes.
 *
 * Four point two seconds, spent unevenly: about seven tenths climbing, three
 * seconds standing in the room, and just under six tenths dropping back. The
 * asymmetry is the whole character of it — something that rises and falls at
 * the same speed is a piston.
 */
const RISE_DURATION = 4_200;

/**
 * The first one does not wait a full minute.
 *
 * The same argument the dragon's crossing makes. A minute of an apparently
 * ordinary page before the skin does the thing it is named for is not
 * restraint, it is hiding the feature from anybody who tries the theme and
 * moves on. It arrives once, a little after the skin does, and then keeps the
 * minute.
 */
const FIRST_RISE_DELAY = 9_000;

interface Rise {
  /** Where along the bottom edge it comes up, as a percentage of the width. */
  x: number;
  /** How far up it reaches, in `vh`. Capped at a quarter of the window. */
  reach: number;
  /** Mirrored for half of them, so the curl is not always the same hook. */
  flipped: boolean;
  key: number;
}

/*
 * Kept off the last tenth of each side.
 *
 * Those are where a pinned rail, the player and the chat dock sit, and a limb
 * rising behind a fixed panel reads as a rendering fault rather than as depth:
 * the panel does not move with it, so the animal appears to slide under a
 * sticker. The middle four fifths is all page.
 */
const nextRise = (): Rise => ({
  x: 10 + Math.random() * 80,
  // 16-25vh. The ceiling is the brief; the floor is what it takes to read as
  // an arm rather than as a bump on the bottom edge of the window.
  reach: 16 + Math.random() * 9,
  flipped: Math.random() < 0.5,
  key: Date.now(),
});

/**
 * One arm, drawn from the base up.
 *
 * ## Why it is the same rig as the rail's tendrils
 *
 * Because it is the same animal, and the skin should only have one idea about
 * how its limbs move. Three pieces: a root bolted to the bottom of the screen,
 * then two segments that rotate about the joint where each meets the one
 * before it, with the outer one lagging by a fraction of the cycle so the bend
 * *travels* outward instead of the whole limb swinging as one rigid piece. See
 * `Tendril` for the long version of that argument — it is the difference
 * between a tentacle and a windscreen wiper.
 *
 * What is different is scale, and therefore detail. The rail's limbs are 40px
 * feelers and survive on silhouette alone; this one is a quarter of the window
 * tall, where a plain tapering outline reads as a sock. So it carries suckers
 * down its inner face, in the two staggered rows a cephalopod actually has,
 * and they are what tells you which way the arm is turned as it bends.
 *
 * ## Why it is drawn vertically rather than reusing the rail's drawing rotated
 *
 * The rail's limb is drawn along +x because that is the direction it grows out
 * of a vertical seam, and its joints pivot about `left center` accordingly.
 * Rotating that whole thing ninety degrees would mean a transform on the svg
 * root — which is exactly where `.eldritch-tendril`'s own `scaleY` already
 * lives, and stacking a second one there is how two rigs silently start
 * fighting. Drawing this one the way it stands costs a second set of paths and
 * keeps both readable on their own.
 */
const KrakenArm = ({ flipped }: { flipped: boolean }) => (
  <svg
    viewBox="0 0 64 220"
    fill="none"
    aria-hidden
    preserveAspectRatio="none"
    className="kraken-arm h-full w-full"
    style={flipped ? { transform: 'scaleX(-1)' } : undefined}
  >
    <g fill="rgb(var(--eldritch-ichor))" fillOpacity="0.88">
      {/* Root. Bolted to the bottom edge: no transform, ever. It is what keeps
          the arm attached to whatever is down there while everything above it
          moves. */}
      <path
        d="M19 221 C 18.4 206, 19.6 190, 22 172 L 42 172 C 44.4 190, 45.6 206, 45 221 Z"
      />
      <g opacity="0.55" fill="rgb(var(--eldritch-glow))">
        <ellipse cx="27" cy="208" rx="3.1" ry="2.3" />
        <ellipse cx="37" cy="203" rx="2.9" ry="2.2" />
        <ellipse cx="28" cy="192" rx="2.8" ry="2.1" />
        <ellipse cx="37" cy="187" rx="2.6" ry="2" />
        <ellipse cx="29" cy="177" rx="2.4" ry="1.8" />
      </g>

      {/* Everything past here bends. The attribute transform positions each
          joint; the CSS animation lives on a child, because a CSS transform on
          an SVG element *replaces* its transform attribute rather than
          composing with it. */}
      <g transform="translate(32 172)">
        <g className="kraken-arm__joint kraken-arm__joint--mid">
          {/* Starts at y=4, i.e. slightly *inside* the segment before it. Two
              shapes meeting exactly on the joint line separate on the outside
              of every bend and open a hairline crease; overlapping them means
              the bend can only ever close, never gap.

              None of the three segments is stroked, and that is what the
              overlap is *for*. An outline follows each piece all the way round,
              including across the line where it is buried in its neighbour — so
              a stroked arm has two bright rules drawn straight across it at the
              joints, which reads as a limb assembled from three tubes. The
              silhouette is carried by the glow instead; see `.kraken-arm`. */}
          <path
            d="M-10 4 C -11 -14, -9 -40, -7 -64 L 7 -64 C 9 -40, 11 -14, 10 4 Z"
          />
          <g opacity="0.5" fill="rgb(var(--eldritch-glow))">
            <ellipse cx="-4" cy="-8" rx="2.3" ry="1.7" />
            <ellipse cx="4.4" cy="-16" rx="2.2" ry="1.6" />
            <ellipse cx="-3.4" cy="-26" rx="2" ry="1.5" />
            <ellipse cx="3.8" cy="-36" rx="1.9" ry="1.4" />
            <ellipse cx="-2.8" cy="-46" rx="1.7" ry="1.3" />
            <ellipse cx="3" cy="-56" rx="1.5" ry="1.2" />
          </g>

          <g transform="translate(0 -64)">
            <g className="kraken-arm__joint kraken-arm__joint--tip">
              {/* The tip curls back on itself, which is where an arm ends
                  rather than in a point. */}
              <path
                d="M-7 4 C -8 -16, -6 -38, 0 -52 C 4 -61, 11 -64, 14 -58 C 16.4 -53, 13 -48, 10 -50.4 C 13 -53.6, 10 -57, 6.6 -53 C 2.4 -48, 2 -24, 7 4 Z"
              />
              <g opacity="0.48" fill="rgb(var(--eldritch-glow))">
                <ellipse cx="-2.4" cy="-8" rx="1.5" ry="1.2" />
                <ellipse cx="0.4" cy="-22" rx="1.3" ry="1" />
                <ellipse cx="3.4" cy="-36" rx="1.1" ry="0.9" />
                <ellipse cx="8" cy="-49" rx="0.9" ry="0.8" />
              </g>
            </g>
          </g>
        </g>
      </g>
    </g>
  </svg>
);

/**
 * Once a minute, something comes up over the bottom of the window.
 *
 * ## Why this replaced the eye
 *
 * The watcher was the wrong object for the skin it was in. The rails already
 * grow tentacles — the seam between a hidden menu and the page is held by
 * something with limbs — and then, separately and unrelatedly, an eye would
 * open in the middle of the page and blink at you. Two mythologies, and the
 * one that only ever appeared for two and a half seconds was the one carrying
 * the skin's name.
 *
 * This is the same animal as the rails: an arm, reaching a quarter of the way
 * up the window from underneath, moving the way theirs move, and then dropping
 * back out of sight. It says the thing gripping the edges of the page is also
 * *under* it, which is where the rails were already pointing.
 *
 * ## Why the animation is CSS and the removal is a timer
 *
 * Exactly the argument `DragonFlight` and the old watcher both make, and it is
 * worth restating because it is the one thing that is easy to get wrong here.
 * `AnimatePresence` will not unmount a child until its exit animation
 * completes, and Framer advances animations on `requestAnimationFrame` — which
 * stops in a background tab. An arm that retreated while the tab was hidden
 * would never be removed, and would still be sitting in the DOM, mid-rise,
 * when the reader came back. So the whole appearance is one CSS animation the
 * element carries from birth, and `setTimeout` is what takes it away. Timers
 * fire in hidden tabs.
 *
 * ## The contract
 *
 * One skin, nothing under `prefers-reduced-motion`, and `fixed`, `aria-hidden`
 * and `pointer-events-none` throughout — so it cannot intercept a click,
 * cannot reach the accessibility tree, and cannot affect layout. Mounted once
 * by the app shell, where it returns `null` before scheduling anything on every
 * other skin in the catalogue.
 */
export const KrakenRise = () => {
  const skin = useSkin();
  const reduceMotion = useReducedMotion();
  const [rise, setRise] = useState<Rise | null>(null);

  const isReaching = skin === 'ELDRITCH' && !reduceMotion;

  useEffect(() => {
    if (!isReaching) {
      setRise(null);
      return;
    }

    /*
     * A timeout that starts an interval, rather than an interval alone.
     *
     * Both handles are cleared on the way out, including the interval the
     * timeout has not created yet — `clearInterval(undefined)` is a no-op, so
     * the unmount path is correct whether or not the first rise has happened.
     * Without this, switching away from the skin inside the first nine seconds
     * would leave an interval running for the life of the tab.
     */
    let repeat: ReturnType<typeof setInterval> | undefined;

    const first = setTimeout(() => {
      setRise(nextRise());
      repeat = setInterval(() => setRise(nextRise()), RISE_INTERVAL);
    }, FIRST_RISE_DELAY);

    return () => {
      clearTimeout(first);
      clearInterval(repeat);
    };
  }, [isReaching]);

  useEffect(() => {
    if (!rise) return;

    const timer = setTimeout(() => setRise(null), RISE_DURATION);
    return () => clearTimeout(timer);
  }, [rise]);

  if (!isReaching || !rise) return null;

  return (
    <span
      // Keyed so each appearance is a new element and restarts the animation
      // rather than inheriting the previous one's progress.
      key={rise.key}
      aria-hidden
      /*
       * `z-0`, so the arm passes *behind* every panel on the page.
       *
       * The watcher sat at `z-[70]`, over everything including open dialogs,
       * because it was small, brief and meant to be caught out of the corner
       * of an eye. A quarter-height limb drawn over a form somebody is typing
       * into is not atmosphere, it is an obstruction — so this one belongs to
       * the room rather than to the foreground, and the page's own surfaces
       * occlude it exactly as a wall would.
       */
      className="kraken-life pointer-events-none fixed bottom-0 z-0 block"
      style={{
        left: `${rise.x}vw`,
        height: `${rise.reach.toFixed(1)}vh`,
        // Proportional to the reach rather than fixed, so a short arm is a
        // *short* arm and not a stubby one. The ratio is the drawing's own.
        width: `${(rise.reach * 0.29).toFixed(2)}vh`,
        // Centred on its own point along the edge, which is what keeps `x` a
        // percentage of the window rather than a percentage minus half a limb.
        marginLeft: `${(rise.reach * -0.145).toFixed(2)}vh`,
      }}
    >
      <KrakenArm flipped={rise.flipped} />
    </span>
  );
};
