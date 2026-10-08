import { cn } from '@/shared/lib/cn';
import { type GlyphProps } from './glyph-kit';
import { MARK_BRACKET, MARK_SHEET, MONOGRAM_CORE, StudioMonogram } from './studio-monogram';

/**
 * The Halloween skin's product mark: the design team's sheet as a lantern. `TS` is carved out of
 * it, with the wall showing through the cuts and a candle burning down inside them.
 */
export const HalloweenMark = ({ className }: GlyphProps) => (
  <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn('h-10 w-10', className)}>
    <path d={MARK_BRACKET} fill="currentColor" fillOpacity="0.8" />
    <path
      d={MARK_SHEET}
      fill="currentColor"
      stroke="rgb(var(--content) / 0.35)"
      strokeWidth="1.1"
      strokeLinejoin="round"
    />

    {/* Holes, not ink: the page's own surface, then the flame inside. */}
    <StudioMonogram fill="rgb(var(--surface))" />
    <path d={MONOGRAM_CORE} fill="#ffc861" fillOpacity="0.85" />

    {/* The pin, as on every other mark. */}
    <circle cx="19" cy="5.4" r="2.6" fill="rgb(var(--danger))" />
    <circle cx="18.2" cy="4.7" r="0.8" fill="#fff" fillOpacity="0.55" />
  </svg>
);

/**
 * One bat, rigged: a body and two wings that beat independently. It was one path and the "flap" was
 * a `scaleY` on the whole glyph — the bat squashed vertically, body and all, twice a second.
 */
export const BatGlyph = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 16" fill="none" aria-hidden className={className}>
    <path
      className="bat-wing bat-wing--l"
      fill="currentColor"
      d="M16 6.6 L9.5 4.2 L2 2.4 C3 4.6 4.2 6.4 5.8 8 L6.6 6.6 C7.4 8.4 8.8 9.8 10.6 10.6 L11.2 9 C12 10.2 13.8 11 16 11 Z"
    />
    <path
      className="bat-wing bat-wing--r"
      fill="currentColor"
      d="M16 6.6 L22.5 4.2 L30 2.4 C29 4.6 27.8 6.4 26.2 8 L25.4 6.6 C24.6 8.4 23.2 9.8 21.4 10.6 L20.8 9 C20 10.2 18.2 11 16 11 Z"
    />
    {/* The ears, which are what stop the body reading as a beak. */}
    <path fill="currentColor" d="M14.8 5.8 13.7 3.1 15.9 4.8Z" />
    <path fill="currentColor" d="M17.2 5.8 18.3 3.1 16.1 4.8Z" />
    <path
      fill="currentColor"
      d="M16 5.1c1 0 1.8.8 1.8 1.9v2.2c0 1.6-.8 2.9-1.8 2.9s-1.8-1.3-1.8-2.9V7c0-1.1.8-1.9 1.8-1.9Z"
    />
  </svg>
);

/** A cobweb that hangs in one corner. `preserveAspectRatio="none"` deliberately. */
export const CobwebGlyph = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    aria-hidden
    preserveAspectRatio="none"
    className={className}
  >
    {/* The radials, anchored in the corner. */}
    <g stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none">
      <path d="M0 0 L46 6M0 0 L38 20M0 0 L24 34M0 0 L8 44M0 0 L44 0M0 0 L0 46" />
      {/* The spiral, as four catenaries between the radials. */}
      <path d="M13 0C12 5 8 9 0 11" />
      <path d="M25 2C23 10 15 18 1 22" opacity="0.85" />
      <path d="M37 4C34 16 21 28 2 33" opacity="0.7" />
      <path d="M46 6C42 22 26 37 4 44" opacity="0.55" />
    </g>
  </svg>
);
