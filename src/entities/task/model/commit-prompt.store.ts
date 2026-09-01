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
 * "That task named a branch — do you want to open it?"
 *
 * ## Why a store, and why the store is here
 *
 * A task can be completed from five surfaces — the board card's tick, the list
 * row, the sprint view, the task sheet, the checklist — and every one of them
 * goes through `useUpdateTaskStatus`. Threading a callback back up to whichever
 * one happened to call it would mean five components each mounting the same
 * dialog and each having to remember to. So the mutation announces, one dialog
 * listens, and the shell mounts it once.
 *
 * It lives in `entities/task` rather than beside that dialog because the
 * announcement comes from `entities/task/model/queries` — and an entity
 * reaching into a feature is the one direction this codebase's layering
 * forbids. The *state* is a fact about a task; the dialog that draws it is a
 * feature, and imports this rather than the other way round.
 */
export const useCommitPrompt = create<CommitPromptState>((set) => ({
  offer: null,
  present: (task) => {
    /*
     * Only for a task that actually named a branch on a linked project.
     *
     * `branchUrl` is the API's answer to both halves of that at once — it is
     * null when the task names no branch *and* when the project has since been
     * unlinked, which is exactly when there would be nowhere to send anybody.
     */
    if (!task.branch || !task.branchUrl) return;

    set({ offer: { title: task.title, branch: task.branch, branchUrl: task.branchUrl } });
  },
  dismiss: () => set({ offer: null }),
}));
