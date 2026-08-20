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

/** `datetime-local` input value (local time, no timezone suffix). */
export const toDateTimeInput = (value: string | Date | null): string => {
  if (!value) return '';
  const date = toDate(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export const fromDateTimeInput = (value: string): string | undefined =>
  value ? new Date(value).toISOString() : undefined;
