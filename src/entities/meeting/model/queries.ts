import { useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useRealtime } from '@/app/providers/realtime-provider';
import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { translate } from '@/shared/i18n';
import { meetingApi } from '../api/meeting.api';
import type { CreateMeetingPayload, Meeting, UpdateMeetingPayload } from './types';

/**
 * How long a cached calendar stays fresh.
 *
 * A minute, matching the roster — and for the same reason. Meetings change on
 * human timescales, the tab is mounted only while it is open, and anything a
 * colleague *does* change arrives over the socket and is applied to the cache
 * directly. So the only thing a shorter window would buy is a request every
 * time somebody flicks between tabs.
 */
const MEETINGS_STALE_TIME = 60_000;

/** Clock order, so a locally inserted row lands where a refetch would put it. */
const byStart = (a: Meeting, b: Meeting): number =>
  new Date(a.startAt).getTime() - new Date(b.startAt).getTime();

const listKey = (projectId: string) => queryKeys.meetings.list(projectId);

/**
 * The snapshot the board reads, edited in place.
 *
 * Every write here patches the cached array rather than invalidating it. That
 * is the same rule the Post-it board and the text board already follow, and it
 * is not a micro-optimisation: the API hands back the finished row on create
 * and update, so a refetch would be a round trip spent asking for something
 * already in hand — on a free-tier database where that round trip is most of a
 * second of a board sitting on stale data.
 */
const upsertMeeting = (queryClient: QueryClient, meeting: Meeting): void => {
  queryClient.setQueryData<Meeting[]>(listKey(meeting.projectId), (meetings) => {
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
};

const removeMeeting = (queryClient: QueryClient, projectId: string, meetingId: string): void => {
  queryClient.setQueryData<Meeting[]>(listKey(projectId), (meetings) =>
    Array.isArray(meetings) ? meetings.filter((entry) => entry.id !== meetingId) : meetings,
  );
};

/**
 * One project's live meetings.
 *
 * Held at the *page* level rather than inside the meetings tab, which is what
 * makes the tab open full instead of spending a round trip empty — the same
 * warming the roster gets from `usePrefetchProjectCollaboration`, except that
 * here a second surface genuinely needs the data anyway: the text board's
 * "where does this page go" picker lists the meetings still open. One query,
 * two readers, no prefetch to keep in step with it.
 */
export const useProjectMeetings = (projectId: string | undefined) =>
  useQuery({
    queryKey: listKey(projectId ?? ''),
    queryFn: () => meetingApi.list({ projectId: projectId as string }),
    enabled: Boolean(projectId),
    staleTime: MEETINGS_STALE_TIME,
  });

/**
 * A colleague's change to the calendar, applied rather than refetched.
 *
 * The events carry the whole row, so there is nothing to go and ask for. This
 * mirrors `useProjectDocumentsRealtime` and `useProjectBoardRealtime`; the one
 * thing worth noting is that completion arrives as `meeting:deleted` — the
 * server decides that a signed-off meeting is a removal so that every client
 * does not have to reach the same conclusion separately.
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
      removeMeeting(queryClient, projectId, meetingId);

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

export const useCreateMeeting = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Omit<CreateMeetingPayload, 'projectId'>) =>
      meetingApi.create({ ...payload, projectId }),
    onSuccess: (meeting) => {
      upsertMeeting(queryClient, meeting);
      toast.success(translate('meetings.created'));
    },
    onError: (error) => toast.error(errorMessage(error, translate('meetings.createFailed'))),
  });
};

/**
 * Takes no project id, unlike its siblings.
 *
 * The response carries `projectId`, and that is the one the cache has to be
 * keyed by: a meeting cannot move between projects, so a second copy passed in
 * by the caller could only ever agree or be wrong.
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
 * Deletion, felt on the click.
 *
 * The row goes immediately and comes back if the server refuses — the same
 * trade the Post-it board and the roster make. There is nothing to wait for:
 * the client knows exactly which row is going, and the server's only
 * contribution is yes or no.
 */
export const useDeleteMeeting = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (meetingId: string) => meetingApi.remove(meetingId),

    onMutate: async (meetingId) => {
      await queryClient.cancelQueries({ queryKey: listKey(projectId) });
      const previous = queryClient.getQueryData<Meeting[]>(listKey(projectId));
      removeMeeting(queryClient, projectId, meetingId);
      return { previous };
    },

    onError: (error, _meetingId, context) => {
      if (context?.previous) queryClient.setQueryData(listKey(projectId), context.previous);
      toast.error(errorMessage(error, translate('meetings.deleteFailed')));
    },

    onSuccess: () => toast.success(translate('meetings.deleted')),
  });
};

/**
 * Marking a meeting done, which is also how it leaves the board.
 *
 * Optimistic for the same reason the delete is — from the reader's side the
 * two are the same gesture, and it would be odd for one to be instant and the
 * other to hang. Wrapped around the update mutation rather than duplicating it,
 * so there is one write path and one error message.
 */
export const useCompleteMeeting = (projectId: string) => {
  const queryClient = useQueryClient();
  // Keyed off `mutate` rather than the mutation object: React Query hands back
  // a fresh object every render, so depending on that would rebuild this
  // callback each time and defeat the memo on the rows below it.
  const { mutate } = useUpdateMeeting();

  return useCallback(
    (meetingId: string) => {
      const previous = queryClient.getQueryData<Meeting[]>(listKey(projectId));
      removeMeeting(queryClient, projectId, meetingId);

      mutate(
        { meetingId, payload: { isCompleted: true } },
        {
          onError: () => {
            if (previous) queryClient.setQueryData(listKey(projectId), previous);
          },
        },
      );
    },
    [mutate, projectId, queryClient],
  );
};
