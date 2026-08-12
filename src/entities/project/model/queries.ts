import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { projectApi, type ListProjectsParams } from '../api/project.api';
import type { ProjectRole } from './types';

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
