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
   * The proposed schedule, as offsets rather than dates.
   *
   * The API turns these into real timestamps when the suggestion is accepted —
   * see `scheduleFor` — so a proposal read today and accepted tomorrow is
   * scheduled from tomorrow rather than from a moment that has passed. Optional
   * because a suggestion generated before this existed has neither.
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

export const aiApi = {
  async status(): Promise<{ enabled: boolean }> {
    const { data } = await api.get<{ enabled: boolean }>('/ai/status');
    return data;
  },

  /*
   * The two generation routes carry their own ceiling.
   *
   * Everything else in the app answers from Postgres and has no business
   * taking twenty seconds; these two wait on a language model, on a free tier,
   * behind a container that may itself be starting up. Sharing the default
   * meant a healthy-but-slow generation was reported to the user as the server
   * being unreachable — while the server went on producing an answer that had
   * nowhere to go. See `SLOW_ROUTE_TIMEOUT_MS`.
   */

  /*
   * There is no `suggestSubtasks` / `accept` pair here any more.
   *
   * They drove the "Suggest steps" button on the task sheet, which is gone —
   * the project's assistant tab does the same job with the whole board in view,
   * and one entry point to the model is enough. The API still exposes
   * `POST /ai/tasks/:id/subtasks` and `POST /ai/suggestions/:id/accept`; only
   * the client's callers went away.
   */

  /**
   * Starts a generation and returns its receipt.
   *
   * Answers in milliseconds — the work happens on the server and reports back
   * over the socket — so this one deliberately does *not* get the long
   * `SLOW_ROUTE_TIMEOUT_MS` ceiling. If registering a job takes twenty seconds,
   * something is wrong and waiting longer will not fix it.
   *
   * `alreadyRunning` means a job for this project was in flight and this call
   * joined it rather than starting a second paid generation.
   */
  async startProjectTasks(projectId: string): Promise<{ jobId: string; alreadyRunning: boolean }> {
    const { data } = await api.post<{ jobId: string; alreadyRunning: boolean }>(
      `/ai/projects/${projectId}/tasks/stream`,
    );
    return data;
  },

  /** 1-3 candidate tasks for a project, from its description and board. */
  async suggestProjectTasks(projectId: string): Promise<AiSuggestion> {
    const { data } = await api.post<AiSuggestion>(
      `/ai/projects/${projectId}/tasks`,
      undefined,
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
