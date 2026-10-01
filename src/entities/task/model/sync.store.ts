import { create } from 'zustand';

interface TaskSyncState {
  /** Task ids with a write of their own still in flight. */
  pending: ReadonlySet<string>;
  begin: (taskId: string) => void;
  end: (taskId: string) => void;
}

/**
 * Which tasks have an unacknowledged write against them. Ticking a task was already optimistic, so
 * the card changed on the click.
 */
export const useTaskSync = create<TaskSyncState>((set) => ({
  pending: new Set<string>(),

  begin: (taskId) =>
    set((state) => {
      if (state.pending.has(taskId)) return state;
      const pending = new Set(state.pending);
      pending.add(taskId);
      return { pending };
    }),

  end: (taskId) =>
    set((state) => {
      if (!state.pending.has(taskId)) return state;
      const pending = new Set(state.pending);
      pending.delete(taskId);
      return { pending };
    }),
}));

/**
 * Whether this one task is mid-write. Returns a boolean rather than the set, which is what keeps
 * the subscription cheap: zustand compares the selected value.
 */
export const useIsTaskSyncing = (taskId: string): boolean =>
  useTaskSync((state) => state.pending.has(taskId));

/** The imperative handle, for mutation callbacks that are not components. */
export const taskSync = {
  begin: (taskId: string) => useTaskSync.getState().begin(taskId),
  end: (taskId: string) => useTaskSync.getState().end(taskId),
};
