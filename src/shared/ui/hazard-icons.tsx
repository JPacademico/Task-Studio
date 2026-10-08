import { cn } from '@/shared/lib/cn';
import { type GlyphProps } from './glyph-kit';
import { MARK_BRACKET, StudioMonogram } from './studio-monogram';

/**
 * The product mark: the note, logged and sealed. Hard corners and a machined bevel where the drawn
 * skins curl the paper, a strip of tape across the header, and `TS` stencilled on.
 */
export const HazardMark = ({ className }: GlyphProps) => (
  <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn('h-10 w-10', className)}>
    <defs>
      {/* The same roll of tape the rails and the avatar band use. */}
      <pattern
        id="hazard-mark-tape"
        width="7"
        height="7"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(-45)"
      >
        <rect width="3.5" height="7" fill="currentColor" />
        <rect x="3.5" width="3.5" height="7" fill="rgb(var(--edge))" />
      </pattern>
    </defs>

    <path d={MARK_BRACKET} fill="currentColor" />
    <path
      d="M4 4H34V26L26 34H4Z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />

    {/* Taped down along the header, clear of the lettering. */}
    <path d="M4 4H34V9.4H4Z" fill="url(#hazard-mark-tape)" />
    <path d="M4 9.4H34" stroke="rgb(var(--edge))" strokeWidth="1.1" opacity="0.85" />

    {/* Stencilled: the bridges a stencil leaves are the sheet showing through the ink. */}
    <StudioMonogram />
    <g fill="currentColor">
      <rect x="12.2" y="15.9" width="3.8" height="0.7" />
      <rect x="22.4" y="11.2" width="0.7" height="4.3" />
      <rect x="22.4" y="22.5" width="0.7" height="4.3" />
    </g>

    {/* The cut corner, lit along the bevel. */}
    <path d="M34 26 26 34" stroke="rgb(var(--edge))" strokeWidth="1.4" opacity="0.8" />

    {/* And whatever it was covering, running out of the bottom. */}
    <g fill="rgb(var(--hazard-sludge))">
      <path d="M7.4 33.4h9.2c0 2.4-1.9 4-4.6 4s-4.6-1.6-4.6-4Z" opacity="0.92" />
      <circle cx="9.4" cy="38.6" r="1.2" opacity="0.75" />
      <circle cx="15.2" cy="38.9" r="0.9" opacity="0.6" />
    </g>
  </svg>
);
