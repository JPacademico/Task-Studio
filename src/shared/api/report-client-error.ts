import { api } from './client';
import { tokenStore } from './token-store';

/** Matches the API's `ClientErrorDto` caps, so nothing is rejected as too long. */
const LIMITS = { message: 500, stack: 4000, componentStack: 4000, url: 500 } as const;

/**
 * How many reports one page load may send. A render loop can throw the same error dozens of times a
 * second.
 */
const MAX_PER_SESSION = 3;

let sent = 0;

/**
 * The last thing reported, so the same failure repeating is not sent twice. A boundary re-renders
 * on every state change while it is showing its fallback.
 */
let lastSignature = '';

const clip = (value: string | undefined, max: number): string | undefined =>
  value ? value.slice(0, max) : undefined;

/**
 * Tells the API that this browser crashed. `RouteBoundary` has always caught render failures and
 * shown a retryable fallback — good for the user, and completely invisible to everybody else.
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
      // The path, and deliberately not `window.location.search`.
      url: clip(window.location.pathname, LIMITS.url),
    })
    .catch(() => {
      // See the note above: never make a crash worse by failing to report it.
    });
};
