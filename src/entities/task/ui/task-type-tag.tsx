import { TASK_TYPE_META } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import type { TaskType } from '../model/types';
import { useT } from '@/shared/i18n';

interface TaskTypeTagProps {
  type: TaskType;
  /**
   * `compact` is what a card in a badge row uses: the short name, sized down by the skin. `full` is
   * for surfaces with room to spell it out — the detail sheet.
   */
  variant?: 'compact' | 'full';
  className?: string;
}

/**
 * How a task is classified — MegaTask, MicroTask, MultiTask or plain Task. This exists because the
 * label is the one piece of text in the badge row whose length the design does not control.
 */
export const TaskTypeTag = ({ type, variant = 'compact', className }: TaskTypeTagProps) => {
  const t = useT();
  const meta = TASK_TYPE_META[type];

  return (
    <span
      title={`${t(meta.label)} — ${t(meta.hint).toLowerCase()}`}
      className={cn(
        'type-tag shrink-0 font-semibold',
        variant === 'compact' ? 'text-2xs' : 'text-sm',
        meta.accent,
        className,
      )}
    >
      {t(variant === 'compact' ? meta.short : meta.label)}
    </span>
  );
};
