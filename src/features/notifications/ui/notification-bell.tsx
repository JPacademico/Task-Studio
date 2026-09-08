import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import {
  notificationBody,
  notificationDeadline,
} from '@/entities/notification/lib/notification-copy';
import {
  useNotificationActions,
  useNotifications,
  useUnreadCount,
} from '@/entities/notification/model/queries';
import type { AppNotification } from '@/entities/notification/model/types';
import { cn } from '@/shared/lib/cn';
import { formatRelative } from '@/shared/lib/dates';
import { Button, EmptyState } from '@/shared/ui';
import { useT } from '@/shared/i18n';
import { NotificationOptIn } from './notification-opt-in';

const deepLink = (notification: AppNotification): string | null => {
  const { payload } = notification;
  if (notification.type === 'PROJECT_INVITE' || notification.type === 'ORG_INVITE') {
    return '/invitations';
  }
  /*
   * Checked before `projectId`, because a meeting posted at organization level
   * against one of its projects carries both — and the row that announced it
   * came from the organization.
   */
  if (payload?.organizationId && !payload.projectId) {
    return `/organizations/${payload.organizationId}`;
  }
  // Task notifications open the project board, where the task can be inspected.
  if (payload?.projectId) return `/projects/${payload.projectId}`;
  if (payload?.taskId) return '/tasks';
  return null;
};

export const NotificationBell = () => {
  const t = useT();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const { data: unread = 0 } = useUnreadCount();
  const { data: notifications = [], isLoading } = useNotifications();
  const { dismiss, markAllRead } = useNotificationActions();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={
          unread > 0
            ? t('common.notificationsUnread', { count: String(unread) })
            : t('common.notifications')
        }
        className={cn(
          'relative grid h-9 w-9 place-items-center rounded-xl transition-colors',
          'text-content-muted hover:bg-surface-sunken hover:text-content',
          /* Open, the button becomes the top edge of the pane hanging off it —
             so it takes the pane's material rather than a sunken fill, and the
             two read as one object instead of a lit card under a pressed
             button. */
          isOpen && 'ui-liquid-glass text-content hover:bg-transparent',
        )}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-3xs font-bold text-white"
          >
            {unread > 9 ? '9+' : unread}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              /*
                Glass rather than `panel`, and the distinction is not decorative.

                A notification pane is the clearest case in the product for the
                material: it is summoned, it covers a working screen, and the
                thing it covers is usually the thing the notification is *about*
                — a board with the task on it, a project page, an organisation's
                roster. An opaque card hides that; a frosted one keeps it present
                underneath while the pane is read, which is what a temporary
                overlay is supposed to do.

                `rounded-2xl` and the border weight come across from `.panel` so
                the pane keeps the skin's own geometry; the material replaces the
                fill, the texture and the shadow. See `.ui-liquid-glass`.
              */
              className={cn(
                'gpu ui-liquid-glass absolute right-0 top-11 z-50 w-[21.25rem] overflow-hidden',
                'rounded-2xl',
              )}
            >
              {/* The rule under the header is the light on a facet edge, not a
                  drawn border: on glass a hard `border-edge` line reads as a
                  seam between two panes rather than as one pane with a heading
                  on it. Same treatment as the rows below. */}
              <header
                className={cn(
                  'flex items-center justify-between px-4 py-3',
                  'shadow-[inset_0_-1px_0_0_rgb(var(--glass-rim)/calc(var(--glass-rim-alpha)*0.35))]',
                )}
              >
                <p className="text-sm font-semibold">{t('nav.notifications')}</p>
                {unread > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAllRead.mutate()}
                    isLoading={markAllRead.isPending}
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    {t('notif.markAllRead')}
                  </Button>
                )}
              </header>

              {/* The opt-in sits above the list, not over it: opening the bell
                  is the moment somebody has shown they care about
                  notifications, and it is the only moment this is offered.
                  Renders nothing at all once answered. See `NotificationOptIn`. */}
              <NotificationOptIn />

              <div className="scrollbar-thin max-h-[23.75rem] overflow-y-auto">
                {isLoading && (
                  <p className="px-4 py-6 text-center text-xs text-content-faint">{t('common.loading')}</p>
                )}

                {!isLoading && notifications.length === 0 && (
                  <EmptyState
                    className="m-3 border-none px-4 py-8"
                    title={t('notif.nothingYet')}
                    description={t('notif.nothingYetBody')}
                  />
                )}

                {notifications.map((notification) => {
                  const link = deepLink(notification);
                  // Both read the row rather than the raw columns — the API
                  // sends a deadline as an instant, not as prose. See
                  // `entities/notification/lib/notification-copy`.
                  const body = notificationBody(notification);
                  const deadline = notificationDeadline(notification);

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      /*
                       * Clicking one deals with it and takes it away.
                       *
                       * This used to mark the row read and leave it in place,
                       * which meant the only way to get a notification off the
                       * list was to empty the entire list. So the bell filled
                       * up with weeks of greyed-out rows and the two that
                       * mattered were somewhere underneath them.
                       *
                       * Dismissing on click is the same gesture doing the
                       * obvious thing: you have seen it, it is gone, and the
                       * deep link still opens if there is one to open. Nothing
                       * is lost that was not already only a record of
                       * something that had happened elsewhere — the invitation,
                       * the task and the project all still exist.
                       */
                      onClick={() => {
                        dismiss.mutate(notification.id);
                        if (link) {
                          navigate(link);
                          setIsOpen(false);
                        }
                      }}
                      /*
                        A facet of the pane, not a card in a list.

                        The rows were separated by a drawn `border-edge` rule and
                        hovered to an opaque `surface-sunken` fill. Neither
                        survives contact with glass: the rule reads as a crack
                        across the pane, and a solid hover fill punches an opaque
                        rectangle through the one surface the reader is looking
                        at, which makes the pane appear to flicker as the pointer
                        travels down it.

                        `.ui-liquid-glass-row` does both jobs with light instead:
                        a hairline of the pane's own specular along the top edge
                        in place of the border, and a hover that raises the sheen
                        rather than replacing the material. See `index.css`.
                      */
                      className={cn(
                        'ui-liquid-glass-row flex w-full gap-3 px-4 py-3 text-left',
                        !notification.readAt && 'bg-brand/[0.08]',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                          notification.readAt ? 'bg-transparent' : 'bg-brand',
                        )}
                      />
                      <span className="flex-1 space-y-0.5">
                        <span className="block text-xs font-medium leading-snug">
                          {notification.title}
                        </span>
                        {body && (
                          <span className="block text-2xs text-content-muted">
                            {body}
                          </span>
                        )}
                        {deadline && (
                          <span className="block text-2xs font-medium text-warning">
                            {deadline}
                          </span>
                        )}
                        <span className="block text-3xs uppercase tracking-wide text-content-faint">
                          {formatRelative(notification.createdAt)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
