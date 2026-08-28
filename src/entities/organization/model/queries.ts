import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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

/**
 * Destroy a company.
 *
 * ## Why this does not simply `refresh()`
 *
 * Every other mutation here invalidates the whole `organizations` prefix,
 * which is right when the company still exists: the list, the detail, the
 * staff and the metrics all want re-reading. After a *delete* it is the worst
 * possible thing to do. `organizations.detail(id)` is `['organizations', id]`
 * and the members, invitations and dashboard queries all nest under it — so
 * invalidating the prefix refetches four endpoints for a company the server
 * has just destroyed. All four 404, and because each carries its own
 * `onError` toast, deleting one organization put four red toasts on screen.
 * That is what the user was seeing, and it happened *because* they were still
 * on the company's page with those queries mounted.
 *
 * So the deleted company's subtree is **removed** rather than invalidated —
 * `removeQueries` drops the cache entries and cancels their observers instead
 * of asking again — and only the list and the projects (which carry an
 * `organization` ref that is now stale) are invalidated.
 *
 * Navigating away is the caller's job, not this hook's: it is a mutation, it
 * has no idea which route is mounted, and a hook that redirected would also
 * redirect the organizations index where the dialog is opened from a card.
 * See `handleDelete` in `OrganizationDialog`.
 */
export const useDeleteOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: organizationApi.remove,
    onSuccess: (_result, organizationId) => {
      queryClient.removeQueries({ queryKey: queryKeys.organizations.detail(organizationId) });
      // The prefix is safe here only because the removal above ran first — it
      // has no detail, members, invitations or dashboard entries left to ask
      // the server about. Projects carry an `organization` ref that is now
      // stale, so they are refreshed too.
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

/**
 * Take a project out of a company, without waiting to be told it worked.
 *
 * ## Why this one is optimistic and `useAttachProject` is not
 *
 * Because of what each can fail on. Filing a project is a *claim* — it needs
 * admin rights on the company and ownership of the project, and the server is
 * the only thing that knows whether the caller has both, so showing it as done
 * before the answer arrives is showing something that may well be refused.
 * Unfiling is a withdrawal: either party may do it, the caller is one of them
 * by construction (they are looking at a control that is only drawn for
 * somebody entitled to press it), and the API's own rule says as much. A
 * refusal here means something has changed underneath the page, which is
 * exactly the case a rollback is for.
 *
 * And the wait was the whole complaint. On a free-tier API that has gone to
 * sleep, "remove from organization" sat on a spinner for the length of a cold
 * boot before the card moved — for a change that is a single nullable column.
 *
 * ## What is rewritten, and why both halves
 *
 * Two caches show this fact from opposite directions and both have to move
 * together, or the app contradicts itself for the length of a round trip:
 *
 *   - the **company**, which lists the project on its board, and
 *   - the **project**, whose header draws a chip naming the company.
 *
 * Every cached copy of either is patched — the detail, the lists, the seeded
 * placeholder copies — by walking the two key prefixes rather than guessing
 * which queries happen to be mounted.
 */
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

      /*
       * The toast fires here rather than in `onSuccess`, which is the point of
       * the whole exercise: the user is told the thing they can already see has
       * happened. `onError` corrects it if the server disagrees.
       */
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
