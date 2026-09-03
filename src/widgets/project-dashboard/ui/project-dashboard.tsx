import { motion } from 'framer-motion';
import { CalendarClock, CheckCircle2, ListTodo, TriangleAlert } from 'lucide-react';

import { useProjectDashboard } from '@/entities/project/model/queries';
import { TASK_TYPE_META } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { formatDayLabel, formatDeadline } from '@/shared/lib/dates';
import { useLocale } from '@/shared/i18n';
import { AvatarStack, Badge, EmptyState, PageLoader, Section } from '@/shared/ui';
import { useT } from '@/shared/i18n';

/** Metrics module for a single project: throughput, people, deadlines. */
export const ProjectDashboard = ({ projectId }: { projectId: string }) => {
  const t = useT();
  const { data, isLoading } = useProjectDashboard(projectId);

  if (isLoading || !data) return <PageLoader label={t('projectDash.crunching')} />;

  const { totals, byType, completionByMonth, upcomingDeadlines } = data;

  const tiles = [
    { label: t('projectDash.totalTasks'), value: totals.tasks, icon: <ListTodo className="h-4 w-4" /> },
    { label: t('dash.completed'), value: totals.completed, icon: <CheckCircle2 className="h-4 w-4" /> },
    {
      label: t('dash.overdue'),
      value: totals.overdue,
      icon: <TriangleAlert className="h-4 w-4" />,
      warn: totals.overdue > 0,
    },
    {
      label: t('projectDash.dueThisWeek'),
      value: totals.dueThisWeek,
      icon: <CalendarClock className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-7">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="flex items-center gap-3 rounded-2xl border border-edge bg-surface-raised px-4 py-3.5"
          >
            <span
              className={cn(
                'grid h-9 w-9 place-items-center rounded-xl',
                tile.warn ? 'bg-warning/15 text-warning' : 'bg-brand/12 text-brand',
              )}
            >
              {tile.icon}
            </span>
            <div className="leading-tight">
              <p className="text-lg font-semibold tabular-nums">{tile.value}</p>
              <p className="text-2xs uppercase tracking-wide text-content-faint">
                {tile.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/*
        One full-width panel where there were two columns.

        The right-hand column was a leaderboard: the roster ranked by tasks
        closed, with a medal on whoever was top. It is gone, and not for space.
        Counting finished tasks per person measures how work was *sliced*, not
        who did it -- somebody who closes twelve one-line fixes outranks
        somebody who shipped the release everything else was waiting on -- so
        the ranking was confidently wrong about the one thing it claimed to
        know. Publishing that to a small team, permanently, on the tab called
        "metrics", is how a board stops being a place people put real work and
        starts being a place people put work that scores. The per-person numbers
        were also the only part of this screen that could make somebody feel
        watched, in exchange for a fact nobody could act on.

        What is left is the project's own throughput, which is the thing a
        project dashboard is for.
      */}
      <Section title={t('projectDash.completion')}>
        <div className="space-y-5 rounded-2xl border border-edge bg-surface-raised p-4">
          <div className="flex items-end justify-between">
            <p className="text-3xl font-semibold tabular-nums">{totals.completionRate}%</p>
            <p className="text-xs text-content-muted">
              {t('projectDash.doneOfTotal', {
                done: String(totals.completed),
                total: String(totals.tasks),
              })}
            </p>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
            <motion.div
              className="h-full rounded-full bg-brand"
              initial={{ width: 0 }}
              animate={{ width: `${totals.completionRate}%` }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>

          <MonthlyCompletion months={completionByMonth} />

          {/*
            The type's *name*, not its key.

            `TASK_TYPE_META[...].label` is a `TranslationKey` -- the tables in
            `shared/config/constants` hold keys precisely so a card, a badge
            and a filter can all render the same word in the reader's own
            language. This one row was printing the key itself, so the
            completion board read "type.MEGA: 0" in every language including
            English. The only thing missing was the `t()` around it.
          */}
          <div className="flex flex-wrap gap-2 border-t border-edge pt-3">
            {Object.entries(byType).map(([type, count]) => (
              <Badge
                key={type}
                className={cn(
                  'border-transparent bg-transparent px-0',
                  TASK_TYPE_META[type as keyof typeof byType].accent,
                )}
              >
                {t(TASK_TYPE_META[type as keyof typeof byType].label)}: {count}
              </Badge>
            ))}
          </div>
        </div>
      </Section>

      <Section title={t('projectDash.nextDeadlines')}>
        {upcomingDeadlines.length === 0 ? (
          <EmptyState
            title={t('projectDash.nothingScheduled')}
            description={t('projectDash.noDeadlines')}
          />
        ) : (
          <ul className="divide-y divide-edge overflow-hidden rounded-2xl border border-edge bg-surface-raised">
            {upcomingDeadlines.map((task) => (
              <li key={task.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  aria-hidden
                  className="h-7 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: task.color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{task.title}</p>
                  <p className="text-2xs text-content-faint">
                    {task.dueAt ? formatDayLabel(task.dueAt) : t('projectDash.noDate')} ·{' '}
                    {formatDeadline(task.dueAt)}
                  </p>
                </div>
                <AvatarStack people={task.assignees} max={3} />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
};

/**
 * Tasks finished per calendar month, for the last twelve.
 *
 * ## Why this replaced the fortnight of daily bars
 *
 * The old chart was fourteen days wide, and at that span almost every project
 * shows the same picture: a couple of bars, a lot of floor, and no way to tell
 * a quiet fortnight from a dead one. It was also drawn as bare rectangles with
 * a day number under each and a `title` attribute for the value -- so the
 * actual numbers were invisible unless you hovered, which on a touch screen
 * means they did not exist at all.
 *
 * A year of months answers the question the tab is actually asked: is this
 * project moving, and has it always moved like this. Twelve columns is also
 * exactly the density where every bar can carry its own label without the axis
 * becoming a queue of collapsed text.
 *
 * ## Why the summary sits above the chart
 *
 * Because three numbers -- best month, average, year total -- are what somebody
 * takes away, and a chart is what they check them against. Putting the readings
 * first means the panel is useful at a glance and the columns are there for
 * anyone who wants to see the shape behind them.
 *
 * ## Why the scale is drawn rather than implied
 *
 * A bar chart with no axis is a picture of proportions with no units, and the
 * tallest column looks identical whether it is three tasks or three hundred.
 * The peak is printed on the gridline it belongs to, so every other column can
 * be read against a real number.
 *
 * ## Why there is no charting library
 *
 * Twelve values do not need one, and the app ships to a free tier where a
 * charting bundle would be one of the largest things a reader downloads. This
 * is a flex row of divs; it themes itself through the same tokens as everything
 * else, which no charting library would do across thirteen skins.
 */
const MonthlyCompletion = ({ months }: { months: { month: string; completed: number }[] }) => {
  const t = useT();
  const locale = useLocale();

  const total = months.reduce((sum, point) => sum + point.completed, 0);
  const best = Math.max(0, ...months.map((point) => point.completed));
  const average = months.length === 0 ? 0 : Math.round((total / months.length) * 10) / 10;

  /*
   * The bars are measured against the tallest month, never against zero.
   *
   * A chart scaled to its own peak is the only one that shows *shape* when the
   * numbers are small: three months of 1, 2 and 3 tasks read as a rising trend
   * rather than as three identical slivers at the bottom of an empty box.
   */
  const peak = Math.max(1, best);

  /** "Mar", "Mar 24" on a January so the year change is visible on the axis. */
  const label = (month: string): string => {
    const [year, index] = month.split('-').map(Number);
    const date = new Date(year, index - 1, 1);
    const short = date.toLocaleDateString(locale, { month: 'short' });
    return index === 1 ? `${short} ${String(year).slice(2)}` : short;
  };

  const full = (month: string): string => {
    const [year, index] = month.split('-').map(Number);
    return new Date(year, index - 1, 1).toLocaleDateString(locale, {
      month: 'long',
      year: 'numeric',
    });
  };

  if (total === 0) {
    return (
      <div className="rounded-xl border border-dashed border-edge/70 px-4 py-8 text-center">
        <p className="text-xs text-content-faint">{t('projectDash.noMonthlyData')}</p>
      </div>
    );
  }

  return (
    <section className="space-y-3 border-t border-edge pt-4">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4 className="text-xs font-semibold">{t('projectDash.perMonth')}</h4>
        <p className="text-3xs uppercase tracking-[0.12em] text-content-faint">
          {t('projectDash.lastMonths', { count: String(months.length) })}
        </p>
      </header>

      <dl className="grid grid-cols-3 gap-2">
        {[
          { label: t('projectDash.monthTotal'), value: total },
          { label: t('projectDash.monthBest'), value: best },
          { label: t('projectDash.monthAverage'), value: average },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl bg-surface-sunken px-3 py-2">
            <dt className="text-3xs uppercase tracking-wide text-content-faint">{stat.label}</dt>
            <dd className="text-base font-semibold tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>

      {/*
        The plot. `relative` so the gridlines can be laid behind the columns
        without either one having to know the other's height.
      */}
      <div className="relative pt-5">
        {/* The peak, printed on the line it describes -- see the note above. */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-5 h-32">
          <div className="absolute inset-x-0 top-0 border-t border-dashed border-edge/70" />
          <span className="absolute -top-4 right-0 text-3xs tabular-nums text-content-faint">
            {peak}
          </span>
          <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-edge/40" />
        </div>

        <ol className="relative flex h-32 items-end gap-1 sm:gap-1.5">
          {months.map((point, index) => {
            const isLast = index === months.length - 1;

            return (
              <li key={point.month} className="group flex h-full flex-1 flex-col justify-end">
                {/*
                  The value above its own column rather than in a tooltip. It is
                  the number the chart exists to communicate; hiding it behind a
                  hover puts it out of reach of every touch device.
                */}
                <p
                  className={cn(
                    'mb-1 text-center text-3xs tabular-nums',
                    point.completed === 0 ? 'text-transparent' : 'text-content-muted',
                  )}
                >
                  {point.completed}
                </p>

                <motion.div
                  className={cn(
                    'w-full rounded-t transition-colors',
                    // The month in progress is the one being asked about, so it
                    // is the one that is solid. The rest are context.
                    isLast ? 'bg-brand' : 'bg-brand/45 group-hover:bg-brand/70',
                  )}
                  initial={{ height: 0 }}
                  animate={{ height: `${(point.completed / peak) * 100}%` }}
                  transition={{
                    duration: 0.5,
                    ease: [0.22, 1, 0.36, 1],
                    delay: Math.min(index * 0.03, 0.3),
                  }}
                  style={{ minHeight: point.completed > 0 ? 3 : 1 }}
                  title={t('projectDash.completedInMonth', {
                    count: String(point.completed),
                    month: full(point.month),
                  })}
                />
              </li>
            );
          })}
        </ol>

        <ol className="mt-1.5 flex gap-1 sm:gap-1.5">
          {months.map((point, index) => (
            <li
              key={point.month}
              className={cn(
                'flex-1 truncate text-center text-3xs',
                index === months.length - 1
                  ? 'font-semibold text-content-muted'
                  : 'text-content-faint',
              )}
            >
              {label(point.month)}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};
