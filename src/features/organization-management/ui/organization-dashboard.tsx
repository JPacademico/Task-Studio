import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Activity,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  FolderKanban,
  TriangleAlert,
  Users,
} from 'lucide-react';

import { useOrganizationDashboard } from '@/entities/organization/model/queries';
import type { OrganizationProjectMetrics } from '@/entities/organization/model/types';
import { cn } from '@/shared/lib/cn';
import { formatDayLabel, formatDeadline } from '@/shared/lib/dates';
import { Badge, EmptyState, PageLoader, Section } from '@/shared/ui';
import { useT, type Translate } from '@/shared/i18n';

interface HighlightProps {
  title: string;
  project: OrganizationProjectMetrics;
  caption: string;
  tone: 'good' | 'bad';
}

/** One project singled out, with the number that singled it out. */
const Highlight = ({ title, project, caption, tone }: HighlightProps) => (
  <div className="space-y-2 rounded-2xl border border-edge bg-surface-raised p-4">
    <p className="text-[11px] uppercase tracking-wide text-content-faint">{title}</p>
    <Link
      to={`/projects/${project.id}`}
      className="flex items-center gap-2.5 transition-colors hover:text-brand"
    >
      <span
        aria-hidden
        className="h-8 w-1 shrink-0 rounded-full"
        style={{ backgroundColor: project.color }}
      />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{project.name}</span>
    </Link>
    <p
      className={cn(
        'inline-flex items-center gap-1 text-[11px]',
        tone === 'bad' ? 'text-danger' : 'text-positive',
      )}
    >
      {tone === 'bad' ? (
        <TriangleAlert className="h-3 w-3" />
      ) : (
        <CheckCircle2 className="h-3 w-3" />
      )}
      {caption}
    </p>
  </div>
);

interface ProjectRowProps {
  project: OrganizationProjectMetrics;
  t: Translate;
}

/** One line of the league table: name, progress, and what is late. */
const ProjectMetricRow = ({ project, t }: ProjectRowProps) => (
  <li className="space-y-1.5 px-4 py-3">
    <div className="flex items-center gap-2">
      <span
        aria-hidden
        className="h-4 w-1 shrink-0 rounded-full"
        style={{ backgroundColor: project.color }}
      />
      <Link
        to={`/projects/${project.id}`}
        className="min-w-0 flex-1 truncate text-xs font-medium transition-colors hover:text-brand"
      >
        {project.name}
      </Link>

      {project.overdue > 0 && (
        <Badge className="border-danger/40 text-danger">
          <TriangleAlert className="h-3 w-3" />
          {project.overdue}
        </Badge>
      )}
      <span className="shrink-0 tabular-nums text-[11px] text-content-faint">
        {project.completed}/{project.tasks}
      </span>
    </div>

    <div className="flex items-center gap-2">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-sunken">
        <motion.div
          className={cn(
            'h-full rounded-full',
            project.overdue > 0 ? 'bg-warning' : 'bg-positive',
          )}
          initial={{ width: 0 }}
          animate={{ width: `${project.completionRate}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <span className="w-9 shrink-0 text-right tabular-nums text-[10px] text-content-faint">
        {project.completionRate}%
      </span>
    </div>

    {project.nextDueAt && (
      <p className="text-[10px] text-content-faint">
        {t('org.nextDeadline')} · {formatDeadline(project.nextDueAt)}
      </p>
    )}
  </li>
);

/**
 * The company's numbers, measured in projects.
 *
 * The deliberate difference from `ProjectDashboard`, which measures in tasks and
 * people: this is read by somebody who is not doing any of the work, and the
 * question is "which of these needs me". So the tiles count projects before they
 * count tasks, the league table is one row per project, and the two highlight
 * cards name a project rather than a person — a company page that crowned a
 * "most productive employee" would be measuring the wrong thing at the wrong
 * altitude, and measuring it across teams that cannot be compared.
 *
 * Every number here spans the whole company, including projects the reader is
 * not on. That is the point of the page — a completion rate that quietly
 * excluded half the work would not be the company's rate — and it is why the
 * endpoint behind it is staff-only.
 */
export const OrganizationDashboard = ({ organizationId }: { organizationId: string }) => {
  const t = useT();
  const { data, isLoading } = useOrganizationDashboard(organizationId);

  if (isLoading || !data) return <PageLoader label={t('org.crunching')} />;

  const { totals, projects, busiestProject, mostAtRiskProject, completionTrend } = data;
  const peak = Math.max(1, ...completionTrend.map((point) => point.completed));

  const tiles = [
    {
      label: t('org.tileProjects'),
      value: totals.activeProjects,
      icon: <FolderKanban className="h-4 w-4" />,
      hint:
        totals.archivedProjects > 0
          ? t('org.tileArchivedHint', { count: totals.archivedProjects })
          : undefined,
    },
    { label: t('org.tileMembers'), value: totals.members, icon: <Users className="h-4 w-4" /> },
    {
      label: t('dash.overdue'),
      value: totals.overdue,
      icon: <TriangleAlert className="h-4 w-4" />,
      warn: totals.overdue > 0,
    },
    {
      label: t('org.tileMeetings'),
      value: totals.upcomingMeetings,
      icon: <CalendarDays className="h-4 w-4" />,
    },
  ];

  // Worst first: a league table read top-down should start with the news.
  const ranked = [...projects].sort(
    (a, b) => b.overdue - a.overdue || a.completionRate - b.completionRate,
  );

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
            <div className="min-w-0 leading-tight">
              <p className="text-lg font-semibold tabular-nums">{tile.value}</p>
              <p className="truncate text-[11px] uppercase tracking-wide text-content-faint">
                {tile.label}
              </p>
              {tile.hint && (
                <p className="truncate text-[10px] text-content-faint">{tile.hint}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Section title={t('org.throughput')} className="lg:col-span-2">
          <div className="space-y-4 rounded-2xl border border-edge bg-surface-raised p-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <p className="text-3xl font-semibold tabular-nums">
                {totals.completionRate}%
              </p>
              <p className="text-xs text-content-muted">
                {t('org.tasksDone', {
                  completed: totals.completed,
                  total: totals.tasks,
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

            {/* 14-day completion trend across every project the company runs —
                bars, no charting dependency, same as the project version. */}
            <div className="flex h-24 items-end gap-1.5 pt-2">
              {completionTrend.map((point) => (
                <div key={point.date} className="group flex flex-1 flex-col items-center gap-1">
                  <motion.div
                    className="w-full rounded-t bg-brand/70 transition-colors group-hover:bg-brand"
                    initial={{ height: 0 }}
                    animate={{ height: `${(point.completed / peak) * 100}%` }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    title={t('org.trendPoint', {
                      count: point.completed,
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

            <div className="flex flex-wrap gap-2 border-t border-edge pt-3 text-[11px] text-content-muted">
              <span className="inline-flex items-center gap-1">
                <Activity className="h-3 w-3 text-content-faint" />
                {t('org.dueThisWeek', { count: totals.dueThisWeek })}
              </span>
            </div>
          </div>
        </Section>

        <div className="space-y-3">
          {mostAtRiskProject ? (
            <Highlight
              title={t('org.mostAtRisk')}
              project={mostAtRiskProject}
              tone="bad"
              caption={t('org.overdueCount', { count: mostAtRiskProject.overdue })}
            />
          ) : (
            <div className="space-y-1.5 rounded-2xl border border-edge bg-surface-raised p-4">
              <p className="text-[11px] uppercase tracking-wide text-content-faint">
                {t('org.mostAtRisk')}
              </p>
              <p className="inline-flex items-center gap-1.5 text-sm font-medium text-positive">
                <CheckCircle2 className="h-4 w-4" />
                {t('org.nothingOverdue')}
              </p>
            </div>
          )}

          {busiestProject && (
            <Highlight
              title={t('org.busiest')}
              project={busiestProject}
              tone="good"
              caption={t('org.completedCount', { count: busiestProject.completed })}
            />
          )}
        </div>
      </div>

      <Section title={t('org.byProject')} description={t('org.byProjectHint')}>
        {ranked.length === 0 ? (
          <EmptyState title={t('org.boardEmpty')} description={t('org.boardEmptyBody')} />
        ) : (
          <ul className="divide-y divide-edge overflow-hidden rounded-2xl border border-edge bg-surface-raised">
            {ranked.map((project) => (
              <ProjectMetricRow key={project.id} project={project} t={t} />
            ))}
          </ul>
        )}
      </Section>

      <Section title={t('org.nextDeadlines')}>
        {data.upcomingDeadlines.length === 0 ? (
          <EmptyState
            title={t('projectDash.nothingScheduled')}
            description={t('projectDash.noDeadlines')}
          />
        ) : (
          <ul className="divide-y divide-edge overflow-hidden rounded-2xl border border-edge bg-surface-raised">
            {data.upcomingDeadlines.map((task) => (
              <li key={task.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  aria-hidden
                  className="h-7 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: task.color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{task.title}</p>
                  <p className="flex items-center gap-1.5 text-[11px] text-content-faint">
                    <CalendarClock className="h-3 w-3 shrink-0" />
                    {task.dueAt ? formatDayLabel(task.dueAt) : t('projectDash.noDate')} ·{' '}
                    {formatDeadline(task.dueAt)}
                  </p>
                </div>

                {/* Which project it belongs to — the whole reason this list is
                    worth reading at company level rather than at project level. */}
                <Link
                  to={`/projects/${task.project.id}`}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-edge px-2 py-0.5 text-[11px] text-content-muted transition-colors hover:border-brand/50 hover:text-content"
                >
                  <span
                    aria-hidden
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: task.project.color }}
                  />
                  <span className="max-w-[8rem] truncate">{task.project.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
};
