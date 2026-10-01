import type { ReactNode } from 'react';
import { Search, User, UserRound, X } from 'lucide-react';

import type {
  ListTasksParams,
  TaskLateness,
  TaskPriority,
  TaskScope,
  TaskStatus,
  TaskType,
} from '@/entities/task/model/types';
import {
  TASK_PRIORITY_META,
  TASK_STATUS_META,
  TASK_TYPE_META,
  TEXT_LIMITS,
} from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { clampText } from '@/shared/lib/text';
import { Segmented, Select } from '@/shared/ui';
import { useT, type TranslationKey } from '@/shared/i18n';

/**
 * `project` shows the whole roster's work, so it keeps the mine/all split. `personal` is the task
 * menu — that surface is about *you*, so the second tab narrows to the work that is *only* yours.
 */
type FiltersVariant = 'project' | 'personal';

interface TaskFiltersProps {
  value: ListTasksParams;
  onChange: (next: ListTasksParams) => void;
  variant?: FiltersVariant;
  className?: string;
}

// Options carry keys, and the component resolves them. These tables are module constants —
// evaluated once, before any component and therefore before any `t` exists. Two, not three.
const PROJECT_SCOPES: { value: TaskScope; label: TranslationKey; icon: ReactNode }[] = [
  { value: 'mine', label: 'filters.myTasks', icon: <User className="h-3 w-3" /> },
  { value: 'all', label: 'filters.all', icon: <></> },
];

/** Personal tabs are a view over the same query, not a different scope. */
type PersonalTab = 'mine' | 'personal';

const PERSONAL_TABS: { value: PersonalTab; label: TranslationKey; icon: ReactNode }[] = [
  { value: 'mine', label: 'filters.myTasks', icon: <User className="h-3 w-3" /> },
  { value: 'personal', label: 'filters.personal', icon: <UserRound className="h-3 w-3" /> },
];

const STATUSES: (TaskStatus | 'ALL')[] = ['ALL', 'TODO', 'IN_PROGRESS', 'COMPLETED'];
const TYPES: (TaskType | 'ALL')[] = ['ALL', 'MEGA', 'MICRO', 'MULTI', 'STANDARD'];

// Urgent first, which is the opposite of the enum's own order. A dropdown is read from the top and
// this one is opened with a question in mind — "what is on fire".
const PRIORITIES: (TaskPriority | 'ALL')[] = ['ALL', 'URGENT', 'HIGH', 'NORMAL', 'LOW'];

/** The ink each priority is written in elsewhere, as a dot in the dropdown. */
const PRIORITY_SWATCH: Record<TaskPriority, string> = {
  LOW: '#94a3b8',
  NORMAL: '#64748b',
  HIGH: '#f59e0b',
  URGENT: '#ef4444',
};

/** The dot each status carries elsewhere in the app, reused in the dropdown. */
const STATUS_SWATCH: Record<TaskStatus, string> = {
  TODO: '#94a3b8',
  IN_PROGRESS: '#f59e0b',
  COMPLETED: '#10b981',
};

// The default option of each dropdown is the filter's own name. It used to spell out what "no
// filter" meant — "Any status", "Any type", "Any time".
const LATENESS: { value: TaskLateness | 'ALL'; label: TranslationKey; hint?: TranslationKey }[] = [
  { value: 'ALL', label: 'filters.time' },
  { value: 'LATE', label: 'filters.late', hint: 'filters.lateHint' },
  { value: 'COMPLETED_LATE', label: 'filters.lateFinish', hint: 'filters.lateFinishHint' },
  { value: 'ON_TIME', label: 'filters.onTime' },
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

  // `pinnedOnly` and `hasNotes` are still counted, and still cleared. The two toggles that set them
  // are gone from this row — see the note above the component.
  const hasActiveFilters = Boolean(
    value.status ??
      value.type ??
      value.priority ??
      value.lateness ??
      value.search ??
      value.pinnedOnly ??
      value.hasNotes,
  );

  // The row is measured, not padded out. The layout switcher sits on the same line, and the skins
  // that run a wide face.
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {isPersonal ? (
        <Segmented
          value={value.personalOnly ? 'personal' : 'mine'}
          options={PERSONAL_TABS.map((tab) => ({ ...tab, label: t(tab.label) }))}
          onChange={(tab) =>
            patch({
              personalOnly: tab === 'personal' || undefined,
              // The scope goes with the tab. `mine` means "assigned to me", which a personal task
              // always is — but the *assignment* is what the scope reads.
              scope: tab === 'personal' ? undefined : 'mine',
            })
          }
        />
      ) : (
        <Segmented
          value={value.scope ?? 'all'}
          options={PROJECT_SCOPES.map((scope) => ({ ...scope, label: t(scope.label) }))}
          onChange={(scope) => patch({ scope })}
        />
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-content-faint" />
        <input
          value={value.search ?? ''}
          onChange={(event) =>
            patch({ search: clampText(event.target.value, TEXT_LIMITS.search) || undefined })
          }
          placeholder={t('views.searchTasks')}
          maxLength={TEXT_LIMITS.search}
          className="field h-9 w-36 pl-8 text-xs sm:w-40"
        />
      </div>

      <Select
        className="w-[7.5rem]"
        value={value.status ?? 'ALL'}
        onChange={(status) => patch({ status: status === 'ALL' ? undefined : status })}
        options={STATUSES.map((status) => ({
          value: status,
          label: t(status === 'ALL' ? 'filters.status' : TASK_STATUS_META[status].label),
          swatch: status === 'ALL' ? undefined : STATUS_SWATCH[status],
        }))}
      />

      <Select
        className="w-[7rem]"
        value={value.lateness ?? 'ALL'}
        onChange={(lateness) => patch({ lateness: lateness === 'ALL' ? undefined : lateness })}
        options={LATENESS.map((option) => ({
          ...option,
          label: t(option.label),
          hint: option.hint ? t(option.hint) : undefined,
        }))}
      />

      <Select
        className="w-[7rem]"
        value={value.type ?? 'ALL'}
        onChange={(type) => patch({ type: type === 'ALL' ? undefined : type })}
        options={TYPES.map((type) => ({
          value: type,
          label: t(type === 'ALL' ? 'filters.type' : TASK_TYPE_META[type].label),
          hint: type === 'ALL' ? undefined : t(TASK_TYPE_META[type].hint),
        }))}
      />

      {/* Priority, which the API has always accepted and nothing ever sent. */}
      <Select
        /* Narrower than its neighbours, because its words are shorter. The note above the row
           applies with force here. */
        className="w-[6.5rem]"
        value={value.priority ?? 'ALL'}
        onChange={(priority) => patch({ priority: priority === 'ALL' ? undefined : priority })}
        options={PRIORITIES.map((priority) => ({
          value: priority,
          label: t(priority === 'ALL' ? 'filters.priority' : TASK_PRIORITY_META[priority].label),
          swatch: priority === 'ALL' ? undefined : PRIORITY_SWATCH[priority],
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
    </div>
  );
};
