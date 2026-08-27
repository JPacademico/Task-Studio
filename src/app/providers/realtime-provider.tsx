import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import { toast } from 'sonner';

import {
  notificationBody,
  notificationDeadline,
} from '@/entities/notification/lib/notification-copy';
import type { AppNotification } from '@/entities/notification/model/types';
import { useSessionStore } from '@/features/auth/model/session.store';
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  isSocketConnected,
  reviveSocket,
} from '@/shared/api/socket';
import { showDesktopNotification } from '@/shared/lib/notifications';
import { queryKeys } from '@/shared/api/query-keys';

interface RealtimeContextValue {
  socket: Socket | null;
  isConnected: boolean;
}

const RealtimeContext = createContext<RealtimeContextValue>({ socket: null, isConnected: false });

const NOTIFICATION_TOAST: Record<AppNotification['type'], 'info' | 'success' | 'warning'> = {
  TASK_ASSIGNED: 'info',
  TASK_COMPLETED: 'success',
  TASK_DUE_SOON: 'warning',
  TASK_OVERDUE: 'warning',
  PROJECT_INVITE: 'info',
  PROJECT_INVITE_ACCEPTED: 'success',
  ORG_INVITE: 'info',
  ORG_INVITE_ACCEPTED: 'success',
  CHAT_MENTION: 'info',
  AI_SUGGESTION: 'info',
};

/**
 * Owns the single socket connection and the app-wide events every screen cares
 * about (notifications, task mutations from teammates). Project-scoped traffic
 * — chat, whiteboard, presence — is subscribed to by the widgets that need it.
 */
export const RealtimeProvider = ({ children }: { children: ReactNode }) => {
  const status = useSessionStore((state) => state.status);
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated') {
      disconnectSocket();
      setIsConnected(false);
      return;
    }

    const socket = connectSocket();

    // Leading-edge id for the coalesced task refresh below. Scoped to this
    // effect run, so a reconnect or a sign-out cannot leave one pending.
    let taskRefreshTimer: number | undefined;

    /*
     * ---- Staying connected ------------------------------------------------
     *
     * socket.io reconnects by itself after a dropped transport, and does not
     * after the two failures that actually happen here: the gateway refusing a
     * handshake whose access token has expired (which it signals by
     * disconnecting the socket server-side), and a `connect_error` raised
     * before the socket was ever active. Both leave a client that has stopped
     * trying, which is what put the header's "Live" pill permanently offline
     * on any tab left open for more than a quarter of an hour.
     *
     * So those two are revived by hand, on a backoff of our own — the socket's
     * own backoff does not apply to a retry it is not making. The delay grows
     * to half a minute and resets the moment a connection succeeds or the user
     * comes back to the tab, because somebody looking at the screen is the one
     * situation where waiting another 30 seconds is worth spending a request
     * to avoid.
     */
    let reviveTimer: number | undefined;
    let reviveAttempt = 0;

    const scheduleRevive = (immediate = false) => {
      if (reviveTimer !== undefined || isSocketConnected()) return;

      const delay = immediate
        ? 0
        : Math.min(2_000 * 2 ** Math.min(reviveAttempt, 4), 30_000);
      reviveAttempt += 1;

      reviveTimer = window.setTimeout(() => {
        reviveTimer = undefined;
        void reviveSocket().then((revived) => {
          if (!revived) scheduleRevive();
        });
      }, delay);
    };

    const handleConnect = () => {
      reviveAttempt = 0;
      setIsConnected(true);
    };

    /**
     * `reason` is the whole point of this handler.
     *
     * `io client disconnect` is our own sign-out and must not be undone.
     * `io server disconnect` is the gateway rejecting us — a stale token,
     * nine times out of ten — and is the case socket.io explicitly will not
     * retry. Everything else is a transport problem the library is already
     * working on, so it is left alone.
     */
    const handleDisconnect = (reason: string) => {
      setIsConnected(false);
      if (reason === 'io server disconnect') scheduleRevive(true);
    };

    /** Denied before the socket was ever live: `active` is false and stays false. */
    const handleConnectError = () => {
      setIsConnected(false);
      if (!socket.active) scheduleRevive();
    };

    /** The library's budget is infinite now, but a guard costs nothing. */
    const handleReconnectFailed = () => scheduleRevive();

    /*
     * The three moments worth spending a probe on.
     *
     * A laptop coming out of sleep fires none of the socket's own events for
     * some time — the OS simply stops delivering to a closed socket — so the
     * cheapest reliable signal that the connection may be stale is the user
     * turning their attention back to the page. `online` covers the same
     * thing for a network that came back while the tab was in front.
     */
    const handleWake = () => {
      if (document.visibilityState === 'hidden') return;
      reviveAttempt = 0;
      if (!isSocketConnected()) {
        connectSocket();
        scheduleRevive(true);
      }
    };

    const handleNotification = (notification: AppNotification) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });

      const level = NOTIFICATION_TOAST[notification.type] ?? 'info';

      /*
       * The same wording the bell renders, not the raw columns.
       *
       * A due-soon alert carries its deadline as an instant in the payload, so
       * the description has to be assembled here exactly as the panel
       * assembles it — otherwise the toast and the row that follows it a
       * second later say different things about the same task. See
       * `entities/notification/lib/notification-copy`.
       */
      const description =
        [notificationBody(notification), notificationDeadline(notification)]
          .filter(Boolean)
          .join(' · ') || undefined;
      const options = { description };

      if (level === 'success') toast.success(notification.title, options);
      else if (level === 'warning') toast.warning(notification.title, options);
      else toast(notification.title, options);

      /*
       * The same event again, on the desktop — but only when it would tell the
       * user something the toast cannot.
       *
       * `document.hidden` is the whole condition. With the tab in front the
       * toast has already said it, and a system notification on top of it is
       * the duplicate-alert pattern that makes people turn notifications off.
       * The value is entirely in the case where nobody is looking.
       *
       * A pure no-op unless the user opted in through the bell — see
       * `showDesktopNotification`, which checks permission itself rather than
       * trusting callers to. Nothing here can throw, and nothing downstream
       * depends on it having run.
       */
      if (document.hidden) {
        showDesktopNotification({
          title: notification.title,
          body: description,
          // One notice per notification, so a burst replaces rather than piles.
          tag: notification.id,
        });
      }

      if (notification.type === 'PROJECT_INVITE' || notification.type === 'ORG_INVITE') {
        void queryClient.invalidateQueries({ queryKey: queryKeys.invitations.mine });
      }
    };

    /*
     * A teammate changed something — refresh the task caches, no toast.
     *
     * Coalesced, because task traffic arrives in bursts and each of these is
     * expensive: `tasks.all` covers every mounted list, every agenda and every
     * open detail, so one invalidation is a fan of parallel requests. Three
     * events in the same tick — which is what completing a shared task or
     * reordering a column produces — used to be three of those fans.
     *
     * The window is short on purpose. This is a *live* surface: 200ms is below
     * the threshold where a person watching a colleague work would notice a
     * delay, and comfortably wide enough to swallow a burst.
     *
     * The overview goes with it. The home dashboard's counters are derived from
     * assignment rows, so a colleague finishing their half of a shared task
     * changes *my* numbers — and before this they simply sat there wrong until
     * something else happened to invalidate them.
     */
    const handleTaskEvent = () => {
      if (taskRefreshTimer !== undefined) return;

      taskRefreshTimer = window.setTimeout(() => {
        taskRefreshTimer = undefined;
        void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
        void queryClient.invalidateQueries({ queryKey: queryKeys.projects.overview });
      }, 200);
    };

    /**
     * A column was added, renamed, reordered or deleted.
     *
     * Its own handler rather than another `handleTaskEvent` subscriber: the
     * tasks did not change, only the lanes they sit in, and invalidating every
     * task list in the cache to redraw a dozen short rows is a refetch of the
     * whole board to learn a word changed. `taskGroups.all` is the prefix that
     * covers both the picker's list and the board's read.
     */
    const handleTaskGroupEvent = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.taskGroups.all });
    };

    const handleRosterEvent = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    };

    const handleError = (payload: { message?: string }) => {
      if (payload?.message) toast.error(payload.message);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.io.on('reconnect_failed', handleReconnectFailed);
    window.addEventListener('online', handleWake);
    window.addEventListener('focus', handleWake);
    document.addEventListener('visibilitychange', handleWake);
    socket.on('notification:new', handleNotification);
    socket.on('task:created', handleTaskEvent);
    socket.on('task:updated', handleTaskEvent);
    socket.on('task:deleted', handleTaskEvent);
    /*
     * The task sub-checklist is gone: a task's steps are Post-its now, so a
     * step arriving or being ticked comes through as a note event. `note:*`
     * fires for the whiteboard too, which is why it lands on the debounced
     * task handler rather than on anything more targeted — the alternative is
     * inspecting every note's scope on the client to decide whether it was one
     * of a task's.
     */
    socket.on('task-notes:changed', handleTaskEvent);
    socket.on('note:created', handleTaskEvent);
    socket.on('note:updated', handleTaskEvent);
    socket.on('note:deleted', handleTaskEvent);
    socket.on('task-groups:changed', handleTaskGroupEvent);
    socket.on('roster:joined', handleRosterEvent);
    socket.on('roster:left', handleRosterEvent);
    socket.on('project:updated', handleRosterEvent);
    socket.on('error', handleError);

    return () => {
      if (taskRefreshTimer !== undefined) window.clearTimeout(taskRefreshTimer);
      if (reviveTimer !== undefined) window.clearTimeout(reviveTimer);

      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.io.off('reconnect_failed', handleReconnectFailed);
      window.removeEventListener('online', handleWake);
      window.removeEventListener('focus', handleWake);
      document.removeEventListener('visibilitychange', handleWake);
      socket.off('notification:new', handleNotification);
      socket.off('task:created', handleTaskEvent);
      socket.off('task:updated', handleTaskEvent);
      socket.off('task:deleted', handleTaskEvent);
      socket.off('task-notes:changed', handleTaskEvent);
      socket.off('note:created', handleTaskEvent);
      socket.off('note:updated', handleTaskEvent);
      socket.off('note:deleted', handleTaskEvent);
      socket.off('task-groups:changed', handleTaskGroupEvent);
      socket.off('roster:joined', handleRosterEvent);
      socket.off('roster:left', handleRosterEvent);
      socket.off('project:updated', handleRosterEvent);
      socket.off('error', handleError);
    };
  }, [queryClient, status]);

  const value = useMemo<RealtimeContextValue>(
    () => ({ socket: status === 'authenticated' ? getSocket() : null, isConnected }),
    [isConnected, status],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
};

export const useRealtime = (): RealtimeContextValue => useContext(RealtimeContext);

/**
 * How many mounted components currently want each room open.
 *
 * A room is shared state on one socket, so the naive "join on mount, leave on
 * unmount" breaks as soon as two components want the same one: leaving a
 * project page while its chat is pinned would emit `project:leave` and take
 * the still-open conversation offline with it. Counting the holders means the
 * room closes when the last one lets go, not the first.
 */
const roomHolders = new Map<string, number>();

/** Joins a project room for the lifetime of the calling component. */
export const useProjectRoom = (projectId: string | undefined): void => {
  const { socket, isConnected } = useRealtime();

  useEffect(() => {
    if (!socket || !isConnected || !projectId) return;

    const held = roomHolders.get(projectId) ?? 0;
    roomHolders.set(projectId, held + 1);
    if (held === 0) socket.emit('project:join', { projectId });

    return () => {
      const remaining = (roomHolders.get(projectId) ?? 1) - 1;

      if (remaining > 0) {
        roomHolders.set(projectId, remaining);
        return;
      }

      roomHolders.delete(projectId);
      socket.emit('project:leave', { projectId });
    };
  }, [isConnected, projectId, socket]);
};
