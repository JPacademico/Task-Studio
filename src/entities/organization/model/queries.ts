import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { translate } from '@/shared/i18n';
import { organizationApi } from '../api/organization.api';
import type { UpdateOrganizationPayload } from './types';

/**
 * Folders change on human timescales — somebody creates one, files three
 * projects and does not touch it again for a month. A minute of freshness is
 * generous, and there is no socket traffic for them at all.
 */
const ORGANIZATIONS_STALE_TIME = 60_000;

export const useOrganizations = () =>
  useQuery({
    queryKey: queryKeys.organizations.list,
    queryFn: organizationApi.list,
    staleTime: ORGANIZATIONS_STALE_TIME,
  });

export const useOrganization = (organizationId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.organizations.detail(organizationId ?? ''),
    queryFn: () => organizationApi.detail(organizationId as string),
    enabled: Boolean(organizationId),
    staleTime: ORGANIZATIONS_STALE_TIME,
  });

/**
 * Projects the picker can offer: owned, and not already filed somewhere.
 *
 * Only fetched while a picker is actually open (`enabled`), because it is the
 * one query here that goes stale the instant anybody uses it — filing a project
 * removes it from this list by definition.
 */
export const useAttachableProjects = (enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.organizations.attachable,
    queryFn: organizationApi.attachable,
    enabled,
    staleTime: 30_000,
  });

/**
 * Everything that can change a folder invalidates the same three things.
 *
 * Organizations are not optimistic anywhere, and deliberately so: unlike a pin
 * or a Post-it, none of these are gestures somebody performs in a flow — they
 * are deliberate, occasional acts on a settings-shaped surface, where a moment
 * of "saving…" is honest rather than sluggish. Writing five optimistic paths
 * for that would be five more ways to be wrong about a cache nobody is staring
 * at.
 *
 * `projects.all` goes with them because filing a project changes what the
 * *project* says about itself — its header draws the folder chip.
 */
const useOrganizationRefresh = () => {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
  };
};

export const useCreateOrganization = () => {
  const refresh = useOrganizationRefresh();

  return useMutation({
    mutationFn: organizationApi.create,
    onSuccess: (organization) => {
      refresh();
      toast.success(translate('org.created', { name: organization.name }));
    },
    onError: (error) => toast.error(errorMessage(error, translate('org.createFailed'))),
  });
};

export const useUpdateOrganization = (organizationId: string) => {
  const refresh = useOrganizationRefresh();

  return useMutation({
    mutationFn: (payload: UpdateOrganizationPayload) =>
      organizationApi.update(organizationId, payload),
    onSuccess: () => {
      refresh();
      toast.success(translate('org.updated'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
};

export const useDeleteOrganization = () => {
  const refresh = useOrganizationRefresh();

  return useMutation({
    mutationFn: organizationApi.remove,
    onSuccess: () => {
      refresh();
      toast.success(translate('org.deleted'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
};

export const useAttachProject = (organizationId: string) => {
  const refresh = useOrganizationRefresh();

  return useMutation({
    mutationFn: (projectId: string) =>
      organizationApi.attachProject(organizationId, projectId),
    onSuccess: () => {
      refresh();
      toast.success(translate('org.projectFiled'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
};

export const useDetachProject = (organizationId: string) => {
  const refresh = useOrganizationRefresh();

  return useMutation({
    mutationFn: (projectId: string) =>
      organizationApi.detachProject(organizationId, projectId),
    onSuccess: () => {
      refresh();
      toast.success(translate('org.projectUnfiled'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
};
