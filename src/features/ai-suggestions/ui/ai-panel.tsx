import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarClock, Check, MessageSquareText, Sparkles, Wand2, X } from 'lucide-react';
import { toast } from '@/shared/lib/toast';

import { useAddCreatedTasks } from '@/entities/task/model/queries';
import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { useT } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { Badge, Button, EmptyState, Section, Spinner, Textarea } from '@/shared/ui';
import { aiApi, type ProjectTaskSuggestion } from '../api/ai.api';
import { useSuggestionStream } from '../model/use-suggestion-stream';

/**
 * The proposed window in words, from the offsets the model returned.
 *
 * Deliberately relative rather than a formatted date: the suggestion carries
 * offsets, and the real timestamps are only computed when it is accepted, so
 * printing an absolute date here would be showing a value that does not exist
 * yet and could still shift if the card sits unaccepted for a while.
 */
const describeSchedule = (
  t: ReturnType<typeof useT>,
  task: ProjectTaskSuggestion,
): string => {
  const days = task.startOffsetDays ?? 0;
  const hours = task.durationHours ?? 0;

  const start =
    days === 0 ? t('ai.startsToday') : t('ai.startsInDays', { count: String(days) });

  const length =
    hours < 24
      ? t('ai.lastsHours', { count: String(hours) })
      : t('ai.lastsDays', { count: String(Math.round(hours / 24)) });

  return `${start} · ${length}`;
};

/**
 * The ceiling on the note, in characters.
 *
 * The same 400 the API enforces (`MAX_GUIDANCE_CHARS`), restated here rather
 * than fetched because it is a `maxLength` on a field — the browser has to know
 * it before anything is sent, and a client that let somebody type six hundred
 * characters only to have the server refuse them would be a worse form than one
 * that simply stops at four hundred.
 *
 * It is a courtesy, not the boundary. The server enforces the same number, and
 * would still be the thing that mattered if this were removed.
 */
const MAX_NOTE = 400;

const PRIORITY_STYLE: Record<string, string> = {
  LOW: 'border-edge text-content-faint',
  NORMAL: 'border-edge text-content-muted',
  HIGH: 'border-warning/50 text-warning',
  URGENT: 'border-danger/50 text-danger',
};

/**
 * Candidate tasks for a project, proposed by Gemini and accepted one at a time.
 *
 * This replaced a "workflow review" that returned paragraphs of analysis. The
 * analysis was often right and there was nothing to do with it: every
 * suggestion had to be retyped into the composer by hand, so in practice
 * nobody used it twice. The model now returns tasks in the shape the board
 * already stores, and accepting one writes it straight to the board.
 *
 * The pending list is local state, not a cache. A suggestion is a proposal
 * until somebody acts on it — declining should leave no trace, and reopening
 * the tab should not resurrect a card the user has already dismissed. Accepted
 * ones become real tasks and are, from that moment, the board's business rather
 * than this panel's.
 *
 * Free-tier friendly: generation is explicitly triggered, never polled. The
 * waiting is handled by `useSuggestionStream` — the request no longer blocks on
 * the model, and each proposal appears here as it is finished rather than the
 * whole set arriving at the end.
 */
export const AiPanel = ({ projectId }: { projectId: string }) => {
  const t = useT();
  const addCreatedTasks = useAddCreatedTasks();

  const {
    suggestions: pending,
    suggestionId,
    status: streamStatus,
    errorText,
    isEmptyWorking,
    start,
    forget,
  } = useSuggestionStream(projectId);

  const isWorking = streamStatus === 'working';

  /*
   * The note, and whether the field is showing.
   *
   * Folded away by default, and that is the important half of the design. The
   * overwhelmingly common use of this panel is pressing one button and reading
   * three cards; a textarea sitting open above it would turn a one-click
   * feature into a form, and a form is a thing people feel they have to fill
   * in. Somebody who *has* something to say goes looking for the field, which
   * is the population it is for.
   *
   * Local state rather than persisted: a note is about the batch somebody is
   * asking for now, and a sentence typed a fortnight ago silently steering
   * today's suggestions is the opposite of what the field is for.
   */
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [note, setNote] = useState('');

  /**
   * Whether there are proposals still waiting to be accepted or declined.
   *
   * Only once the stream has finished: mid-generation the list is filling up
   * one card at a time, and treating a half-arrived batch as "pending" would
   * disable the button the moment the first card landed — which reads as the
   * generation having failed rather than as it having started.
   */
  const hasPending = !isWorking && pending.length > 0;

  const { data: status } = useQuery({
    queryKey: queryKeys.ai.status,
    queryFn: aiApi.status,
    staleTime: 5 * 60_000,
  });

  const accept = useMutation({
    mutationFn: (task: ProjectTaskSuggestion) =>
      aiApi.acceptTasks(suggestionId as string, [task.title]),
    onSuccess: (result, task) => {
      // The board is on the next tab across; show the row without a refetch.
      addCreatedTasks(result.tasks);
      forget(task.title);
      toast.success(t('ai.taskAdded', { title: task.title }));
    },
    onError: (error) => toast.error(errorMessage(error, t('ai.addFailed'))),
  });

  const decline = (task: ProjectTaskSuggestion) => forget(task.title);

  if (status && !status.enabled) {
    return (
      <EmptyState
        icon={<Sparkles className="h-6 w-6" />}
        title={t('ai.notConfigured')}
        description={t('ai.notConfiguredBody')}
      />
    );
  }

  return (
    <Section
      title={t('ai.taskIdeas')}
      description={t('ai.taskIdeasBody')}
      action={
        /*
         * Closed while a batch is still on the table.
         *
         * The button used to say "Suggest again" and generate a second set on
         * top of the first, which is wrong three ways over. It spends a model
         * call — the most expensive thing this application does, against a quota
         * shared by everybody on the deployment — to answer a question nobody
         * asked twice. It stacks proposals the reader has already been given and
         * has not finished reading, so the list grows while they are working
         * down it. And because the model is shown the *board* rather than the
         * pending list, the second batch reliably contains the first batch's
         * ideas again, so most of what it buys is duplicates.
         *
         * Accept them or decline them, and the button comes back. Both are one
         * click on each card, and declining leaves no trace — see the note on
         * the panel.
         */
        <div className="flex items-center gap-1.5">
          {/*
            The way in to the note, as a toggle rather than a second action.

            `aria-expanded` and `aria-controls` because this is a disclosure and
            not a button that does something — a screen reader announcing
            "Steer it, button" with no state would give no way to tell whether
            pressing it had worked.
          */}
          <Button
            size="sm"
            variant="ghost"
            aria-expanded={isNoteOpen}
            aria-controls="ai-note"
            onClick={() => setIsNoteOpen((open) => !open)}
            title={t('ai.steerHint')}
          >
            <MessageSquareText className="h-3.5 w-3.5" />
            {t('ai.steer')}
          </Button>

          <Button
            size="sm"
            onClick={() => void start(note.trim() || undefined)}
            isLoading={isWorking}
            disabled={hasPending}
            title={hasPending ? t('ai.decideFirstHint') : undefined}
          >
            <Wand2 className="h-3.5 w-3.5" />
            {t('ai.suggestTasks')}
          </Button>
        </div>
      }
    >
      {/*
        The note, when it has been asked for.

        Above the results and below the button that produces them, which is the
        one position that reads correctly: it is an input to the next press, not
        a caption on the last one.

        Deliberately plain about what it does. "It steers the subject, not how
        the assistant works" is the honest description of a field whose contents
        are quoted into a prompt as evidence — see `prepareGuidance` on the API
        for what that containment actually is, and what it does not claim to be.
        A field that implied more would invite somebody to try more.
      */}
      {isNoteOpen && (
        <div id="ai-note" className="rounded-2xl border border-edge bg-surface-raised p-3.5">
          <Textarea
            label={t('ai.steerOptional')}
            name="ai-note"
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value.slice(0, MAX_NOTE))}
            maxLength={MAX_NOTE}
            placeholder={t('ai.steerPlaceholder')}
            hint={t('ai.steerHint')}
          />
        </div>
      )}

      {/* Only until the first proposal lands. After that the list itself is
          the progress indicator, and a banner above it would be saying
          "working" next to visible evidence of the work. */}
      {isEmptyWorking && (
        <div className="space-y-2 rounded-2xl border border-edge bg-surface-raised p-4">
          <p className="text-sm font-medium">{t('ai.reading')}</p>
          <p className="text-xs text-content-muted">{t('ai.readingBody')}</p>
        </div>
      )}

      {/*
        * A failed generation says what happened and offers the one action that
        * helps, instead of only a toast that has already faded by the time the
        * user looks back at the panel. The API distinguishes a timeout from an
        * outage from a misconfiguration, so `errorMessage` is worth showing
        * verbatim — and a timeout is exactly the case where trying again works.
        */}
      {streamStatus === 'error' && (
        <div className="space-y-2 rounded-2xl border border-danger/40 bg-danger/5 p-4">
          <p className="text-sm font-medium text-danger">{t('ai.failed')}</p>
          <p className="text-xs leading-relaxed text-content-muted">
            {errorText ?? t('ai.unavailable')}
          </p>
          {/* Retried with the same note. A retry that silently dropped it
              would produce a different answer to the one that failed, which is
              not what "try again" means. */}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void start(note.trim() || undefined)}
          >
            <Wand2 className="h-3.5 w-3.5" />
            {t('common.retry')}
          </Button>
        </div>
      )}

      {streamStatus === 'idle' && pending.length === 0 && (
        <EmptyState
          icon={<Sparkles className="h-6 w-6" />}
          title={t('ai.noIdeas')}
          description={t('ai.noIdeasBody')}
        />
      )}

      {/* Said where the button used to work, so its absence is explained rather
          than merely noticed. */}
      {hasPending && (
        <p className="text-2xs leading-relaxed text-content-faint">
          {t('ai.decideFirstHint')}
        </p>
      )}

      <ul className="space-y-2.5">
        <AnimatePresence initial={false}>
          {pending.map((task) => (
              <motion.li
                key={task.title}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                className="gpu space-y-2 rounded-2xl border border-edge bg-surface-raised p-4"
              >
                <div className="flex flex-wrap items-start gap-2">
                  <p className="flex-1 text-sm font-semibold leading-snug">{task.title}</p>
                  <Badge className={cn('shrink-0', PRIORITY_STYLE[task.priority])}>
                    {t(`priority.${task.priority}` as const)}
                  </Badge>
                </div>

                {/* The window this will land on the board with.
                    Accepting used to produce an unscheduled task, so the dates
                    had to be added by hand afterwards — which meant the model
                    had reasoned about the sequencing and then thrown it away.
                    Shown here because a schedule the user cannot see before
                    accepting is a surprise rather than a suggestion. */}
                {task.durationHours !== undefined && (
                  <p className="inline-flex items-center gap-1.5 text-2xs text-content-faint">
                    <CalendarClock className="h-3 w-3 shrink-0" />
                    {describeSchedule(t, task)}
                  </p>
                )}

                <p className="text-xs leading-relaxed text-content-muted">{task.description}</p>

                {/* Why the model thinks this comes next — kept visually quieter
                    than the task itself, because it is the argument rather than
                    the thing being proposed. */}
                <p className="border-l-2 border-brand/40 pl-2.5 text-2xs italic leading-relaxed text-content-faint">
                  {task.rationale}
                </p>

                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => accept.mutate(task)}
                    isLoading={accept.isPending && accept.variables?.title === task.title}
                  >
                    <Check className="h-3.5 w-3.5" />
                    {t('ai.accept')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => decline(task)}>
                    <X className="h-3.5 w-3.5" />
                    {t('ai.decline')}
                  </Button>
                </div>
              </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {/* More still being written. One row rather than three: unlike a board,
          the schema caps this at three proposals, so the remaining count is
          small and known to be small. */}
      {isWorking && pending.length > 0 && (
        <p className="flex items-center gap-2 px-1 pt-2 text-2xs text-content-faint">
          <Spinner />
          {t('ai.stillWriting')}
        </p>
      )}
    </Section>
  );
};
