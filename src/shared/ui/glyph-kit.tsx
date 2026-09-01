/**
 * The list of destinations the navigation has icons for.
 *
 * ## What used to be here
 *
 * A frame component and a `GlyphSet` type, because eight skins each brought a
 * complete hand-drawn navigation set and needed a shared 24×24 box to draw one
 * in. Every one of those sets has been withdrawn — see `NavGlyph` for the
 * reasoning, which is that an icon is recognised by shape and a rail whose
 * shapes change with the theme charges every user that recognition again.
 *
 * What survives is the part that was never about drawing: the *names* of the
 * places a menu entry can point at. It is still worth its own file rather than
 * being folded into `NavGlyph`, because the shortcuts store persists these
 * strings — a pinned shortcut in somebody's `localStorage` holds one — and a
 * type that outlives storage belongs somewhere neither the rail nor the store
 * owns.
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
