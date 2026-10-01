import { cn } from '@/shared/lib/cn';
import { type GlyphProps } from './glyph-kit';
import { StudioLetter } from './studio-letter';

/**
 * This skin's product mark. Its navigation set is gone. There used to be a full set of hazard
 * navigation glyphs here, exported as `HAZARD_GLYPHS` and swapped in by `NavGlyph`.
 */
/**
 * The product mark: the note, logged and sealed. The first version of this was the warning triangle
 * off the containment door, and it was wrong for one reason: the mark is the *product's* signature.
 */
export const HazardMark = ({ className }: GlyphProps) => (
  <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn('h-10 w-10', className)}>
    <defs>
      {/* The tape, as a real pattern rather than hand-placed bars: the header is a strip of the
          same roll the rails and the avatar band use. */}
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

    {/* Stencilled onto the body, where the hazard trefoil used to be. The trefoil was this
        skin's version of the writing on the note. */}
    <StudioLetter transform="translate(9 13) scale(0.69)" strokeOpacity={0.95} />

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
