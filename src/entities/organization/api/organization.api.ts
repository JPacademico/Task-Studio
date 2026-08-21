import { api } from '@/shared/api/client';
import type {
  AttachableProject,
  CreateOrganizationPayload,
  Organization,
  UpdateOrganizationPayload,
} from '../model/types';

export const organizationApi = {
  /** Folders this user owns, plus any holding a project they are on. */
  async list(): Promise<Organization[]> {
    const { data } = await api.get<Organization[]>('/organizations');
    return data;
  },

  async detail(organizationId: string): Promise<Organization> {
    const { data } = await api.get<Organization>(`/organizations/${organizationId}`);
    return data;
  },

  /** Projects the user owns and has not filed anywhere yet. */
  async attachable(): Promise<AttachableProject[]> {
    const { data } = await api.get<AttachableProject[]>('/organizations/attachable');
    return data;
  },

  async create(payload: CreateOrganizationPayload): Promise<Organization> {
    const { data } = await api.post<Organization>('/organizations', payload);
    return data;
  },

  async update(
    organizationId: string,
    payload: UpdateOrganizationPayload,
  ): Promise<Organization> {
    const { data } = await api.patch<Organization>(
      `/organizations/${organizationId}`,
      payload,
    );
    return data;
  },

  async remove(organizationId: string): Promise<{ message: string }> {
    const { data } = await api.delete<{ message: string }>(
      `/organizations/${organizationId}`,
    );
    return data;
  },

  /** `PUT`: filing the same project twice lands it in the same folder. */
  async attachProject(organizationId: string, projectId: string): Promise<Organization> {
    const { data } = await api.put<Organization>(
      `/organizations/${organizationId}/projects/${projectId}`,
    );
    return data;
  },

  async detachProject(organizationId: string, projectId: string): Promise<void> {
    await api.delete(`/organizations/${organizationId}/projects/${projectId}`);
  },
};
