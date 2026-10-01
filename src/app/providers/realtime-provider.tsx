import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import { toast } from '@/shared/lib/toast';

import {
  notificationBody,
  notificationDeadline,
} from '@/entities/notification/lib/notification-copy';
import type { AppNotification } from '@/entities/notification/model/types';
import { useSessionStore } from '@/features/auth/model/session.store';
import { isOwnEvent } from '@/shared/api/client-id';
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

/**
 * The second argument the API sends beside every realtime payload. `origin` is the `X-Client-Id` of
 * the request that caused the event, when there was one — see `shared/api/client-id`.
 */
interface RealtimeMeta {
  origin?: string;
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
  LIVE_ROOM_INVITE: 'info',
};

/**
 * Owns the single socket connection and the app-wide events every screen cares about
 * (notifications, task mutations from teammates).
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

    // --- Staying connected ---
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
     * `reason` is the whole point of this handler. `io client disconnect` is our own sign-out and
     * must not be undone.
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

    // The three moments worth spending a probe on. A laptop coming out of sleep fires none of the
    // socket's own events for some time — the OS simply stops delivering to a closed socket.
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

      // The same wording the bell renders, not the raw columns. A due-soon alert carries its
      // deadline as an instant in the payload.
      const description =
        [notificationBody(notification), notificationDeadline(notification)]
          .filter(Boolean)
          .join(' · ') || undefined;
      const options = { description };

      if (level === 'success') toast.success(notification.title, options);
      else if (level === 'warning') toast.warning(notification.title, options);
      else toast(notification.title, options);

      // The same event again, on the desktop — but only when it would tell the user something the
      // toast cannot. `document.hidden` is the whole condition.
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

    // A teammate changed something — refresh the task caches, no toast. Coalesced, because task
    // traffic arrives in bursts and each of these is expensive.
    const handleTaskEvent = (_payload: unknown, meta?: RealtimeMeta) => {
      // Not for the tab that caused it. This is the fix for the rollback people actually saw. Drag
      // a card to Completed and straight back to To do.
      if (isOwnEvent(meta)) return;

      if (taskRefreshTimer !== undefined) return;

      taskRefreshTimer = window.setTimeout(() => {
        taskRefreshTimer = undefined;
        void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
        void queryClient.invalidateQueries({ queryKey: queryKeys.projects.overview });
      }, 200);
    };

    /**
     * A column was added, renamed, reordered or deleted. Its own handler rather than another
     * `handleTaskEvent` subscriber: the tasks did not change.
     */
    const handleTaskGroupEvent = (_payload: unknown, meta?: RealtimeMeta) => {
      // Same reasoning as `handleTaskEvent`: renaming or reordering a column is optimistic.
      if (isOwnEvent(meta)) return;

      void queryClient.invalidateQueries({ queryKey: queryKeys.taskGroups.all });
    };

    const handleRosterEvent = (_payload: unknown, meta?: RealtimeMeta) => {
      if (isOwnEvent(meta)) return;

      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    };

    // Scheduled syncs have no originating tab, so this one is never skipped as "own".
    const handleBoardSync = (payload: { projectId?: string }) => {
      if (!payload?.projectId) return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.boardSync(payload.projectId) });
    };

    // The project was binned by its owner, and this tab is somebody else. The server emitted this
    // from the start and nothing listened.
    const handleProjectDeleted = (payload: { projectId?: string }, meta?: RealtimeMeta) => {
      if (isOwnEvent(meta)) return;

      if (payload?.projectId) {
        queryClient.removeQueries({ queryKey: queryKeys.projects.detail(payload.projectId) });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.meetings.all });
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
    // The task sub-checklist is gone: a task's steps are Post-its now, so a step arriving or being
    // ticked comes through as a note event.
    socket.on('task-notes:changed', handleTaskEvent);
    socket.on('note:created', handleTaskEvent);
    socket.on('note:updated', handleTaskEvent);
    socket.on('note:deleted', handleTaskEvent);
    socket.on('task-groups:changed', handleTaskGroupEvent);
    socket.on('roster:joined', handleRosterEvent);
    socket.on('roster:left', handleRosterEvent);
    socket.on('project:updated', handleRosterEvent);
    socket.on('project:deleted', handleProjectDeleted);
    socket.on('board-sync:changed', handleBoardSync);
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
      socket.off('project:deleted', handleProjectDeleted);
      socket.off('board-sync:changed', handleBoardSync);
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
 * How many mounted components currently want each room open. A room is shared state on one socket,
 * so the naive "join on mount.
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
