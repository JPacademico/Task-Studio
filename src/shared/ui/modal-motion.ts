import type { MotionProps } from 'framer-motion';

/**
 * How a dialog arrives and leaves. A tween beats a spring here: it ends in a fixed, short time
 * instead of settling. The kaiju ridge plays the same so the two move as one.
 */
export const modalMotion = (reduceMotion: boolean | null): MotionProps => ({
  initial: { opacity: 0, y: 16, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 12, scale: 0.985 },
  transition: reduceMotion ? { duration: 0 } : { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
});
