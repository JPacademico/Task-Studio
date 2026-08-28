import { api } from '@/shared/api/client';
import type {
  CreatedWebhook,
  ProjectWebhook,
  WebhookEvent,
  WebhookPayloadDraft,
  WebhookTestResult,
} from '../model/types';

/**
 * Where a project posts its events.
 *
 * Under `/projects/:id/webhooks` rather than under `/integrations`, because
 * the thing being configured is the *project* — its events, its admins, its
 * settings — and only the delivery is an integration. Everything under
 * `/integrations` is scoped to a person and needs no project at all, which is
 * a different shape of authorisation entirely.
 */
export const webhooksApi = {
  /** The catalogue a composer offers, and whether the deployment allows any. */
  async catalogue(projectId: string): Promise<{ events: WebhookEvent[]; available: boolean }> {
    const { data } = await api.get<{ events: WebhookEvent[]; available: boolean }>(
      `/projects/${projectId}/webhooks/events`,
    );
    return data;
  },

  async list(projectId: string): Promise<ProjectWebhook[]> {
    const { data } = await api.get<ProjectWebhook[]>(`/projects/${projectId}/webhooks`);
    return data;
  },

  /**
   * Register one. The response carries the signing secret, once.
   *
   * There is deliberately no endpoint that returns it again — it is stored
   * encrypted rather than hashed because signing needs it back, but that is a
   * reason to keep it, not a reason to hand it out twice.
   */
  async create(projectId: string, payload: WebhookPayloadDraft): Promise<CreatedWebhook> {
    const { data } = await api.post<CreatedWebhook>(`/projects/${projectId}/webhooks`, payload);
    return data;
  },

  async update(
    projectId: string,
    webhookId: string,
    payload: Partial<WebhookPayloadDraft> & { isEnabled?: boolean },
  ): Promise<ProjectWebhook> {
    const { data } = await api.patch<ProjectWebhook>(
      `/projects/${projectId}/webhooks/${webhookId}`,
      payload,
    );
    return data;
  },

  async remove(projectId: string, webhookId: string): Promise<void> {
    await api.delete(`/projects/${projectId}/webhooks/${webhookId}`);
  },

  /**
   * Post a sample event now.
   *
   * On a longer timeout than the default: it makes a real outbound request and
   * waits for the answer, which is the entire point — the alternative is a
   * button whose result you have to go and look for in a list.
   */
  async test(projectId: string, webhookId: string): Promise<WebhookTestResult> {
    const { data } = await api.post<WebhookTestResult>(
      `/projects/${projectId}/webhooks/${webhookId}/test`,
      {},
      { timeout: 40_000 },
    );
    return data;
  },
};
