import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Check,
  FileText,
  Flag,
  MessagesSquare,
  Pencil,
  Play,
  UserCheck,
} from 'lucide-react';

import { useProjectDocuments } from '@/entities/document/model/queries';
import { completionProgress, isSharedTask } from '@/entities/task/lib/completion';
import { useTask } from '@/entities/task/model/queries';
import { useTaskUnread } from '@/entities/task-comment/model/queries';
import { useAiStatus } from '@/features/ai-suggestions/model/queries';
import type { Task } from '@/entities/task/model/types';
import { TaskTypeTag } from '@/entities/task/ui/task-type-tag';
import { useCurrentUser } from '@/features/auth/model/session.store';
import { useChatDock } from '@/features/project-chat-dock/model/chat-dock.store';
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
  PostItMark,
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
 * Everything attached to a single task: its note checklist, the documents pinned to it, and the
 * pages written against it on the text board.
 */
export const TaskDetailModal = ({ taskId, onClose, onEdit }: TaskDetailModalProps) => {
  const t = useT();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const { data: task, isLoading } = useTask(taskId ?? undefined);
  // Only to decide whether the note checklist draws its suggest button — see
  // `useAiStatus`, which is cached across every surface that asks.
  const { data: aiStatus } = useAiStatus();
  const openThread = useChatDock((state) => state.openThread);
  const unreadComments = useTaskUnread(taskId ?? undefined);

  // Pages somebody has written against this task, on the project's text board. Scoped to the task,
  // so this is a short list — usually none, sometimes one.
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
            {/* The task's thread, in the project chat. Bottom left, apart from close and edit. */}
            {task.project && task.commentsEnabled && (
              <span className="relative mr-auto inline-flex">
                <Button
                  variant="outline"
                  onClick={() => {
                    const project = task.project;
                    if (!project) return;
                    onClose();
                    openThread(project.id, project.name, task.id);
                  }}
                  aria-label={
                    unreadComments > 0
                      ? `${t('task.taskChat')} — ${t('threads.unread', { count: String(unreadComments) })}`
                      : undefined
                  }
                >
                  <MessagesSquare className="h-3.5 w-3.5" />
                  {t('task.taskChat')}
                </Button>
                {unreadComments > 0 && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -right-2 -top-2.5 text-amber-400 drop-shadow-[0_2px_3px_rgb(0_0_0/0.35)]"
                  >
                    <PostItMark count={unreadComments} className="h-5 w-5" />
                  </span>
                )}
              </span>
            )}
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

          {/* Wrapped, and bounded in height. `whitespace-pre-wrap` alone was the bug: it
              honours every newline and every space in a pasted block. */}
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

          {/* The attached paper. */}
          {task.file && <FileAttachmentRow file={task.file} />}

          {/* Pages written against this task, on the project's text board. The link was
              one-directional until now: the board could say. */}
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
                        // Closed first: the sheet is a modal over the board.
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

          {/* Who and when, on one line. This was four sentences in a two-column grid — "Created
              by Ana", "Starts 3 Mar 2026 · 14:00", "Due …", "Completed …". */}
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

          {/* --- Sign-off ---
              Only for work several people carry. */}
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

          {/* The note checklist. One section where there were two. The sheet used to carry a
              sub-checklist of plain rows *and*. */}
          <NoteChecklist task={task} isAiEnabled={Boolean(aiStatus?.enabled)} />

        </div>
      )}
    </Modal>
  );
};
