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
  /*
   * A live room opens the tab it is on, with the room named.
   *
   * Checked before the bare `projectId` below, which every project
   * notification carries: without this an invitation to a call that starts in
   * four minutes would land somebody on the board and leave them to find it.
   */
  if (payload?.kind === 'live-room' && payload.projectId && payload.roomId) {
    return `/projects/${payload.projectId}?tab=live&room=${payload.roomId}`;
  }
  /*
   * Being mentioned opens the conversation, not the board.
   *
   * Same argument as the live room above, and the same trap: a chat mention
   * carries a `projectId` like every other project notification, so the
   * fall-through below would land somebody on the task board with no sign of
   * the sentence that named them — and the chat window is a floating dock they
   * would then have to know to open. The project page reads this parameter and
   * opens it for them.
   */
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
              /*
                An ordinary panel, not glass.

                The frosted material was the most legible thing in the product
                to argue for and the least comfortable to read: the pane's whole
                content is 12px labels, 10px bodies and a timestamp in
                `--content-faint`, composited over whatever colour the board
                underneath happens to be at that point. Keeping the page visible
                through it was never worth what it cost the text on top — the
                page is still there when the pane closes, and the pane is open
                for a few seconds at a time.

                `.panel` is the skin's own card: its fill, its border weight, its
                texture and its shadow, so the pane belongs to whatever theme is
                on rather than to a material that sits outside all of them.
              */
              className={cn(
                'panel absolute right-0 top-11 z-50 w-[21.25rem] overflow-hidden',
              )}
            >
              {/*
                No heading, and no row where one used to be.

                The pane hangs off a bell, under a badge counting unread items,
                and every row in it is a notification — "Notifications" was a
                label for something already named three times over by the time
                anybody read it. Dropping the word and keeping the bar would
                have traded a redundant line for an empty one, so the bar itself
                is now conditional: it exists only when there is an action to
                put in it, and "mark all read" is an action only when something
                is unread. With nothing unread the list starts at the top edge.
              */}
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
                        Rows in a card again, now that the card is opaque.

                        A drawn rule and a solid hover fill are what a list on a
                        surface is supposed to use; they were only ever wrong
                        against glass, where the rule read as a crack and the
                        fill punched a hole through the material. An unread row
                        hovers to a deeper tint of its own accent rather than to
                        the neutral fill, so leaning on it does not erase the one
                        thing it is marked with.
                      */
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
