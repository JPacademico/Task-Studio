import { motion } from 'framer-motion';
import { Award, CalendarClock, CheckCircle2, ListTodo, TriangleAlert } from 'lucide-react';

import { useProjectDashboard } from '@/entities/project/model/queries';
import { TASK_TYPE_META } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { formatDayLabel, formatDeadline } from '@/shared/lib/dates';
import { Avatar, AvatarStack, Badge, EmptyState, PageLoader, Section } from '@/shared/ui';
import { useT } from '@/shared/i18n';

/** Metrics module for a single project: throughput, people, deadlines. */
export const ProjectDashboard = ({ projectId }: { projectId: string }) => {
  const t = useT();
  const { data, isLoading } = useProjectDashboard(projectId);

  if (isLoading || !data) return <PageLoader label={t('projectDash.crunching')} />;

  const { totals, byType, members, mostProductiveMember, completionTrend, upcomingDeadlines } = data;
  const peak = Math.max(1, ...completionTrend.map((point) => point.completed));

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
              <p className="text-[11px] uppercase tracking-wide text-content-faint">
                {tile.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Section title={t('projectDash.completion')} className="lg:col-span-2">
          <div className="space-y-4 rounded-2xl border border-edge bg-surface-raised p-4">
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

            {/* 14-day completion trend — bars, no charting dependency. */}
            <div className="flex h-24 items-end gap-1.5 pt-2">
              {completionTrend.map((point) => (
                <div key={point.date} className="group flex flex-1 flex-col items-center gap-1">
                  <motion.div
                    className="w-full rounded-t bg-brand/70 transition-colors group-hover:bg-brand"
                    initial={{ height: 0 }}
                    animate={{ height: `${(point.completed / peak) * 100}%` }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    title={t('projectDash.completedOnDay', {
                      count: String(point.completed),
                      date: point.date,
                    })}
                    style={{ minHeight: 2 }}
                  />
                  <span className="text-[9px] text-content-faint">
                    {point.date.slice(8, 10)}
                  </span>
                </div>
              ))}
            </div>

            {/*
              The type's *name*, not its key.

              `TASK_TYPE_META[...].label` is a `TranslationKey` — the tables in
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

        <Section title={t('projectDash.mostProductive')}>
          {mostProductiveMember ? (
            <div className="space-y-4 rounded-2xl border border-edge bg-surface-raised p-4">
              <div className="flex items-center gap-3">
                <Avatar
                  name={mostProductiveMember.displayName}
                  src={mostProductiveMember.avatarUrl}
                  size="md"
                />
                <div className="leading-tight">
                  <p className="text-sm font-semibold">{mostProductiveMember.displayName}</p>
                  <p className="inline-flex items-center gap-1 text-[11px] text-content-muted">
                    <Award className="h-3 w-3 text-warning" />
                    {t('projectDash.tasksCompleted', {
                      count: String(mostProductiveMember.completed),
                    })}
                  </p>
                </div>
              </div>

              <ul className="space-y-2.5 border-t border-edge pt-3">
                {members.map((member) => (
                  <li key={member.id} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="truncate text-content-muted">{member.displayName}</span>
                      <span className="tabular-nums text-content-faint">
                        {member.completed}/{member.assigned}
                      </span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-surface-sunken">
                      <motion.div
                        className="h-full rounded-full bg-positive"
                        initial={{ width: 0 }}
                        animate={{ width: `${member.completionRate}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyState
              title={t('projectDash.noCompletions')}
              description={t('projectDash.noCompletionsBody')}
            />
          )}
        </Section>
      </div>

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
                  <p className="text-[11px] text-content-faint">
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
