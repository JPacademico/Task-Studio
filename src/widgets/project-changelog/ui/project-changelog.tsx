import { Fragment, useMemo, useState, type ReactNode } from 'react';
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  FileDown,
  FilePlus2,
  FileText,
  Github,
  History,
  Pencil,
  RotateCcw,
  Sparkles,
  Trash2,
  Undo2,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';

import {
  useProjectActivity,
  useProjectActivityRealtime,
  useRevertActivity,
} from '@/entities/activity/model/queries';
import type { ActivityEntry, ActivityType } from '@/entities/activity/model/types';
import { useCurrentUser } from '@/features/auth/model/session.store';
import { formatDayLabel, formatDateTime, formatTime } from '@/shared/lib/dates';
import { cn } from '@/shared/lib/cn';
import { Avatar, Button, EmptyState, Skeleton } from '@/shared/ui';
import { useT, type TranslationKey } from '@/shared/i18n';

/**
 * How each kind of entry is drawn: a glyph and the tone it carries.
 *
 * Tone is doing real work here, not decoration. A changelog is scanned rather
 * than read — somebody arrives asking "what happened to that task" and runs
 * their eye down a column — and colour is what lets removals separate from
 * arrivals at a glance without every line having to be parsed.
 *
 * Deliberately only three tones plus neutral. Ten colours would be a legend
 * nobody learns; "something was added", "something was finished", "something
 * was removed" is the distinction that actually gets used.
 */
const APPEARANCE: Record<ActivityType, { icon: ReactNode; tone: string }> = {
  PROJECT_CREATED: { icon: <Sparkles className="h-3 w-3" />, tone: 'text-brand' },
  PROJECT_IMPORTED: { icon: <Github className="h-3 w-3" />, tone: 'text-brand' },
  PROJECT_RENAMED: { icon: <Pencil className="h-3 w-3" />, tone: 'text-content-muted' },
  PROJECT_COMPLETED: { icon: <CheckCircle2 className="h-3 w-3" />, tone: 'text-positive' },
  PROJECT_REOPENED: { icon: <RotateCcw className="h-3 w-3" />, tone: 'text-content-muted' },
  PROJECT_FILED: { icon: <Building2 className="h-3 w-3" />, tone: 'text-content-muted' },
  PROJECT_UNFILED: { icon: <Building2 className="h-3 w-3" />, tone: 'text-content-muted' },

  MEMBER_INVITED: { icon: <UserPlus className="h-3 w-3" />, tone: 'text-content-muted' },
  MEMBER_JOINED: { icon: <UserPlus className="h-3 w-3" />, tone: 'text-positive' },
  MEMBER_LEFT: { icon: <UserMinus className="h-3 w-3" />, tone: 'text-warning' },
  MEMBER_REMOVED: { icon: <UserMinus className="h-3 w-3" />, tone: 'text-danger' },
  MEMBER_ROLE_CHANGED: { icon: <Users className="h-3 w-3" />, tone: 'text-content-muted' },

  TASK_CREATED: { icon: <FilePlus2 className="h-3 w-3" />, tone: 'text-content-muted' },
  TASK_COMPLETED: { icon: <CheckCircle2 className="h-3 w-3" />, tone: 'text-positive' },
  TASK_REOPENED: { icon: <RotateCcw className="h-3 w-3" />, tone: 'text-warning' },
  TASK_DELETED: { icon: <Trash2 className="h-3 w-3" />, tone: 'text-danger' },

  DOCUMENT_CREATED: { icon: <FileText className="h-3 w-3" />, tone: 'text-content-muted' },
  DOCUMENT_IMPORTED: { icon: <FileDown className="h-3 w-3" />, tone: 'text-content-muted' },
  DOCUMENT_CONVERTED: { icon: <Sparkles className="h-3 w-3" />, tone: 'text-brand' },
  DOCUMENT_DELETED: { icon: <Trash2 className="h-3 w-3" />, tone: 'text-danger' },

  MEETING_SCHEDULED: { icon: <CalendarDays className="h-3 w-3" />, tone: 'text-content-muted' },

  /*
   * The one entry that is *about* the log rather than about the project.
   *
   * Neutral tone on purpose, although it is tempting to make it a warning.
   * An undo is a correction, not an incident — somebody noticed a mistake
   * and fixed it, which is the system working. Colouring it as damage would
   * make every corrected mistake look worse than the uncorrected ones
   * sitting silently above it.
   */
  ACTION_REVERTED: { icon: <Undo2 className="h-3 w-3" />, tone: 'text-content-muted' },
};

/** The translation key that writes each type's sentence. */
const SENTENCE: Record<ActivityType, TranslationKey> = {
  PROJECT_CREATED: 'activity.projectCreated',
  PROJECT_IMPORTED: 'activity.projectImported',
  PROJECT_RENAMED: 'activity.projectRenamed',
  PROJECT_COMPLETED: 'activity.projectCompleted',
  PROJECT_REOPENED: 'activity.projectReopened',
  PROJECT_FILED: 'activity.projectFiled',
  PROJECT_UNFILED: 'activity.projectUnfiled',
  MEMBER_INVITED: 'activity.memberInvited',
  MEMBER_JOINED: 'activity.memberJoined',
  MEMBER_LEFT: 'activity.memberLeft',
  MEMBER_REMOVED: 'activity.memberRemoved',
  MEMBER_ROLE_CHANGED: 'activity.memberRoleChanged',
  TASK_CREATED: 'activity.taskCreated',
  TASK_COMPLETED: 'activity.taskCompleted',
  TASK_REOPENED: 'activity.taskReopened',
  TASK_DELETED: 'activity.taskDeleted',
  DOCUMENT_CREATED: 'activity.documentCreated',
  DOCUMENT_IMPORTED: 'activity.documentImported',
  DOCUMENT_CONVERTED: 'activity.documentConverted',
  DOCUMENT_DELETED: 'activity.documentDeleted',
  MEETING_SCHEDULED: 'activity.meetingScheduled',
  ACTION_REVERTED: 'activity.actionReverted',
};

/** `2026-08-27T09:14:00Z` → `2026-08-27`, in the reader's own timezone. */
const dayKey = (iso: string): string => {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

interface ProjectChangelogProps {
  projectId: string;
}

/**
 * What has happened inside this project, in order.
 *
 * ## Why the sentence is assembled here
 *
 * The API stores a symbol (`TASK_DELETED`) and the names involved; this file
 * turns that into "Ana deleted *Ship the billing page*". Two things fall out
 * of putting the wording on this side. The log is readable in whichever
 * language the reader has picked, from rows written while somebody else had
 * chosen the other one — a sentence stored in the database would be frozen in
 * whatever language its author happened to be using. And re-wording a line
 * later is a translation change rather than a data migration.
 *
 * ## Why entries are not links
 *
 * Half of them point at something that no longer exists — that is what a
 * deletion entry *is* — and a timeline where some rows navigate and some
 * dead-end is worse than one where none do. The name is the record; the thing
 * itself is on the tab it belongs to.
 *
 * ## Grouping
 *
 * By day, with the day as a sticky heading. A changelog answers "when" more
 * often than it answers "what", and a flat list of thirty relative timestamps
 * ("2 hours ago", "3 hours ago"…) is the shape that makes "when" hardest to
 * read. Inside a day the entries carry a clock time and nothing else.
 */
export const ProjectChangelog = ({ projectId }: ProjectChangelogProps) => {
  const t = useT();
  const currentUser = useCurrentUser();

  const revert = useRevertActivity(projectId);
  /**
   * Which line is asking "are you sure".
   *
   * A second press on the same row rather than a modal, and the choice is
   * about proportion. A confirmation dialog for an undo would be a dialog
   * about a dialog: the thing being undone was itself a small act, most of
   * these are reversible again by hand, and the API refuses anything genuinely
   * destructive outright. What is worth preventing is a *stray* press, which
   * two deliberate presses on the same row prevents perfectly well.
   *
   * One id rather than a set, because arming a second row disarms the first —
   * which is what somebody who changed their mind about which line they meant
   * would expect.
   */
  const [armed, setArmed] = useState<string | null>(null);

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useProjectActivity(projectId);

  /*
   * New lines arrive by socket rather than by polling — see the hook.
   *
   * The reader's own id goes with it so that a line *they* just wrote comes
   * back carrying its undo button, rather than the `false` the API has to
   * broadcast to a room of mixed permissions.
   */
  useProjectActivityRealtime(projectId, currentUser?.id);

  /*
   * Flattened once, then cut into days.
   *
   * The pages are an implementation detail of the fetch: a day can straddle
   * two of them, and rendering per page would put a heading in the middle of
   * a day every thirty rows.
   */
  const days = useMemo(() => {
    const entries = data?.pages.flatMap((page) => page.items) ?? [];
    const grouped: { key: string; label: string; entries: ActivityEntry[] }[] = [];

    for (const entry of entries) {
      const key = dayKey(entry.createdAt);
      const last = grouped[grouped.length - 1];

      if (last && last.key === key) last.entries.push(entry);
      else grouped.push({ key, label: formatDayLabel(entry.createdAt), entries: [entry] });
    }

    return grouped;
  }, [data]);

  const total = data?.pages[0]?.total ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-12" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={<History className="h-6 w-6" />}
        title={t('activity.failed')}
        description={t('activity.failedHint')}
        action={
          <Button size="sm" variant="secondary" onClick={() => void refetch()}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  if (days.length === 0) {
    return (
      <EmptyState
        icon={<History className="h-6 w-6" />}
        title={t('activity.empty')}
        description={t('activity.emptyHint')}
      />
    );
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-baseline gap-x-2">
        <h2 className="text-sm font-semibold tracking-tight">{t('activity.title')}</h2>
        <p className="text-[11px] text-content-faint">{t('activity.subtitle')}</p>
        <span className="ml-auto text-[11px] tabular-nums text-content-faint">
          {t('activity.entryCount', { count: String(total) })}
        </span>
      </header>

      <ol className="space-y-5">
        {days.map((day) => (
          <li key={day.key}>
            {/*
              Sticky, because the day is the one piece of context a reader
              loses as soon as they scroll — and the answer to "when" is what
              they came for. `z-10` clears the rail beneath it and nothing
              else on this tab is layered.
            */}
            <p className="sticky top-0 z-10 -mx-1 mb-2 bg-surface/85 px-1 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-content-faint backdrop-blur">
              {day.label}
            </p>

            <ol className="relative space-y-0.5 pl-1">
              {/* The thread the entries hang off. Decorative, and drawn
                  behind them rather than as a border on each row so it does
                  not break between rows of different heights. */}
              <span
                aria-hidden
                className="absolute bottom-2 left-[15px] top-2 w-px bg-edge"
              />

              {day.entries.map((entry) => (
                <Fragment key={entry.id}>
                  <ChangelogRow
                    entry={entry}
                    isArmed={armed === entry.id}
                    isReverting={revert.isPending && revert.variables === entry.id}
                    onArm={() => setArmed(entry.id)}
                    onDisarm={() => setArmed(null)}
                    onRevert={() => {
                      setArmed(null);
                      revert.mutate(entry.id);
                    }}
                  />
                </Fragment>
              ))}
            </ol>
          </li>
        ))}
      </ol>

      {hasNextPage && (
        <div className="flex justify-center pt-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void fetchNextPage()}
            isLoading={isFetchingNextPage}
          >
            {t('activity.loadMore')}
          </Button>
        </div>
      )}
    </section>
  );
};

interface ChangelogRowProps {
  entry: ActivityEntry;
  /** This row is showing "undo?" rather than the undo button. */
  isArmed: boolean;
  isReverting: boolean;
  onArm: () => void;
  onDisarm: () => void;
  onRevert: () => void;
}

const ChangelogRow = ({
  entry,
  isArmed,
  isReverting,
  onArm,
  onDisarm,
  onRevert,
}: ChangelogRowProps) => {
  const t = useT();
  const { icon, tone } = APPEARANCE[entry.type] ?? {
    icon: <History className="h-3 w-3" />,
    tone: 'text-content-muted',
  };

  /*
   * Every placeholder is filled, even the ones this sentence does not use.
   *
   * A missing substitution renders the literal `{subject}` in the middle of a
   * line, and the cases where one is genuinely absent are real: a member who
   * left has no target, an entry whose actor deleted their account has no
   * name. Falling back to a word rather than to an empty string keeps the
   * sentence grammatical instead of leaving a hole in it.
   */
  const actor = entry.actor?.displayName ?? entry.actorName ?? t('activity.someone');
  const values = {
    actor,
    subject: entry.subject ?? t('activity.somethingUnnamed'),
    target: entry.targetName ?? t('activity.someone'),
    role: String((entry.meta?.role as string | undefined) ?? '').toLowerCase(),
    from: String((entry.meta?.from as string | undefined) ?? ''),
  };

  const isReverted = Boolean(entry.revertedAt);

  return (
    <li
      className={cn(
        'group relative flex items-start gap-2.5 rounded-lg py-1.5 pl-0 pr-1 transition-colors hover:bg-surface-sunken/50',
        // A reverted line stays in place and stops competing for attention.
        // It is still *history* — it happened — so it is dimmed rather than
        // hidden, which is the whole difference between a changelog and a
        // list of things that are currently true.
        isReverted && 'opacity-60',
      )}
    >
      {/* The glyph sits *on* the thread, with the surface behind it, so the
          line appears to pass through the row rather than under it. */}
      <span
        aria-hidden
        className={cn(
          'relative z-[1] mt-0.5 grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full',
          'border border-edge bg-surface-raised',
          tone,
        )}
      >
        {icon}
      </span>

      <span className="min-w-0 flex-1 leading-snug">
        <span className={cn('text-xs text-content', isReverted && 'line-through')}>
          {t(SENTENCE[entry.type], values)}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-content-faint">
          {entry.actor && (
            <Avatar
              name={entry.actor.displayName}
              src={entry.actor.avatarUrl}
              size="xs"
            />
          )}
          <time dateTime={entry.createdAt} title={formatDateTime(entry.createdAt)}>
            {formatTime(entry.createdAt)}
          </time>

          {/* Who undid it, on the line it happened to rather than only on the
              new entry above. A reader scanning for "what happened to that
              task" lands here first, and "undone by Ana" is the answer. */}
          {isReverted && (
            <span className="text-content-faint">
              ·{' '}
              {t('activity.revertedBy', {
                actor: entry.revertedBy?.displayName ?? t('activity.someone'),
              })}
            </span>
          )}
        </span>
      </span>

      {/* --- Undo ---------------------------------------------------------

          Only where the API said this reader may. `canRevert` folds in both
          halves of the rule — the kind of entry, and whether the person
          looking is its author or an admin above them — so there is no second
          opinion about it here, and no button that exists to be refused.

          Kept out of the flow until it is wanted: invisible until the row is
          hovered or the button itself has focus, which keeps a changelog of
          two hundred lines from reading as two hundred buttons. `focus-within`
          is what makes it reachable by keyboard, where there is no hover. */}
      {entry.canRevert && (
        <span
          className={cn(
            'shrink-0 self-center transition-opacity',
            isArmed
              ? 'opacity-100'
              : 'opacity-0 focus-within:opacity-100 group-hover:opacity-100',
          )}
        >
          {isArmed ? (
            <span className="flex items-center gap-1">
              <Button
                size="sm"
                variant="danger"
                onClick={onRevert}
                isLoading={isReverting}
                className="h-6 px-2 text-[10px]"
              >
                {t('activity.revertConfirm')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onDisarm}
                className="h-6 px-2 text-[10px]"
              >
                {t('common.cancel')}
              </Button>
            </span>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={onArm}
              title={t('activity.revertHint')}
              className="h-6 gap-1 px-2 text-[10px]"
            >
              <Undo2 className="h-3 w-3" />
              {t('activity.revert')}
            </Button>
          )}
        </span>
      )}
    </li>
  );
};
