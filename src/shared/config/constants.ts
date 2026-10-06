import type { TaskPriority, TaskStatus, TaskType } from '@/entities/task/model/types';
import type { TranslationKey } from '@/shared/i18n/locales';

export const STORAGE_KEYS = {
  accessToken: 'task-studio:access-token',
  refreshToken: 'task-studio:refresh-token',
  theme: 'task-studio:theme',
  themeSkin: 'task-studio:theme-skin',
  /**
   * Whether the skins that draw their own pointer may. Per-device rather than per-account, and the
   * only theme preference that is not mirrored to the profile.
   */
  customCursor: 'task-studio:custom-cursor',
  chatPosition: 'task-studio:chat-position',
  chatDock: 'task-studio:chat-dock',
  pinnedNav: 'task-studio:pinned-nav',
  /** Whether the right rail is listing projects or organizations. */
  railScope: 'task-studio:rail-scope',
  boardPage: 'task-studio:board-page',
  /**
   * The last answer this deployment gave about Figma. Not a preference and not a cache of user data
   * — a remembered fact about the *server*.
   */
  figmaAvailable: 'task-studio:figma-available',
  shortcuts: 'task-studio:floating-shortcuts',
  taskLayout: 'task-studio:task-layout',
  locale: 'task-studio:locale',
  /** A project invite link opened before signing in, joined once there is a session. */
  pendingInvite: 'task-studio:pending-invite',
  /** Account ids that finished the tour on this device, so a failed save does not replay it. */
  tutorialDone: 'task-studio:tutorial-done',
  /**
   * Which provider sign-in buttons the API offered last time. Cached so the sign-in screen can draw
   * them on the first frame instead of after a round trip to a container that may be asleep.
   */
  oauthProviders: 'task-studio:oauth-providers',
  /** Last session's task/project/board caches — see `query-persist.ts`. */
  queryCache: 'task-studio:query-cache',
  /**
   * Set once the user has turned our own notification offer down. Not the browser's permission
   * state — that lives in the browser and answers a different question.
   */
  notificationsDeclined: 'task-studio:notifications-declined',
  /**
   * Grouping-board columns this reader has folded away, per project. Local rather than on the
   * server on purpose: hiding a column is a statement about one person's screen this afternoon.
   */
  hiddenGroups: 'task-studio:hidden-groups',
  /**
   * Where the reader parked the import tracker. Per device rather than per account, exactly like
   * `chatPosition` and for the same reason.
   */
  importTrackerPosition: 'task-studio:import-tracker-position',
  /** Where the reader parked the Spotify player. Per device, as above. */
  spotifyPosition: 'task-studio:spotify-position',
  /**
   * Whether the player is pinned open. Per device for the same reason its position is: "keep this
   * on screen" is a statement about the screen in front of somebody.
   */
  spotifyPinned: 'task-studio:spotify-pinned',
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

// The words are keys, not words. These tables carry two different kinds of thing: presentation that
// belongs to the design system.
export const TASK_TYPE_META: Record<
  TaskType,
  { label: TranslationKey; short: TranslationKey; hint: TranslationKey; accent: string }
> = {
  MEGA: {
    label: 'type.MEGA',
    /**
     * What a card shows when the full name will not fit. Every skin picks its own family, and the
     * wide ones — the illustrated skin's 700-weight Nunito, the vintage serif.
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
 * How many notes one task's note checklist holds. Mirrored from the API's `MAX_TASK_NOTES`, which
 * is the authority.
 */
export const MAX_TASK_NOTES = 20;

/** Steps shown per page once a checklist is a list. Twenty rows was a wall of its own. */
export const CHECKLIST_PAGE_SIZE = 5;

/**
 * How many columns one project's grouping board may hold. Mirrored from the API's
 * `MAX_GROUPS_PER_PROJECT`, which is the authority. Ten, down from twelve.
 */
export const MAX_GROUPS_PER_PROJECT = 10;

/**
 * How many columns one page of the grouping board shows. Four, and the number is set by the
 * *widest* the board ever gets rather than by the cap.
 */
export const GROUP_COLUMNS_PER_PAGE = 4;

/** Distance from a screen edge (px) that reveals a hidden menu. */
export const EDGE_REVEAL_PX = 24;

/**
 * Height of the top bar, in pixels — `3.5rem` plus a little slack. Mirrors `.safe-top-bar` in
 * `index.css`.
 */
export const TOP_BAR_PX = 60;

/**
 * How long any one free-text field is allowed to get. Every field in the app used to carry its own
 * `maxLength`, or — for the ones added in a hurry — none at all.
 */
export const TEXT_LIMITS = {
  /** One line, on a card. */
  taskTitle: 140,
  /**
   * A few paragraphs, on the sheet — not a document. Was 4000, which is around two pages of prose.
   */
  taskDescription: 1500,
  /**
   * A sentence: "Book the room", not the minutes of the meeting. Still used by the composer, which
   * collects starting steps as plain lines before the task exists to hang notes off.
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
   * A document's *body*, as sanitised HTML. Mirrors the API's `DOCUMENT_CONTENT_LIMIT`. Generous,
   * because this is the one surface in the app that is genuinely meant to hold a document.
   */
  documentContent: 262_144,
  boardPageName: 40,

  /** A chat line. Longer than that is a note, or a document. */
  chatMessage: 2000,

  /**
   * Search boxes. Short on purpose: a query is a few words, and the value ends up in a query key
   * and often in a request.
   */
  search: 120,

  /** RFC 5321's ceiling on an address. */
  email: 254,
  /**
   * A password field. Generous — a passphrase manager will happily produce a hundred characters —
   * and bounded anyway.
   */
  password: 200,
  /** Links pasted into the editor. Comfortably past any real URL. */
  url: 2048,
} as const;
