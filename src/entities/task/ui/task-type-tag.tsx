import { TASK_TYPE_META } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import type { TaskType } from '../model/types';

interface TaskTypeTagProps {
  type: TaskType;
  /**
   * `compact` is what a card in a badge row uses: the short name, sized down
   * by the skin. `full` is for surfaces with room to spell it out — the detail
   * sheet, the composer's classification read-out.
   */
  variant?: 'compact' | 'full';
  className?: string;
}

/**
 * How a task is classified — MegaTask, MicroTask, MultiTask or plain Task.
 *
 * This exists because the label is the one piece of text in the badge row
 * whose length the design does not control: the type is derived, not typed,
 * and every skin renders it in a different family at a different width. The
 * tag therefore caps its own width, never wraps, sizes itself per skin through
 * `.type-tag`, and falls back to the short name on the compact surfaces where
 * the full one was outgrowing the space it had.
 *
 * The full name and the rule behind it stay reachable on hover, so nothing is
 * actually lost by shortening it.
 *
 * Deliberately not a `.ui-chip`. It used to be, which cost nothing on the
 * default skin — that one's chip material is empty — but on every other skin it
 * wrapped the word in that skin's badge: a brass plate under the vintage serif,
 * a notched arcade tile, a pane of lit glass in orbit. Four of those in a badge
 * row, next to the status and deadline chips that are actually meant to be
 * boxes, turned the card's footer into a wall of frames. The type is a label,
 * so it is now only ever a coloured word — the skin still sets its family, its
 * size and its lettering through `.type-tag`.
 */
export const TaskTypeTag = ({ type, variant = 'compact', className }: TaskTypeTagProps) => {
  const meta = TASK_TYPE_META[type];

  return (
    <span
      title={`${meta.label} — ${meta.hint.toLowerCase()}`}
      className={cn(
        'type-tag shrink-0 font-semibold',
        variant === 'compact' ? 'text-[11px]' : 'text-sm',
        meta.accent,
        className,
      )}
    >
      {variant === 'compact' ? meta.short : meta.label}
    </span>
  );
};
