import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { BatSwarm } from './bat-swarm';
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
   * How the header reads.
   *
   * `start` (the default) is the working shape: a title on the left, a close
   * button on the right, tight enough that the form under it starts near the
   * top. It is right for the dozens of dialogs that are a task somebody is in
   * the middle of.
   *
   * `center` is for the handful that are an *arrival* rather than a step — the
   * service connection dialogs, where the reader has just pressed a mark and
   * the first question is "what am I connecting to". A mark above a centred
   * title answers that before a word is read, and the close button moves into
   * the corner so the title has the full width to be centred in.
   */
  align?: 'start' | 'center';
  /**
   * A mark to sit above the title. Only drawn by the centred header.
   *
   * Deliberately a node rather than a name: the service marks are SVGs with
   * their own colours (see `service-marks.tsx`), and a dialog should not hold
   * a table mapping strings to them.
   */
  icon?: ReactNode;
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
  align = 'start',
  icon,
}: ModalProps) => {
  const reduceMotion = useReducedMotion();
  const [isMounted, setIsMounted] = useState(isOpen);
  /*
   * Handed to `BatSwarm`, which draws itself over this box from outside it.
   *
   * The swarm used to be a child, and could not be one: the panel is
   * `overflow-hidden`, so every bat was clipped at the border it was supposed
   * to be leaving. See the note in `bat-swarm`.
   */
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

          <motion.div
            ref={panelRef}
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
              <header
                className={cn(
                  'relative border-b border-edge px-4 py-3.5 sm:px-5 sm:py-4',
                  align === 'center'
                    ? 'flex flex-col items-center gap-2.5 pt-5 text-center sm:pt-6'
                    : 'flex items-start justify-between gap-4',
                )}
              >
                {/*
                  The mark, at a size that is recognisable rather than decorative.

                  A 44px chip is the same treatment the Connections shelf gives
                  a service, so pressing a card there and landing here is
                  visibly the same object twice — which is most of what makes a
                  dialog feel like it belongs to the thing that opened it.
                */}
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

                {/*
                  `min-w-0` and `break-words`, because the title is user text.

                  A flex child refuses to shrink below its content's intrinsic
                  width by default, and an unbroken 140-character string — a
                  pasted URL, a base64 blob — has no break opportunity in it at
                  all. Without both of these the header grew past the dialog,
                  pushed the close button off the edge, and took the rounded
                  corner with it. The clamp bounds the other direction: a title
                  full of newlines is not allowed to become the whole sheet.
                */}
                <div
                  className={cn(
                    'min-w-0 space-y-1',
                    // Room for the corner button, so a long centred title is
                    // centred against the dialog rather than against whatever
                    // space the button left over.
                    align === 'center' && 'w-full px-8',
                  )}
                >
                  {title && (
                    <h2
                      className={cn(
                        // `ui-modal-title` carries no styles of its own — it is
                        // a hook, like `ui-task-title` and `ui-section-title`,
                        // for the one skin whose display face cannot be read at
                        // this size. See the foot of `index.css`.
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

          {/*
            Bats off the edges of the dialog, and nothing at all on the other
            thirteen skins — see `BatSwarm`.

            A sibling of the panel rather than a child of it, which is the
            entire reason the effect works now: the panel is `overflow-hidden`,
            so anything launched from inside it was clipped at exactly the
            border it was meant to be crossing.
          */}
          <BatSwarm anchor={panelRef} />
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
