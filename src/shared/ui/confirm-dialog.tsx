import type { ReactNode } from 'react';
import { Trash2 } from 'lucide-react';

import { useT } from '@/shared/i18n';
import { Button } from './button';
import { Modal } from './modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  /** What will happen, in a sentence. Read before the buttons are. */
  description?: string;
  confirmLabel: string;
  isLoading?: boolean;
  /** For a dialog that needs something typed first — a password, a name. */
  isConfirmDisabled?: boolean;
  /** Anything that belongs between the sentence and the buttons. */
  children?: ReactNode;
}

/**
 * "Are you sure?", in the app's own clothes.
 *
 * ## Why not `window.confirm`
 *
 * The browser's dialog is the one piece of UI this product cannot dress: it is
 * drawn by the operating system in the operating system's font, it cannot say
 * *what* is about to be destroyed in anything but a line of plain text, it
 * freezes every animation and timer on the page while it is open, and on some
 * browsers it offers to stop the site showing dialogs at all — after which the
 * delete button silently does nothing. A permanent deletion deserves a moment
 * that looks like the rest of the product and states its consequence plainly.
 *
 * ## Why it is built on `Modal`
 *
 * So every skin already knows how to draw it: `Modal` carries the `ui-modal`
 * hook the skins style, the escape key, the backdrop and the exit animation.
 * This only decides the shape of a confirmation — a centred danger mark, the
 * sentence, and two buttons with the destructive one last, where the eye ends
 * up and the hand has to travel to.
 */
export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  isLoading = false,
  isConfirmDisabled = false,
  children,
}: ConfirmDialogProps) => {
  const t = useT();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      align="center"
      flat
      icon={
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-danger/12 text-danger">
          <Trash2 className="h-5 w-5" />
        </span>
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            isLoading={isLoading}
            disabled={isConfirmDisabled}
            // Deliberately not auto-focused: this is a permanent deletion, and
            // a stray Enter should not be what performs it.
          >
            <Trash2 className="h-3.5 w-3.5" />
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children ?? null}
    </Modal>
  );
};
