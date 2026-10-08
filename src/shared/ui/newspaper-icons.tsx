import { cn } from '@/shared/lib/cn';
import { type GlyphProps } from './glyph-kit';
import { MARK_BRACKET, MARK_SHEET, StudioMonogram, monogramAt } from './studio-monogram';

/**
 * The product mark: page one. Newsprint where the other skins have a brand-coloured sheet, `TS`
 * set as the nameplate in the spot colour, and the edition stacked behind it.
 */
export const NewspaperMark = ({ className }: GlyphProps) => (
  <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn('h-10 w-10', className)}>
    <path d={MARK_BRACKET} fill="currentColor" />
    <path
      d={MARK_SHEET}
      fill="rgb(var(--surface-raised))"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />

    {/* The double rule over the nameplate, and the one under the fold. */}
    <g fill="rgb(var(--content))">
      <rect x="7.4" y="7" width="23.2" height="1.3" fillOpacity="0.8" />
      <rect x="7.4" y="9.2" width="23.2" height="0.6" fillOpacity="0.5" />
      <rect x="7.4" y="28.4" width="16.4" height="0.6" fillOpacity="0.5" />
      <rect x="7.4" y="29.9" width="12.6" height="1.3" fillOpacity="0.8" />
    </g>

    {/* The one skin whose ink is not the page colour, and it is the right exception. */}
    <StudioMonogram transform={monogramAt(19, 18.9, 0.94)} fill="currentColor" />
  </svg>
);
