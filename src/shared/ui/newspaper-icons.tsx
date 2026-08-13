import { cn } from '@/shared/lib/cn';
import { Glyph, type GlyphProps, type GlyphSet } from './glyph-kit';

/**
 * The newsroom's own set.
 *
 * A newspaper's marks are made of two things and nothing else: solid blocks of
 * ink and hairline rules. So every glyph here is a plate — a folded sheet, a
 * clipping, a stamp — with ruled lines standing in for type, and the one
 * concession to colour is the spot plate on the mark.
 *
 * The rule that keeps them a set: type is always a stroked line at 1.6, a
 * photograph is always a solid fill, and nothing is round unless it is
 * physically round (a stamp, a lens).
 */

/** Workspace: the front page, folded, with the banner across the top. */
const FrontPage = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <path d="M3.4 4.6h17.2v14.8H3.4Z" stroke="currentColor" strokeWidth="1.7" />
    {/* The banner headline, solid. */}
    <rect x="5.6" y="6.8" width="12.8" height="2.6" fill="currentColor" />
    {/* Two columns of story under it, ruled. */}
    <g stroke="currentColor" strokeWidth="1.5" opacity="0.8">
      <path d="M5.6 12.2h5.4" />
      <path d="M5.6 15.2h5.4" />
      <path d="M13 12.2h5.4" />
      <path d="M13 15.2h5.4" />
    </g>
    {/* The fold. */}
    <path d="M3.4 19.4h17.2" stroke="currentColor" strokeWidth="1.7" opacity="0.5" />
  </Glyph>
);

/** Your day: the schedule, printed as a listings grid. */
const Listings = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <rect x="3.6" y="5" width="16.8" height="15.4" stroke="currentColor" strokeWidth="1.7" />
    <path d="M3.6 9.4h16.8" stroke="currentColor" strokeWidth="1.7" />
    <g stroke="currentColor" strokeWidth="1.5" opacity="0.55">
      <path d="M9.2 9.4v11" />
      <path d="M14.8 9.4v11" />
      <path d="M3.6 14.9h16.8" />
    </g>
    {/* Today's slot, inked in. */}
    <rect x="9.2" y="14.9" width="5.6" height="5.5" fill="currentColor" fillOpacity="0.85" />
  </Glyph>
);

/** Your own desk: a clipping, torn out and kept. */
const Clipping = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <path
      d="M4.4 3.8h15.2v13.4l-3.4 3.4H4.4Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeDasharray="2.4 1.6"
    />
    <rect x="6.8" y="6.4" width="10.4" height="2.2" fill="currentColor" />
    <g stroke="currentColor" strokeWidth="1.5" opacity="0.8">
      <path d="M6.8 11.6h10.4" />
      <path d="M6.8 14.6h6.6" />
    </g>
  </Glyph>
);

/** Something arriving: a wire dispatch in its envelope. */
const Dispatch = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <rect x="2.8" y="5.6" width="18.4" height="13" stroke="currentColor" strokeWidth="1.7" />
    <path d="M2.8 6.4 12 13.4l9.2-7" stroke="currentColor" strokeWidth="1.7" />
    {/* The stamp, cancelled. */}
    <rect x="16" y="7.6" width="4" height="3.4" fill="currentColor" fillOpacity="0.85" />
  </Glyph>
);

/** The bin: the spike every rejected story went onto. */
const Spike = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <path d="M12 2.4v14.2" stroke="currentColor" strokeWidth="1.9" />
    <path d="M7.6 20.6c0-2.4 2-4.2 4.4-4.2s4.4 1.8 4.4 4.2Z" fill="currentColor" />
    {/* Two spiked sheets, run through. */}
    <g stroke="currentColor" strokeWidth="1.6" opacity="0.75">
      <path d="M6.6 8.4h10.8" />
      <path d="M8 12.4h8" />
    </g>
  </Glyph>
);

/** Preferences: the composing stick the page is set with. */
const ComposingStick = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <path d="M3.4 15.6h17.2v4.4H3.4Z" stroke="currentColor" strokeWidth="1.7" />
    {/* Sorts standing in the stick, at three heights. */}
    <g fill="currentColor">
      <rect x="5.4" y="7.6" width="3.2" height="8" />
      <rect x="10.4" y="4.4" width="3.2" height="11.2" fillOpacity="0.8" />
      <rect x="15.4" y="9.8" width="3.2" height="5.8" fillOpacity="0.6" />
    </g>
  </Glyph>
);

/** The catalogue: the back issues, filed. */
const Archive = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <g stroke="currentColor" strokeWidth="1.7">
      <path d="M6.6 3.6h13.8v13.8" />
      <path d="M3.6 6.6h13.8v13.8H3.6Z" />
    </g>
    <rect x="5.8" y="9" width="9.4" height="2.2" fill="currentColor" />
    <g stroke="currentColor" strokeWidth="1.5" opacity="0.75">
      <path d="M5.8 13.6h9.4" />
      <path d="M5.8 16.6h6" />
    </g>
  </Glyph>
);

/** A project: the desk it belongs to, with its own masthead. */
const Desk = ({ className }: GlyphProps) => (
  <Glyph className={className}>
    <rect x="3.4" y="4.4" width="17.2" height="15.2" stroke="currentColor" strokeWidth="1.7" />
    {/* Masthead rule: heavy, hairline, heavy. */}
    <g fill="currentColor">
      <rect x="3.4" y="8" width="17.2" height="1.4" />
      <rect x="3.4" y="10.2" width="17.2" height="0.8" fillOpacity="0.6" />
    </g>
    <rect x="5.6" y="12.8" width="6.2" height="4.6" fill="currentColor" fillOpacity="0.85" />
    <g stroke="currentColor" strokeWidth="1.5" opacity="0.75">
      <path d="M13.6 13.4h5" />
      <path d="M13.6 16.4h5" />
    </g>
  </Glyph>
);

export const NEWSPAPER_GLYPHS: GlyphSet = {
  dashboard: FrontPage,
  tasks: Listings,
  notes: Clipping,
  invitations: Dispatch,
  recycle: Spike,
  settings: ComposingStick,
  themes: Archive,
  project: Desk,
};

/**
 * The product mark: the masthead itself.
 *
 * The rest of the app introduces itself with a Post-it; a newspaper introduces
 * itself with the nameplate at the top of page one — a ruled box, a solid
 * banner where the title sits, and the spot colour the press ran alongside
 * black.
 */
export const NewspaperMark = ({ className }: GlyphProps) => (
  <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn('h-10 w-10', className)}>
    {/* The sheet behind, so the mark reads as an edition and not one page. */}
    <rect
      x="9"
      y="8"
      width="27"
      height="27"
      fill="currentColor"
      fillOpacity="0.18"
      stroke="currentColor"
      strokeOpacity="0.35"
      strokeWidth="1.4"
    />

    {/* Page one. */}
    <rect
      x="4"
      y="5"
      width="28"
      height="30"
      fill="rgb(var(--surface-raised))"
      stroke="currentColor"
      strokeWidth="2"
    />

    {/* The nameplate, with its double rule under it. */}
    <rect x="7.5" y="8.5" width="21" height="5.5" fill="currentColor" />
    <rect x="7.5" y="15.5" width="21" height="1.4" fill="currentColor" fillOpacity="0.75" />
    <rect x="7.5" y="17.8" width="21" height="0.8" fill="currentColor" fillOpacity="0.45" />

    {/* The lead photograph, and the spot plate on it. */}
    <rect x="7.5" y="20.5" width="9" height="8" fill="currentColor" fillOpacity="0.8" />
    <rect x="7.5" y="20.5" width="9" height="1.6" fill="rgb(var(--brand))" />

    {/* Two columns of story. */}
    <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7">
      <path d="M19 22h9.5" />
      <path d="M19 25h9.5" />
      <path d="M19 28h9.5" />
      <path d="M7.5 31.5h21" />
    </g>
  </svg>
);
