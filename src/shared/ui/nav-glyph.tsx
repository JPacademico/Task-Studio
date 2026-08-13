import type { LucideIcon } from 'lucide-react';

import { useSkin } from '@/app/providers/theme-provider';
import type { ThemeSkin } from '@/entities/user/model/types';
import { ELDRITCH_GLYPHS } from './eldritch-icons';
import type { GlyphSet, NavGlyphKey } from './glyph-kit';
import { HAZARD_GLYPHS } from './hazard-icons';
import { NEWSPAPER_GLYPHS } from './newspaper-icons';
import { SPACE_GLYPHS } from './space-icons';

/**
 * Which skins redraw the navigation rather than restyle it.
 *
 * A skin that only recolours its icons is a skin you stop noticing, so the
 * four worlds with a strong enough visual language to have their own signage
 * bring a full set. Everything else keeps the line icons, which is a choice
 * rather than an omission: the studio look *is* line icons, and a bespoke set
 * for the illustrated skin would only be the same shapes with fatter strokes —
 * which `--icon-stroke` already does for free.
 */
const GLYPH_SETS: Partial<Record<ThemeSkin, GlyphSet>> = {
  SPACE: SPACE_GLYPHS,
  HAZARD: HAZARD_GLYPHS,
  NEWSPAPER: NEWSPAPER_GLYPHS,
  ELDRITCH: ELDRITCH_GLYPHS,
};

interface NavGlyphProps {
  /** Which destination this is — the same key a pinned shortcut stores. */
  glyph: NavGlyphKey;
  /** Drawn by every skin that does not bring its own set. */
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
  const set = GLYPH_SETS[useSkin()];
  if (!set) return <Fallback className={className} />;

  const Drawn = set[glyph];
  return <Drawn className={className} />;
};
