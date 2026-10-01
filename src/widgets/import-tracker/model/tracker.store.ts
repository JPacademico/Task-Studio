import { create } from 'zustand';

interface TrackerState {
  /**
   * Jobs the reader has waved away. Ids rather than a flag on the job, because the job is server
   * state that this client does not own: it arrives from a query and from a socket.
   */
  dismissed: Set<string>;

  /**
   * Whether the card is rolled up to its title bar. A single boolean for the whole tracker rather
   * than one per job: there is at most one import at a time (the API refuses a second).
   */
  isCollapsed: boolean;

  dismiss: (jobId: string) => void;
  setCollapsed: (isCollapsed: boolean) => void;
}

/**
 * The bits of the import tracker that are about the *reader*, not the import. Kept apart from the
 * query cache on purpose.
 */
export const useImportTracker = create<TrackerState>((set) => ({
  dismissed: new Set(),
  isCollapsed: false,

  dismiss: (jobId) =>
    set((state) => {
      // A new `Set` rather than mutating: zustand compares by reference, and a
      // mutated set is the same object, so nothing would re-render.
      const next = new Set(state.dismissed);
      next.add(jobId);
      return { dismissed: next };
    }),

  setCollapsed: (isCollapsed) => set({ isCollapsed }),
}));
