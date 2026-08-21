import { useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useRealtime } from '@/app/providers/realtime-provider';
import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { translate } from '@/shared/i18n';
import { meetingApi } from '../api/meeting.api';
import type {
  AgendaParams,
  CreateMeetingPayload,
  Meeting,
  UpdateMeetingPayload,
} from './types';

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

const projectKey = (projectId: string) => queryKeys.meetings.list('project', projectId);
const organizationKey = (organizationId: string) =>
  queryKeys.meetings.list('organization', organizationId);

/**
 * The snapshot a board reads, edited in place — where that is honest, and
 * refetched where it is not.
 *
 * ## The project calendar is patched
 *
 * Every write to a project's board patches the cached array rather than
 * invalidating it. That is the same rule the Post-it board and the text board
 * already follow, and it is not a micro-optimisation: the API hands back the
 * finished row on create and update, so a refetch would be a round trip spent
 * asking for something already in hand — on a free-tier database where that
 * round trip is most of a second of a board sitting on stale data.
 *
 * ## A company calendar is refetched
 *
 * It cannot be patched, and the reason is worth stating rather than working out
 * twice. A company's calendar is a *union*: what it booked itself, plus what
 * every project filed under it booked. Whether a given meeting falls in that
 * union is a join the server performs — the row carries its project, and the
 * project reference does not say which company holds it. So the client cannot
 * decide from the row in its hand whether the row belongs on the company
 * calendar in its cache, and a guess in either direction is a meeting that
 * appears where it should not or fails to appear where it should.
 *
 * `refetchType: 'active'` keeps the cost proportionate: at most one company
 * calendar is mounted at a time, and one that nobody is looking at is simply
 * marked stale and re-asked when it next opens.
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
 * The personal agenda holds the same rows under a different question.
 *
 * It is invalidated rather than patched, and that asymmetry is deliberate. A
 * board's cache can be edited in place because membership is settled — the row
 * belongs to that calendar and always will. Whether a meeting belongs on
 * *somebody's agenda* is a server-side predicate (are they a participant, or is
 * the guest list empty, or have they left the project since?), and
 * re-implementing it here would be a second copy of a rule that can only be
 * right in one place. The agenda is also rarely mounted at the same time as a
 * board, so in practice this marks a cache nobody is looking at.
 */
const invalidateAgenda = (queryClient: QueryClient): void => {
  void queryClient.invalidateQueries({ queryKey: ['meetings', 'agenda'] });
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
    queryKey: projectKey(projectId ?? ''),
    queryFn: () => meetingApi.list({ projectId: projectId as string }),
    enabled: Boolean(projectId),
    staleTime: MEETINGS_STALE_TIME,
  });

/**
 * One company's calendar: what it booked, plus what its projects booked.
 *
 * The union is assembled by the server rather than by merging cached project
 * calendars here, and for the usual reason — the client does not hold the
 * meetings of projects the reader is not on, and a company's calendar is meant
 * to show them. See the API's `MeetingsService.list`.
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
 * Everything the signed-in person is expected at, across every project and
 * every company.
 *
 * ## Why this is its own query rather than a merge of the boards'
 *
 * "Which meetings am I expected at" is a question only the server can answer:
 * it spans projects this client has never fetched, and the rule includes
 * meetings with an *empty* guest list, which mean "everybody who can see this"
 * and are therefore about membership rather than about the row. Assembling it
 * from cached per-calendar lists would be both incomplete and a copy of a
 * permission rule.
 *
 * ## No realtime
 *
 * Socket rooms are per project, and this page is in none of them — joining a
 * dozen rooms to keep a calendar warm would cost more than it saves. Writes
 * made anywhere in this tab invalidate the agenda (see `invalidateAgenda`), and
 * a colleague's change lands on the next visit. A minute-fresh agenda is the
 * right trade for a surface people open to plan their week.
 */
export const useMyAgenda = (params: AgendaParams = {}) =>
  useQuery({
    queryKey: queryKeys.meetings.agenda(params.projectId),
    queryFn: () => meetingApi.agenda(params),
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
 *
 * Only project meetings arrive this way. A company has no socket room of its
 * own — see the API's `MeetingsService.announce` for why — so a company's
 * calendar refetches on open instead.
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
 * Posting a meeting, from wherever it is being posted.
 *
 * Takes the whole scope rather than a project id, because that scope is the one
 * thing the two composers disagree about: a project board can only ever book
 * against itself, while a company can book against itself, or against itself
 * *and* one of its projects. Passing it through as an object keeps that a
 * caller's decision instead of two nearly identical hooks.
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
 * Takes no scope, unlike its siblings.
 *
 * The response carries `projectId` and `organizationId`, and those are the ones
 * the cache has to be keyed by: a meeting cannot move between calendars, so a
 * second copy passed in by the caller could only ever agree or be wrong.
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
 *
 * The rollback snapshots every cached calendar rather than one, because a
 * meeting can be on several at once and restoring only the board somebody
 * happens to be looking at would leave the others a row short until they
 * refetched.
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
 * Marking a meeting done, which is also how it leaves the board.
 *
 * Optimistic for the same reason the delete is — from the reader's side the two
 * are the same gesture, and it would be odd for one to be instant and the other
 * to hang. Wrapped around the update mutation rather than duplicating it, so
 * there is one write path and one error message.
 */
export const useCompleteMeeting = () => {
  const queryClient = useQueryClient();
  // Keyed off `mutate` rather than the mutation object: React Query hands back
  // a fresh object every render, so depending on that would rebuild this
  // callback each time and defeat the memo on the rows below it.
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
