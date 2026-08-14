import { cn } from '@/shared/lib/cn';
import { Glyph, type GlyphProps, type GlyphSet } from './glyph-kit';

/**
 * The carved set.
 *
 * Two rules hold these together, and both come from the material rather than
 * from taste:
 *
 * **Everything is a straight cut.** Runes are angular because they were made
 * with a blade against grain — a curve is hard to cut and harder to read once
 * weathered. So there is not one arc in this set. Every glyph is built from
 * strokes at multiples of about 45°, which is also what makes eight unrelated
 * destinations read as one alphabet.
 *
 * **Every glyph is drawn twice.** Once as the groove, in the current colour,
 * and once as the light sitting in it — a second copy of the significant
 * strokes, in the glow, carrying `.rune-pulse`. That is what makes the set
 * animated without making it hard to look at: the mark is always fully there
 * at full contrast, and only the light in it breathes. Hovering the row it
 * sits in stops the breath and holds it lit (see the rule in `index.css`).
 */

/** The lit copy of a stroke. Never the only copy of anything. */
const Lit = ({ d, late }: { d: string; late?: boolean }) => (
  <path
    d={d}
    stroke="rgb(var(--rune-glow))"
    strokeWidth="2.4"
    className={cn('rune-pulse', late && 'rune-pulse--late')}
  />
);

/** Workspace: the standing stone everything else is cut into. */
const Monolith = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <path
      d="M6.5 21.5V6l5.5-3.5L17.5 6v15.5Z"
      fill="currentColor"
      fillOpacity="0.14"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinejoin="round"
    />
    <path d="M12 6.5v11" stroke="currentColor" strokeWidth="1.7" />
    <path d="m12 11-3.2-3M12 14l3.2-3" stroke="currentColor" strokeWidth="1.7" />
    <Lit d="M12 6.5v11" />
  </Glyph>
);

/** Your day, by hour: the sun's mark, cut as a wheel of eight spokes. */
const SunWheel = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <path
      d="M12 3.2 20.8 12 12 20.8 3.2 12Z"
      fill="currentColor"
      fillOpacity="0.12"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <g stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3.2v17.6M3.2 12h17.6" />
    </g>
    <Lit d="M12 6.4 17.6 12 12 17.6 6.4 12Z" />
  </Glyph>
);

/** Your own desk: a tablet, cut with three marks and leaning against the wall. */
const Tablet = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <path
      d="M5 3.4h14v17.2H5Z"
      fill="currentColor"
      fillOpacity="0.14"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinejoin="round"
    />
    <g stroke="currentColor" strokeWidth="1.6">
      <path d="M8.4 6.6v10.8M8.4 10l3.4-3.4M15.6 6.6v10.8M15.6 13.4l-3.4 3.4" />
    </g>
    <Lit d="M8.4 6.6v10.8" />
    <Lit d="M15.6 6.6v10.8" late />
  </Glyph>
);

/** Something arriving: a message cut into a slip and sealed with a bind rune. */
const Dispatch = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <path
      d="M2.8 6h18.4v12H2.8Z"
      fill="currentColor"
      fillOpacity="0.12"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinejoin="round"
    />
    <path d="m2.8 6.6 9.2 6.6 9.2-6.6" stroke="currentColor" strokeWidth="1.8" />
    <Lit d="M12 10.6v6M12 13.6l-2.8-2.8M12 13.6l2.8-2.8" />
  </Glyph>
);

/** The bin: a stone broken across the middle. */
const BrokenStone = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <path
      d="M6 10.4 12 3.2l6 7.2-2.4 2.2H8.4Z"
      fill="currentColor"
      fillOpacity="0.14"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M7 16.2h10l-1.4 4.6H8.4Z"
      fill="currentColor"
      fillOpacity="0.14"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    {/* The break itself is the lit part — a fracture with light coming out. */}
    <Lit d="M8.6 13.6h6.8" />
  </Glyph>
);

/** Preferences: the chisel and the mark it leaves. */
const Chisel = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <path
      d="M14.6 2.6 21 9l-9.4 9.4-6.4-6.4Z"
      fill="currentColor"
      fillOpacity="0.12"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path d="m8.6 15.4-4.4 4.4" stroke="currentColor" strokeWidth="1.8" />
    <Lit d="m14.6 6.4 3 3" />
  </Glyph>
);

/** The catalogue: three staves standing together, each lit differently. */
const Staves = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <g stroke="currentColor" strokeWidth="1.9" strokeLinecap="square">
      <path d="M5.4 3.6v16.8M12 3.6v16.8M18.6 3.6v16.8" />
      <path d="M5.4 8.4 8.6 5.2M12 12.6l3.2-3.2M18.6 16.8l-3.2-3.2" />
    </g>
    <Lit d="M12 3.6v16.8" />
    <Lit d="M18.6 3.6v16.8" late />
  </Glyph>
);

/** A project: a cairn — separate stones, stacked into one thing. */
const Cairn = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <g fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 3.6h8l-1.4 4.2H9.4Z" />
      <path d="M5.6 9.4h12.8l-1.6 4.6H7.2Z" />
      <path d="M4 15.6h16l-1.8 4.8H5.8Z" />
    </g>
    <Lit d="M12 3.6v16.8" />
  </Glyph>
);

export const RUNIC_GLYPHS: GlyphSet = {
  dashboard: Monolith,
  tasks: SunWheel,
  notes: Tablet,
  invitations: Dispatch,
  recycle: BrokenStone,
  settings: Chisel,
  themes: Staves,
  project: Cairn,
};

/**
 * The product mark: the same Post-it, cut into a slab.
 *
 * The pad, the peeled corner and the pin are the product's signature across
 * every skin, and a skin earns its own mark by changing what the object is
 * *made of* — not by replacing it with something else. So this is the studio
 * mark's geometry, in stone: the peel becomes a broken corner (rock does not
 * curl), the two written lines become cut ones with light in them, and the pin
 * is an iron nail driven into the block.
 */
export const RunicMark = ({ className }: GlyphProps) => (
  <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn('h-10 w-10', className)}>
    {/* The slab behind, so the mark reads as a stack and not one stone. */}
    <rect x="8" y="9" width="26" height="26" fill="currentColor" fillOpacity="0.2" />

    {/* The face. */}
    <path
      d="M6 6h27v20.4L25.2 34H6Z"
      fill="currentColor"
      stroke="rgb(var(--rune-stone))"
      strokeOpacity="0.5"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />

    {/* The broken corner. */}
    <path
      d="M25.2 34v-7.6H33L25.2 34Z"
      fill="rgb(var(--surface-raised))"
      fillOpacity="0.5"
      stroke="rgb(var(--rune-stone))"
      strokeOpacity="0.45"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />

    {/* Two cut lines, and the light in them. */}
    <g stroke="rgb(var(--surface-raised))" strokeWidth="2.4" strokeOpacity="0.85">
      <path d="M11.5 14.5h15.5" />
      <path d="M11.5 21h10.5" />
    </g>
    <g stroke="rgb(var(--rune-glow))" strokeWidth="1.4">
      <path d="M11.5 14.5h15.5" className="rune-pulse" />
      <path d="M11.5 21h10.5" className="rune-pulse rune-pulse--late" />
    </g>

    {/* The nail, driven through the top-left corner. */}
    <path
      d="M6.6 6.2h6.4l-2.6 6.2h-1.2Z"
      fill="rgb(var(--rune-stone))"
      fillOpacity="0.9"
      stroke="rgb(var(--surface-raised))"
      strokeOpacity="0.6"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * "Previous" and "next", cut into the rock.
 *
 * An arrow is the one glyph in the app that has to survive being 14px wide in
 * a toolbar, so this is a chevron and a stave and nothing else — the lit part
 * is the barb, which is the half that carries the direction. The tail glows a
 * beat later, so at rest the mark reads outward, the way it points.
 */
export const RuneArrow = ({
  direction,
  className,
}: GlyphProps & { direction: 'left' | 'right' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden
    className={cn('h-4 w-4', className)}
    // Mirrored rather than drawn twice: the mark is symmetric about its own
    // stave, so there is no highlight to get the wrong way round.
    style={direction === 'left' ? undefined : { transform: 'scaleX(-1)' }}
  >
    <g stroke="currentColor" strokeWidth="2.1" strokeLinecap="square">
      {/* The stave. */}
      <path d="M20.4 12H5.2" />
      {/* The barb. */}
      <path d="M11 5.6 4.4 12l6.6 6.4" />
      {/* The two nicks that make it a rune rather than an arrow. */}
      <path d="M16.6 8.8 13.4 12M16.6 15.2 13.4 12" strokeWidth="1.6" />
    </g>

    <g stroke="rgb(var(--rune-glow))" strokeWidth="1.5" strokeLinecap="square">
      <path d="M11 5.6 4.4 12l6.6 6.4" className="rune-pulse" />
      <path d="M20.4 12H5.2" className="rune-pulse rune-pulse--late" />
    </g>
  </svg>
);
