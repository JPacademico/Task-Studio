import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/shared/lib/toast';

import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { translate } from '@/shared/i18n';
import { inviteLinkApi, type InviteLinkExpiry } from '../api/invite-link.api';

export const useProjectInviteLink = (projectId: string, enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.projects.inviteLink(projectId),
    queryFn: () => inviteLinkApi.get(projectId),
    enabled,
    staleTime: 60_000,
  });

export const useRotateInviteLink = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (expiresInDays: InviteLinkExpiry) => inviteLinkApi.rotate(projectId, expiresInDays),
    onSuccess: (link) => queryClient.setQueryData(queryKeys.projects.inviteLink(projectId), link),
    onError: (error) => toast.error(errorMessage(error, translate('inviteLink.failed'))),
  });
};

export const useRevokeInviteLink = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => inviteLinkApi.revoke(projectId),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.projects.inviteLink(projectId), null);
      toast.success(translate('inviteLink.revoked'));
    },
    onError: (error) => toast.error(errorMessage(error, translate('inviteLink.failed'))),
  });
};

export const useInviteLinkPreview = (token: string) =>
  useQuery({
    queryKey: queryKeys.inviteLinks.preview(token),
    queryFn: () => inviteLinkApi.preview(token),
    enabled: Boolean(token),
    retry: false,
    staleTime: 60_000,
  });
