import { Link } from 'react-router-dom';
import { CalendarCheck2, CalendarPlus } from 'lucide-react';

import { useCalendarStatus } from '@/entities/integration/model/queries';
import { cn } from '@/shared/lib/cn';
import { useT } from '@/shared/i18n';

/**
 * Whether this reader's meetings are reaching their own calendar, said on the
 * tab where the meetings are.
 *
 * ## Why a badge here and the controls in settings
 *
 * The connection is a fact about the *account* — one person connects once and
 * every project they are on is covered — so the switches belong with the other
 * account settings. But the place somebody wonders about it is here, looking at
 * a meeting and asking "is this in my calendar?", and sending them to a
 * settings page to find out is the wrong shape of answer.
 *
 * So the state is here and the controls are one click away. The badge is a
 * link rather than a toggle for exactly that reason: connecting is an OAuth
 * consent flow, which is not something a chip on a calendar tab should start.
 *
 * ## Why it says nothing when the deployment has no calendar
 *
 * A Task Studio with no Google credentials configured has no calendar feature,
 * and advertising one that cannot be turned on is worse than silence. The
 * offer only appears where it can be accepted.
 */
export const CalendarSyncBadge = () => {
  const t = useT();
  const { data } = useCalendarStatus();

  if (!data?.available) return null;

  const connection = data.connection;
  const live = Boolean(connection?.isEnabled);

  return (
    <Link
      to="/settings"
      title={t(live ? 'calendar.badgeOnHint' : 'calendar.badgeOffHint')}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] transition-colors',
        live
          ? 'border-positive/40 bg-positive/[0.08] text-positive'
          : 'border-edge text-content-faint hover:border-brand hover:text-brand',
      )}
    >
      {live ? (
        <CalendarCheck2 className="h-2.5 w-2.5" />
      ) : (
        <CalendarPlus className="h-2.5 w-2.5" />
      )}
      {t(live ? 'calendar.badgeOn' : 'calendar.badgeOff')}
    </Link>
  );
};
