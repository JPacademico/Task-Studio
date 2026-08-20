import type { ReactNode } from 'react';
import { Pin, Search, User, UserRound, Users, X } from 'lucide-react';

import type {
  ListTasksParams,
  TaskLateness,
  TaskScope,
  TaskStatus,
  TaskType,
} from '@/entities/task/model/types';
import { TASK_STATUS_META, TASK_TYPE_META } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { PostItMark, Segmented, Select, type SelectOption } from '@/shared/ui';
import { useT } from '@/shared/i18n';

/**
 * `project` shows the whole roster's work, so it keeps the mine/team/all split.
 * `personal` is the task menu — that surface is about *you*, so the second tab
 * narrows to the work that is *only* yours: the tasks with no project behind
 * them at all.
 *
 * It used to be "With notes", which sat on the wrong axis. A note is a property
 * of a task, like a deadline or a priority, and belongs with the dropdowns that
 * filter by those; the tab strip is where the surface says *whose* work it is
 * showing, and a personal task is the one kind of work this page is the only
 * home for. Nothing was lost — see the `hasNotes` toggle further along the row.
 */
type FiltersVariant = 'project' | 'personal';

interface TaskFiltersProps {
  value: ListTasksParams;
  onChange: (next: ListTasksParams) => void;
  variant?: FiltersVariant;
  className?: string;
}

const PROJECT_SCOPES: { value: TaskScope; label: string; icon: ReactNode }[] = [
  { value: 'mine', label: 'My tasks', icon: <User className="h-3 w-3" /> },
  { value: 'team', label: 'Team tasks', icon: <Users className="h-3 w-3" /> },
  { value: 'all', label: 'All', icon: <></> },
];

/** Personal tabs are a view over the same query, not a different scope. */
type PersonalTab = 'mine' | 'personal';

const PERSONAL_TABS: { value: PersonalTab; label: string; icon: ReactNode }[] = [
  { value: 'mine', label: 'My tasks', icon: <User className="h-3 w-3" /> },
  { value: 'personal', label: 'Personal', icon: <UserRound className="h-3 w-3" /> },
];

const STATUSES: (TaskStatus | 'ALL')[] = ['ALL', 'TODO', 'IN_PROGRESS', 'COMPLETED'];
const TYPES: (TaskType | 'ALL')[] = ['ALL', 'MEGA', 'MICRO', 'MULTI', 'STANDARD'];

/** The dot each status carries elsewhere in the app, reused in the dropdown. */
const STATUS_SWATCH: Record<TaskStatus, string> = {
  TODO: '#94a3b8',
  IN_PROGRESS: '#f59e0b',
  COMPLETED: '#10b981',
};

/*
 * The default option of each dropdown is the filter's own name.
 *
 * It used to spell out what "no filter" meant — "Any status", "Any type",
 * "Any time" — which is three words of qualifier on a control whose unset
 * state is already the common case. The bare noun reads as a label when
 * nothing is chosen and gets replaced by the choice when something is, which
 * is what a dropdown does anyway.
 */
const LATENESS: SelectOption<TaskLateness | 'ALL'>[] = [
  { value: 'ALL', label: 'Time' },
  { value: 'LATE', label: 'Late', hint: 'Past the deadline, still open' },
  { value: 'COMPLETED_LATE', label: 'Late finish', hint: 'Finished after the deadline' },
  { value: 'ON_TIME', label: 'On time' },
];

export const TaskFilters = ({
  value,
  onChange,
  variant = 'project',
  className,
}: TaskFiltersProps) => {
  const t = useT();
  const patch = (next: Partial<ListTasksParams>) => onChange({ ...value, ...next });
  const isPersonal = variant === 'personal';

  const hasActiveFilters = Boolean(
    value.status ??
      value.type ??
      value.lateness ??
      value.search ??
      value.pinnedOnly ??
      value.hasNotes,
  );

  /*
   * The row is measured, not padded out.
   *
   * The layout switcher sits on the same line, and the skins that run a wide
   * face (the illustrated one, the serif, the pixel font) spend that width on
   * every label — enough that the switcher used to drop onto a second row.
   * So each dropdown is only as wide as its own longest option needs, the
   * trigger truncates rather than growing, and the gaps are tightened.
   */
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {isPersonal ? (
        <Segmented
          value={value.personalOnly ? 'personal' : 'mine'}
          options={PERSONAL_TABS}
          onChange={(tab) =>
            patch({
              personalOnly: tab === 'personal' || undefined,
              /*
               * The scope goes with the tab.
               *
               * `mine` means "assigned to me", which a personal task always is
               * — but the *assignment* is what the scope reads, and narrowing
               * by both at once is one redundant predicate on every query. The
               * personal tab is already the tightest filter there is.
               */
              scope: tab === 'personal' ? undefined : 'mine',
            })
          }
        />
      ) : (
        <Segmented
          value={value.scope ?? 'all'}
          options={PROJECT_SCOPES}
          onChange={(scope) => patch({ scope })}
        />
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-content-faint" />
        <input
          value={value.search ?? ''}
          onChange={(event) => patch({ search: event.target.value || undefined })}
          placeholder={t('views.searchTasks')}
          className="field h-9 w-36 pl-8 text-xs sm:w-40"
        />
      </div>

      <Select
        className="w-[7.5rem]"
        value={value.status ?? 'ALL'}
        onChange={(status) => patch({ status: status === 'ALL' ? undefined : status })}
        options={STATUSES.map((status) => ({
          value: status,
          label: status === 'ALL' ? 'Status' : TASK_STATUS_META[status].label,
          swatch: status === 'ALL' ? undefined : STATUS_SWATCH[status],
        }))}
      />

      <Select
        className="w-[7rem]"
        value={value.lateness ?? 'ALL'}
        onChange={(lateness) => patch({ lateness: lateness === 'ALL' ? undefined : lateness })}
        options={LATENESS}
      />

      <Select
        className="w-[7rem]"
        value={value.type ?? 'ALL'}
        onChange={(type) => patch({ type: type === 'ALL' ? undefined : type })}
        options={TYPES.map((type) => ({
          value: type,
          label: type === 'ALL' ? 'Type' : TASK_TYPE_META[type].label,
          hint: type === 'ALL' ? undefined : TASK_TYPE_META[type].hint,
        }))}
      />

      {/* Clearing everything by hand is four interactions; this is one. */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={() =>
            onChange(
              isPersonal
                ? {
                    personalOnly: value.personalOnly,
                    scope: value.scope,
                    hideCompleted: true,
                  }
                : { scope: value.scope },
            )
          }
          className="ui-filter inline-flex h-9 items-center gap-1 rounded-xl px-2 text-xs text-content-faint transition-colors hover:text-danger"
        >
          <X className="h-3 w-3" strokeWidth={2.6} />
          {t('views.clear')}
        </button>
      )}

      {/* What the personal tab strip used to carry. A note is a property of a
          task, so it filters like one — next to "Pinned", not above it. */}
      <button
        type="button"
        onClick={() => patch({ hasNotes: !value.hasNotes || undefined })}
        aria-pressed={Boolean(value.hasNotes)}
        title={t('views.withNotesTitle')}
        className={cn(
          'ui-filter inline-flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-xs transition-colors',
          value.hasNotes
            ? 'border-brand bg-brand/12 text-brand'
            : 'border-edge text-content-muted hover:text-content',
        )}
      >
        <PostItMark className="h-3.5 w-3.5 text-amber-400" />
        {t('views.withNotes')}
      </button>

      <button
        type="button"
        onClick={() => patch({ pinnedOnly: !value.pinnedOnly })}
        className={cn(
          'ui-filter inline-flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-xs transition-colors',
          value.pinnedOnly
            ? 'border-brand bg-brand/12 text-brand'
            : 'border-edge text-content-muted hover:text-content',
        )}
      >
        <Pin className={cn('h-3 w-3', value.pinnedOnly && 'fill-current')} />
        {t('views.pinned')}
      </button>
    </div>
  );
};
