import { create } from 'zustand';

import type { Task } from './types';

/** What the prompt is about: one finished task that named a branch. */
export interface CommitOffer {
  title: string;
  branch: string;
  branchUrl: string;
}

interface CommitPromptState {
  offer: CommitOffer | null;
  /** Called after a task is completed. A no-op unless it named a branch. */
  present: (task: Task) => void;
  dismiss: () => void;
}

/**
 * "That task named a branch — do you want to open it?" A task can be completed from five surfaces —
 * the board card's tick, the list row, the sprint view, the task sheet, the checklist.
 */
export const useCommitPrompt = create<CommitPromptState>((set) => ({
  offer: null,
  present: (task) => {
    // Only for a task that actually named a branch on a linked project. `branchUrl` is the API's
    // answer to both halves of that at once.
    if (!task.branch || !task.branchUrl) return;

    set({ offer: { title: task.title, branch: task.branch, branchUrl: task.branchUrl } });
  },
  dismiss: () => set({ offer: null }),
}));
