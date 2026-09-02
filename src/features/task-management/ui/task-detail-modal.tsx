import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Check,
  FileText,
  Flag,
  Pencil,
  Play,
  UserCheck,
} from 'lucide-react';

import { useProjectDocuments } from '@/entities/document/model/queries';
import { completionProgress, isSharedTask } from '@/entities/task/lib/completion';
import { useTask } from '@/entities/task/model/queries';
import { useAiStatus } from '@/features/ai-suggestions/model/queries';
import type { Task } from '@/entities/task/model/types';
import { TaskTypeTag } from '@/entities/task/ui/task-type-tag';
import { useCurrentUser } from '@/features/auth/model/session.store';
import { TASK_STATUS_META, TEXT_LIMITS } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { truncateText } from '@/shared/lib/text';
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
import { NoteChecklist } from './note-checklist';

interface TaskDetailModalProps {
  taskId: string | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
}

/**
 * Everything attached to a single task: its note checklist, the documents
 * pinned to it, and the pages written against it on the text board.
 *
 * The sheet used to carry two lists — a sub-checklist of plain rows and, below
 * it, a wall of Post-its. They were the same list, and neither half could see
 * the other, so a step written on a note and a step ticked in the checklist
 * were two different answers to one question. `NoteChecklist` is the merge.
 */
export const TaskDetailModal = ({ taskId, onClose, onEdit }: TaskDetailModalProps) => {
  const t = useT();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const { data: task, isLoading } = useTask(taskId ?? undefined);
  // Only to decide whether the note checklist draws its suggest button — see
  // `useAiStatus`, which is cached across every surface that asks.
  const { data: aiStatus } = useAiStatus();

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
                        <span className="block truncate text-3xs text-content-faint">
                          {entry.excerpt || t('doc.emptyPage')}
                        </span>
                      </span>

                      <span className="inline-flex shrink-0 items-center gap-1 text-3xs font-semibold text-content-faint transition-colors group-hover/doc:text-brand">
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
          <div className="flex flex-wrap items-center gap-1.5 text-2xs">
            <span
              title={t('common.createdBy', {
                name: task.createdBy.displayName,
                date: formatDateTime(task.createdAt),
              })}
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
                    title={t('common.startsOn', { date: formatDateTime(task.startAt) })}
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
                    title={t('common.dueOn', { date: formatDateTime(task.dueAt) })}
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
                    title={t('common.completedOn', { date: formatDateTime(task.completedAt) })}
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
                      <span className="inline-flex shrink-0 items-center gap-1 text-3xs font-semibold text-positive">
                        <Check className="h-3 w-3" strokeWidth={3} />
                        Done
                      </span>
                    ) : (
                      <span className="shrink-0 text-3xs text-content-faint">{t('task.waiting')}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/*
            The note checklist.

            One section where there were two. The sheet used to carry a
            sub-checklist of plain rows *and*, below it, a wall of Post-its —
            the same list drawn twice, neither half aware of the other. See
            `NoteChecklist`.
          */}
          <NoteChecklist task={task} isAiEnabled={Boolean(aiStatus?.enabled)} />

        </div>
      )}
    </Modal>
  );
};
