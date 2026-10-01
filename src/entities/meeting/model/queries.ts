import { useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from '@/shared/lib/toast';

import { useRealtime } from '@/app/providers/realtime-provider';
import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { translate } from '@/shared/i18n';
import { meetingApi, meetingRoomApi } from '../api/meeting.api';
import type {
  AgendaParams,
  CreateMeetingPayload,
  CreateMeetingRoomPayload,
  Meeting,
  MeetingRoom,
  RoomScope,
  UpdateMeetingPayload,
  UpdateMeetingRoomPayload,
} from './types';

/**
 * How long a cached calendar stays fresh. A minute, matching the roster — and for the same reason.
 * Meetings change on human timescales, the tab is mounted only while it is open.
 */
const MEETINGS_STALE_TIME = 60_000;

/** Clock order, so a locally inserted row lands where a refetch would put it. */
const byStart = (a: Meeting, b: Meeting): number =>
  new Date(a.startAt).getTime() - new Date(b.startAt).getTime();

const projectKey = (projectId: string) => queryKeys.meetings.list('project', projectId);
const organizationKey = (organizationId: string) =>
  queryKeys.meetings.list('organization', organizationId);

/**
 * The snapshot a board reads, edited in place — where that is honest, and refetched where it is
 * not. Every write to a project's board patches the cached array rather than invalidating it.
 */
const upsertMeeting = (queryClient: QueryClient, meeting: Meeting): void => {
  if (meeting.projectId) {
    queryClient.setQueryData<Meeting[]>(projectKey(meeting.projectId), (meetings) => {
      if (!Array.isArray(meetings)) return meetings;

      // A completed meeting leaves the board — the server says so with a
      // `meeting:deleted`, but a local write knows it a beat sooner.
      if (meeting.completedAt) {
        return meetings.filter((entry) => entry.id !== meeting.id);
      }

      const isKnown = meetings.some((entry) => entry.id === meeting.id);
      const next = isKnown
        ? meetings.map((entry) => (entry.id === meeting.id ? meeting : entry))
        : [...meetings, meeting];

      return [...next].sort(byStart);
    });
  }

  void queryClient.invalidateQueries({
    queryKey: ['meetings', 'list', 'organization'],
    refetchType: 'active',
  });

  invalidateAgenda(queryClient);
};

const removeMeeting = (queryClient: QueryClient, meetingId: string): void => {
  for (const query of queryClient.getQueryCache().findAll({ queryKey: ['meetings', 'list'] })) {
    queryClient.setQueryData<Meeting[]>(query.queryKey, (meetings) =>
      Array.isArray(meetings) ? meetings.filter((entry) => entry.id !== meetingId) : meetings,
    );
  }
  invalidateAgenda(queryClient);
};

/**
 * The personal agenda holds the same rows under a different question. It is invalidated rather than
 * patched, and that asymmetry is deliberate.
 */
const invalidateAgenda = (queryClient: QueryClient): void => {
  void queryClient.invalidateQueries({ queryKey: ['meetings', 'agenda'] });
};

/**
 * One project's live meetings. Held at the *page* level rather than inside the meetings tab, which
 * is what makes the tab open full instead of spending a round trip empty.
 */
export const useProjectMeetings = (projectId: string | undefined) =>
  useQuery({
    queryKey: projectKey(projectId ?? ''),
    queryFn: () => meetingApi.list({ projectId: projectId as string }),
    enabled: Boolean(projectId),
    staleTime: MEETINGS_STALE_TIME,
  });

/**
 * One company's calendar: what it booked, plus what its projects booked. The union is assembled by
 * the server rather than by merging cached project calendars here, and for the usual reason.
 */
export const useOrganizationMeetings = (
  organizationId: string | undefined,
  enabled = true,
) =>
  useQuery({
    queryKey: organizationKey(organizationId ?? ''),
    queryFn: () => meetingApi.list({ organizationId: organizationId as string }),
    enabled: Boolean(organizationId) && enabled,
    staleTime: MEETINGS_STALE_TIME,
  });

/**
 * Everything the signed-in person is expected at, across every project and every company. "Which
 * meetings am I expected at" is a question only the server can answer.
 */
export const useMyAgenda = (params: AgendaParams = {}) =>
  useQuery({
    queryKey: queryKeys.meetings.agenda(params.projectId),
    queryFn: () => meetingApi.agenda(params),
    staleTime: MEETINGS_STALE_TIME,
  });

/**
 * A colleague's change to the calendar, applied rather than refetched. The events carry the whole
 * row, so there is nothing to go and ask for.
 */
export const useProjectMeetingsRealtime = (projectId: string | undefined): void => {
  const { socket } = useRealtime();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !projectId) return;

    const handleUpsert = (meeting: Meeting) => {
      if (meeting.projectId !== projectId) return;
      upsertMeeting(queryClient, meeting);
    };

    const handleDelete = ({ meetingId }: { meetingId: string }) =>
      removeMeeting(queryClient, meetingId);

    socket.on('meeting:created', handleUpsert);
    socket.on('meeting:updated', handleUpsert);
    socket.on('meeting:deleted', handleDelete);

    return () => {
      socket.off('meeting:created', handleUpsert);
      socket.off('meeting:updated', handleUpsert);
      socket.off('meeting:deleted', handleDelete);
    };
  }, [projectId, queryClient, socket]);
};

/**
 * Posting a meeting, from wherever it is being posted. Takes the whole scope rather than a project
 * id, because that scope is the one thing the two composers disagree about.
 */
export const useCreateMeeting = (scope: {
  projectId?: string;
  organizationId?: string;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      payload: Omit<CreateMeetingPayload, 'projectId' | 'organizationId'> & {
        /** Set by the company composer when the meeting is about a project. */
        projectId?: string;
      },
    ) =>
      meetingApi.create({
        ...payload,
        organizationId: scope.organizationId,
        projectId: payload.projectId ?? scope.projectId,
      }),
    onSuccess: (meeting) => {
      upsertMeeting(queryClient, meeting);
      toast.success(translate('meetings.created'));
    },
    onError: (error) => toast.error(errorMessage(error, translate('meetings.createFailed'))),
  });
};

/**
 * Takes no scope, unlike its siblings. The response carries `projectId` and `organizationId`, and
 * those are the ones the cache has to be keyed by: a meeting cannot move between calendars.
 */
export const useUpdateMeeting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      meetingId,
      payload,
    }: {
      meetingId: string;
      payload: UpdateMeetingPayload;
    }) => meetingApi.update(meetingId, payload),

    onSuccess: (meeting, { payload }) => {
      upsertMeeting(queryClient, meeting);
      toast.success(
        translate(payload.isCompleted ? 'meetings.completed' : 'meetings.updated'),
      );
    },

    onError: (error) => toast.error(errorMessage(error, translate('meetings.saveFailed'))),
  });
};

/**
 * Deletion, felt on the click. The row goes immediately and comes back if the server refuses — the
 * same trade the Post-it board and the roster make.
 */
export const useDeleteMeeting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (meetingId: string) => meetingApi.remove(meetingId),

    onMutate: async (meetingId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.meetings.all });
      const previous = queryClient.getQueriesData<Meeting[]>({
        queryKey: ['meetings', 'list'],
      });
      removeMeeting(queryClient, meetingId);
      return { previous };
    },

    onError: (error, _meetingId, context) => {
      for (const [key, data] of context?.previous ?? []) {
        queryClient.setQueryData(key, data);
      }
      toast.error(errorMessage(error, translate('meetings.deleteFailed')));
    },

    onSuccess: () => toast.success(translate('meetings.deleted')),
  });
};

/**
 * Marking a meeting done, which is also how it leaves the board. Optimistic for the same reason the
 * delete is — from the reader's side the two are the same gesture.
 */
export const useCompleteMeeting = () => {
  const queryClient = useQueryClient();
  // Keyed off `mutate` rather than the mutation object: React Query hands back a fresh object every
  // render.
  const { mutate } = useUpdateMeeting();

  return useCallback(
    (meetingId: string) => {
      const previous = queryClient.getQueriesData<Meeting[]>({
        queryKey: ['meetings', 'list'],
      });
      removeMeeting(queryClient, meetingId);

      mutate(
        { meetingId, payload: { isCompleted: true } },
        {
          onError: () => {
            for (const [key, data] of previous) queryClient.setQueryData(key, data);
          },
        },
      );
    },
    [mutate, queryClient],
  );
};

// --- Rooms -------------------------------------------------------------------

/**
 * How long a cached room list stays fresh. An hour, against the calendar's minute, and the gap is
 * the point.
 */
const ROOMS_STALE_TIME = 60 * 60_000;

const roomsKey = (scope: RoomScope) =>
  scope.projectId
    ? queryKeys.meetings.rooms('project', scope.projectId)
    : queryKeys.meetings.rooms('organization', scope.organizationId ?? '');

/**
 * The rooms this calendar can book, the project's own first. `enabled` follows the scope rather
 * than a flag: exactly one of the two ids is set on any given surface.
 */
export const useMeetingRooms = (scope: RoomScope, enabled = true) =>
  useQuery({
    queryKey: roomsKey(scope),
    queryFn: () => meetingRoomApi.list(scope),
    enabled: enabled && Boolean(scope.projectId || scope.organizationId),
    staleTime: ROOMS_STALE_TIME,
  });

/**
 * Registering a room, edited into the cache rather than refetched. Safe here in a way it is not for
 * meetings.
 */
export const useCreateMeetingRoom = (scope: RoomScope) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Omit<CreateMeetingRoomPayload, 'projectId' | 'organizationId'>) =>
      meetingRoomApi.create({ ...payload, ...scope }),

    onSuccess: (room) => {
      queryClient.setQueryData<MeetingRoom[]>(roomsKey(scope), (rooms) =>
        Array.isArray(rooms) ? sortRooms([...rooms, room]) : rooms,
      );
      if (scope.organizationId) invalidateInheritedRooms(queryClient);
      toast.success(translate('rooms.created'));
    },

    onError: (error) => toast.error(errorMessage(error, translate('rooms.saveFailed'))),
  });
};

export const useUpdateMeetingRoom = (scope: RoomScope) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roomId, payload }: { roomId: string; payload: UpdateMeetingRoomPayload }) =>
      meetingRoomApi.update(roomId, payload),

    onSuccess: (room) => {
      queryClient.setQueryData<MeetingRoom[]>(roomsKey(scope), (rooms) =>
        Array.isArray(rooms)
          ? sortRooms(rooms.map((entry) => (entry.id === room.id ? room : entry)))
          : rooms,
      );
      if (scope.organizationId) invalidateInheritedRooms(queryClient);
      toast.success(translate('rooms.saved'));
    },

    onError: (error) => toast.error(errorMessage(error, translate('rooms.saveFailed'))),
  });
};

/** Removing a room, felt on the click. The meetings booked into it are untouched. */
export const useDeleteMeetingRoom = (scope: RoomScope) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roomId: string) => meetingRoomApi.remove(roomId),

    onMutate: async (roomId) => {
      const key = roomsKey(scope);
      await queryClient.cancelQueries({ queryKey: key });

      const previous = queryClient.getQueryData<MeetingRoom[]>(key);
      queryClient.setQueryData<MeetingRoom[]>(key, (rooms) =>
        Array.isArray(rooms) ? rooms.filter((room) => room.id !== roomId) : rooms,
      );

      return { key, previous };
    },

    onError: (error, _roomId, context) => {
      if (context) queryClient.setQueryData(context.key, context.previous);
      toast.error(errorMessage(error, translate('rooms.deleteFailed')));
    },

    onSuccess: () => {
      if (scope.organizationId) invalidateInheritedRooms(queryClient);
      toast.success(translate('rooms.deleted'));
    },
  });
};

/** The server's order: the calendar's own rooms first, then by name. */
const sortRooms = (rooms: MeetingRoom[]): MeetingRoom[] =>
  [...rooms].sort((a, b) => {
    if (a.scope !== b.scope) return a.scope === 'project' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

/**
 * Every project room list, marked stale. A company's rooms are inherited by every project filed
 * under it, and this client holds no map from a company to its projects.
 */
const invalidateInheritedRooms = (queryClient: QueryClient): void => {
  void queryClient.invalidateQueries({
    queryKey: ['meetings', 'rooms', 'project'],
    refetchType: 'active',
  });
};
