import { cn } from '@/shared/lib/cn';
import { type GlyphProps } from './glyph-kit';

/**
 * This skin's product mark. Its navigation set is gone.
 *
 * There used to be a full set of newspaper navigation glyphs here, exported as
 * `NEWSPAPER_GLYPHS` and swapped in by `NavGlyph`. Every skin's set has
 * been withdrawn for the reason written up there: an icon is recognised by
 * shape, and a rail whose shapes change with the theme charges every user that
 * recognition again for a novelty that lands once.
 *
 * The mark is a different thing and stays. It is the *product's* signature
 * drawn in this world — one object, seen once, on a settings card and a theme
 * gallery tile — and nobody navigates by it.
 */
/**
 * The product mark: the masthead itself.
 *
 * The rest of the app introduces itself with a Post-it; a newspaper introduces
 * itself with the nameplate at the top of page one — a ruled box, a solid
 * banner where the title sits, and the spot colour the press ran alongside
 * black.
 */
export const NewspaperMark = ({ className }: GlyphProps) => (
  <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn('h-10 w-10', className)}>
    {/* The sheet behind, so the mark reads as an edition and not one page. */}
    <rect
      x="9"
      y="8"
      width="27"
      height="27"
      fill="currentColor"
      fillOpacity="0.18"
      stroke="currentColor"
      strokeOpacity="0.35"
      strokeWidth="1.4"
    />

    {/* Page one. */}
    <rect
      x="4"
      y="5"
      width="28"
      height="30"
      fill="rgb(var(--surface-raised))"
      stroke="currentColor"
      strokeWidth="2"
    />

    {/* The nameplate, with its double rule under it. */}
    <rect x="7.5" y="8.5" width="21" height="5.5" fill="currentColor" />
    <rect x="7.5" y="15.5" width="21" height="1.4" fill="currentColor" fillOpacity="0.75" />
    <rect x="7.5" y="17.8" width="21" height="0.8" fill="currentColor" fillOpacity="0.45" />

    {/* The lead photograph, and the spot plate on it. */}
    <rect x="7.5" y="20.5" width="9" height="8" fill="currentColor" fillOpacity="0.8" />
    <rect x="7.5" y="20.5" width="9" height="1.6" fill="rgb(var(--brand))" />

    {/* Two columns of story. */}
    <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7">
      <path d="M19 22h9.5" />
      <path d="M19 25h9.5" />
      <path d="M19 28h9.5" />
      <path d="M7.5 31.5h21" />
    </g>
  </svg>
);
