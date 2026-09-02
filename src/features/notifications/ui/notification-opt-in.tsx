import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellOff, Check } from 'lucide-react';

import { Button } from '@/shared/ui';
import { useT } from '@/shared/i18n';
import {
  declineNotifications,
  hasDeclinedNotifications,
  notificationAccess,
  requestNotificationAccess,
  type NotificationAccess,
} from '@/shared/lib/notifications';

/**
 * The soft prompt: our own offer, shown before the browser's.
 *
 * ## Why the native dialog is not the first thing anybody sees
 *
 * A browser permission prompt gives one answer and keeps it. Fire it at a
 * stranger on page load and most of them deny — not because they do not want
 * the feature, but because an unexplained modal from a site they have not used
 * yet is indistinguishable from spam. That denial is then close to permanent:
 * the browser will not show the dialog again, and no amount of later
 * explanation can reach them.
 *
 * So this asks first, in the user's own language, in the app's own styling,
 * with the reason attached — and only calls the browser if they say yes. The
 * native dialog becomes a confirmation of a decision already made, which is the
 * version of it people accept.
 *
 * ## Where it appears, and why there
 *
 * Inside the notification panel, which is the one place in the app where
 * somebody has just expressed interest in notifications by opening it. It is
 * never rendered on the sign-in screen, never on first paint, and never on a
 * timer: it needs a signed-in user who has clicked the bell, which is three
 * separate deliberate acts.
 *
 * ## What "no" costs
 *
 * Nothing. Declining hides this for good (`hasDeclinedNotifications`) and the
 * app carries on exactly as before — the in-app bell is the primary surface and
 * always was, and desktop notifications only ever duplicated it for a tab that
 * is not being looked at. Nothing anywhere depends on the permission being
 * granted.
 */
export const NotificationOptIn = () => {
  const t = useT();

  // Read once on mount rather than on every render: `Notification.permission`
  // cannot change without one of the handlers below running, and re-reading it
  // during render would make this component's output depend on a browser global
  // that React has no way to know changed.
  const [access, setAccess] = useState<NotificationAccess>(notificationAccess);
  const [dismissed, setDismissed] = useState(hasDeclinedNotifications);
  const [isAsking, setIsAsking] = useState(false);

  // Nothing to offer: already answered, unavailable, or previously declined.
  // `denied` is deliberately silent — the browser will not re-prompt, so a
  // banner about it would be an instruction to go and change a browser setting,
  // which is not something to put in front of somebody who came to read their
  // notifications.
  if (access !== 'default' || dismissed) return null;

  const allow = async () => {
    setIsAsking(true);
    // The native dialog opens synchronously off this click. Nothing is awaited
    // before it, or the browser would refuse it as a non-gesture call.
    const result = await requestNotificationAccess();
    setAccess(result);
    setIsAsking(false);

    // A refusal at the native dialog is final, so stop offering.
    if (result !== 'granted') declineNotifications();
  };

  const notNow = () => {
    declineNotifications();
    setDismissed(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="gpu overflow-hidden border-b border-edge bg-brand/[0.06]"
    >
      <div className="space-y-2 px-4 py-3">
        <p className="flex items-center gap-2 text-xs font-semibold">
          <Bell className="h-3.5 w-3.5 shrink-0 text-brand" />
          {t('notif.optInTitle')}
        </p>
        <p className="text-2xs leading-relaxed text-content-muted">
          {t('notif.optInBody')}
        </p>

        <div className="flex gap-2 pt-0.5">
          <Button size="sm" onClick={() => void allow()} isLoading={isAsking}>
            <Check className="h-3.5 w-3.5" />
            {t('notif.optInAllow')}
          </Button>
          <Button size="sm" variant="ghost" onClick={notNow}>
            <BellOff className="h-3.5 w-3.5" />
            {t('notif.optInLater')}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
