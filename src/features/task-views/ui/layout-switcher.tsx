import { CalendarRange, KanbanSquare, ListOrdered, Rows3, Zap } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import type { TaskLayout } from '../model/layout.store';

interface LayoutSwitcherProps {
  value: TaskLayout;
  options: TaskLayout[];
  onChange: (layout: TaskLayout) => void;
  className?: string;
}

const META: Record<TaskLayout, { label: string; hint: string; icon: typeof KanbanSquare }> = {
  board: { label: 'Board', hint: 'Status columns you can drag between', icon: KanbanSquare },
  sprint: { label: 'Sprint', hint: 'Status columns crossed with priority lanes', icon: Zap },
  list: { label: 'List', hint: 'One dense line per task', icon: ListOrdered },
  calendar: { label: 'Calendar', hint: 'A month grid by deadline', icon: CalendarRange },
  agenda: { label: 'Agenda', hint: 'Day buckets, ordered by hour', icon: Rows3 },
};

/**
 * Picks the shape the same set of tasks is drawn in.
 *
 * Its own control rather than another entry in the filter row: a filter changes
 * *which* tasks you are looking at, and this changes *how* — mixing the two
 * into one strip made both harder to find.
 */
export const LayoutSwitcher = ({ value, options, onChange, className }: LayoutSwitcherProps) => (
  <div
    role="group"
    aria-label="Layout"
    className={cn(
      'ui-segment inline-flex items-center gap-1 rounded-xl border border-edge bg-surface-sunken p-1',
      className,
    )}
  >
    {options.map((option) => {
      const { label, hint, icon: Icon } = META[option];
      const isActive = value === option;

      return (
        <button
          key={option}
          type="button"
          title={hint}
          aria-pressed={isActive}
          onClick={() => onChange(option)}
          className={cn(
            // Five of these share a line with the filter row, so they are as
            // tight as a 12px label allows.
            'inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium',
            'transition-colors duration-150',
            isActive
              ? 'bg-surface-raised text-content shadow-sm'
              : 'text-content-muted hover:text-content',
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      );
    })}
  </div>
);
