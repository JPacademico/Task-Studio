import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { useEscapeKey } from '@/shared/lib/hooks';
import { Button } from './button';
import { translate } from '@/shared/i18n';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  /**
   * Drops the skin's surface pattern for this dialog, keeping everything else.
   *
   * For the dense forms — the task composer above all — where the material
   * stops reading as atmosphere and starts reading as interference behind a
   * grid of small labels, dates and swatches. See `.ui-modal--flat`.
   */
  flat?: boolean;
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
  flat = false,
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
              // `ui-modal` carries no styles of its own — it is a hook so a skin
              // can treat a dialog differently from the cards behind it. A
              // dialog is dense, temporary and read at close range, which is
              // where a heavy material stops being atmosphere and starts being
              // interference; see the underwater and volcano rules in
              // `index.css`.
              // `dvh`, not `vh`: as a bottom sheet on a phone, 92vh is measured
              // against the viewport *without* the address bar, so the sheet
              // ran under it and the footer buttons were the part that went.
              'ui-modal panel relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden',
              flat && 'ui-modal--flat',
              'rounded-b-none sm:max-w-lg sm:rounded-3xl',
              // Clears the home indicator when the sheet is flush to the bottom.
              'safe-b sm:pb-0',
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
                <Button variant="ghost" size="icon" onClick={onClose} aria-label={translate('common.close')}>
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
