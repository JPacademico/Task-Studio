import { api } from '@/shared/api/client';
import type { Task, TaskPriority } from '@/entities/task/model/types';

/** One step proposed for a task's checklist. */
export interface SubtaskSuggestion {
  title: string;
  rationale: string;
}

/** One whole task proposed for a project's board. */
export interface ProjectTaskSuggestion {
  title: string;
  description: string;
  rationale: string;
  priority: TaskPriority;
}

export interface AiSuggestion {
  id: string;
  kind: 'SUBTASKS' | 'PROJECT_TASKS';
  prompt: string;
  result: {
    suggestions?: SubtaskSuggestion[];
    tasks?: ProjectTaskSuggestion[];
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

  /** 1-3 steps for one task, from its title, description and type. */
  async suggestSubtasks(taskId: string): Promise<AiSuggestion> {
    const { data } = await api.post<AiSuggestion>(`/ai/tasks/${taskId}/subtasks`);
    return data;
  },

  /** 1-3 candidate tasks for a project, from its description and board. */
  async suggestProjectTasks(projectId: string): Promise<AiSuggestion> {
    const { data } = await api.post<AiSuggestion>(`/ai/projects/${projectId}/tasks`);
    return data;
  },

  async history(projectId?: string): Promise<AiSuggestion[]> {
    const { data } = await api.get<AiSuggestion[]>('/ai/suggestions', {
      params: projectId ? { projectId } : undefined,
    });
    return data;
  },

  /** Materialises accepted steps as checklist items on the task. */
  async accept(suggestionId: string, titles?: string[]): Promise<{ added: number }> {
    const { data } = await api.post<{ suggestionId: string; added: number }>(
      `/ai/suggestions/${suggestionId}/accept`,
      { titles },
    );
    return data;
  },

  /**
   * Materialises accepted proposals as real tasks on the board.
   *
   * Returns the created rows so the caller can put them straight into the task
   * caches — accepting is the one moment the board is guaranteed to be looking.
   */
  async acceptTasks(
    suggestionId: string,
    titles?: string[],
  ): Promise<{ created: number; tasks: Task[] }> {
    const { data } = await api.post<{ suggestionId: string; created: number; tasks: Task[] }>(
      `/ai/suggestions/${suggestionId}/accept-tasks`,
      { titles },
    );
    return data;
  },
};
