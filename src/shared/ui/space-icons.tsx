import { cn } from '@/shared/lib/cn';
import { Glyph as Svg, type GlyphProps, type GlyphSet } from './glyph-kit';

/**
 * The deep field's own navigation set: every destination in the app, drawn as
 * something in orbit.
 *
 * A skin that only recolours its icons is a skin you stop noticing — the arcade
 * already redraws its paper as a sprite and the deep field redraws it as a lit
 * slate, and this is the same idea applied to the menus. Nothing here borrows
 * from the line-icon set: the workspace is a ringed planet, your day is a body
 * on an orbit, the bin is the one thing nothing comes back out of.
 *
 * Two rules hold the set together:
 *
 *   - Bodies are solid `currentColor`, orbits are hairlines. That is what makes
 *     a ring pass *behind* a planet without any arc trigonometry: the solid
 *     shape is simply painted after the line and covers it.
 *   - No fixed colours except the two the skin already owns, so a glyph works
 *     on a tinted tile, on a brand-filled active tile and on the page itself.
 */

/** Workspace: a ringed planet, with a moon of its own. */
const PlanetRinged = ({ className }: GlyphProps) => (
  <Svg className={className}>
    <ellipse
      cx="12"
      cy="12.6"
      rx="10.2"
      ry="3.4"
      stroke="currentColor"
      strokeWidth="1.5"
      opacity="0.85"
      transform="rotate(-20 12 12.6)"
    />
    <circle cx="12" cy="12.6" r="5.4" fill="currentColor" />
    <circle cx="12" cy="12.6" r="5.4" stroke="rgb(var(--space-plasma))" strokeWidth="1" opacity="0.7" />
    <circle cx="20.4" cy="5.4" r="1.7" fill="currentColor" opacity="0.75" />
  </Svg>
);

/** Your day: a body on a full orbit, with the moon showing where in it you are. */
const Orbit = ({ className }: GlyphProps) => (
  <Svg className={className}>
    <g transform="rotate(-24 12 12)">
      <ellipse
        cx="12"
        cy="12"
        rx="9"
        ry="5.2"
        stroke="currentColor"
        strokeWidth="1.4"
        opacity="0.7"
      />
      <circle cx="20.2" cy="9.4" r="1.8" fill="currentColor" />
    </g>
    <circle cx="12" cy="12" r="3.4" fill="currentColor" />
    <circle cx="12" cy="12" r="3.4" stroke="rgb(var(--space-plasma))" strokeWidth="1" opacity="0.75" />
  </Svg>
);

/** Your own desk: a moon, cratered, lit from one side. */
const Moon = ({ className }: GlyphProps) => (
  <Svg className={className}>
    <path
      d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="currentColor"
      fillOpacity="0.12"
    />
    <circle cx="10.8" cy="10" r="1.2" fill="currentColor" opacity="0.55" />
    <circle cx="8.9" cy="13.6" r="0.85" fill="currentColor" opacity="0.45" />
    <circle cx="12.6" cy="14.4" r="0.6" fill="currentColor" opacity="0.4" />
  </Svg>
);

/** Something arriving from a long way off. */
const Comet = ({ className }: GlyphProps) => (
  <Svg className={className}>
    <g stroke="currentColor" strokeWidth="1.5">
      <path d="M13.6 10.4 5.4 18.6" opacity="0.85" />
      <path d="M15.2 12.2 9.6 19.2" opacity="0.55" />
      <path d="M11.8 8.8 4.2 13.4" opacity="0.4" />
    </g>
    <circle cx="16.6" cy="7.4" r="2.9" fill="currentColor" />
    <circle
      cx="16.6"
      cy="7.4"
      r="4.6"
      stroke="rgb(var(--space-plasma))"
      strokeWidth="1"
      opacity="0.55"
    />
  </Svg>
);

/** The bin: the one place in the app things fall into. */
const BlackHole = ({ className }: GlyphProps) => (
  <Svg className={className}>
    <g transform="rotate(-18 12 12)">
      <ellipse
        cx="12"
        cy="12"
        rx="10"
        ry="4.2"
        stroke="rgb(var(--space-flare))"
        strokeWidth="1.4"
        opacity="0.8"
      />
      <ellipse
        cx="12"
        cy="12"
        rx="6.2"
        ry="2.4"
        stroke="rgb(var(--space-plasma))"
        strokeWidth="1.3"
        opacity="0.9"
      />
    </g>
    <circle cx="12" cy="12" r="3.1" fill="currentColor" />
  </Svg>
);

/** Preferences: the instrument you turn to point everything else. */
const Gyroscope = ({ className }: GlyphProps) => (
  <Svg className={className}>
    <g stroke="currentColor" strokeWidth="1.4">
      <circle cx="12" cy="12" r="8.6" opacity="0.75" />
      <ellipse cx="12" cy="12" rx="3.5" ry="8.6" opacity="0.55" />
      <ellipse cx="12" cy="12" rx="8.6" ry="3.5" opacity="0.55" />
    </g>
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </Svg>
);

/** A project: a star with things going round it. */
const System = ({ className }: GlyphProps) => (
  <Svg className={className}>
    <g transform="rotate(-22 12 12)">
      <ellipse
        cx="12"
        cy="12"
        rx="9.4"
        ry="4.4"
        stroke="currentColor"
        strokeWidth="1.3"
        opacity="0.7"
      />
      <circle cx="21" cy="10.4" r="1.5" fill="currentColor" opacity="0.85" />
    </g>
    <g transform="rotate(34 12 12)">
      <ellipse
        cx="12"
        cy="12"
        rx="5.6"
        ry="8.8"
        stroke="rgb(var(--space-plasma))"
        strokeWidth="1.2"
        opacity="0.6"
      />
      <circle cx="12" cy="3.3" r="1.2" fill="rgb(var(--space-plasma))" opacity="0.85" />
    </g>
    <circle cx="12" cy="12" r="2.5" fill="currentColor" />
  </Svg>
);

/** The catalogue: a prism, splitting one beam into the skin's three hues. */
const Prism = ({ className }: GlyphProps) => (
  <Svg className={className}>
    {/* The incoming beam. */}
    <path d="M1.8 9.6h6.4" stroke="currentColor" strokeWidth="1.5" opacity="0.8" />
    {/* The prism itself. */}
    <path d="M11.4 3.6 20.6 19.4H2.2Z" stroke="currentColor" strokeWidth="1.5" />
    {/* What comes out the other side. */}
    <g strokeWidth="1.5" strokeLinecap="round">
      <path d="M14.4 11.4h7.8" stroke="rgb(var(--space-plasma))" />
      <path d="M15.4 14.2h6.8" stroke="currentColor" />
      <path d="M16.4 17h5.8" stroke="rgb(var(--space-flare))" />
    </g>
  </Svg>
);

export const SPACE_GLYPHS: GlyphSet = {
  dashboard: PlanetRinged,
  tasks: Orbit,
  notes: Moon,
  invitations: Comet,
  recycle: BlackHole,
  settings: Gyroscope,
  themes: Prism,
  project: System,
};

/**
 * The product mark, in orbit: the same square of paper the rest of the app
 * introduces itself with, drawn as the deep field draws paper.
 *
 * This used to be a ringed planet, which was the one place the skin argued
 * with the product rather than dressing it: every other theme's mark is a
 * note, and a planet said "space app", not "Task Studio, in space". So the
 * object is a note again — a hard-light slate with a plasma rim and the
 * clipped corner the deep field puts on a sheet — and the *setting* is what
 * carries the skin: a scatter of stars around it and one flaring close enough
 * to catch the corner.
 */
export const SpaceMark = ({ className }: GlyphProps) => (
  <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn('h-10 w-10', className)}>
    {/* The slate behind, so the mark reads as a stack and not a single panel. */}
    <path
      d="M12 9.5h20v14.5L26 30H12V9.5Z"
      fill="currentColor"
      fillOpacity="0.2"
      stroke="currentColor"
      strokeOpacity="0.28"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />

    {/* The note. Same silhouette as `SlatePaper` — a clipped bevel where the
        drawn skins curl a corner, because nothing out here is made of paper
        that curls. */}
    <path
      d="M6 6h21v15.5L20.5 28H6V6Z"
      fill="currentColor"
      fillOpacity="0.92"
      stroke="currentColor"
      strokeOpacity="0.5"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />

    {/* The lit rim along the top, and the beam along the clipped corner. */}
    <path d="M8.2 8.6h16.6" stroke="rgb(var(--space-plasma))" strokeWidth="2" />
    <path
      d="M20.5 28v-6.5H27"
      fill="none"
      stroke="rgb(var(--space-flare))"
      strokeOpacity="0.85"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />

    {/* Two written lines. */}
    <g
      stroke="rgb(var(--surface-raised))"
      strokeWidth="2"
      strokeLinecap="round"
      strokeOpacity="0.85"
    >
      <path d="M10 14h13" />
      <path d="M10 19h9" />
    </g>

    {/* The field it hangs in — and one star flaring hard enough to have points. */}
    <g fill="rgb(var(--space-flare))">
      <circle cx="34.5" cy="7" r="1.2" />
      <circle cx="4.5" cy="31" r="1" opacity="0.85" />
      <circle cx="36" cy="21" r="0.9" opacity="0.7" />
    </g>
    <g fill="rgb(var(--space-plasma))">
      <circle cx="31" cy="33" r="1.1" opacity="0.9" />
      <circle cx="3" cy="3" r="0.8" opacity="0.75" />
    </g>
    <path
      d="M32.5 12.5 33.4 15.1 36 16 33.4 16.9 32.5 19.5 31.6 16.9 29 16 31.6 15.1Z"
      fill="rgb(var(--space-plasma))"
      opacity="0.95"
    />
  </svg>
);
