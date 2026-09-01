import { cn } from '@/shared/lib/cn';
import { type GlyphProps } from './glyph-kit';

/**
 * This skin's product mark. Its navigation set is gone.
 *
 * There used to be a full set of underwater navigation glyphs here, exported as
 * `UNDERWATER_GLYPHS` and swapped in by `NavGlyph`. Every skin's set has
 * been withdrawn for the reason written up there: an icon is recognised by
 * shape, and a rail whose shapes change with the theme charges every user that
 * recognition again for a novelty that lands once.
 *
 * The mark is a different thing and stays. It is the *product's* signature
 * drawn in this world — one object, seen once, on a settings card and a theme
 * gallery tile — and nobody navigates by it.
 */
/**
 * The product mark: the same Post-it, gone soft.
 *
 * The pad, the peeled corner and the pin are the product's signature across
 * every skin, and a skin earns its own mark by changing what the object is
 * *made of* — not by replacing it with something else. So this is the studio
 * mark's geometry, waterlogged: every edge has swollen and gone convex, the
 * peel becomes a corner lifting in the current, the two written lines have run
 * and now wave, and the pin is a bubble caught under the top edge on its way
 * out.
 */
export const UnderwaterMark = ({ className }: GlyphProps) => (
  <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn('h-10 w-10', className)}>
    {/* The sheet behind, so the mark reads as a stack. */}
    <path
      d="M9 11c0-1.6 1.4-2.6 3-2.6h20c1.6 0 2.6 1 2.6 2.6v20c0 1.6-1 2.6-2.6 2.6H12c-1.6 0-3-1-3-2.6Z"
      fill="currentColor"
      fillOpacity="0.2"
    />

    {/* The face. Every side bows outward — nothing submerged stays flat. */}
    <path
      d="M6 9.4C6 7.6 7.6 6 9.4 6h20.2c1.8 0 3.4 1.6 3.4 3.4 0 6.4.6 10.6 0 16.6C31.6 30 28 34 24.6 34H9.4C7.6 34 6 32.4 6 30.6Z"
      fill="currentColor"
      stroke="rgb(var(--tide-deep))"
      strokeOpacity="0.35"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />

    {/* The corner lifting in the current. */}
    <path
      d="M24.6 34c.4-3.6.6-6 2.6-7 1.8-.9 3.6-1 5.8-.4-2.6 3.6-5.4 6-8.4 7.4Z"
      fill="rgb(var(--surface-raised))"
      fillOpacity="0.55"
      stroke="rgb(var(--tide-deep))"
      strokeOpacity="0.3"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />

    {/* Two lines that have run. */}
    <g
      stroke="rgb(var(--surface-raised))"
      strokeWidth="2.4"
      strokeOpacity="0.85"
      strokeLinecap="round"
      fill="none"
    >
      <path d="M11.5 15c2.6-1.4 5.2 1.4 7.8 0s5.2 1.2 7.4 0" />
      <path d="M11.5 21.4c2.4-1.3 4.8 1.3 7.2 0" />
    </g>
    <g stroke="rgb(var(--tide-glow))" strokeWidth="1.3" strokeLinecap="round" fill="none">
      <path d="M11.5 15c2.6-1.4 5.2 1.4 7.8 0s5.2 1.2 7.4 0" className="tide-caustic" />
      <path d="M11.5 21.4c2.4-1.3 4.8 1.3 7.2 0" className="tide-caustic tide-caustic--late" />
    </g>

    {/* The pin, become a bubble on its way out from under the top edge. */}
    <circle
      cx="10.6"
      cy="8.4"
      r="3.4"
      fill="rgb(var(--surface-raised))"
      fillOpacity="0.35"
      stroke="rgb(var(--tide-glow))"
      strokeWidth="1.3"
    />
    <circle cx="9.4" cy="7.2" r="1" fill="rgb(var(--surface-raised))" fillOpacity="0.9" />
  </svg>
);
