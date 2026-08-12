import { useCallback, useMemo, useState } from 'react';

import { STORAGE_KEYS } from '@/shared/config/constants';

/**
 * The shapes a set of tasks can be poured into.
 *
 * `board`   — status columns, drag & drop between them.
 * `sprint`  — the same columns crossed with priority swimlanes, plus a burn-down
 *             header: what a stand-up actually looks at.
 * `list`    — one dense line per task, for scanning a long backlog.
 * `calendar`— a month grid, for "what is landing on the 14th".
 * `agenda`  — day buckets ordered by hour; the personal default.
 */
export type TaskLayout = 'board' | 'sprint' | 'list' | 'calendar' | 'agenda';

/** Which surface is asking — the two remember their choice separately. */
export type LayoutSurface = 'project' | 'personal';

export const LAYOUTS_FOR: Record<LayoutSurface, TaskLayout[]> = {
  project: ['board', 'sprint', 'list', 'calendar'],
  personal: ['agenda', 'list', 'calendar', 'board'],
};

const DEFAULTS: Record<LayoutSurface, TaskLayout> = {
  project: 'board',
  personal: 'agenda',
};

type Stored = Partial<Record<LayoutSurface, TaskLayout>>;

const read = (): Stored => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.taskLayout);
    return raw ? (JSON.parse(raw) as Stored) : {};
  } catch {
    return {};
  }
};

const write = (value: Stored): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.taskLayout, JSON.stringify(value));
  } catch {
    /* private mode — the choice stays for this session only */
  }
};

/**
 * The layout this surface is currently drawn in.
 *
 * Per device rather than per account: which shape suits you depends on the
 * screen in front of you, not on who you are.
 */
export const useTaskLayout = (surface: LayoutSurface) => {
  const [layout, setLayoutState] = useState<TaskLayout>(() => {
    const stored = read()[surface];
    return stored && LAYOUTS_FOR[surface].includes(stored) ? stored : DEFAULTS[surface];
  });

  const setLayout = useCallback(
    (next: TaskLayout) => {
      setLayoutState(next);
      write({ ...read(), [surface]: next });
    },
    [surface],
  );

  const options = useMemo(() => LAYOUTS_FOR[surface], [surface]);

  return { layout, setLayout, options };
};
