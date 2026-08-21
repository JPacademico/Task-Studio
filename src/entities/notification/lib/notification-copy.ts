import { formatDeadline, formatDeadlineDate } from '@/shared/lib/dates';
import { translate } from '@/shared/i18n';
import type { AppNotification } from '../model/types';

/**
 * Turning what the API stored into something a person can read.
 *
 * ## The problem this exists for
 *
 * A due-soon alert used to arrive with the body
 * `Deadline 2026-08-21T20:00:00.000Z · Cartão do Empresário` — the deadline
 * serialised straight out of the database. Two things are wrong with that and
 * only one of them is cosmetic. The obvious one is the shape: a run of dashes,
 * colons and three zeroes of millisecond precision is not how anybody reads a
 * time. The other is that it is **UTC**: a task due at 17:00 in São Paulo was
 * announced as `20:00:00.000Z`, so the number in the message was not even the
 * number on the deadline.
 *
 * The API now sends the instant as `payload.dueAt` and leaves the wording
 * alone (see the API's `DeadlineScheduler`), because the timezone and the
 * language are things only the reader's own browser knows.
 *
 * ## Why the body is still scrubbed
 *
 * Rows already in the table were written by the old code and cannot be
 * rewritten from here — the feed is append-only from the client's side, and a
 * migration to reformat prose is not worth writing for a list people dismiss
 * as they read it. So `notificationBody` finds any ISO instant still embedded
 * in a stored body and renders it properly in place. That also covers the gap
 * while an old API is deployed against this build, and any future notification
 * type that interpolates a date before somebody notices.
 */

/**
 * An ISO-8601 instant appearing inside prose.
 *
 * Deliberately loose on the tail — seconds, fractional seconds and the zone
 * are each optional — because the point is to catch a machine-readable
 * timestamp wherever one was interpolated, not to validate one. The date and
 * the `T` are required, which is what keeps it from matching a bare `2026` or
 * a version number.
 */
const ISO_INSTANT = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?/g;

/**
 * The notification's body, with any raw timestamp in it made readable.
 *
 * Returns `null` for an empty body so a caller can skip the element entirely
 * rather than render a blank line — a body of `''` is what the old API
 * produced for a personal task, which has no project to name.
 */
export const notificationBody = (notification: AppNotification): string | null => {
  const body = notification.body?.trim();
  if (!body) return null;

  const readable = body.replace(ISO_INSTANT, (match) => {
    const date = new Date(match);
    // An unparseable match is left exactly as it was found. It is more likely
    // to be something that merely looks like a date than a date this cannot
    // handle, and mangling it would be worse than leaving it.
    return Number.isNaN(date.getTime()) ? match : formatDeadlineDate(date);
  });

  /*
   * The old body was `Deadline <instant> · <project>`, so scrubbing it leaves
   * the word "Deadline" in front of a date the row now also states properly
   * underneath. Dropping that prefix — and only when it is followed by what
   * was a timestamp — turns the legacy row into the same two lines a new one
   * renders, instead of a near-duplicate of them.
   */
  return readable.replace(/^Deadline\s+/i, '').trim() || null;
};

/**
 * The deadline line a due-soon or overdue row draws under its body.
 *
 * `null` whenever there is nothing dependable to draw: no payload, no `dueAt`,
 * or a `dueAt` that will not parse. Every one of those is an ordinary state
 * rather than an error — the field is new, and the feed still holds rows from
 * before it existed.
 */
export const notificationDeadline = (notification: AppNotification): string | null => {
  const dueAt = notification.payload?.dueAt;
  if (!dueAt) return null;

  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return null;

  // The fixed point *and* the countdown: "21 Aug · 20:00" answers "when do I
  // need to be free", and "in 6h" answers "how worried should I be". A row in
  // a notification feed is read once, so it has to answer both at once.
  return translate('notif.dueAt', {
    when: formatDeadlineDate(date),
    countdown: formatDeadline(date),
  });
};
