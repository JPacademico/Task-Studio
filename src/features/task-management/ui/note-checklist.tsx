import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';

import { useSuggestSubtasks, useAcceptSubtasks } from '@/features/ai-suggestions/model/queries';
import { useTaskNoteMutations } from '@/entities/task/model/queries';
import type { Task, TaskNote } from '@/entities/task/model/types';
import { useCurrentUser } from '@/features/auth/model/session.store';
import { MAX_TASK_NOTES, NOTE_COLORS, TEXT_LIMITS } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { readableInk } from '@/shared/lib/colors';
import { formatDateTime, formatRelative } from '@/shared/lib/dates';
import { clampText, clampOnPaste } from '@/shared/lib/text';
import { Avatar, Button, ColorPicker, Modal } from '@/shared/ui';
import { useT } from '@/shared/i18n';

interface NoteChecklistProps {
  task: Task;
  /** Whether the AI button should be offered at all — see `AiPanel`. */
  isAiEnabled: boolean;
}

/**
 * A task's steps, written on Post-its that can be ticked off.
 *
 * ## What this replaced
 *
 * Two sections that were the same list. The sheet used to carry a sub-checklist
 * of plain rows *and*, below it, a wall of notes — so people wrote steps on
 * notes, ticked steps off in the checklist, and neither surface could see the
 * other. "Is this done" had two answers on one screen, and the progress badge
 * on the card counted only one of them.
 *
 * This is the merge, and it kept the note rather than the row, because a note
 * already carried the two things a checklist row could not: a colour, and an
 * author. A step written by somebody else on work you are carrying is a
 * different thing from a step you wrote yourself, and the handwriting is how
 * you tell.
 *
 * ## The three gestures, and why each is where it is
 *
 * - **Add** opens a modal with an empty Post-it in it, rather than an inline
 *   field. A note is a small piece of writing with a colour, and a one-line
 *   input at the bottom of a section cannot offer either without becoming a
 *   form. Capped at `MAX_TASK_NOTES`, which the API enforces independently.
 * - **Tap a note** opens it at reading size — the same idea as
 *   `ZoomableImage`, for the same reason: three notes side by side is a
 *   summary, and a summary has to be openable when the thing it summarises is
 *   longer than the box.
 * - **The checkbox** is on the note itself and never opens it. Ticking is the
 *   most frequent thing anybody does here, and it must not cost a modal.
 */
export const NoteChecklist = ({ task, isAiEnabled }: NoteChecklistProps) => {
  const t = useT();
  const currentUser = useCurrentUser();
  const notes = useTaskNoteMutations(task.id);

  const suggest = useSuggestSubtasks(task.id);
  const accept = useAcceptSubtasks();

  /** The note being read, or `null`. Also the "am I composing" flag when new. */
  const [reading, setReading] = useState<TaskNote | null>(null);
  const [isComposing, setIsComposing] = useState(false);

  const [draft, setDraft] = useState('');
  const [draftColor, setDraftColor] = useState<string>(NOTE_COLORS[0]);

  const isFull = task.notes.length >= MAX_TASK_NOTES;
  const done = task.noteProgress.done;
  const total = task.noteProgress.total;

  // A fresh sheet every time the composer opens, so yesterday's abandoned
  // half-sentence is never what somebody starts typing into.
  useEffect(() => {
    if (!isComposing) return;
    setDraft('');
    setDraftColor(NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)]);
  }, [isComposing]);

  const handleAdd = async () => {
    const content = draft.trim();
    if (!content) return;

    try {
      await notes.add.mutateAsync({ content, color: draftColor });
      setIsComposing(false);
    } catch {
      // `onError` on the mutation has already said what went wrong — most
      // often that the task is full. Swallowed so the composer stays open
      // with the text still in it rather than raising an unhandled rejection.
    }
  };

  /**
   * Asks the model for steps and files whichever ones fit, in one press.
   *
   * Deliberately not a two-step "suggest, then review, then accept". That flow
   * exists on the project's assistant tab, where the model is proposing *whole
   * tasks* and getting one wrong is expensive. Here it is proposing at most
   * three short lines onto a list capped at three, every one of which can be
   * torn up with one click — so a review step would be a dialog asking
   * permission for something cheaper to undo than to confirm.
   */
  const handleSuggest = async () => {
    try {
      const suggestion = await suggest.mutateAsync();
      await accept.mutateAsync({ suggestionId: suggestion.id });
    } catch {
      // Both mutations toast their own failure.
    }
  };

  const isSuggesting = suggest.isPending || accept.isPending;

  return (
    <section className="space-y-2.5">
      <h3 className="flex flex-wrap items-center gap-2 text-sm font-semibold">
        {t('task.noteChecklist')}
        {total > 0 && (
          <span
            className={cn(
              'text-xs font-normal tabular-nums',
              done === total ? 'text-positive' : 'text-content-faint',
            )}
          >
            {done}/{total}
          </span>
        )}

        <span className="ml-auto flex items-center gap-1.5">
          {/*
            The suggester, offered only where it can work.

            Hidden rather than disabled when the model is not configured: a
            greyed-out sparkle on a server with no API key is a promise the
            deployment cannot keep. Hidden when the list is full for the same
            reason — there is nowhere for a suggestion to go.
          */}
          {isAiEnabled && !isFull && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => void handleSuggest()}
              isLoading={isSuggesting}
              title={t('task.suggestStepsHint')}
            >
              {isSuggesting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">{t('task.suggestSteps')}</span>
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setIsComposing(true)}
            disabled={isFull}
            title={isFull ? t('task.noteChecklistFull', { max: String(MAX_TASK_NOTES) }) : undefined}
            aria-label={t('task.addNote')}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </span>
      </h3>

      {task.notes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-edge px-3 py-4 text-center text-[11px] leading-relaxed text-content-faint">
          {t('task.noteChecklistEmpty')}
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2.5">
          <AnimatePresence initial={false}>
            {task.notes.map((note) => (
              <motion.li
                key={note.id}
                layout
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                className="gpu"
              >
                <NoteCard
                  note={note}
                  isMine={note.userId === currentUser?.id}
                  onOpen={() => setReading(note)}
                  onToggle={() =>
                    notes.toggle.mutate({ noteId: note.id, isCompleted: !note.isCompleted })
                  }
                  onDelete={() => notes.remove.mutate(note.id)}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      {/* --- Composing a new one -------------------------------------- */}
      <Modal
        isOpen={isComposing}
        onClose={() => setIsComposing(false)}
        title={t('task.newNote')}
        description={t('task.newNoteHint')}
        flat
        className="sm:max-w-md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsComposing(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => void handleAdd()}
              isLoading={notes.add.isPending}
              disabled={draft.trim().length === 0}
            >
              <Plus className="h-3.5 w-3.5" />
              {t('common.add')}
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          {/* The real thing, at the size it will be read at — not a form field
              that becomes a Post-it somewhere else. */}
          <div
            className="mx-auto w-full max-w-[280px] rounded-[3px] p-3.5 shadow-postit"
            style={{ backgroundColor: draftColor, color: readableInk(draftColor) }}
          >
            <textarea
              value={draft}
              autoFocus
              onChange={(event) =>
                setDraft(clampText(event.target.value, TEXT_LIMITS.noteContent))
              }
              onPaste={(event) => clampOnPaste(event, TEXT_LIMITS.noteContent)}
              maxLength={TEXT_LIMITS.noteContent}
              placeholder={t('task.newNotePlaceholder')}
              className="h-32 w-full resize-none bg-transparent font-hand text-[15px] leading-snug outline-none placeholder:opacity-50"
            />
          </div>

          <ColorPicker
            label={t('task.noteColour')}
            value={draftColor}
            onChange={setDraftColor}
            options={NOTE_COLORS}
          />

          <p className="text-right text-[10px] tabular-nums text-content-faint">
            {draft.length}/{TEXT_LIMITS.noteContent}
          </p>
        </div>
      </Modal>

      {/* --- Reading one ----------------------------------------------- */}
      <Modal
        isOpen={reading !== null}
        onClose={() => setReading(null)}
        title={t('task.note')}
        flat
        className="sm:max-w-md"
        footer={
          reading && (
            <>
              <Button variant="ghost" onClick={() => setReading(null)}>
                {t('common.close')}
              </Button>
              <Button
                variant={reading.isCompleted ? 'secondary' : 'primary'}
                onClick={() => {
                  notes.toggle.mutate({
                    noteId: reading.id,
                    isCompleted: !reading.isCompleted,
                  });
                  setReading(null);
                }}
              >
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                {t(reading.isCompleted ? 'task.markPending' : 'task.markDone')}
              </Button>
            </>
          )
        }
      >
        {reading && (
          <div className="space-y-3.5">
            <div
              className="mx-auto w-full max-w-[300px] rounded-[3px] p-4 shadow-postit"
              style={{ backgroundColor: reading.color, color: readableInk(reading.color) }}
            >
              {/*
                `break-words` as well as `whitespace-pre-wrap`.

                The second honours the newlines somebody typed; without the
                first, a pasted URL with no spaces in it runs straight off the
                side of the note and takes the dialog's layout with it.
              */}
              <p
                className={cn(
                  'max-h-[50vh] overflow-y-auto whitespace-pre-wrap break-words font-hand text-[15px] leading-relaxed',
                  reading.isCompleted && 'line-through opacity-60',
                )}
              >
                {reading.content}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-content-muted">
              <span className="inline-flex items-center gap-1.5">
                <Avatar
                  name={reading.author.displayName}
                  src={reading.author.avatarUrl}
                  size="xs"
                />
                {reading.author.displayName}
              </span>
              <span className="text-content-faint">·</span>
              <span title={formatDateTime(reading.createdAt)}>
                {formatRelative(reading.createdAt)}
              </span>

              {reading.isCompleted && reading.completedAt && (
                <span
                  className="ml-auto inline-flex items-center gap-1 font-semibold text-positive"
                  title={formatDateTime(reading.completedAt)}
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                  {reading.completedBy
                    ? t('task.tickedBy', { name: reading.completedBy.displayName })
                    : t('task.ticked')}
                </span>
              )}
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
};

interface NoteCardProps {
  note: TaskNote;
  isMine: boolean;
  onOpen: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

/**
 * One step, as a Post-it.
 *
 * The whole face is a button that opens it, with the checkbox and the bin
 * layered *over* that button rather than inside it — nested interactive
 * elements are invalid HTML and, more practically, a checkbox inside a button
 * fires both handlers on one tap. `stopPropagation` on the two overlays is what
 * keeps ticking from also opening.
 *
 * ## What the closed note does not show
 *
 * Its author. There is a 150×112 square here, and it was spending its bottom
 * quarter on a 16px avatar and a name at 9px — text below the size anybody
 * reads, on the one surface in the app where the writing is the whole point.
 * Three lines of somebody's step, clamped, with a face under it is a note you
 * have to open to read; four lines without one usually is not.
 *
 * The author has not gone anywhere: the note is a button, and opening it puts
 * the avatar, the full name and the time it was written under the text at
 * reading size — see the reading dialog above. That is the right altitude for
 * it. "Who wrote this" is a question you ask *about* a step you have already
 * read, not one you need answered on every tile of a wall you are scanning.
 */
const NoteCard = ({ note, isMine, onOpen, onToggle, onDelete }: NoteCardProps) => {
  const t = useT();

  return (
    <div className="group/note relative">
      <button
        type="button"
        onClick={onOpen}
        // The tooltip carries what the face used to: hovering still says who
        // wrote it, without spending a quarter of the note to do so.
        title={t('task.noteBy', { name: note.author.displayName })}
        className={cn(
          'block h-[112px] w-[150px] rounded-[3px] p-2.5 pt-7 text-left shadow-postit',
          'transition-transform duration-150 hover:-translate-y-0.5 focus-visible:-translate-y-0.5',
          note.isCompleted && 'opacity-70',
        )}
        style={{ backgroundColor: note.color, color: readableInk(note.color) }}
      >
        {/* Four lines, then an ellipsis — one more than before, which is what
            the author strip was costing. The note opens for the rest. */}
        <span
          className={cn(
            'line-clamp-4 break-words font-hand text-[13px] leading-snug',
            note.isCompleted && 'line-through',
          )}
        >
          {note.content}
        </span>
      </button>

      {/* Ticking is the most frequent gesture here, so it sits on the note
          itself and never costs a modal. */}
      <button
        type="button"
        aria-label={t(note.isCompleted ? 'task.markPending' : 'task.markDone')}
        aria-pressed={note.isCompleted}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        className={cn(
          'absolute left-2 top-2 grid h-4 w-4 place-items-center rounded border transition-colors',
          note.isCompleted
            ? 'border-positive bg-positive text-white'
            : 'border-black/25 bg-white/70 hover:border-brand',
        )}
      >
        {note.isCompleted && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
      </button>

      {/* Only the author may tear up their own note — the same rule the API
          enforces on `DELETE /notes/:id`. */}
      {isMine && (
        <button
          type="button"
          aria-label={t('task.deleteNote')}
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          className="absolute right-1.5 top-1.5 rounded p-0.5 opacity-0 transition-opacity hover:text-danger focus-visible:opacity-100 group-hover/note:opacity-70"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};
