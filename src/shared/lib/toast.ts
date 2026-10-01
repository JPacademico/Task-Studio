import { toast as sonner, type ExternalToast } from 'sonner';

/**
 * The app's only door to `sonner`, so that one event produces one toast. Toasts arrived in bursts —
 * the same sentence two, three, five times in a stack.
 */

/** How long a repeat of the same message is treated as an echo of the first. */
const REPEAT_WINDOW_MS = 1500;

type Level = 'default' | 'success' | 'error' | 'warning' | 'info';

type ToastId = string | number;

/** The last toast issued per dedupe key, and when. Pruned as it is read. */
const recent = new Map<string, { id: ToastId; at: number }>();

/**
 * Drops entries that have aged out. Runs on every call rather than on a timer, because a timer here
 * would be a process-lifetime interval kept alive to tidy a map that is empty most of the time.
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

  // The id is the key itself, which is what makes this hold across the window as well as inside it.
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
