import { api } from '@/shared/api/client';
import type { ApiToken, CreatedApiToken } from '../model/types';

/**
 * Personal access tokens, for everything that is not a browser. Under `/auth` rather than
 * `/integrations`.
 */
export const tokensApi = {
  async list(): Promise<ApiToken[]> {
    const { data } = await api.get<ApiToken[]>('/auth/tokens');
    return data;
  },

  /** Mint one. The response carries its value, once and never again. */
  async create(payload: { name: string; expiresInDays?: number }): Promise<CreatedApiToken> {
    const { data } = await api.post<CreatedApiToken>('/auth/tokens', payload);
    return data;
  },

  async revoke(tokenId: string): Promise<void> {
    await api.delete(`/auth/tokens/${tokenId}`);
  },
};
