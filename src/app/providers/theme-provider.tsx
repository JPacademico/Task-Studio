import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  isFreeSkin,
  normaliseSkin,
  type ThemePreference,
  type ThemeSkin,
} from '@/entities/user/model/types';
import { userApi } from '@/entities/user/api/user.api';
import { useSessionStore } from '@/features/auth/model/session.store';
import { STORAGE_KEYS } from '@/shared/config/constants';
import { switchPalette } from './theme-wave';

interface ThemeContextValue {
  preference: ThemePreference;
  isDark: boolean;
  setPreference: (preference: ThemePreference) => void;
  toggle: () => void;
  /** The visual language the whole app is drawn in — a preview's, while one is on. */
  skin: ThemeSkin;
  /** Wears a skin for good: stored on this device and on the profile. */
  setSkin: (skin: ThemeSkin) => void;
  /**
   * Wears a skin *for now*, or stops (`null`). For the landing page's theme section, where anybody
   * may try any skin.
   */
  previewSkin: (skin: ThemeSkin | null) => void;
  /** Whether this account may *keep* a skin, as opposed to preview it. */
  canWearSkin: (skin: ThemeSkin) => boolean;
  /** Whether the signed-in account is on a paid plan, which unlocks every skin. */
  hasCustomThemes: boolean;
  /** Whether a skin that draws its own pointer is allowed to. */
  hasCustomCursor: boolean;
  setHasCustomCursor: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * The skin on its own, in a context of its own. Most of the app asks only "which skin": every
 * loader, every Post-it icon on every task card, the decor layers, the motion presets.
 */
const SkinContext = createContext<ThemeSkin>('STUDIO');

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
 * Whether the skins that draw their own pointer are allowed to. On unless somebody turned it off: a
 * skin that ships a cursor ships it as part of the look.
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
  DRAGON: 'dragon',
  KAIJU: 'kaiju',
};

/**
 * Theme is two orthogonal axes, both applied to <html>: the palette through the `dark` class and
 * the skin through `data-skin`.
 */
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const user = useSessionStore((state) => state.user);
  const status = useSessionStore((state) => state.status);
  const [preference, setPreferenceState] = useState<ThemePreference>(readStored);
  const [isDark, setIsDark] = useState(() => resolveIsDark(readStored()));
  const [skin, setSkinState] = useState<ThemeSkin>(readStoredSkin);
  const [preview, setPreview] = useState<ThemeSkin | null>(null);
  const [hasCustomCursor, setCursorState] = useState<boolean>(readStoredCursor);

  // Every skin but Studio and Paper is a paid look. The server is the authority — it will not store
  // a paid skin for a free account and reports the default in its place (`effectiveThemeSkin`).
  const hasCustomThemes = status === 'authenticated' && Boolean(user?.plan) && user?.plan !== 'FREE';
  const canWearSkin = useCallback(
    (candidate: ThemeSkin) => isFreeSkin(candidate) || hasCustomThemes,
    [hasCustomThemes],
  );

  /** What is actually on the document: a preview while one is running. */
  const shown = preview ?? skin;

  /**
   * Puts the palette on the document, as a wave when somebody is watching. `animate` is false for
   * the one change nobody asked to see.
   */
  const apply = useCallback((next: ThemePreference, animate = false) => {
    const dark = resolveIsDark(next);
    const root = document.documentElement;

    // Re-asserting the palette that is already on (a mount, a SYSTEM
    // preference re-read) is not a change and must not animate like one.
    if (root.classList.contains('dark') === dark) {
      setIsDark(dark);
      return;
    }

    switchPalette({
      flip: () => root.classList.toggle('dark', dark),
      // Non-urgent, so React renders the few components that read `isDark` in slices it can yield
      // between, rather than as one task that blocks the frames the wave is being drawn in.
      commit: () => startTransition(() => setIsDark(dark)),
      animate,
    });
  }, []);

  const applySkin = useCallback((next: ThemeSkin) => {
    document.documentElement.dataset.skin = SKIN_ATTRIBUTE[next] ?? 'studio';
  }, []);

  // One attribute, and only when it is off. The cursor blocks in `index.css` are written as
  // `html:not([data-cursor='off']) [data-skin='…']`.
  const applyCursor = useCallback((enabled: boolean) => {
    if (enabled) delete document.documentElement.dataset.cursor;
    else document.documentElement.dataset.cursor = 'off';
  }, []);

  // Both attributes are set pre-paint by index.html; re-assert them on mount so
  // a storage read that failed there (private mode) still lands.
  useEffect(() => applySkin(shown), [applySkin, shown]);

  // Nobody keeps a skin their plan does not cover. Two ways to arrive here with one. A visitor who
  // is not signed in with a paid skin stored on this device.
  useEffect(() => {
    if (status === 'loading') return;
    if (canWearSkin(skin)) return;

    setSkinState('STUDIO');
    try {
      localStorage.setItem(STORAGE_KEYS.themeSkin, 'STUDIO');
    } catch {
      /* ignore */
    }
  }, [canWearSkin, skin, status]);
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
    const listener = () => apply('SYSTEM', true);
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
      apply(next, true);

      // Best-effort sync; a failed write must not block the UI.
      if (useSessionStore.getState().status === 'authenticated') {
        void userApi.updateProfile({ theme: next }).catch(() => undefined);
      }
    },
    [apply],
  );

  const setSkin = useCallback(
    (next: ThemeSkin) => {
      // A locked skin is a preview at most; the pickers never offer this path
      // for one, and the API would refuse it anyway.
      if (!canWearSkin(next)) return;

      setPreview(null);
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
    [applySkin, canWearSkin],
  );

  const previewSkin = useCallback((next: ThemeSkin | null) => setPreview(next), []);

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
      skin: shown,
      setSkin,
      previewSkin,
      canWearSkin,
      hasCustomThemes,
      hasCustomCursor,
      setHasCustomCursor,
    }),
    [
      canWearSkin,
      hasCustomCursor,
      hasCustomThemes,
      isDark,
      preference,
      previewSkin,
      setHasCustomCursor,
      setPreference,
      setSkin,
      shown,
    ],
  );

  return (
    <ThemeContext.Provider value={value}>
      <SkinContext.Provider value={shown}>{children}</SkinContext.Provider>
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>.');
  return context;
};

/**
 * The active skin, without requiring the provider. Loaders are the one thing that can legitimately
 * render before the tree is fully mounted — a Suspense fallback, an error boundary.
 */
export const useSkin = (): ThemeSkin => useContext(SkinContext);
