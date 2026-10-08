import { cn } from '@/shared/lib/cn';
import { type GlyphProps } from './glyph-kit';
import { MARK_BRACKET, StudioMonogram } from './studio-monogram';

/**
 * The product mark: the note, and what got into it. The design team's sheet with grown corners,
 * an eye opened in the T's crossbar, and something come up over the bottom edge.
 */
export const EldritchMark = ({ className }: GlyphProps) => (
  <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn('h-10 w-10', className)}>
    <path d={MARK_BRACKET} fill="currentColor" fillOpacity="0.75" />

    {/* Grown corners, matching every box in the skin. The curl keeps its two lobes. */}
    <path
      d="M7.6 4H30.4Q34 4 34 7.6V23C34 25.4 32.75 27.85 30.5 28.76C29.58 29.16 28.6 29.15 27.5 29.15C26.6 30.6 25.4 31.6 23.6 32.4C21.2 33.5 18.2 34 14.4 34H7.6Q4 34 4 30.4V7.6Q4 4 7.6 4Z"
      fill="currentColor"
      fillOpacity="0.92"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    {/* The corner, lifting on its own. */}
    <path
      d="M30.5 28.76C29.58 29.16 28.6 29.15 27.5 29.15C26.6 30.6 25.4 31.6 23.6 32.4"
      stroke="rgb(var(--eldritch-ichor))"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.9"
    />

    <StudioMonogram />

    {/* The eye, open in the crossbar. Its slit is the only part the size of a pupil. */}
    <ellipse
      cx="11.7"
      cy="13.95"
      rx="2.55"
      ry="1.45"
      fill="rgb(var(--surface-raised))"
      stroke="rgb(var(--eldritch-glow))"
      strokeWidth="0.6"
    />
    <ellipse cx="11.7" cy="13.95" rx="0.55" ry="1.25" fill="currentColor" />

    {/* And what came up over the bottom edge to keep it there. */}
    <g stroke="rgb(var(--eldritch-ichor))" strokeWidth="1.5" strokeLinecap="round" fill="none">
      <path d="M7.4 33.6c0 2.8-2.2 3.4-3.3 2.3s-.4-2.8 1.1-2.4" />
      <path d="M12.6 33.8c.4 3-1.4 4.4-3 3.7" />
      <path d="M17.6 33.6c.9 2.5 3 3.2 4.3 2.3" />
    </g>
  </svg>
);
