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
 * "Previous" and "next", in whatever the active skin points with. The dispatch lives here rather
 * than in either skin's own file, for the same reason `NavGlyph` exists.
 */
export const DirectionArrow = ({ direction, fallback: Fallback, className }: DirectionArrowProps) => {
  const skin = useSkin();

  if (skin === 'ELDRITCH') {
    return <GazeArrow direction={direction} fallback={Fallback} className={className} />;
  }

  if (skin === 'RUNIC') return <RuneArrow direction={direction} className={className} />;

  return <Fallback className={className} />;
};
