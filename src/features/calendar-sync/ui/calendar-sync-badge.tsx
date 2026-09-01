import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';

import { useCalendarStatus } from '@/entities/integration/model/queries';
import { cn } from '@/shared/lib/cn';
import { useT } from '@/shared/i18n';
import { GoogleCalendarMark } from '@/shared/ui';

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
 * So the state is here and the controls are one click away. It is a link
 * rather than a toggle for exactly that reason: connecting is an OAuth consent
 * flow, which is not something a chip on a calendar tab should start.
 *
 * ## Why the two states are different sizes, and why only one is a control
 *
 * They are doing different jobs, and the first version got this wrong by
 * drawing both as the same 10px chip. **Unconnected is an offer** — it has to
 * compete for attention with a "New meeting" button beside it, and a whisper
 * next to a solid button reads as decoration. **Connected is a status** — the
 * job is done, nothing is being asked, and a control that keeps shouting after
 * you have used it is the thing people learn to ignore.
 *
 * So the offer is button-sized with a brand mark on it, and the confirmation
 * shrinks back to a quiet tick once it has been accepted.
 *
 * The confirmation is also *inert*: it says "Synced" and does nothing when
 * pressed. It used to be a link to settings, which made the one control on
 * this row that looked finished behave like the one that was not — and the
 * only thing on the other end was a switch nobody arrived wanting. Turning the
 * sync off is a settings decision made in settings; this is the answer to "is
 * it on", and an answer should not navigate.
 *
 * ## Why the offer says "sync" rather than "add"
 *
 * Because "add to Google Calendar" describes a one-way export, and this is not
 * one. A meeting created here appears there; a meeting *moved* there moves
 * here, for anybody who may edit it. Somebody who accepted an "add" and later
 * found their board had changed under them would be right to feel misled about
 * what they agreed to.
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

  /*
   * Connected: a quiet confirmation.
   *
   * Deliberately the smaller of the two. It carries the mark so the *account*
   * is still identifiable at a glance — somebody with a work and a personal
   * Google needs to know which one is mirroring — and nothing else.
   */
  if (live) {
    return (
      <span
        title={t('calendar.badgeOnHint')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium',
          'border-positive/40 bg-positive/[0.08] text-positive',
        )}
      >
        <GoogleCalendarMark className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden sm:inline">{t('calendar.badgeOn')}</span>
        <Check aria-hidden className="h-3 w-3 shrink-0" />
      </span>
    );
  }

  /*
   * Unconnected: an offer, sized to be seen.
   *
   * Height matched to the `sm` button it sits beside so the toolbar reads as
   * one row of controls rather than a button with a sticker next to it. The
   * label collapses on a phone — where the toolbar is already wrapping — but
   * the mark never does, because the mark is the part that says what this is.
   */
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
