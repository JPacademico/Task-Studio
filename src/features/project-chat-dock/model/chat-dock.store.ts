import { create } from 'zustand';

import { STORAGE_KEYS } from '@/shared/config/constants';

interface ChatDockState {
  /** Which project's conversation is on screen, if any. */
  projectId: string | null;
  projectName: string;
  isOpen: boolean;
  /**
   * The pin is in. The window then outlives the project page it was opened
   * from and follows the user across every other tab.
   */
  isPinned: boolean;
  /** Messages that arrived while the window was closed. */
  unread: number;

  open: (projectId: string, projectName: string) => void;
  close: () => void;
  setPinned: (isPinned: boolean) => void;
  setUnread: (unread: number) => void;
  /** Keeps a pinned window's title honest if the project is renamed. */
  syncName: (projectId: string, projectName: string) => void;
}

/** Only the part worth surviving a reload — never the unread count. */
interface PersistedDock {
  projectId: string;
  projectName: string;
}

const read = (): PersistedDock | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.chatDock);
    const parsed = raw ? (JSON.parse(raw) as PersistedDock) : null;
    return parsed && typeof parsed.projectId === 'string' ? parsed : null;
  } catch {
    return null;
  }
};

const write = (dock: PersistedDock | null): void => {
  try {
    if (dock) localStorage.setItem(STORAGE_KEYS.chatDock, JSON.stringify(dock));
    else localStorage.removeItem(STORAGE_KEYS.chatDock);
  } catch {
    /* private mode — the pin holds for this session only */
  }
};

const restored = read();

/**
 * Where the project conversation lives.
 *
 * The window used to be owned by the project page, which meant it could only
 * exist while you were looking at that project — the one place you least need
 * it, because the people in it are already on screen. Ownership now sits here,
 * and the layout renders the window, so the same conversation can stay open
 * while the user is on their dashboard, their own board or somebody else's
 * project.
 *
 * That reach is opt-in, and the opt-in is a physical gesture rather than a
 * setting: the pin. Unpinned, the window belongs to the page and closes with
 * it. Pinned, it is stuck to the screen and only the close button takes it
 * down — which is also why the pin survives a reload but the unread count does
 * not.
 */
export const useChatDock = create<ChatDockState>((set, get) => ({
  projectId: restored?.projectId ?? null,
  projectName: restored?.projectName ?? '',
  // A pin that was in when the tab closed is still in when it comes back;
  // anything less makes the gesture feel like it did not take.
  isOpen: Boolean(restored),
  isPinned: Boolean(restored),
  unread: 0,

  open: (projectId, projectName) => {
    const isSame = get().projectId === projectId;
    // Opening a different project's chat moves the window rather than stacking
    // a second one, and a move drops the pin: it was stuck to that other
    // conversation, not to the frame.
    if (!isSame && get().isPinned) write(null);

    set({
      projectId,
      projectName,
      isOpen: true,
      unread: 0,
      isPinned: isSame ? get().isPinned : false,
    });
  },

  close: () => {
    write(null);
    set({ isOpen: false, isPinned: false, unread: 0 });
  },

  setPinned: (isPinned) => {
    const { projectId, projectName } = get();
    if (!projectId) return;

    write(isPinned ? { projectId, projectName } : null);
    set({ isPinned });
  },

  setUnread: (unread) => set({ unread }),

  syncName: (projectId, projectName) =>
    set((state) => {
      if (state.projectId !== projectId || state.projectName === projectName) return state;
      if (state.isPinned) write({ projectId, projectName });
      return { projectName };
    }),
}));
