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
 * The date-fns locale matching the app's.
 *
 * Without this, every formatted date rendered in English regardless of the
 * chosen language — "Tue 11 Aug" at the head of each agenda day, on a page
 * where everything around it had been translated. The month and weekday names
 * come from date-fns, not from the dictionary, so they need telling separately.
 *
 * Both are imported statically rather than loaded on demand: two locale objects
 * are a few kilobytes, and the alternative is an async boundary in a synchronous
 * formatter that a dozen render paths call.
 *
 * `en-GB` rather than the default `en-US` because every format string here is
 * already day-first ('EEE d MMM'), which is the convention the app was written
 * to and the one `en-GB` orders its relative phrasing around.
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

export const formatRelative = (value: string | Date): string =>
  formatDistanceToNowStrict(toDate(value), { addSuffix: true, locale: dateLocale() });

/*
 * These read the dictionary through `translate` rather than taking a `t`.
 *
 * They are plain functions called from render bodies, memo comparisons and a
 * couple of non-component helpers, so threading a `t` through every call site
 * would change a dozen signatures to say the same thing. `translate` reads the
 * active locale at call time, which for a function invoked during render is the
 * same value `useT` would have handed back — and switching language re-renders
 * everything anyway, so there is nothing stale to worry about.
 */

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
 * The deadline as a fixed point in time.
 *
 * Used once a task is finished: a countdown ("2d late") is about work still
 * outstanding, and reads as an accusation on something already delivered.
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

/*
 * The two ends of a `<input type="datetime-local">`, and why they are defensive.
 *
 * A `datetime-local` control does not hand back a date — it hands back a
 * *string*, and the HTML spec lets the year segment run to six digits. Holding
 * a key down in it produces `123456-04-02T10:00`, which is a perfectly legal
 * value for the control and an `Invalid Date` for `Date`. `toISOString()` on
 * that throws a `RangeError`, and because the composer derives the task type
 * from these fields inside a `useMemo`, the throw happened *during render* —
 * which unmounts the tree and takes the whole app down with it. Holding a key
 * down in a date field should produce a silly date, not a blank screen.
 *
 * So the boundary is treated as untrusted input in both directions: anything
 * that will not survive the round trip is reported as "nothing", the composers
 * ask `isDateTimeInput` before letting a form submit, and the controls carry
 * `min`/`max` so the browser marks an out-of-range year invalid as it is typed.
 */

/**
 * The window the app will accept.
 *
 * Not the full ECMAScript range (±271821 years), which is nothing a project
 * plan needs and everything a validator has to keep re-proving. The Unix epoch
 * to the end of the millennium covers every deadline anybody will ever type and
 * keeps the value inside the four-digit year that date inputs, database columns
 * and readers all expect.
 */
export const DATE_INPUT_MIN = '1970-01-01T00:00';
export const DATE_INPUT_MAX = '2999-12-31T23:59';

const MIN_MS = new Date(DATE_INPUT_MIN).getTime();
const MAX_MS = new Date(DATE_INPUT_MAX).getTime();

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
 * Whether a `datetime-local` string is a real, in-range moment.
 *
 * An empty field is *valid* — these are optional everywhere they appear, and
 * "no deadline" is a legitimate answer. Only a filled field that cannot be
 * parsed is a problem.
 */
export const isDateTimeInput = (value: string): boolean => {
  if (!value) return true;

  const time = new Date(value).getTime();
  return Number.isFinite(time) && time >= MIN_MS && time <= MAX_MS;
};

/**
 * The ISO instant behind a `datetime-local` value, or `undefined`.
 *
 * `undefined` for an empty field *and* for an unusable one. Both mean the same
 * thing to every caller — there is no moment here to send — and neither is
 * worth throwing over.
 */
export const fromDateTimeInput = (value: string): string | undefined => {
  if (!value || !isDateTimeInput(value)) return undefined;
  return new Date(value).toISOString();
};
