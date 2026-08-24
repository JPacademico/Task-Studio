import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { errorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-keys';
import { translate } from '@/shared/i18n';
import { organizationApi } from '../api/organization.api';
import type {
  OrganizationInviteDraft,
  OrganizationMember,
  OrgRole,
  UpdateOrganizationPayload,
} from './types';

/**
 * How long a cached company stays fresh.
 *
 * A minute. Companies change on human timescales — somebody files a project,
 * invites a colleague, and nothing else happens for a fortnight — and unlike a
 * project board there is no socket room pushing changes in, so this is the only
 * thing keeping the page honest. A shorter window would buy a request every
 * time somebody flicks between tabs and nothing else.
 */
const ORGANIZATIONS_STALE_TIME = 60_000;

/**
 * The metrics board is cheaper to keep and more expensive to compute.
 *
 * Every tile on it is a `groupBy` across every project in the company, so it is
 * the one query here worth holding on to — and the numbers it reports move on
 * the timescale of somebody finishing a task, not of somebody watching. Two
 * minutes, and a manual refresh is a tab switch away.
 */
const DASHBOARD_STALE_TIME = 120_000;

/**
 * Every company this user can see.
 *
 * `enabled` exists for the right rail, which mounts on every page: somebody who
 * has never switched it away from projects should never pay for this request,
 * and somebody who has is on a device that remembers the choice. Defaulted to
 * `true` so the pages that genuinely need it say nothing.
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
 * The company's numbers.
 *
 * `enabled` on the tab being open rather than on the page being mounted: this
 * is the most expensive read in the feature, and most visits to a company page
 * are to its projects board.
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
 * The company's staff list.
 *
 * `enabled` because the endpoint is staff-only: a guest — somebody who reached
 * this company through a project inside it rather than through its staff list —
 * gets a 404 from it, and an unconditional query would spend a request and two
 * retries collecting one on every visit. The caller knows whether the reader is
 * staff; the query should not have to find out the hard way.
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
 * Invitations the company has sent and nobody has answered.
 *
 * Admin-only on the API, so this is asked for only when the caller says it is
 * worth asking — a member opening the staff list would otherwise spend a round
 * trip collecting a 403.
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

/** Company invitations addressed to the signed-in user. */
export const useMyOrganizationInvitations = () =>
  useQuery({
    queryKey: queryKeys.invitations.organizations,
    queryFn: organizationApi.myInvitations,
    staleTime: 30_000,
  });

/**
 * Everything that can change a company invalidates the same things.
 *
 * Organizations are almost never optimistic, and deliberately so: unlike a pin
 * or a Post-it, most of these are not gestures somebody performs mid-flow —
 * they are deliberate, occasional acts on a settings-shaped surface, where a
 * moment of "saving…" is honest rather than sluggish. Writing an optimistic
 * path for each would be several more ways to be wrong about a cache nobody is
 * staring at. The one exception is a role dropdown — see
 * `useUpdateOrganizationMember`.
 *
 * `projects.all` goes with them because filing a project changes what the
 * *project* says about itself — its header draws the company chip.
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

      /*
       * The invitations get their own line, and only when something went
       * wrong with one.
       *
       * A batch that reports "5 invited" on every success is a toast people
       * learn to ignore, at which point the one that says "1 skipped" is
       * ignored too. So the happy path stays silent and the exception speaks.
       */
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
 * Change somebody's role, or retitle them.
 *
 * ## Why a role change is silent, and optimistic
 *
 * Picking a role from a dropdown is not a form somebody submits — the choice
 * *is* the answer, and it is already on screen the moment it is made. Toasting
 * "Member updated" a beat later only tells the user how long the server took,
 * which is the one thing they did not ask. So the row takes the new role
 * immediately and nothing is announced; the write still happens, and if it
 * fails the row goes back to what it was and *that* is announced, because a
 * silent failure is the only outcome worse than a redundant success.
 *
 * The job title keeps its confirmation. That one is typed into a field and
 * committed on blur, so there is a real question — did that save? — and a
 * moment where the answer is not obvious from the screen.
 *
 * This is the one optimistic path in the feature, and the note on
 * `useOrganizationRefresh` explains why the others are not: they are deliberate
 * acts on a settings-shaped surface where "saving…" is honest. A dropdown is
 * not one of those.
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
 * Answering a company invitation.
 *
 * Invalidates the projects list as well as the organizations one: accepting
 * does not put anybody on a project roster, but it does change which companies
 * the sidebar can offer, and that list is drawn from the same fetch as the
 * projects one.
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
