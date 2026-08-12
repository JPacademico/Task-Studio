import { api } from '@/shared/api/client';

export interface SubtaskSuggestion {
  title: string;
  rationale: string;
  estimatedHours?: number;
}

export interface WorkflowInsight {
  title: string;
  detail: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface AiSuggestion {
  id: string;
  kind: 'SUBTASKS' | 'WORKFLOW' | 'SCHEDULE';
  prompt: string;
  result: {
    suggestions?: SubtaskSuggestion[];
    insights?: WorkflowInsight[];
    nextSteps?: string[];
  };
  model: string;
  accepted: boolean;
  createdAt: string;
  projectId: string | null;
  taskId: string | null;
}

export const aiApi = {
  async status(): Promise<{ enabled: boolean }> {
    const { data } = await api.get<{ enabled: boolean }>('/ai/status');
    return data;
  },

  async suggestSubtasks(taskId: string): Promise<AiSuggestion> {
    const { data } = await api.post<AiSuggestion>(`/ai/tasks/${taskId}/subtasks`);
    return data;
  },

  async analyzeProject(projectId: string): Promise<AiSuggestion> {
    const { data } = await api.post<AiSuggestion>(`/ai/projects/${projectId}/analyze`);
    return data;
  },

  async history(projectId?: string): Promise<AiSuggestion[]> {
    const { data } = await api.get<AiSuggestion[]>('/ai/suggestions', {
      params: projectId ? { projectId } : undefined,
    });
    return data;
  },

  /** Materialises accepted sub-tasks as checklist items on the task. */
  async accept(suggestionId: string, titles?: string[]): Promise<{ added: number }> {
    const { data } = await api.post<{ suggestionId: string; added: number }>(
      `/ai/suggestions/${suggestionId}/accept`,
      { titles },
    );
    return data;
  },
};
