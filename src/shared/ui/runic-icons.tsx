import { cn } from '@/shared/lib/cn';
import { type GlyphProps } from './glyph-kit';

/**
 * This skin's product mark. Its navigation set is gone.
 *
 * There used to be a full set of runic navigation glyphs here, exported as
 * `RUNIC_GLYPHS` and swapped in by `NavGlyph`. Every skin's set has
 * been withdrawn for the reason written up there: an icon is recognised by
 * shape, and a rail whose shapes change with the theme charges every user that
 * recognition again for a novelty that lands once.
 *
 * The mark is a different thing and stays. It is the *product's* signature
 * drawn in this world — one object, seen once, on a settings card and a theme
 * gallery tile — and nobody navigates by it.
 */
/**
 * The product mark: the same Post-it, cut into a slab.
 *
 * The pad, the peeled corner and the pin are the product's signature across
 * every skin, and a skin earns its own mark by changing what the object is
 * *made of* — not by replacing it with something else. So this is the studio
 * mark's geometry, in stone: the peel becomes a broken corner (rock does not
 * curl), the two written lines become cut ones with light in them, and the pin
 * is an iron nail driven into the block.
 */
export const RunicMark = ({ className }: GlyphProps) => (
  <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn('h-10 w-10', className)}>
    {/* The slab behind, so the mark reads as a stack and not one stone. */}
    <rect x="8" y="9" width="26" height="26" fill="currentColor" fillOpacity="0.2" />

    {/* The face. */}
    <path
      d="M6 6h27v20.4L25.2 34H6Z"
      fill="currentColor"
      stroke="rgb(var(--rune-stone))"
      strokeOpacity="0.5"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />

    {/* The broken corner. */}
    <path
      d="M25.2 34v-7.6H33L25.2 34Z"
      fill="rgb(var(--surface-raised))"
      fillOpacity="0.5"
      stroke="rgb(var(--rune-stone))"
      strokeOpacity="0.45"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />

    {/* Two cut lines, and the light in them. */}
    <g stroke="rgb(var(--surface-raised))" strokeWidth="2.4" strokeOpacity="0.85">
      <path d="M11.5 14.5h15.5" />
      <path d="M11.5 21h10.5" />
    </g>
    <g stroke="rgb(var(--rune-glow))" strokeWidth="1.4">
      <path d="M11.5 14.5h15.5" className="rune-pulse" />
      <path d="M11.5 21h10.5" className="rune-pulse rune-pulse--late" />
    </g>

    {/* The nail, driven through the top-left corner. */}
    <path
      d="M6.6 6.2h6.4l-2.6 6.2h-1.2Z"
      fill="rgb(var(--rune-stone))"
      fillOpacity="0.9"
      stroke="rgb(var(--surface-raised))"
      strokeOpacity="0.6"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * "Previous" and "next", cut into the rock.
 *
 * An arrow is the one glyph in the app that has to survive being 14px wide in
 * a toolbar, so this is a chevron and a stave and nothing else — the lit part
 * is the barb, which is the half that carries the direction. The tail glows a
 * beat later, so at rest the mark reads outward, the way it points.
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
