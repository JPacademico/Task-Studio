import type { UserSummary } from '@/entities/user/model/types';
import { cn } from '@/shared/lib/cn';
import { formatDateTime, formatRelative } from '@/shared/lib/dates';
import { Avatar } from '@/shared/ui';
import { translate, useT } from '@/shared/i18n';

/**
 * Who wrote this page, and who touched it last. A project's text board is the one shared surface in
 * the app where the author had been dropped.
 */

interface DocumentBylineProps {
  createdBy: UserSummary;
  createdAt: string;
  /** Null until somebody other than the creation itself has saved the page. */
  updatedBy?: UserSummary | null;
  updatedAt?: string;
  /**
   * Whoever is reading, so their own name reads as "You". Passed in rather than read from the
   * session store: this is an entity.
   */
  currentUserId?: string;
  className?: string;
}

/**
 * "You" on your own writing — a shared board still has to say which is yours. `translate` rather
 * than a `t` passed in: this is called during render, so it reads the same language a hook would.
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

  // The credit is the only thing this component draws, so a response that came back without one has
  // nothing to render rather than a broken line.
  if (!createdBy) return null;

  // An edit only counts as somebody else's work if the server actually recorded one.
  const wasEdited =
    Boolean(updatedBy) && Boolean(updatedAt) && updatedAt !== createdAt;

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-3xs', className)}>
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
          className="h-4 w-4 text-5xs"
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
 * The same credit at list scale: a face, and nothing else. A table of contents is scanned rather
 * than read, so the row carries the one thing that makes it traceable at a glance.
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
      className={cn('h-4 w-4 text-5xs opacity-80', className)}
    />
  );
};
