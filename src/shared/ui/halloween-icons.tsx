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
 * One bat, rigged: a body and two wings that beat independently.
 *
 * ## Why it stopped being a single path
 *
 * It was one path and the "flap" was a `scaleY` on the whole glyph — the bat
 * squashed vertically, body and all, twice a second. The argument for it was
 * that a rig is invisible at sixteen pixels, and that was true of the *old*
 * sixteen pixels: a shape wide enough to read as a wingspan, squashing.
 *
 * What it actually looked like next to a real flapping bat is the thing this
 * change is about. A bat in flight moves its wings through about fifty degrees
 * and keeps its body level; squashing the body is what a moth pinned to a
 * board does. Rigging the two wings costs two more nodes and one more keyframe
 * list, and it is the difference between a shape that is being animated and
 * something that is flying.
 *
 * ## How the rig works
 *
 * Each wing is its own path, rotating about the shoulder it joins the body at —
 * `transform-box: fill-box` plus a `transform-origin` on the side nearest the
 * body, both in `.bat-wing` in `index.css`. The two are mirror images across
 * `x = 16`, written out rather than produced with `scale(-1, 1)` on a group: a
 * CSS `transform` replaces an SVG `transform` attribute rather than composing
 * with it, so the mirror would be silently thrown away the moment the flap
 * animation touched the same element. (It was, the first time.)
 *
 * The trailing edge of each wing has two notches. That is the whole silhouette:
 * at twenty pixels it is the only feature that separates a bat from a bird, and
 * it survives being scaled down further than anything else in the shape.
 *
 * The glyph carries no colour of its own — `currentColor` throughout — so the
 * modal swarm and the landing page's field each set their own, which is what
 * lets one of them be a silhouette against a cream page and the other a
 * moonlit shape against a near-black one.
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
