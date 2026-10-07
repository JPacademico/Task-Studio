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

/**
 * The Kaiju skin's product mark: a black badge with three plates breaking out of its top edge, and
 * a T whose stem is a bolt of lightning.
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
          {stop(0, '--kaiju-plate-deep')}
          {stop(0.55, '--kaiju-hide')}
        </linearGradient>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="0" y2="1">
          {stop(0, '--kaiju-volt')}
          {stop(1, '--kaiju-plate-deep')}
        </linearGradient>
        <linearGradient id={`${id}-bar`} x1="0" y1="0" x2="1" y2="0">
          {stop(0, '--kaiju-charge')}
          {stop(0.5, '--kaiju-volt-core')}
          {stop(1, '--kaiju-charge')}
        </linearGradient>
      </defs>

      {[
        { x: 11.5, h: 10 },
        { x: 20, h: 15 },
        { x: 28.5, h: 10 },
      ].map((plate) => (
        <g key={plate.x} transform={`translate(${plate.x} 17)`}>
          <path d={platePath(plate.h)} fill={`url(#${id}-fin)`} />
        </g>
      ))}

      <path
        d="M10 15H30L36 21V32L30 38H10L4 32V21Z"
        fill={`url(#${id}-hide)`}
        stroke={`url(#${id}-rim)`}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M10 21H30V25.5H10Z" fill={`url(#${id}-bar)`} />
      <path
        d="M17.2 25.5H22.8L21.3 29.6H24.4L16.8 36.4L18.4 31.4H15.4Z"
        fill="rgb(var(--kaiju-volt-core))"
        stroke="rgb(var(--kaiju-volt))"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
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
