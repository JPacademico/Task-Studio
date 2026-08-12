import { create } from 'zustand';

import type { AuthSession, CurrentUser } from '@/entities/user/model/types';
import { tokenStore } from '@/shared/api/token-store';

type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface SessionState {
  status: SessionStatus;
  user: CurrentUser | null;
  /** Set after signup so the "check your inbox" screen knows who to nudge. */
  pendingEmail: string | null;

  startSession: (session: AuthSession) => void;
  setUser: (user: CurrentUser) => void;
  setStatus: (status: SessionStatus) => void;
  setPendingEmail: (email: string | null) => void;
  endSession: () => void;
}

/**
 * Session identity lives in Zustand rather than React Query: it is client state
 * (who am I right now) that many unrelated trees read, and it must survive
 * cache invalidation.
 */
export const useSessionStore = create<SessionState>((set) => ({
  status: tokenStore.isAuthenticated ? 'loading' : 'unauthenticated',
  user: null,
  pendingEmail: null,

  startSession: (session) => {
    tokenStore.set({ accessToken: session.accessToken, refreshToken: session.refreshToken });
    set({ status: 'authenticated', user: session.user, pendingEmail: null });
  },

  setUser: (user) => set({ user, status: 'authenticated' }),
  setStatus: (status) => set({ status }),
  setPendingEmail: (pendingEmail) => set({ pendingEmail }),

  endSession: () => {
    tokenStore.clear();
    set({ status: 'unauthenticated', user: null });
  },
}));

export const useCurrentUser = (): CurrentUser | null => useSessionStore((state) => state.user);
