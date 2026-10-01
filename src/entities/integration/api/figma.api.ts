import { api } from '@/shared/api/client';
import type { ProjectFigma } from '@/entities/project/model/types';

/** What an admin fills in to connect a project to a design file. */
export interface ConnectFigmaPayload {
  url: string;
  /**
   * A Figma personal access token with read access to files. Sent once, never read back: no route
   * on the API answers with it, and the project shape has no field for it.
   */
  token: string;
}

export const figmaApi = {
  /**
   * Whether this deployment offers Figma at all. Deployment-level rather than per project, because
   * the answer is: the integration keeps a credential, so it needs the key that encrypts one.
   */
  async status(): Promise<{ available: boolean }> {
    const { data } = await api.get<{ available: boolean }>('/integrations/figma/status');
    return data;
  },

  /** Point a project at a file, with a credential that can read it. */
  async connect(projectId: string, payload: ConnectFigmaPayload): Promise<ProjectFigma> {
    const { data } = await api.post<ProjectFigma>(
      `/integrations/figma/projects/${projectId}/connection`,
      payload,
    );
    return data;
  },

  async disconnect(projectId: string): Promise<void> {
    await api.delete(`/integrations/figma/projects/${projectId}/connection`);
  },
};
