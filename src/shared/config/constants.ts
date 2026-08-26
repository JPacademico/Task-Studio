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
  /** Whether the right rail is listing projects or organizations. */
  railScope: 'task-studio:rail-scope',
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

/**
 * How many notes one task's note checklist holds. Mirrored from the API's
 * `MAX_TASK_NOTES`, which is the authority — this is what lets the sheet grey
 * the "+" out *before* somebody writes a fourth note and is told it will not
 * fit.
 */
export const MAX_TASK_NOTES = 3;

/**
 * How many columns one project's grouping board may hold. Mirrored from the
 * API's `MAX_GROUPS_PER_PROJECT`.
 *
 * Twelve is past what fits on a laptop screen without horizontal scrolling and
 * comfortably past what anybody can hold in their head as a set of categories.
 * A board with thirty columns is not a grouping, it is a second task list.
 */
export const MAX_GROUPS_PER_PROJECT = 12;

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

/**
 * How long any one free-text field is allowed to get.
 *
 * ## Why this is one table rather than a number per form
 *
 * Every field in the app used to carry its own `maxLength`, or — for the ones
 * added in a hurry — none at all. The ones with none were the bug: a step
 * pasted from a document went into the database at whatever length the
 * clipboard held, and from then on *every* open of that task's sheet paid to
 * lay out a paragraph of text inside a one-line row. The sheet did not feel
 * slow because it was doing more work; it felt slow because one row was doing
 * an unbounded amount of it.
 *
 * A table also makes the limits comparable, which is how they stay sensible:
 * a title is a line, a step is a sentence, a description is a paragraph, and
 * anything that is genuinely a document goes to the text board instead.
 *
 * These mirror the API's own column limits. The client's job is to make the
 * ceiling visible while somebody types rather than to be the only thing
 * enforcing it — a rejected save after a long paste is a worse way to learn
 * about a limit than a field that simply stops accepting characters.
 */
export const TEXT_LIMITS = {
  /** One line, on a card. */
  taskTitle: 140,
  /**
   * A few paragraphs, on the sheet — not a document.
   *
   * Was 4000, which is around two pages of prose. That is not a task note; it
   * is the thing people paste in when they have nowhere better to put it, and
   * "nowhere better" stopped being true when the task sheet grew a link to the
   * project's text board. A task that needs two pages of context should have a
   * page, and the sheet will now take you to it.
   *
   * Deliberately *lower* than the API's own ceiling, which stays at 4000. The
   * two do different jobs: this one bounds what somebody can type into a fresh
   * field, and the API's admits descriptions written before this number
   * changed — so editing the title of an old task with a long description
   * still saves, rather than failing on a field the user never touched. The
   * same reasoning as `dateInputBounds`.
   */
  taskDescription: 1500,
  /**
   * A sentence: "Book the room", not the minutes of the meeting.
   *
   * Still used by the composer, which collects starting steps as plain lines
   * before the task exists to hang notes off. Once it does, a step is a Post-it
   * and `noteContent` is its ceiling.
   */
  checklistItem: 200,
  /** What fits on a Post-it before it stops being one. */
  noteContent: 2000,
  /** The headline written across the top of one. */
  noteTitle: 120,

  meetingTitle: 140,
  meetingLocation: 120,
  meetingAgenda: 4000,

  projectName: 80,
  projectDescription: 500,
  organizationName: 80,
  organizationDescription: 500,
  teamName: 60,
  teamDescription: 280,

  /** A grouping-board column header, which has to fit without wrapping. */
  groupName: 32,

  /** Free text on a person: "Head of Delivery". */
  jobTitle: 280,
  displayName: 60,
  bio: 280,

  /** Titles on the text board and the notes board's pages. */
  documentTitle: 160,
  /**
   * A document's *body*, as sanitised HTML.
   *
   * Mirrors the API's `DOCUMENT_CONTENT_LIMIT`. Generous, because this is the
   * one surface in the app that is genuinely meant to hold a document — rich
   * text with a few inline images runs to tens of kilobytes. Past a quarter of
   * a megabyte it is a pasted binary rather than a page, which is the case
   * this stops: without it the save simply 400s after the user has already
   * typed, and the editor gives no hint which of the last hour's paragraphs
   * was the problem.
   */
  documentContent: 262_144,
  boardPageName: 40,

  /** A chat line. Longer than that is a note, or a document. */
  chatMessage: 2000,

  /**
   * Search boxes.
   *
   * Short on purpose: a query is a few words, and the value ends up in a query
   * key and often in a request, so an unbounded one is a cache key nobody can
   * read and a URL some proxy will refuse.
   */
  search: 120,

  /** RFC 5321's ceiling on an address. */
  email: 254,
  /**
   * A password field.
   *
   * Generous — a passphrase manager will happily produce a hundred characters —
   * and bounded anyway, because the value is hashed on the API and a bcrypt-
   * family hash of an unbounded input is a CPU cost somebody else chooses for
   * you. Long enough that no real password meets it.
   */
  password: 200,
  /** Links pasted into the editor. Comfortably past any real URL. */
  url: 2048,
} as const;
