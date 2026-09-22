import axios from 'axios';

import { env } from '@/shared/config/env';
import { SLOW_ROUTE_TIMEOUT_MS } from '@/shared/api/client';
import type { Plan, PlanLimits } from '@/entities/billing/model/types';
import type {
  AdminReport,
  AdminSession,
  AdminStats,
  AdminUserPage,
  BanPayload,
  SetPlanPayload,
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

  /**
   * One page of the directory.
   *
   * The API answers with the rows *and* the size of the set they came from,
   * which is the half that makes paging possible at all: a client holding
   * twenty-five rows cannot otherwise tell "that is everybody" from "that is
   * the first twenty-five of two hundred". See `AdminUserPage`.
   */
  async users(
    query: string,
    bannedOnly: boolean,
    plan?: Plan,
    page = 1,
  ): Promise<AdminUserPage> {
    const { data } = await client.get<AdminUserPage>('/users', {
      params: {
        ...(query ? { q: query } : {}),
        ...(bannedOnly ? { bannedOnly: true } : {}),
        // Composes with both of the above on the API rather than replacing
        // them, which is what makes it useful for "the paying accounts among
        // the reported ones".
        ...(plan ? { plan } : {}),
        // Always sent, including for page 1: a param that appears only
        // sometimes is one a proxy or a cache can key on inconsistently.
        page,
      },
    });
    return data;
  },

  /**
   * The plans and their ceilings, for the console's own picker.
   *
   * Deliberately not the public `/billing/plans`. That one is about what can be
   * *bought* and carries prices; this is about what can be *granted*, which
   * includes plans this deployment sells in no currency at all.
   */
  async plans(): Promise<{ plans: { plan: Plan; limits: PlanLimits }[] }> {
    const { data } = await client.get<{ plans: { plan: Plan; limits: PlanLimits }[] }>('/plans');
    return data;
  },

  /**
   * Put an account on a plan by hand.
   *
   * Writes the entitlement and nothing else: no subscription is created, no
   * card is charged, and a live subscription is not cancelled. Where both are
   * wanted, both are done — this, and the matching action in the Stripe
   * dashboard.
   */
  async setPlan(userId: string, payload: SetPlanPayload): Promise<{ plan: Plan }> {
    const { data } = await client.post<{ plan: Plan }>(`/users/${userId}/plan`, payload);
    return data;
  },

  async ban(userId: string, payload: BanPayload): Promise<{ emailed: string }> {
    const { data } = await client.post<{ emailed: string }>(`/users/${userId}/ban`, payload);
    return data;
  },

  /** What people have said about this account, newest first. */
  async reports(userId: string): Promise<AdminReport[]> {
    // Not `/admin/users/...`: `baseURL` already ends in `/admin`, so the prefix
    // written out here produced `/admin/admin/users/...` and a 404 on every
    // attempt to read a report.
    const { data } = await client.get<AdminReport[]>(`/users/${userId}/reports`);
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
    // Same double prefix as `reports` above, and the same fix.
    await client.post(`/users/${userId}/reports/review`);
  },

  async unban(userId: string): Promise<void> {
    await client.post(`/users/${userId}/unban`);
  },
};
