import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/shared/lib/toast';

import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { translate } from '@/shared/i18n';
import { organizationApi } from '../api/organization.api';
import type { Project, ProjectListItem } from '@/entities/project/model/types';
import type {
  Organization,
  OrganizationInviteDraft,
  OrganizationMember,
  OrgRole,
  UpdateOrganizationPayload,
} from './types';

/**
 * How long a cached company stays fresh. A minute. Companies change on human timescales — somebody
 * files a project, invites a colleague, and nothing else happens for a fortnight.
 */
const ORGANIZATIONS_STALE_TIME = 60_000;

/**
 * The metrics board is cheaper to keep and more expensive to compute. Every tile on it is a
 * `groupBy` across every project in the company.
 */
const DASHBOARD_STALE_TIME = 120_000;

/**
 * Every company this user can see. `enabled` exists for the right rail, which mounts on every page:
 * somebody who has never switched it away from projects should never pay for this request.
 */
export const useOrganizations = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.organizations.list,
    queryFn: organizationApi.list,
    enabled,
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
 * The company's numbers. `enabled` on the tab being open rather than on the page being mounted:
 * this is the most expensive read in the feature.
 */
export const useOrganizationDashboard = (
  organizationId: string | undefined,
  enabled = true,
) =>
  useQuery({
    queryKey: queryKeys.organizations.dashboard(organizationId ?? ''),
    queryFn: () => organizationApi.dashboard(organizationId as string),
    enabled: Boolean(organizationId) && enabled,
    staleTime: DASHBOARD_STALE_TIME,
  });

/**
 * The company's staff list. `enabled` because the endpoint is staff-only: a guest — somebody who
 * reached this company through a project inside it rather than through its staff list.
 */
export const useOrganizationMembers = (
  organizationId: string | undefined,
  enabled = true,
) =>
  useQuery({
    queryKey: queryKeys.organizations.members(organizationId ?? ''),
    queryFn: () => organizationApi.members(organizationId as string),
    enabled: Boolean(organizationId) && enabled,
    staleTime: ORGANIZATIONS_STALE_TIME,
  });

/**
 * Invitations the company has sent and nobody has answered. Admin-only on the API, so this is asked
 * for only when the caller says it is worth asking.
 */
export const useOrganizationInvitations = (
  organizationId: string | undefined,
  enabled: boolean,
) =>
  useQuery({
    queryKey: queryKeys.organizations.invitations(organizationId ?? ''),
    queryFn: () => organizationApi.pendingInvitations(organizationId as string),
    enabled: Boolean(organizationId) && enabled,
    staleTime: 30_000,
  });

/**
 * Projects the picker can offer: owned, and not already filed somewhere. Only fetched while a
 * picker is actually open (`enabled`).
 */
export const useAttachableProjects = (enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.organizations.attachable,
    queryFn: organizationApi.attachable,
    enabled,
    staleTime: 30_000,
  });

/** Company invitations addressed to the signed-in user. */
export const useMyOrganizationInvitations = () =>
  useQuery({
    queryKey: queryKeys.invitations.organizations,
    queryFn: organizationApi.myInvitations,
    staleTime: 30_000,
  });

/**
 * Everything that can change a company invalidates the same things. Organizations are almost never
 * optimistic.
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

      // The invitations get their own line, and only when something went wrong with one. A batch
      // that reports "5 invited" on every success is a toast people learn to ignore.
      const skipped = organization.invitations.filter(
        (outcome) => outcome.status !== 'invited',
      );
      if (skipped.length > 0) {
        toast.warning(
          translate('org.invitesSkipped', {
            count: skipped.length,
            names: skipped
              .map((outcome) => outcome.email ?? outcome.displayName ?? '?')
              .join(', '),
          }),
        );
      }
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

/**
 * Destroy a company. Every other mutation here invalidates the whole `organizations` prefix, which
 * is right when the company still exists: the list, the detail.
 */
export const useDeleteOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: organizationApi.remove,
    onSuccess: (_result, organizationId) => {
      queryClient.removeQueries({ queryKey: queryKeys.organizations.detail(organizationId) });
      // The prefix is safe here only because the removal above ran first — it has no detail,
      // members, invitations or dashboard entries left to ask the server about.
      void queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
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

/** Take a project out of a company, without waiting to be told it worked. */
export const useDetachProject = (organizationId: string) => {
  const queryClient = useQueryClient();
  const refresh = useOrganizationRefresh();

  return useMutation({
    mutationFn: (projectId: string) =>
      organizationApi.detachProject(organizationId, projectId),

    onMutate: async (projectId: string) => {
      /*
       * In-flight reads are cancelled first, or one of them lands after this
       * write and puts the project straight back on the board.
       */
      await Promise.all([
        queryClient.cancelQueries({ queryKey: queryKeys.organizations.all }),
        queryClient.cancelQueries({ queryKey: queryKeys.projects.all }),
      ]);

      const previous = [
        ...queryClient.getQueriesData({ queryKey: queryKeys.organizations.all }),
        ...queryClient.getQueriesData({ queryKey: queryKeys.projects.all }),
      ];

      // The company's copies: drop the project from whatever list holds it.
      for (const [key, data] of queryClient.getQueriesData({
        queryKey: queryKeys.organizations.all,
      })) {
        if (!data) continue;

        if (Array.isArray(data)) {
          queryClient.setQueryData(
            key,
            (data as Organization[]).map((organization) =>
              organization.id === organizationId
                ? {
                    ...organization,
                    projects: organization.projects?.filter(
                      (project) => project.id !== projectId,
                    ),
                  }
                : organization,
            ),
          );
          continue;
        }

        const organization = data as Organization;
        if (organization.id !== organizationId || !organization.projects) continue;

        queryClient.setQueryData(key, {
          ...organization,
          projects: organization.projects.filter((project) => project.id !== projectId),
        });
      }

      // The project's own copies: the header chip has to go with it.
      for (const [key, data] of queryClient.getQueriesData({
        queryKey: queryKeys.projects.all,
      })) {
        if (!data) continue;

        if (Array.isArray(data)) {
          const list = data as ProjectListItem[];
          if (!list.some((project) => project.id === projectId)) continue;

          queryClient.setQueryData(
            key,
            list.map((project) =>
              project.id === projectId ? { ...project, organization: null } : project,
            ),
          );
          continue;
        }

        const project = data as Project;
        if (project?.id !== projectId) continue;
        queryClient.setQueryData(key, { ...project, organization: null });
      }

      // The toast fires here rather than in `onSuccess`, which is the point of the whole exercise:
      // the user is told the thing they can already see has happened.
      toast.success(translate('org.projectUnfiled'));

      return { previous };
    },

    onError: (error, _projectId, context) => {
      // Every snapshot put back exactly as it was, then the real message.
      for (const [key, data] of context?.previous ?? []) {
        queryClient.setQueryData(key, data);
      }
      toast.error(errorMessage(error));
    },

    // Success or failure, the server is now the authority again.
    onSettled: () => refresh(),
  });
};

// --- Staff -------------------------------------------------------------------

export const useInviteToOrganization = (organizationId: string) => {
  const refresh = useOrganizationRefresh();

  return useMutation({
    mutationFn: (draft: OrganizationInviteDraft) =>
      organizationApi.invite(organizationId, draft),
    onSuccess: () => {
      refresh();
      toast.success(translate('org.inviteSent'));
    },
    onError: (error) => toast.error(errorMessage(error, translate('org.inviteFailed'))),
  });
};

export const useRevokeOrganizationInvitation = (organizationId: string) => {
  const refresh = useOrganizationRefresh();

  return useMutation({
    mutationFn: (invitationId: string) =>
      organizationApi.revokeInvitation(organizationId, invitationId),
    onSuccess: () => {
      refresh();
      toast.success(translate('org.inviteRevoked'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
};

/**
 * Change somebody's role, or retitle them. Picking a role from a dropdown is not a form somebody
 * submits — the choice *is* the answer, and it is already on screen the moment it is made.
 */
export const useUpdateOrganizationMember = (organizationId: string) => {
  const queryClient = useQueryClient();
  const refresh = useOrganizationRefresh();
  const membersKey = queryKeys.organizations.members(organizationId);

  return useMutation({
    mutationFn: ({
      memberId,
      ...payload
    }: {
      memberId: string;
      role?: OrgRole;
      jobTitle?: string;
    }) => organizationApi.updateMember(organizationId, memberId, payload),

    onMutate: async ({ memberId, role }) => {
      if (!role) return { previous: undefined };

      // An in-flight refetch that resolves after this would overwrite the row
      // with the role the server has not been told about yet.
      await queryClient.cancelQueries({ queryKey: membersKey });
      const previous = queryClient.getQueryData<OrganizationMember[]>(membersKey);

      queryClient.setQueryData<OrganizationMember[]>(membersKey, (members) =>
        members?.map((member) => (member.id === memberId ? { ...member, role } : member)),
      );

      return { previous };
    },

    onSuccess: (_result, { role }) => {
      refresh();
      if (!role) toast.success(translate('org.memberUpdated'));
    },

    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(membersKey, context.previous);
      toast.error(errorMessage(error));
    },
  });
};

export const useRemoveOrganizationMember = (organizationId: string) => {
  const refresh = useOrganizationRefresh();

  return useMutation({
    mutationFn: (memberId: string) =>
      organizationApi.removeMember(organizationId, memberId),
    onSuccess: () => {
      refresh();
      toast.success(translate('org.memberRemoved'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
};

/**
 * Answering a company invitation. Invalidates the projects list as well as the organizations one:
 * accepting does not put anybody on a project roster, but it does change.
 */
export const useRespondToOrganizationInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ invitationId, accept }: { invitationId: string; accept: boolean }) =>
      organizationApi.respondToInvitation(invitationId, accept),
    onSuccess: (_result, { accept }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.invitations.organizations });
      void queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
      toast.success(translate(accept ? 'org.inviteAccepted' : 'org.inviteDeclined'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
};
