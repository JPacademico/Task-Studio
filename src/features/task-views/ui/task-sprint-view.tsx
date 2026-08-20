import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Flame, Target } from 'lucide-react';

import { TaskCard } from '@/entities/task/ui/task-card';
import type { TaskPriority, TaskStatus } from '@/entities/task/model/types';
import { TASK_PRIORITY_META, TASK_STATUS_META } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { EmptyState } from '@/shared/ui';
import type { TaskViewProps } from './task-list-view';
import { useT } from '@/shared/i18n';

const COLUMNS: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'COMPLETED'];
const LANES: TaskPriority[] = ['URGENT', 'HIGH', 'NORMAL', 'LOW'];

const LANE_ACCENT: Record<TaskPriority, string> = {
  URGENT: 'border-danger/45 bg-danger/[0.06]',
  HIGH: 'border-warning/45 bg-warning/[0.05]',
  NORMAL: 'border-edge bg-surface-sunken/40',
  LOW: 'border-edge/70 bg-surface-sunken/25',
};

/**
 * The stand-up board.
 *
 * The plain board answers "where is this", which is enough when everything
 * matters equally. A sprint never does: the same three columns crossed with
 * priority swimlanes shows in one glance whether the urgent row is still full
 * on the left, which is the only thing the meeting is really asking. The header
 * carries the arithmetic — committed, done, late — so nobody has to count cards.
 */
export const TaskSprintView = ({
  tasks,
  onOpen,
  onToggleComplete,
  onTogglePin,
  onDelete,
  showProjectLink,
}: TaskViewProps) => {
  const t = useT();
  const { lanes, stats } = useMemo(() => {
    const done = tasks.filter((task) => task.status === 'COMPLETED').length;
    const late = tasks.filter((task) => task.isLate).length;

    return {
      lanes: LANES.map((priority) => {
        const items = tasks.filter((task) => task.priority === priority);
        return {
          priority,
          total: items.length,
          columns: COLUMNS.map((status) => ({
            status,
            items: items.filter((task) => task.status === status),
          })),
        };
      }).filter((lane) => lane.total > 0),
      stats: { total: tasks.length, done, late },
    };
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <EmptyState title={t('views.nothingInSprint')} description={t('views.noMatch')} />
    );
  }

  const progress = stats.total === 0 ? 0 : Math.round((stats.done / stats.total) * 100);

  return (
    <div className="space-y-3">
      {/* --- The arithmetic --------------------------------------------------- */}
      <header className="ui-card flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-edge bg-surface-raised p-3">
        <span className="inline-flex items-center gap-2 text-sm font-semibold">
          <Target className="h-4 w-4 text-brand" />
          {t('views.sprint')}
        </span>

        <span className="flex min-w-[10rem] flex-1 items-center gap-2.5">
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken">
            <motion.span
              className="block h-full rounded-full bg-positive"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ type: 'spring', stiffness: 220, damping: 30 }}
            />
          </span>
          <span className="shrink-0 text-xs font-semibold tabular-nums">{progress}%</span>
        </span>

        <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-content-muted">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3 text-positive" />
            {stats.done}/{stats.total} done
          </span>
          <span className={cn('inline-flex items-center gap-1.5', stats.late > 0 && 'text-danger')}>
            <AlertTriangle className="h-3 w-3" />
            {stats.late} late
          </span>
        </span>
      </header>

      {/* --- Column headings, once, above every lane -------------------------- */}
      <div className="hidden grid-cols-[7rem_repeat(3,minmax(0,1fr))] gap-2.5 px-1 lg:grid">
        <span />
        {COLUMNS.map((status) => (
          <span
            key={status}
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-content-muted"
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', TASK_STATUS_META[status].dot)} />
            {t(TASK_STATUS_META[status].label)}
          </span>
        ))}
      </div>

      {lanes.map((lane) => {
        const meta = TASK_PRIORITY_META[lane.priority];

        return (
          <section
            key={lane.priority}
            className={cn(
              'grid gap-2.5 rounded-2xl border p-2.5',
              'lg:grid-cols-[7rem_repeat(3,minmax(0,1fr))]',
              LANE_ACCENT[lane.priority],
            )}
          >
            <header className="flex items-center gap-2 lg:flex-col lg:items-start lg:justify-center lg:gap-1">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide',
                  meta.className,
                )}
              >
                {lane.priority === 'URGENT' && <Flame className="h-3.5 w-3.5" />}
                {t(meta.label)}
              </span>
              <span className="text-[11px] tabular-nums text-content-faint">
                {lane.total} task(s)
              </span>
            </header>

            {lane.columns.map((column) => (
              <div key={column.status} className="flex flex-col gap-2">
                {/* The column name repeats per lane on narrow screens, where the
                    shared heading row above is not rendered. */}
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-content-faint lg:hidden">
                  <span
                    className={cn('h-1 w-1 rounded-full', TASK_STATUS_META[column.status].dot)}
                  />
                  {t(TASK_STATUS_META[column.status].label)}
                </span>

                {/* See `TaskCard`: nothing enters or exits, so there is
                    nothing for a presence wrapper to track. */}
                {column.items.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      compact
                      showProjectLink={showProjectLink}
                      onOpen={onOpen}
                      onToggleComplete={onToggleComplete}
                      onTogglePin={onTogglePin}
                      onDelete={onDelete}
                    />
                ))}

                {column.items.length === 0 && (
                  <span className="rounded-xl border border-dashed border-edge/70 px-2 py-3 text-center text-[10px] text-content-faint">
                    —
                  </span>
                )}
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
};
