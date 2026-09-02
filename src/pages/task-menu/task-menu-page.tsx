import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Clock, Inbox, Plus } from 'lucide-react';

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
import { TaskComposer } from '@/features/task-management/ui/task-composer';
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
import { Button, EmptyState, RunicText, Section } from '@/shared/ui';
import { PendingTasks } from '@/entities/task/ui/pending-tasks';
import { AgendaSkeleton } from './agenda-skeleton';
import { useT } from '@/shared/i18n';

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
  const t = useT();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const [filters, setFilters] = useState<ListTasksParams>({
    scope: 'mine',
    hideCompleted: true,
  });
  // The agenda is a reading surface, so a *project* task opens read-only here:
  // editing one still belongs to the project board, which is one click away on
  // the card. A personal task has no board to send anybody to, so this page
  // owns its composer.
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [composerTask, setComposerTask] = useState<Task | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  const showingCompleted = filters.status === 'COMPLETED';
  const showingPersonal = Boolean(filters.personalOnly);

  const {
    data: agenda,
    isLoading,
    isFetching,
    isPlaceholderData: agendaIsPartial,
  } = useTaskAgenda(filters);
  const toggleCompletion = useToggleMyCompletion(currentUser?.id);
  const togglePin = useToggleTaskPin();
  const deleteTask = useDeleteTask();
  const updateStatus = useUpdateTaskStatus();

  const { layout, setLayout, options: layoutOptions } = useTaskLayout('personal');

  const openPersonalComposer = (task: Task | null) => {
    setComposerTask(task);
    setIsComposerOpen(true);
  };

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

  /*
   * A skeleton in the shape of the agenda, not a spinner in place of it.
   *
   * The whole page used to be replaced by a centred loader, so arriving here
   * meant watching the header, the filters and the layout switcher appear only
   * once the tasks had landed — and then the page reflowed around them. Drawing
   * the chrome immediately and standing in for the rows is both faster to first
   * paint and steadier, because nothing moves when the data arrives.
   *
   * `isLoading` and not `isFetching`: this is only for the first fill of a
   * cache. Changing a filter keeps the previous rows on screen (see
   * `useTaskAgenda`) and reports progress through the header instead.
   */
  const isEmpty = !isLoading && days.length === 0 && unscheduled.length === 0;

  return (
    <div className="space-y-5 sm:space-y-7">
      <header className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-0.5 sm:space-y-1">
            <p className="text-3xs uppercase tracking-[0.18em] text-content-faint sm:text-xs">
              <RunicText mode="always">{t('agenda.title')}</RunicText>
            </p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {t('agenda.heading')}
            </h1>
          </div>

          {/* The one thing this page could not do. Every other task had to be
              created from a project board, so work that belongs to nobody but
              you had to be filed under a project to exist at all. */}
          <Button size="sm" onClick={() => openPersonalComposer(null)}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2.8} />
            {t('agenda.newTask')}
          </Button>
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
          {/* Refetching keeps the current rows on screen, so the only honest
              place to say a request is in flight is here. */}
          {isFetching && !isLoading && (
            <span className="text-2xs text-content-faint">{t('common.loading')}</span>
          )}
          <LayoutSwitcher
            value={layout}
            options={layoutOptions}
            onChange={setLayout}
            className="ml-auto"
          />
        </div>

        {showingCompleted && (
          <p className="inline-flex items-center gap-1.5 rounded-lg bg-positive/10 px-2.5 py-1 text-2xs text-positive">
            <CheckCircle2 className="h-3 w-3" />
            {t('agenda.showingCompleted')}
          </p>
        )}
      </header>

      {/* Nothing to stand in for yet: no cache, no seed, no rows. */}
      {isLoading && <AgendaSkeleton />}

      {isEmpty && (
        <EmptyState
          icon={<CalendarDays className="h-6 w-6" />}
          title={t(
            showingPersonal
              ? 'agenda.nothingPersonal'
              : showingCompleted
                ? 'agenda.nothingCompleted'
                : 'agenda.nothingScheduled',
          )}
          description={
            showingPersonal
              ? t('agenda.personalBody')
              : filters.hasNotes
                ? t('agenda.noNotesBody')
                : t('agenda.scheduledBody')
          }
          action={
            showingPersonal ? (
              <Button size="sm" onClick={() => openPersonalComposer(null)}>
                <Plus className="h-3.5 w-3.5" strokeWidth={2.8} />
                {t('agenda.newPersonalTask')}
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Every layout reads the same agenda response — switching shape is a
          rendering decision, never another request. */}
      {!isLoading && layout === 'list' && <TaskListView tasks={allTasks} showProjectLink {...handlers} />}
      {!isLoading && layout === 'calendar' && <TaskCalendarView tasks={allTasks} showProjectLink {...handlers} />}
      {/* No admin override on this board: the personal agenda has no project
          role to read, so a shared task always needs everybody's tick here.
          The project board is where an admin can overrule it. */}
      {!isLoading && layout === 'board' && (
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

      {/* Rows are on screen, but they came from another surface's cache and
          the real answer is still in flight — so the page says it is short
          rather than growing quietly under the reader. See `PendingTasks`. */}
      {!isLoading && agendaIsPartial && <PendingTasks compact className="pt-1" />}

      {!isLoading && layout === 'agenda' && (
      <div className="space-y-6 sm:space-y-8">
        {/*
          * No `AnimatePresence` around the day buckets, deliberately.
          *
          * It used to wrap this list, and it never worked: an emptied bucket
          * was held mounted as an "exiting" child whose exit animation never
          * ran, so the section stayed in the DOM at full opacity indefinitely.
          * With a filter that matches nothing, the page rendered its empty
          * state *and* the previous filter's tasks underneath it.
          *
          * It was invisible until now only because changing a filter used to
          * blank the whole page to a loader, which tore this tree down and took
          * the stranded node with it. Keeping the page up — which is the point
          * of the change — is what exposed it.
          *
          * Nothing is lost by removing it: the exit was never rendering. The
          * *enter* animation is what carries this list, and `initial`/`animate`
          * on a motion component need no presence tracking at all.
          */}
        {days.map(({ date, tasks }) => (
            <section key={date} className="space-y-2.5">
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
                <span className="text-2xs text-content-faint">
                  {t('views.taskCount', { count: tasks.length })}
                </span>
              </header>

              <ol className="space-y-2 sm:space-y-2.5">
                {tasks.map((task) => (
                  <li key={task.id} className="flex gap-2 sm:gap-3">
                    {/* Hour rail — the spine of the chronological view. */}
                    <div className="flex w-10 shrink-0 flex-col items-end pt-4 sm:w-14">
                      <span className="inline-flex items-center gap-1 text-3xs tabular-nums text-content-faint sm:text-2xs">
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
            </section>
        ))}

        {unscheduled.length > 0 && (
          <Section title={t('agenda.unscheduled')} description={t('agenda.unscheduledBody')}>
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
            {t('agenda.everythingSlotted')}
          </p>
        )}
      </div>
      )}

      {/* Same detail sheet the project board opens — the note checklist and the
          assistant — so a task means the same thing on both surfaces. Editing
          needs the project roster, which lives on the project page, so "Edit"
          takes the user there rather than opening a composer with no options. */}
      <TaskDetailModal
        taskId={detailTaskId}
        onClose={() => setDetailTaskId(null)}
        onEdit={(task) => {
          setDetailTaskId(null);

          // A project task is edited where its roster is. A personal task has
          // no roster and no project page, so it is edited right here.
          if (task.project) navigate(`/projects/${task.project.id}`);
          else openPersonalComposer(task);
        }}
      />

      {/* No `projectId`: the composer drops the assignee picker and the API
          files the task against nobody. See `TaskComposer`. */}
      <TaskComposer
        isOpen={isComposerOpen}
        onClose={() => {
          setIsComposerOpen(false);
          setComposerTask(null);
        }}
        task={composerTask}
      />
    </div>
  );
};

export default TaskMenuPage;
