import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { errorMessage } from '@/shared/api/client';
import { taskApi } from '@/entities/task/api/task.api';
import type { ListTasksParams } from '@/entities/task/model/types';
import { queryKeys } from '@/shared/api/query-keys';
import { useIntentPrefetch, type IntentHandlers } from '@/shared/lib/use-intent-prefetch';
import { projectApi, type ListProjectsParams } from '../api/project.api';
import type {
  OverviewDelta,
  Project,
  ProjectListItem,
  ProjectRole,
  RosterMember,
  UserOverview,
} from './types';
import { translate } from '@/shared/i18n';

export const useProjects = (params: ListProjectsParams = {}) =>
  useQuery({
    queryKey: queryKeys.projects.list(params),
    queryFn: () => projectApi.list(params),
    staleTime: 30_000,
  });

/**
 * The project as the list already knows it.
 *
 * `ProjectListItem extends Project`, which is not an accident of typing — the
 * API shapes both from the same include, so a row from `/projects` carries
 * every field `/projects/:id` returns, roster and role included, plus counts.
 * There is genuinely nothing the detail page needs that the list did not
 * already fetch.
 *
 * That matters because the project page gates its entire render on this query:
 * until it resolved, the header, the tabs and the task board were all replaced
 * by a loader — so arriving from the dashboard meant waiting on a round trip
 * for data the dashboard had been holding all along, and the board underneath
 * could not even begin to seed itself.
 */
const seedProjectFrom = (queryClient: QueryClient, projectId: string): Project | undefined => {
  for (const [, data] of queryClient.getQueriesData<ProjectListItem[]>({
    queryKey: queryKeys.projects.all,
  })) {
    if (!Array.isArray(data)) continue;

    const hit = data.find((project) => project.id === projectId);
    if (hit) return hit;
  }

  return undefined;
};

export const useProject = (projectId: string | undefined) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.projects.detail(projectId ?? ''),
    queryFn: () => projectApi.detail(projectId as string),
    enabled: Boolean(projectId),
    // A placeholder, so it is never written to the cache and never counts as
    // fresh: the request still goes out and still has the last word.
    placeholderData: () => (projectId ? seedProjectFrom(queryClient, projectId) : undefined),
  });
};

export const useProjectDashboard = (projectId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.projects.dashboard(projectId ?? ''),
    queryFn: () => projectApi.dashboard(projectId as string),
    enabled: Boolean(projectId),
    staleTime: 60_000,
  });

export const useUserOverview = () =>
  useQuery({
    queryKey: queryKeys.projects.overview,
    queryFn: projectApi.overview,
    staleTime: 60_000,
  });

/**
 * Moves the dashboard's own counters without waiting for the server.
 *
 * The tiles are computed by the API — three `taskAssignment.count()` queries —
 * so nothing on the client can *derive* them from what it holds. That is why
 * they used to lag: ticking a box patched every cached copy of the task
 * instantly and then left the counters to a second, sequential round trip
 * (`POST /completion`, and only then `GET /overview`), which on a remote
 * database is most of a second of the number sitting there visibly wrong
 * underneath a card that has already moved.
 *
 * A count, though, does not need deriving — it needs *nudging*. The caller
 * knows exactly what it just changed, so it says so, and the refetch that
 * follows still lands as the authority a moment later. If the two disagree the
 * server wins, silently, because it is the one holding the rows.
 *
 * Clamped at zero: a negative "overdue" from a delta that raced a refetch is
 * the one failure mode a user would actually notice.
 */
export const patchUserOverview = (queryClient: QueryClient, delta: OverviewDelta): void => {
  if (!delta.openTasks && !delta.completedTasks && !delta.overdueTasks) return;

  queryClient.setQueryData<UserOverview>(queryKeys.projects.overview, (overview) => {
    if (!overview) return overview;

    return {
      ...overview,
      openTasks: Math.max(0, overview.openTasks + (delta.openTasks ?? 0)),
      completedTasks: Math.max(0, overview.completedTasks + (delta.completedTasks ?? 0)),
      overdueTasks: Math.max(0, overview.overdueTasks + (delta.overdueTasks ?? 0)),
    };
  });
};

export const useMyInvitations = () =>
  useQuery({
    queryKey: queryKeys.invitations.mine,
    queryFn: projectApi.myInvitations,
    staleTime: 30_000,
  });

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: projectApi.create,
    onSuccess: (project) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      toast.success(`"${project.name}" is ready.`);
    },
    onError: (error) => toast.error(errorMessage(error, translate('toast.projectCreateFailed'))),
  });
};

export const useUpdateProject = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Parameters<typeof projectApi.update>[1]) =>
      projectApi.update(projectId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      toast.success(translate('toast.projectUpdated'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: projectApi.remove,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      toast.success(translate('toast.projectBinned'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
};

/**
 * Pin toggling is optimistic: the star must feel instant, and a rollback on
 * failure is cheap because nothing else depends on the flag.
 */
/**
 * Flips `isPinned` everywhere a project is currently cached.
 *
 * Keyed on the *shape of the query key* rather than on the shape of the data,
 * and that distinction matters: `queryKeys.projects.all` is the prefix for the
 * lists, the detail, the dashboard, the roster and the overview alike. A patch
 * that recognised its targets by "an array of objects with an id" would happily
 * rewrite the roster, whose members also have ids and no business carrying a
 * pin.
 */
const patchProjectPinned = (
  queryClient: QueryClient,
  projectId: string,
  isPinned: boolean,
): void => {
  for (const [key, data] of queryClient.getQueriesData({ queryKey: queryKeys.projects.all })) {
    if (!data) continue;

    // ['projects', 'list', params] — every filtered list currently mounted.
    if (key[1] === 'list' && Array.isArray(data)) {
      queryClient.setQueryData(
        key,
        (data as ProjectListItem[]).map((project) =>
          project.id === projectId ? { ...project, isPinned } : project,
        ),
      );
      continue;
    }

    // ['projects', id] — the detail the project page reads its header from.
    if (key.length === 2 && key[1] === projectId) {
      queryClient.setQueryData(key, { ...(data as Project), isPinned });
    }
  }
};

/**
 * Pinning, felt immediately.
 *
 * This used to be a bare mutation whose only cache work was an invalidation on
 * `onSettled`, which meant the icon could not change until *two* round trips
 * had finished: the write, and then the refetch it triggered. On a warm local
 * API that is a beat too slow; on a free-tier container that has gone to sleep
 * it is several seconds of a button that appears not to have registered the
 * click at all — so people press it again, which toggles it back.
 *
 * The pin is also a strictly local, strictly boolean piece of state: there is
 * no server-side computation to wait for and nothing another user can
 * concurrently disagree about, which makes it about the safest thing in the app
 * to write optimistically.
 *
 * The invalidation stays, moved behind the optimistic write. It is now
 * reconciliation nobody is waiting on rather than the thing that finally makes
 * the button correct.
 */
export const useTogglePin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, pinned }: { projectId: string; pinned: boolean }) =>
      projectApi.setPinned(projectId, pinned),

    onMutate: ({ projectId, pinned }) => {
      const snapshot = queryClient.getQueriesData({ queryKey: queryKeys.projects.all });
      patchProjectPinned(queryClient, projectId, pinned);
      return { snapshot };
    },

    onError: (error, _variables, context) => {
      context?.snapshot.forEach(([key, value]) => queryClient.setQueryData(key, value));
      toast.error(errorMessage(error, translate('toast.pinFailed')));
    },

    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
  });
};

/*
 * The roster and its pending invitations change on human timescales.
 *
 * Both of these back a tab that is mounted only while it is open, so every
 * visit used to be a fresh request on the global 30s `staleTime` — and the
 * panel renders empty until it lands. But somebody joining a project is not a
 * thing that happens between two clicks of the same tab, and when it does the
 * socket says so: `roster:joined` / `roster:left` already invalidate
 * `projects.all` in the realtime provider.
 *
 * A minute of tolerance therefore costs nothing anybody can observe and makes
 * switching back and forth free. `usePrefetchProjectCollaboration` below does
 * the other half.
 */
const ROSTER_STALE_TIME = 60_000;

export const useRoster = (projectId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.projects.members(projectId ?? ''),
    queryFn: () => projectApi.members(projectId as string),
    enabled: Boolean(projectId),
    staleTime: ROSTER_STALE_TIME,
  });

export const usePendingInvitations = (projectId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.projects.invitations(projectId ?? ''),
    queryFn: () => projectApi.pendingInvitations(projectId as string),
    enabled: Boolean(projectId),
    staleTime: ROSTER_STALE_TIME,
  });

/**
 * Warm the roster tab while the user is looking at the board.
 *
 * Same reasoning as the chat prefetch: the tab is mounted on click, so the
 * click is the first moment the app asks for the data and the panel spends a
 * round trip empty. Moving the request to the page load spends it against time
 * the user was going to be here anyway.
 *
 * Invitations are only fetched when the caller can actually manage them —
 * `RosterPanel` guards the query the same way, and a request the server will
 * refuse is not a prefetch, it is a 403 on every project page.
 */
export const usePrefetchProjectCollaboration = (
  projectId: string | undefined,
  canManage: boolean,
): void => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId) return;

    void queryClient.prefetchQuery({
      queryKey: queryKeys.projects.members(projectId),
      queryFn: () => projectApi.members(projectId),
      staleTime: ROSTER_STALE_TIME,
    });

    if (!canManage) return;

    void queryClient.prefetchQuery({
      queryKey: queryKeys.projects.invitations(projectId),
      queryFn: () => projectApi.pendingInvitations(projectId),
      staleTime: ROSTER_STALE_TIME,
    });
  }, [canManage, projectId, queryClient]);
};

/**
 * Warms a project the pointer is resting on.
 *
 * Two requests, because opening a project needs both and neither is useful
 * alone: the detail response draws the header and decides the user's role
 * (which gates half the page), and the task list is the board itself. Fetching
 * only one would still leave the page half-empty on arrival.
 *
 * The task key mirrors `ProjectPage`'s opening filters exactly — `{ scope:
 * 'all', projectId }`. A prefetch under a different key fills a cache nothing
 * will read, which is the worst of both: a request paid for and a spinner
 * anyway. If those initial filters ever change, this has to change with them.
 *
 * `useIntentPrefetch` owns the restraint — dwell delay, per-destination
 * cooldown, no touch, no Data Saver. See that hook for why each one is there.
 */
export const useProjectIntentPrefetch = (projectId: string | undefined): IntentHandlers => {
  const queryClient = useQueryClient();

  return useIntentPrefetch(projectId && `project:${projectId}`, () => {
    if (!projectId) return;

    void queryClient.prefetchQuery({
      queryKey: queryKeys.projects.detail(projectId),
      queryFn: () => projectApi.detail(projectId),
    });

    const taskParams: ListTasksParams = { scope: 'all', projectId };
    void queryClient.prefetchQuery({
      queryKey: queryKeys.tasks.list(taskParams),
      queryFn: () => taskApi.list(taskParams),
      staleTime: 60_000,
    });
  });
};

export const useInviteMember = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { userId?: string; email?: string; role?: ProjectRole }) =>
      projectApi.invite(projectId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.invitations(projectId) });
      toast.success(translate('toast.inviteSent'));
    },
    onError: (error) => toast.error(errorMessage(error, translate('toast.inviteFailed'))),
  });
};

export const useRespondToInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ invitationId, accept }: { invitationId: string; accept: boolean }) =>
      projectApi.respondToInvitation(invitationId, accept),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.invitations.mine });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      toast.success(variables.accept ? translate('toast.joinedProject') : translate('toast.inviteDeclined'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
};

/**
 * Drops one person from every cached copy of a roster.
 *
 * The roster is held in three shapes — the members query the panel reads, the
 * `roster` array on the project detail, and the same array on every project
 * *list* row (`ProjectListItem extends Project`) — and all three are on screen
 * at once: the panel, the header's member count and the avatar stack. Patching
 * one and refetching the rest is what made the row linger.
 */
const patchRosterRemoval = (
  queryClient: QueryClient,
  projectId: string,
  memberId: string,
): void => {
  queryClient.setQueryData<RosterMember[]>(queryKeys.projects.members(projectId), (members) =>
    Array.isArray(members) ? members.filter((member) => member.id !== memberId) : members,
  );

  for (const [key, data] of queryClient.getQueriesData({ queryKey: queryKeys.projects.all })) {
    if (!data) continue;

    if (key[1] === 'list' && Array.isArray(data)) {
      queryClient.setQueryData(
        key,
        (data as ProjectListItem[]).map((project) =>
          project.id === projectId
            ? { ...project, roster: project.roster.filter((member) => member.id !== memberId) }
            : project,
        ),
      );
      continue;
    }

    if (key.length === 2 && key[1] === projectId) {
      const project = data as Project;
      queryClient.setQueryData(key, {
        ...project,
        roster: project.roster.filter((member) => member.id !== memberId),
      });
    }
  }
};

/**
 * Removal, felt on the click rather than on the response.
 *
 * The request behind this is not one write: it deletes the membership, hands
 * back every task the person was assigned and clears their pin, inside a
 * transaction, and then broadcasts. On a cold free-tier database that is
 * comfortably over a second — during which the old UI did nothing at all. No
 * spinner, no row change, nothing until the success toast, so the honest read
 * of the screen was that the click had not registered. People clicked again.
 *
 * There is nothing to *wait* for, though: the client knows exactly which row
 * is going, and the server has no say in the outcome beyond yes or no. So the
 * row goes immediately and the caches are rolled back in full if the answer
 * turns out to be no — the same trade `useTogglePin` already makes, on an
 * action where the latency is far more visible.
 *
 * The invalidation stays, moved behind the optimistic write, where it is
 * reconciliation nobody is waiting on rather than the thing that finally makes
 * the panel correct.
 */
export const useRemoveMember = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) => projectApi.removeMember(projectId, memberId),

    onMutate: async (memberId) => {
      // The in-flight roster refetch would otherwise land after the patch and
      // put the row straight back.
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.members(projectId) });

      const snapshot = queryClient.getQueriesData({ queryKey: queryKeys.projects.all });
      patchRosterRemoval(queryClient, projectId, memberId);
      return { snapshot };
    },

    onError: (error, _memberId, context) => {
      context?.snapshot.forEach(([key, value]) => queryClient.setQueryData(key, value));
      toast.error(errorMessage(error, translate('toast.rosterRemoveFailed')));
    },

    onSuccess: () => toast.success(translate('toast.rosterUpdated')),

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.members(projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
};
