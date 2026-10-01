import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from '@/shared/lib/toast';

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
 * The project as the list already knows it. `ProjectListItem extends Project`, which is not an
 * accident of typing — the API shapes both from the same include.
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
 * Moves the dashboard's own counters without waiting for the server. The tiles are computed by the
 * API — three `taskAssignment.count()` queries.
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
      toast.success(translate('toast.projectReady', { name: project.name }));
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

/**
 * Bin a project. The binned project's own subtree is **removed** rather than invalidated, for the
 * same reason the organization delete does it (see `useDeleteOrganization`).
 */
/**
 * Leaving a project, from its settings. Afterwards the project is somebody else's entirely, so it
 * leaves this client the way a deleted one does: its detail is dropped rather than invalidated.
 */
export const useLeaveProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, successorId }: { projectId: string; successorId?: string }) =>
      projectApi.leave(projectId, successorId),
    onSuccess: (_result, { projectId }) => {
      queryClient.removeQueries({ queryKey: queryKeys.projects.detail(projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.meetings.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.billing.summary });
      toast.success(translate('project.leftToast'));
    },
    onError: (error) => toast.error(errorMessage(error, translate('project.leaveFailed'))),
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: projectApi.remove,
    onSuccess: (_result, projectId) => {
      queryClient.removeQueries({ queryKey: queryKeys.projects.detail(projectId) });
      // The prefix, *after* the removal. Invalidating `['projects']` covers the lists, the overview
      // and the recycle bin — where this project has just appeared — in one call.
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      // The caches that hold the project's rows *outside* the project. The API stops serving a
      // binned project's tasks and meetings the moment it is binned.
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.meetings.all });
      // Binning frees a project slot, and the plan meters count what exists.
      void queryClient.invalidateQueries({ queryKey: queryKeys.billing.summary });
      toast.success(translate('toast.projectBinned'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
};

/**
 * The owner's recycle bin: binned projects, and when each expires. Not cached for long. A binned
 * project is a decision waiting to be made and the page it is drawn on is opened deliberately.
 */
export const useBinnedProjects = () =>
  useQuery({
    queryKey: queryKeys.projects.recycleBin,
    queryFn: projectApi.recycleBin,
    staleTime: 15_000,
  });

export const useRestoreProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: projectApi.restore,
    onSuccess: () => {
      // `projects.all` is the shared prefix, so the bin and the live list both
      // refresh — the project just moved from one to the other.
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      // And the same three the bin path drops, in the other direction: the project's tasks and
      // meetings become visible again, and it takes its plan slot back.
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.meetings.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.billing.summary });
      toast.success(translate('toast.projectRestored'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
};

/**
 * Destroy a binned project now. Everything is invalidated rather than patched, for the same reason
 * `useCompleteProject` does it: the rows this removes are spread across the task, note, document.
 */
export const usePurgeProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, password }: { projectId: string; password: string }) =>
      projectApi.purge(projectId, password),
    onSuccess: () => {
      void queryClient.invalidateQueries();
      toast.success(translate('toast.projectPurged'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
};

/**
 * Conclude a project. Everything is invalidated rather than patched, and this is the one place
 * where that bluntness is right: the write deletes every task, page, note, stroke.
 */
export const useCompleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, password }: { projectId: string; password: string }) =>
      projectApi.complete(projectId, password),

    onSuccess: (result) => {
      void queryClient.invalidateQueries();

      // The total, not just the two headline counters: the dialog promised to clear the whole
      // project.
      const items = Object.values(result.cleared).reduce((sum, count) => sum + count, 0);

      toast.success(
        translate('project.finishedToast', {
          items: String(items),
          tasks: String(result.tasksCleared),
          documents: String(result.documentsCleared),
        }),
      );
    },

    onError: (error) => toast.error(errorMessage(error)),
  });
};

/** Put a finished project back into service. Nothing cleared comes back. */
export const useReopenProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => projectApi.reopen(projectId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      toast.success(translate('project.reopenedToast'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
};

/**
 * Pin toggling is optimistic: the star must feel instant, and a rollback on
 * failure is cheap because nothing else depends on the flag.
 */
/**
 * Flips `isPinned` everywhere a project is currently cached. Keyed on the *shape of the query key*
 * rather than on the shape of the data, and that distinction matters.
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
 * Pinning, felt immediately. This used to be a bare mutation whose only cache work was an
 * invalidation on `onSettled`.
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

// The roster and its pending invitations change on human timescales. Both of these back a tab that
// is mounted only while it is open.
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
 * Warm the roster tab while the user is looking at the board. Same reasoning as the chat prefetch:
 * the tab is mounted on click.
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
 * Warms a project the pointer is resting on. Two requests, because opening a project needs both and
 * neither is useful alone: the detail response draws the header and decides the user's role.
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
 * Drops one person from every cached copy of a roster. The roster is held in three shapes — the
 * members query the panel reads, the `roster` array on the project detail.
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
 * Removal, felt on the click rather than on the response. The request behind this is not one write:
 * it deletes the membership, hands back every task the person was assigned and clears their pin.
 */
/**
 * Changing somebody's role on the roster. The endpoint and the API client method have been there
 * all along; nothing called them.
 */
export const useUpdateMemberRole = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: ProjectRole }) =>
      projectApi.updateMemberRole(projectId, memberId, role),

    onMutate: async ({ memberId, role }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.members(projectId) });

      const snapshot = queryClient.getQueriesData({ queryKey: queryKeys.projects.all });

      queryClient.setQueryData<RosterMember[]>(
        queryKeys.projects.members(projectId),
        (members) =>
          Array.isArray(members)
            ? members.map((member) =>
                member.id === memberId ? { ...member, role } : member,
              )
            : members,
      );

      // The project detail carries its own copy of the roster, and the header reads `myRole` from
      // it.
      queryClient.setQueryData<Project>(queryKeys.projects.detail(projectId), (project) =>
        project
          ? {
              ...project,
              roster: project.roster.map((member) =>
                member.id === memberId ? { ...member, role } : member,
              ),
            }
          : project,
      );

      return { snapshot };
    },

    onError: (error, _variables, context) => {
      context?.snapshot.forEach(([key, value]) => queryClient.setQueryData(key, value));
      toast.error(errorMessage(error, translate('toast.rosterRoleFailed')));
    },

    onSuccess: () => toast.success(translate('toast.rosterUpdated')),

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.members(projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
};

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
