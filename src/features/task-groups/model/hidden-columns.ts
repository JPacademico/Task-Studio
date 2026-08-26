import { useCallback, useMemo, useState } from 'react';

import { STORAGE_KEYS } from '@/shared/config/constants';

/** `{ [projectId]: [groupId, …] }` — one entry per board this reader has folded. */
type Stored = Record<string, string[]>;

const read = (): Stored => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.hiddenGroups);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    // Defensive: the value is user-writable through devtools and survives
    // deploys, so a shape that is not what this file wrote must not throw
    // during a render of the board.
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

/**
 * Columns this reader has folded away on one project's grouping board.
 *
 * ## Why hiding is local and deleting is not
 *
 * Because they are different statements. Deleting a column says *this project
 * does not work this way any more*, it untags everybody's tasks, and it is an
 * admin's to make. Hiding one says *I am not looking at that this afternoon* —
 * and if that were shared, it would be a second kind of delete, one that any
 * member could perform on everybody's screen with no confirmation and no
 * record. So this lives in `localStorage`, next to the layout choice and the
 * pinned nav, and never leaves the device.
 *
 * That also makes it free: no column, no migration, no PATCH, and no round trip
 * on a board that already reads everything it draws in one request.
 *
 * ## What it deliberately cannot do
 *
 * Hide the untagged lane. That lane is not a column anybody created — it is
 * where a task is when nobody has filed it — and a board that could hide the
 * pile of unfiled work would let somebody lose a task by tidying their screen.
 * It appears when it has something in it and goes when it does not, and that is
 * the whole of its behaviour.
 *
 * ## On stale ids
 *
 * A column that is deleted leaves its id behind in here. That is harmless by
 * construction: the board intersects this set against the columns it actually
 * received, so an id with nothing behind it hides nothing and shows up in no
 * count. Pruning it would mean a write on every board read to tidy a few bytes
 * nobody can see.
 */
export const useHiddenColumns = (projectId: string) => {
  const [hidden, setHidden] = useState<string[]>(() => read()[projectId] ?? []);

  /*
   * Re-read when the board underneath changes.
   *
   * `useState`'s initialiser runs once, on mount — and this component is *not*
   * remounted when somebody moves from one project to the next: the route is
   * the same, only the parameter changes, so React keeps the tree and hands the
   * board a new `projectId`. Without this, project B would open showing project
   * A's columns folded away, and unhiding one of them would write A's id into
   * B's list.
   *
   * Done during render rather than in an effect, which is the pattern React
   * documents for state that has to follow a prop: an effect would paint one
   * frame of the wrong board first, and on a control that hides things that is
   * a frame in which a column flickers out of existence.
   */
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
