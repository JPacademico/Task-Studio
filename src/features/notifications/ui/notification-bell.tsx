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
  // Checked before `projectId`, because a meeting posted at organization level against one of its
  // projects carries both — and the row that announced it came from the organization.
  if (payload?.organizationId && !payload.projectId) {
    return `/organizations/${payload.organizationId}`;
  }
  // A live room opens the tab it is on, with the room named. Checked before the bare `projectId`
  // below, which every project notification carries.
  if (payload?.kind === 'live-room' && payload.projectId && payload.roomId) {
    return `/projects/${payload.projectId}?tab=live&room=${payload.roomId}`;
  }
  // Being mentioned opens the conversation, not the board. Same argument as the live room above,
  // and the same trap: a chat mention carries a `projectId` like every other project notification.
  if (payload?.kind === 'chat-mention' && payload.projectId) {
    return `/projects/${payload.projectId}?chat=open`;
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
          // Open, the trigger stays pressed so it reads as the thing the pane
          // is hanging off rather than as a button that lost its state.
          isOpen && 'bg-surface-sunken text-content',
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
              /* An ordinary panel, not glass. */
              className={cn(
                'panel absolute right-0 top-11 z-50 w-[21.25rem] overflow-hidden',
              )}
            >
              {/* No heading, and no row where one used to be. The pane hangs off a bell, under
                  a badge counting unread items, and every row in it is a notification. */}
              {unread > 0 && (
                <header className="flex items-center justify-end border-b border-edge px-3 py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAllRead.mutate()}
                    isLoading={markAllRead.isPending}
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    {t('notif.markAllRead')}
                  </Button>
                </header>
              )}

              {/* The opt-in sits above the list, not over it: opening the bell is the moment
                  somebody has shown they care about notifications. */}
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
                  // Both read the row rather than the raw columns — the API sends a deadline as an
                  // instant, not as prose.
                  const body = notificationBody(notification);
                  const deadline = notificationDeadline(notification);

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      /* Clicking one deals with it and takes it away. This used to mark the row
                         read and leave it in place. */
                      onClick={() => {
                        dismiss.mutate(notification.id);
                        if (link) {
                          navigate(link);
                          setIsOpen(false);
                        }
                      }}
                      /* Rows in a card again, now that the card is opaque. A drawn rule and a solid
                         hover fill are what a list on a surface is supposed to use. */
                      className={cn(
                        'flex w-full gap-3 border-b border-edge px-4 py-3 text-left transition-colors last:border-b-0',
                        notification.readAt
                          ? 'hover:bg-surface-sunken'
                          : 'bg-brand/[0.08] hover:bg-brand/[0.14]',
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
