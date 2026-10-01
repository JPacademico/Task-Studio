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

import { enGB, ptBR } from 'date-fns/locale';

import { getLocale, translate } from '@/shared/i18n';

/**
 * The date-fns locale matching the app's. Without this, every formatted date rendered in English
 * regardless of the chosen language — "Tue 11 Aug" at the head of each agenda day.
 */
const dateLocale = () => (getLocale() === 'pt-BR' ? ptBR : enGB);

const toDate = (value: string | Date): Date =>
  typeof value === 'string' ? parseISO(value) : value;

/** "Today", "Tomorrow", "Mon 14 Apr" — the label above each agenda bucket. */
export const formatDayLabel = (value: string | Date): string => {
  const date = toDate(value);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, isThisYear(date) ? 'EEE d MMM' : 'EEE d MMM yyyy', {
    locale: dateLocale(),
  });
};

export const formatTime = (value: string | Date): string => format(toDate(value), 'HH:mm');

export const formatDateTime = (value: string | Date): string =>
  format(toDate(value), 'd MMM yyyy · HH:mm', { locale: dateLocale() });

/**
 * A day, with no time on it. "14 Oct 2026". The one formatter for dates whose *hour is not a fact
 * the reader should read anything into*.
 */
export const formatCalendarDate = (value: string | Date): string =>
  format(toDate(value), 'd MMM yyyy', { locale: dateLocale() });

export const formatRelative = (value: string | Date): string =>
  formatDistanceToNowStrict(toDate(value), { addSuffix: true, locale: dateLocale() });

// These read the dictionary through `translate` rather than taking a `t`. They are plain functions
// called from render bodies, memo comparisons and a couple of non-component helpers.

/** Compact deadline copy: "in 3h", "2d late", "no deadline". */
export const formatDeadline = (value: string | Date | null): string => {
  if (!value) return translate('dates.noDeadline');

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

  return translate(overdue ? 'dates.late' : 'dates.dueIn', { amount });
};

/**
 * The deadline as a fixed point in time. Used once a task is finished: a countdown ("2d late") is
 * about work still outstanding, and reads as an accusation on something already delivered.
 */
export const formatDeadlineDate = (value: string | Date): string =>
  format(toDate(value), isThisYear(toDate(value)) ? 'd MMM · HH:mm' : 'd MMM yyyy', {
    locale: dateLocale(),
  });

/** Duration between start and due, phrased the way the task taxonomy reads. */
export const formatWindow = (
  startAt: string | null,
  dueAt: string | null,
): string | null => {
  if (!startAt || !dueAt) return null;

  const hours = Math.round(
    (toDate(dueAt).getTime() - toDate(startAt).getTime()) / (60 * 60 * 1000),
  );
  if (hours < 1) return translate('dates.windowUnderHour');
  if (hours < 24) return translate('dates.windowHours', { count: hours });
  return translate('dates.windowDays', { count: Math.round(hours / 24) });
};

// The two ends of a `<input type="datetime-local">`, and why they are defensive. A `datetime-local`
// control does not hand back a date — it hands back a *string*.

/**
 * The window the app will accept, as *years either side of today*. This used to be the epoch to the
 * end of the millennium — a range chosen to keep the value parseable rather than to mean anything.
 */
export const DATE_WINDOW_YEARS = 5;

/** The window's edges as `datetime-local` strings, computed per call. */
const windowEdge = (years: number): string => {
  const edge = new Date();
  edge.setFullYear(edge.getFullYear() + years);
  return toDateTimeInput(edge);
};

export const dateInputMin = (): string => windowEdge(-DATE_WINDOW_YEARS);
export const dateInputMax = (): string => windowEdge(DATE_WINDOW_YEARS);

/**
 * The bounds a control should carry, widened to admit what it already holds. Without this,
 * tightening the window would make existing records uneditable.
 */
export const dateInputBounds = (
  ...values: (string | null | undefined)[]
): { min: string; max: string } => {
  let min = dateInputMin();
  let max = dateInputMax();

  for (const value of values) {
    if (!value) continue;
    const time = new Date(value).getTime();
    if (!Number.isFinite(time)) continue;

    if (value < min) min = value;
    if (value > max) max = value;
  }

  return { min, max };
};

/** `datetime-local` input value (local time, no timezone suffix). */
export const toDateTimeInput = (value: string | Date | null): string => {
  if (!value) return '';

  const date = toDate(value);
  // A stored value can be unparseable too — a half-written draft that reached
  // the server before this guard existed, say.
  if (Number.isNaN(date.getTime())) return '';

  const offset = date.getTimezoneOffset() * 60_000;
  const local = new Date(date.getTime() - offset);
  if (Number.isNaN(local.getTime())) return '';

  return local.toISOString().slice(0, 16);
};

/**
 * Whether a `datetime-local` string is a real, in-range moment. An empty field is *valid* — these
 * are optional everywhere they appear, and "no deadline" is a legitimate answer.
 */
export const isDateTimeInput = (value: string): boolean => {
  if (!value) return true;

  return Number.isFinite(new Date(value).getTime());
};

/**
 * Whether a filled field is inside the five-year window. Separate from `isDateTimeInput` because
 * the two failures need different words and only one of them is the user typing nonsense.
 */
export const isWithinDateWindow = (value: string): boolean => {
  if (!value) return true;

  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return false;

  return (
    time >= new Date(dateInputMin()).getTime() && time <= new Date(dateInputMax()).getTime()
  );
};

// --- Days, as opposed to moments ---
// A project's window is the one thing in this app measured in *days* rather than in instants.

/** `2026-09-01T00:00:00Z` → `2026-09-01`, in the reader's own timezone. */
export const toDateInput = (value: string | Date | null): string => {
  if (!value) return '';

  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return '';

  const offset = date.getTimezoneOffset() * 60_000;
  const local = new Date(date.getTime() - offset);
  if (Number.isNaN(local.getTime())) return '';

  return local.toISOString().slice(0, 10);
};

/** `2026-09-01` → an ISO instant, or `undefined` for an empty field. */
export const fromDateInput = (value: string, edge: 'start' | 'end' = 'start'): string | undefined => {
  if (!value) return undefined;

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return undefined;

  // `new Date('2026-09-01')` is midnight *UTC*, which is the previous evening for anybody west of
  // Greenwich.
  const [year, month, day] = value.split('-').map(Number);
  const local =
    edge === 'end'
      ? new Date(year, month - 1, day, 23, 59, 59, 999)
      : new Date(year, month - 1, day, 0, 0, 0, 0);

  return Number.isFinite(local.getTime()) ? local.toISOString() : undefined;
};

/** The window's edges as `date` input strings — the day-granular `dateInputMin`. */
export const dayInputMin = (): string => toDateInput(new Date(dateInputMin()));
export const dayInputMax = (): string => toDateInput(new Date(dateInputMax()));

/**
 * The ISO instant behind a `datetime-local` value, or `undefined`. `undefined` for an empty field
 * *and* for an unusable one.
 */
export const fromDateTimeInput = (value: string): string | undefined => {
  if (!value || !isDateTimeInput(value)) return undefined;
  return new Date(value).toISOString();
};
