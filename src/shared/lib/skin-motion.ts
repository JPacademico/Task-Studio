import { useMemo } from 'react';
import type { Transition } from 'framer-motion';

import { useTheme } from '@/app/providers/theme-provider';
import type { ThemeSkin } from '@/entities/user/model/types';

/**
 * How each skin moves.
 *
 * Colour and radius travel through CSS variables, but a curve cannot: Framer
 * Motion owns the transition, so the skins declare theirs here. The difference
 * is the point — the illustrated skin overshoots like something springy, the
 * CRT snaps, the brass machine takes its time, and the arcade redraws in whole
 * frames rather than easing between them.
 */
const REVEAL: Record<ThemeSkin, Transition> = {
  STUDIO: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
  PAPER: { type: 'spring', stiffness: 340, damping: 20, mass: 0.7 },
  TERMINAL: { duration: 0.1, ease: 'linear' },
  VINTAGE: { duration: 0.34, ease: [0.65, 0, 0.35, 1] },
  // Quantised into five frames — the arcade equivalent of an easing curve.
  PIXEL: { duration: 0.2, ease: (progress: number) => Math.ceil(progress * 5) / 5 },
  // Weightless: it coasts in and settles slowly, like something in free fall.
  SPACE: { duration: 0.42, ease: [0.16, 0.84, 0.24, 1] },
  // Servo-driven: it goes when told and stops dead, with no overshoot at all.
  HAZARD: { duration: 0.16, ease: [0.2, 0, 0, 1] },
  // A page turning under its own weight — slow to start, then it falls.
  NEWSPAPER: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  // Nothing here hurries and nothing here overshoots. It arrives when it has
  // decided to, which is the slowest curve in the app by some margin.
  ELDRITCH: { duration: 0.52, ease: [0.5, 0, 0.2, 1] },
  // A leaf coming down: it lets go quickly, then takes a long time to settle,
  // and it settles rather than lands — the tiniest overshoot at the end.
  AUTUMN: { type: 'spring', stiffness: 210, damping: 26, mass: 0.9 },
};

const MARKER: Record<ThemeSkin, Transition> = {
  STUDIO: { type: 'spring', stiffness: 500, damping: 34 },
  PAPER: { type: 'spring', stiffness: 420, damping: 12 },
  TERMINAL: { duration: 0.08, ease: 'linear' },
  VINTAGE: { duration: 0.4, ease: [0.5, 0, 0.2, 1] },
  PIXEL: { duration: 0.16, ease: (progress: number) => Math.ceil(progress * 4) / 4 },
  SPACE: { type: 'spring', stiffness: 180, damping: 20, mass: 1.1 },
  HAZARD: { duration: 0.14, ease: [0.2, 0, 0, 1] },
  NEWSPAPER: { duration: 0.26, ease: [0.4, 0, 0.2, 1] },
  ELDRITCH: { duration: 0.44, ease: [0.5, 0, 0.2, 1] },
  AUTUMN: { type: 'spring', stiffness: 260, damping: 24, mass: 0.8 },
};

/*
 * There is deliberately no `stage` curve here.
 *
 * Taking a board to the full screen and back used to animate on one, which read
 * as lag on a surface the user is arranging by hand — so the swap is now a hard
 * cut. See `ExpandableStage`.
 */

export const useSkinMotion = () => {
  const { skin } = useTheme();

  return useMemo(
    () => ({
      reveal: REVEAL[skin] ?? REVEAL.STUDIO,
      marker: MARKER[skin] ?? MARKER.STUDIO,
    }),
    [skin],
  );
};
