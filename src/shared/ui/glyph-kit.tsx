/**
 * The list of destinations the navigation has icons for. A frame component and a `GlyphSet` type.
 */

/** Matches `ShortcutIcon` in the shortcuts store, which is where the keys come from. */
export type NavGlyphKey =
  | 'dashboard'
  | 'tasks'
  | 'notes'
  | 'meetings'
  | 'organizations'
  | 'invitations'
  | 'recycle'
  | 'settings'
  | 'themes'
  | 'project';

/** The one prop every skin mark takes. */
export type GlyphProps = { className?: string };
