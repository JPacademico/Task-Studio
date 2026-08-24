import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Check,
  FileText,
  Flag,
  Pencil,
  Play,
  Plus,
  StickyNote,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';

import {
  useCreateNote,
  useDeleteNote,
  useNotes,
  useUpdateNote,
} from '@/entities/note/model/queries';
import { useProjectDocuments } from '@/entities/document/model/queries';
import { NoteAuthorStamp } from '@/entities/note/ui/note-author';
import { completionProgress, isSharedTask } from '@/entities/task/lib/completion';
import { useChecklistMutations, useTask } from '@/entities/task/model/queries';
import type { Task } from '@/entities/task/model/types';
import { TaskTypeTag } from '@/entities/task/ui/task-type-tag';
import { useCurrentUser } from '@/features/auth/model/session.store';
import { NOTE_COLORS, TASK_STATUS_META, TEXT_LIMITS } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { clampText, truncateText } from '@/shared/lib/text';
import { readableInk } from '@/shared/lib/colors';
import { formatDateTime, formatDeadline, formatDeadlineDate } from '@/shared/lib/dates';
import {
  Avatar,
  AvatarStack,
  Badge,
  Button,
  FileAttachmentRow,
  Modal,
  Spinner,
  ZoomableImage,
} from '@/shared/ui';
import { useT } from '@/shared/i18n';

interface TaskDetailModalProps {
  taskId: string | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
}

/**
 * Everything attached to a single task: the sub-checklist, its notes, the
 * documents pinned to it, and the pages written against it on the text board.
 *
 * The AI sub-task suggester used to live on the checklist header here. It is
 * gone: the project's own assistant tab does the same job with the whole board
 * in view, and a second entry point to the same model on the densest surface in
 * the app was a button most people pressed once out of curiosity.
 */
export const TaskDetailModal = ({ taskId, onClose, onEdit }: TaskDetailModalProps) => {
  const t = useT();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const { data: task, isLoading } = useTask(taskId ?? undefined);
  const checklist = useChecklistMutations(taskId ?? '');

  /*
   * Pages somebody has written against this task, on the project's text board.
   *
   * Scoped to the task, so this is a short list — usually none, sometimes one.
   * Only asked for once there is a project to ask about: a personal task has no
   * text board behind it, and the endpoint would answer with the caller's own
   * desk, which is a different thing entirely.
   */
  const { data: linkedDocuments = [] } = useProjectDocuments(
    task?.project?.id,
    task?.project ? task.id : undefined,
  );

  const noteParams = { taskId: taskId ?? undefined };
  const { data: notes = [] } = useNotes(taskId ? noteParams : {});
  const createNote = useCreateNote(noteParams);
  const updateNote = useUpdateNote(noteParams);
  const deleteNote = useDeleteNote(noteParams);

  const [itemDraft, setItemDraft] = useState('');
  const [noteDraft, setNoteDraft] = useState('');

  return (
    <Modal
      isOpen={Boolean(taskId)}
      onClose={onClose}
      title={task ? truncateText(task.title, TEXT_LIMITS.taskTitle) : 'Task'}
      // A personal task has no project to name, so the subtitle says what it
      // is instead of leaving the header looking half-rendered.
      description={task ? (task.project?.name ?? t('agenda.personal')) : undefined}
      className="sm:max-w-2xl"
      // A task sheet is the densest surface in the app; the skin keeps its
      // palette, border and shadow here but gives up its pattern.
      flat
      footer={
        task && (
          <>
            <Button variant="ghost" onClick={onClose}>
              {t('common.close')}
            </Button>
            <Button variant="secondary" onClick={() => onEdit(task)}>
              <Pencil className="h-3.5 w-3.5" />
              {t('task.editTask')}
            </Button>
          </>
        )
      }
    >
      {isLoading || !task ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            {/* Room to spell it out here, unlike a card's badge row. */}
            <TaskTypeTag type={task.type} variant="full" />
            <Badge dot={TASK_STATUS_META[task.status].dot}>
              {t(TASK_STATUS_META[task.status].label)}
            </Badge>
            {task.dueAt && (
              <Badge className={cn(task.isOverdue && 'border-danger/40 text-danger')}>
                {formatDeadline(task.dueAt)}
              </Badge>
            )}
            <span className="ml-auto">
              <AvatarStack people={task.assignees} max={5} size="sm" />
            </span>
          </div>

          {/*
            Wrapped, and bounded in height.

            `whitespace-pre-wrap` alone was the bug: it honours every newline
            and every space in a pasted block, and it does *not* break a long
            unbroken token — so a description pasted from a web page either ran
            off the side of the sheet or turned into a thousand-line column
            that pushed the checklist, the notes and the attachments out of
            reach. `break-words` handles the first, the height cap and its own
            scroller handle the second.
          */}
          {task.description && (
            <p className="scrollbar-thin max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-surface-sunken p-3.5 text-sm leading-relaxed text-content-muted">
              {task.description}
            </p>
          )}

          {/* Small, whole, and cheap until somebody actually wants to look at
              it — see `ZoomableImage`. */}
          {task.attachmentUrl && (
            <ZoomableImage
              src={task.attachmentUrl}
              thumbSrc={task.attachmentThumbUrl}
              alt={`${task.title} — attachment`}
            />
          )}

          {/* The attached paper. A row rather than a preview: rendering a PDF
              inline is a second document viewer to build and a megabyte to
              fetch before anybody has said they want it. */}
          {task.file && <FileAttachmentRow file={task.file} />}

          {/*
            Pages written against this task, on the project's text board.

            The link was one-directional until now: the board could say which
            task a page belonged to, and the task could not say a page existed.
            So somebody reading a task with a whole spec attached to it had no
            way to reach the spec except by opening the text board and reading
            titles. `?tab=text&doc=` is what makes that one click — see
            `ProjectPage` for why the tab lives in the URL.
          */}
          {linkedDocuments.length > 0 && task.project && (
            <section className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="h-3.5 w-3.5" />
                {t('doc.linkedDocuments')}
                <span className="text-xs font-normal text-content-faint">
                  {linkedDocuments.length}
                </span>
              </h3>

              <ul className="space-y-1.5">
                {linkedDocuments.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => {
                        // Closed first: the sheet is a modal over the board, and
                        // leaving it mounted over the tab we just navigated to
                        // would hide the thing the click asked for.
                        onClose();
                        navigate(
                          `/projects/${task.project?.id}?tab=text&doc=${entry.id}`,
                        );
                      }}
                      className={cn(
                        'group/doc flex w-full items-center gap-2.5 rounded-xl border border-edge',
                        'bg-surface-sunken px-3 py-2.5 text-left transition-colors duration-150',
                        'hover:border-brand/50 hover:bg-brand/[0.06]',
                      )}
                    >
                      <span
                        aria-hidden
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand/12 text-brand"
                      >
                        <FileText className="h-4 w-4" />
                      </span>

                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block truncate text-xs font-semibold">
                          {entry.title}
                        </span>
                        <span className="block truncate text-[10px] text-content-faint">
                          {entry.excerpt || t('doc.emptyPage')}
                        </span>
                      </span>

                      <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-content-faint transition-colors group-hover/doc:text-brand">
                        {t('doc.openOnTextBoard')}
                        <ArrowUpRight className="h-3 w-3" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/*
            Who and when, on one line.

            This was four sentences in a two-column grid — "Created by Ana",
            "Starts 3 Mar 2026 · 14:00", "Due …", "Completed …" — which spent
            four rows of the sheet restating labels the icons carry. The
            creator becomes a face, and the dates become a rail read left to
            right: start, then deadline, then the tick if it landed. Each stamp
            still carries the full, spelled-out timestamp as its tooltip, so
            nothing is actually lost.
          */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span
              title={`Created by ${task.createdBy.displayName} · ${formatDateTime(task.createdAt)}`}
              className="avatar-chip inline-flex items-center gap-1.5 border border-edge bg-surface-sunken py-0.5 pr-2.5"
            >
              <Avatar
                name={task.createdBy.displayName}
                src={task.createdBy.avatarUrl}
                size="xs"
              />
              <span className="max-w-[10rem] truncate font-medium text-content-muted">
                {task.createdBy.displayName}
              </span>
            </span>

            {(task.startAt ?? task.dueAt ?? task.completedAt) && (
              <span className="inline-flex items-center gap-2 rounded-full border border-edge bg-surface-sunken px-2.5 py-1 text-content-muted">
                {task.startAt && (
                  <span
                    title={`Starts ${formatDateTime(task.startAt)}`}
                    className="inline-flex items-center gap-1"
                  >
                    <Play className="h-3 w-3 shrink-0 fill-current" />
                    <span className="tabular-nums">{formatDeadlineDate(task.startAt)}</span>
                  </span>
                )}

                {task.startAt && task.dueAt && (
                  <span aria-hidden className="text-content-faint">
                    →
                  </span>
                )}

                {task.dueAt && (
                  <span
                    title={`Due ${formatDateTime(task.dueAt)}`}
                    className={cn(
                      'inline-flex items-center gap-1',
                      task.isOverdue && 'font-semibold text-danger',
                    )}
                  >
                    <Flag className="h-3 w-3 shrink-0" />
                    <span className="tabular-nums">{formatDeadlineDate(task.dueAt)}</span>
                  </span>
                )}

                {task.completedAt && (
                  <span
                    title={`Completed ${formatDateTime(task.completedAt)}`}
                    className="inline-flex items-center gap-1 font-semibold text-positive"
                  >
                    <Check className="h-3 w-3 shrink-0" strokeWidth={3} />
                    <span className="tabular-nums">{formatDeadlineDate(task.completedAt)}</span>
                  </span>
                )}
              </span>
            )}
          </div>

          {/* --- Sign-off --------------------------------------------------
              Only for work several people carry. On a single-assignee task the
              tick on the card already says everything this section would, and
              a roster of one is not a roster. */}
          {isSharedTask(task) && (
            <section className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <UserCheck className="h-3.5 w-3.5" />
                {t('task.signOff')}
                <span className="text-xs font-normal text-content-faint">
                  {`${completionProgress(task).done}/${task.assignees.length}`}
                </span>
              </h3>

              <ul className="grid gap-1.5 sm:grid-cols-2">
                {task.assignees.map((assignee) => (
                  <li
                    key={assignee.id}
                    className="flex items-center gap-2 rounded-lg bg-surface-sunken px-2.5 py-1.5"
                  >
                    <Avatar name={assignee.displayName} src={assignee.avatarUrl} size="xs" />
                    <span className="min-w-0 flex-1 truncate text-xs">
                      {assignee.displayName}
                      {assignee.id === currentUser?.id && (
                        <span className="text-content-faint"> (you)</span>
                      )}
                    </span>

                    {assignee.completedAt ? (
                      <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-positive">
                        <Check className="h-3 w-3" strokeWidth={3} />
                        Done
                      </span>
                    ) : (
                      <span className="shrink-0 text-[10px] text-content-faint">{t('task.waiting')}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* --- Sub-checklist -------------------------------------------- */}
          <section className="space-y-2.5">
            <h3 className="text-sm font-semibold">
              {t('task.checklist')}{' '}
              <span className="text-xs font-normal text-content-faint">
                {task.checklistProgress.done}/{task.checklistProgress.total}
              </span>
            </h3>

            <ul className="space-y-1.5">
              {task.checklist.map((item) => (
                <li
                  key={item.id}
                  className="group flex items-center gap-2.5 rounded-lg bg-surface-sunken px-3 py-2"
                >
                  <button
                    type="button"
                    aria-label={t(item.isCompleted ? 'task.markPending' : 'task.markDone')}
                    onClick={() =>
                      checklist.toggle.mutate({ itemId: item.id, isCompleted: !item.isCompleted })
                    }
                    className={cn(
                      'grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors',
                      item.isCompleted
                        ? 'border-positive bg-positive text-white'
                        // The row sits on `surface-sunken`, so the box is
                        // filled from `surface-raised` to read as a well
                        // rather than a hole. See `--check-edge`.
                        : 'border-check bg-surface-raised/60 hover:border-brand',
                    )}
                  >
                    {item.isCompleted && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                  </button>

                  {/*
                    Truncated on the way *out*, not only on the way in.
                    `TEXT_LIMITS` stops a new step being pasted in at length,
                    but rows written before it existed are already in the
                    database, and laying one of those out inside a one-line row
                    is what made opening this sheet feel slow. The full text is
                    still on the element's `title`.
                  */}
                  <span
                    title={item.content.length > TEXT_LIMITS.checklistItem ? item.content : undefined}
                    className={cn(
                      'min-w-0 flex-1 break-words text-xs',
                      item.isCompleted && 'text-content-faint line-through',
                    )}
                  >
                    {truncateText(item.content, TEXT_LIMITS.checklistItem)}
                  </span>

                  <button
                    type="button"
                    aria-label={t('task.removeStep')}
                    onClick={() => checklist.remove.mutate(item.id)}
                    className="text-content-faint opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>

            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (!itemDraft.trim()) return;
                checklist.add.mutate(itemDraft.trim());
                setItemDraft('');
              }}
            >
              <input
                value={itemDraft}
                onChange={(event) =>
                  setItemDraft(clampText(event.target.value, TEXT_LIMITS.checklistItem))
                }
                placeholder={t('task.addStepShort')}
                maxLength={TEXT_LIMITS.checklistItem}
                className="field h-9 text-xs"
              />
              <Button type="submit" size="icon" variant="secondary" aria-label={t('task.addStepAction')}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </form>
          </section>

          {/* --- Task notes ------------------------------------------------ */}
          <section className="space-y-2.5">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <StickyNote className="h-3.5 w-3.5" />
              {t('task.notes')}
            </h3>

            <div className="flex flex-wrap gap-2.5">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="group/card relative w-[168px] rounded-[3px] p-2.5 pb-5 shadow-postit"
                  style={{ backgroundColor: note.color, color: readableInk(note.color) }}
                >
                  <textarea
                    defaultValue={note.content}
                    // Only the author may rewrite somebody else's paper.
                    readOnly={note.userId !== currentUser?.id}
                    maxLength={TEXT_LIMITS.noteContent}
                    onBlur={(event) =>
                      event.target.value !== note.content &&
                      updateNote.mutate({
                        noteId: note.id,
                        payload: { content: event.target.value },
                      })
                    }
                    className="h-20 w-full resize-none bg-transparent font-hand text-[13px] leading-snug outline-none"
                  />
                  {note.userId === currentUser?.id && (
                    <button
                      type="button"
                      aria-label={t('task.deleteNote')}
                      onClick={() => deleteNote.mutate(note.id)}
                      className="absolute right-1.5 top-1.5 opacity-0 transition-opacity group-hover/card:opacity-70"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}

                  {/* Who pinned it here — the whole point of a note on a task
                      somebody else is carrying. */}
                  <NoteAuthorStamp
                    author={note.author}
                    createdAt={note.createdAt}
                    isMine={note.userId === currentUser?.id}
                  />
                </div>
              ))}
            </div>

            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (!noteDraft.trim() || !taskId) return;
                createNote.mutate({
                  content: noteDraft.trim(),
                  scope: 'TASK',
                  taskId,
                  color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
                });
                setNoteDraft('');
              }}
            >
              <input
                value={noteDraft}
                onChange={(event) =>
                  setNoteDraft(clampText(event.target.value, TEXT_LIMITS.noteContent))
                }
                placeholder={t('task.pinNote')}
                maxLength={TEXT_LIMITS.noteContent}
                className="field h-9 text-xs"
              />
              <Button type="submit" size="icon" variant="secondary" aria-label={t('task.addNote')}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </form>
          </section>
        </div>
      )}
    </Modal>
  );
};
