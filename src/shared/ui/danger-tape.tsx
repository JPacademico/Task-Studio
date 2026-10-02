import { motion, useReducedMotion } from 'framer-motion';

/** Fixed tilts, not random ones: an approved layout should be the same layout on the next load. */
const BANDS = [
  { top: '18%', rotate: -7, delay: 0 },
  { top: '74%', rotate: 5, delay: 0.12 },
];

interface DangerTapeProps {
  /** How loud the stripes are. Faint on a page, louder over a dialog's dark backdrop. */
  opacity?: number;
}

/**
 * Hazard tape across whatever positioned box it sits in. Two bands, running off both edges; the
 * stripes are the warning token, so the tape belongs to whichever skin is active.
 */
export const DangerTape = ({ opacity = 0.16 }: DangerTapeProps) => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      // The bands fade themselves in; the layer only fades on the way out.
      initial={false}
      animate={{ opacity }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.16 }}
    >
      {BANDS.map((band, index) => (
        <motion.div
          key={index}
          initial={reduceMotion ? false : { opacity: 0, x: index % 2 ? 60 : -60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: band.delay, ease: [0.16, 1, 0.3, 1] }}
          className="absolute left-[-10%] h-[3.25rem] w-[120%]"
          style={{
            top: band.top,
            rotate: `${band.rotate}deg`,
            backgroundImage:
              'repeating-linear-gradient(45deg, rgb(var(--warning)) 0 1.25rem, transparent 1.25rem 2.5rem)',
          }}
        />
      ))}
    </motion.div>
  );
};
