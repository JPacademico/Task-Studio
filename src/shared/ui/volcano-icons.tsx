import { cn } from '@/shared/lib/cn';
import { type GlyphProps } from './glyph-kit';

/**
 * This skin's product mark. Its navigation set is gone.
 *
 * There used to be a full set of volcano navigation glyphs here, exported as
 * `VOLCANO_GLYPHS` and swapped in by `NavGlyph`. Every skin's set has
 * been withdrawn for the reason written up there: an icon is recognised by
 * shape, and a rail whose shapes change with the theme charges every user that
 * recognition again for a novelty that lands once.
 *
 * The mark is a different thing and stays. It is the *product's* signature
 * drawn in this world — one object, seen once, on a settings card and a theme
 * gallery tile — and nobody navigates by it.
 */
/**
 * The product mark: the same Post-it, as a flake of crust.
 *
 * The studio mark's geometry, in cooling rock: the peel becomes a broken corner
 * with the melt showing in the break — paper curls, crust snaps — the two
 * written lines become fissures with the core visible in them, and the pin is a
 * spatter blob that landed on the top-left and welded itself on.
 *
 * The bottom edge carries the same hot line every other raised object in this
 * skin does, because the mark is not exempt from the skin's one physical claim.
 */
export const VolcanoMark = ({ className }: GlyphProps) => (
  <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn('h-10 w-10', className)}>
    {/* The plate behind, so the mark reads as a stack and not one flake. */}
    <path d="M9 9.6 34.4 8.4l.6 25.2-25.4 1Z" fill="currentColor" fillOpacity="0.2" />

    {/* The face. Not a rectangle — every side is off true, the way a plate of
        crust is when it has broken free rather than been cut. */}
    <path
      d="M6 6.4 32.6 5.6l.8 20-7.6 8.4-19.2.6Z"
      fill="currentColor"
      stroke="rgb(var(--lava-crust))"
      strokeOpacity="0.55"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />

    {/* The broken corner, with the melt in the break. */}
    <path
      d="m25.8 34 .4-8.2 7.2-.2L25.8 34Z"
      fill="rgb(var(--surface-raised))"
      fillOpacity="0.5"
      stroke="rgb(var(--lava-flow))"
      strokeOpacity="0.8"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />

    {/* Two fissures, and the core in them. */}
    <g stroke="rgb(var(--surface-raised))" strokeWidth="2.6" strokeOpacity="0.85">
      <path d="m11.4 14.6 6.2.6 9.4-1" />
      <path d="m11.4 21 5 .6 5.6-.8" />
    </g>
    <g stroke="rgb(var(--lava-core))" strokeWidth="1.3">
      <path d="m11.4 14.6 6.2.6 9.4-1" className="ember-pulse" />
      <path d="m11.4 21 5 .6 5.6-.8" className="ember-pulse ember-pulse--late" />
    </g>

    {/* The melt at the bottom seam — the skin's one claim, on its own mark. */}
    <path
      d="M6.6 32.8 25.4 32.2"
      stroke="rgb(var(--lava-flow))"
      strokeWidth="2"
      strokeLinecap="round"
      strokeOpacity="0.9"
    />

    {/* The spatter, welded onto the top-left corner where the pin would be. */}
    <path
      d="M6.4 6.2 13 5.8l-1.4 4.4-3.2 1.6-2.6-2.2Z"
      fill="rgb(var(--lava-flow))"
      stroke="rgb(var(--lava-core))"
      strokeOpacity="0.7"
      strokeWidth="1.1"
      strokeLinejoin="round"
    />
  </svg>
);
