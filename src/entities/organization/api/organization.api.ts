import { api } from '@/shared/api/client';
import type {
  AttachableProject,
  CreatedOrganization,
  CreateOrganizationPayload,
  Organization,
  OrganizationDashboard,
  OrganizationInvitation,
  OrganizationInviteDraft,
  OrganizationMember,
  OrganizationPendingInvitation,
  OrgRole,
  UpdateOrganizationPayload,
} from '../model/types';

export const organizationApi = {
  /** Companies this user is staff of, plus any holding a project they are on. */
  async list(): Promise<Organization[]> {
    const { data } = await api.get<Organization[]>('/organizations');
    return data;
  },

  async detail(organizationId: string): Promise<Organization> {
    const { data } = await api.get<Organization>(`/organizations/${organizationId}`);
    return data;
  },

  /** Project-level metrics for the whole company. Staff only. */
  async dashboard(organizationId: string): Promise<OrganizationDashboard> {
    const { data } = await api.get<OrganizationDashboard>(
      `/organizations/${organizationId}/dashboard`,
    );
    return data;
  },

  /** Projects the user owns and has not filed anywhere yet. */
  async attachable(): Promise<AttachableProject[]> {
    const { data } = await api.get<AttachableProject[]>('/organizations/attachable');
    return data;
  },

  async create(payload: CreateOrganizationPayload): Promise<CreatedOrganization> {
    const { data } = await api.post<CreatedOrganization>('/organizations', payload);
    return data;
  },

  async update(
    organizationId: string,
    payload: UpdateOrganizationPayload,
  ): Promise<Organization> {
    const { data } = await api.patch<Organization>(
      `/organizations/${organizationId}`,
      payload,
    );
    return data;
  },

  async remove(organizationId: string): Promise<{ message: string }> {
    const { data } = await api.delete<{ message: string }>(
      `/organizations/${organizationId}`,
    );
    return data;
  },

  // --- Staff -----------------------------------------------------------------

  async members(organizationId: string): Promise<OrganizationMember[]> {
    const { data } = await api.get<OrganizationMember[]>(
      `/organizations/${organizationId}/members`,
    );
    return data;
  },

  async updateMember(
    organizationId: string,
    memberId: string,
    payload: { role?: OrgRole; jobTitle?: string },
  ): Promise<OrganizationMember> {
    const { data } = await api.patch<OrganizationMember>(
      `/organizations/${organizationId}/members/${memberId}`,
      payload,
    );
    return data;
  },

  async removeMember(organizationId: string, memberId: string): Promise<void> {
    await api.delete(`/organizations/${organizationId}/members/${memberId}`);
  },

  // --- Invitations -----------------------------------------------------------

  async invite(
    organizationId: string,
    payload: OrganizationInviteDraft,
  ): Promise<{ status: string }> {
    const { data } = await api.post<{ status: string }>(
      `/organizations/${organizationId}/invitations`,
      payload,
    );
    return data;
  },

  async pendingInvitations(
    organizationId: string,
  ): Promise<OrganizationPendingInvitation[]> {
    const { data } = await api.get<OrganizationPendingInvitation[]>(
      `/organizations/${organizationId}/invitations`,
    );
    return data;
  },

  async revokeInvitation(organizationId: string, invitationId: string): Promise<void> {
    await api.delete(`/organizations/${organizationId}/invitations/${invitationId}`);
  },

  /**
   * Company invitations addressed to the signed-in user.
   *
   * A different path from `/invitations`, which answers the same question about
   * projects. Two endpoints rather than one merged list because the ids come
   * from two tables and are answered on two routes — see the API's
   * `OrganizationInvitationsController`. The invitations *screen* still shows
   * one list; assembling it is two parallel fetches.
   */
  async myInvitations(): Promise<OrganizationInvitation[]> {
    const { data } = await api.get<OrganizationInvitation[]>('/organization-invitations');
    return data;
  },

  async respondToInvitation(invitationId: string, accept: boolean): Promise<void> {
    await api.post(
      `/organization-invitations/${invitationId}/${accept ? 'accept' : 'decline'}`,
    );
  },

  // --- Filing projects -------------------------------------------------------

  /** `PUT`: filing the same project twice lands it in the same company. */
  async attachProject(organizationId: string, projectId: string): Promise<Organization> {
    const { data } = await api.put<Organization>(
      `/organizations/${organizationId}/projects/${projectId}`,
    );
    return data;
  },

  async detachProject(organizationId: string, projectId: string): Promise<void> {
    await api.delete(`/organizations/${organizationId}/projects/${projectId}`);
  },
};
