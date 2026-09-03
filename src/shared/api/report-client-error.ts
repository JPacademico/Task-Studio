import { api } from './client';
import { tokenStore } from './token-store';

/** Matches the API's `ClientErrorDto` caps, so nothing is rejected as too long. */
const LIMITS = { message: 500, stack: 4000, componentStack: 4000, url: 500 } as const;

/**
 * How many reports one page load may send.
 *
 * A render loop can throw the same error dozens of times a second, and a
 * boundary that reported every one would turn a rendering bug into an
 * accidental denial of service against our own log. Three is enough to see a
 * pattern; the API's own throttle is the backstop, and this is the thing that
 * stops us hitting it.
 */
const MAX_PER_SESSION = 3;

let sent = 0;

/**
 * The last thing reported, so the same failure repeating is not sent twice.
 *
 * A boundary re-renders on every state change while it is showing its
 * fallback, and React's development double-invoke throws each error twice on
 * its own.
 */
let lastSignature = '';

const clip = (value: string | undefined, max: number): string | undefined =>
  value ? value.slice(0, max) : undefined;

/**
 * Tells the API that this browser crashed.
 *
 * ## What it is, and what it is not
 *
 * `RouteBoundary` has always caught render failures and shown a retryable
 * fallback — good for the user, and completely invisible to everybody else,
 * because the error went to a console on somebody else's machine. This is the
 * missing pipe: the crash lands in the same structured log stream as the
 * server's own errors, searchable by the same means.
 *
 * It is not an error tracker. No grouping, no release tagging, no alerting.
 * When a real one is wired in, this becomes a forward to it.
 *
 * ## Why every failure here is swallowed
 *
 * Because this runs inside an error boundary. Anything that throws — an
 * offline network, a 401, a 429 from the throttle — would throw *during the
 * handling of a crash*, and React's response to that is to unmount the whole
 * tree: a blank page instead of the retryable fallback the user was about to
 * be shown. Reporting a problem must never be able to make the problem worse.
 *
 * ## Why it is skipped when signed out
 *
 * The endpoint requires a token, deliberately (see `TelemetryController`), so
 * a report without one is a guaranteed 401. Checking here keeps that out of
 * the console, where it would look like a second, unrelated failure.
 */
export const reportClientError = (input: {
  error: unknown;
  componentStack?: string | null;
}): void => {
  if (sent >= MAX_PER_SESSION) return;
  if (!tokenStore.getAccessToken()) return;

  const error = input.error;
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  const signature = `${message}::${input.componentStack ?? ''}`.slice(0, 300);
  if (signature === lastSignature) return;
  lastSignature = signature;
  sent += 1;

  void api
    .post('/telemetry/client-error', {
      message: clip(message, LIMITS.message) ?? 'Unknown error',
      stack: clip(stack, LIMITS.stack),
      componentStack: clip(input.componentStack ?? undefined, LIMITS.componentStack),
      /*
       * The path, and deliberately not `window.location.search`.
       *
       * It used to send both, and the query string is where this app's
       * single-use credentials live on their way in: `/verify-email?token=…`
       * and `/reset-password?token=…` both carry one, and the OAuth callback
       * carries an exchange code. The server writes this field straight into a
       * log line (see `TelemetryController`), so a render crash on the
       * verification screen filed a live token into the log — and that screen
       * is reached *while signed in*, which is exactly when this reporter is
       * enabled.
       *
       * Nothing is lost. The path alone says which screen broke, which is the
       * whole reason the field exists; the values in the query string were
       * never going to help debug a render failure.
       */
      url: clip(window.location.pathname, LIMITS.url),
    })
    .catch(() => {
      // See the note above: never make a crash worse by failing to report it.
    });
};
