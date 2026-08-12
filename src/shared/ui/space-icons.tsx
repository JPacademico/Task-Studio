import type { ComponentType, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

import { useSkin } from '@/app/providers/theme-provider';
import { cn } from '@/shared/lib/cn';

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

/** Matches `ShortcutIcon` in the shortcuts store, which is where the keys come from. */
export type NavGlyphKey =
  | 'dashboard'
  | 'tasks'
  | 'notes'
  | 'invitations'
  | 'recycle'
  | 'settings'
  | 'project';

type GlyphProps = { className?: string };

const Svg = ({ className, children }: GlyphProps & { children: ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn('h-4 w-4', className)}
  >
    {children}
  </svg>
);

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

const SPACE_GLYPHS: Record<NavGlyphKey, ComponentType<GlyphProps>> = {
  dashboard: PlanetRinged,
  tasks: Orbit,
  notes: Moon,
  invitations: Comet,
  recycle: BlackHole,
  settings: Gyroscope,
  project: System,
};

interface NavGlyphProps {
  /** Which destination this is — the same key a pinned shortcut stores. */
  glyph: NavGlyphKey;
  /** Drawn by every other skin. */
  fallback: LucideIcon;
  className?: string;
}

/**
 * A menu entry's icon, in whatever the active skin draws menus with.
 *
 * The lookup happens here rather than at every call site so a rail, a pinned
 * pill and a header all agree on what "your notes board" looks like.
 */
export const NavGlyph = ({ glyph, fallback: Fallback, className }: NavGlyphProps) => {
  const skin = useSkin();
  if (skin !== 'SPACE') return <Fallback className={className} />;

  const Planet = SPACE_GLYPHS[glyph];
  return <Planet className={className} />;
};

/**
 * The product mark, in orbit: a ringed planet with its moon and a scatter of
 * stars, for the one skin where a square of paper with a pin in it makes no
 * sense at all.
 */
export const SpaceMark = ({ className }: GlyphProps) => (
  <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn('h-10 w-10', className)}>
    {/* Planet first, ring over it in plasma. Drawing the ring on top in the
        contrasting hue is what makes it read as passing in front of the body,
        and it needs no arc split to do it. */}
    <circle cx="18.5" cy="21" r="11.5" fill="currentColor" />

    {/* Surface banding, so the planet is a body and not a dot. */}
    <g stroke="rgb(var(--space-plasma))" strokeWidth="1.2" strokeLinecap="round" opacity="0.45">
      <path d="M9.5 17.5h11" />
      <path d="M12 25.5h12" />
    </g>

    <ellipse
      cx="18.5"
      cy="21"
      rx="17.5"
      ry="5.6"
      stroke="rgb(var(--space-plasma))"
      strokeWidth="2"
      transform="rotate(-22 18.5 21)"
    />

    {/* The moon, and the field it hangs in. */}
    <circle cx="32" cy="8" r="3.4" fill="currentColor" opacity="0.8" />
    <g fill="rgb(var(--space-flare))">
      <circle cx="6" cy="6" r="1.1" />
      <circle cx="24" cy="3.5" r="0.8" opacity="0.8" />
      <circle cx="37" cy="30" r="0.9" opacity="0.7" />
    </g>
  </svg>
);
