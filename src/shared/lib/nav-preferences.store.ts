import { create } from 'zustand';

import { STORAGE_KEYS } from '@/shared/config/constants';

/** The three hover-revealed surfaces a user can pin open. */
export type NavEdge = 'left' | 'top' | 'right';

type PinnedEdges = Record<NavEdge, boolean>;

/**
 * What the right rail is a list *of*. Projects by default, because that is what the rail has always
 * been and what most people open it for — a company is a place you visit occasionally.
 */
export type RailScope = 'projects' | 'organizations';

interface NavPreferencesState {
  pinned: PinnedEdges;
  togglePin: (edge: NavEdge) => void;
  setPin: (edge: NavEdge, pinned: boolean) => void;

  railScope: RailScope;
  setRailScope: (scope: RailScope) => void;
}

/**
 * The top bar starts pinned; the two side rails do not. The bar carries the things a person looks
 * for when they do not yet know where anything is: the logo, the new-project button.
 */
const DEFAULTS: PinnedEdges = { left: false, top: true, right: false };

/**
 * Bumped when a *default* changes, not when the shape does. Stored preferences are the whole reason
 * a changed default needs a version.
 */
const VERSION = 1;

interface StoredPreferences extends Partial<PinnedEdges> {
  v?: number;
}

const read = (): PinnedEdges => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.pinnedNav);
    if (!raw) return DEFAULTS;

    const stored = JSON.parse(raw) as StoredPreferences;
    const { v, ...pinned } = stored;

    // Pre-versioning blob: take everything except the edges whose default moved.
    if (v !== VERSION) return { ...DEFAULTS, left: pinned.left ?? DEFAULTS.left, right: pinned.right ?? DEFAULTS.right };

    return { ...DEFAULTS, ...pinned };
  } catch {
    return DEFAULTS;
  }
};

const write = (pinned: PinnedEdges): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.pinnedNav, JSON.stringify({ ...pinned, v: VERSION }));
  } catch {
    /* private mode — the preference stays for this session only */
  }
};

/**
 * Which menus the user has pinned open. Hidden-by-default menus are the point of the layout, but a
 * user working in one place all day should be able to nail one down.
 */
const readRailScope = (): RailScope => {
  try {
    return localStorage.getItem(STORAGE_KEYS.railScope) === 'organizations'
      ? 'organizations'
      : 'projects';
  } catch {
    return 'projects';
  }
};

export const useNavPreferences = create<NavPreferencesState>((set) => {
  const initial = read();

  // Written back at once, before anything is toggled. Otherwise the migration above re-runs on
  // every load until the user happens to touch a pin.
  write(initial);

  return {
    pinned: initial,

    togglePin: (edge) =>
      set((state) => {
        const pinned = { ...state.pinned, [edge]: !state.pinned[edge] };
        write(pinned);
        return { pinned };
      }),

    setPin: (edge, value) =>
      set((state) => {
        const pinned = { ...state.pinned, [edge]: value };
        write(pinned);
        return { pinned };
      }),

    // Read lazily rather than written back on boot, unlike the pins above. The pins need an eager
    // write because a *default* moved and the migration has to be recorded.
    railScope: readRailScope(),

    setRailScope: (scope) => {
      try {
        localStorage.setItem(STORAGE_KEYS.railScope, scope);
      } catch {
        /* private mode — the choice holds for this session only */
      }
      set({ railScope: scope });
    },
  };
});

export const useIsNavPinned = (edge: NavEdge): boolean =>
  useNavPreferences((state) => state.pinned[edge]);
