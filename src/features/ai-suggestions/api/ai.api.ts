import { api, SLOW_ROUTE_TIMEOUT_MS } from '@/shared/api/client';
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
  /**
   * The proposed schedule, as offsets rather than dates. The API turns these into real timestamps
   * when the suggestion is accepted — see `scheduleFor`.
   */
  startOffsetDays?: number;
  durationHours?: number;
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

/**
 * What is left of this month's assistant allowance. Null when the deployment has no model at all —
 * there is nothing to meter.
 */
export interface AiAllowance {
  used: number;
  /** Null is unmetered. */
  limit: number | null;
  remaining: number | null;
  /** ISO. Midnight UTC on the first of next month. */
  resetsAt: string;
}

export interface AiStatus {
  enabled: boolean;
  allowance: AiAllowance | null;
}

export const aiApi = {
  /**
   * Whether the assistant works here, and how much of it this reader has left. The allowance rides
   * on the status call rather than a route of its own.
   */
  async status(): Promise<AiStatus> {
    const { data } = await api.get<AiStatus>('/ai/status');
    return data;
  },

  // The two generation routes carry their own ceiling. Everything else in the app answers from
  // Postgres and has no business taking twenty seconds; these two wait on a language model.

  /**
   * 1-3 steps for one task, read from its own title, description and type. These two came back for
   * the note checklist.
   */
  async suggestSubtasks(taskId: string): Promise<AiSuggestion> {
    const { data } = await api.post<AiSuggestion>(
      `/ai/tasks/${taskId}/subtasks`,
      undefined,
      { timeout: SLOW_ROUTE_TIMEOUT_MS },
    );
    return data;
  },

  /**
   * The same 1-3 steps, for a task that has not been saved yet. No `taskId`, because there is no
   * task: this is the composer asking while somebody is still typing.
   */
  async suggestDraftSubtasks(draft: {
    title: string;
    description: string;
  }): Promise<AiSuggestion> {
    const { data } = await api.post<AiSuggestion>('/ai/tasks/draft-subtasks', draft, {
      timeout: SLOW_ROUTE_TIMEOUT_MS,
    });
    return data;
  },

  /**
   * Files accepted steps onto the task's note checklist, as Post-its. `titles` omitted means "all
   * of them".
   */
  async acceptSubtasks(
    suggestionId: string,
    titles?: string[],
  ): Promise<{ suggestionId: string; added: number }> {
    const { data } = await api.post<{ suggestionId: string; added: number }>(
      `/ai/suggestions/${suggestionId}/accept`,
      { titles },
    );
    return data;
  },

  /**
   * Starts a generation and returns its receipt. Answers in milliseconds — the work happens on the
   * server and reports back over the socket.
   */
  /**
   * `guidance` is an optional note steering *what* is proposed. Sent as typed and cleaned on the
   * API — see `prepareGuidance` there.
   */
  async startProjectTasks(
    projectId: string,
    guidance?: string,
  ): Promise<{ jobId: string; alreadyRunning: boolean }> {
    const { data } = await api.post<{ jobId: string; alreadyRunning: boolean }>(
      `/ai/projects/${projectId}/tasks/stream`,
      { ...(guidance ? { guidance } : {}) },
    );
    return data;
  },

  /** 1-3 candidate tasks for a project, from its description and board. */
  async suggestProjectTasks(projectId: string, guidance?: string): Promise<AiSuggestion> {
    const { data } = await api.post<AiSuggestion>(
      `/ai/projects/${projectId}/tasks`,
      { ...(guidance ? { guidance } : {}) },
      { timeout: SLOW_ROUTE_TIMEOUT_MS },
    );
    return data;
  },

  async history(projectId?: string): Promise<AiSuggestion[]> {
    const { data } = await api.get<AiSuggestion[]>('/ai/suggestions', {
      params: projectId ? { projectId } : undefined,
    });
    return data;
  },

  /**
   * Materialises accepted proposals as real tasks on the board. Returns the created rows so the
   * caller can put them straight into the task caches.
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
