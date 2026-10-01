import { ensureApiAwake, isApiWarm } from './client';

/**
 * Starts the API booting the moment somebody starts writing something. The API sleeps. Render's
 * free plan stops the container after a stretch of no traffic.
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
 * Installs the listeners once, for the life of the tab. Returns a teardown so a caller in a React
 * effect can be well-behaved, but the listeners are deliberately idempotent and process-wide.
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
