import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import { toast } from 'sonner';

import type { AppNotification } from '@/entities/notification/model/types';
import { useSessionStore } from '@/features/auth/model/session.store';
import { connectSocket, disconnectSocket, getSocket } from '@/shared/api/socket';
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

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    const handleNotification = (notification: AppNotification) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });

      const level = NOTIFICATION_TOAST[notification.type] ?? 'info';
      const options = { description: notification.body ?? undefined };

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
          body: notification.body ?? undefined,
          // One notice per notification, so a burst replaces rather than piles.
          tag: notification.id,
        });
      }

      if (notification.type === 'PROJECT_INVITE') {
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

    const handleRosterEvent = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    };

    const handleError = (payload: { message?: string }) => {
      if (payload?.message) toast.error(payload.message);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('notification:new', handleNotification);
    socket.on('task:created', handleTaskEvent);
    socket.on('task:updated', handleTaskEvent);
    socket.on('task:deleted', handleTaskEvent);
    socket.on('checklist:changed', handleTaskEvent);
    socket.on('roster:joined', handleRosterEvent);
    socket.on('roster:left', handleRosterEvent);
    socket.on('project:updated', handleRosterEvent);
    socket.on('error', handleError);

    return () => {
      if (taskRefreshTimer !== undefined) window.clearTimeout(taskRefreshTimer);

      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('notification:new', handleNotification);
      socket.off('task:created', handleTaskEvent);
      socket.off('task:updated', handleTaskEvent);
      socket.off('task:deleted', handleTaskEvent);
      socket.off('checklist:changed', handleTaskEvent);
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
