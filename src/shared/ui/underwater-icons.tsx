import { cn } from '@/shared/lib/cn';
import { Glyph, type GlyphProps, type GlyphSet } from './glyph-kit';

/**
 * The submerged set.
 *
 * Two rules hold these together, and both come from the material rather than
 * from taste:
 *
 * **Nothing here has a straight line in it.** Water works on everything it
 * touches until the edges go, so every glyph in this set is built from arcs and
 * bulges — the exact opposite of the runic set, which is the same argument
 * running the other way. A straight edge would read as something manufactured
 * and dropped in, which is the one thing there is nothing of down here.
 *
 * **Every glyph carries a caustic.** A second copy of one significant stroke,
 * in white, drifting on `.tide-caustic` — the broken light off the surface
 * landing on the object. The mark itself is always fully drawn at full contrast
 * underneath, so the light is decoration and never legibility: an icon at its
 * dimmest moment is exactly as readable as at its brightest.
 */

/** The lit copy of a stroke. Never the only copy of anything. */
const Lit = ({ d, late }: { d: string; late?: boolean }) => (
  <path
    d={d}
    stroke="rgb(var(--tide-glow))"
    strokeWidth="1.6"
    className={cn('tide-caustic', late && 'tide-caustic--late')}
  />
);

/** Workspace: the reef head everything else has grown on. */
const Reef = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <path
      d="M4 20.5c0-4 2-5.6 2.6-8.4C7.2 9 6 6.4 8 4.4c1.8-1.8 3.6-.4 4 1.6.5-2.4 2.6-3.6 4.4-2 2 1.8.6 4.6 1.2 7.4.7 3 2.4 4.6 2.4 9.1Z"
      fill="currentColor"
      fillOpacity="0.14"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <path d="M12 20.5c0-3.4-1.4-5.4-1.4-8.4" stroke="currentColor" strokeWidth="1.5" />
    <Lit d="M12 6.2c0 3.4.4 5 .6 7.6" />
  </Glyph>
);

/** Your day, by hour: the sun seen from below, broken by the surface. */
const SunThroughWater = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <circle
      cx="12"
      cy="12"
      r="4.4"
      fill="currentColor"
      fillOpacity="0.16"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    {/* The rays bend, because everything you look at from down here does. */}
    <g stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2.4c-1 1.4 1 2.4 0 3.8M12 21.6c-1-1.4 1-2.4 0-3.8" />
      <path d="M2.4 12c1.4-1 2.4 1 3.8 0M21.6 12c-1.4-1-2.4 1-3.8 0" />
    </g>
    <Lit d="M12 7.6a4.4 4.4 0 0 0-4.4 4.4" />
  </Glyph>
);

/** Your own desk: an open shell with the growth lines pressed into it. */
const Shell = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <path
      d="M12 20.6C6.8 20.6 3 16.6 3 11.4 3 6.6 7 3.4 12 3.4s9 3.2 9 8c0 5.2-3.8 9.2-9 9.2Z"
      fill="currentColor"
      fillOpacity="0.14"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <g stroke="currentColor" strokeWidth="1.4">
      <path d="M12 20.6c-2.4-4-3.2-8.8-2.2-13.4M12 20.6c2.4-4 3.2-8.8 2.2-13.4M12 20.6V4.6" />
    </g>
    <Lit d="M12 20.6c-2.4-4-3.2-8.8-2.2-13.4" />
    <Lit d="M12 20.6V4.6" late />
  </Glyph>
);

/** Something arriving: a message in a bottle, still corked. */
const Bottle = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <path
      d="M10 3.4h4v3.2c0 1.2 3 2.4 3 5.4v6.6c0 1.4-1 2-2.2 2H9.2C8 20.6 7 20 7 18.6V12c0-3 3-4.2 3-5.4Z"
      fill="currentColor"
      fillOpacity="0.14"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <path d="M9.6 3.4h4.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    {/* The note inside, rolled. */}
    <Lit d="M9.6 13.4c1.6-.8 3.2-.8 4.8 0" />
    <Lit d="M9.6 16.4c1.6-.8 3.2-.8 4.8 0" late />
  </Glyph>
);

/** The bin: an amphora on its side, cracked, half in the silt. */
const Amphora = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <path
      d="M4.6 13.4c0-3.4 3.4-6 7.6-6 4 0 6.6 2 6.6 4.2 0 2.6-2.6 3.6-5 4-2.6.4-9.2 1.2-9.2-2.2Z"
      fill="currentColor"
      fillOpacity="0.14"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <path
      d="M18.4 10.2c1.4-.6 2.4 0 2.4 1.2s-1 1.8-2.4 1.4"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    {/* The silt it has settled into. */}
    <path d="M3 19c3-1.4 5.4-1 8.4-1 3 0 6-.6 9.6.6" stroke="currentColor" strokeWidth="1.6" />
    {/* The crack is the lit part — something got in. */}
    <Lit d="M10.6 8.6c-.6 2 .4 3.4 1.4 4.6" />
  </Glyph>
);

/** Preferences: the valve wheel, which is the only control down here. */
const Valve = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <circle
      cx="12"
      cy="12"
      r="8"
      fill="currentColor"
      fillOpacity="0.1"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <circle cx="12" cy="12" r="2.6" fill="currentColor" fillOpacity="0.5" />
    <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M12 4v3M12 17v3M4 12h3M17 12h3" />
    </g>
    <Lit d="M12 4a8 8 0 0 1 8 8" />
  </Glyph>
);

/** The catalogue: three anemones, each open by a different amount. */
const Anemones = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M5 20.6v-5.2M5 15.4c-1.2-1.4-1.6-2.8-1.2-4M5 15.4c1.2-1.4 1.8-2.6 1.6-4.2" />
      <path d="M12 20.6v-8M12 12.6c-1.6-1.8-2.2-3.6-1.8-5.4M12 12.6c1.6-1.8 2.4-3.4 2.2-5.2" />
      <path d="M19 20.6v-6.4M19 14.2c-1.4-1.6-1.8-3-1.4-4.4M19 14.2c1.2-1.4 1.6-2.6 1.4-4" />
    </g>
    <Lit d="M12 20.6v-8" />
    <Lit d="M19 20.6v-6.4" late />
  </Glyph>
);

/** A project: a colony — separate polyps that have grown into one structure. */
const Colony = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <g fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.6">
      <circle cx="8" cy="7.6" r="3.4" />
      <circle cx="16" cy="9.6" r="3" />
      <circle cx="11.6" cy="15.6" r="3.8" />
    </g>
    <path d="M4 20.6c3.4-1 5.6-.6 8 -.6 2.4 0 5 -.4 8 .6" stroke="currentColor" strokeWidth="1.6" />
    <Lit d="M11.6 11.8v7.2" />
  </Glyph>
);

export const UNDERWATER_GLYPHS: GlyphSet = {
  dashboard: Reef,
  tasks: SunThroughWater,
  notes: Shell,
  invitations: Bottle,
  recycle: Amphora,
  settings: Valve,
  themes: Anemones,
  project: Colony,
};

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
