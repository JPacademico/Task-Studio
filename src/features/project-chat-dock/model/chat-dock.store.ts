import { create } from 'zustand';

import { STORAGE_KEYS } from '@/shared/config/constants';

/** Which conversation the window shows: the project's live chat, or its task threads. */
export type ChatView = 'general' | 'tasks';

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
  view: ChatView;
  /** The task thread open under "Tasks", or `null` for the list of threads. */
  threadTaskId: string | null;

  open: (projectId: string, projectName: string) => void;
  /** Opens the window straight onto one task's thread. */
  openThread: (projectId: string, projectName: string, taskId: string) => void;
  setView: (view: ChatView) => void;
  /** Picks a thread under "Tasks", or `null` to go back to the list. */
  showThread: (taskId: string | null) => void;
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
 * Where the project conversation lives. The window used to be owned by the project page, which
 * meant it could only exist while you were looking at that project.
 */
export const useChatDock = create<ChatDockState>((set, get) => ({
  projectId: restored?.projectId ?? null,
  projectName: restored?.projectName ?? '',
  // A pin that was in when the tab closed is still in when it comes back;
  // anything less makes the gesture feel like it did not take.
  isOpen: Boolean(restored),
  isPinned: Boolean(restored),
  unread: 0,
  view: 'general',
  threadTaskId: null,

  open: (projectId, projectName) => {
    const isSame = get().projectId === projectId;
    // Opening a different project's chat moves the window rather than stacking a second one, and a
    // move drops the pin: it was stuck to that other conversation, not to the frame.
    if (!isSame && get().isPinned) write(null);

    set({
      projectId,
      projectName,
      isOpen: true,
      unread: 0,
      isPinned: isSame ? get().isPinned : false,
      // A fresh window opens on the live chat; another project's threads are not this one's.
      ...(isSame && get().isOpen ? {} : { view: 'general' as const, threadTaskId: null }),
    });
  },

  openThread: (projectId, projectName, taskId) => {
    get().open(projectId, projectName);
    set({ view: 'tasks', threadTaskId: taskId });
  },

  setView: (view) => set({ view }),

  showThread: (threadTaskId) => set({ view: 'tasks', threadTaskId }),

  // The view is left as it was, so a window fading out does not flip to the live chat.
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
