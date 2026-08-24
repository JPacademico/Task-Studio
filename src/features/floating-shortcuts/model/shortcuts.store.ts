import { create } from 'zustand';

import { STORAGE_KEYS } from '@/shared/config/constants';
import type { TranslationKey } from '@/shared/i18n';

/** Which glyph the pill draws. Stored as a key so the value stays serialisable. */
export type ShortcutIcon =
  | 'dashboard'
  | 'tasks'
  | 'notes'
  | 'meetings'
  | 'organizations'
  | 'invitations'
  | 'recycle'
  | 'settings'
  | 'themes'
  | 'project';

export interface FloatingShortcut {
  /** `kind:route` — one pill per destination, so a second tear-off is a no-op. */
  id: string;
  kind: 'nav' | 'project' | 'organization';
  to: string;
  /**
   * What the pill reads.
   *
   * Two fields because the two kinds of pill mean different things by "label".
   * A nav pill's text is interface copy and must follow the language setting,
   * so it stores `labelKey` and is translated at render. A *project* or
   * *organization* pill's text is the name somebody typed — user data, and
   * translating it would be a bug — so it stores `label` and is drawn
   * verbatim.
   *
   * `label` is also what pills pinned before this existed still carry, so it
   * doubles as the fallback and nothing needs migrating.
   */
  label: string;
  labelKey?: TranslationKey;
  icon: ShortcutIcon;
  /** The project's or company's own colour, for those pills. */
  color?: string;
  x: number;
  y: number;
}

interface ShortcutsState {
  items: FloatingShortcut[];
  add: (shortcut: FloatingShortcut) => void;
  move: (id: string, x: number, y: number) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const PILL = { width: 190, height: 44 };

/** Keeps a pill on screen, whatever the window was when it was dropped. */
export const clampToViewport = (x: number, y: number): { x: number; y: number } => {
  const maxX = Math.max(8, window.innerWidth - PILL.width);
  const maxY = Math.max(8, window.innerHeight - PILL.height);
  return {
    x: Math.round(Math.min(Math.max(8, x), maxX)),
    y: Math.round(Math.min(Math.max(8, y), maxY)),
  };
};

const read = (): FloatingShortcut[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.shortcuts);
    const parsed = raw ? (JSON.parse(raw) as FloatingShortcut[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const write = (items: FloatingShortcut[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.shortcuts, JSON.stringify(items));
  } catch {
    /* private mode — the layout stays for this session only */
  }
};

/**
 * Menu entries the user has torn out of a rail and pinned to the screen.
 *
 * The hidden rails are the point of the layout, but a person who lives in one
 * place all day should be able to keep that one place within reach without
 * pinning a whole 264px panel open. A shortcut is a copy, not a move: the entry
 * stays in its menu, and the pill's return control simply drops the copy.
 *
 * Per device rather than per account — where you want a thing on screen depends
 * on the screen — so it lives in localStorage.
 */
export const useFloatingShortcuts = create<ShortcutsState>((set) => ({
  items: read(),

  add: (shortcut) =>
    set((state) => {
      if (state.items.some((item) => item.id === shortcut.id)) return state;

      const items = [...state.items, { ...shortcut, ...clampToViewport(shortcut.x, shortcut.y) }];
      write(items);
      return { items };
    }),

  move: (id, x, y) =>
    set((state) => {
      const items = state.items.map((item) =>
        item.id === id ? { ...item, ...clampToViewport(x, y) } : item,
      );
      write(items);
      return { items };
    }),

  remove: (id) =>
    set((state) => {
      const items = state.items.filter((item) => item.id !== id);
      write(items);
      return { items };
    }),

  clear: () =>
    set(() => {
      write([]);
      return { items: [] };
    }),
}));
