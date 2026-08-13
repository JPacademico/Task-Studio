import { cn } from '@/shared/lib/cn';
import { Glyph, type GlyphProps, type GlyphSet } from './glyph-kit';

/**
 * The marginalia.
 *
 * These are not drawings of monsters. They are the diagrams somebody sane made
 * *about* one — the kind of thing found copied into the back of a field
 * notebook, in the same hand as the rest of the notes and slightly wrong. Three
 * rules hold the set together:
 *
 *   - Everything is drawn as an inscription: hairline strokes, no fills except
 *     where something is looking back. That is what makes the one filled shape
 *     in a glyph — always a pupil, always `currentColor` — the thing the eye
 *     lands on.
 *   - Symmetry is deliberate and slightly too perfect. A sigil is a diagram,
 *     not an illustration.
 *   - The only fixed colours are the skin's own two: `--eldritch-glow` for
 *     anything that should not be there, `--eldritch-ichor` for anything wet.
 *     Everything else takes the tile's colour so a glyph works on a plain tile
 *     and on a brand-filled active one.
 */

/**
 * Workspace: the eye that is already open when you get there.
 *
 * One of the four glyphs in this set that blinks. The lid and the iris are
 * wrapped together so the blink collapses both — an eye whose pupil survives
 * the lid closing is an eye drawn wrong — while the lashes stay put, because
 * they are attached to the outside of it.
 */
const GreatEye = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <g className="eldritch-wink">
      <path
        d="M1.6 12S5.5 5.2 12 5.2 22.4 12 22.4 12 18.5 18.8 12 18.8 1.6 12 1.6 12Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="12" cy="12" r="4.4" stroke="rgb(var(--eldritch-glow))" strokeWidth="1.3" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </g>
    {/* Lashes, or something growing out of the lid. */}
    <g stroke="currentColor" strokeWidth="1.2" opacity="0.6">
      <path d="M12 5.2V2.4" />
      <path d="M4.4 8.4 2.6 6.4" />
      <path d="M19.6 8.4 21.4 6.4" />
    </g>
  </Glyph>
);

/** Your day: the spiral, because time here does not run in a line. */
const Spiral = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <path
      d="M12 12a2.6 2.6 0 1 1 2.6 2.6 5.2 5.2 0 0 1-5.2-5.2 7.8 7.8 0 0 1 7.8-7.8"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M12 12a2.6 2.6 0 1 0-2.6-2.6 5.2 5.2 0 0 0 5.2 5.2 7.8 7.8 0 0 1 7.8 7.8"
      stroke="rgb(var(--eldritch-ichor))"
      strokeWidth="1.3"
      opacity="0.75"
    />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" />
  </Glyph>
);

/** Your own desk: the book it was all copied out of. */
const Tome = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <path
      d="M3.4 4.2h6.2A2.4 2.4 0 0 1 12 6.6v13a2.4 2.4 0 0 0-2.4-2.4H3.4Z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M20.6 4.2h-6.2A2.4 2.4 0 0 0 12 6.6v13a2.4 2.4 0 0 1 2.4-2.4h6.2Z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    {/* The clasp, and the eye set into it. Blinks on its own schedule — the
        delay is what stops the four watching glyphs firing in unison. */}
    <g className="eldritch-wink" style={{ animationDelay: '1.9s' }}>
      <ellipse
        cx="12"
        cy="11"
        rx="2.4"
        ry="1.5"
        stroke="rgb(var(--eldritch-glow))"
        strokeWidth="1.2"
      />
      <circle cx="12" cy="11" r="0.85" fill="currentColor" />
    </g>
  </Glyph>
);

/** Something arriving: a summons, folded and sealed in wax. */
const Summons = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <path d="M3 6.4h18v12.2H3Z" stroke="currentColor" strokeWidth="1.5" />
    <path d="M3 6.8 12 13.6l9-6.8" stroke="currentColor" strokeWidth="1.4" opacity="0.7" />
    {/* The seal, struck over the fold. */}
    <circle cx="17.6" cy="16.4" r="3.4" fill="rgb(var(--eldritch-glow))" fillOpacity="0.28" />
    <circle cx="17.6" cy="16.4" r="3.4" stroke="rgb(var(--eldritch-glow))" strokeWidth="1.3" />
    <circle cx="17.6" cy="16.4" r="1.1" fill="currentColor" />
  </Glyph>
);

/** The bin: the mouth. Nothing put here is retrievable in any real sense. */
const Maw = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <path
      d="M2.6 8.4C5 5.6 8.3 4.2 12 4.2s7 1.4 9.4 4.2c-2.4 7.4-5.5 11.2-9.4 11.2S5 15.8 2.6 8.4Z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    {/* Teeth. */}
    <g fill="currentColor" opacity="0.85">
      <path d="M6.2 8.6 7.8 12 9.4 8.6Z" />
      <path d="M10.4 8.6 12 12.8l1.6-4.2Z" />
      <path d="M14.6 8.6 16.2 12l1.6-3.4Z" />
    </g>
    <path d="M2.6 8.4h18.8" stroke="rgb(var(--eldritch-ichor))" strokeWidth="1.4" />
  </Glyph>
);

/** Preferences: the seal you turn to change what the diagram means. */
const Sigil = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <g stroke="currentColor" strokeWidth="1.4">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3.4 19.4 16.6H4.6Z" />
    </g>
    <path
      d="M12 20.6 4.6 7.4h14.8Z"
      stroke="rgb(var(--eldritch-glow))"
      strokeWidth="1.2"
      opacity="0.75"
    />
    <circle cx="12" cy="12" r="1.9" fill="currentColor" />
  </Glyph>
);

/**
 * The catalogue: three eyes, and not one of them agrees with the others.
 *
 * Each blinks on its own delay, which is the entire joke of the glyph — three
 * eyes that never once close together.
 */
const Facets = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <g className="eldritch-wink" style={{ animationDelay: '0.6s' }}>
      <ellipse cx="7.4" cy="8.6" rx="5.2" ry="3.4" stroke="currentColor" strokeWidth="1.35" />
      <circle cx="7.4" cy="8.6" r="1.4" fill="currentColor" />
    </g>
    <g className="eldritch-wink" style={{ animationDelay: '3.1s' }}>
      <ellipse cx="16.6" cy="8.6" rx="5.2" ry="3.4" stroke="currentColor" strokeWidth="1.35" />
      <circle cx="16.6" cy="8.6" r="1.4" fill="rgb(var(--eldritch-glow))" />
    </g>
    <g className="eldritch-wink" style={{ animationDelay: '5.4s' }}>
      <ellipse cx="12" cy="16.4" rx="5.2" ry="3.4" stroke="currentColor" strokeWidth="1.35" />
      <circle cx="12" cy="16.4" r="1.4" fill="rgb(var(--eldritch-ichor))" />
    </g>
  </Glyph>
);

/** A project: the Elder Sign — a branch, and the eye it was cut to hold. */
const ElderSign = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <path
      d="M12 2.4 14.6 9.4 21.8 9.4 16 13.8 18.2 21 12 16.6 5.8 21 8 13.8 2.2 9.4 9.4 9.4Z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <g className="eldritch-wink" style={{ animationDelay: '4.3s' }}>
      <ellipse
        cx="12"
        cy="12.4"
        rx="3"
        ry="1.9"
        stroke="rgb(var(--eldritch-glow))"
        strokeWidth="1.2"
      />
      <circle cx="12" cy="12.4" r="1.1" fill="currentColor" />
    </g>
  </Glyph>
);

export const ELDRITCH_GLYPHS: GlyphSet = {
  dashboard: GreatEye,
  tasks: Spiral,
  notes: Tome,
  invitations: Summons,
  recycle: Maw,
  settings: Sigil,
  themes: Facets,
  project: ElderSign,
};

/**
 * The product mark: the note, and what got into it.
 *
 * The sheet is the same square of paper every other skin introduces the
 * product with — the signature does not change from world to world, only what
 * the world has done to it. Here it has been in the wrong room: the corner is
 * curling of its own accord, an eye has opened in the middle of the writing,
 * and something has come up over the bottom edge to hold it down.
 */
export const EldritchMark = ({ className }: GlyphProps) => (
  <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn('h-10 w-10', className)}>
    {/* The sheet behind, so the mark reads as a pad and not one page. */}
    <path
      d="M11 9h21v17l-6 6H11V9Z"
      fill="currentColor"
      fillOpacity="0.18"
      stroke="currentColor"
      strokeOpacity="0.3"
      strokeWidth="1.3"
      strokeLinejoin="round"
      transform="rotate(4 20 20)"
    />

    {/* The page. Grown corners, matching every box in the skin. */}
    <path
      d="M5 8.5C5 6.6 6.4 5 8.2 5H31v18.5L23.5 32H7.6C6.2 32 5 30.7 5 29.2V8.5Z"
      fill="currentColor"
      fillOpacity="0.9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />

    {/* The corner, lifting on its own. */}
    <path
      d="M23.5 32v-6a2.5 2.5 0 0 1 2.5-2.5h5"
      fill="none"
      stroke="rgb(var(--eldritch-ichor))"
      strokeWidth="1.5"
      strokeLinejoin="round"
      opacity="0.9"
    />

    {/* Two lines of writing — and, between them, an eye where a third should
        have been. It takes the raised-surface colour so it reads as a hole
        through the sheet rather than as ink on it. */}
    <g stroke="rgb(var(--surface-raised))" strokeWidth="2" strokeLinecap="round" opacity="0.85">
      <path d="M9.5 12.5h16" />
      <path d="M9.5 26h7" />
    </g>

    <ellipse
      cx="18"
      cy="19"
      rx="7.4"
      ry="4.4"
      fill="rgb(var(--surface-raised))"
      fillOpacity="0.92"
      stroke="rgb(var(--eldritch-glow))"
      strokeWidth="1.4"
    />
    <circle cx="18" cy="19" r="2.4" fill="currentColor" />
    <circle cx="16.9" cy="17.9" r="0.75" fill="rgb(var(--surface-raised))" opacity="0.9" />

    {/* And what came up over the bottom edge to keep it there. */}
    <g stroke="rgb(var(--eldritch-ichor))" strokeWidth="1.7" strokeLinecap="round" fill="none">
      <path d="M8 32c0 3-2.4 3.6-3.6 2.4s-.4-3 1.2-2.6" />
      <path d="M14.5 32c.4 3.4-1.6 5-3.4 4.2" />
      <path d="M20.5 31.6c1 2.8 3.4 3.6 4.8 2.6" />
    </g>
  </svg>
);
