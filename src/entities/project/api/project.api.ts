import { api } from '@/shared/api/client';
import type {
  BinnedProject,
  ClearedCounts,
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

  /**
   * Conclude a project: it keeps its record, and loses everything in it.
   *
   * "Everything" is literal — tasks, pages, notes, whiteboard, chat, meetings,
   * pending invitations and the banner. What survives is the name, the
   * description, the colour, the roster and the teams.
   *
   * The password is re-confirmed by the API against the account's own hash —
   * it is never stored, compared or even held on this side. See the note on
   * `CompleteProjectDto`.
   */
  async complete(
    projectId: string,
    password: string,
  ): Promise<{ tasksCleared: number; documentsCleared: number; cleared: ClearedCounts }> {
    const { data } = await api.post<{
      tasksCleared: number;
      documentsCleared: number;
      cleared: ClearedCounts;
    }>(`/projects/${projectId}/complete`, { password });
    return data;
  },

  /** Put a finished project back into service. Nothing cleared comes back. */
  async reopen(projectId: string): Promise<Project> {
    const { data } = await api.post<Project>(`/projects/${projectId}/reopen`);
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
    /**
     * Named company staff who join the roster as MEMBERs.
     *
     * The other half of `teamIds`, and the more common one — most projects
     * start with three or four specific people. Added, not invited: somebody
     * already inside the company has a relationship with the creator that a
     * stranger reached through `POST /projects/:id/invitations` does not.
     */
    memberIds?: string[];
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

  async remove(projectId: string): Promise<{ message: string; purgeAt: string }> {
    const { data } = await api.delete<{ message: string; purgeAt: string }>(
      `/projects/${projectId}`,
    );
    return data;
  },

  // --- Recycle bin ----------------------------------------------------------

  /** Binned projects, with what each still holds and when it expires. */
  async recycleBin(): Promise<BinnedProject[]> {
    const { data } = await api.get<BinnedProject[]>('/projects/recycle-bin');
    return data;
  },

  async restore(projectId: string): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>(`/projects/${projectId}/restore`);
    return data;
  },

  /**
   * Destroy a binned project now, rather than waiting out its thirty days.
   *
   * `POST` with a body, not `DELETE` with a query string: this carries a
   * password, and a password in a URL ends up in browser history and every
   * proxy log along the way.
   */
  async purge(projectId: string, password: string): Promise<{ filesDeleted: number }> {
    const { data } = await api.post<{ filesDeleted: number }>(
      `/projects/${projectId}/purge`,
      { password },
    );
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
