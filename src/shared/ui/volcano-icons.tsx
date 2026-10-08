import { cn } from '@/shared/lib/cn';
import { type GlyphProps } from './glyph-kit';
import { MARK_BRACKET, MONOGRAM_CORE, StudioMonogram } from './studio-monogram';

/**
 * The product mark, as a flake of crust: every side off true, the corner broken where paper would
 * curl, `TS` split open with the core showing, and the bracket behind it running molten.
 */
export const VolcanoMark = ({ className }: GlyphProps) => (
  <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn('h-10 w-10', className)}>
    {/* The melt along the seam behind the plate — the skin's one claim, on its own mark. */}
    <path d={MARK_BRACKET} fill="rgb(var(--lava-flow))" fillOpacity="0.9" />
    <path d={MARK_BRACKET} fill="rgb(var(--lava-core))" className="ember-pulse ember-pulse--late" />

    <path
      d="M4.4 4.6 33.8 3.8 34.2 25.4 25.6 34.2 4 33.6Z"
      fill="currentColor"
      stroke="rgb(var(--lava-crust))"
      strokeOpacity="0.55"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
    {/* The break, with the melt in it. */}
    <path
      d="M34.2 25.4 25.6 34.2"
      stroke="rgb(var(--lava-flow))"
      strokeOpacity="0.9"
      strokeWidth="1.4"
      strokeLinecap="round"
    />

    <StudioMonogram fillOpacity={0.88} />
    <path d={MONOGRAM_CORE} fill="rgb(var(--lava-core))" className="ember-pulse" />

    {/* The spatter, welded onto the top-left corner where the pin would be. */}
    <path
      d="M4.4 4.6 10 4.2 8.8 8 6.2 9.2 4.2 7.4Z"
      fill="rgb(var(--lava-flow))"
      stroke="rgb(var(--lava-core))"
      strokeOpacity="0.7"
      strokeWidth="1"
      strokeLinejoin="round"
    />
  </svg>
);
