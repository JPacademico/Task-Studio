import { useEffect, useMemo, useState } from 'react';
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
import { ChevronLeft, ChevronRight, Columns3, Inbox, Pencil, Plus, Trash2 } from 'lucide-react';

import {
  useCreateTaskGroup,
  useDeleteTaskGroup,
  useReorderTaskGroups,
  useTagTask,
  useTaskGroupBoard,
  useUpdateTaskGroup,
} from '@/entities/task-group/model/queries';
import type { GroupedTask, TaskGroupColumn } from '@/entities/task-group/model/types';
import { MAX_GROUPS_PER_PROJECT, TASK_COLORS, TEXT_LIMITS } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { clampOnPaste, clampText } from '@/shared/lib/text';
import { Button, ColorPicker, EmptyState, Input, Modal, Skeleton } from '@/shared/ui';
import { useT } from '@/shared/i18n';
import { GroupTaskCard } from './group-task-card';

interface GroupsBoardProps {
  projectId: string;
  /** Opens the ordinary task sheet — this board draws cards, it does not own them. */
  onOpenTask: (taskId: string) => void;
}

/** The droppable id for the dynamic lane. Not a uuid, so it cannot collide. */
const UNTAGGED = 'untagged';

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
 * on this board can mark somebody's work done by accident. There is exactly one
 * place a status is set, and it is the other board.
 *
 * ## The untagged lane
 *
 * Not a column, and not a row in the database — it is where a task is when it
 * has not been filed. It appears only when something is in it, so a project
 * that has tagged everything sees a clean board rather than a permanent empty
 * lane; and it is the source anybody drags *from* when they first set the
 * columns up.
 *
 * ## Why the columns reorder with buttons rather than by dragging
 *
 * Because the cards already own the drag gesture. Nesting a second draggable
 * axis inside the same `DndContext` means every column header becomes a place
 * where "did you mean to move the column or the card in it" has to be guessed
 * from a few pixels of pointer travel — and guessed on touch, where the answer
 * is least recoverable. Two arrows in the column's own menu are unambiguous,
 * work from a keyboard, and cost one row of a popover nobody has to open.
 */
export const GroupsBoard = ({ projectId, onOpenTask }: GroupsBoardProps) => {
  const t = useT();

  const { data: board, isLoading } = useTaskGroupBoard(projectId);
  const createGroup = useCreateTaskGroup(projectId);
  const updateGroup = useUpdateTaskGroup(projectId);
  const deleteGroup = useDeleteTaskGroup(projectId);
  const reorder = useReorderTaskGroups(projectId);
  const tagTask = useTagTask(projectId);

  const [activeId, setActiveId] = useState<string | null>(null);
  /** `'new'` while creating, a column while renaming, `null` when closed. */
  const [editing, setEditing] = useState<'new' | TaskGroupColumn | null>(null);

  const sensors = useSensors(
    // Matches the task board exactly: a small activation distance keeps a tap
    // from becoming an accidental drag, and touch waits for a deliberate hold.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } }),
  );

  const groups = useMemo(() => board?.groups ?? [], [board?.groups]);
  const untagged = board?.untagged ?? [];
  const canManage = board?.canManage ?? false;
  const isFull = groups.length >= MAX_GROUPS_PER_PROJECT;

  const activeTask = useMemo(() => {
    if (!activeId || !board) return null;
    return (
      board.groups.flatMap((group) => group.tasks).find((task) => task.id === activeId) ??
      board.untagged.find((task) => task.id === activeId) ??
      null
    );
  }, [activeId, board]);

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);

    const taskId = String(event.active.id);
    const over = event.over?.id;
    if (!over) return;

    const nextGroupId = over === UNTAGGED ? null : String(over);
    const current = (event.active.data.current as { groupId: string | null } | undefined)?.groupId;

    // A drop back into the lane it came from is a no-op, not a request.
    if (current === nextGroupId) return;

    tagTask.mutate({ taskId, groupId: nextGroupId });
  };

  if (isLoading || !board) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-[220px] rounded-2xl" />
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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(event: DragStartEvent) => setActiveId(String(event.active.id))}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div
        className={cn(
          // The same snapping strip the task board uses on a phone, so a wide
          // board is one swipe per column rather than a page of scrolling.
          '-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-2 sm:mx-0 sm:px-0',
        )}
      >
        {/*
          The untagged lane, first and only when it has something in it.

          First because it is the pile you are working *from* when you set the
          board up — it reads as an inbox, and an inbox belongs at the start of
          the line rather than after eight columns of filed work.
        */}
        {untagged.length > 0 && (
          <Lane
            id={UNTAGGED}
            title={t('groups.untagged')}
            hint={t('groups.untaggedHint')}
            count={untagged.length}
            accent={null}
            tasks={untagged}
            onOpenTask={onOpenTask}
          />
        )}

        {groups.map((group, index) => (
          <Lane
            key={group.id}
            id={group.id}
            title={group.name}
            count={group.tasks.length}
            accent={group.color}
            tasks={group.tasks}
            onOpenTask={onOpenTask}
            controls={
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
                    const message = group.tasks.length
                      ? t('groups.deleteConfirmWithTasks', {
                          name: group.name,
                          count: String(group.tasks.length),
                        })
                      : t('groups.deleteConfirm', { name: group.name });
                    if (window.confirm(message)) deleteGroup.mutate(group.id);
                  }}
                />
              )
            }
          />
        ))}

        {/* The "add" affordance lives at the end of the line, where a new
            column would appear — not in a toolbar above the board. */}
        {canManage && (
          <div className="flex w-[82vw] shrink-0 snap-start items-start sm:w-[260px]">
            <button
              type="button"
              onClick={() => setEditing('new')}
              disabled={isFull}
              title={isFull ? t('groups.full', { max: String(MAX_GROUPS_PER_PROJECT) }) : undefined}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed',
                'border-edge px-3 py-6 text-xs font-medium text-content-muted transition-colors',
                'hover:border-brand/50 hover:text-brand disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              {t('groups.addColumn')}
            </button>
          </div>
        )}
      </div>

      <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }}>
        {activeTask && (
          <GroupTaskCard task={activeTask} isDragging className="w-[248px] rotate-1" />
        )}
      </DragOverlay>

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
  controls?: React.ReactNode;
}

const Lane = ({ id, title, hint, count, accent, tasks, onOpenTask, controls }: LaneProps) => {
  const t = useT();
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        'group/lane flex w-[82vw] shrink-0 snap-start flex-col gap-2.5 rounded-2xl border p-2.5',
        'transition-colors duration-150 sm:w-[260px] lg:min-h-[220px] lg:p-3',
        isOver ? 'border-brand bg-brand/[0.06]' : 'border-edge bg-surface-sunken/60',
      )}
    >
      <header className="flex items-center gap-2 px-1">
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
          title={hint}
          className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-wide text-content-muted"
        >
          {title}
        </span>

        <span className="shrink-0 rounded-full bg-surface-raised px-1.5 text-xs tabular-nums text-content-faint">
          {count}
        </span>

        {controls}
      </header>

      <div className="flex flex-1 flex-col gap-2">
        {tasks.map((task) => (
          <DraggableCard key={task.id} task={task} onOpen={onOpenTask} />
        ))}

        {tasks.length === 0 && (
          <p className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-edge/70 px-3 py-6 text-center text-[11px] text-content-faint">
            {t('groups.dropHere')}
          </p>
        )}
      </div>
    </section>
  );
};

const DraggableCard = ({
  task,
  onOpen,
}: {
  task: GroupedTask;
  onOpen: (taskId: string) => void;
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
      <GroupTaskCard task={task} onOpen={onOpen} />
    </div>
  );
};

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
    'rounded p-1 text-content-faint transition-colors hover:text-content disabled:opacity-30';

  return (
    // Revealed on hover on a pointer device and always visible on touch, where
    // there is no hover to reveal anything with.
    <span className="flex shrink-0 items-center opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover/lane:opacity-100 sm:focus-within:opacity-100">
      <button
        type="button"
        onClick={() => onMove(-1)}
        disabled={!canMoveLeft}
        aria-label={t('groups.moveLeft')}
        className={button}
      >
        <ChevronLeft className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={() => onMove(1)}
        disabled={!canMoveRight}
        aria-label={t('groups.moveRight')}
        className={button}
      >
        <ChevronRight className="h-3 w-3" />
      </button>
      <button type="button" onClick={onRename} aria-label={t('groups.rename')} className={button}>
        <Pencil className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={t('groups.delete')}
        className={cn(button, 'hover:text-danger')}
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </span>
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
