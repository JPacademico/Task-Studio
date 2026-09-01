import { cn } from '@/shared/lib/cn';
import { type GlyphProps } from './glyph-kit';

/**
 * This skin's product mark. Its navigation set is gone.
 *
 * There used to be a full set of autumn navigation glyphs here, exported as
 * `AUTUMN_GLYPHS` and swapped in by `NavGlyph`. Every skin's set has
 * been withdrawn for the reason written up there: an icon is recognised by
 * shape, and a rail whose shapes change with the theme charges every user that
 * recognition again for a novelty that lands once.
 *
 * The mark is a different thing and stays. It is the *product's* signature
 * drawn in this world — one object, seen once, on a settings card and a theme
 * gallery tile — and nobody navigates by it.
 */
/**
 * The product mark: the same Post-it every other skin uses, in October.
 *
 * An earlier pass made this a maple leaf with a pin through it, which was a
 * better drawing and a worse mark. The pad, the peeled corner, the two written
 * lines and the pin head are the product's signature — they are what the
 * sidebar, the top bar and the auth screen all introduce the app with — and a
 * skin that replaces the object rather than dressing it stops being the same
 * product wearing a season.
 *
 * So the geometry below is the studio mark's, to the point. What is autumn
 * about it is the material: warm paper in the accent, a wooden pin head rather
 * than a chrome one, and two leaves that have come down onto the sheet.
 */
export const AutumnMark = ({ className }: GlyphProps) => (
  <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn('h-10 w-10', className)}>
    {/* The sheet behind, so the mark reads as a pad and not a single square. */}
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
      d="M6 6.5h27v20.2L25.4 34H6V6.5Z"
      fill="currentColor"
      stroke="rgb(var(--autumn-bark))"
      strokeOpacity="0.45"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />

    {/* Peeled corner. */}
    <path
      d="M25.4 34v-7.3H33L25.4 34Z"
      fill="rgb(var(--surface-raised))"
      fillOpacity="0.55"
      stroke="rgb(var(--autumn-bark))"
      strokeOpacity="0.4"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />

    {/* Two written lines. */}
    <g
      stroke="rgb(var(--surface-raised))"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeOpacity="0.85"
    >
      <path d="M11.5 14.5h15.5" />
      <path d="M11.5 20.5h10.5" />
    </g>

    {/*
      Two leaves that landed on it.

      Small, and both inside the sheet: the mark is drawn at 28px in the rail
      and anything hanging off the edge at that size is a smudge. Ellipses with
      a midrib rather than the five-lobed maple for the same reason.
    */}
    <g stroke="rgb(var(--autumn-bark))" strokeOpacity="0.55" strokeWidth="0.9">
      <g transform="rotate(-32 27.5 25.5)">
        <ellipse cx="27.5" cy="25.5" rx="5.2" ry="2.8" fill="rgb(var(--autumn-ember))" />
        <path d="M22.3 25.5h10.4" />
      </g>
      <g transform="rotate(46 15 27.5)">
        <ellipse cx="15" cy="27.5" rx="4.2" ry="2.3" fill="rgb(var(--autumn-gold))" />
        <path d="M10.8 27.5h8.4" />
      </g>
    </g>

    {/* The pin head, pushed through the top-left corner. Turned wood. */}
    <circle
      cx="9.5"
      cy="9"
      r="3.4"
      fill="rgb(var(--autumn-bark))"
      stroke="rgb(var(--surface-raised))"
      strokeOpacity="0.75"
      strokeWidth="1.4"
    />
  </svg>
);
