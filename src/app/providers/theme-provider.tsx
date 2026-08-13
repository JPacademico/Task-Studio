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

  const apply = useCallback((next: ThemePreference) => {
    const dark = resolveIsDark(next);
    document.documentElement.classList.toggle('dark', dark);
    setIsDark(dark);
  }, []);

  const applySkin = useCallback((next: ThemeSkin) => {
    document.documentElement.dataset.skin = SKIN_ATTRIBUTE[next] ?? 'studio';
  }, []);

  // The attribute is set pre-paint by index.html; re-assert it on mount so a
  // storage write that failed there (private mode) still lands.
  useEffect(() => applySkin(skin), [applySkin, skin]);

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

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      isDark,
      setPreference,
      toggle: () => setPreference(isDark ? 'LIGHT' : 'DARK'),
      skin,
      setSkin,
    }),
    [isDark, preference, setPreference, setSkin, skin],
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
