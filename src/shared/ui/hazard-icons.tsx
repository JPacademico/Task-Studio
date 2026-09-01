import { cn } from '@/shared/lib/cn';
import { type GlyphProps } from './glyph-kit';

/**
 * This skin's product mark. Its navigation set is gone.
 *
 * There used to be a full set of hazard navigation glyphs here, exported as
 * `HAZARD_GLYPHS` and swapped in by `NavGlyph`. Every skin's set has
 * been withdrawn for the reason written up there: an icon is recognised by
 * shape, and a rail whose shapes change with the theme charges every user that
 * recognition again for a novelty that lands once.
 *
 * The mark is a different thing and stays. It is the *product's* signature
 * drawn in this world — one object, seen once, on a settings card and a theme
 * gallery tile — and nobody navigates by it.
 */
/**
 * The product mark: the note, logged and sealed.
 *
 * The first version of this was the warning triangle off the containment door,
 * and it was wrong for one reason: the mark is the *product's* signature, and
 * every other skin draws it as a square of paper. A triangle said "hazard app"
 * where the rest of the set says "Task Studio, in this world" — so the object
 * is a sheet again and the world is what is done to it.
 *
 * What this world does to a sheet: tapes it at the top so nobody moves it,
 * stamps it with the trefoil, cuts the corner off the way a machined tag is
 * cut, and lets what it was covering run out of the bottom.
 */
export const HazardMark = ({ className }: GlyphProps) => (
  <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn('h-10 w-10', className)}>
    <defs>
      {/*
        The tape, as a real pattern rather than hand-placed bars: the header is
        a strip of the same roll the rails and the avatar band use, and a
        rotated two-bar tile is the cheapest honest way to draw it. The id is
        shared by every copy of the mark on the page, which is fine — they are
        identical, and SVG resolves to the first.
      */}
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

    {/* The sheet behind, so the mark reads as a stack and not one page. */}
    <path
      d="M11 9h21v17l-6 6H11V9Z"
      fill="currentColor"
      fillOpacity="0.18"
      stroke="currentColor"
      strokeOpacity="0.3"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />

    {/* The sheet itself. Hard corners and a machined bevel where the drawn
        skins curl the paper up — nothing here is soft enough to curl. */}
    <path
      d="M5 5h27v20l-7 7H5V5Z"
      fill="currentColor"
      fillOpacity="0.92"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />

    {/* Taped down along the header. */}
    <path d="M5 5h27v6.5H5V5Z" fill="url(#hazard-mark-tape)" />
    <path d="M5 11.5h27" stroke="rgb(var(--edge))" strokeWidth="1.4" opacity="0.85" />

    {/* Stamped. The same three blades as the nav glyph, scaled into the body. */}
    <g fill="rgb(var(--surface-raised))" transform="translate(18.5 21) scale(0.42) translate(-12 -12)">
      <circle cx="12" cy="12" r="2.8" />
      <path d="M7.5 4.3A9 9 0 0 1 16.5 4.3L13.5 9.5A3 3 0 0 0 10.5 9.5Z" />
      <path d="M20.3 17.6A9 9 0 0 1 12.5 22.1L12.5 16.1A3 3 0 0 0 15.1 14.6Z" />
      <path d="M11.5 22.1A9 9 0 0 1 3.7 17.6L8.9 14.6A3 3 0 0 0 11.5 16.1Z" />
    </g>

    {/* The cut corner, lit along the bevel. */}
    <path
      d="M25 32v-7h7"
      fill="none"
      stroke="rgb(var(--edge))"
      strokeWidth="1.6"
      strokeLinejoin="round"
      opacity="0.8"
    />

    {/* And whatever it was covering, running out of the bottom. */}
    <g fill="rgb(var(--hazard-sludge))">
      <path d="M8 31.5h10c0 2.6-2 4.4-5 4.4s-5-1.8-5-4.4Z" opacity="0.9" />
      <circle cx="10" cy="37.2" r="1.5" opacity="0.75" />
      <circle cx="16.4" cy="38.4" r="1" opacity="0.6" />
    </g>
  </svg>
);
