import { cn } from '@/shared/lib/cn';
import { type GlyphProps } from './glyph-kit';

/**
 * The Halloween skin's product mark, plus the two decorations the skin owns.
 *
 * The mark follows the rule every other skin's does: the *object* stays — the
 * pad, the peeled corner, the pin — and only the material changes. A skin that
 * swapped the Post-it for a pumpkin would stop being the same product wearing a
 * season, and would cost every user the recognition the mark exists to buy.
 *
 * So this is the studio sheet, lit from inside, with a carved face on it.
 */
export const HalloweenMark = ({ className }: GlyphProps) => (
  <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn('h-10 w-10', className)}>
    {/* The sheet behind, so the mark reads as a pad rather than one square. */}
    <rect
      x="7"
      y="8"
      width="26"
      height="26"
      rx="3"
      fill="currentColor"
      fillOpacity="0.22"
      transform="rotate(6 20 20)"
    />

    {/* The paper. */}
    <path
      d="M6 6.5h27v19.1c-3.7 1-8 4.3-8.9 8.4H6V6.5Z"
      fill="currentColor"
      stroke="rgb(var(--content) / 0.35)"
      strokeWidth="1.1"
      strokeLinejoin="round"
    />

    {/* Peeled corner, rolled under. */}
    <path
      d="M33 25.6c-3.7 1-8 4.3-8.9 8.4 6.3-1 9.6-4 8.9-8.4Z"
      fill="rgb(var(--surface-raised))"
      fillOpacity="0.75"
      stroke="rgb(var(--content) / 0.3)"
      strokeWidth="1"
      strokeLinejoin="round"
    />

    {/*
      The carved face, cut *out* of the sheet rather than drawn on it.

      Filled with the page's own surface so the shapes read as holes with the
      wall showing through — which is what a lantern is. Drawing them in ink
      would have made it a doodle of a pumpkin instead of a carved one.
    */}
    <path d="M12.2 14.4l4.3 2.6-4.3 2.6v-5.2Z" fill="rgb(var(--surface))" />
    <path d="M26.6 14.4v5.2l-4.3-2.6 4.3-2.6Z" fill="rgb(var(--surface))" />
    <path
      d="M12.6 23.2h13.4c-.7 2.6-3.3 4.3-6.7 4.3s-6-1.7-6.7-4.3Zm3.1 1.3.9 1.5.9-1.5h-1.8Zm5.6 0 .9 1.5.9-1.5h-1.8Z"
      fill="rgb(var(--surface))"
    />

    {/* The pin, as on every other mark. */}
    <circle cx="19.5" cy="5.6" r="3" fill="rgb(var(--danger))" />
    <circle cx="18.6" cy="4.8" r="0.9" fill="#fff" fillOpacity="0.55" />
  </svg>
);

/**
 * One bat, drawn as a single path so a hundred of them are still one node each.
 *
 * The wings do not animate individually — the flap is a `scaleY` on the whole
 * glyph (see `.hw-bat` in `index.css`), which is one compositor property and
 * reads correctly at the size these are actually seen at. Rigging two wings
 * would be more code, more nodes and, at 16 pixels, invisible.
 */
export const BatGlyph = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 16" fill="none" aria-hidden className={className}>
    <path
      d="M12 4.6c.9-1.5 2-2.2 2.6-1.3.4.6.3 1.5.1 2.2 1.3-1.4 3-2.4 4.6-2.4-.6.9-.8 2-.7 3 1-.8 2.2-1.2 3.4-1.1-1.4.9-2.3 2.3-2.8 3.9-.4 1.4-1.5 2.4-3 2.6-1.3.2-2.5-.4-3.2-1.5l-1-1.5-1 1.5c-.7 1.1-1.9 1.7-3.2 1.5-1.5-.2-2.6-1.2-3-2.6C4.3 7.3 3.4 5.9 2 5c1.2-.1 2.4.3 3.4 1.1.1-1-.1-2.1-.7-3 1.6 0 3.3 1 4.6 2.4-.2-.7-.3-1.6.1-2.2.6-.9 1.7-.2 2.6 1.3Z"
      fill="currentColor"
    />
  </svg>
);

/**
 * A cobweb that hangs in one corner.
 *
 * `preserveAspectRatio="none"` deliberately: it is stretched across whatever
 * box it is put in, and a web is one of the few shapes that survives being
 * distorted — it reads as having been spun to fit the gap, which is exactly
 * what a real one does.
 */
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
