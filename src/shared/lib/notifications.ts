import { STORAGE_KEYS } from '@/shared/config/constants';

/**
 * The only place in the app that touches the Notification API. A browser permission prompt is the
 * most expensive thing a web app can do to a first-time visitor: it is modal, it is native.
 */

export type NotificationAccess = 'unsupported' | 'default' | 'granted' | 'denied';

/** Whether the API exists at all — it does not in some embedded webviews. */
const isSupported = (): boolean =>
  typeof window !== 'undefined' && typeof window.Notification === 'function';

/**
 * What the browser currently thinks, without asking it anything. Safe to call during render:
 * reading `Notification.permission` is synchronous and never prompts.
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
 * Whether the user has already been shown our own prompt and said "not now". Kept separately from
 * the browser's own state because they answer different questions.
 */
export const hasDeclinedNotifications = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEYS.notificationsDeclined) === '1';
  } catch {
    // Storage blocked: treat as "not declined" so the banner still works this session. It simply
    // will not be remembered, which is the right way round.
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
 * Asks the browser. **Only ever call this from a user gesture.** Every caller in this app is a
 * click handler on a control the user pressed after reading, in their own language.
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
 * Shows a system notification, or does nothing at all. Deliberately total: no permission, no
 * support, blocked constructor — every one of those is a silent no-op.
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
    // Chrome on Android throws `TypeError` for the constructor even when permission is granted —
    // there, notifications must go through the service worker registration.
  }
};
