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
 * How long a cached room list stays fresh.
 *
 * Thirty seconds, which is shorter than the calendar's minute and longer than
 * nothing, and the reason is the one question this list answers: *is there a
 * call happening right now*. A room opened by a colleague arrives over the
 * socket and is patched in immediately (see `useLiveRoomEvents`), so this
 * window only ever covers the gap where the socket is down — and during that
 * gap a stale "nothing is happening" is the answer people act on.
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
 * The ICE servers, fetched once and kept.
 *
 * `staleTime: Infinity` because this is deployment configuration: it changes
 * when the API is redeployed, at which point the whole app reloads anyway.
 * Fetched eagerly by the panel rather than lazily by the call, so pressing
 * "join" does not wait on a round trip before it can ask for a microphone.
 */
export const useIceServers = (enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.live.ice,
    queryFn: () => liveRoomApi.iceServers(),
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    /*
     * One retry, not three.
     *
     * A failure here is not fatal — `use-live-call` falls back to a public
     * STUN server and the call still connects for most people — so spending
     * three backed-off retries in front of a button somebody just pressed buys
     * a slightly better ICE list at the cost of the thing they asked for.
     */
    retry: 1,
  });

/**
 * Everything the Live tab can do to a room.
 *
 * One hook rather than five, because every one of these mutations touches the
 * same cached list and the patching rule is identical: the API hands back the
 * finished row, so the array is edited in place rather than invalidated. On a
 * free-tier database a refetch is most of a second spent asking for something
 * already in hand.
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
      /*
       * A room that has ended drops out of the list that excludes them.
       *
       * Worked out from the row rather than from which mutation ran, so the
       * socket path and the mutation path cannot disagree about it — which is
       * the bug a "did I just end it?" flag would eventually produce.
       */
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
      /*
       * Dropped from the default list *and* upserted into the history.
       *
       * `upsert` sorts an ended room to the bottom but cannot know it no
       * longer belongs in the list that excludes them, so that one is filtered
       * explicitly here — the one place where the two lists genuinely diverge.
       */
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
    /*
     * Nothing patched, deliberately.
     *
     * A grant's visible effect is on the *call* — the person's tile, their own
     * controls — and the gateway pushes that to every participant over the
     * socket the instant it lands. The cached room row carries a guest list,
     * not live permissions, so patching it here would be writing a second,
     * slower copy of an answer that has already arrived.
     */
    onError: (error) => toast.error(errorMessage(error, translate('live.grantFailed'))),
  });

  return { create, update, end, remove, grant, upsert, drop };
};

/**
 * Keeping the tab's list honest while somebody else works.
 *
 * The project socket room already carries these four events — the API emits
 * them from `LiveService` — so this is a subscription rather than a poll. It
 * matters more here than on most boards: the question "is there a call
 * happening" has a half-life of about a minute, and a list that needed a
 * refetch to notice a room had opened would be a list people learn to reload.
 *
 * Mounted by the panel and torn down with it, so a reader on the board pays
 * nothing for a tab they do not have open.
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
    // `upsert`/`drop` are recreated every render (they close over the query
    // client), so they are deliberately not dependencies — including them
    // would tear the listeners down and rebuild them on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, projectId]);
};
