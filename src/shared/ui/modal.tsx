import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { BatSwarm } from './bat-swarm';
import { DangerTape } from './danger-tape';
import { KaijuSpikes } from './kaiju-decor';
import { LanternDrift } from './lantern-drift';
import { modalMotion } from './modal-motion';
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
   * How the header reads. `start` (the default) is the working shape: a title on the left, a close
   * button on the right, tight enough that the form under it starts near the top.
   */
  align?: 'start' | 'center';
  /**
   * A mark to sit above the title. Only drawn by the centred header. Deliberately a node rather
   * than a name: the service marks are SVGs with their own colours (see `service-marks.tsx`).
   */
  icon?: ReactNode;
  /**
   * Drops the skin's surface pattern for this dialog, keeping everything else. For the dense forms
   * — the task composer above all.
   */
  flat?: boolean;
  /** Tapes off the backdrop. For confirmations that destroy something; toggling it animates. */
  danger?: boolean;
}

/** Matches the exit transition below, so the portal unmounts once it is done. */
const EXIT_MS = 160;

/** Portal-based dialog. */
export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  flat = false,
  align = 'start',
  icon,
  danger = false,
}: ModalProps) => {
  const reduceMotion = useReducedMotion();
  const [isMounted, setIsMounted] = useState(isOpen);
  // Handed to the two skin decorations, which draw themselves over this box from outside it. The
  // swarm used to be a child, and could not be one: the panel is `overflow-hidden`.
  const panelRef = useRef<HTMLDivElement>(null);

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

          {/* Over the backdrop, under the panel, and click-through to the backdrop. `propagate`
              lets the tape fade with the dialog instead of vanishing when it closes. */}
          <AnimatePresence propagate>
            {danger && <DangerTape key="tape" opacity={0.5} />}
          </AnimatePresence>

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              // `ui-modal` carries no styles of its own — it is a hook so a skin can treat a dialog
              // differently from the cards behind it.
              'ui-modal panel relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden',
              flat && 'ui-modal--flat',
              'rounded-b-none sm:max-w-lg sm:rounded-3xl',
              // Clears the home indicator when the sheet is flush to the bottom.
              'safe-b sm:pb-0',
              className,
            )}
            {...modalMotion(reduceMotion)}
          >
            {(title ?? description) && (
              <header
                className={cn(
                  'relative border-b border-edge px-4 py-3.5 sm:px-5 sm:py-4',
                  align === 'center'
                    ? 'flex flex-col items-center gap-2.5 pt-5 text-center sm:pt-6'
                    : 'flex items-start justify-between gap-4',
                )}
              >
                {/* The mark, at a size that is recognisable rather than decorative. A 44px chip
                    is the same treatment the Connections shelf gives a service. */}
                {align === 'center' && icon && (
                  <span
                    aria-hidden
                    className={cn(
                      'grid h-11 w-11 shrink-0 place-items-center rounded-2xl',
                      'border border-edge bg-surface-sunken',
                    )}
                  >
                    {icon}
                  </span>
                )}

                {/* `min-w-0` and `break-words`, because the title is user text. A flex child
                    refuses to shrink below its content's intrinsic width by default. */}
                <div
                  className={cn(
                    'min-w-0 space-y-1',
                    // Room for the corner button, so a long centred title is centred against the
                    // dialog rather than against whatever space the button left over.
                    align === 'center' && 'w-full px-8',
                  )}
                >
                  {title && (
                    <h2
                      className={cn(
                        // `ui-modal-title` carries no styles of its own — it is a hook, like
                        // `ui-task-title` and `ui-section-title`.
                        'ui-modal-title line-clamp-2 break-words font-semibold leading-tight',
                        align === 'center' ? 'text-lg tracking-tight' : 'text-base',
                      )}
                    >
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p
                      className={cn(
                        'break-words text-xs text-content-muted',
                        align === 'center'
                          ? 'mx-auto max-w-sm leading-relaxed'
                          : 'line-clamp-2',
                      )}
                    >
                      {description}
                    </p>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  aria-label={translate('common.close')}
                  className={cn(align === 'center' && 'absolute right-2.5 top-2.5')}
                >
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

          {/* Bats off the edges of the dialog on one skin, paper lanterns off them on another,
              dorsal plates round them on a third — see `BatSwarm`, `LanternDrift`, `KaijuSpikes`. */}
          <BatSwarm anchor={panelRef} />
          <LanternDrift anchor={panelRef} />
          <KaijuSpikes anchor={panelRef} />
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
