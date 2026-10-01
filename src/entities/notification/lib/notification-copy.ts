import { formatDeadline, formatDeadlineDate } from '@/shared/lib/dates';
import { translate } from '@/shared/i18n';
import type { AppNotification } from '../model/types';

/**
 * Turning what the API stored into something a person can read. A due-soon alert used to arrive
 * with the body `Deadline 2026-08-21T20:00:00.000Z · Cartão do Empresário`.
 */

/**
 * An ISO-8601 instant appearing inside prose. Deliberately loose on the tail — seconds, fractional
 * seconds and the zone are each optional.
 */
const ISO_INSTANT = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?/g;

/**
 * The notification's body, with any raw timestamp in it made readable. Returns `null` for an empty
 * body so a caller can skip the element entirely rather than render a blank line.
 */
export const notificationBody = (notification: AppNotification): string | null => {
  const body = notification.body?.trim();
  if (!body) return null;

  const readable = body.replace(ISO_INSTANT, (match) => {
    const date = new Date(match);
    // An unparseable match is left exactly as it was found. It is more likely to be something that
    // merely looks like a date than a date this cannot handle.
    return Number.isNaN(date.getTime()) ? match : formatDeadlineDate(date);
  });

  // The old body was `Deadline <instant> · <project>`, so scrubbing it leaves the word "Deadline"
  // in front of a date the row now also states properly underneath.
  return readable.replace(/^Deadline\s+/i, '').trim() || null;
};

/**
 * The deadline line a due-soon or overdue row draws under its body. `null` whenever there is
 * nothing dependable to draw: no payload, no `dueAt`, or a `dueAt` that will not parse.
 */
export const notificationDeadline = (notification: AppNotification): string | null => {
  const dueAt = notification.payload?.dueAt;
  if (!dueAt) return null;

  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return null;

  // The fixed point *and* the countdown: "21 Aug · 20:00" answers "when do I need to be free", and
  // "in 6h" answers "how worried should I be".
  return translate('notif.dueAt', {
    when: formatDeadlineDate(date),
    countdown: formatDeadline(date),
  });
};
