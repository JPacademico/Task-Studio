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

/**
 * The top bar starts pinned; the two side rails do not.
 *
 * The bar carries the things a person looks for when they do not yet know
 * where anything is: the logo, the new-project button, the notification bell,
 * the account menu. Hiding all four behind a hover on an edge nobody has been
 * told about is a first run that looks like a page with no controls on it —
 * several people got as far as "how do I sign out" before finding the bar at
 * all. The rails are different: they are navigation between places you already
 * know exist, and there is a visible edge affordance pointing at each.
 *
 * The pin button in the bar is untouched, so this is a starting position and
 * not a decision — one click puts the bar back to hiding, and that choice
 * persists.
 */
const DEFAULTS: PinnedEdges = { left: false, top: true, right: false };

/**
 * Bumped when a *default* changes, not when the shape does.
 *
 * Stored preferences are the whole reason a changed default needs a version:
 * everybody who has ever opened the app has `{"left":false,"top":false,...}`
 * in localStorage, and merging that over a new default reinstates the old one
 * for exactly the existing users the change was made for. So a blob written
 * before this version is read as "these are last version's defaults, not
 * choices", and the edges whose defaults have moved are re-seeded.
 *
 * `left` and `right` are still honoured from an old blob: their defaults have
 * not changed, so a `true` there can only have come from a deliberate pin.
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
 * Which menus the user has pinned open.
 *
 * Hidden-by-default menus are the point of the layout, but a user working in
 * one place all day should be able to nail one down. The choice is per device,
 * so it lives in localStorage rather than on the profile.
 */
export const useNavPreferences = create<NavPreferencesState>((set) => {
  const initial = read();

  /*
   * Written back at once, before anything is toggled.
   *
   * Otherwise the migration above re-runs on every load until the user happens
   * to touch a pin, and a bar they deliberately unpinned in one session would
   * come back pinned in the next — which is the opposite of leaving them the
   * choice.
   */
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
  };
});

export const useIsNavPinned = (edge: NavEdge): boolean =>
  useNavPreferences((state) => state.pinned[edge]);
