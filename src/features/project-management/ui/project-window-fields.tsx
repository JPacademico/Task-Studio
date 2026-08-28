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
   * The latest deadline among the project's live tasks, as `yyyy-mm-dd`.
   *
   * Only known on an existing project, and only used to say something useful
   * *before* the API refuses: a finish date pulled back over work that already
   * exists is rejected server-side, and this is the same fact offered while
   * there is still a form open to fix it in. Omitted on a new project, which
   * has no tasks to strand.
   */
  latestTaskDue?: string | null;
}

/**
 * When a project is meant to run from, and to.
 *
 * ## Why days and not moments
 *
 * Every other date in this app is a `datetime-local`, because a task starts at
 * 09:00 and a meeting is at half past two. A project runs from March to June.
 * Asking somebody to pick a minute for that is asking them to invent a fact,
 * and the invented minute then shows up in every rendering of the window as
 * precision nobody meant.
 *
 * ## Why the two fields are not symmetric
 *
 * They look like a pair and they behave like one and a half. The start date is
 * decoration in the strict sense — nothing anywhere checks against it, and a
 * project whose start is next month still takes work today, because people
 * write a plan down before they follow it.
 *
 * The finish date is a **ceiling**. Tasks cannot be scheduled past it, and it
 * cannot be pulled back over tasks that already are. That is the whole reason
 * the field exists, so the hint under it says so rather than leaving somebody
 * to discover the rule by being refused — and the `min` on the finish field is
 * driven from the start date, so the impossible half of the range is simply
 * not offerable.
 *
 * ## Why the browser's own bounds are not the enforcement
 *
 * `min` and `max` on an `<input>` are a courtesy to the person typing and
 * nothing at all to anybody posting JSON — the API validates the same window
 * again, and says the same things in the same words. See
 * `common/dates/project-window` there.
 */
export const ProjectWindowFields = ({
  startsAt,
  endsAt,
  onStartChange,
  onEndChange,
  latestTaskDue,
}: ProjectWindowFieldsProps) => {
  const t = useT();

  /*
   * The floor under the finish date, widened by whatever is already stored.
   *
   * Two things push it up: the five-year window, and the start date if one is
   * set. A third would push it up further and deliberately does not — the
   * latest task deadline is *reported* below rather than enforced here,
   * because a form that silently refuses to offer a date is worse at
   * explaining itself than one that offers it and says what will happen.
   */
  const floor = startsAt && startsAt > dayInputMin() ? startsAt : dayInputMin();

  const stranding = Boolean(endsAt && latestTaskDue && endsAt < latestTaskDue);

  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-content-faint">
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

      <p className="text-[11px] leading-relaxed text-content-faint">
        {t('project.windowHint')}
      </p>
    </div>
  );
};
