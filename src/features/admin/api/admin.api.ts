import axios from 'axios';

import { env } from '@/shared/config/env';
import { SLOW_ROUTE_TIMEOUT_MS } from '@/shared/api/client';
import type {
  AdminReport,
  AdminSession,
  AdminStats,
  AdminUserRow,
  BanPayload,
} from '../model/types';

/**
 * Where the admin token lives, and why it is not in `localStorage`.
 *
 * `sessionStorage` is scoped to the tab and dies with it. An admin sitting is
 * thirty minutes of being able to remove anybody from the product; it has no
 * business surviving a browser restart on a machine somebody walks away from,
 * and the cost of that choice is retyping a password on a tool used a few times
 * a month.
 *
 * It is also a different key and a different storage area from the ordinary
 * session (see `token-store`), so signing out of the app does not touch it and
 * — more importantly — nothing that reads the user's token can pick this up by
 * accident.
 */
const TOKEN_KEY = 'task-studio:admin-token';

export const adminTokenStore = {
  get(): string | null {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      // Private mode, or storage disabled entirely. An admin who cannot keep a
      // token simply signs in again on the next request.
      return null;
    }
  },
  set(token: string): void {
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* nothing to do; the session is held in memory for this page instead */
    }
  },
  clear(): void {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* nothing to do */
    }
  },
};

/**
 * A client of its own, deliberately separate from `api`.
 *
 * The shared instance attaches the *user's* access token to every request and
 * runs a refresh-and-retry interceptor on a 401. Neither is right here: an
 * admin request must carry the admin token and nothing else, and a 401 means
 * "the half-hour sitting has ended, ask for the password again" rather than
 * "renew the session silently". Reusing `api` and stripping both behaviours per
 * call would be a way to get one of them wrong later.
 *
 * The cold-start timeout is borrowed, though — the admin console is exactly the
 * sort of page somebody opens once a month, which is to say always against a
 * sleeping container.
 */
const client = axios.create({
  baseURL: `${env.apiUrl}/admin`,
  timeout: SLOW_ROUTE_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = adminTokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const adminApi = {
  /** Whether the deployment has an admin console at all. Unauthenticated. */
  async status(): Promise<{ enabled: boolean }> {
    const { data } = await client.get<{ enabled: boolean }>('/status');
    return data;
  },

  async signIn(password: string): Promise<AdminSession> {
    const { data } = await client.post<AdminSession>('/session', { password });
    adminTokenStore.set(data.token);
    return data;
  },

  async stats(): Promise<AdminStats> {
    const { data } = await client.get<AdminStats>('/stats');
    return data;
  },

  async users(query: string, bannedOnly: boolean): Promise<AdminUserRow[]> {
    const { data } = await client.get<AdminUserRow[]>('/users', {
      params: { ...(query ? { q: query } : {}), ...(bannedOnly ? { bannedOnly: true } : {}) },
    });
    return data;
  },

  async ban(userId: string, payload: BanPayload): Promise<{ emailed: string }> {
    const { data } = await client.post<{ emailed: string }>(`/users/${userId}/ban`, payload);
    return data;
  },

  /** What people have said about this account, newest first. */
  async reports(userId: string): Promise<AdminReport[]> {
    const { data } = await client.get<AdminReport[]>(`/admin/users/${userId}/reports`);
    return data;
  },

  /**
   * Mark this account's reports as read.
   *
   * Not a delete — the reasons are the record of why somebody was, or
   * deliberately was not, removed from the product. This moves an account out
   * of the queue without destroying that.
   */
  async reviewReports(userId: string): Promise<void> {
    await client.post(`/admin/users/${userId}/reports/review`);
  },

  async unban(userId: string): Promise<void> {
    await client.post(`/users/${userId}/unban`);
  },
};
