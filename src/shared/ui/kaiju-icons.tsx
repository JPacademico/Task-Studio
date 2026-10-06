import type { CSSProperties } from 'react';

import { cn } from '@/shared/lib/cn';
import { type GlyphProps } from './glyph-kit';

/** One dorsal plate's outline, as fractions of its box: jagged steps up to a point. */
const PLATE: [number, number][] = [
  [0.5, 0], [0.62, 0.18], [0.56, 0.24], [0.74, 0.42], [0.66, 0.47], [0.86, 0.7], [0.76, 0.73],
  [1, 1], [0, 1], [0.24, 0.73], [0.14, 0.7], [0.34, 0.47], [0.26, 0.42], [0.44, 0.24], [0.38, 0.18],
];

/** A plate standing on the origin, pointing up (−y), `height` tall and two thirds as wide. */
const platePath = (height: number): string => {
  const width = height * 0.64;
  return `${PLATE.map(([x, y], index) => `${index ? 'L' : 'M'}${((x - 0.5) * width).toFixed(2)} ${((y - 1) * height).toFixed(2)}`).join('')}Z`;
};

/**
 * The Kaiju skin's product mark: the note, in hide, with three plates standing off its top edge and
 * the initial lit in the beam's blue.
 */
export const KaijuMark = ({ className }: GlyphProps) => (
  <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn('h-10 w-10', className)}>
    {[
      { x: 13, h: 9 },
      { x: 20, h: 13 },
      { x: 27, h: 9 },
    ].map((plate) => (
      <g key={plate.x} transform={`translate(${plate.x} 14)`}>
        <path d={platePath(plate.h)} fill="rgb(var(--kaiju-plate))" />
        <path d={platePath(plate.h * 0.62)} fill="rgb(var(--kaiju-atomic))" fillOpacity="0.85" />
      </g>
    ))}
    <rect x="5" y="13" width="30" height="24" rx="4" fill="rgb(var(--kaiju-hide))" />
    {/* A row of scales across the sheet, the hide the note is cut from. */}
    <path
      d="M8 22a3.5 2 0 0 0 7 0a3.5 2 0 0 0 7 0a3.5 2 0 0 0 7 0a3.5 2 0 0 0 7 0"
      stroke="rgb(var(--kaiju-plate))"
      strokeOpacity="0.18"
      strokeWidth="1"
    />
    <path
      d="M20.5 18v12.2c0 1.3.8 2 2.1 2h1.6M17 22.6h6.6"
      stroke="rgb(var(--kaiju-atomic))"
      strokeWidth="2.6"
      strokeLinecap="round"
    />
  </svg>
);

/** Protrusion of each plate on the edge cue, top to bottom: biggest in the middle, like a spine. */
const RIDGE = [9, 13, 17, 19, 17, 13, 9];

/**
 * The edge cue: a ridge of plates along the screen edge where a menu is hiding. Still — the only
 * motion is a sweep of light along it, see `.kaiju-cue-lit`.
 */
export const KaijuRidge = ({ edge, className }: GlyphProps & { edge: 'left' | 'right' }) => {
  const step = 168 / (RIDGE.length - 1);

  return (
    <svg viewBox="0 0 24 208" fill="none" aria-hidden className={cn('h-full w-full', className)}>
      {RIDGE.map((height, index) => (
        // Rooted on the screen edge, pointing into the page.
        <g
          key={index}
          transform={`translate(${edge === 'left' ? 0 : 24} ${20 + index * step}) rotate(${edge === 'left' ? 90 : -90})`}
        >
          <path className="kaiju-cue-plate" d={platePath(height)} />
          <path
            className="kaiju-cue-lit"
            style={{ '--i': index } as CSSProperties}
            d={platePath(height * 0.7)}
          />
        </g>
      ))}
    </svg>
  );
};
