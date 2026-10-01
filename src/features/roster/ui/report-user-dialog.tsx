import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Flag } from 'lucide-react';
import { toast } from '@/shared/lib/toast';

import { userApi } from '@/entities/user/api/user.api';
import { errorMessage } from '@/shared/api/client';
import { Button, Modal, Textarea } from '@/shared/ui';
import { useT } from '@/shared/i18n';

/** The API's own floor, mirrored so the button can say no before the request does. */
const MIN_REASON = 10;
const MAX_REASON = 1_000;

interface ReportUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  subject: { id: string; displayName: string };
  /** Where the reporter was when they filed it. Context, not scope. */
  projectId?: string;
  /** Called once it has been sent, so the row can redraw as reported. */
  onReported: () => void;
}

/** Telling whoever runs this deployment about somebody. */
export const ReportUserDialog = ({
  isOpen,
  onClose,
  subject,
  projectId,
  onReported,
}: ReportUserDialogProps) => {
  const t = useT();
  const [reason, setReason] = useState('');

  const report = useMutation({
    mutationFn: () =>
      userApi.report(subject.id, {
        reason: reason.trim(),
        ...(projectId ? { projectId } : {}),
      }),
    onSuccess: () => {
      toast.success(t('report.sent'));
      setReason('');
      onReported();
      onClose();
    },
    onError: (error) => toast.error(errorMessage(error, t('report.failed'))),
  });

  const isLongEnough = reason.trim().length >= MIN_REASON;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('report.title', { name: subject.displayName })}
      className="max-w-md"
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (isLongEnough) report.mutate();
        }}
      >
        <p className="text-xs leading-relaxed text-content-muted">
          {t('report.body', { name: subject.displayName })}
        </p>

        <div className="space-y-1">
          <Textarea
            autoFocus
            label={t('report.reasonLabel')}
            name="reason"
            rows={4}
            value={reason}
            onChange={(event) => setReason(event.target.value.slice(0, MAX_REASON))}
            placeholder={t('report.placeholder')}
            maxLength={MAX_REASON}
          />
          {/* The floor is stated only once somebody has started writing. */}
          {reason.trim().length > 0 && !isLongEnough && (
            <p className="text-3xs text-content-faint">{t('report.tooShort')}</p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            variant="danger"
            isLoading={report.isPending}
            disabled={!isLongEnough}
          >
            <Flag className="h-3.5 w-3.5" />
            {t('report.submit')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
