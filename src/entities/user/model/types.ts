export type ThemePreference = 'LIGHT' | 'DARK' | 'SYSTEM';

/**
 * The visual language the interface is drawn in — orthogonal to light/dark,
 * which stays a palette choice inside whichever skin is active.
 */
export type ThemeSkin =
  | 'STUDIO'
  | 'PAPER'
  | 'TERMINAL'
  | 'VINTAGE'
  | 'PIXEL'
  | 'SPACE'
  | 'HAZARD'
  | 'NEWSPAPER'
  | 'ELDRITCH'
  | 'AUTUMN'
  | 'RUNIC'
  | 'UNDERWATER'
  | 'VOLCANO';

/** The one place a skin's human name is written down. */
export const SKIN_LABELS: Record<ThemeSkin, string> = {
  STUDIO: 'Studio',
  PAPER: 'Paper',
  TERMINAL: 'Terminal',
  VINTAGE: 'Vintage',
  PIXEL: 'Pixel art',
  SPACE: 'Space',
  HAZARD: 'Hazard',
  NEWSPAPER: 'Newsprint',
  ELDRITCH: 'Eldritch',
  AUTUMN: 'Autumn',
  RUNIC: 'Runic',
  UNDERWATER: 'Underwater',
  VOLCANO: 'Volcano',
};

/**
 * `VINTAGE` shipped as `STEAMPUNK`. That value survives in stored preferences
 * and in profiles written by an older client, so every entry point that reads
 * a skin normalises through here rather than trusting the string.
 */
export const normaliseSkin = (value: string | null | undefined): ThemeSkin => {
  if (value === 'STEAMPUNK') return 'VINTAGE';
  return value && value in SKIN_LABELS ? (value as ThemeSkin) : 'STUDIO';
};

export interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  isVerified: boolean;
  theme: ThemePreference;
  themeSkin: ThemeSkin;
  createdAt: string;
}

/** Embedded shape used in rosters, assignee chips and chat bubbles. */
export interface UserSummary {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  user: CurrentUser;
}

/**
 * A PDF or Word file pinned to a task or a meeting.
 *
 * One object or `null`, never three sibling nulls: the URL, the name and the
 * size are meaningless apart — the object key is a UUID, so without the name a
 * download arrives called nothing — and every surface that reads this branches
 * on "is there a file" exactly once. Mirrors the API's own shape.
 */
export interface AttachedFile {
  url: string;
  name: string;
  size: number;
}

/** What the composer sends back up: the key it uploaded, plus the two labels. */
export interface AttachedFileDraft {
  key: string;
  name: string;
  size: number;
  /** Only known in the session that uploaded it; used for the local preview. */
  url: string;
}
