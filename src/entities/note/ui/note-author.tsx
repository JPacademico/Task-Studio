import type { UserSummary } from '@/entities/user/model/types';
import { cn } from '@/shared/lib/cn';
import { formatDateTime, formatRelative } from '@/shared/lib/dates';
import { Avatar } from '@/shared/ui';

interface NoteAuthorStampProps {
  author?: UserSummary;
  /** ISO timestamp the note was written. */
  createdAt?: string;
  /** Renders the name as "You" — a shared wall still needs to say it is yours. */
  isMine?: boolean;
  className?: string;
}

/**
 * Whose handwriting this is.
 *
 * A shared wall with no attribution is a wall of anonymous paper, so every note
 * carries a permanent avatar in its bottom-right corner. The full credit —
 * name, address, when it went up — opens from *the avatar itself* rather than
 * from anywhere on the note: reading a wall means moving the pointer across a
 * lot of paper, and a card that appeared every time the pointer crossed a note
 * meant a trail of popovers the user never asked for. Now the stamp is a
 * target you aim at, and everything else on the note is left alone.
 *
 * It is focusable for the same reason — the credit has to be reachable without
 * a pointer — and the card is drawn in the app's own surface colours, because
 * it is chrome about the object rather than part of it.
 */
export const NoteAuthorStamp = ({
  author,
  createdAt,
  isMine,
  className,
}: NoteAuthorStampProps) => {
  if (!author) return null;

  const label = isMine ? 'You' : author.displayName;
  const summary = `Added by ${label}${createdAt ? ` · ${formatDateTime(createdAt)}` : ''}`;

  return (
    <span
      // The wrapper is the hover target, so the card stays open while the
      // pointer travels the few pixels from the avatar up onto it.
      className={cn('group/stamp absolute bottom-1.5 right-1.5 z-20', className)}
    >
      <button
        type="button"
        // Nothing to activate: the card is the whole point, and it opens on
        // hover and on focus. A real button is still the right element — it is
        // the thing the keyboard has to be able to reach.
        tabIndex={0}
        aria-label={summary}
        title={summary}
        // A press here must not also pick the note up or select it.
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.preventDefault()}
        className="block cursor-help rounded-full outline-none ring-offset-1 ring-offset-transparent focus-visible:ring-2 focus-visible:ring-brand"
      >
        <Avatar
          name={author.displayName}
          src={author.avatarUrl}
          size="xs"
          className="h-[1.125rem] w-[1.125rem] text-4xs opacity-70 ring-1 ring-black/20 transition-opacity duration-150 group-hover/stamp:opacity-100"
        />
      </button>

      {/* The credit. Transform + opacity only, so hovering a wall of notes
          never costs a layout pass. */}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute bottom-full right-0 mb-1.5 flex w-max max-w-[11.875rem] translate-y-1 flex-col gap-0.5',
          'rounded-lg border border-edge bg-surface-raised px-2 py-1.5 text-left shadow-panel',
          'opacity-0 transition-[opacity,transform] duration-150 ease-studio',
          'group-hover/stamp:translate-y-0 group-hover/stamp:opacity-100',
          'group-focus-within/stamp:translate-y-0 group-focus-within/stamp:opacity-100',
        )}
      >
        <span className="flex items-center gap-1.5">
          <Avatar
            name={author.displayName}
            src={author.avatarUrl}
            size="xs"
            className="h-4 w-4 text-5xs ring-0"
          />
          <span className="truncate text-2xs font-semibold text-content">{label}</span>
        </span>
        <span className="truncate text-3xs text-content-faint">{author.email}</span>
        {createdAt && (
          <span className="text-3xs text-content-muted">Added {formatRelative(createdAt)}</span>
        )}
      </span>
    </span>
  );
};
