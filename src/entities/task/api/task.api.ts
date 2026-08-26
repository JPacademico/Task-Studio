import { api } from '@/shared/api/client';
import type {
  CreateTaskPayload,
  ListTasksParams,
  Task,
  TaskAgenda,
  TaskStatus,
  UpdateTaskPayload,
} from '../model/types';

export const taskApi = {
  async list(params: ListTasksParams = {}): Promise<Task[]> {
    const { data } = await api.get<Task[]>('/tasks', { params });
    return data;
  },

  /** Chronological buckets for the task menu. */
  async agenda(params: ListTasksParams = {}): Promise<TaskAgenda> {
    const { data } = await api.get<TaskAgenda>('/tasks/agenda', { params });
    return data;
  },

  async detail(taskId: string): Promise<Task> {
    const { data } = await api.get<Task>(`/tasks/${taskId}`);
    return data;
  },

  async create(payload: CreateTaskPayload): Promise<Task> {
    const { data } = await api.post<Task>('/tasks', payload);
    return data;
  },

  async update(taskId: string, payload: UpdateTaskPayload): Promise<Task> {
    const { data } = await api.patch<Task>(`/tasks/${taskId}`, payload);
    return data;
  },

  async updateStatus(taskId: string, status: TaskStatus): Promise<Task> {
    const { data } = await api.patch<Task>(`/tasks/${taskId}/status`, { status });
    return data;
  },

  /** Per-assignee completion — the MultiTask case. */
  async setMyCompletion(taskId: string, completed: boolean): Promise<Task> {
    const { data } = await api.patch<Task>(`/tasks/${taskId}/completion`, { completed });
    return data;
  },

  async setPinned(taskId: string, pinned: boolean): Promise<void> {
    if (pinned) await api.put(`/tasks/${taskId}/pin`);
    else await api.delete(`/tasks/${taskId}/pin`);
  },

  /** Soft delete → recycle bin. */
  async remove(taskId: string): Promise<void> {
    await api.delete(`/tasks/${taskId}`);
  },

  async restore(taskId: string): Promise<Task> {
    const { data } = await api.post<Task>(`/tasks/${taskId}/restore`);
    return data;
  },

  async purge(taskId: string): Promise<void> {
    await api.delete(`/tasks/${taskId}/purge`);
  },

  async recycleBin(projectId?: string): Promise<Task[]> {
    const { data } = await api.get<Task[]>('/tasks/recycle-bin', {
      params: projectId ? { projectId } : undefined,
    });
    return data;
  },
};
