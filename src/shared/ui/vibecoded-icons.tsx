import { cn } from '@/shared/lib/cn';
import { type GlyphProps } from './glyph-kit';

/**
 * The Vibecoded skin's product mark: the logo of every app that has ever been generated. A squircle
 * with a 135-degree indigo-to-fuchsia gradient in it, a specular highlight across the top-left.
 */
export const VibecodedMark = ({ className }: GlyphProps) => (
  <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn('h-10 w-10', className)}>
    <defs>
      <linearGradient id="vibe-mark-fill" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366F1" />
        <stop offset="0.55" stopColor="#A855F7" />
        <stop offset="1" stopColor="#D946EF" />
      </linearGradient>
      {/* The highlight: a soft white wash over the top-left third. There is
          always a highlight, and it never corresponds to a light source. */}
      <linearGradient id="vibe-mark-sheen" x1="4" y1="4" x2="26" y2="26" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFFFFF" stopOpacity="0.45" />
        <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
      </linearGradient>
    </defs>

    {/* The squircle. `rx` is a quarter of the side, which is the ratio these always land on —
        large enough to read as friendly, small enough that it is not a circle. */}
    <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#vibe-mark-fill)" />
    <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#vibe-mark-sheen)" />

    {/* The node cluster: three dots and two connectors, which is the minimum that reads as "a
        network" and the maximum that fits at 20px. */}
    <g stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round">
      <path d="M13 26.5 20 13l7 13.5" />
    </g>
    <g fill="#FFFFFF" fillOpacity="0.85">
      <circle cx="20" cy="12" r="2.6" />
      <circle cx="12.4" cy="27.2" r="2.2" />
      <circle cx="27.6" cy="27.2" r="2.2" />
    </g>

    {/* The letter, centred in the cluster. Geometric rather than written: a single stem with a
        crossbar and no terminal. */}
    <path
      d="M20 17.6v6.2c0 .9.5 1.3 1.4 1.3h1"
      stroke="#FFFFFF"
      strokeWidth="2.2"
      strokeLinecap="round"
      fill="none"
    />
    <path d="M17.8 19.2h4.4" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);
