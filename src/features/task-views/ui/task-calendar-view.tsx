import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { CalendarClock, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

import type { Task } from '@/entities/task/model/types';
import { cn } from '@/shared/lib/cn';
import { formatTime } from '@/shared/lib/dates';
import { Button, DirectionArrow, EmptyState } from '@/shared/ui';
import type { TaskViewProps } from './task-list-view';
import { useT } from '@/shared/i18n';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEK_OPTIONS = { weekStartsOn: 1 } as const;

/** Whatever fixes a task to a day: its deadline first, its start otherwise. */
const anchorOf = (task: Task): Date | null => {
  const value = task.dueAt ?? task.startAt;
  return value ? parseISO(value) : null;
};

/**
 * A month at a time.
 *
 * The board answers "what state is this in" and the agenda answers "what is
 * next"; neither answers "how loaded is the week of the 14th", which is the
 * question a deadline-driven team actually asks before committing to anything.
 * Undated work is kept visible in a tray under the grid rather than dropped —
 * it is the backlog the month is competing with.
 */
export const TaskCalendarView = ({ tasks, onOpen, onToggleComplete }: TaskViewProps) => {
  const t = useT();
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<Date | null>(null);

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(cursor), WEEK_OPTIONS),
        end: endOfWeek(endOfMonth(cursor), WEEK_OPTIONS),
      }),
    [cursor],
  );

  // One pass over the tasks, keyed by calendar day, instead of a filter per cell.
  const { byDay, unscheduled } = useMemo(() => {
    const map = new Map<string, Task[]>();
    const loose: Task[] = [];

    for (const task of tasks) {
      const anchor = anchorOf(task);
      if (!anchor) {
        loose.push(task);
        continue;
      }
      const key = format(anchor, 'yyyy-MM-dd');
      map.set(key, [...(map.get(key) ?? []), task]);
    }

    for (const [, items] of map) {
      items.sort((a, b) => (anchorOf(a)?.getTime() ?? 0) - (anchorOf(b)?.getTime() ?? 0));
    }

    return { byDay: map, unscheduled: loose };
  }, [tasks]);

  const selectedTasks = selected ? (byDay.get(format(selected, 'yyyy-MM-dd')) ?? []) : [];

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold tracking-tight">{format(cursor, 'MMMM yyyy')}</h3>

        <div className="ui-segment ml-auto inline-flex items-center gap-1 rounded-xl border border-edge bg-surface-sunken p-1">
          <button
            type="button"
            aria-label={t('views.previousMonth')}
            onClick={() => setCursor((date) => subMonths(date, 1))}
            className="grid h-7 w-7 place-items-center rounded-lg text-content-muted transition-colors hover:bg-surface-raised hover:text-content"
          >
            <DirectionArrow direction="left" fallback={ChevronLeft} className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setCursor(new Date())}
            className="rounded-lg px-2 py-1 text-xs font-medium text-content-muted transition-colors hover:text-content"
          >
            {t('views.today')}
          </button>
          <button
            type="button"
            aria-label={t('views.nextMonth')}
            onClick={() => setCursor((date) => addMonths(date, 1))}
            className="grid h-7 w-7 place-items-center rounded-lg text-content-muted transition-colors hover:bg-surface-raised hover:text-content"
          >
            <DirectionArrow direction="right" fallback={ChevronRight} className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border border-edge bg-surface-raised">
        <div className="grid grid-cols-7 border-b border-edge bg-surface-sunken/60">
          {WEEKDAYS.map((weekday) => (
            <span
              key={weekday}
              className="px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-content-faint"
            >
              <span className="hidden sm:inline">{weekday}</span>
              <span className="sm:hidden">{weekday[0]}</span>
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day) => {
            const items = byDay.get(format(day, 'yyyy-MM-dd')) ?? [];
            const isOutside = !isSameMonth(day, cursor);
            const isSelected = selected !== null && isSameDay(day, selected);
            const overdue = items.filter((task) => task.isLate).length;

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => setSelected(isSelected ? null : day)}
                className={cn(
                  'group/day relative min-h-[76px] border-b border-r border-edge/60 p-1.5 text-left',
                  'transition-colors duration-150 last:border-r-0 hover:bg-surface-sunken/60',
                  isOutside && 'bg-surface-sunken/25 text-content-faint',
                  isSelected && 'bg-brand/[0.09] ring-1 ring-inset ring-brand/40',
                )}
              >
                <span
                  className={cn(
                    'inline-grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] tabular-nums',
                    isToday(day)
                      ? 'bg-brand font-bold text-brand-contrast'
                      : 'font-medium text-content-muted',
                  )}
                >
                  {format(day, 'd')}
                </span>

                {overdue > 0 && (
                  <span
                    aria-hidden
                    title={`${overdue} late`}
                    className="absolute right-1.5 top-2 h-1.5 w-1.5 rounded-full bg-danger"
                  />
                )}

                <ul className="mt-1 space-y-0.5">
                  {items.slice(0, 3).map((task) => (
                    <li
                      key={task.id}
                      title={task.title}
                      className={cn(
                        'flex items-center gap-1 truncate rounded px-1 py-px text-[10px] leading-tight',
                        task.status === 'COMPLETED' && 'opacity-55 line-through',
                      )}
                      style={{ backgroundColor: `${task.color}22`, color: 'inherit' }}
                    >
                      <span
                        aria-hidden
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: task.color }}
                      />
                      <span className="truncate">{task.title}</span>
                    </li>
                  ))}

                  {items.length > 3 && (
                    <li className="px-1 text-[10px] font-medium text-content-faint">
                      +{items.length - 3} more
                    </li>
                  )}
                </ul>
              </button>
            );
          })}
        </div>
      </div>

      {/* The picked day, in full. A cell can only ever show a hint. */}
      {selected && (
        <motion.section
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2 rounded-2xl border border-edge bg-surface-raised p-3"
        >
          <header className="flex items-center gap-2">
            <CalendarClock className="h-3.5 w-3.5 text-brand" />
            <h4 className="text-sm font-semibold">{format(selected, 'EEEE d MMMM')}</h4>
            <span className="ml-auto text-[11px] text-content-faint">
              {selectedTasks.length} task(s)
            </span>
          </header>

          {selectedTasks.length === 0 ? (
            <p className="py-3 text-center text-xs text-content-faint">{t('views.nothingDue')}</p>
          ) : (
            <ul className="space-y-1.5">
              {selectedTasks.map((task) => (
                <li key={task.id} className="flex items-center gap-2.5">
                  <span className="w-10 shrink-0 text-[11px] tabular-nums text-content-faint">
                    {task.dueAt ? formatTime(task.dueAt) : '--:--'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpen(task)}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-edge px-2.5 py-1.5 text-left transition-colors hover:border-brand/40 hover:bg-surface-sunken/60"
                  >
                    <span
                      aria-hidden
                      className="h-4 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: task.color }}
                    />
                    <span className="truncate text-xs font-medium">{task.title}</span>
                    {task.isLate && (
                      <span className="ml-auto shrink-0 text-[10px] font-bold uppercase text-danger">
                        Late
                      </span>
                    )}
                  </button>
                  {task.isMine && (
                    <Button size="sm" variant="ghost" onClick={() => onToggleComplete(task)}>
                      {task.isCompletedByMe ? 'Undo' : 'Done'}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </motion.section>
      )}

      {unscheduled.length > 0 && (
        <section className="space-y-1.5 rounded-2xl border border-dashed border-edge p-3">
          <header className="flex items-center gap-2">
            <Inbox className="h-3.5 w-3.5 text-content-faint" />
            <h4 className="text-xs font-semibold uppercase tracking-wide text-content-muted">
              {t('views.noDateYet')}
            </h4>
            <span className="ml-auto text-[11px] text-content-faint">{unscheduled.length}</span>
          </header>

          <div className="flex flex-wrap gap-1.5">
            {unscheduled.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => onOpen(task)}
                className="inline-flex max-w-[15rem] items-center gap-1.5 rounded-full border border-edge px-2.5 py-1 text-[11px] transition-colors hover:border-brand/50 hover:text-brand"
              >
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: task.color }}
                />
                <span className="truncate">{task.title}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {tasks.length === 0 && (
        <EmptyState title={t('views.emptyMonth')} description={t('views.noMatch')} />
      )}
    </div>
  );
};
