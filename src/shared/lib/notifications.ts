import { STORAGE_KEYS } from '@/shared/config/constants';

/**
 * The only place in the app that touches the Notification API.
 *
 * ## Why it is a single module
 *
 * A browser permission prompt is the most expensive thing a web app can do to a
 * first-time visitor: it is modal, it is native, it arrives before any trust has
 * been earned, and a denial is close to permanent — the browser remembers it and
 * offers no second chance from script. The only safe way to hold that is to have
 * exactly one door to it, so "when do we ask?" is a question with one answer
 * rather than one per call site.
 *
 * Two rules this file exists to enforce, structurally rather than by convention:
 *
 *   1. **Nothing here runs at import time or on a timer.** `request()` is only
 *      reachable from a click handler, so the native prompt cannot appear
 *      except immediately after somebody asked for it.
 *   2. **Every read is total.** `denied`, `unsupported` and "storage is blocked"
 *      are ordinary states that return a value, never a throw. Nothing the
 *      browser refuses can propagate into a render or an auth flow.
 *
 * Authentication does not import this module, and must not: signing in is a
 * token exchange and has no business asking for anything else.
 */

export type NotificationAccess = 'unsupported' | 'default' | 'granted' | 'denied';

/** Whether the API exists at all — it does not in some embedded webviews. */
const isSupported = (): boolean =>
  typeof window !== 'undefined' && typeof window.Notification === 'function';

/**
 * What the browser currently thinks, without asking it anything.
 *
 * Safe to call during render: reading `Notification.permission` is synchronous
 * and never prompts. It is the *request* that prompts, and that has its own
 * function below with a comment explaining when it may be called.
 */
export const notificationAccess = (): NotificationAccess => {
  if (!isSupported()) return 'unsupported';

  try {
    return Notification.permission as NotificationAccess;
  } catch {
    // Some hardened browsers throw on the getter rather than reporting denied.
    return 'unsupported';
  }
};

/**
 * Whether the user has already been shown our own prompt and said "not now".
 *
 * Kept separately from the browser's own state because they answer different
 * questions. The browser knows whether it *may* show a notification; this knows
 * whether we have already asked, so that a decline is respected for good
 * instead of being re-offered on every visit. Nagging is the thing that makes
 * people deny permanently.
 */
export const hasDeclinedNotifications = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEYS.notificationsDeclined) === '1';
  } catch {
    // Storage blocked: treat as "not declined" so the banner still works this
    // session. It simply will not be remembered, which is the right way round —
    // a storage failure should cost a little repetition, never the feature.
    return false;
  }
};

export const declineNotifications = (): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.notificationsDeclined, '1');
  } catch {
    /* storage blocked — the decline holds for this session only */
  }
};

/** Clears the decline, so the soft prompt can be offered again from settings. */
export const resetNotificationDecline = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.notificationsDeclined);
  } catch {
    /* storage blocked — nothing was written to clear */
  }
};

/**
 * Asks the browser. **Only ever call this from a user gesture.**
 *
 * Every caller in this app is a click handler on a control the user pressed
 * after reading, in their own language, what the permission is for. That
 * ordering is the entire point: the native dialog is the *second* prompt they
 * see, and by the time it appears they have already agreed to it.
 *
 * Resolves to the resulting state and never rejects — a refusal is an answer,
 * not an error, and the caller's job is to carry on quietly either way.
 */
export const requestNotificationAccess = async (): Promise<NotificationAccess> => {
  if (!isSupported()) return 'unsupported';

  try {
    // Safari before 16 only supports the callback form and returns undefined
    // from the promise overload, so the result is re-read rather than trusted.
    const result = await Notification.requestPermission();
    return (result ?? notificationAccess()) as NotificationAccess;
  } catch {
    return notificationAccess();
  }
};

interface DesktopNotice {
  title: string;
  body?: string;
  /** Dedupe key — a repeat with the same tag replaces rather than stacks. */
  tag?: string;
  onClick?: () => void;
}

/**
 * Shows a system notification, or does nothing at all.
 *
 * Deliberately total: no permission, no support, blocked constructor — every
 * one of those is a silent no-op. A notification is a courtesy, and a courtesy
 * that can throw is a liability in whatever code path happened to trigger it.
 */
export const showDesktopNotification = ({ title, body, tag, onClick }: DesktopNotice): void => {
  if (notificationAccess() !== 'granted') return;

  try {
    const notice = new Notification(title, {
      body,
      tag,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
    });

    notice.onclick = () => {
      try {
        window.focus();
        onClick?.();
        notice.close();
      } catch {
        /* the tab may already be gone */
      }
    };
  } catch {
    /*
     * Chrome on Android throws `TypeError` for the constructor even when
     * permission is granted — there, notifications must go through the service
     * worker registration. Failing quietly is correct: the in-app bell has
     * already recorded the same event, so nothing is lost but the toast.
     */
  }
};
