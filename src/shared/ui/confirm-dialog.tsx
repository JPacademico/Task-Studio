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
 * "Are you sure?", in the app's own clothes. The browser's dialog is the one piece of UI this
 * product cannot dress: it is drawn by the operating system in the operating system's font.
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
