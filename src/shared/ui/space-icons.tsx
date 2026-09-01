import { cn } from '@/shared/lib/cn';
import { type GlyphProps } from './glyph-kit';

/**
 * This skin's product mark. Its navigation set is gone.
 *
 * There used to be a full set of space navigation glyphs here, exported as
 * `SPACE_GLYPHS` and swapped in by `NavGlyph`. Every skin's set has
 * been withdrawn for the reason written up there: an icon is recognised by
 * shape, and a rail whose shapes change with the theme charges every user that
 * recognition again for a novelty that lands once.
 *
 * The mark is a different thing and stays. It is the *product's* signature
 * drawn in this world — one object, seen once, on a settings card and a theme
 * gallery tile — and nobody navigates by it.
 */
/**
 * The product mark, in orbit: the same square of paper the rest of the app
 * introduces itself with, drawn as the deep field draws paper.
 *
 * This used to be a ringed planet, which was the one place the skin argued
 * with the product rather than dressing it: every other theme's mark is a
 * note, and a planet said "space app", not "Task Studio, in space". So the
 * object is a note again — a hard-light slate with a plasma rim and the
 * clipped corner the deep field puts on a sheet — and the *setting* is what
 * carries the skin: a scatter of stars around it and one flaring close enough
 * to catch the corner.
 */
export const SpaceMark = ({ className }: GlyphProps) => (
  <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn('h-10 w-10', className)}>
    {/* The slate behind, so the mark reads as a stack and not a single panel. */}
    <path
      d="M12 9.5h20v14.5L26 30H12V9.5Z"
      fill="currentColor"
      fillOpacity="0.2"
      stroke="currentColor"
      strokeOpacity="0.28"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />

    {/* The note. Same silhouette as `SlatePaper` — a clipped bevel where the
        drawn skins curl a corner, because nothing out here is made of paper
        that curls. */}
    <path
      d="M6 6h21v15.5L20.5 28H6V6Z"
      fill="currentColor"
      fillOpacity="0.92"
      stroke="currentColor"
      strokeOpacity="0.5"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />

    {/* The lit rim along the top, and the beam along the clipped corner. */}
    <path d="M8.2 8.6h16.6" stroke="rgb(var(--space-plasma))" strokeWidth="2" />
    <path
      d="M20.5 28v-6.5H27"
      fill="none"
      stroke="rgb(var(--space-flare))"
      strokeOpacity="0.85"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />

    {/* Two written lines. */}
    <g
      stroke="rgb(var(--surface-raised))"
      strokeWidth="2"
      strokeLinecap="round"
      strokeOpacity="0.85"
    >
      <path d="M10 14h13" />
      <path d="M10 19h9" />
    </g>

    {/* The field it hangs in — and one star flaring hard enough to have points. */}
    <g fill="rgb(var(--space-flare))">
      <circle cx="34.5" cy="7" r="1.2" />
      <circle cx="4.5" cy="31" r="1" opacity="0.85" />
      <circle cx="36" cy="21" r="0.9" opacity="0.7" />
    </g>
    <g fill="rgb(var(--space-plasma))">
      <circle cx="31" cy="33" r="1.1" opacity="0.9" />
      <circle cx="3" cy="3" r="0.8" opacity="0.75" />
    </g>
    <path
      d="M32.5 12.5 33.4 15.1 36 16 33.4 16.9 32.5 19.5 31.6 16.9 29 16 31.6 15.1Z"
      fill="rgb(var(--space-plasma))"
      opacity="0.95"
    />
  </svg>
);
