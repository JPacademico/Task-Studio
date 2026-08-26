import type { UserSummary } from '@/entities/user/model/types';
import { cn } from '@/shared/lib/cn';
import { formatDateTime, formatRelative } from '@/shared/lib/dates';
import { Avatar } from '@/shared/ui';
import { translate, useT } from '@/shared/i18n';

/**
 * Who wrote this page, and who touched it last.
 *
 * A project's text board is the one shared surface in the app where the author
 * had been dropped: the header used to read `(updatedBy ?? createdBy)` next to
 * the *modified* time, which is not attribution — it is one name standing in
 * for two different facts. On a page nobody had edited yet it printed the
 * author beside a timestamp they had nothing to do with, and on a page somebody
 * else had corrected it printed the editor's name as though they had written
 * it. Either way the question "who started this?" had no answer anywhere in the
 * UI.
 *
 * So the credit is now explicit and the two facts are separate: the author is a
 * face with a name on it, and the last edit is a second, quieter clause that
 * only appears when there *was* one.
 */

interface DocumentBylineProps {
  createdBy: UserSummary;
  createdAt: string;
  /** Null until somebody other than the creation itself has saved the page. */
  updatedBy?: UserSummary | null;
  updatedAt?: string;
  /**
   * Whoever is reading, so their own name reads as "You".
   *
   * Passed in rather than read from the session store: this is an entity, and
   * entities do not reach up into features for who is signed in — the same
   * reason `NoteAuthorStamp` takes `isMine`.
   */
  currentUserId?: string;
  className?: string;
}

/**
 * "You" on your own writing — a shared board still has to say which is yours.
 *
 * `translate` rather than a `t` passed in: this is called during render, so it
 * reads the same language a hook would, and threading the function through a
 * pure string helper would be the only reason it took an argument at all.
 */
const nameFor = (person: UserSummary, currentUserId: string | undefined): string =>
  person.id === currentUserId ? translate('common.you') : person.displayName;

export const DocumentByline = ({
  createdBy,
  createdAt,
  updatedBy,
  updatedAt,
  currentUserId,
  className,
}: DocumentBylineProps) => {
  const t = useT();

  // The credit is the only thing this component draws, so a response that came
  // back without one has nothing to render rather than a broken line — and a
  // missing author must never be the reason a page fails to open. `NoteAuthorStamp`
  // guards its own attribution for the same reason.
  if (!createdBy) return null;

  // An edit only counts as somebody else's work if the server actually recorded
  // one. A page saved once by its author reports `updatedBy === createdBy` with
  // both timestamps within a second of each other, and calling that "edited by
  // Ana just now" under "Written by Ana" is the same name twice for no reason.
  const wasEdited =
    Boolean(updatedBy) && Boolean(updatedAt) && updatedAt !== createdAt;

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[10px]', className)}>
      <span
        title={t('common.createdByWithEmail', {
          name: createdBy.displayName,
          email: createdBy.email,
          date: formatDateTime(createdAt),
        })}
        className="avatar-chip inline-flex items-center gap-1.5 border border-edge bg-surface-sunken py-0.5 pr-2"
      >
        <Avatar
          name={createdBy.displayName}
          src={createdBy.avatarUrl}
          size="xs"
          className="h-4 w-4 text-[8px]"
        />
        <span className="max-w-[9rem] truncate font-medium text-content-muted">
          {nameFor(createdBy, currentUserId)}
        </span>
      </span>

      <span className="text-content-faint">
        wrote this {formatRelative(createdAt)}
      </span>

      {wasEdited && updatedBy && updatedAt && (
        <span
          title={t('common.lastEditedBy', {
            name: updatedBy.displayName,
            date: formatDateTime(updatedAt),
          })}
          className="truncate text-content-faint"
        >
          · edited by {nameFor(updatedBy, currentUserId)} {formatRelative(updatedAt)}
        </span>
      )}
    </span>
  );
};

interface DocumentCreatorStampProps {
  createdBy: UserSummary;
  createdAt: string;
  className?: string;
}

/**
 * The same credit at list scale: a face, and nothing else.
 *
 * A table of contents is scanned rather than read, so the row carries the one
 * thing that makes it traceable at a glance — whose page this is — and puts the
 * spelled-out version in the tooltip. It is a `<span>` rather than a button
 * because the row it sits in is already the click target.
 */
export const DocumentCreatorStamp = ({
  createdBy,
  createdAt,
  className,
}: DocumentCreatorStampProps) => {
  const t = useT();

  if (!createdBy) return null;

  return (
    <Avatar
      name={createdBy.displayName}
      src={createdBy.avatarUrl}
      size="xs"
      title={t('common.createdBy', {
        name: createdBy.displayName,
        date: formatDateTime(createdAt),
      })}
      className={cn('h-4 w-4 text-[8px] opacity-80', className)}
    />
  );
};
