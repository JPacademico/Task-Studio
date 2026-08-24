import { api } from '@/shared/api/client';
import type { CreateTeamPayload, Team, TeamScope, UpdateTeamPayload } from '../model/types';

export const teamApi = {
  /** One organization's teams, or one project's. Exactly one scope. */
  async list(scope: TeamScope): Promise<Team[]> {
    const { data } = await api.get<Team[]>('/teams', { params: scope });
    return data;
  },

  async create(payload: CreateTeamPayload): Promise<Team> {
    const { data } = await api.post<Team>('/teams', payload);
    return data;
  },

  async update(teamId: string, payload: UpdateTeamPayload): Promise<Team> {
    const { data } = await api.patch<Team>(`/teams/${teamId}`, payload);
    return data;
  },

  async remove(teamId: string): Promise<void> {
    await api.delete(`/teams/${teamId}`);
  },
};
