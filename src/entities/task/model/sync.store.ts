import { create } from 'zustand';

interface TaskSyncState {
  /** Task ids with a write of their own still in flight. */
  pending: ReadonlySet<string>;
  begin: (taskId: string) => void;
  end: (taskId: string) => void;
}

/**
 * Which tasks have an unacknowledged write against them.
 *
 * ## The bug this exists for
 *
 * Ticking a task was already optimistic, so the card changed on the click. What
 * it was not was *exclusive*: the box stayed live, so a second click a moment
 * later fired a second mutation while the first was still in the air. Two
 * writes for the same row then raced, and whichever response landed last won —
 * which is why a quick tick-untick could settle as "done", flash back, and
 * settle again. Every invalidation in between refetched a server that had only
 * heard about one of the two clicks.
 *
 * The fix has two halves and this is the visible one: while a write is
 * outstanding the box is disabled, so the second click cannot happen. The other
 * half is in the mutation itself, which is scoped per task so that anything
 * that does slip through is *serialised* rather than raced — see
 * `useToggleMyCompletion`.
 *
 * ## Why a store rather than props
 *
 * A board can hold several hundred cards, and the card is memoised precisely so
 * a keystroke in a filter does not re-render all of them. Threading a pending
 * set down through four different view components would defeat that memo on
 * every render (a fresh `Set` is a fresh prop), and threading a per-card
 * boolean means plumbing one prop through the board, the list, the sprint view
 * and the calendar.
 *
 * A selector store costs neither: each card subscribes to *its own boolean*, so
 * a write to one task re-renders exactly one card and the components in between
 * never learn this feature exists.
 *
 * ## Why a set and not a counter
 *
 * The mutation is serialised per task, so there is only ever one write in
 * flight for a given id and a set says everything a counter would. If that ever
 * stops being true, a set is also the shape that stays correct: `end` after two
 * overlapping `begin`s clears it, which is the right answer once both have
 * settled and a harmless one before that — the box unlocks a moment early
 * rather than sticking forever, and a stuck checkbox is the worse failure.
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
 * Whether this one task is mid-write.
 *
 * Returns a boolean rather than the set, which is what keeps the subscription
 * cheap: zustand compares the selected value, so a card only re-renders when
 * *its own* answer changes.
 */
export const useIsTaskSyncing = (taskId: string): boolean =>
  useTaskSync((state) => state.pending.has(taskId));

/** The imperative handle, for mutation callbacks that are not components. */
export const taskSync = {
  begin: (taskId: string) => useTaskSync.getState().begin(taskId),
  end: (taskId: string) => useTaskSync.getState().end(taskId),
};
