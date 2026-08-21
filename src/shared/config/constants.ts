import type { TaskPriority, TaskStatus, TaskType } from '@/entities/task/model/types';
import type { TranslationKey } from '@/shared/i18n/locales';

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
  locale: 'task-studio:locale',
  /** Last session's task/project/board caches — see `query-persist.ts`. */
  queryCache: 'task-studio:query-cache',
  /**
   * Set once the user has turned our own notification offer down.
   *
   * Not the browser's permission state — that lives in the browser and answers
   * a different question. This one exists so a "Not now" is final rather than
   * re-asked on every visit. See `shared/lib/notifications.ts`.
   */
  notificationsDeclined: 'task-studio:notifications-declined',
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

/*
 * The words are keys, not words.
 *
 * These tables carry two different kinds of thing: presentation that belongs to
 * the design system (the accent colour, the status dot) and vocabulary that
 * belongs to the language the user reads in. Keeping literal English here made
 * the second kind untranslatable — every card, badge and filter that rendered
 * `meta.label` printed English regardless of the chosen language, which is most
 * of the task surface.
 *
 * Storing a `TranslationKey` instead keeps the table where it belongs and moves
 * the resolution to the call site, which is the only place that has a `t`. The
 * type is what makes it safe: a key with no entry in the dictionary is a
 * compile error, so this cannot silently drift out of step with the locales.
 */
export const TASK_TYPE_META: Record<
  TaskType,
  { label: TranslationKey; short: TranslationKey; hint: TranslationKey; accent: string }
> = {
  MEGA: {
    label: 'type.MEGA',
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
    short: 'type.MEGA.short',
    hint: 'type.MEGA.hint',
    accent: 'text-violet-500',
  },
  MICRO: {
    label: 'type.MICRO',
    short: 'type.MICRO.short',
    hint: 'type.MICRO.hint',
    accent: 'text-amber-500',
  },
  MULTI: {
    label: 'type.MULTI',
    short: 'type.MULTI.short',
    hint: 'type.MULTI.hint',
    accent: 'text-emerald-500',
  },
  STANDARD: {
    label: 'type.STANDARD',
    short: 'type.STANDARD.short',
    hint: 'type.STANDARD.hint',
    accent: 'text-sky-500',
  },
};

export const TASK_STATUS_META: Record<TaskStatus, { label: TranslationKey; dot: string }> = {
  TODO: { label: 'status.TODO', dot: 'bg-content-faint' },
  IN_PROGRESS: { label: 'status.IN_PROGRESS', dot: 'bg-warning' },
  COMPLETED: { label: 'status.COMPLETED', dot: 'bg-positive' },
};

export const TASK_PRIORITY_META: Record<
  TaskPriority,
  { label: TranslationKey; className: string }
> = {
  LOW: { label: 'priority.LOW', className: 'text-content-faint' },
  NORMAL: { label: 'priority.NORMAL', className: 'text-content-muted' },
  HIGH: { label: 'priority.HIGH', className: 'text-warning' },
  URGENT: { label: 'priority.URGENT', className: 'text-danger' },
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

/**
 * Height of the top bar, in pixels — `3.5rem` plus a little slack.
 *
 * Mirrors `.safe-top-bar` in `index.css`. Read by the right-hand rail, which
 * refuses to open from inside this band so that reaching for the account menu
 * at the far right of the bar cannot throw the project rail across the page.
 * The notch inset is not added: over-reserving here would block a strip of the
 * page proper, and the controls that caused the problem all sit in the row.
 */
export const TOP_BAR_PX = 60;
