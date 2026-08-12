import type { TaskPriority, TaskStatus, TaskType } from '@/entities/task/model/types';

export const STORAGE_KEYS = {
  accessToken: 'task-studio:access-token',
  refreshToken: 'task-studio:refresh-token',
  theme: 'task-studio:theme',
  themeSkin: 'task-studio:theme-skin',
  chatPosition: 'task-studio:chat-position',
  chatDock: 'task-studio:chat-dock',
  pinnedNav: 'task-studio:pinned-nav',
  boardPage: 'task-studio:board-page',
  shortcuts: 'task-studio:floating-shortcuts',
  taskLayout: 'task-studio:task-layout',
} as const;

/** Curated task palette — arbitrary hex is allowed, these are the one-click set. */
export const TASK_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#38bdf8',
  '#a3a3a3',
] as const;

/** Post-it palette, tuned to stay readable on both themes. */
export const NOTE_COLORS = [
  '#fde68a',
  '#bbf7d0',
  '#bfdbfe',
  '#fbcfe8',
  '#ddd6fe',
  '#fed7aa',
  '#e2e8f0',
] as const;

export const TASK_TYPE_META: Record<
  TaskType,
  { label: string; short: string; hint: string; accent: string }
> = {
  MEGA: {
    label: 'MegaTask',
    /**
     * What a card shows when the full name will not fit.
     *
     * Every skin picks its own family, and the wide ones — the illustrated
     * skin's 700-weight Nunito, the vintage serif, the arcade's pixel face —
     * render "MegaTask" materially wider than Inter does at the same nominal
     * size. Rather than let the badge grow into its neighbours or clip the
     * word, the card drops the "Task" suffix it was repeating on every row
     * anyway and keeps the part that carries the meaning.
     */
    short: 'Mega',
    hint: 'Longer than 2 days',
    accent: 'text-violet-500',
  },
  MICRO: {
    label: 'MicroTask',
    short: 'Micro',
    hint: 'Under 8 hours',
    accent: 'text-amber-500',
  },
  MULTI: {
    label: 'MultiTask',
    short: 'Multi',
    hint: 'Several assignees',
    accent: 'text-emerald-500',
  },
  STANDARD: {
    label: 'Task',
    short: 'Task',
    hint: 'Between 8 hours and 2 days',
    accent: 'text-sky-500',
  },
};

export const TASK_STATUS_META: Record<TaskStatus, { label: string; dot: string }> = {
  TODO: { label: 'To do', dot: 'bg-content-faint' },
  IN_PROGRESS: { label: 'In progress', dot: 'bg-warning' },
  COMPLETED: { label: 'Completed', dot: 'bg-positive' },
};

export const TASK_PRIORITY_META: Record<TaskPriority, { label: string; className: string }> = {
  LOW: { label: 'Low', className: 'text-content-faint' },
  NORMAL: { label: 'Normal', className: 'text-content-muted' },
  HIGH: { label: 'High', className: 'text-warning' },
  URGENT: { label: 'Urgent', className: 'text-danger' },
};

/** Pen colours on the notes board — saturated enough to read over any Post-it. */
export const BOARD_INK_COLORS = [
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#111827',
] as const;

/** Connector colours, matching the ink palette. */
export const CONNECTOR_COLORS = [
  '#6366f1',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#ec4899',
] as const;

/** Hard ceiling on the personal board, mirrored from the API. */
export const MAX_BOARD_PAGES = 10;

/** Distance from a screen edge (px) that reveals a hidden menu. */
export const EDGE_REVEAL_PX = 24;
