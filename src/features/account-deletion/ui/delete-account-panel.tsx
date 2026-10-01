import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, RotateCcw, Trash2 } from 'lucide-react';

import { userApi } from '@/entities/user/api/user.api';
import { useSessionStore } from '@/features/auth/model/session.store';
import { errorMessage } from '@/shared/api/client';
import { TEXT_LIMITS } from '@/shared/config/constants';
import { useT } from '@/shared/i18n';
import { toast } from '@/shared/lib/toast';
import { Button, Input, Modal, PasswordInput } from '@/shared/ui';
import { DeletionCountdown } from './deletion-countdown';

/** Keeps the account. Shared by the settings panel and the banner across the app. */
export const useCancelDeletion = () => {
  const t = useT();
  const setUser = useSessionStore((state) => state.setUser);

  return useMutation({
    mutationFn: userApi.cancelDeletion,
    onSuccess: (updated) => {
      setUser(updated);
      toast.success(t('deletion.kept'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
};

/** Settings → Delete account: the request, and while it is pending, the clock and the way back. */
export const DeleteAccountPanel = () => {
  const t = useT();
  const { user, setUser } = useSessionStore();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const cancel = useCancelDeletion();

  const needsPassword = user?.hasPassword !== false;
  const emailMatches = confirmEmail.trim().toLowerCase() === user?.email.toLowerCase();
  const canSubmit = emailMatches && (!needsPassword || password.length > 0);

  const schedule = useMutation({
    mutationFn: () =>
      userApi.scheduleDeletion({ confirmEmail, password: needsPassword ? password : undefined }),
    onSuccess: (updated) => {
      setUser(updated);
      setIsOpen(false);
      setConfirmEmail('');
      setPassword('');
      toast(t('deletion.scheduled'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (!user) return null;

  if (user.deletionDueAt) {
    return (
      <div className="space-y-4 rounded-2xl border border-danger/40 bg-danger/5 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-content">{t('deletion.pendingTitle')}</p>
            <p className="text-xs leading-relaxed text-content-muted">{t('deletion.pendingBody')}</p>
          </div>
        </div>
        <DeletionCountdown dueAt={user.deletionDueAt} />
        <div className="flex justify-end">
          <Button onClick={() => cancel.mutate()} isLoading={cancel.isPending}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            {t('deletion.keep')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 rounded-2xl border border-danger/30 bg-surface-raised p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-content-muted sm:max-w-md">{t('deletion.intro')}</p>
        <Button variant="danger" className="shrink-0" onClick={() => setIsOpen(true)}>
          <Trash2 className="h-4 w-4" aria-hidden />
          {t('deletion.open')}
        </Button>
      </div>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={t('deletion.dialogTitle')}
        icon={<Trash2 className="h-4 w-4 text-danger" />}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => schedule.mutate()}
              disabled={!canSubmit}
              isLoading={schedule.isPending}
            >
              {t('deletion.confirm')}
            </Button>
          </div>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (canSubmit) schedule.mutate();
          }}
        >
          <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-content-muted marker:text-danger">
            <li>{t('deletion.factWindow')}</li>
            <li>{t('deletion.factContent')}</li>
            <li>{t('deletion.factBilling')}</li>
          </ul>

          <Input
            label={t('deletion.typeEmail', { email: user.email })}
            name="confirmEmail"
            autoComplete="off"
            value={confirmEmail}
            onChange={(event) => setConfirmEmail(event.target.value.slice(0, TEXT_LIMITS.email))}
            placeholder={user.email}
          />
          {needsPassword && (
            <PasswordInput
              label={t('settings.currentPassword')}
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value.slice(0, TEXT_LIMITS.password))}
            />
          )}
          <p className="text-2xs text-content-faint">
            {t('deletion.policyLead')}{' '}
            <Link to="/privacy" target="_blank" className="text-brand underline underline-offset-2">
              {t('legal.privacy')}
            </Link>
            .
          </p>
          {/* Enter submits from either field. */}
          <button type="submit" hidden aria-hidden tabIndex={-1} />
        </form>
      </Modal>
    </>
  );
};
