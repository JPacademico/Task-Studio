import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Flag } from 'lucide-react';
import { toast } from 'sonner';

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

/**
 * Telling whoever runs this deployment about somebody.
 *
 * ## What this dialog has to be honest about
 *
 * Three things, and all three are in the body copy rather than in a tooltip,
 * because getting any of them wrong changes whether somebody files at all:
 *
 *   - **Where it goes.** To the operators of this deployment — not to the
 *     project's owner, not to a moderation queue somebody imagines is staffed.
 *   - **That it is not anonymous to them.** An administrator sees who filed
 *     it, because five reports from one address book and five from five people
 *     are different situations and no aggregate can tell them apart.
 *   - **That the person reported is never told.** This is the fear that stops
 *     people reporting a colleague, and leaving it unsaid does not make it less
 *     of a fear — it makes it a guess.
 *
 * ## Why the reason is required and long
 *
 * A report with no reason is a click, and a console full of clicks is a console
 * nobody reads. The floor is ten characters — enough to stop an empty submit,
 * short enough that "he keeps deleting my tasks" clears it — and the ceiling is
 * a thousand, because the useful reports are the ones with a story in them.
 */
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
          {/*
            The floor is stated only once somebody has started writing.

            Showing "say a little more" against an empty field is telling
            somebody off before they have done anything; showing it against
            four characters is the field explaining why the button is still
            disabled, which is the moment it is useful.
          */}
          {reason.trim().length > 0 && !isLongEnough && (
            <p className="text-[10px] text-content-faint">{t('report.tooShort')}</p>
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
