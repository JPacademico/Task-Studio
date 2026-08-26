import { api } from '@/shared/api/client';
import type {
  CreateTaskGroupPayload,
  TaskGroup,
  TaskGroupBoard,
  UpdateTaskGroupPayload,
} from '../model/types';

const base = (projectId: string) => `/projects/${projectId}/task-groups`;

export const taskGroupApi = {
  /**
   * The columns alone — what the composer's tag picker needs.
   *
   * Separate from `board` because the two have completely different costs: this
   * is a dozen short rows read whenever somebody opens the composer, and the
   * board is every task on the project.
   */
  async list(projectId: string): Promise<TaskGroup[]> {
    const { data } = await api.get<TaskGroup[]>(base(projectId));
    return data;
  },

  async board(projectId: string): Promise<TaskGroupBoard> {
    const { data } = await api.get<TaskGroupBoard>(`${base(projectId)}/board`);
    return data;
  },

  async create(projectId: string, payload: CreateTaskGroupPayload): Promise<TaskGroup> {
    const { data } = await api.post<TaskGroup>(base(projectId), payload);
    return data;
  },

  async update(
    projectId: string,
    groupId: string,
    payload: UpdateTaskGroupPayload,
  ): Promise<TaskGroup> {
    const { data } = await api.patch<TaskGroup>(`${base(projectId)}/${groupId}`, payload);
    return data;
  },

  /** The column goes; its tasks are untagged, not deleted. */
  async remove(projectId: string, groupId: string): Promise<{ untagged: number }> {
    const { data } = await api.delete<{ untagged: number }>(`${base(projectId)}/${groupId}`);
    return data;
  },

  /** The whole order, not a diff — see `ReorderTaskGroupsDto`. */
  async reorder(projectId: string, orderedIds: string[]): Promise<void> {
    await api.put(`${base(projectId)}/reorder`, { orderedIds });
  },
};
