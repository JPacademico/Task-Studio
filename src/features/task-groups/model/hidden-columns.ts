import { useCallback, useMemo, useState } from 'react';

import { STORAGE_KEYS } from '@/shared/config/constants';

/** `{ [projectId]: [groupId, …] }` — one entry per board this reader has folded. */
type Stored = Record<string, string[]>;

const read = (): Stored => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.hiddenGroups);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    // Defensive: the value is user-writable through devtools and survives deploys, so a shape that
    // is not what this file wrote must not throw during a render of the board.
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Stored)
      : {};
  } catch {
    return {};
  }
};

const write = (value: Stored): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.hiddenGroups, JSON.stringify(value));
  } catch {
    /* private mode — the choice holds for this session only */
  }
};

/** Columns this reader has folded away on one project's grouping board. */
export const useHiddenColumns = (projectId: string) => {
  const [hidden, setHidden] = useState<string[]>(() => read()[projectId] ?? []);

  // Re-read when the board underneath changes. `useState`'s initialiser runs once, on mount — and
  // this component is *not* remounted when somebody moves from one project to the next.
  const [readFor, setReadFor] = useState(projectId);
  if (readFor !== projectId) {
    setReadFor(projectId);
    setHidden(read()[projectId] ?? []);
  }

  const commit = useCallback(
    (next: string[]) => {
      setHidden(next);

      const all = read();
      // An empty list is removed rather than stored as `[]`, so a reader who
      // unhides everything leaves no trace of the project behind.
      if (next.length === 0) delete all[projectId];
      else all[projectId] = next;
      write(all);
    },
    [projectId],
  );

  const toggle = useCallback(
    (groupId: string) => {
      commit(
        hidden.includes(groupId)
          ? hidden.filter((id) => id !== groupId)
          : [...hidden, groupId],
      );
    },
    [commit, hidden],
  );

  const showAll = useCallback(() => commit([]), [commit]);

  /** Set form, for the per-render `has` checks the board does once per column. */
  const hiddenSet = useMemo(() => new Set(hidden), [hidden]);

  return { hidden, hiddenSet, toggle, showAll };
};
