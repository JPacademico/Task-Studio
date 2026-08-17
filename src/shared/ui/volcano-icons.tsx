import { cn } from '@/shared/lib/cn';
import { Glyph, type GlyphProps, type GlyphSet } from './glyph-kit';

/**
 * The basalt set.
 *
 * Two rules hold these together, and both come from the material:
 *
 * **Every silhouette is a fracture.** Rock does not curve when it fails, it
 * splits, so these are built from long straight runs meeting at hard angles —
 * and, unlike the runic set, those angles are deliberately *not* on a 45° grid.
 * A fracture that lands on regular angles reads as something cut on purpose;
 * these are meant to read as something that broke.
 *
 * **Every glyph has a hot core.** A second copy of one significant stroke in
 * `--lava-core`, carrying `.ember-pulse` — the melt showing through where the
 * crust is thinnest. The mark underneath is always fully drawn at full
 * contrast, so the heat is decoration and never legibility.
 */

/** The hot copy of a stroke. Never the only copy of anything. */
const Hot = ({ d, late }: { d: string; late?: boolean }) => (
  <path
    d={d}
    stroke="rgb(var(--lava-core))"
    strokeWidth="2"
    strokeLinecap="round"
    className={cn('ember-pulse', late && 'ember-pulse--late')}
  />
);

/** Workspace: the mountain, with the throat lit. */
const Cone = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <path
      d="M2.4 20.8 9.6 5.2h1.8l2.2 4.2 2-2.4 3.9 13.8Z"
      fill="currentColor"
      fillOpacity="0.16"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path d="M9.6 5.2 8 11.4l3 1.8-1.4 4.2" stroke="currentColor" strokeWidth="1.5" />
    <Hot d="M10.4 5.6 8.9 11.2l2.9 1.8-1.3 4" />
  </Glyph>
);

/** Your day, by hour: the crater from above, hottest in the middle. */
const Crater = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <path
      d="M12 2.8 20.4 8l-2 9.6L12 21.2 5.6 17.6 3.6 8Z"
      fill="currentColor"
      fillOpacity="0.12"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M12 7.6 16.6 10l-1.2 5-3.4 2-3.4-2-1.2-5Z"
      fill="currentColor"
      fillOpacity="0.3"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <Hot d="M12 10.4 14.4 12l-.8 3-1.6 1-1.6-1-.8-3Z" />
  </Glyph>
);

/** Your own desk: a slab of crust with the melt showing along the split. */
const Slab = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <path
      d="M4.2 4.4 19.2 3.4l1 16.4-14.6.8Z"
      fill="currentColor"
      fillOpacity="0.16"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <g stroke="currentColor" strokeWidth="1.4">
      <path d="M7.4 6.2 9 11l-1.2 4.4M15.6 5.6l-1.4 5.6 2 4.6" />
    </g>
    {/* The split down the middle is the lit part — the slab is failing. */}
    <Hot d="M12.2 3.8 11 10.6l2 3-1.2 6.6" />
  </Glyph>
);

/** Something arriving: a volcanic bomb, still burning, on its way down. */
const Bomb = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <path
      d="M13.2 10.4 18 12.6l1.6 5-4 3.4-5-1.2-1.4-4.8Z"
      fill="currentColor"
      fillOpacity="0.2"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    {/* The trail it came in on. */}
    <path
      d="M11.4 9.2 7.6 5.4M9.6 11.4 4.4 8.6M11.8 13.8 5 12.6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <Hot d="M11.4 9.2 7.6 5.4" />
    <Hot d="M9.6 11.4 4.4 8.6" late />
  </Glyph>
);

/** The bin: the vent. Everything that goes in goes down. */
const Vent = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <path
      d="M3.4 8.6 12 5.2l8.6 3.4-3 2.6 2 3-3.4 2.2.8 3.4-5 1.4-4.6-1.6.6-3.4-3.2-2.2 2-3Z"
      fill="currentColor"
      fillOpacity="0.14"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    {/* Straight down the middle, and it is lit all the way. */}
    <Hot d="M12 7.6v11.4" />
  </Glyph>
);

/** Preferences: the damper — a plate you slide over something hot. */
const Damper = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <path
      d="M3.6 15.4 12 12l8.4 3.4-8.4 3.6Z"
      fill="currentColor"
      fillOpacity="0.24"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <path
      d="M6 9.6 12 7l6 2.6"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    {/* What is underneath, showing at the edge the plate does not reach. */}
    <Hot d="M8.2 11.6 12 10l3.8 1.6" />
  </Glyph>
);

/** The catalogue: three flows, at three temperatures. */
const Flows = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M5.4 3.6 4 10l2.6 3-1.8 7.4" />
      <path d="M12 3.6 10.4 9.4l3 3.4-1.8 7.6" />
      <path d="M18.6 3.6 17.4 9l2.4 3.6-1.6 7.8" />
    </g>
    <Hot d="M12 3.6 10.4 9.4l3 3.4-1.8 7.6" />
    <Hot d="M18.6 3.6 17.4 9l2.4 3.6-1.6 7.8" late />
  </Glyph>
);

/** A project: strata — separate layers that became one mountain. */
const Strata = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <g fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.6">
      <path d="M9 3.8h6.4l-1 3.6-4.8.4Z" />
      <path d="M6.6 9h11.2l-1.4 4-9 .4Z" />
      <path d="M3.8 15.2h16.4l-1.8 5-13.4.4Z" />
    </g>
    <Hot d="M12.2 4.2 11.4 9.6l1.6 3.8-.8 6.6" />
  </Glyph>
);

export const VOLCANO_GLYPHS: GlyphSet = {
  dashboard: Cone,
  tasks: Crater,
  notes: Slab,
  invitations: Bomb,
  recycle: Vent,
  settings: Damper,
  themes: Flows,
  project: Strata,
};

/**
 * The product mark: the same Post-it, as a flake of crust.
 *
 * The studio mark's geometry, in cooling rock: the peel becomes a broken corner
 * with the melt showing in the break — paper curls, crust snaps — the two
 * written lines become fissures with the core visible in them, and the pin is a
 * spatter blob that landed on the top-left and welded itself on.
 *
 * The bottom edge carries the same hot line every other raised object in this
 * skin does, because the mark is not exempt from the skin's one physical claim.
 */
export const VolcanoMark = ({ className }: GlyphProps) => (
  <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn('h-10 w-10', className)}>
    {/* The plate behind, so the mark reads as a stack and not one flake. */}
    <path d="M9 9.6 34.4 8.4l.6 25.2-25.4 1Z" fill="currentColor" fillOpacity="0.2" />

    {/* The face. Not a rectangle — every side is off true, the way a plate of
        crust is when it has broken free rather than been cut. */}
    <path
      d="M6 6.4 32.6 5.6l.8 20-7.6 8.4-19.2.6Z"
      fill="currentColor"
      stroke="rgb(var(--lava-crust))"
      strokeOpacity="0.55"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />

    {/* The broken corner, with the melt in the break. */}
    <path
      d="m25.8 34 .4-8.2 7.2-.2L25.8 34Z"
      fill="rgb(var(--surface-raised))"
      fillOpacity="0.5"
      stroke="rgb(var(--lava-flow))"
      strokeOpacity="0.8"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />

    {/* Two fissures, and the core in them. */}
    <g stroke="rgb(var(--surface-raised))" strokeWidth="2.6" strokeOpacity="0.85">
      <path d="m11.4 14.6 6.2.6 9.4-1" />
      <path d="m11.4 21 5 .6 5.6-.8" />
    </g>
    <g stroke="rgb(var(--lava-core))" strokeWidth="1.3">
      <path d="m11.4 14.6 6.2.6 9.4-1" className="ember-pulse" />
      <path d="m11.4 21 5 .6 5.6-.8" className="ember-pulse ember-pulse--late" />
    </g>

    {/* The melt at the bottom seam — the skin's one claim, on its own mark. */}
    <path
      d="M6.6 32.8 25.4 32.2"
      stroke="rgb(var(--lava-flow))"
      strokeWidth="2"
      strokeLinecap="round"
      strokeOpacity="0.9"
    />

    {/* The spatter, welded onto the top-left corner where the pin would be. */}
    <path
      d="M6.4 6.2 13 5.8l-1.4 4.4-3.2 1.6-2.6-2.2Z"
      fill="rgb(var(--lava-flow))"
      stroke="rgb(var(--lava-core))"
      strokeOpacity="0.7"
      strokeWidth="1.1"
      strokeLinejoin="round"
    />
  </svg>
);
