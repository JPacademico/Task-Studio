import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { projectApi, type ListProjectsParams } from '../api/project.api';
import type { OverviewDelta, ProjectRole, UserOverview } from './types';

export const useProjects = (params: ListProjectsParams = {}) =>
  useQuery({
    queryKey: queryKeys.projects.list(params),
    queryFn: () => projectApi.list(params),
    staleTime: 30_000,
  });

export const useProject = (projectId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.projects.detail(projectId ?? ''),
    queryFn: () => projectApi.detail(projectId as string),
    enabled: Boolean(projectId),
  });

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
    onError: (error) => toast.error(errorMessage(error, 'Could not create the project.')),
  });
};

export const useUpdateProject = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Parameters<typeof projectApi.update>[1]) =>
      projectApi.update(projectId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      toast.success('Project updated.');
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
      toast.success('Project moved to the recycle bin.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
};

/**
 * Pin toggling is optimistic: the star must feel instant, and a rollback on
 * failure is cheap because nothing else depends on the flag.
 */
export const useTogglePin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, pinned }: { projectId: string; pinned: boolean }) =>
      projectApi.setPinned(projectId, pinned),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
    onError: (error) => toast.error(errorMessage(error, 'Could not update the pin.')),
  });
};

export const useRoster = (projectId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.projects.members(projectId ?? ''),
    queryFn: () => projectApi.members(projectId as string),
    enabled: Boolean(projectId),
  });

export const usePendingInvitations = (projectId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.projects.invitations(projectId ?? ''),
    queryFn: () => projectApi.pendingInvitations(projectId as string),
    enabled: Boolean(projectId),
  });

export const useInviteMember = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { userId?: string; email?: string; role?: ProjectRole }) =>
      projectApi.invite(projectId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.invitations(projectId) });
      toast.success('Invitation sent.');
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not send the invitation.')),
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
      toast.success(variables.accept ? 'You joined the project.' : 'Invitation declined.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
};

export const useRemoveMember = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) => projectApi.removeMember(projectId, memberId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.members(projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      toast.success('Roster updated.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
};
