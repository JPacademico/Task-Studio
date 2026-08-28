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
 * A project's planned window, as one line.
 *
 * ## Why a chip and not two fields
 *
 * The two dates are one fact — "this runs from here to here" — and splitting
 * them into a labelled pair on a header would take three lines to say what a
 * dash says in one. The header is already carrying a name, a description, an
 * organization and a roster.
 *
 * ## Why the finish date is the one that changes colour
 *
 * Because it is the one with consequences. The start date constrains nothing —
 * a project can take work before it — and a countdown to it would be a
 * countdown to nothing happening. The finish date is a ceiling on every task
 * in the project, so "a week left" is a fact somebody should notice without
 * doing arithmetic against today's date.
 *
 * A project that is already **past** its finish date is drawn in the warning
 * tone rather than the danger one, and that is a deliberate reading of what
 * overrunning means: it is not a failure, it is a plan that needs revising.
 * The app has no opinion about whether that is bad, and colouring it red
 * would be one.
 *
 * Renders nothing when there is no window at all, which is most projects.
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

  /*
   * A finished project's window is a record, not a deadline.
   *
   * Without this, every concluded project would wear an "overrun" badge
   * forever — which is both wrong and unkind, since finishing is precisely the
   * thing that stops the deadline mattering.
   */
  const overrun = !isFinished && remaining !== null && remaining < 0;
  const closing = !isFinished && !overrun && remaining !== null && remaining <= CLOSING_SOON_MS;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px]',
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

      {/* The number, only where it says something a date does not. Days left
          is what a reader would otherwise work out by hand; "runs until March"
          on a project with three months to go is not urgent and does not need
          arithmetic attached to it. */}
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
