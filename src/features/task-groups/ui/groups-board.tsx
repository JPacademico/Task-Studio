import { useEffect, useMemo, useRef, useState } from 'react';
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
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Eye,
  EyeOff,
  Inbox,
  ListTodo,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';

import type { ProjectRepository, RosterMember } from '@/entities/project/model/types';
import {
  useCreateTaskGroup,
  useDeleteTaskGroup,
  useReorderTaskGroups,
  useTagTask,
  useTaskGroupBoard,
  useToggleGroupTaskCompletion,
  useUpdateTaskGroup,
} from '@/entities/task-group/model/queries';
import type { GroupedTask, TaskGroupColumn } from '@/entities/task-group/model/types';
import { TaskComposer } from '@/features/task-management/ui/task-composer';
import {
  GROUP_COLUMNS_PER_PAGE,
  MAX_GROUPS_PER_PROJECT,
  TASK_COLORS,
  TEXT_LIMITS,
} from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { clampOnPaste, clampText } from '@/shared/lib/text';
import { Button, ColorPicker, EmptyState, Input, Modal, Segmented, Skeleton } from '@/shared/ui';
import { useT } from '@/shared/i18n';
import {
  ColumnOverflow,
  ColumnOverflowToggle,
  byDeadline,
  useColumnCapacity,
} from '@/features/dnd-board/ui/column-overflow';
import { useHiddenColumns } from '../model/hidden-columns';
import { GroupTaskCard } from './group-task-card';

interface GroupsBoardProps {
  projectId: string;
  /** The project's people, for the composer this board opens. */
  roster?: RosterMember[];
  /**
   * The project's finish date, for the composer's deadline ceiling. Passed down for the same reason
   * the roster is: the page above already holds the project.
   */
  projectDeadline?: string | null;
  /** Passed straight through to the composer, so a task can name a branch. */
  repository?: ProjectRepository | null;
  /** Opens the ordinary task sheet — this board draws cards, it does not own them. */
  onOpenTask: (taskId: string) => void;
}

/** The droppable id for the dynamic lane. Not a uuid, so it cannot collide. */
const UNTAGGED = 'untagged';

/**
 * The two pager arrows, as drop targets. Prefixed so `handleDragEnd` can tell them apart from a
 * column id at a glance — a drop *on* one of these is a page turn that has already happened.
 */
const PAGE_PREV = 'page:prev';
const PAGE_NEXT = 'page:next';

/** How long a card must rest on a pager arrow before it turns again. */
const PAGE_FLIP_MS = 650;

/**
 * Which half of the board is being looked at. Two states rather than a three-way with "everything".
 */
type StatusFilter = 'open' | 'done';

/**
 * The grouping board: columns a project invents for itself. The task board answers "what state is
 * this work in", and its three columns are `TaskStatus`.
 */
export const GroupsBoard = ({
  projectId,
  roster,
  projectDeadline,
  repository,
  onOpenTask,
}: GroupsBoardProps) => {
  const t = useT();

  const { data: board, isLoading } = useTaskGroupBoard(projectId);
  const createGroup = useCreateTaskGroup(projectId);
  const updateGroup = useUpdateTaskGroup(projectId);
  const deleteGroup = useDeleteTaskGroup(projectId);
  const reorder = useReorderTaskGroups(projectId);
  const tagTask = useTagTask(projectId);
  const toggleComplete = useToggleGroupTaskCompletion(projectId);

  const { hiddenSet, toggle: toggleHidden, showAll } = useHiddenColumns(projectId);

  const [activeId, setActiveId] = useState<string | null>(null);
  /** `'new'` while creating, a column while renaming, `null` when closed. */
  const [editing, setEditing] = useState<'new' | TaskGroupColumn | null>(null);
  /** The column a new task is being written into, or `null` when closed. */
  const [creatingIn, setCreatingIn] = useState<TaskGroupColumn | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('open');
  /** Whether folded-away columns are on screen so they can be brought back. */
  const [isRevealingHidden, setIsRevealingHidden] = useState(false);
  const [page, setPage] = useState(0);

  const sensors = useSensors(
    // Matches the task board exactly: a small activation distance keeps a tap
    // from becoming an accidental drag, and touch waits for a deliberate hold.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } }),
  );

  const groups = useMemo(() => board?.groups ?? [], [board?.groups]);
  const untagged = useMemo(() => board?.untagged ?? [], [board?.untagged]);
  const canManage = board?.canManage ?? false;
  const isFull = groups.length >= MAX_GROUPS_PER_PROJECT;

  /**
   * The filter, applied. One predicate rather than one per lane, so the untagged pile and the
   * columns can never disagree about what "open" means.
   */
  const visible = useMemo(() => {
    const keep = (task: GroupedTask) =>
      filter === 'done' ? task.status === 'COMPLETED' : task.status !== 'COMPLETED';

    return {
      untagged: untagged.filter(keep),
      groups: groups.map((group) => ({ ...group, tasks: group.tasks.filter(keep) })),
    };
  }, [filter, groups, untagged]);

  /** Only counts columns that still exist — see the note in `useHiddenColumns`. */
  const hiddenCount = groups.filter((group) => hiddenSet.has(group.id)).length;

  const listed = isRevealingHidden
    ? visible.groups
    : visible.groups.filter((group) => !hiddenSet.has(group.id));

  const pageCount = Math.max(1, Math.ceil(listed.length / GROUP_COLUMNS_PER_PAGE));
  // Clamped rather than trusted: hiding a column, or somebody else deleting
  // one, can shrink the board under a page that was legitimate a moment ago.
  const currentPage = Math.min(page, pageCount - 1);
  const pageColumns = listed.slice(
    currentPage * GROUP_COLUMNS_PER_PAGE,
    currentPage * GROUP_COLUMNS_PER_PAGE + GROUP_COLUMNS_PER_PAGE,
  );

  // Kept in sync with the clamp above, so the pager's own read-out does not
  // disagree with what is on screen for a render.
  useEffect(() => {
    if (page > pageCount - 1) setPage(pageCount - 1);
  }, [page, pageCount]);

  // Nothing is folded away any more, so there is nothing to reveal.
  useEffect(() => {
    if (hiddenCount === 0) setIsRevealingHidden(false);
  }, [hiddenCount]);

  const activeTask = useMemo(() => {
    if (!activeId || !board) return null;
    return (
      board.groups.flatMap((group) => group.tasks).find((task) => task.id === activeId) ??
      board.untagged.find((task) => task.id === activeId) ??
      null
    );
  }, [activeId, board]);

  // Turning the page with a card in hand. Paging and dragging are in direct conflict: a lane on
  // page two is not on screen.
  const lastFlipRef = useRef(0);

  const handleDragOver = (event: DragOverEvent) => {
    const over = event.over?.id;
    if (over !== PAGE_PREV && over !== PAGE_NEXT) return;

    const now = Date.now();
    if (now - lastFlipRef.current < PAGE_FLIP_MS) return;
    lastFlipRef.current = now;

    setPage((current) =>
      over === PAGE_PREV
        ? Math.max(0, current - 1)
        : Math.min(pageCount - 1, current + 1),
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);

    const taskId = String(event.active.id);
    const over = event.over?.id;
    if (!over) return;

    // Released on a pager arrow. The page has already turned; the card simply
    // goes back where it came from rather than being filed into a control.
    if (over === PAGE_PREV || over === PAGE_NEXT) return;

    const nextGroupId = over === UNTAGGED ? null : String(over);
    const current = (event.active.data.current as { groupId: string | null } | undefined)?.groupId;

    // A drop back into the lane it came from is a no-op, not a request.
    if (current === nextGroupId) return;

    tagTask.mutate({ taskId, groupId: nextGroupId });
  };

  /**
   * Which of the two writes a tick becomes, decided once. An assignee signs off their own row; an
   * owner or admin who is not on the task closes it outright.
   */
  const completionHandler = (task: GroupedTask) => {
    if (!task.isMine && !canManage) return undefined;

    return () =>
      toggleComplete.mutate({
        taskId: task.id,
        completed: task.isMine ? !task.isCompletedByMe : task.status !== 'COMPLETED',
        asAssignee: task.isMine,
      });
  };

  if (isLoading || !board) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-[13.75rem] rounded-2xl" />
        ))}
      </div>
    );
  }

  // Nothing has been set up yet. Deliberately a full empty state rather than an empty board with
  // one "add" button in the corner.
  if (groups.length === 0) {
    return (
      <>
        <EmptyState
          icon={<Columns3 className="h-6 w-6" />}
          title={t('groups.emptyTitle')}
          description={canManage ? t('groups.emptyBody') : t('groups.emptyBodyMember')}
          action={
            canManage ? (
              <Button variant="lava" onClick={() => setEditing('new')}>
                <Plus className="h-3.5 w-3.5" />
                {t('groups.addColumn')}
              </Button>
            ) : undefined
          }
        />
        <ColumnDialog
          state={editing}
          isSaving={createGroup.isPending || updateGroup.isPending}
          onClose={() => setEditing(null)}
          onSubmit={async (values) => {
            await createGroup.mutateAsync(values);
            setEditing(null);
          }}
        />
      </>
    );
  }

  const untaggedIsVisible = visible.untagged.length > 0;

  return (
    /* The whole surface is one drag context, toolbar included. Not a stylistic choice: the pager
       arrows are drop targets as well as buttons (see `Pager`). */
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(event: DragStartEvent) => setActiveId(String(event.active.id))}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="space-y-3">
        {/* --- What is being looked at ----------------------------------- */}
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              {
                value: 'open',
                label: t('groups.filterOpen'),
                icon: <ListTodo className="h-3 w-3" />,
              },
              {
                value: 'done',
                label: t('groups.filterDone'),
                icon: <CheckCircle2 className="h-3 w-3" />,
              },
            ]}
          />

          {/* The way back from hiding, and only when there is one. */}
          {hiddenCount > 0 && (
            <>
              <Button
                size="sm"
                variant={isRevealingHidden ? 'secondary' : 'ghost'}
                onClick={() => setIsRevealingHidden((open) => !open)}
                aria-pressed={isRevealingHidden}
              >
                {isRevealingHidden ? (
                  <Eye className="h-3.5 w-3.5" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5" />
                )}
                {t('groups.hiddenCount', { count: String(hiddenCount) })}
              </Button>

              {isRevealingHidden && (
                <Button size="sm" variant="ghost" onClick={showAll}>
                  {t('groups.showAllColumns')}
                </Button>
              )}
            </>
          )}

          <div className="ml-auto flex items-center gap-2">
            {/* Paging applies at every width, so the arrows do too. */}
            {pageCount > 1 && (
              <span className="inline-flex items-center gap-1">
                <Pager
                  id={PAGE_PREV}
                  disabled={currentPage === 0}
                  label={t('groups.previousPage')}
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Pager>

                <span className="px-1 text-2xs tabular-nums text-content-faint">
                  {currentPage + 1}/{pageCount}
                </span>

                <Pager
                  id={PAGE_NEXT}
                  disabled={currentPage === pageCount - 1}
                  label={t('groups.nextPage')}
                  onClick={() =>
                    setPage((current) => Math.min(pageCount - 1, current + 1))
                  }
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Pager>
              </span>
            )}

            {/* "Add column" lives here rather than at the end of the line. It used to sit where
                a new column would appear. */}
            {canManage && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setEditing('new')}
                disabled={isFull}
                title={
                  isFull ? t('groups.full', { max: String(MAX_GROUPS_PER_PROJECT) }) : undefined
                }
              >
                <Plus className="h-3.5 w-3.5" />
                {t('groups.addColumn')}
              </Button>
            )}
          </div>
        </div>

        <div
          className={cn(
            /* Two layouts, and `lg` is where they change over. Below it the board is the snapping
               strip the task board uses: one lane per swipe. */
            '-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-2',
            'lg:mx-0 lg:snap-none lg:overflow-x-visible lg:px-0',
            // `relative` for the exiting lanes, which `popLayout` takes out of
            // flow — see the note on `AnimatePresence` below.
            'relative items-stretch',
          )}
        >
          {/* `popLayout`, and this is the fix for the lane that used to blink out. The untagged
              pile disappearing the instant it empties is correct behaviour drawn badly. */}
          <AnimatePresence initial={false} mode="popLayout">
            {/* The untagged lane, first and only when it has something in it. First because it
                is the pile you are working *from* when you set the board up. */}
            {untaggedIsVisible && (
              <Lane
                key={UNTAGGED}
                id={UNTAGGED}
                title={t('groups.untagged')}
                hint={t('groups.untaggedHint')}
                count={visible.untagged.length}
                accent={null}
                tasks={visible.untagged}
                onOpenTask={onOpenTask}
                canManage={canManage}
                emptyLabel={t(filter === 'done' ? 'groups.noneDoneHere' : 'groups.dropHere')}
                completionHandler={completionHandler}
                syncingTaskId={toggleComplete.isPending ? toggleComplete.variables?.taskId : null}
              />
            )}
          </AnimatePresence>

          {pageColumns.map((group) => {
            const index = groups.findIndex((entry) => entry.id === group.id);
            const isHidden = hiddenSet.has(group.id);

            return (
              <Lane
                key={group.id}
                id={group.id}
                title={group.name}
                count={group.tasks.length}
                accent={group.color}
                tasks={group.tasks}
                onOpenTask={onOpenTask}
                canManage={canManage}
                emptyLabel={t(filter === 'done' ? 'groups.noneDoneHere' : 'groups.dropHere')}
                completionHandler={completionHandler}
                syncingTaskId={
                  toggleComplete.isPending ? toggleComplete.variables?.taskId : null
                }
                isHidden={isHidden}
                onToggleHidden={() => toggleHidden(group.id)}
                onAddTask={canManage ? () => setCreatingIn(group) : undefined}
                footer={
                  canManage && (
                    <ColumnControls
                      canMoveLeft={index > 0}
                      canMoveRight={index < groups.length - 1}
                      onMove={(direction) => {
                        const ids = groups.map((entry) => entry.id);
                        const target = index + direction;
                        [ids[index], ids[target]] = [ids[target], ids[index]];
                        reorder.mutate(ids);
                      }}
                      onRename={() => setEditing(group)}
                      onDelete={() => {
                        const total = groups[index]?.tasks.length ?? 0;
                        const message = total
                          ? t('groups.deleteConfirmWithTasks', {
                              name: group.name,
                              count: String(total),
                            })
                          : t('groups.deleteConfirm', { name: group.name });
                        if (window.confirm(message)) deleteGroup.mutate(group.id);
                      }}
                    />
                  )
                }
              />
            );
          })}
        </div>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }}>
          {activeTask && (
            <GroupTaskCard task={activeTask} isDragging className="w-[15.5rem] rotate-1" />
          )}
        </DragOverlay>

        {/* Every column on this board is hidden, or the filter has emptied it. */}
        {pageColumns.length === 0 && !untaggedIsVisible && (
          <EmptyState
            icon={filter === 'done' ? <CheckCircle2 className="h-6 w-6" /> : <EyeOff className="h-6 w-6" />}
            title={t(hiddenCount > 0 ? 'groups.allHiddenTitle' : 'groups.noneMatchTitle')}
            description={t(
              hiddenCount > 0
                ? 'groups.allHiddenBody'
                : filter === 'done'
                  ? 'groups.noneDoneBody'
                  : 'groups.noneOpenBody',
            )}
            action={
              hiddenCount > 0 ? (
                <Button variant="secondary" onClick={showAll}>
                  <Eye className="h-3.5 w-3.5" />
                  {t('groups.showAllColumns')}
                </Button>
              ) : undefined
            }
          />
        )}

        <ColumnDialog
          state={editing}
          isSaving={createGroup.isPending || updateGroup.isPending}
          onClose={() => setEditing(null)}
          onSubmit={async (values) => {
            if (editing === 'new') await createGroup.mutateAsync(values);
            else if (editing) await updateGroup.mutateAsync({ groupId: editing.id, payload: values });
            setEditing(null);
          }}
        />

        {/* A new task, already filed. The board's own composer rather than the page's, because
            the column is the whole point of pressing "+" *here*. */}
        <TaskComposer
          isOpen={creatingIn !== null}
          onClose={() => setCreatingIn(null)}
          projectId={projectId}
          roster={roster}
          lockedGroupId={creatingIn?.id}
          projectDeadline={projectDeadline}
          repository={repository}
        />
      </div>
    </DndContext>
  );
};

// --- Pieces ------------------------------------------------------------------

interface LaneProps {
  id: string;
  title: string;
  hint?: string;
  count: number;
  /** The column's colour, or `null` for the untagged lane, which has none. */
  accent: string | null;
  tasks: GroupedTask[];
  onOpenTask: (taskId: string) => void;
  canManage: boolean;
  /** Returns the tick handler for a card, or `undefined` if it gets no box. */
  completionHandler: (task: GroupedTask) => (() => void) | undefined;
  /** The one card whose completion write is in flight, if any. */
  syncingTaskId?: string | null;
  /**
   * What an empty lane says. Passed in rather than fixed at `groups.dropHere`, because under the
   * "completed" filter that sentence is a lie.
   */
  emptyLabel?: string;
  /** Folded away by this reader, and only on screen because they are looking. */
  isHidden?: boolean;
  onToggleHidden?: () => void;
  onAddTask?: () => void;
  footer?: React.ReactNode;
}

const Lane = ({
  id,
  title,
  hint,
  count,
  accent,
  tasks,
  onOpenTask,
  canManage,
  completionHandler,
  syncingTaskId,
  emptyLabel,
  isHidden,
  onToggleHidden,
  onAddTask,
  footer,
}: LaneProps) => {
  const t = useT();
  const { setNodeRef, isOver } = useDroppable({ id });

  // The lane shows the work due soonest and offers the rest. Per-lane state rather than per-board:
  // opening "Blocked" says nothing about wanting "Done" opened too.
  const capacity = useColumnCapacity();
  const [isOpen, setIsOpen] = useState(false);

  const ordered = useMemo(() => [...tasks].sort(byDeadline), [tasks]);
  const visible = ordered.slice(0, capacity);

  return (
    <motion.section
      ref={setNodeRef}
      /* `layout="position"`, not plain `layout`. The full version animates the *box*, which it does
         by scaling — and a lane's box changes height every time a card is added. */
      layout="position"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'group/lane gpu flex w-[82vw] shrink-0 snap-start flex-col gap-2.5 rounded-2xl border p-2.5',
        'sm:w-[18.75rem]',
        // Shares the width from `lg` up — see the container's note.
        'lg:min-h-[13.75rem] lg:w-auto lg:min-w-[10.625rem] lg:shrink lg:flex-1 lg:basis-0 lg:p-3',
        'transition-colors duration-150',
        isOver ? 'border-brand bg-brand/[0.06]' : 'border-edge bg-surface-sunken/60',
        /* A revealed-but-hidden column reads as a ghost of itself: it is on screen so it can be
           brought back, not because it is part of the board. */
        isHidden && 'border-dashed [&>*]:opacity-60',
      )}
    >
      <header className="flex items-center gap-1.5 px-1">
        {accent ? (
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: accent }}
          />
        ) : (
          <Inbox className="h-3 w-3 shrink-0 text-content-faint" />
        )}

        <span
          title={hint ?? title}
          className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-wide text-content-muted"
        >
          {title}
        </span>

        <span className="shrink-0 rounded-full bg-surface-raised px-1.5 text-xs tabular-nums text-content-faint">
          {count}
        </span>

        {/* The two controls that belong at the top of a column. */}
        {(onAddTask || onToggleHidden) && (
          <span className="flex shrink-0 items-center gap-1">
            {onAddTask && (
              /* Drawn as a filled control, not as a hover-only glyph. */
              <button
                type="button"
                onClick={onAddTask}
                aria-label={t('groups.addTaskHere', { name: title })}
                title={t('groups.addTaskHere', { name: title })}
                className={cn(
                  'grid h-7 w-7 place-items-center rounded-lg',
                  'bg-brand/15 text-brand ring-1 ring-inset ring-brand/30',
                  'transition-[background-color,color,box-shadow,transform] duration-150',
                  'hover:bg-brand hover:text-brand-contrast hover:ring-brand',
                  'active:scale-95',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60',
                )}
              >
                <Plus className="h-4 w-4" strokeWidth={2.8} />
              </button>
            )}

            {onToggleHidden && (
              <button
                type="button"
                onClick={onToggleHidden}
                aria-pressed={isHidden}
                aria-label={t(isHidden ? 'groups.showColumn' : 'groups.hideColumn', {
                  name: title,
                })}
                title={t(isHidden ? 'groups.showColumn' : 'groups.hideColumn', { name: title })}
                className={cn(
                  'grid h-6 w-6 place-items-center rounded-lg text-content-faint',
                  'transition-colors duration-150 hover:bg-surface-raised hover:text-content',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
                )}
              >
                {isHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </button>
            )}
          </span>
        )}
      </header>

      <div className="flex flex-1 flex-col gap-2">
        {visible.map((task) => (
          <DraggableCard
            key={task.id}
            task={task}
            onOpen={onOpenTask}
            canManage={canManage}
            onToggleComplete={completionHandler(task)}
            isSyncing={syncingTaskId === task.id}
          />
        ))}

        {/* The rest of the column, folded away. Still inside the droppable, so a card can be
            dropped into a lane that is showing four of twenty. */}
        <ColumnOverflow isOpen={isOpen}>
          {ordered.slice(capacity).map((task) => (
            <DraggableCard
              key={task.id}
              task={task}
              onOpen={onOpenTask}
              canManage={canManage}
              onToggleComplete={completionHandler(task)}
              isSyncing={syncingTaskId === task.id}
            />
          ))}
        </ColumnOverflow>

        {ordered.length > capacity && (
          <ColumnOverflowToggle
            hidden={ordered.length - capacity}
            isOpen={isOpen}
            onToggle={() => setIsOpen((open) => !open)}
          />
        )}

        {tasks.length === 0 && (
          <p className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-edge/70 px-3 py-6 text-center text-2xs text-content-faint">
            {emptyLabel ?? t('groups.dropHere')}
          </p>
        )}
      </div>

      {footer}
    </motion.section>
  );
};

const DraggableCard = ({
  task,
  onOpen,
  canManage,
  onToggleComplete,
  isSyncing,
}: {
  task: GroupedTask;
  onOpen: (taskId: string) => void;
  canManage: boolean;
  onToggleComplete?: () => void;
  isSyncing?: boolean;
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    // Read on drop to skip a no-op request when the card lands where it started.
    data: { groupId: task.groupId },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        // translate3d keeps the drag on the compositor: no layout, no repaint.
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.35 : 1,
        touchAction: 'manipulation',
      }}
      className="gpu cursor-grab active:cursor-grabbing"
    >
      <GroupTaskCard
        task={task}
        onOpen={onOpen}
        canManage={canManage}
        onToggleComplete={onToggleComplete ? () => onToggleComplete() : undefined}
        isSyncing={isSyncing}
      />
    </div>
  );
};

/**
 * One pager arrow: a button, and a drop target for the same page turn. Both, because the board
 * pages and the cards drag.
 */
const Pager = ({
  id,
  disabled,
  label,
  onClick,
  children,
}: {
  id: string;
  disabled: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id, disabled });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'grid h-7 w-7 place-items-center rounded-lg border transition-colors duration-150',
        'disabled:cursor-not-allowed disabled:opacity-30',
        isOver
          ? 'border-brand bg-brand/10 text-brand'
          : 'border-edge text-content-muted hover:text-content',
      )}
    >
      {children}
    </button>
  );
};

/**
 * What a column *is*: its order, its name, and whether it goes on existing. At the foot of the lane
 * rather than in its header.
 */
const ColumnControls = ({
  canMoveLeft,
  canMoveRight,
  onMove,
  onRename,
  onDelete,
}: {
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onMove: (direction: -1 | 1) => void;
  onRename: () => void;
  onDelete: () => void;
}) => {
  const t = useT();

  const button =
    'grid h-6 w-6 place-items-center rounded text-content-faint transition-colors hover:text-content disabled:opacity-30';

  return (
    // Revealed on hover on a pointer device and always visible on touch, where
    // there is no hover to reveal anything with.
    <footer
      className={cn(
        'mt-0.5 flex items-center justify-between gap-1 border-t border-edge/60 pt-1.5',
        'opacity-100 sm:opacity-0 sm:transition-opacity sm:focus-within:opacity-100',
        'sm:group-hover/lane:opacity-100',
      )}
    >
      <span className="flex items-center">
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={!canMoveLeft}
          aria-label={t('groups.moveLeft')}
          title={t('groups.moveLeft')}
          className={button}
        >
          <ChevronLeft className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={!canMoveRight}
          aria-label={t('groups.moveRight')}
          title={t('groups.moveRight')}
          className={button}
        >
          <ChevronRight className="h-3 w-3" />
        </button>
      </span>

      <span className="flex items-center">
        <button
          type="button"
          onClick={onRename}
          aria-label={t('groups.rename')}
          title={t('groups.rename')}
          className={button}
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={t('groups.delete')}
          title={t('groups.delete')}
          className={cn(button, 'hover:text-danger')}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </span>
    </footer>
  );
};

/**
 * One dialog for creating and for renaming. The two differ by a title and by what the fields start
 * as, which is not two dialogs' worth of difference.
 */
const ColumnDialog = ({
  state,
  isSaving,
  onClose,
  onSubmit,
}: {
  state: 'new' | TaskGroupColumn | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: { name: string; color: string }) => Promise<void>;
}) => {
  const t = useT();
  const isNew = state === 'new';

  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(TASK_COLORS[0]);

  // Re-seeded on every open: the dialog is mounted by the board, so its state would otherwise be
  // whatever was last typed into it — including the name of a different column.
  useEffect(() => {
    if (!state) return;
    setName(isNew ? '' : state.name);
    setColor(isNew ? TASK_COLORS[Math.floor(Math.random() * TASK_COLORS.length)] : state.color);
  }, [state, isNew]);

  const trimmed = name.trim();

  const save = async () => {
    if (!trimmed) return;
    try {
      await onSubmit({ name: trimmed, color });
    } catch {
      // The mutation's `onError` has already said what went wrong — most often that the name is
      // taken.
    }
  };

  return (
    <Modal
      isOpen={state !== null}
      onClose={onClose}
      title={t(isNew ? 'groups.newColumn' : 'groups.renameColumn')}
      description={t('groups.columnHint')}
      flat
      className="sm:max-w-sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void save()} isLoading={isSaving} disabled={!trimmed}>
            {t(isNew ? 'common.add' : 'common.save')}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <Input
          label={t('groups.columnName')}
          value={name}
          autoFocus
          onChange={(event) => setName(clampText(event.target.value, TEXT_LIMITS.groupName))}
          onPaste={(event) => clampOnPaste(event, TEXT_LIMITS.groupName)}
          maxLength={TEXT_LIMITS.groupName}
          placeholder={t('groups.columnNamePlaceholder')}
        />

        <ColorPicker
          label={t('groups.columnColour')}
          value={color}
          onChange={setColor}
          options={TASK_COLORS}
        />
      </form>
    </Modal>
  );
};
