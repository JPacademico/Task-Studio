import { useId, useRef, type CSSProperties } from 'react';

import { cn } from '@/shared/lib/cn';
import { type GlyphProps } from './glyph-kit';
import { MONOGRAM, monogramAt } from './studio-monogram';
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

/** Where the monster stands: `TS` grown to fill the box, leaving the top for the crest. */
const BODY = monogramAt(20, 23.4, 1.55);

/** The crest along both letters: where each plate stands, its lean, and how tall. */
const FINS = [
  { x: 7.6, y: 12.6, turn: -8, h: 6.5 },
  { x: 13.4, y: 12.6, turn: -4, h: 9 },
  { x: 19.8, y: 12.6, turn: 0, h: 10.5 },
  { x: 26, y: 12.8, turn: 4, h: 9 },
  { x: 31.6, y: 13.4, turn: 10, h: 6.5 },
];

/** One eye, slanted down towards the middle; the right one is this mirrored. */
const EYE = 'M9.8 12.4L16.6 14.3Q15.6 16.6 13 16.3Q10.4 15.9 9.8 12.4Z';

/** One eye in each letter: the T's crossbar and the S's upper bowl, at one height. */
const EYES = [
  'translate(8.9 15.9) scale(0.75) translate(-13.2 -14.4)',
  'translate(31.2 15.9) scale(-0.75 0.75) translate(-13.2 -14.4)',
];

/**
 * The Kaiju skin's product mark: `TS` is the monster. Scaled hide, a crest of plates along the top
 * of both letters, and a violet eye in each.
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
        {/* Rows of arcs, each offset half a scale; sized in letter units, before the 1.55 grow. */}
        <pattern id={`${id}-scales`} width="3.2" height="2.2" patternUnits="userSpaceOnUse">
          <path
            d="M0 0a1.6 1 0 0 0 3.2 0M-1.6 1.1a1.6 1 0 0 0 3.2 0M1.6 1.1a1.6 1 0 0 0 3.2 0M0 2.2a1.6 1 0 0 0 3.2 0"
            stroke="rgb(var(--kaiju-scale-ink))"
            strokeOpacity="0.4"
            strokeWidth="0.3"
          />
        </pattern>
        <clipPath id={`${id}-clip`}>
          <path d={MONOGRAM} />
        </clipPath>
      </defs>

      {FINS.map((fin) => (
        <g key={fin.x} transform={`translate(${fin.x} ${fin.y}) rotate(${fin.turn})`}>
          <path d={platePath(fin.h)} fill={`url(#${id}-fin)`} />
        </g>
      ))}

      <g transform={BODY}>
        <path d={MONOGRAM} fill={`url(#${id}-hide)`} />
        <rect x="8" y="11" width="22" height="16" fill={`url(#${id}-scales)`} clipPath={`url(#${id}-clip)`} />
        <path d={MONOGRAM} stroke="rgb(var(--kaiju-rim))" strokeWidth="0.85" strokeLinejoin="round" />
      </g>

      {/* The eyes: a glow behind, the iris, a slit pupil, a glint. */}
      {EYES.map((transform) => (
        <g key={transform} transform={transform}>
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
