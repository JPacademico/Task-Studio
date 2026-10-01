import { useEffect, useState, type CSSProperties } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

import { useSkin } from '@/app/providers/theme-provider';
import { cn } from '@/shared/lib/cn';
import type { NavEdge } from '@/shared/lib/nav-preferences.store';

/**
 * The things the eldritch skin does that a stylesheet cannot. Everything else a skin owns — colour,
 * radius, type, texture, motion curve — resolves through CSS variables.
 */

// --- Tendrils ---

/**
 * How many reach out of one seam. Seven, not seventy. Each one carries its own compositor
 * animation, and the three rails together already hold twenty-one.
 */
const TENDRIL_COUNT = 7;

/** One limb, drawn once. Length and phase come from its index. */
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
          // Read by the joints below. Per-limb, so seven of them never move in step. Roughly half
          // what they were.
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

        {/* Everything past here bends. The attribute transform positions each joint; the CSS
            animation lives on a child. */}
        <g transform="translate(16 24)">
          <g className="eldritch-tendril__joint eldritch-tendril__joint--mid">
            {/* Starts at x=-3, i.e. slightly *inside* the segment before it. */}
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
   * Which edge of the screen the rail this belongs to is anchored to. Only the two full-height side
   * rails grow them.
   */
  edge: NavEdge;
  /** Tendrils on a shut rail stop moving — see the note on TENDRIL_COUNT. */
  isActive: boolean;
}

/**
 * What is holding the rail onto the page. The seam between a hidden menu and the page is the one
 * place every skin marks: the studio glows, the deep field sinks a singularity into it.
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
        // Anchored *past* the rail's border, not inside it. Drawn within the panel the limbs looked
        // like a pattern printed on the sidebar.
        edge === 'left' ? 'left-full' : 'right-full -scale-x-100',
        // Hidden with the rail, not just stopped. Sitting outside the panel means these do not
        // slide fully off-screen with it: the rail travels its own width plus 12px.
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

// --- The gaze ---

interface GazeArrowProps {
  direction: 'left' | 'right';
  /** Drawn by every skin that is not the eldritch one. */
  fallback: LucideIcon;
  className?: string;
}

/**
 * "Previous" and "next", as an eye that looks that way. An arrow is a sign that points; this world
 * does not have signs, it has things that notice you.
 */
export const GazeArrow = ({ direction, fallback: Fallback, className }: GazeArrowProps) => {
  if (useSkin() !== 'ELDRITCH') return <Fallback className={className} />;

  // Pupil offset. Left looks left, right looks right — no mirroring transform.
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

// --- What is under the page ---

/**
 * How often something reaches up over the bottom edge. A minute, against the watcher's twenty
 * seconds.
 */
const RISE_INTERVAL = 60_000;

/**
 * The whole life of one appearance, and it must match `kraken-life` in `index.css`. The number
 * lives in both places for the reason the dragon's and the watcher's did.
 */
const RISE_DURATION = 4_200;

/** The first one does not wait a full minute. The same argument the dragon's crossing makes. */
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

// Kept off the last tenth of each side. Those are where a pinned rail, the player and the chat dock
// sit, and a limb rising behind a fixed panel reads as a rendering fault rather than as depth.
const nextRise = (): Rise => ({
  x: 10 + Math.random() * 80,
  // 16-25vh. The ceiling is the brief; the floor is what it takes to read as
  // an arm rather than as a bump on the bottom edge of the window.
  reach: 16 + Math.random() * 9,
  flipped: Math.random() < 0.5,
  key: Date.now(),
});

/** One arm, drawn from the base up. */
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
      {/* Root. Bolted to the bottom edge: no transform, ever. It is what keeps the arm attached
          to whatever is down there while everything above it moves. */}
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

      {/* Everything past here bends. The attribute transform positions each joint; the CSS
          animation lives on a child. */}
      <g transform="translate(32 172)">
        <g className="kraken-arm__joint kraken-arm__joint--mid">
          {/* Starts at y=4, i.e. slightly *inside* the segment before it. */}
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
 * Once a minute, something comes up over the bottom of the window. The watcher was the wrong object
 * for the skin it was in.
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

    // A timeout that starts an interval, rather than an interval alone. Both handles are cleared on
    // the way out, including the interval the timeout has not created yet.
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
      /* `z-0`, so the arm passes *behind* every panel on the page. The watcher sat at `z-[70]`,
         over everything including open dialogs, because it was small. */
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
