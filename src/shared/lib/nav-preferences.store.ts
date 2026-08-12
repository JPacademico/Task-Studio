import { create } from 'zustand';

import { STORAGE_KEYS } from '@/shared/config/constants';

/** The three hover-revealed surfaces a user can pin open. */
export type NavEdge = 'left' | 'top' | 'right';

type PinnedEdges = Record<NavEdge, boolean>;

interface NavPreferencesState {
  pinned: PinnedEdges;
  togglePin: (edge: NavEdge) => void;
  setPin: (edge: NavEdge, pinned: boolean) => void;
}

const DEFAULTS: PinnedEdges = { left: false, top: false, right: false };

const read = (): PinnedEdges => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.pinnedNav);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<PinnedEdges>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
};

const write = (pinned: PinnedEdges): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.pinnedNav, JSON.stringify(pinned));
  } catch {
    /* private mode — the preference stays for this session only */
  }
};

/**
 * Which menus the user has pinned open.
 *
 * Hidden-by-default menus are the point of the layout, but a user working in
 * one place all day should be able to nail one down. The choice is per device,
 * so it lives in localStorage rather than on the profile.
 */
export const useNavPreferences = create<NavPreferencesState>((set) => ({
  pinned: read(),

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
}));

export const useIsNavPinned = (edge: NavEdge): boolean =>
  useNavPreferences((state) => state.pinned[edge]);
