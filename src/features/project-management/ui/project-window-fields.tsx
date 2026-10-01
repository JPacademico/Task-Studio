import { CalendarRange } from 'lucide-react';

import { dayInputMax, dayInputMin } from '@/shared/lib/dates';
import { Input } from '@/shared/ui';
import { useT } from '@/shared/i18n';

interface ProjectWindowFieldsProps {
  /** `yyyy-mm-dd`, or empty. */
  startsAt: string;
  endsAt: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  /**
   * The latest deadline among the project's live tasks, as `yyyy-mm-dd`. Only known on an existing
   * project, and only used to say something useful *before* the API refuses.
   */
  latestTaskDue?: string | null;
}

/**
 * When a project is meant to run from, and to. Every other date in this app is a `datetime-local`,
 * because a task starts at 09:00 and a meeting is at half past two.
 */
export const ProjectWindowFields = ({
  startsAt,
  endsAt,
  onStartChange,
  onEndChange,
  latestTaskDue,
}: ProjectWindowFieldsProps) => {
  const t = useT();

  // The floor under the finish date, widened by whatever is already stored.
  const floor = startsAt && startsAt > dayInputMin() ? startsAt : dayInputMin();

  const stranding = Boolean(endsAt && latestTaskDue && endsAt < latestTaskDue);

  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 text-3xs font-semibold uppercase tracking-[0.14em] text-content-faint">
        <CalendarRange className="h-3 w-3" />
        {t('project.window')}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <Input
          type="date"
          label={t('project.startsAt')}
          name="startsAt"
          value={startsAt}
          onChange={(event) => onStartChange(event.target.value)}
          min={dayInputMin()}
          max={dayInputMax()}
        />
        <Input
          type="date"
          label={t('project.endsAt')}
          name="endsAt"
          value={endsAt}
          onChange={(event) => onEndChange(event.target.value)}
          min={floor}
          max={dayInputMax()}
          error={stranding ? t('project.endsBeforeTasks') : undefined}
        />
      </div>

      <p className="text-2xs leading-relaxed text-content-faint">
        {t('project.windowHint')}
      </p>
    </div>
  );
};
