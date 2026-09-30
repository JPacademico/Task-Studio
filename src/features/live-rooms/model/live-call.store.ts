import { create } from 'zustand';

/** The call this tab is in, as the rest of the app needs to know it. */
export interface ActiveLiveCall {
  projectId: string;
  roomId: string;
  roomTitle: string;
  /** Hangs up: tells the room, stops the devices, closes every connection. */
  leave: () => void;
}

interface LiveCallState {
  active: ActiveLiveCall | null;
  register: (call: ActiveLiveCall) => void;
  /** Clears the call, but only if it is still this room's. */
  unregister: (roomId: string) => void;
}

/**
 * Whether this tab is in a live call, and where.
 *
 * ## Why this exists
 *
 * The call is owned by `LiveStage`, deep inside the project page's Live tab,
 * and everything about it used to be private to that component. Two things
 * outside it now need to know:
 *
 *   - the project page, which keeps the stage mounted (and hidden) while the
 *     reader is on another of the project's tabs, so that looking at the board
 *     does not hang up the call;
 *   - `LiveCallGuard`, which stops the reader leaving the project without
 *     being told that doing so ends the call.
 *
 * It holds only what those two need. The peer connections, the devices and the
 * roster all stay in `useLiveCall`, where their lifecycle is.
 */
export const useLiveCallStore = create<LiveCallState>((set) => ({
  active: null,
  register: (call) => set({ active: call }),
  unregister: (roomId) =>
    set((state) => (state.active?.roomId === roomId ? { active: null } : state)),
}));
