import { useId, useRef, type CSSProperties } from 'react';

import { cn } from '@/shared/lib/cn';
import { type GlyphProps } from './glyph-kit';
import { useSurge } from './use-surge';

/** One dorsal plate's outline, as fractions of its box: a swept spike with concave sides. */
const PLATE: [number, number][] = [
  [0.56, 0], [0.63, 0.3], [0.76, 0.62], [1, 1], [0, 1], [0.22, 0.64], [0.4, 0.3],
];

/** A plate standing on the origin, pointing up (−y), `height` tall and two thirds as wide. */
const platePath = (height: number): string => {
  const width = height * 0.64;
  return `${PLATE.map(([x, y], index) => `${index ? 'L' : 'M'}${((x - 0.5) * width).toFixed(2)} ${((y - 1) * height).toFixed(2)}`).join('')}Z`;
};

const stop = (offset: number, colour: string, opacity = 1) => (
  <stop offset={offset} style={{ stopColor: `rgb(var(${colour}))`, stopOpacity: opacity }} />
);

/** The mark's body: a T with a short tail curling off the foot of its stem, in one outline. */
const T_BODY =
  'M6.5 9H33.5Q36 9 36 11.5V16.5Q36 19 33.5 19H24.5V27.5C27.6 29.4 30.6 30 33.2 29.2L37.4 26.6' +
  'L35.2 31.8C32 35.6 27 36.6 22 36H18Q15.5 36 15.5 33.5V19H6.5Q4 19 4 16.5V11.5Q4 9 6.5 9Z';

/** The crest on the crossbar, then two small spikes down the tail: where each stands, and how tall. */
const FINS = [
  { x: 13, y: 10, turn: 0, h: 7.5 },
  { x: 20, y: 10, turn: 0, h: 10.5 },
  { x: 27, y: 10, turn: 0, h: 7.5 },
  { x: 28.6, y: 29.8, turn: 12, h: 4.6 },
  { x: 32.2, y: 29.6, turn: 24, h: 3.8 },
];

/** One eye, slanted down towards the middle; the right one is this mirrored. */
const EYE = 'M9.8 12.4L16.6 14.3Q15.6 16.6 13 16.3Q10.4 15.9 9.8 12.4Z';

/**
 * The Kaiju skin's product mark: a T that is the monster — scaled hide, two violet eyes in the
 * crossbar, a crest of plates on top and a tail curling off its foot.
 */
export const KaijuMark = ({ className }: GlyphProps) => {
  const id = useId();

  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden
      className={cn('h-10 w-10', className)}
      style={{ filter: 'drop-shadow(0 0 3px rgb(var(--kaiju-volt) / 0.55))' }}
    >
      <defs>
        <linearGradient id={`${id}-fin`} x1="0" y1="1" x2="0" y2="0">
          {stop(0, '--kaiju-plate-deep')}
          {stop(0.5, '--kaiju-volt')}
          {stop(1, '--kaiju-volt-core')}
        </linearGradient>
        <linearGradient id={`${id}-hide`} x1="0" y1="0" x2="0" y2="1">
          {stop(0, '--kaiju-hide-lit')}
          {stop(0.7, '--kaiju-hide')}
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          {stop(0, '--kaiju-volt', 0.9)}
          {stop(1, '--kaiju-volt', 0)}
        </radialGradient>
        {/* Rows of arcs, each offset half a scale: the panels' hide, at the mark's size. */}
        <pattern id={`${id}-scales`} width="5" height="3.4" patternUnits="userSpaceOnUse">
          <path
            d="M0 0a2.5 1.6 0 0 0 5 0M-2.5 1.7a2.5 1.6 0 0 0 5 0M2.5 1.7a2.5 1.6 0 0 0 5 0M0 3.4a2.5 1.6 0 0 0 5 0"
            stroke="rgb(var(--kaiju-scale-ink))"
            strokeOpacity="0.4"
            strokeWidth="0.45"
          />
        </pattern>
        <clipPath id={`${id}-clip`}>
          <path d={T_BODY} />
        </clipPath>
      </defs>

      {FINS.map((fin) => (
        <g key={fin.x} transform={`translate(${fin.x} ${fin.y}) rotate(${fin.turn})`}>
          <path d={platePath(fin.h)} fill={`url(#${id}-fin)`} />
        </g>
      ))}

      <path d={T_BODY} fill={`url(#${id}-hide)`} />
      <rect x="4" y="9" width="34" height="28" fill={`url(#${id}-scales)`} clipPath={`url(#${id}-clip)`} />
      <path
        d={T_BODY}
        stroke="rgb(var(--kaiju-rim))"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />

      {/* The eyes: a glow behind, the iris, a slit pupil, a glint. */}
      {[false, true].map((isRight) => (
        <g key={String(isRight)} transform={isRight ? 'matrix(-1 0 0 1 40 0)' : undefined}>
          <circle cx="13.2" cy="14.4" r="4.4" fill={`url(#${id}-glow)`} />
          <path d={EYE} fill="rgb(var(--kaiju-eye))" stroke="rgb(var(--kaiju-volt-core))" strokeWidth="0.4" />
          <rect x="12.75" y="13.6" width="1" height="2.5" rx="0.5" fill="rgb(var(--kaiju-hide))" />
          <circle cx="14.6" cy="14.4" r="0.55" fill="rgb(var(--kaiju-volt-core))" />
        </g>
      ))}
    </svg>
  );
};

/** Protrusion of each plate on the edge cue, top to bottom: biggest in the middle, like a spine. */
const RIDGE = [10, 15, 19, 22, 19, 15, 10];

interface KaijuRidgeProps extends GlyphProps {
  edge: 'left' | 'right';
  /** Whether it surges now and then; off while the menu it cues is on screen. */
  isActive?: boolean;
}

/**
 * The edge cue: a ridge of plates along the screen edge where a menu is hiding. Banked low, and
 * every so often a surge runs down it — each plate grows and burns, like the ones round a dialog.
 */
export const KaijuRidge = ({ edge, className, isActive = true }: KaijuRidgeProps) => {
  const step = 168 / (RIDGE.length - 1);
  const ref = useRef<SVGSVGElement>(null);

  useSurge(ref, isActive, 2_500, 7_000, 11_000);

  return (
    <svg
      ref={ref}
      viewBox="0 0 24 208"
      fill="none"
      aria-hidden
      className={cn('h-full w-full overflow-visible', className)}
    >
      {RIDGE.map((height, index) => (
        // Rooted on the screen edge, pointing into the page.
        <g
          key={index}
          transform={`translate(${edge === 'left' ? 0 : 24} ${20 + index * step}) rotate(${edge === 'left' ? 90 : -90})`}
        >
          <g className="kaiju-cue-fin" style={{ '--i': index } as CSSProperties}>
            <path className="kaiju-cue-plate" d={platePath(height)} />
            <path className="kaiju-cue-lit" d={platePath(height * 0.8)} />
            <path className="kaiju-cue-core" d={platePath(height * 0.5)} />
          </g>
        </g>
      ))}
    </svg>
  );
};
