import { cn } from '@/shared/lib/cn';
import { type GlyphProps } from './glyph-kit';
import { MARK_BRACKET, MARK_SHEET, StudioMonogram } from './studio-monogram';

/**
 * The product mark: the design team's sheet, in October — pinned to the board with turned wood,
 * and two leaves that landed on it. An earlier pass made this a maple leaf, a worse mark.
 */
export const AutumnMark = ({ className }: GlyphProps) => (
  <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn('h-10 w-10', className)}>
    <path d={MARK_BRACKET} fill="currentColor" fillOpacity="0.8" />
    <path
      d={MARK_SHEET}
      fill="currentColor"
      stroke="rgb(var(--autumn-bark))"
      strokeOpacity="0.45"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />

    <StudioMonogram />

    {/* Both leaves clear of the letters and inside the sheet: off the edge, they smudge at 28px. */}
    <g stroke="rgb(var(--autumn-bark))" strokeOpacity="0.55" strokeWidth="0.9">
      <g transform="rotate(-24 24.6 30.6)">
        <ellipse cx="24.6" cy="30.6" rx="3.9" ry="2" fill="rgb(var(--autumn-ember))" />
        <path d="M20.7 30.6h7.8" />
      </g>
      <g transform="rotate(38 8.8 29.8)">
        <ellipse cx="8.8" cy="29.8" rx="3.2" ry="1.7" fill="rgb(var(--autumn-gold))" />
        <path d="M5.6 29.8h6.4" />
      </g>
    </g>

    {/* The pin head, pushed through the top-left corner. */}
    <circle
      cx="7.4"
      cy="7.4"
      r="2.5"
      fill="rgb(var(--autumn-bark))"
      stroke="rgb(var(--surface-raised))"
      strokeOpacity="0.75"
      strokeWidth="1.1"
    />
  </svg>
);
