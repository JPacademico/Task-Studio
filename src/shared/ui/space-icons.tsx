import { cn } from '@/shared/lib/cn';
import { type GlyphProps } from './glyph-kit';
import { MARK_BRACKET, StudioMonogram } from './studio-monogram';

/**
 * The product mark, in orbit: the design team's sheet drawn as the deep field draws paper — a lit
 * slate with a clipped bevel where the drawn skins curl a corner.
 */
export const SpaceMark = ({ className }: GlyphProps) => (
  <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn('h-10 w-10', className)}>
    <path d={MARK_BRACKET} fill="currentColor" fillOpacity="0.7" />

    {/* Same silhouette as `SlatePaper`: nothing out here is made of paper that curls. */}
    <path
      d="M4 4H34V25L25 34H4Z"
      fill="currentColor"
      fillOpacity="0.94"
      stroke="currentColor"
      strokeOpacity="0.5"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />

    {/* The lit rim along the top, and the beam along the bevel. */}
    <path d="M6.4 6.6H31.6" stroke="rgb(var(--space-plasma))" strokeWidth="1.6" />
    <path d="M34 25 25 34" stroke="rgb(var(--space-flare))" strokeOpacity="0.85" strokeWidth="1.4" />

    <StudioMonogram fillOpacity={0.95} />

    {/* The field it hangs in, and one star flaring hard enough to have points. */}
    <g fill="rgb(var(--space-flare))">
      <circle cx="38" cy="2.6" r="1.1" />
      <circle cx="31.6" cy="32" r="0.9" opacity="0.85" />
    </g>
    <circle cx="2.4" cy="38" r="0.9" fill="rgb(var(--space-plasma))" opacity="0.9" />
    <path
      d="M38 9.4 38.7 11.3 40 12 38.7 12.7 38 14.6 37.3 12.7 36 12 37.3 11.3Z"
      fill="rgb(var(--space-plasma))"
      opacity="0.95"
    />
  </svg>
);
