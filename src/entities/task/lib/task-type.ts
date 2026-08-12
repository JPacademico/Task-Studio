import type { TaskType } from '../model/types';

const HOUR_MS = 60 * 60 * 1000;
const MICRO_MAX_MS = 8 * HOUR_MS;
const MEGA_MIN_MS = 2 * 24 * HOUR_MS;

/**
 * Mirror of the server's `TaskTypeResolver`, used purely to preview the type
 * live inside the composer. The API stays the source of truth — this only saves
 * a round-trip while the user is still typing.
 */
export const previewTaskType = (
  startAt: string | undefined,
  dueAt: string | undefined,
  assigneeCount: number,
): TaskType => {
  if (assigneeCount > 1) return 'MULTI';
  if (!startAt || !dueAt) return 'STANDARD';

  const duration = new Date(dueAt).getTime() - new Date(startAt).getTime();
  if (Number.isNaN(duration) || duration <= 0) return 'STANDARD';
  if (duration > MEGA_MIN_MS) return 'MEGA';
  if (duration < MICRO_MAX_MS) return 'MICRO';
  return 'STANDARD';
};
