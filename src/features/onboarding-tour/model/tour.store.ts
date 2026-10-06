import { create } from 'zustand';

import { userApi } from '@/entities/user/api/user.api';
import { useSessionStore } from '@/features/auth/model/session.store';
import { STORAGE_KEYS } from '@/shared/config/constants';

interface TourState {
  isOpen: boolean;
  /** Opens the tour from its first step. */
  start: () => void;
  /** Closes it, finished or skipped: either way it is done for this account. */
  finish: () => void;
}

const readDone = (): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.tutorialDone) ?? '[]') as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

/** Whether this account has finished the tour on this device, whatever the server said. */
export const isTourDoneHere = (userId: string): boolean => readDone().includes(userId);

const markDoneHere = (userId: string): void => {
  try {
    const done = readDone().filter((id) => id !== userId);
    // A handful of accounts at most share a browser; the list never needs to grow past that.
    localStorage.setItem(STORAGE_KEYS.tutorialDone, JSON.stringify([userId, ...done].slice(0, 10)));
  } catch {
    /* private mode — the server's copy is the one that counts */
  }
};

export const useTour = create<TourState>((set) => ({
  isOpen: false,
  start: () => set({ isOpen: true }),
  finish: () => {
    set({ isOpen: false });
    const user = useSessionStore.getState().user;
    if (!user) return;

    markDoneHere(user.id);
    // Recorded on the account, so it is not shown again on another device either.
    userApi
      .completeTutorial()
      .then((updated) => useSessionStore.getState().setUser(updated))
      .catch(() => undefined);
  },
}));
