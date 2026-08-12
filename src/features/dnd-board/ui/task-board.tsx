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
import { AnimatePresence } from 'framer-motion';

import { TaskCard } from '@/entities/task/ui/task-card';
import type { Task, TaskStatus } from '@/entities/task/model/types';
import { TASK_STATUS_META } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { EmptyState } from '@/shared/ui';

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
}

const COLUMNS: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'COMPLETED'];

const LOCKED_HINT = 'Only the people this task is assigned to (or a project admin) can move it.';

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
      title={isLocked ? LOCKED_HINT : undefined}
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
  children,
}: {
  status: TaskStatus;
  tasks: Task[];
  children: React.ReactNode;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = TASK_STATUS_META[status];

  return (
    <section
      ref={setNodeRef}
      className={cn(
        'flex flex-col gap-2.5 rounded-2xl border p-2.5 transition-colors duration-150',
        // On a phone the columns sit in a snapping horizontal strip, so all
        // three are one swipe apart instead of three screens of scrolling.
        'w-[82vw] shrink-0 snap-start sm:w-auto sm:shrink lg:min-h-[220px] lg:p-3',
        isOver ? 'border-brand bg-brand/[0.06]' : 'border-edge bg-surface-sunken/60',
      )}
    >
      <header className="flex items-center justify-between px-1">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-content-muted">
          <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
          {meta.label}
        </span>
        <span className="rounded-full bg-surface-raised px-1.5 text-xs tabular-nums text-content-faint">
          {tasks.length}
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
}: TaskBoardProps) => {
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
          <Column key={status} status={status} tasks={grouped[status]}>
            <AnimatePresence initial={false}>
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
            </AnimatePresence>

            {grouped[status].length === 0 && (
              <EmptyState
                className="flex-1 border-none px-3 py-5 lg:py-8"
                title="Nothing here"
                description="Drop a task in this column."
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
