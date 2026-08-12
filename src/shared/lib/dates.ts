import {
  differenceInMinutes,
  format,
  formatDistanceToNowStrict,
  isThisYear,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
} from 'date-fns';

const toDate = (value: string | Date): Date =>
  typeof value === 'string' ? parseISO(value) : value;

/** "Today", "Tomorrow", "Mon 14 Apr" — the label above each agenda bucket. */
export const formatDayLabel = (value: string | Date): string => {
  const date = toDate(value);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, isThisYear(date) ? 'EEE d MMM' : 'EEE d MMM yyyy');
};

export const formatTime = (value: string | Date): string => format(toDate(value), 'HH:mm');

export const formatDateTime = (value: string | Date): string =>
  format(toDate(value), 'd MMM yyyy · HH:mm');

export const formatRelative = (value: string | Date): string =>
  formatDistanceToNowStrict(toDate(value), { addSuffix: true });

/** Compact deadline copy: "in 3h", "2d late", "no deadline". */
export const formatDeadline = (value: string | Date | null): string => {
  if (!value) return 'No deadline';

  const date = toDate(value);
  const minutes = differenceInMinutes(date, new Date());
  const overdue = minutes < 0;
  const magnitude = Math.abs(minutes);

  const amount =
    magnitude < 60
      ? `${magnitude}m`
      : magnitude < 60 * 24
        ? `${Math.round(magnitude / 60)}h`
        : `${Math.round(magnitude / (60 * 24))}d`;

  return overdue ? `${amount} late` : `in ${amount}`;
};

/**
 * The deadline as a fixed point in time.
 *
 * Used once a task is finished: a countdown ("2d late") is about work still
 * outstanding, and reads as an accusation on something already delivered.
 */
export const formatDeadlineDate = (value: string | Date): string =>
  format(toDate(value), isThisYear(toDate(value)) ? 'd MMM · HH:mm' : 'd MMM yyyy');

/** Duration between start and due, phrased the way the task taxonomy reads. */
export const formatWindow = (
  startAt: string | null,
  dueAt: string | null,
): string | null => {
  if (!startAt || !dueAt) return null;

  const hours = Math.round(
    (toDate(dueAt).getTime() - toDate(startAt).getTime()) / (60 * 60 * 1000),
  );
  if (hours < 1) return '< 1 hour';
  if (hours < 24) return `${hours}h window`;
  return `${Math.round(hours / 24)}d window`;
};

/** `datetime-local` input value (local time, no timezone suffix). */
export const toDateTimeInput = (value: string | Date | null): string => {
  if (!value) return '';
  const date = toDate(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export const fromDateTimeInput = (value: string): string | undefined =>
  value ? new Date(value).toISOString() : undefined;
