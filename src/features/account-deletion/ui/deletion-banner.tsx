import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

import { useSessionStore } from '@/features/auth/model/session.store';
import { useT } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { CompactCountdown } from './deletion-countdown';
import { useCancelDeletion } from './delete-account-panel';

/** Across the top of every app page while a deletion is pending: the account still works. */
export const DeletionBanner = () => {
  const t = useT();
  const dueAt = useSessionStore((state) => state.user?.deletionDueAt);
  const cancel = useCancelDeletion();

  if (!dueAt) return null;

  return (
    <div
      role="status"
      className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-danger/40 bg-danger/5 px-4 py-2.5 text-xs text-content"
    >
      <AlertTriangle className="h-4 w-4 shrink-0 text-danger" aria-hidden />
      <span className="font-medium">{t('deletion.bannerLead')}</span>
      <CompactCountdown dueAt={dueAt} />
      <span className="ml-auto flex items-center gap-2">
        <Link to="/settings" className="text-content-muted underline underline-offset-2 hover:text-content">
          {t('deletion.bannerDetails')}
        </Link>
        <Button size="sm" onClick={() => cancel.mutate()} isLoading={cancel.isPending}>
          {t('deletion.keep')}
        </Button>
      </span>
    </div>
  );
};
