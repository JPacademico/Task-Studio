import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  Flag,
  Pencil,
  Play,
  Plus,
  Sparkles,
  StickyNote,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  useCreateNote,
  useDeleteNote,
  useNotes,
  useUpdateNote,
} from '@/entities/note/model/queries';
import { NoteAuthorStamp } from '@/entities/note/ui/note-author';
import { completionProgress, isSharedTask } from '@/entities/task/lib/completion';
import { useChecklistMutations, useTask } from '@/entities/task/model/queries';
import type { Task } from '@/entities/task/model/types';
import { TaskTypeTag } from '@/entities/task/ui/task-type-tag';
import { aiApi, type SubtaskSuggestion } from '@/features/ai-suggestions/api/ai.api';
import { useCurrentUser } from '@/features/auth/model/session.store';
import { errorMessage } from '@/shared/api/client';
import { NOTE_COLORS, TASK_STATUS_META } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { readableInk } from '@/shared/lib/colors';
import { formatDateTime, formatDeadline, formatDeadlineDate } from '@/shared/lib/dates';
import { Avatar, AvatarStack, Badge, Button, Modal, Spinner } from '@/shared/ui';
import { useT } from '@/shared/i18n';

interface TaskDetailModalProps {
  taskId: string | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
}

/**
 * Everything attached to a single task: the sub-checklist, its notes, and the
 * AI sub-task suggestions that can be promoted into checklist items.
 */
export const TaskDetailModal = ({ taskId, onClose, onEdit }: TaskDetailModalProps) => {
  const t = useT();
  const currentUser = useCurrentUser();
  const { data: task, isLoading } = useTask(taskId ?? undefined);
  const checklist = useChecklistMutations(taskId ?? '');

  const noteParams = { taskId: taskId ?? undefined };
  const { data: notes = [] } = useNotes(taskId ? noteParams : {});
  const createNote = useCreateNote(noteParams);
  const updateNote = useUpdateNote(noteParams);
  const deleteNote = useDeleteNote(noteParams);

  const [itemDraft, setItemDraft] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [suggestions, setSuggestions] = useState<SubtaskSuggestion[]>([]);
  const [suggestionId, setSuggestionId] = useState<string | null>(null);

  const suggest = useMutation({
    mutationFn: () => aiApi.suggestSubtasks(taskId as string),
    onSuccess: (suggestion) => {
      setSuggestions(suggestion.result.suggestions ?? []);
      setSuggestionId(suggestion.id);
    },
    onError: (error) => toast.error(errorMessage(error, t('ai.unavailable'))),
  });

  const acceptSuggestions = useMutation({
    mutationFn: (titles: string[]) => aiApi.accept(suggestionId as string, titles),
    onSuccess: (result) => {
      setSuggestions([]);
      toast.success(`${result.added} step(s) added to the checklist.`);
      void checklist.add.reset();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <Modal
      isOpen={Boolean(taskId)}
      onClose={onClose}
      title={task?.title ?? 'Task'}
      description={task ? task.project.name : undefined}
      className="sm:max-w-2xl"
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
              {TASK_STATUS_META[task.status].label}
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

          {task.description && (
            <p className="whitespace-pre-wrap rounded-xl bg-surface-sunken p-3.5 text-sm leading-relaxed text-content-muted">
              {task.description}
            </p>
          )}

          {task.attachmentUrl && (
            <img
              src={task.attachmentUrl}
              alt="Task attachment"
              className="max-h-56 w-full rounded-xl border border-edge object-cover"
              loading="lazy"
            />
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
              className="inline-flex items-center gap-1.5 rounded-full border border-edge bg-surface-sunken py-0.5 pl-0.5 pr-2.5"
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

              <p className="text-[11px] leading-relaxed text-content-faint">
                Everybody assigned ticks their own box, and the task completes itself when the last
                one does. A project admin can close it early.
              </p>
            </section>
          )}

          {/* --- Sub-checklist -------------------------------------------- */}
          <section className="space-y-2.5">
            <header className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {t('task.checklist')}{' '}
                <span className="text-xs font-normal text-content-faint">
                  {task.checklistProgress.done}/{task.checklistProgress.total}
                </span>
              </h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => suggest.mutate()}
                isLoading={suggest.isPending}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {t('task.suggestSteps')}
              </Button>
            </header>

            <AnimatePresence>
              {suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden rounded-xl border border-brand/40 bg-brand/[0.06] p-3"
                >
                  <p className="text-xs font-semibold text-brand">{t('task.suggestedSubtasks')}</p>
                  <ul className="space-y-1.5">
                    {suggestions.map((suggestion) => (
                      <li key={suggestion.title} className="text-xs">
                        <p className="font-medium">{suggestion.title}</p>
                        <p className="text-content-muted">{suggestion.rationale}</p>
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      isLoading={acceptSuggestions.isPending}
                      onClick={() =>
                        acceptSuggestions.mutate(suggestions.map((item) => item.title))
                      }
                    >
                      {t('task.addAll')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSuggestions([])}>
                      {t('task.dismiss')}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
                        : 'border-edge hover:border-brand',
                    )}
                  >
                    {item.isCompleted && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                  </button>

                  <span
                    className={cn(
                      'flex-1 text-xs',
                      item.isCompleted && 'text-content-faint line-through',
                    )}
                  >
                    {item.content}
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
                onChange={(event) => setItemDraft(event.target.value)}
                placeholder={t('task.addStepShort')}
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
                onChange={(event) => setNoteDraft(event.target.value)}
                placeholder={t('task.pinNote')}
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
