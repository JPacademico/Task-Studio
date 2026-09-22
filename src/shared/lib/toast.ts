import { toast as sonner, type ExternalToast } from 'sonner';

/**
 * The app's only door to `sonner`, so that one event produces one toast.
 *
 * ## What was going wrong
 *
 * Toasts arrived in bursts — the same sentence two, three, five times in a
 * stack — and every one of them was technically correct. Nothing was firing
 * twice by mistake; several independent things were each reporting the same
 * underlying failure at the same instant:
 *
 *   - **`QueryCache.onError` is per query, not per page.** It is the right
 *     place for it, but a screen holding six queries that all fail on the same
 *     dropped connection calls it six times in one tick, with six identical
 *     messages built from the same `errorMessage`.
 *   - **A retried query reports each attempt.** `retry: failureCount < 2` means
 *     a 500 surfaces up to three times as the backoff plays out, seconds apart.
 *   - **A 401 fans out.** Every in-flight request refreshes, and if the refresh
 *     itself fails they all reject together — the session-expired path and each
 *     caller's own `onError` then talk over each other.
 *   - **One action, several mutations.** Reordering a board or saving a page
 *     writes more than one row; a server that refuses the write refuses all of
 *     them, and each mutation's `onError` has its own `toast.error`.
 *
 * None of those are bugs in the call sites, which is exactly why fixing them
 * one at a time was never going to hold: the next feature with two mutations
 * behind one button brings it straight back. The duplication is a property of
 * *the channel*, so the channel is where it is dealt with.
 *
 * ## How it is dealt with
 *
 * Two mechanisms, and they cover different cases:
 *
 *   1. **A stable id derived from the level and the text.** `sonner` treats a
 *      repeated id as an update of the toast already on screen rather than as a
 *      new one, so the same failure reported again lands on the toast that is
 *      already saying it. This is what keeps a stack from forming at all.
 *   2. **A short window in which a repeat is dropped outright.** Updating an
 *      existing toast still re-runs its enter animation and restarts its timer,
 *      so six calls in one tick would leave one toast visibly stuttering. Inside
 *      {@link REPEAT_WINDOW_MS} the repeat is swallowed and the id of the toast
 *      already showing is returned, so callers that hold on to it still work.
 *
 * Past that window the same message is allowed to show again, and that is
 * deliberate: a save that fails now and fails again a minute later is two
 * pieces of news, not one. The window is sized for "these came from the same
 * click", not for "this happens a lot".
 *
 * ## What is deliberately not deduplicated
 *
 * A caller that passes its own `id` is left alone end to end — it has said it
 * is managing this toast's identity itself, and second-guessing that is how a
 * progress toast ends up unable to replace itself.
 *
 * A non-string message is also passed straight through. Dedupe needs a key, a
 * `ReactNode` has no stable one, and inventing a key by rendering it would cost
 * more than the duplicate it prevents. Every burst seen in practice is a plain
 * string built by `errorMessage` or `translate`.
 *
 * Success messages go through the same path as failures. They duplicate less
 * often, but "Saved" three times over is the same noise for the same reason.
 */

/**
 * How long a repeat of the same message is treated as an echo of the first.
 *
 * Long enough to cover a fan-out of rejections from one dropped connection and
 * a couple of retry attempts behind it; short enough that a person who presses
 * a failing button again, having read the message and decided to try again, is
 * told again. A second and a half is about the fastest anybody re-presses
 * something deliberately.
 */
const REPEAT_WINDOW_MS = 1500;

type Level = 'default' | 'success' | 'error' | 'warning' | 'info';

type ToastId = string | number;

/** The last toast issued per dedupe key, and when. Pruned as it is read. */
const recent = new Map<string, { id: ToastId; at: number }>();

/**
 * Drops entries that have aged out.
 *
 * Runs on every call rather than on a timer, because a timer here would be a
 * process-lifetime interval kept alive to tidy a map that is empty most of the
 * time. The map only ever holds the distinct messages shown in the last second
 * and a half, so this walks a handful of entries at most.
 */
const prune = (now: number): void => {
  for (const [key, entry] of recent) {
    if (now - entry.at >= REPEAT_WINDOW_MS) recent.delete(key);
  }
};

/**
 * Sends one message through, collapsing it onto an identical one if that one is
 * still on screen.
 */
const emit = (
  level: Level,
  message: unknown,
  options: ExternalToast | undefined,
  show: (message: never, options?: ExternalToast) => ToastId,
): ToastId => {
  // A caller managing its own id, or a message with no key to derive: neither
  // is ours to collapse. See the note above.
  if (typeof message !== 'string' || options?.id !== undefined) {
    return show(message as never, options);
  }

  const key = `${level}:${message}`;
  const now = Date.now();
  prune(now);

  const previous = recent.get(key);
  if (previous) {
    // Already saying exactly this. Leave it alone — re-issuing would restart
    // its animation and its timer for no new information.
    previous.at = now;
    return previous.id;
  }

  /*
   * The id is the key itself, which is what makes this hold across the window
   * as well as inside it.
   *
   * A message that comes back after its entry has been pruned still lands on
   * the toast already on screen if that one is somehow still there — a long
   * `duration`, a toast the reader hovered and so paused. Without a stable id
   * that case stacks, which is the one this cannot see from the map alone.
   */
  const id = show(message as never, { ...options, id: key });
  recent.set(key, { id, at: now });
  return id;
};

type Notify = (message: Parameters<typeof sonner>[0], options?: ExternalToast) => ToastId;

interface AppToast extends Notify {
  success: Notify;
  error: Notify;
  warning: Notify;
  info: Notify;
  /** Straight through — dismissal is never the thing that duplicates. */
  dismiss: typeof sonner.dismiss;
}

const base = ((message, options) =>
  emit('default', message, options, sonner)) as AppToast;

base.success = (message, options) => emit('success', message, options, sonner.success);
base.error = (message, options) => emit('error', message, options, sonner.error);
base.warning = (message, options) => emit('warning', message, options, sonner.warning);
base.info = (message, options) => emit('info', message, options, sonner.info);
base.dismiss = sonner.dismiss;

export const toast = base;
