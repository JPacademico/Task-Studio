import { api } from '@/shared/api/client';
import type {
  PendingInvitation,
  Project,
  ProjectDashboard,
  ProjectInvitation,
  ProjectListItem,
  ProjectRole,
  RosterMember,
  UserOverview,
} from '../model/types';

export interface ListProjectsParams {
  includeArchived?: boolean;
  pinnedOnly?: boolean;
  /** `deadline` orders by urgency — what the quick-access rail wants. */
  sort?: 'pinned' | 'deadline';
}

export const projectApi = {
  async list(params: ListProjectsParams = {}): Promise<ProjectListItem[]> {
    const { data } = await api.get<ProjectListItem[]>('/projects', { params });
    return data;
  },

  async detail(projectId: string): Promise<Project> {
    const { data } = await api.get<Project>(`/projects/${projectId}`);
    return data;
  },

  async create(payload: {
    name: string;
    description?: string;
    color?: string;
    /** File it under a company at birth; needs owner or admin there. */
    organizationId?: string;
    /** Organization teams whose people join the roster as MEMBERs. */
    teamIds?: string[];
  }): Promise<Project> {
    const { data } = await api.post<Project>('/projects', payload);
    return data;
  },

  async update(
    projectId: string,
    payload: {
      name?: string;
      description?: string;
      color?: string;
      isArchived?: boolean;
      bannerKey?: string;
    },
  ): Promise<Project> {
    const { data } = await api.patch<Project>(`/projects/${projectId}`, payload);
    return data;
  },

  async remove(projectId: string): Promise<{ message: string }> {
    const { data } = await api.delete<{ message: string }>(`/projects/${projectId}`);
    return data;
  },

  async setPinned(projectId: string, pinned: boolean): Promise<void> {
    if (pinned) await api.put(`/projects/${projectId}/pin`);
    else await api.delete(`/projects/${projectId}/pin`);
  },

  async dashboard(projectId: string): Promise<ProjectDashboard> {
    const { data } = await api.get<ProjectDashboard>(`/projects/${projectId}/dashboard`);
    return data;
  },

  async overview(): Promise<UserOverview> {
    const { data } = await api.get<UserOverview>('/projects/overview');
    return data;
  },

  // --- Roster ---------------------------------------------------------------

  async members(projectId: string): Promise<RosterMember[]> {
    const { data } = await api.get<RosterMember[]>(`/projects/${projectId}/members`);
    return data;
  },

  async invite(
    projectId: string,
    payload: { userId?: string; email?: string; role?: ProjectRole; message?: string },
  ): Promise<ProjectInvitation> {
    const { data } = await api.post<ProjectInvitation>(
      `/projects/${projectId}/invitations`,
      payload,
    );
    return data;
  },

  async pendingInvitations(projectId: string): Promise<PendingInvitation[]> {
    const { data } = await api.get<PendingInvitation[]>(`/projects/${projectId}/invitations`);
    return data;
  },

  async revokeInvitation(projectId: string, invitationId: string): Promise<void> {
    await api.delete(`/projects/${projectId}/invitations/${invitationId}`);
  },

  async updateMemberRole(
    projectId: string,
    memberId: string,
    role: ProjectRole,
  ): Promise<void> {
    await api.patch(`/projects/${projectId}/members/${memberId}`, { role });
  },

  async removeMember(projectId: string, memberId: string): Promise<void> {
    await api.delete(`/projects/${projectId}/members/${memberId}`);
  },

  // --- Invitations addressed to me -----------------------------------------

  async myInvitations(): Promise<ProjectInvitation[]> {
    const { data } = await api.get<ProjectInvitation[]>('/invitations');
    return data;
  },

  async respondToInvitation(invitationId: string, accept: boolean): Promise<void> {
    await api.post(`/invitations/${invitationId}/${accept ? 'accept' : 'decline'}`);
  },
};
