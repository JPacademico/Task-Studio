import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/shared/lib/toast';

import { useRealtime } from '@/app/providers/realtime-provider';
import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { translate } from '@/shared/i18n';
import { liveRoomApi } from '../api/live-room.api';
import type {
  CreateLiveRoomPayload,
  GrantLiveRoomPayload,
  LiveRoom,
  UpdateLiveRoomPayload,
} from './types';

/**
 * How long a cached room list stays fresh. Thirty seconds, which is shorter than the calendar's
 * minute and longer than nothing, and the reason is the one question this list answers.
 */
const LIVE_STALE_TIME = 30_000;

/** Soonest first, finished last — the order the API returns and a patch must keep. */
const byOpening = (a: LiveRoom, b: LiveRoom): number => {
  if (Boolean(a.endedAt) !== Boolean(b.endedAt)) return a.endedAt ? 1 : -1;
  return new Date(a.opensAt).getTime() - new Date(b.opensAt).getTime();
};

export const useLiveRooms = (projectId: string | undefined, includeEnded = false) =>
  useQuery({
    queryKey: queryKeys.live.list(projectId ?? '', includeEnded),
    queryFn: () => liveRoomApi.list(projectId as string, includeEnded),
    enabled: Boolean(projectId),
    staleTime: LIVE_STALE_TIME,
  });

/**
 * How early a minted TURN credential is replaced. Five minutes, and it covers two different gaps at
 * once: the clock skew between this browser and the API.
 */
const ICE_RENEW_MARGIN_MS = 5 * 60_000;

/**
 * The ICE servers, kept fresh for as long as the panel is open. It used to be `staleTime:
 * Infinity`, on the reasoning that this is deployment configuration.
 */
export const useIceServers = (enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.live.ice,
    queryFn: () => liveRoomApi.iceServers(),
    enabled,
    // Computed from the answer rather than fixed, because only the server knows the TTL.
    staleTime: (query) => {
      const expiresAt = query.state.data?.expiresAt;
      if (!expiresAt) return Number.POSITIVE_INFINITY;
      return Math.max(30_000, expiresAt - Date.now() - ICE_RENEW_MARGIN_MS);
    },
    gcTime: Number.POSITIVE_INFINITY,
    // Refetched on the same schedule, and only while a panel is mounted. `staleTime` alone would
    // not be enough: nothing re-renders a live panel on a timer.
    refetchInterval: (query) => {
      const expiresAt = query.state.data?.expiresAt;
      if (!expiresAt) return false;
      return Math.max(30_000, expiresAt - Date.now() - ICE_RENEW_MARGIN_MS);
    },
    // A tab in the background still holds a call, and the call still needs a valid relay
    // credential. This is one of the few queries where that is worth the wake-up.
    refetchIntervalInBackground: true,
    // One retry, not three. A failure here is not fatal — `use-live-call` falls back to a public
    // STUN server and the call still connects for most people.
    retry: 1,
  });

/**
 * Everything the Live tab can do to a room. One hook rather than five, because every one of these
 * mutations touches the same cached list and the patching rule is identical.
 */
export const useLiveRoomActions = (projectId: string | undefined) => {
  const queryClient = useQueryClient();

  /** Applied to both the plain and the include-ended lists, which both exist. */
  const patchLists = (update: (rooms: LiveRoom[]) => LiveRoom[]): void => {
    if (!projectId) return;
    for (const includeEnded of [false, true]) {
      queryClient.setQueryData<LiveRoom[]>(
        queryKeys.live.list(projectId, includeEnded),
        (rooms) => (rooms ? update(rooms) : rooms),
      );
    }
  };

  const upsert = (room: LiveRoom): void => {
    patchLists((rooms) => {
      const without = rooms.filter((entry) => entry.id !== room.id);
      // A room that has ended drops out of the list that excludes them. Worked out from the row
      // rather than from which mutation ran.
      return [...without, room].sort(byOpening);
    });

    queryClient.setQueryData(queryKeys.live.detail(room.id), room);
  };

  const drop = (roomId: string): void => {
    patchLists((rooms) => rooms.filter((room) => room.id !== roomId));
    queryClient.removeQueries({ queryKey: queryKeys.live.detail(roomId) });
  };

  const create = useMutation({
    mutationFn: (payload: CreateLiveRoomPayload) => liveRoomApi.create(payload),
    onSuccess: (room) => {
      upsert(room);
      toast.success(translate('live.created'));
    },
    onError: (error) => toast.error(errorMessage(error, translate('live.createFailed'))),
  });

  const update = useMutation({
    mutationFn: ({ roomId, payload }: { roomId: string; payload: UpdateLiveRoomPayload }) =>
      liveRoomApi.update(roomId, payload),
    onSuccess: upsert,
    onError: (error) => toast.error(errorMessage(error, translate('live.updateFailed'))),
  });

  const end = useMutation({
    mutationFn: (roomId: string) => liveRoomApi.end(roomId),
    onSuccess: (room) => {
      // Dropped from the default list *and* upserted into the history. `upsert` sorts an ended room
      // to the bottom but cannot know it no longer belongs in the list that excludes them.
      upsert(room);
      if (projectId) {
        queryClient.setQueryData<LiveRoom[]>(
          queryKeys.live.list(projectId, false),
          (rooms) => rooms?.filter((entry) => entry.id !== room.id),
        );
      }
      toast.success(translate('live.ended'));
    },
    onError: (error) => toast.error(errorMessage(error, translate('live.endFailed'))),
  });

  const remove = useMutation({
    mutationFn: (roomId: string) => liveRoomApi.remove(roomId),
    onSuccess: (_result, roomId) => {
      drop(roomId);
      toast.success(translate('live.removed'));
    },
    onError: (error) => toast.error(errorMessage(error, translate('live.removeFailed'))),
  });

  const grant = useMutation({
    mutationFn: ({ roomId, payload }: { roomId: string; payload: GrantLiveRoomPayload }) =>
      liveRoomApi.grant(roomId, payload),
    // Nothing patched, deliberately. A grant's visible effect is on the *call* — the person's tile,
    // their own controls.
    onError: (error) => toast.error(errorMessage(error, translate('live.grantFailed'))),
  });

  return { create, update, end, remove, grant, upsert, drop };
};

/**
 * Keeping the tab's list honest while somebody else works. The project socket room already carries
 * these four events — the API emits them from `LiveService`.
 */
export const useLiveRoomEvents = (projectId: string | undefined): void => {
  const { socket } = useRealtime();
  const { upsert, drop } = useLiveRoomActions(projectId);

  useEffect(() => {
    if (!socket || !projectId) return;

    const onUpsert = (room: LiveRoom) => {
      if (room.projectId !== projectId) return;
      upsert(room);
    };
    const onRemoved = ({ roomId }: { roomId: string }) => drop(roomId);

    socket.on('live:room-created', onUpsert);
    socket.on('live:room-updated', onUpsert);
    socket.on('live:room-removed', onRemoved);

    return () => {
      socket.off('live:room-created', onUpsert);
      socket.off('live:room-updated', onUpsert);
      socket.off('live:room-removed', onRemoved);
    };
    // `upsert`/`drop` are recreated every render (they close over the query client), so they are
    // deliberately not dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, projectId]);
};
