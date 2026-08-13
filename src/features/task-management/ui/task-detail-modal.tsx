import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Pencil, Plus, Sparkles, StickyNote, Trash2, UserCheck, X } from 'lucide-react';
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
import { formatDateTime, formatDeadline } from '@/shared/lib/dates';
import { Avatar, AvatarStack, Badge, Button, Modal, Spinner } from '@/shared/ui';

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
    onError: (error) => toast.error(errorMessage(error, 'The assistant is unavailable.')),
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
              Close
            </Button>
            <Button variant="secondary" onClick={() => onEdit(task)}>
              <Pencil className="h-3.5 w-3.5" />
              Edit task
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

          <div className="grid gap-2 text-[11px] text-content-faint sm:grid-cols-2">
            <span>Created by {task.createdBy.displayName}</span>
            {task.startAt && <span>Starts {formatDateTime(task.startAt)}</span>}
            {task.dueAt && <span>Due {formatDateTime(task.dueAt)}</span>}
            {task.completedAt && <span>Completed {formatDateTime(task.completedAt)}</span>}
          </div>

          {/* --- Sign-off --------------------------------------------------
              Only for work several people carry. On a single-assignee task the
              tick on the card already says everything this section would, and
              a roster of one is not a roster. */}
          {isSharedTask(task) && (
            <section className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <UserCheck className="h-3.5 w-3.5" />
                Sign-off
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
                      <span className="shrink-0 text-[10px] text-content-faint">Waiting</span>
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
                Checklist{' '}
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
                Suggest steps
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
                  <p className="text-xs font-semibold text-brand">Suggested sub-tasks</p>
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
                      Add all
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSuggestions([])}>
                      Dismiss
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
                    aria-label={item.isCompleted ? 'Mark as pending' : 'Mark as done'}
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
                    aria-label="Remove step"
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
                placeholder="Add a step"
                className="field h-9 text-xs"
              />
              <Button type="submit" size="icon" variant="secondary" aria-label="Add step">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </form>
          </section>

          {/* --- Task notes ------------------------------------------------ */}
          <section className="space-y-2.5">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <StickyNote className="h-3.5 w-3.5" />
              Notes
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
                      aria-label="Delete note"
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
                placeholder="Pin a note to this task"
                className="field h-9 text-xs"
              />
              <Button type="submit" size="icon" variant="secondary" aria-label="Add note">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </form>
          </section>
        </div>
      )}
    </Modal>
  );
};
