import { useId, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import { cn } from '@/shared/lib/cn';

interface HoverHintProps {
  /** What the reader points at. Usually one small icon. */
  children: ReactNode;
  /** The sentence that appears. Kept short — this is an aside, not a panel. */
  hint: string;
  /** Accessible name for the trigger, since the trigger is usually a glyph. */
  label: string;
  /** Which side of the trigger the bubble opens on. */
  side?: 'top' | 'bottom';
  className?: string;
}

/**
 * A sentence that is *available* rather than *present*. Some facts belong on screen permanently and
 * some belong one gesture away, and the difference is whether a reader has to act on it every time.
 */
export const HoverHint = ({
  children,
  hint,
  label,
  side = 'top',
  className,
}: HoverHintProps) => {
  const id = useId();
  const [isOpen, setIsOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <span className={cn('relative inline-flex', className)}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={isOpen ? id : undefined}
        aria-expanded={isOpen}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setIsOpen(false);
        }}
        className={cn(
          'grid h-7 w-7 place-items-center rounded-lg border border-edge text-content-faint',
          'transition-colors duration-150',
          'hover:border-brand/50 hover:text-brand',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
          isOpen && 'border-brand/50 text-brand',
        )}
      >
        {children}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.span
            id={id}
            role="tooltip"
            initial={{ opacity: 0, y: side === 'top' ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: side === 'top' ? 4 : -4 }}
            transition={{ duration: reduceMotion ? 0 : 0.14, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              /* Centred on the trigger and pulled back by half its own width. A bubble anchored to
                 one edge drifts off the dialog as soon as the trigger is near a corner. */
              'panel pointer-events-none absolute left-1/2 z-50 w-64 max-w-[min(16rem,80vw)]',
              '-translate-x-1/2 px-3 py-2 text-2xs leading-relaxed text-content-muted shadow-lg',
              side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
            )}
          >
            {hint}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
};
