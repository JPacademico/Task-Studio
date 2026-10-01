import { CalendarRange, Clock } from 'lucide-react';

import { formatDeadlineDate } from '@/shared/lib/dates';
import { cn } from '@/shared/lib/cn';
import { useT } from '@/shared/i18n';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Inside a week of the finish date, with the project still open. */
const CLOSING_SOON_MS = 7 * DAY_MS;

interface ProjectWindowChipProps {
  startsAt: string | null;
  endsAt: string | null;
  /** A finished project's window is history — it stops being a countdown. */
  isFinished?: boolean;
  className?: string;
}

/**
 * A project's planned window, as one line. The two dates are one fact — "this runs from here to
 * here".
 */
export const ProjectWindowChip = ({
  startsAt,
  endsAt,
  isFinished = false,
  className,
}: ProjectWindowChipProps) => {
  const t = useT();

  if (!startsAt && !endsAt) return null;

  const remaining = endsAt ? new Date(endsAt).getTime() - Date.now() : null;

  // A finished project's window is a record, not a deadline. Without this, every concluded project
  // would wear an "overrun" badge forever — which is both wrong and unkind.
  const overrun = !isFinished && remaining !== null && remaining < 0;
  const closing = !isFinished && !overrun && remaining !== null && remaining <= CLOSING_SOON_MS;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-3xs',
        overrun
          ? 'border-warning/40 bg-warning/[0.08] text-warning'
          : closing
            ? 'border-brand/40 bg-brand/[0.07] text-brand'
            : 'border-edge text-content-faint',
        className,
      )}
      title={t('project.window')}
    >
      {closing || overrun ? (
        <Clock aria-hidden className="h-2.5 w-2.5 shrink-0" />
      ) : (
        <CalendarRange aria-hidden className="h-2.5 w-2.5 shrink-0" />
      )}

      <span className="tabular-nums">
        {startsAt && endsAt
          ? t('project.windowRange', {
              from: formatDeadlineDate(startsAt),
              to: formatDeadlineDate(endsAt),
            })
          : startsAt
            ? t('project.windowFrom', { from: formatDeadlineDate(startsAt) })
            : t('project.windowUntil', { to: formatDeadlineDate(endsAt as string) })}
      </span>

      {/* The number, only where it says something a date does not. Days left is what a reader
          would otherwise work out by hand. */}
      {overrun && <span>· {t('project.windowOverrun')}</span>}
      {closing && (
        <span>
          ·{' '}
          {t('project.windowDaysLeft', {
            count: String(Math.max(0, Math.ceil((remaining as number) / DAY_MS))),
          })}
        </span>
      )}
    </span>
  );
};
