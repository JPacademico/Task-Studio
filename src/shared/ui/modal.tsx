import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { useEscapeKey } from '@/shared/lib/hooks';
import { Button } from './button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/** Matches the exit transition below, so the portal unmounts once it is done. */
const EXIT_MS = 160;

/**
 * Portal-based dialog.
 *
 * Two things were making these feel slow to open:
 *
 * 1. The portal was mounted for every dialog on the page at all times, so an
 *    unrelated state change re-rendered every closed modal's subtree. It is now
 *    created on demand and torn down once the exit animation finishes.
 * 2. A full-viewport `backdrop-filter` blur has to sample everything behind it
 *    on the first composite, which is the single most expensive thing a dialog
 *    can do on an integrated GPU. The scrim is a plain translucent layer now.
 *
 * Enter/exit still animate transform + opacity only, so opening a dialog never
 * triggers a layout pass on the page behind it.
 */
export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: ModalProps) => {
  const reduceMotion = useReducedMotion();
  const [isMounted, setIsMounted] = useState(isOpen);

  useEscapeKey(onClose, isOpen);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      return;
    }

    const timeout = setTimeout(() => setIsMounted(false), EXIT_MS);
    return () => clearTimeout(timeout);
  }, [isOpen]);

  // Nothing in the tree — and nothing to re-render — while the dialog is shut.
  if (!isMounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.14 }}
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              'panel relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden',
              'rounded-b-none sm:max-w-lg sm:rounded-3xl',
              className,
            )}
            initial={{ opacity: 0, y: 16, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.985 }}
            // A tween beats a spring here: it finishes in a fixed, short time
            // instead of settling, so the dialog is interactive sooner.
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.18, ease: [0.22, 1, 0.36, 1] }
            }
          >
            {(title ?? description) && (
              <header className="flex items-start justify-between gap-4 border-b border-edge px-4 py-3.5 sm:px-5 sm:py-4">
                <div className="space-y-1">
                  {title && <h2 className="text-base font-semibold leading-tight">{title}</h2>}
                  {description && (
                    <p className="text-xs text-content-muted">{description}</p>
                  )}
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
                  <X className="h-4 w-4" />
                </Button>
              </header>
            )}

            <div className="scrollbar-thin flex-1 overflow-y-auto px-4 py-3.5 sm:px-5 sm:py-4">
              {children}
            </div>

            {footer && (
              <footer className="flex items-center justify-end gap-2 border-t border-edge px-4 py-3 sm:px-5 sm:py-3.5">
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
