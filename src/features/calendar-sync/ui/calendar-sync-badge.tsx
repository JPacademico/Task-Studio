import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';

import { useCalendarStatus } from '@/entities/integration/model/queries';
import { cn } from '@/shared/lib/cn';
import { useT } from '@/shared/i18n';
import { GoogleCalendarMark } from '@/shared/ui';

/**
 * Whether this reader's meetings are reaching their own calendar, said on the tab where the
 * meetings are.
 */
export const CalendarSyncBadge = () => {
  const t = useT();
  const { data } = useCalendarStatus();

  if (!data?.available) return null;

  const connection = data.connection;
  const live = Boolean(connection?.isEnabled);

  // Connected: a quiet confirmation. Deliberately the smaller of the two. It carries the mark so
  // the *account* is still identifiable at a glance.
  if (live) {
    return (
      <span
        title={t('calendar.badgeOnHint')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-2xs font-medium',
          'border-positive/40 bg-positive/[0.08] text-positive',
        )}
      >
        <GoogleCalendarMark className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden sm:inline">{t('calendar.badgeOn')}</span>
        <Check aria-hidden className="h-3 w-3 shrink-0" />
      </span>
    );
  }

  // Unconnected: an offer, sized to be seen. Height matched to the `sm` button it sits beside so
  // the toolbar reads as one row of controls rather than a button with a sticker next to it.
  return (
    <Link
      to="/settings"
      title={t('calendar.badgeOffHint')}
      className={cn(
        'inline-flex h-8 items-center gap-2 rounded-xl border px-2.5 text-xs font-medium',
        'border-edge bg-surface-raised text-content',
        'transition-colors hover:border-brand hover:text-brand',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
      )}
    >
      <GoogleCalendarMark className="h-4 w-4 shrink-0" />
      <span className="whitespace-nowrap">{t('calendar.badgeOff')}</span>
    </Link>
  );
};
