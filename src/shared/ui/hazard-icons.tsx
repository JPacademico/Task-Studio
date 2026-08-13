import { cn } from '@/shared/lib/cn';
import { Glyph, type GlyphProps, type GlyphSet } from './glyph-kit';

/**
 * The containment site's signage.
 *
 * Nothing here is an "icon of a thing" — every glyph is a *sign*, the kind
 * bolted to a door or stencilled on a drum, because that is the only visual
 * language this world has. Three rules hold the set together:
 *
 *   - Everything is enclosed. A sign is a plate with a border, so each glyph
 *     sits inside a frame, a drum or a triangle rather than floating.
 *   - Contents are solid `currentColor`; the vessel is a stroke. That is what
 *     lets a barrel read as full at a glance, and it is why the sludge line
 *     inside one is the loudest mark in the glyph.
 *   - The one fixed colour is `--hazard-sludge`, and it is only ever used for
 *     something leaking or emitting. Everything else takes the tile's colour,
 *     so a glyph works on a plain tile and on a brand-filled active one.
 */

/** Workspace: the trefoil. The sign the whole skin is named after. */
const Trefoil = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <circle cx="12" cy="12" r="2.4" fill="currentColor" />
    <g fill="currentColor">
      <path d="M7.5 4.3A9 9 0 0 1 16.5 4.3L13.5 9.5A3 3 0 0 0 10.5 9.5Z" />
      <path d="M20.3 17.6A9 9 0 0 1 12.5 22.1L12.5 16.1A3 3 0 0 0 15.1 14.6Z" />
      <path d="M11.5 22.1A9 9 0 0 1 3.7 17.6L8.9 14.6A3 3 0 0 0 11.5 16.1Z" />
    </g>
  </Glyph>
);

/** Your day: a shift clock on a dial, with the hour hand in the red. */
const ShiftDial = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <circle cx="12" cy="12" r="8.6" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M12 5.6A6.4 6.4 0 0 1 18.4 12H12Z"
      fill="rgb(var(--hazard-sludge))"
      fillOpacity="0.75"
    />
    <path d="M12 7.4V12l3.4 2.2" stroke="currentColor" strokeWidth="1.8" />
  </Glyph>
);

/** Your own desk: a clipboard of sheets, clamped down. */
const Clipboard = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <rect x="4.2" y="4.4" width="15.6" height="16.4" stroke="currentColor" strokeWidth="1.8" />
    <rect x="8.6" y="2.4" width="6.8" height="3.6" fill="currentColor" />
    <g stroke="currentColor" strokeWidth="1.6" opacity="0.75">
      <path d="M7.6 11h8.8" />
      <path d="M7.6 14.6h6" />
    </g>
  </Glyph>
);

/** Something arriving: a sealed drum with a manifest tag on it. */
const Drum = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <path
      d="M5.4 6.6h13.2v12.2a2 2 0 0 1-2 2H7.4a2 2 0 0 1-2-2Z"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path d="M5.4 6.6 12 3.2l6.6 3.4" stroke="currentColor" strokeWidth="1.8" />
    {/* Filled to the line, and the line is glowing. */}
    <path
      d="M5.4 13.4h13.2v5.4a2 2 0 0 1-2 2H7.4a2 2 0 0 1-2-2Z"
      fill="rgb(var(--hazard-sludge))"
      fillOpacity="0.55"
    />
    <path d="M5.4 13.4h13.2" stroke="rgb(var(--hazard-sludge))" strokeWidth="1.6" />
  </Glyph>
);

/** The bin: the disposal chute, and what comes out of the bottom of it. */
const Chute = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <path d="M3.6 4h16.8l-5 7.6v5.2l-6.8 3.4v-8.6Z" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M9.4 20.6c1.9.9 3.5.9 5.4 0"
      stroke="rgb(var(--hazard-sludge))"
      strokeWidth="1.8"
      opacity="0.9"
    />
    <circle cx="12" cy="7.4" r="1.5" fill="currentColor" />
  </Glyph>
);

/** Preferences: the master valve. Turn it and everything downstream changes. */
const Valve = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <circle cx="12" cy="12" r="6.2" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="12" cy="12" r="1.9" fill="currentColor" />
    <g stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2.6v3.2" />
      <path d="M12 18.2v3.2" />
      <path d="M2.6 12h3.2" />
      <path d="M18.2 12h3.2" />
    </g>
  </Glyph>
);

/** The catalogue: sample vials in a rack, each one a different reaction. */
const Samples = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <g stroke="currentColor" strokeWidth="1.7">
      <path d="M5.4 3.2v13.4a2.6 2.6 0 0 0 5.2 0V3.2" />
      <path d="M13.4 3.2v13.4a2.6 2.6 0 0 0 5.2 0V3.2" />
      <path d="M4.2 3.2h7.6" />
      <path d="M12.2 3.2h7.6" />
    </g>
    {/* Two different fills — the whole point of a rack of samples. */}
    <path
      d="M5.4 11.4h5.2v5.2a2.6 2.6 0 0 1-5.2 0Z"
      fill="rgb(var(--hazard-sludge))"
      fillOpacity="0.7"
    />
    <path d="M13.4 13.8h5.2v2.8a2.6 2.6 0 0 1-5.2 0Z" fill="currentColor" fillOpacity="0.65" />
  </Glyph>
);

/** A project: the site itself — a reactor stack, venting. */
const Reactor = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <path d="M6.4 21.2V11a5.6 5.6 0 0 1 11.2 0v10.2Z" stroke="currentColor" strokeWidth="1.8" />
    <path d="M4.6 21.2h14.8" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M9.6 6.6c0-1.7 1.1-2.4 1.1-4.2 1.4 1 2.2 2.2 2.2 3.5 0 .9-.4 1.3-.4 2"
      stroke="rgb(var(--hazard-sludge))"
      strokeWidth="1.6"
    />
    <rect x="9" y="14.4" width="6" height="6.8" fill="rgb(var(--hazard-sludge))" fillOpacity="0.6" />
  </Glyph>
);

export const HAZARD_GLYPHS: GlyphSet = {
  dashboard: Trefoil,
  tasks: ShiftDial,
  notes: Clipboard,
  invitations: Drum,
  recycle: Chute,
  settings: Valve,
  themes: Samples,
  project: Reactor,
};

/**
 * The product mark: the note, logged and sealed.
 *
 * The first version of this was the warning triangle off the containment door,
 * and it was wrong for one reason: the mark is the *product's* signature, and
 * every other skin draws it as a square of paper. A triangle said "hazard app"
 * where the rest of the set says "Task Studio, in this world" — so the object
 * is a sheet again and the world is what is done to it.
 *
 * What this world does to a sheet: tapes it at the top so nobody moves it,
 * stamps it with the trefoil, cuts the corner off the way a machined tag is
 * cut, and lets what it was covering run out of the bottom.
 */
export const HazardMark = ({ className }: GlyphProps) => (
  <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn('h-10 w-10', className)}>
    <defs>
      {/*
        The tape, as a real pattern rather than hand-placed bars: the header is
        a strip of the same roll the rails and the avatar band use, and a
        rotated two-bar tile is the cheapest honest way to draw it. The id is
        shared by every copy of the mark on the page, which is fine — they are
        identical, and SVG resolves to the first.
      */}
      <pattern
        id="hazard-mark-tape"
        width="7"
        height="7"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(-45)"
      >
        <rect width="3.5" height="7" fill="currentColor" />
        <rect x="3.5" width="3.5" height="7" fill="rgb(var(--edge))" />
      </pattern>
    </defs>

    {/* The sheet behind, so the mark reads as a stack and not one page. */}
    <path
      d="M11 9h21v17l-6 6H11V9Z"
      fill="currentColor"
      fillOpacity="0.18"
      stroke="currentColor"
      strokeOpacity="0.3"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />

    {/* The sheet itself. Hard corners and a machined bevel where the drawn
        skins curl the paper up — nothing here is soft enough to curl. */}
    <path
      d="M5 5h27v20l-7 7H5V5Z"
      fill="currentColor"
      fillOpacity="0.92"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />

    {/* Taped down along the header. */}
    <path d="M5 5h27v6.5H5V5Z" fill="url(#hazard-mark-tape)" />
    <path d="M5 11.5h27" stroke="rgb(var(--edge))" strokeWidth="1.4" opacity="0.85" />

    {/* Stamped. The same three blades as the nav glyph, scaled into the body. */}
    <g fill="rgb(var(--surface-raised))" transform="translate(18.5 21) scale(0.42) translate(-12 -12)">
      <circle cx="12" cy="12" r="2.8" />
      <path d="M7.5 4.3A9 9 0 0 1 16.5 4.3L13.5 9.5A3 3 0 0 0 10.5 9.5Z" />
      <path d="M20.3 17.6A9 9 0 0 1 12.5 22.1L12.5 16.1A3 3 0 0 0 15.1 14.6Z" />
      <path d="M11.5 22.1A9 9 0 0 1 3.7 17.6L8.9 14.6A3 3 0 0 0 11.5 16.1Z" />
    </g>

    {/* The cut corner, lit along the bevel. */}
    <path
      d="M25 32v-7h7"
      fill="none"
      stroke="rgb(var(--edge))"
      strokeWidth="1.6"
      strokeLinejoin="round"
      opacity="0.8"
    />

    {/* And whatever it was covering, running out of the bottom. */}
    <g fill="rgb(var(--hazard-sludge))">
      <path d="M8 31.5h10c0 2.6-2 4.4-5 4.4s-5-1.8-5-4.4Z" opacity="0.9" />
      <circle cx="10" cy="37.2" r="1.5" opacity="0.75" />
      <circle cx="16.4" cy="38.4" r="1" opacity="0.6" />
    </g>
  </svg>
);
