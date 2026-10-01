import { api } from '@/shared/api/client';

export interface ProjectInviteLink {
  url: string;
  token: string;
  expiresAt: string | null;
  useCount: number;
  createdAt: string;
}

/** 1, 7 or 30 days, or null for a link that never expires. */
export type InviteLinkExpiry = 1 | 7 | 30 | null;

export interface InviteLinkPreview {
  project: { id: string; name: string; color: string; bannerUrl: string | null; description: string | null };
  memberCount: number;
  invitedBy: { displayName: string; avatarUrl: string | null };
  expiresAt: string | null;
}

export const inviteLinkApi = {
  async get(projectId: string): Promise<ProjectInviteLink | null> {
    const { data } = await api.get<{ link: ProjectInviteLink | null }>(`/projects/${projectId}/invite-link`);
    return data.link;
  },

  /** Creates the link, or replaces it so the old URL stops working. */
  async rotate(projectId: string, expiresInDays: InviteLinkExpiry): Promise<ProjectInviteLink> {
    const { data } = await api.post<{ link: ProjectInviteLink }>(`/projects/${projectId}/invite-link`, {
      expiresInDays,
    });
    return data.link;
  },

  async revoke(projectId: string): Promise<void> {
    await api.delete(`/projects/${projectId}/invite-link`);
  },

  /** Public: works before the visitor has an account. */
  async preview(token: string): Promise<InviteLinkPreview> {
    const { data } = await api.get<InviteLinkPreview>(`/invite-links/${encodeURIComponent(token)}`);
    return data;
  },

  async join(token: string): Promise<{ projectId: string; alreadyMember: boolean }> {
    const { data } = await api.post<{ projectId: string; alreadyMember: boolean }>(
      `/invite-links/${encodeURIComponent(token)}/join`,
    );
    return data;
  },
};
