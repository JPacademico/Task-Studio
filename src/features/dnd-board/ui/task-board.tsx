import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';

import { TaskCard } from '@/entities/task/ui/task-card';
import type { Task, TaskStatus } from '@/entities/task/model/types';
import { TASK_STATUS_META } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { EmptyState, Skeleton } from '@/shared/ui';
import { translate, useT } from '@/shared/i18n';

interface TaskBoardProps {
  tasks: Task[];
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onOpen: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onTogglePin: (task: Task) => void;
  onDelete: (task: Task) => void;
  /**
   * Whether this user may move the card at all.
   *
   * The API only lets an assignee or a project admin change a status, so a
   * board that hands everybody a drag handle is offering a gesture that will be
   * rejected — and dropping a teammate's card into Completed looked, for the
   * length of the optimistic update, exactly like it had worked.
   */
  canChangeStatus?: (task: Task) => boolean;
  /**
   * Whether this card may land in Completed *yet*.
   *
   * Separate from `canChangeStatus` because it is a different question with a
   * different answer per column: a member may freely drag their shared task
   * between To do and In progress, and still not be the one who gets to call
   * it finished. See `entities/task/lib/completion.ts` for the rule.
   *
   * Returns the reason it cannot, or `null` when it can — the string is both
   * the column's hint while dragging and the toast when a drop is refused.
   */
  completionBlock?: (task: Task) => string | null;
  /**
   * Skeleton cards to draw in each column while more tasks are on the way.
   *
   * A number per column rather than a boolean, because the two waits are not
   * the same: an empty board on a cold load has nothing at all to show and
   * wants a couple of cards' worth of weight in each column, while a board that
   * has already painted the reader's own tasks and is topping up with the rest
   * of the roster's only needs to say "not finished". The caller knows which it
   * is in; see `ProjectPage`.
   *
   * `0` — the default — draws nothing and lets the empty state through.
   */
  pendingPerColumn?: number;
}

const COLUMNS: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'COMPLETED'];

/** Why a card refuses to be picked up. Read at render, so it follows the
 *  language the reader has chosen. */
const lockedHint = () => translate('board.moveLocked');

const DraggableTask = ({
  task,
  isLocked,
  children,
}: {
  task: Task;
  isLocked: boolean;
  children: React.ReactNode;
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { status: task.status },
    disabled: isLocked,
  });

  return (
    <div
      ref={setNodeRef}
      {...(isLocked ? {} : attributes)}
      {...(isLocked ? {} : listeners)}
      title={isLocked ? lockedHint() : undefined}
      style={{
        // translate3d keeps the drag on the compositor; no layout, no repaint.
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        opacity: isDragging ? 0.35 : 1,
        touchAction: 'manipulation',
      }}
      className={cn('gpu', isLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing')}
    >
      {children}
    </div>
  );
};

const Column = ({
  status,
  tasks,
  blockedReason,
  isPending = false,
  children,
}: {
  status: TaskStatus;
  tasks: Task[];
  /** Set while a card that may not land here is being dragged. */
  blockedReason?: string | null;
  /** More cards are still on the way into this column. */
  isPending?: boolean;
  children: React.ReactNode;
}) => {
  const t = useT();
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = TASK_STATUS_META[status];
  const isBlocked = Boolean(blockedReason);

  return (
    <section
      ref={setNodeRef}
      aria-busy={isPending || undefined}
      title={blockedReason ?? undefined}
      className={cn(
        'flex flex-col gap-2.5 rounded-2xl border p-2.5 transition-colors duration-150',
        // On a phone the columns sit in a snapping horizontal strip, so all
        // three are one swipe apart instead of three screens of scrolling.
        'w-[82vw] shrink-0 snap-start sm:w-auto sm:shrink lg:min-h-[220px] lg:p-3',
        // A column that will refuse the card says so *before* the drop, rather
        // than accepting it and having the server take it back a moment later.
        isBlocked
          ? 'border-dashed border-danger/60 bg-danger/[0.05]'
          : isOver
            ? 'border-brand bg-brand/[0.06]'
            : 'border-edge bg-surface-sunken/60',
      )}
    >
      <header className="flex items-center justify-between px-1">
        <span
          className={cn(
            'inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide',
            isBlocked ? 'text-danger' : 'text-content-muted',
          )}
        >
          {isBlocked ? (
            <Lock className="h-3 w-3" />
          ) : (
            <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
          )}
          {t(meta.label)}
        </span>
        {/*
          The count is the truth about what has arrived, not about what exists.

          While cards are still coming in, a bare "2" reads as a finished
          answer and then silently becomes a "5" — so the number is dimmed and
          followed by an ellipsis, which is the cheapest way to say "so far".
        */}
        <span
          className={cn(
            'rounded-full bg-surface-raised px-1.5 text-xs tabular-nums',
            isPending ? 'text-content-faint/60' : 'text-content-faint',
          )}
        >
          {tasks.length}
          {isPending && '…'}
        </span>
      </header>

      <div className="flex flex-1 flex-col gap-2.5">{children}</div>
    </section>
  );
};

/**
 * Status board with drag & drop between columns.
 *
 * Dropping optimistically updates the cache (see `useUpdateTaskStatus`), so the
 * card lands in its new column before the request resolves.
 */
export const TaskBoard = ({
  tasks,
  onStatusChange,
  onOpen,
  onToggleComplete,
  onTogglePin,
  onDelete,
  canChangeStatus,
  completionBlock,
  pendingPerColumn = 0,
}: TaskBoardProps) => {
  const t = useT();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    // A small activation distance keeps taps from becoming accidental drags.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } }),
  );

  const grouped = useMemo(
    () =>
      COLUMNS.reduce<Record<TaskStatus, Task[]>>(
        (accumulator, status) => {
          accumulator[status] = tasks.filter((task) => task.status === status);
          return accumulator;
        },
        { TODO: [], IN_PROGRESS: [], COMPLETED: [] },
      ),
    [tasks],
  );

  const activeTask = tasks.find((task) => task.id === activeId) ?? null;

  // Computed once per drag rather than per column render: the answer is the
  // same for all three, and only one of them can ever be refused.
  const activeBlock =
    activeTask && activeTask.status !== 'COMPLETED' ? (completionBlock?.(activeTask) ?? null) : null;

  const handleDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id));

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);

    const taskId = String(event.active.id);
    const target = event.over?.id as TaskStatus | undefined;
    if (!target || !COLUMNS.includes(target)) return;

    const task = tasks.find((entry) => entry.id === taskId);
    if (!task || task.status === target) return;
    // Belt and braces: the handle is already disabled, but a keyboard sensor or
    // a stale render must not be able to slip a forbidden move through.
    if (canChangeStatus && !canChangeStatus(task)) return;

    // A shared task is not one person's to close. The column already showed
    // itself as locked during the drag; this is what makes the drop a no-op,
    // and the toast is what stops it reading as a dropped gesture.
    if (target === 'COMPLETED') {
      const blocked = completionBlock?.(task);
      if (blocked) {
        toast.error(blocked);
        return;
      }
    }

    onStatusChange(taskId, target);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div
        className={cn(
          '-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0',
          'sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3',
        )}
      >
        {COLUMNS.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={grouped[status]}
            blockedReason={status === 'COMPLETED' ? activeBlock : null}
            isPending={pendingPerColumn > 0}
          >
            {/* See `TaskCard`: no entrance, no exit, nothing to track — and
                on a drag board the wrapper competed with dnd-kit's own
                transforms for the card that was moving. */}
            {grouped[status].map((task) => (
                <DraggableTask
                  key={task.id}
                  task={task}
                  isLocked={Boolean(canChangeStatus) && !canChangeStatus?.(task)}
                >
                  <TaskCard
                    task={task}
                    onOpen={onOpen}
                    onToggleComplete={onToggleComplete}
                    onTogglePin={onTogglePin}
                    onDelete={onDelete}
                  />
                </DraggableTask>
            ))}

            {/*
              Loading happens *in* the column, not under the board.

              These placeholders used to be a two-column grid below all three
              columns, which read as a fourth thing on the page rather than as
              a board filling up — and it put the "still loading" signal
              furthest from the columns it was about. A grey card in the
              column it will land in is the whole affordance.
            */}
            {Array.from({ length: pendingPerColumn }, (_, index) => (
              <Skeleton key={`pending-${index}`} className="h-[104px] shrink-0 rounded-2xl" />
            ))}

            {/* "Nothing here" is a claim, and it cannot be made while cards
                are still arriving. */}
            {grouped[status].length === 0 && pendingPerColumn === 0 && (
              <EmptyState
                className="flex-1 border-none px-3 py-5 lg:py-8"
                title={t('board.nothingHere')}
                description={t('board.dropHere')}
              />
            )}
          </Column>
        ))}
      </div>

      {/* Overlay follows the pointer so the original card can stay in place. */}
      <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }}>
        {activeTask && <TaskCard task={activeTask} isDragging className="w-[320px] rotate-1" />}
      </DragOverlay>
    </DndContext>
  );
};
