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
 * The window the app will accept, as *years either side of today*.
 *
 * This used to be the epoch to the end of the millennium — a range chosen to
 * keep the value parseable rather than to mean anything. It did that job and
 * nothing else: a deadline in 2100 sailed through, which is not a deadline, it
 * is a typo that then sorts to the bottom of every agenda for the rest of the
 * project's life and quietly skews every "next due" calculation that reads it.
 *
 * Five years is the widest thing anybody schedules a *task* for, by a
 * comfortable margin, and the number is deliberately symmetric: back-dating the
 * start of work that began some time ago is as legitimate as planning ahead.
 *
 * Relative to now, not a fixed pair of dates, because a hard-coded ceiling is a
 * ceiling that goes stale — and the failure when it does is a field that
 * refuses today's perfectly reasonable date.
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
 * The bounds a control should carry, widened to admit what it already holds.
 *
 * Without this, tightening the window would make existing records uneditable:
 * a task saved last year with a 2100 deadline would open in a form whose `max`
 * says 2031, the browser would mark the field invalid, and the owner could not
 * save a correction to any *other* field until they had also fixed a date they
 * may not have set. The bound stretches to include whatever is on the record,
 * so an out-of-range value is something you can see and fix rather than
 * something that locks the form.
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
 * Whether a `datetime-local` string is a real, in-range moment.
 *
 * An empty field is *valid* — these are optional everywhere they appear, and
 * "no deadline" is a legitimate answer. Only a filled field that cannot be
 * parsed is a problem.
 */
export const isDateTimeInput = (value: string): boolean => {
  if (!value) return true;

  return Number.isFinite(new Date(value).getTime());
};

/**
 * Whether a filled field is inside the five-year window.
 *
 * Separate from `isDateTimeInput` because the two failures need different
 * words and only one of them is the user typing nonsense: "that is not a date"
 * and "that is too far away" are different complaints, and a form that
 * conflates them tells somebody who typed a real date in 2100 that their date
 * is malformed.
 *
 * An out-of-range value that came *from the record* is still reported as out of
 * range — the field says so, and the form still saves, because refusing to save
 * an unrelated edit over a pre-existing date is the behaviour `dateInputBounds`
 * exists to avoid.
 */
export const isWithinDateWindow = (value: string): boolean => {
  if (!value) return true;

  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return false;

  return (
    time >= new Date(dateInputMin()).getTime() && time <= new Date(dateInputMax()).getTime()
  );
};

// ---------------------------------------------------------------------------
// Days, as opposed to moments
// ---------------------------------------------------------------------------
//
// A project's window is the one thing in this app measured in *days* rather
// than in instants. A task starts at 09:00 and is due at 17:00; a project runs
// from March to June, and asking somebody to pick a minute for that is asking
// them to invent a fact.
//
// So these are `type="date"` helpers rather than `datetime-local` ones, and the
// two conversions below are where the difference is resolved: a day picked in
// the browser becomes an instant on the wire, because the API stores instants
// and a column that sometimes holds a date and sometimes a timestamp is a
// column nobody can compare.

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

/**
 * `2026-09-01` → an ISO instant, or `undefined` for an empty field.
 *
 * ## Why a finish date lands at the *end* of its day
 *
 * Because `endsAt` is a ceiling that task deadlines are compared against, and
 * a project finishing "on 30 June" that resolved to 00:00 on the 30th would
 * refuse a task due at 17:00 that day — the last afternoon of the project,
 * which is precisely when the last task is due. Reading the field as the whole
 * day is what makes the constraint mean what a person reading the form thinks
 * it means.
 *
 * A start date takes the opposite end for the same reason turned around, and
 * matters less: nothing is constrained by it.
 */
export const fromDateInput = (value: string, edge: 'start' | 'end' = 'start'): string | undefined => {
  if (!value) return undefined;

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return undefined;

  // `new Date('2026-09-01')` is midnight *UTC*, which is the previous evening
  // for anybody west of Greenwich. Rebuilding it from the parts pins it to the
  // reader's own day, which is the day they typed.
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
