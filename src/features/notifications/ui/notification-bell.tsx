import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  if (notification.type === 'PROJECT_INVITE') return '/invitations';
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
  const { markRead, markAllRead } = useNotificationActions();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
        className={cn(
          'relative grid h-9 w-9 place-items-center rounded-xl transition-colors',
          'text-content-muted hover:bg-surface-sunken hover:text-content',
          isOpen && 'bg-surface-sunken text-content',
        )}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white"
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
              className="gpu panel absolute right-0 top-11 z-50 w-[340px] overflow-hidden"
            >
              <header className="flex items-center justify-between border-b border-edge px-4 py-3">
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

              <div className="scrollbar-thin max-h-[380px] overflow-y-auto">
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

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => {
                        if (!notification.readAt) markRead.mutate(notification.id);
                        if (link) {
                          navigate(link);
                          setIsOpen(false);
                        }
                      }}
                      className={cn(
                        'flex w-full gap-3 border-b border-edge px-4 py-3 text-left transition-colors last:border-0',
                        'hover:bg-surface-sunken',
                        !notification.readAt && 'bg-brand/[0.06]',
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
                        {notification.body && (
                          <span className="block text-[11px] text-content-muted">
                            {notification.body}
                          </span>
                        )}
                        <span className="block text-[10px] uppercase tracking-wide text-content-faint">
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
