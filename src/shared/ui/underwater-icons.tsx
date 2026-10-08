import { cn } from '@/shared/lib/cn';
import { type GlyphProps } from './glyph-kit';
import { MARK_BRACKET, MONOGRAM_CORE, StudioMonogram } from './studio-monogram';

/**
 * The product mark, gone soft: every side of the sheet bows outward, a caustic crawls over the
 * letters, and the pin has become a bubble on its way up.
 */
export const UnderwaterMark = ({ className }: GlyphProps) => (
  <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn('h-10 w-10', className)}>
    <path
      d={MARK_BRACKET}
      fill="currentColor"
      fillOpacity="0.7"
      stroke="currentColor"
      strokeOpacity="0.7"
      strokeWidth="0.4"
      strokeLinejoin="round"
    />

    {/* Bowed sides and soft corners; the curl was already the softest thing in the mark. */}
    <path
      d="M7.2 4.4C14 3.6 24.6 3.6 30.8 4.4Q34.2 4.8 34.1 8.2C33.8 13 34.2 18.4 34 23C34 25.4 32.75 27.85 30.5 28.76C29.58 29.16 28.6 29.15 27.5 29.15C26.6 30.6 25.4 31.6 23.6 32.4C21.2 33.5 18.2 34 14.4 34L7.8 34.2Q4.3 34.3 4.2 30.8C3.9 23.4 4.5 14.6 4.3 7.8Q4.3 4.7 7.2 4.4Z"
      fill="currentColor"
      stroke="rgb(var(--tide-deep))"
      strokeOpacity="0.35"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />

    <StudioMonogram fillOpacity={0.88} />
    <path d={MONOGRAM_CORE} fill="rgb(var(--tide-glow))" className="tide-caustic" />

    {/* The bubbles, out from under the top edge. */}
    <circle
      cx="7.6"
      cy="7.6"
      r="2.4"
      fill="rgb(var(--surface-raised))"
      fillOpacity="0.35"
      stroke="rgb(var(--tide-glow))"
      strokeWidth="1.1"
    />
    <circle cx="6.8" cy="6.8" r="0.7" fill="rgb(var(--surface-raised))" fillOpacity="0.9" />
    <circle cx="11.6" cy="3.2" r="1.1" stroke="rgb(var(--tide-glow))" strokeWidth="0.8" />
  </svg>
);
