import type { LucideIcon } from 'lucide-react';

import { useSkin } from '@/app/providers/theme-provider';
import { GazeArrow } from './eldritch-decor';
import { RuneArrow } from './runic-icons';

interface DirectionArrowProps {
  direction: 'left' | 'right';
  /** Drawn by every skin that does not redraw the idea of "that way". */
  fallback: LucideIcon;
  className?: string;
}

/**
 * "Previous" and "next", in whatever the active skin points with.
 *
 * The dispatch lives here rather than in either skin's own file, for the same
 * reason `NavGlyph` exists: two worlds now redraw this glyph and a third will,
 * and the alternative is every call site knowing which skins have opinions
 * about arrows.
 *
 * Most skins keep the chevron, deliberately. An arrow is a sign, and only a
 * world with something better than a sign should replace it — the eldritch one
 * has no signs, only things that notice you, and the runic one cuts its
 * directions into the rock. A bespoke arrow for the illustrated skin would be
 * the same chevron with a fatter stroke, which `--icon-stroke` already does.
 */
export const DirectionArrow = ({ direction, fallback: Fallback, className }: DirectionArrowProps) => {
  const skin = useSkin();

  if (skin === 'ELDRITCH') {
    return <GazeArrow direction={direction} fallback={Fallback} className={className} />;
  }

  if (skin === 'RUNIC') return <RuneArrow direction={direction} className={className} />;

  return <Fallback className={className} />;
};
