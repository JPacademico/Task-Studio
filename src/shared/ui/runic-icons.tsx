import { cn } from '@/shared/lib/cn';
import { type GlyphProps } from './glyph-kit';
import { MARK_BRACKET, MONOGRAM_CORE, StudioMonogram } from './studio-monogram';

/**
 * The product mark, cut into a slab: the corner broken off where paper would curl, `TS` carved in
 * with the rune light down in the cut, and a nail through the top-left corner.
 */
export const RunicMark = ({ className }: GlyphProps) => (
  <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn('h-10 w-10', className)}>
    <path d={MARK_BRACKET} fill="currentColor" fillOpacity="0.8" />

    {/* The face, with the corner snapped off along a jagged break. */}
    <path
      d="M4 4H34V25.6L31.6 27L30.8 30.2L27.8 31L26.2 34H4Z"
      fill="currentColor"
      stroke="rgb(var(--rune-stone))"
      strokeOpacity="0.5"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />

    <StudioMonogram fillOpacity={0.88} />
    <path d={MONOGRAM_CORE} fill="rgb(var(--rune-glow))" className="rune-pulse" />

    {/* The nail. */}
    <path
      d="M4.8 5H10.6L8.3 10.4H7.1Z"
      fill="rgb(var(--rune-stone))"
      fillOpacity="0.9"
      stroke="rgb(var(--surface-raised))"
      strokeOpacity="0.6"
      strokeWidth="1"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * "Previous" and "next", cut into the rock. An arrow is the one glyph in the app that has to
 * survive being 14px wide in a toolbar, so this is a chevron and a stave and nothing else.
 */
export const RuneArrow = ({
  direction,
  className,
}: GlyphProps & { direction: 'left' | 'right' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden
    className={cn('h-4 w-4', className)}
    // Mirrored rather than drawn twice: the mark is symmetric about its own
    // stave, so there is no highlight to get the wrong way round.
    style={direction === 'left' ? undefined : { transform: 'scaleX(-1)' }}
  >
    <g stroke="currentColor" strokeWidth="2.1" strokeLinecap="square">
      {/* The stave. */}
      <path d="M20.4 12H5.2" />
      {/* The barb. */}
      <path d="M11 5.6 4.4 12l6.6 6.4" />
      {/* The two nicks that make it a rune rather than an arrow. */}
      <path d="M16.6 8.8 13.4 12M16.6 15.2 13.4 12" strokeWidth="1.6" />
    </g>

    <g stroke="rgb(var(--rune-glow))" strokeWidth="1.5" strokeLinecap="square">
      <path d="M11 5.6 4.4 12l6.6 6.4" className="rune-pulse" />
      <path d="M20.4 12H5.2" className="rune-pulse rune-pulse--late" />
    </g>
  </svg>
);
