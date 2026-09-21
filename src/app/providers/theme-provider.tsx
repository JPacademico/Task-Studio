import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { normaliseSkin, type ThemePreference, type ThemeSkin } from '@/entities/user/model/types';
import { userApi } from '@/entities/user/api/user.api';
import { useSessionStore } from '@/features/auth/model/session.store';
import { STORAGE_KEYS } from '@/shared/config/constants';

interface ThemeContextValue {
  preference: ThemePreference;
  isDark: boolean;
  setPreference: (preference: ThemePreference) => void;
  toggle: () => void;
  /** The visual language the whole app is drawn in. */
  skin: ThemeSkin;
  setSkin: (skin: ThemeSkin) => void;
  /** Whether a skin that draws its own pointer is allowed to. */
  hasCustomCursor: boolean;
  setHasCustomCursor: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const readStored = (): ThemePreference => {
  try {
    return (localStorage.getItem(STORAGE_KEYS.theme) as ThemePreference | null) ?? 'SYSTEM';
  } catch {
    return 'SYSTEM';
  }
};

const readStoredSkin = (): ThemeSkin => {
  try {
    return normaliseSkin(localStorage.getItem(STORAGE_KEYS.themeSkin));
  } catch {
    return 'STUDIO';
  }
};

/**
 * Whether the skins that draw their own pointer are allowed to.
 *
 * On unless somebody turned it off: a skin that ships a cursor ships it as part
 * of the look, and a theme gallery whose previews lie about what you are about
 * to get is worse than one extra checkbox.
 *
 * Stored only on this device, deliberately, and this is the one preference in
 * this file that is *not* mirrored to the profile. A custom cursor is a
 * statement about the machine it is drawn on — a trackpad on a 4K laptop, a
 * borrowed desktop, a screen being shared in a meeting — rather than about the
 * person. Following somebody across devices is exactly the wrong behaviour for
 * it, and it would need a column on the user row to do the wrong thing.
 */
const readStoredCursor = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEYS.customCursor) !== 'off';
  } catch {
    return true;
  }
};

const resolveIsDark = (preference: ThemePreference): boolean =>
  preference === 'DARK' ||
  (preference === 'SYSTEM' && window.matchMedia('(prefers-color-scheme: dark)').matches);

const SKIN_ATTRIBUTE: Record<ThemeSkin, string> = {
  STUDIO: 'studio',
  PAPER: 'paper',
  TERMINAL: 'terminal',
  VINTAGE: 'vintage',
  PIXEL: 'pixel',
  SPACE: 'space',
  HAZARD: 'hazard',
  NEWSPAPER: 'newspaper',
  ELDRITCH: 'eldritch',
  AUTUMN: 'autumn',
  RUNIC: 'runic',
  UNDERWATER: 'underwater',
  VOLCANO: 'volcano',
  HALLOWEEN: 'halloween',
  VIBECODED: 'vibecoded',
};

/**
 * Theme is two orthogonal axes, both applied to <html>: the palette through the
 * `dark` class and the skin through `data-skin`. Every colour, radius and font
 * in the design system resolves through CSS variables, so either swap costs one
 * attribute mutation — no React re-render and no repaint of component trees.
 *
 * Both preferences are mirrored to the user's profile so they follow them
 * across devices, but `localStorage` stays authoritative for first paint (see
 * the inline script in index.html).
 */
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const user = useSessionStore((state) => state.user);
  const [preference, setPreferenceState] = useState<ThemePreference>(readStored);
  const [isDark, setIsDark] = useState(() => resolveIsDark(readStored()));
  const [skin, setSkinState] = useState<ThemeSkin>(readStoredSkin);
  const [hasCustomCursor, setCursorState] = useState<boolean>(readStoredCursor);

  const apply = useCallback((next: ThemePreference) => {
    const dark = resolveIsDark(next);
    document.documentElement.classList.toggle('dark', dark);
    setIsDark(dark);
  }, []);

  const applySkin = useCallback((next: ThemeSkin) => {
    document.documentElement.dataset.skin = SKIN_ATTRIBUTE[next] ?? 'studio';
  }, []);

  /*
   * One attribute, and only when it is off.
   *
   * The cursor blocks in `index.css` are written as
   * `html:not([data-cursor='off']) [data-skin='…']`, so the presence of this
   * attribute drops every one of them and the system pointer comes back. The
   * absent case is the default, which means a page that never runs this — a
   * cached shell, a crashed bundle — still draws the skin as designed.
   */
  const applyCursor = useCallback((enabled: boolean) => {
    if (enabled) delete document.documentElement.dataset.cursor;
    else document.documentElement.dataset.cursor = 'off';
  }, []);

  // Both attributes are set pre-paint by index.html; re-assert them on mount so
  // a storage read that failed there (private mode) still lands.
  useEffect(() => applySkin(skin), [applySkin, skin]);
  useEffect(() => applyCursor(hasCustomCursor), [applyCursor, hasCustomCursor]);

  // Adopt the server-side preferences once the session resolves.
  useEffect(() => {
    if (user?.theme && user.theme !== readStored()) {
      setPreferenceState(user.theme);
      try {
        localStorage.setItem(STORAGE_KEYS.theme, user.theme);
      } catch {
        /* ignore */
      }
      apply(user.theme);
    }
  }, [apply, user?.theme]);

  useEffect(() => {
    if (!user?.themeSkin) return;

    // A profile written by an older client still says STEAMPUNK.
    const serverSkin = normaliseSkin(user.themeSkin);
    if (serverSkin === readStoredSkin()) return;

    setSkinState(serverSkin);
    try {
      localStorage.setItem(STORAGE_KEYS.themeSkin, serverSkin);
    } catch {
      /* ignore */
    }
    applySkin(serverSkin);
  }, [applySkin, user?.themeSkin]);

  // Follow the OS while the preference is SYSTEM.
  useEffect(() => {
    if (preference !== 'SYSTEM') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => apply('SYSTEM');
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [apply, preference]);

  const setPreference = useCallback(
    (next: ThemePreference) => {
      setPreferenceState(next);
      try {
        localStorage.setItem(STORAGE_KEYS.theme, next);
      } catch {
        /* ignore */
      }
      apply(next);

      // Best-effort sync; a failed write must not block the UI.
      if (useSessionStore.getState().status === 'authenticated') {
        void userApi.updateProfile({ theme: next }).catch(() => undefined);
      }
    },
    [apply],
  );

  const setSkin = useCallback(
    (next: ThemeSkin) => {
      setSkinState(next);
      try {
        localStorage.setItem(STORAGE_KEYS.themeSkin, next);
      } catch {
        /* ignore */
      }
      applySkin(next);

      if (useSessionStore.getState().status === 'authenticated') {
        void userApi.updateProfile({ themeSkin: next }).catch(() => undefined);
      }
    },
    [applySkin],
  );

  const setHasCustomCursor = useCallback(
    (enabled: boolean) => {
      setCursorState(enabled);
      try {
        localStorage.setItem(STORAGE_KEYS.customCursor, enabled ? 'on' : 'off');
      } catch {
        /* ignore */
      }
      applyCursor(enabled);
    },
    [applyCursor],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      isDark,
      setPreference,
      toggle: () => setPreference(isDark ? 'LIGHT' : 'DARK'),
      skin,
      setSkin,
      hasCustomCursor,
      setHasCustomCursor,
    }),
    [hasCustomCursor, isDark, preference, setHasCustomCursor, setPreference, setSkin, skin],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>.');
  return context;
};

/**
 * The active skin, without requiring the provider.
 *
 * Loaders are the one thing that can legitimately render before the tree is
 * fully mounted — a Suspense fallback, an error boundary — so asking for the
 * skin must never be the thing that throws. Falls back to the default look.
 */
export const useSkin = (): ThemeSkin => useContext(ThemeContext)?.skin ?? 'STUDIO';
