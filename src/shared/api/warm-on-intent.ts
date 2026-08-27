import { ensureApiAwake, isApiWarm } from './client';

/**
 * Starts the API booting the moment somebody starts writing something.
 *
 * ## The problem this exists for
 *
 * The API sleeps. Render's free plan stops the container after a stretch of no
 * traffic, and Neon suspends the database behind it on a similar clock, so the
 * first request after a quiet period is a cold Node boot plus a cold database
 * connect — tens of seconds, held open by the edge, and paid for by whoever
 * happened to press the button.
 *
 * That cost is unavoidable, but *who waits for it* is not. Almost nothing in
 * this app is submitted the instant it is thought of: a login is an email and
 * a password, a task is a title, a document is a paragraph. Between the first
 * keystroke and the button there are several seconds in which nobody is
 * waiting for anything — and that is exactly long enough for a container to
 * start. Spending them on the boot moves the whole cold start off the critical
 * path and into dead time the user was going to spend typing anyway.
 *
 * `AuthShell` has always done this on mount, which covers the visitor who
 * arrives and signs in. It does not cover the two cases that actually produce
 * the complaint: a login page left open in a tab while the container went back
 * to sleep, and a signed-in session that has been idle over lunch. Both of
 * those start with somebody typing, which is what this listens for.
 *
 * ## Why it is nearly free
 *
 * Three guards, in order of cheapness:
 *
 *   - `isApiWarm()` is a subtraction against a timestamp, and it is false only
 *     when the container has genuinely been quiet for ten minutes. Every
 *     keystroke of an ordinary working session stops here.
 *   - `ensureApiAwake()` shares one in-flight promise across all callers, so a
 *     burst of keystrokes is one probe, not one per character.
 *   - `COOLDOWN_MS` covers the case the other two do not: a probe that
 *     *failed*. Without it, typing at a genuinely unreachable API would start a
 *     fresh three-attempt sequence every time a word was finished.
 *
 * The probe itself is an unauthenticated `GET /health`, which is the cheapest
 * request the API serves and the one that also wakes the database.
 *
 * ## Why the listeners are on the document
 *
 * Every text surface in the app is covered by one pair of listeners, in one
 * place, with nothing for a feature to remember to opt into — including the
 * `contentEditable` document editor and the whiteboard's text tool, neither of
 * which is an `<input>` at all. `focusin` catches the person who clicks the
 * field and then thinks; `keydown` catches the one who tabs into it and types
 * straight away. Both are passive and both are on the capture path, so nothing
 * downstream can swallow them.
 */

/** How long to wait before probing again after a probe that came back false. */
const COOLDOWN_MS = 20_000;

let lastAttemptAt = 0;
let isInstalled = false;

/** Text surfaces. A click on a button is not somebody about to write. */
const isTextEntry = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;

  if (target.isContentEditable) return true;

  const tag = target.tagName;
  if (tag === 'TEXTAREA') return true;
  if (tag !== 'INPUT') return false;

  // Checkboxes, radios and buttons are `<input>` too, and none of them is the
  // start of a sentence somebody is about to send to the server.
  const type = (target as HTMLInputElement).type;
  return !['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'range'].includes(type);
};

const maybeWake = (event: Event): void => {
  if (!isTextEntry(event.target)) return;
  if (isApiWarm()) return;
  if (Date.now() - lastAttemptAt < COOLDOWN_MS) return;

  lastAttemptAt = Date.now();
  void ensureApiAwake();
};

/**
 * Installs the listeners once, for the life of the tab.
 *
 * Returns a teardown so a caller in a React effect can be well-behaved, but
 * the listeners are deliberately idempotent and process-wide: a second install
 * from a re-mounted provider must not end up with two probes per keystroke.
 */
export const installApiWarmOnIntent = (): (() => void) => {
  if (isInstalled || typeof document === 'undefined') return () => {};

  isInstalled = true;
  document.addEventListener('focusin', maybeWake, { capture: true, passive: true });
  document.addEventListener('keydown', maybeWake, { capture: true, passive: true });

  return () => {
    isInstalled = false;
    document.removeEventListener('focusin', maybeWake, true);
    document.removeEventListener('keydown', maybeWake, true);
  };
};
