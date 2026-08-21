import type { LucideIcon } from 'lucide-react';

import { useSkin } from '@/app/providers/theme-provider';
import type { ThemeSkin } from '@/entities/user/model/types';
import { AUTUMN_GLYPHS } from './autumn-icons';
import { ELDRITCH_GLYPHS } from './eldritch-icons';
import type { GlyphSet, NavGlyphKey } from './glyph-kit';
import { HAZARD_GLYPHS } from './hazard-icons';
import { NEWSPAPER_GLYPHS } from './newspaper-icons';
import { RUNIC_GLYPHS } from './runic-icons';
import { SPACE_GLYPHS } from './space-icons';
import { UNDERWATER_GLYPHS } from './underwater-icons';
import { VOLCANO_GLYPHS } from './volcano-icons';

/**
 * Which skins redraw the navigation rather than restyle it.
 *
 * A skin that only recolours its icons is a skin you stop noticing, so the
 * worlds with a strong enough visual language to have their own signage bring a
 * full set. Everything else keeps the line icons, which is a choice rather than
 * an omission: the studio look *is* line icons, and a bespoke set for the
 * illustrated skin would only be the same shapes with fatter strokes — which
 * `--icon-stroke` already does for free.
 */
const GLYPH_SETS: Partial<Record<ThemeSkin, GlyphSet>> = {
  SPACE: SPACE_GLYPHS,
  HAZARD: HAZARD_GLYPHS,
  NEWSPAPER: NEWSPAPER_GLYPHS,
  ELDRITCH: ELDRITCH_GLYPHS,
  AUTUMN: AUTUMN_GLYPHS,
  RUNIC: RUNIC_GLYPHS,
  UNDERWATER: UNDERWATER_GLYPHS,
  VOLCANO: VOLCANO_GLYPHS,
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
  // Two ways to end up with the line icon, and both are fine: the skin brings
  // no set at all, or it brings one that has nothing for this destination yet.
  // See `GlyphSet`.
  const Drawn = GLYPH_SETS[useSkin()]?.[glyph];

  return Drawn ? <Drawn className={className} /> : <Fallback className={className} />;
};
