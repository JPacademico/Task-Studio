export type ThemePreference = 'LIGHT' | 'DARK' | 'SYSTEM';

/**
 * The visual language the interface is drawn in — orthogonal to light/dark,
 * which stays a palette choice inside whichever skin is active.
 */
export type ThemeSkin = 'STUDIO' | 'PAPER' | 'TERMINAL' | 'VINTAGE' | 'PIXEL' | 'SPACE';

/** The one place a skin's human name is written down. */
export const SKIN_LABELS: Record<ThemeSkin, string> = {
  STUDIO: 'Studio',
  PAPER: 'Paper',
  TERMINAL: 'Terminal',
  VINTAGE: 'Vintage',
  PIXEL: 'Pixel art',
  SPACE: 'Space',
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
