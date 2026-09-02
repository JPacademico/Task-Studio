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
  /**
   * The project's people, for the composer this board opens.
   *
   * Passed down rather than read here: the board would be asking for the roster
   * a second time on a page that already holds it, and the composer is the only
   * thing on this surface that needs it.
   */
  roster?: RosterMember[];
  /**
   * The project's finish date, for the composer's deadline ceiling.
   *
   * Passed down for the same reason the roster is: the page above already
   * holds the project, and this board's only interest in it is handing it to
   * the composer. See `TaskComposerProps.projectDeadline`.
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
 * The two pager arrows, as drop targets.
 *
 * Prefixed so `handleDragEnd` can tell them apart from a column id at a glance
 * — a drop *on* one of these is a page turn that has already happened, not a
 * request to file the card into a lane called "prev".
 */
const PAGE_PREV = 'page:prev';
const PAGE_NEXT = 'page:next';

/** How long a card must rest on a pager arrow before it turns again. */
const PAGE_FLIP_MS = 650;

/**
 * Which half of the board is being looked at.
 *
 * Two states rather than a three-way with "everything", because "everything" is
 * the arrangement this filter exists to get rid of: a column with its live work
 * at the top and a quarter's worth of struck-through cards under it is a column
 * people stop scrolling.
 */
type StatusFilter = 'open' | 'done';

/**
 * The grouping board: columns a project invents for itself.
 *
 * ## What it is for, and how it differs from the task board
 *
 * The task board answers "what state is this work in", and its three columns
 * are `TaskStatus` — the same three on every project in the system. That is a
 * good question and it is not the only one. A project also wants to say *this
 * is the wireframe work, that is the back end*, and there is no fixed set of
 * words for that: it is different for every project, and it is the project's
 * own to invent.
 *
 * So this is a second board over the same tasks, grouped by a label the project
 * writes for itself, with the **state carried on the card as a ribbon** rather
 * than as a column. That is the load-bearing decision, and everything else
 * follows from it: dragging a card here changes only its group, so no gesture
 * on this board can mark somebody's work done by accident. The card's tick box
 * can — deliberately, with a label on it — see `GroupTaskCard`.
 *
 * ## Finished work is not on the board
 *
 * A completed task leaves the columns and is reachable through the filter
 * instead. The columns are a picture of what is *left*, and a lane whose bottom
 * two thirds are struck-through cards is a lane you stop reading — the live
 * work at the top gets scrolled past to reach an archive nobody asked for.
 *
 * The filter shows the finished work back in **its own columns** rather than in
 * a single "Completed" lane, which is the whole point: "what did the back-end
 * work amount to" is a question about a category, and collapsing every category
 * into one pile is the one arrangement that cannot answer it.
 *
 * ## The untagged lane
 *
 * Not a column, and not a row in the database — it is where a task is when it
 * has not been filed. It appears only when something is in it, so a project
 * that has tagged everything sees a clean board rather than a permanent empty
 * lane; and it is the source anybody drags *from* when they first set the
 * columns up. It collapses rather than blinking out — see the `AnimatePresence`
 * around the lanes.
 *
 * ## Paging, rather than a strip that scrolls forever
 *
 * Ten columns at a readable width is roughly two laptop screens, and the half
 * you cannot see is a half people lose work in: a column eight screens to the
 * right is functionally invisible, and a horizontal scrollbar is the only thing
 * that ever admits it exists. So the board fills its width with one page of
 * lanes and says how many pages there are.
 *
 * A narrow screen keeps the snapping strip *within* a page — one lane per swipe
 * at a width a card is readable at — and pages with the same arrows the desktop
 * uses. Dropping the pager there would leave the smallest screen as the only
 * one where half the columns cannot be reached; and since a card in hand cannot
 * press a button, the arrows are drop targets too. See `Pager`.
 *
 * ## Why the columns reorder with buttons rather than by dragging
 *
 * Because the cards already own the drag gesture. Nesting a second draggable
 * axis inside the same `DndContext` means every column header becomes a place
 * where "did you mean to move the column or the card in it" has to be guessed
 * from a few pixels of pointer travel — and guessed on touch, where the answer
 * is least recoverable. Two arrows in the column's own footer are unambiguous,
 * work from a keyboard, and cost one row nobody has to open.
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
   * The filter, applied.
   *
   * One predicate rather than one per lane, so the untagged pile and the
   * columns can never disagree about what "open" means — which is exactly the
   * kind of thing that drifts when the same `!==` is written in two places.
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

  /*
   * Turning the page with a card in hand.
   *
   * Paging and dragging are in direct conflict: a lane on page two is not on
   * screen, so without this the board would be one where half the columns
   * cannot be dropped into. The arrows are therefore drop targets as well as
   * buttons — hovering one with a card held turns the page under it, the same
   * way dragging to the edge of a list scrolls it.
   *
   * Throttled, because `onDragOver` fires on every pointer move: unthrottled it
   * would flick through ten pages in the time it takes to notice the first one
   * turned. The ref rather than state so reading it does not re-render the
   * board mid-drag.
   */
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
   * Which of the two writes a tick becomes, decided once.
   *
   * An assignee signs off their own row; an owner or admin who is not on the
   * task closes it outright. Nobody else gets a box at all — the card is passed
   * no handler, so there is nothing to press. See `useToggleGroupTaskCompletion`.
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

  /*
   * Nothing has been set up yet.
   *
   * Deliberately a full empty state rather than an empty board with one "add"
   * button in the corner: this is a feature most people arrive at without
   * knowing what it does, and the one screen where explaining it costs nothing
   * is the one where there is nothing else to draw.
   */
  if (groups.length === 0) {
    return (
      <>
        <EmptyState
          icon={<Columns3 className="h-6 w-6" />}
          title={t('groups.emptyTitle')}
          description={canManage ? t('groups.emptyBody') : t('groups.emptyBodyMember')}
          action={
            canManage ? (
              <Button onClick={() => setEditing('new')}>
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
    /*
     * The whole surface is one drag context, toolbar included.
     *
     * Not a stylistic choice: the pager arrows are drop targets as well as
     * buttons (see `Pager`), and `useDroppable` outside a `DndContext` silently
     * registers with nothing — the arrow would look like a target and never be
     * one, which is the worst of the three possible outcomes.
     */
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

          {/*
            The way back from hiding, and only when there is one.

            A permanent "hidden columns" control on a board with nothing hidden is
            a button that teaches a feature by refusing to do anything. This
            appears the moment the first column is folded away and goes when the
            last one comes back — which is also what makes hiding safe to offer:
            the undo is never more than one click away and it is impossible to
            miss.
          */}
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
            {/*
              Paging applies at every width, so the arrows do too.

              A phone still swipes between the lanes of the page it is on; the
              arrows are how it reaches the next four. Hiding them there would
              leave the small screen — the one with least room — as the only place
              where half the columns are unreachable.
            */}
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

            {/*
              "Add column" lives here rather than at the end of the line.

              It used to sit where a new column would appear, which was the right
              place on a board that scrolled forever. With paging, "the end of the
              line" is the end of *this page* — so the button would move as you
              paged, and on any page but the last it would point at a spot the new
              column does not go to.
            */}
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
            /*
             * Two layouts, and `lg` is where they change over.
             *
             * Below it the board is the snapping strip the task board uses: one
             * lane per swipe, at a width you can actually read a card in. The
             * pager still applies there — it is how a phone reaches the columns
             * on page two — so the strip is a page's worth of lanes rather than
             * all of them.
             *
             * From `lg` the lanes share the width instead, and that is what
             * makes paging worth having at all: a page becomes the whole board
             * rather than the first slice of a scroller. The changeover is at
             * `lg` rather than `sm` because five lanes need roughly a thousand
             * pixels before each one is still a column and not a ribbon.
             */
            '-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-2',
            'lg:mx-0 lg:snap-none lg:overflow-x-visible lg:px-0',
            // `relative` for the exiting lanes, which `popLayout` takes out of
            // flow — see the note on `AnimatePresence` below.
            'relative items-stretch',
          )}
        >
          {/*
            `popLayout`, and this is the fix for the lane that used to blink out.

            The untagged pile disappearing the instant it empties is correct
            behaviour drawn badly: the lane was simply unmounted, so every
            column to its right teleported one lane leftwards in a single frame.

            `popLayout` takes the departing lane out of the layout flow the
            moment it starts to go, so its neighbours are given their new
            positions on that same frame — and `layout="position"` on every lane
            turns that reflow into a glide instead of a jump. The two together
            are what make the board settle rather than snap.

            `initial={false}` so the first paint of the board is not an
            animation: arriving on the tab should show a board, not build one.

            ## Why only this lane is wrapped

            Because it is the only one that *leaves*. The columns beside it come
            and go by paging, and a page turn is not eight lanes dissolving — it
            is a different view of the same board, and it should land at once
            the way a page does. Wrapping them too would have every arrow press
            run four exits and four entrances, for an effect nobody asked for
            and a window in which a half-departed lane is still a live drop
            target. They still glide, because `layout` does not need
            `AnimatePresence` to notice that a neighbour has gone.
          */}
          <AnimatePresence initial={false} mode="popLayout">
            {/*
              The untagged lane, first and only when it has something in it.

              First because it is the pile you are working *from* when you set
              the board up — it reads as an inbox, and an inbox belongs at the
              start of the line rather than after eight columns of filed work.

              It is not paged and it cannot be hidden: it is not a column
              anybody created, and a board that could tidy away the pile of
              unfiled work would be one where a task can be lost by hiding it.
            */}
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

        {/*
          Every column on this board is hidden, or the filter has emptied it.

          Worth its own sentence rather than an empty strip: the two causes have
          completely different fixes, and a board that just went blank tells the
          reader neither of them.
        */}
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

        {/*
          A new task, already filed.

          The board's own composer rather than the page's, because the column is
          the whole point of pressing "+" *here*: the tag arrives locked to the
          lane the button was in, which is the one thing the page's own "new task"
          button cannot say. See `lockedGroupId` on the composer.
        */}
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

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

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
   * What an empty lane says.
   *
   * Passed in rather than fixed at `groups.dropHere`, because under the
   * "completed" filter that sentence is a lie: dropping a live task here would
   * file it correctly and it still would not appear.
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

  /*
   * The lane shows the work due soonest and offers the rest.
   *
   * Per-lane state rather than per-board: opening "Blocked" says nothing about
   * wanting "Done" opened too, and on this board a column is a category the
   * project invented, so how much of each one matters is entirely the reader's
   * business. See `column-overflow.tsx` for why the cap is measured.
   */
  const capacity = useColumnCapacity();
  const [isOpen, setIsOpen] = useState(false);

  const ordered = useMemo(() => [...tasks].sort(byDeadline), [tasks]);
  const visible = ordered.slice(0, capacity);

  return (
    <motion.section
      ref={setNodeRef}
      /*
       * `layout="position"`, not plain `layout`.
       *
       * The full version animates the *box*, which it does by scaling — and a
       * lane's box changes height every time a card is added, ticked or
       * filtered out. Scaling a lane vertically stretches every word inside it
       * for the length of the animation, so a board in ordinary use would have
       * its type breathing on and off all day. Position-only gives exactly what
       * this is here for: when a neighbour leaves, the lanes beside it glide
       * across instead of teleporting, and nothing gets distorted doing it.
       */
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
        /*
         * A revealed-but-hidden column reads as a ghost of itself: it is on
         * screen so it can be brought back, not because it is part of the
         * board.
         *
         * The fade is on the lane's *children* rather than on the lane. Two
         * things own `opacity` here and only one of them can win: `animate`
         * writes it inline for the enter and exit, and an inline style beats
         * any utility however specific — so an `opacity-55` on this element
         * would simply never be applied. Dimming what is inside the box leaves
         * the box's own opacity to the animation, and neither has to know
         * about the other.
         */
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

        {/*
          The two controls that belong at the top of a column.

          "+" is here because writing a task *into this category* is the most
          frequent thing anybody wants from a column they are looking at, and
          the eye is beside it because hiding is the other thing you do to a
          whole column. The ones that change what the column *is* — rename,
          recolour, reorder, delete — moved to the footer: they are rare, they
          are destructive, and they were previously one mis-tap away from the
          spot the pointer lands on when reaching for the header.
        */}
        {(onAddTask || onToggleHidden) && (
          <span className="flex shrink-0 items-center gap-1">
            {onAddTask && (
              /*
                Drawn as a filled control, not as a hover-only glyph.

                It was a 24px icon in `--content-faint` that only took the brand
                colour once the pointer was already on it, sitting beside a
                second 24px icon that looked identical until then. Which meant
                the most-used control on a column was the least visible thing in
                its header, and on touch — where there is no hover at all — it
                never announced itself as a button in the first place.

                So it now carries the brand tint at rest, is a 28px target
                rather than 24, and the hover *fills* rather than merely tints:
                the state change reads as a press being invited. The eye beside
                it keeps the quiet treatment, which is what makes this one the
                obvious primary action of the two.
              */
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

        {/* The rest of the column, folded away. Still inside the droppable, so
            a card can be dropped into a lane that is showing four of twenty —
            see the same arrangement on the status board. */}
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
 * One pager arrow: a button, and a drop target for the same page turn.
 *
 * Both, because the board pages and the cards drag, and a page you cannot reach
 * with a card in your hand is a page you cannot file into. Hovering one of
 * these mid-drag turns the page under it — the throttle lives on the board, in
 * `handleDragOver`.
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
 * What a column *is*: its order, its name, and whether it goes on existing.
 *
 * At the foot of the lane rather than in its header. These are the rare and the
 * destructive controls, and the header is where the pointer lands when somebody
 * reaches for a column — putting "delete" there and "add a task" nowhere had it
 * exactly backwards.
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
 * One dialog for creating and for renaming.
 *
 * The two differ by a title and by what the fields start as, which is not two
 * dialogs' worth of difference — and keeping them together is what stops the
 * name limit, the colour palette and the submit guard from drifting apart.
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

  // Re-seeded on every open: the dialog is mounted by the board, so its state
  // would otherwise be whatever was last typed into it — including the name of
  // a different column.
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
      // The mutation's `onError` has already said what went wrong — most often
      // that the name is taken. Swallowed so the dialog stays open with the
      // text in it rather than raising an unhandled rejection.
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
