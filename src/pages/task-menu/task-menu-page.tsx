import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, CheckCircle2, Clock, Inbox } from 'lucide-react';

import { completionBlockedReason } from '@/entities/task/lib/completion';
import {
  useDeleteTask,
  useTaskAgenda,
  useToggleMyCompletion,
  useToggleTaskPin,
  useUpdateTaskStatus,
} from '@/entities/task/model/queries';
import type { ListTasksParams, Task } from '@/entities/task/model/types';
import { TaskCard } from '@/entities/task/ui/task-card';
import { useCurrentUser } from '@/features/auth/model/session.store';
import { TaskBoard } from '@/features/dnd-board/ui/task-board';
import { TaskDetailModal } from '@/features/task-management/ui/task-detail-modal';
import { TaskFilters } from '@/features/task-management/ui/task-filters';
import {
  LayoutSwitcher,
  TaskCalendarView,
  TaskListView,
  useTaskLayout,
} from '@/features/task-views';
import { cn } from '@/shared/lib/cn';
import { formatDayLabel, formatTime } from '@/shared/lib/dates';
import { EmptyState, PageLoader, Section } from '@/shared/ui';

const isSameDay = (isoDate: string, reference: Date): boolean =>
  isoDate === reference.toISOString().slice(0, 10);

/**
 * The chronological task menu: one bucket per calendar day, ordered by hour
 * inside the day, with an inbox for work that has no schedule yet.
 *
 * This is the personal surface, so it is scoped to the signed-in user and
 * finished work stays out of the way — `hideCompleted` is dropped only when the
 * status filter explicitly asks for completed tasks.
 */
const TaskMenuPage = () => {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const [filters, setFilters] = useState<ListTasksParams>({
    scope: 'mine',
    hideCompleted: true,
  });
  // The agenda is a reading surface, so a task opens read-only here: editing
  // still belongs to the project board, which is one click away on the card.
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

  const showingCompleted = filters.status === 'COMPLETED';

  const { data: agenda, isLoading } = useTaskAgenda(filters);
  const toggleCompletion = useToggleMyCompletion();
  const togglePin = useToggleTaskPin();
  const deleteTask = useDeleteTask();
  const updateStatus = useUpdateTaskStatus();

  const { layout, setLayout, options: layoutOptions } = useTaskLayout('personal');

  const today = useMemo(() => new Date(), []);

  const handlers = useMemo(
    () => ({
      onOpen: (task: Task) => setDetailTaskId(task.id),
      onToggleComplete: (task: Task) =>
        toggleCompletion.mutate({ taskId: task.id, completed: !task.isCompletedByMe }),
      onTogglePin: (task: Task) => togglePin.mutate({ taskId: task.id, pinned: !task.isPinned }),
      onDelete: (task: Task) => deleteTask.mutate(task.id),
    }),
    // The `mutate` functions are stable; the mutation objects are not.
    [deleteTask.mutate, togglePin.mutate, toggleCompletion.mutate],
  );

  const days = useMemo(() => agenda?.days ?? [], [agenda?.days]);
  const unscheduled = useMemo(() => agenda?.unscheduled ?? [], [agenda?.unscheduled]);

  // The other layouts want one flat set. Flattening what the agenda already
  // fetched keeps every shape on a single request.
  const allTasks = useMemo(
    () => [...days.flatMap((day) => day.tasks), ...unscheduled],
    [days, unscheduled],
  );

  if (isLoading) return <PageLoader label="Building your agenda" />;

  const isEmpty = days.length === 0 && unscheduled.length === 0;

  return (
    <div className="space-y-5 sm:space-y-7">
      <header className="space-y-3">
        <div className="space-y-0.5 sm:space-y-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-content-faint sm:text-xs">
            Task menu
          </p>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Your agenda</h1>
          <p className="hidden text-sm text-content-muted sm:block">
            Grouped by day and hour. Completed work steps aside until you ask for it.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TaskFilters
            variant="personal"
            value={filters}
            onChange={(next) =>
              // Asking for completed tasks is the one thing that un-hides them.
              setFilters({ ...next, hideCompleted: next.status === 'COMPLETED' ? undefined : true })
            }
          />
          <LayoutSwitcher
            value={layout}
            options={layoutOptions}
            onChange={setLayout}
            className="ml-auto"
          />
        </div>

        {showingCompleted && (
          <p className="inline-flex items-center gap-1.5 rounded-lg bg-positive/10 px-2.5 py-1 text-[11px] text-positive">
            <CheckCircle2 className="h-3 w-3" />
            Showing completed work. It moves to the recycle bin a week after it is done.
          </p>
        )}
      </header>

      {isEmpty && (
        <EmptyState
          icon={<CalendarDays className="h-6 w-6" />}
          title={showingCompleted ? 'Nothing completed yet' : 'Nothing scheduled'}
          description={
            filters.hasNotes
              ? 'No one has attached a note to your tasks yet.'
              : 'Tasks with a start time or a deadline appear here, ordered by hour.'
          }
        />
      )}

      {/* Every layout reads the same agenda response — switching shape is a
          rendering decision, never another request. */}
      {layout === 'list' && <TaskListView tasks={allTasks} showProjectLink {...handlers} />}
      {layout === 'calendar' && <TaskCalendarView tasks={allTasks} showProjectLink {...handlers} />}
      {/* No admin override on this board: the personal agenda has no project
          role to read, so a shared task always needs everybody's tick here.
          The project board is where an admin can overrule it. */}
      {layout === 'board' && (
        <TaskBoard
          tasks={allTasks}
          onStatusChange={(taskId, status) => updateStatus.mutate({ taskId, status })}
          canChangeStatus={(task) => task.isMine}
          completionBlock={(task) =>
            completionBlockedReason(task, { currentUserId: currentUser?.id })
          }
          {...handlers}
        />
      )}

      {layout === 'agenda' && (
      <div className="space-y-6 sm:space-y-8">
        <AnimatePresence initial={false}>
          {days.map(({ date, tasks }) => (
            <motion.section
              key={date}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="gpu space-y-2.5"
            >
              <header className="sticky top-14 z-10 -mx-1 flex items-center gap-3 bg-surface/85 px-1 py-1.5 backdrop-blur sm:py-2">
                <h2
                  className={cn(
                    'text-sm font-semibold tracking-tight',
                    isSameDay(date, today) && 'text-brand',
                  )}
                >
                  {formatDayLabel(date)}
                </h2>
                <span className="h-px flex-1 bg-edge" />
                <span className="text-[11px] text-content-faint">{tasks.length} task(s)</span>
              </header>

              <ol className="space-y-2 sm:space-y-2.5">
                {tasks.map((task) => (
                  <li key={task.id} className="flex gap-2 sm:gap-3">
                    {/* Hour rail — the spine of the chronological view. */}
                    <div className="flex w-10 shrink-0 flex-col items-end pt-4 sm:w-14">
                      <span className="inline-flex items-center gap-1 text-[10px] tabular-nums text-content-faint sm:text-[11px]">
                        <Clock className="hidden h-3 w-3 sm:block" />
                        {task.dueAt ? formatTime(task.dueAt) : '--:--'}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <TaskCard task={task} showProjectLink {...handlers} />
                    </div>
                  </li>
                ))}
              </ol>
            </motion.section>
          ))}
        </AnimatePresence>

        {unscheduled.length > 0 && (
          <Section title="Unscheduled" description="No start time and no deadline yet.">
            <div className="grid gap-2.5 lg:grid-cols-2">
              {unscheduled.map((task) => (
                <TaskCard key={task.id} task={task} compact showProjectLink {...handlers} />
              ))}
            </div>
          </Section>
        )}

        {unscheduled.length === 0 && days.length > 0 && (
          <p className="flex items-center gap-2 text-xs text-content-faint">
            <Inbox className="h-3.5 w-3.5" />
            Everything has a slot on the calendar.
          </p>
        )}
      </div>
      )}

      {/* Same detail sheet the project board opens — checklist, notes and the
          assistant — so a task means the same thing on both surfaces. Editing
          needs the project roster, which lives on the project page, so "Edit"
          takes the user there rather than opening a composer with no options. */}
      <TaskDetailModal
        taskId={detailTaskId}
        onClose={() => setDetailTaskId(null)}
        onEdit={(task) => {
          setDetailTaskId(null);
          navigate(`/projects/${task.project.id}`);
        }}
      />
    </div>
  );
};

export default TaskMenuPage;
