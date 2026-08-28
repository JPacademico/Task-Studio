import { create } from 'zustand';

interface TrackerState {
  /**
   * Jobs the reader has waved away.
   *
   * Ids rather than a flag on the job, because the job is server state that
   * this client does not own: it arrives from a query and from a socket, and
   * any field written onto it locally would be overwritten by the next event.
   * Dismissal is a fact about *this tab*, held where facts about this tab live.
   *
   * Deliberately not persisted. The API only lists finished jobs for a quarter
   * of an hour, so the set has nothing to protect against across a reload — and
   * a dismissal that survived one would mean an import somebody hid on Monday
   * staying hidden if it somehow reappeared, which is the wrong default for a
   * thing whose whole job is to be noticed.
   */
  dismissed: Set<string>;

  /**
   * Whether the card is rolled up to its title bar.
   *
   * A single boolean for the whole tracker rather than one per job: there is
   * at most one import at a time (the API refuses a second), so per-job state
   * would be a `Map` that never holds more than one entry.
   */
  isCollapsed: boolean;

  dismiss: (jobId: string) => void;
  setCollapsed: (isCollapsed: boolean) => void;
}

/**
 * The bits of the import tracker that are about the *reader*, not the import.
 *
 * Kept apart from the query cache on purpose. Everything about what an import
 * is doing comes from the API and is owned by React Query; everything about
 * how this person wants to look at it — dismissed, collapsed — is local, and
 * mixing the two would mean a socket event able to un-dismiss a card.
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
