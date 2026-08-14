import { cn } from '@/shared/lib/cn';
import { Glyph, type GlyphProps, type GlyphSet } from './glyph-kit';

/**
 * The woodland's own set.
 *
 * One rule holds the eight together: nothing in this world is manufactured.
 * Every destination is drawn as something that grew or something somebody made
 * out of what grew — a canopy, a cut log, a leaf, a rake — so there is not a
 * single straight line in the set that is not a twig or a handle. Solid shapes
 * are foliage; strokes are wood.
 *
 * The second rule is that the *silhouette* has to carry it. These are rendered
 * at 16px in a rail, where a five-lobed maple turns to mush, so each glyph is
 * built from two or three large masses and the detail is only ever a vein.
 */

/** Workspace: the whole tree, seen from a distance. */
const Canopy = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    {/* The crown, as three overlapping masses rather than one blob. */}
    <path
      d="M12 2.6c3.4 0 5.6 2.2 5.6 4.6 2 .6 3 2.1 3 3.8 0 2.4-2.1 4-5 4H8.4c-2.9 0-5-1.6-5-4 0-1.7 1-3.2 3-3.8 0-2.4 2.2-4.6 5.6-4.6Z"
      fill="currentColor"
      fillOpacity="0.9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    {/* The trunk, and what it stands on. */}
    <path d="M12 15v6.2" stroke="currentColor" strokeWidth="1.9" />
    <path d="M12 18.4 9.4 16m2.6 3.6 2.8-2.6" stroke="currentColor" strokeWidth="1.4" />
    <path d="M6.6 21.6h10.8" stroke="currentColor" strokeWidth="1.5" opacity="0.55" />
  </Glyph>
);

/** Your day, by hour: a cut log. Nothing else keeps time this honestly. */
const Rings = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <circle cx="12" cy="12" r="9.2" stroke="currentColor" strokeWidth="1.7" />
    <circle cx="12" cy="12" r="6.2" stroke="currentColor" strokeWidth="1.4" opacity="0.75" />
    <circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth="1.4" opacity="0.55" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    {/* This year's growth, filled in — the ring the day is happening on. */}
    <path
      d="M12 2.8A9.2 9.2 0 0 1 21.2 12h-3A6.2 6.2 0 0 0 12 5.8Z"
      fill="currentColor"
      fillOpacity="0.85"
    />
  </Glyph>
);

/** Your own desk: a leaf somebody wrote on and left on the table. */
const WrittenLeaf = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <path
      d="M19.6 3.4c1.4 6.6-.6 11.6-4 14.2-3.2 2.4-7.4 2.2-10 .4C4.2 12.4 8 5.6 19.6 3.4Z"
      fill="currentColor"
      fillOpacity="0.9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    {/* The midrib, running out into the stem. */}
    <path d="M18.4 4.6 3.4 20.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    {/* Two lines of writing, following the curve of the leaf. */}
    <g stroke="rgb(var(--surface-raised))" strokeWidth="1.3" strokeLinecap="round" opacity="0.9">
      <path d="M9.6 13.4c2.4-2.6 4.6-4.4 7.4-5.6" />
      <path d="M11.4 16.2c1.8-1.4 3.4-2.6 5.2-3.4" />
    </g>
  </Glyph>
);

/** Something arriving: a letter closed with a drop of wax. */
const SealedLetter = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <rect
      x="2.8"
      y="5.6"
      width="18.4"
      height="13"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.6"
      fill="currentColor"
      fillOpacity="0.12"
    />
    <path d="M3.4 6.8 12 13.2l8.6-6.4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    {/* The seal, pressed with a leaf. */}
    <circle cx="17.6" cy="16.4" r="3.6" fill="currentColor" fillOpacity="0.95" />
    <path
      d="M17.6 18.6c-1.4-1-1.6-2.6-.4-3.8 1 1 2 1.4 2.6 1.2.2 1.4-.8 2.4-2.2 2.6Z"
      fill="rgb(var(--surface-raised))"
      fillOpacity="0.85"
    />
  </Glyph>
);

/** The bin: the heap the leaves get raked onto. */
const Compost = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    {/* The heap. */}
    <path
      d="M2.6 20.4c1.4-4.6 4.6-7 9.4-7s8 2.4 9.4 7Z"
      fill="currentColor"
      fillOpacity="0.85"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    {/* Three leaves still coming down onto it. */}
    <g fill="currentColor" opacity="0.7">
      <ellipse cx="7.2" cy="7.6" rx="3" ry="1.7" transform="rotate(-28 7.2 7.6)" />
      <ellipse cx="16.4" cy="6.4" rx="2.8" ry="1.6" transform="rotate(32 16.4 6.4)" />
      <ellipse cx="12" cy="10.4" rx="2.6" ry="1.5" transform="rotate(-8 12 10.4)" />
    </g>
    <path d="M2.6 21.6h18.8" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
  </Glyph>
);

/** Preferences: the rake. It is the tool for putting things where you want them. */
const Rake = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <path d="M17.6 3.4 9.4 13.6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    {/* The head, and its tines. */}
    <path
      d="M4.2 13.4h10.4l-1.6 3.2H5.8Z"
      fill="currentColor"
      fillOpacity="0.85"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M6 16.6v3.8" />
      <path d="M9.4 16.6v3.8" />
      <path d="M12.8 16.6v3.8" />
    </g>
  </Glyph>
);

/** The catalogue: one bough, three colours. A palette that grew. */
const TurningBough = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <path
      d="M3.4 20.6c3-6.4 7.6-11.4 14-15"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <g fill="currentColor">
      <ellipse cx="15.6" cy="8.4" rx="4" ry="2.3" transform="rotate(-34 15.6 8.4)" />
      <ellipse cx="9.6" cy="13.6" rx="3.6" ry="2.1" transform="rotate(28 9.6 13.6)" fillOpacity="0.72" />
      <ellipse cx="6.4" cy="18.4" rx="3.2" ry="1.9" transform="rotate(-16 6.4 18.4)" fillOpacity="0.45" />
    </g>
  </Glyph>
);

/** A project: the basket everything picked that day goes into. */
const Basket = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    {/* The handle. */}
    <path
      d="M7.6 10.4a4.4 4.4 0 0 1 8.8 0"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    {/* What is in it, showing over the rim. */}
    <g fill="currentColor" opacity="0.75">
      <circle cx="9.4" cy="10.8" r="2" />
      <circle cx="14.6" cy="10.6" r="2.2" />
    </g>
    <path
      d="M3.6 12.4h16.8l-2.2 8.2H5.8Z"
      fill="currentColor"
      fillOpacity="0.9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    {/* The weave. */}
    <g stroke="rgb(var(--surface-raised))" strokeWidth="1.2" opacity="0.75">
      <path d="M9.2 12.4 8 20.6" />
      <path d="M14.8 12.4 16 20.6" />
      <path d="M4.4 16.4h15.2" />
    </g>
  </Glyph>
);

export const AUTUMN_GLYPHS: GlyphSet = {
  dashboard: Canopy,
  tasks: Rings,
  notes: WrittenLeaf,
  invitations: SealedLetter,
  recycle: Compost,
  settings: Rake,
  themes: TurningBough,
  project: Basket,
};

/**
 * The product mark: a leaf pinned to the page.
 *
 * The rest of the app introduces itself with a Post-it and a pin through it,
 * and that is exactly the right gesture to keep — this world simply writes on
 * leaves instead of on squares of paper. Same object, same pin, different
 * material, which is what a skin is supposed to be.
 */
export const AutumnMark = ({ className }: GlyphProps) => (
  <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn('h-10 w-10', className)}>
    {/* The page it is pinned to. */}
    <rect
      x="6"
      y="6"
      width="28"
      height="28"
      rx="6"
      fill="rgb(var(--surface-raised))"
      stroke="currentColor"
      strokeOpacity="0.4"
      strokeWidth="1.6"
    />

    {/* The leaf. Filled in the accent, because on this skin the accent *is*
        the leaf — every other warm thing in the palette is derived from it. */}
    <path
      d="M20 8.4l2.3 5 3.9-1.8-1.2 4.8 5.5-1.1-2.6 4 5.9.7-4.2 3.2 5.4 2.7-5.8 2 3 4.2-5.9-.5
         1.4 5.2-5.7-2.9-.8 8.7h-2.9l-.8-8.7-5.7 2.9 1.4-5.2-5.9.5 3-4.2-5.8-2 5.4-2.7L4.7 20l5.9-.7-2.6-4
         5.5 1.1-1.2-4.8 3.9 1.8z"
      fill="currentColor"
      transform="scale(0.72) translate(7.6 5.2)"
    />

    {/* The pin, through the stem. */}
    <circle cx="20" cy="11.6" r="3" fill="rgb(var(--autumn-bark))" fillOpacity="0.9" />
    <circle cx="19" cy="10.6" r="1" fill="rgb(var(--surface-raised))" fillOpacity="0.8" />
  </svg>
);
