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
 * The soft prompt: our own offer, shown before the browser's. A browser permission prompt gives one
 * answer and keeps it.
 */
export const NotificationOptIn = () => {
  const t = useT();

  // Read once on mount rather than on every render: `Notification.permission` cannot change without
  // one of the handlers below running.
  const [access, setAccess] = useState<NotificationAccess>(notificationAccess);
  const [dismissed, setDismissed] = useState(hasDeclinedNotifications);
  const [isAsking, setIsAsking] = useState(false);

  // Nothing to offer: already answered, unavailable, or previously declined. `denied` is
  // deliberately silent — the browser will not re-prompt.
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
