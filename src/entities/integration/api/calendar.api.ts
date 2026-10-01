import { api } from '@/shared/api/client';
import type {
  CalendarConnection,
  CalendarFeedSecret,
  CalendarFeedStatus,
  CalendarSettingsPayload,
  CalendarStatus,
  CalendarSyncResult,
} from '../model/types';

export const calendarApi = {
  /** Whether the deployment offers this, and what this person has connected. */
  async status(): Promise<CalendarStatus> {
    const { data } = await api.get<CalendarStatus>('/integrations/calendar/status');
    return data;
  },

  /**
   * Where to send the browser to grant access. The API answers with a URL rather than redirecting,
   * and the caller does `window.location.assign` with it.
   */
  async connectUrl(): Promise<string> {
    const { data } = await api.get<{ url: string }>('/integrations/calendar/google/connect');
    return data.url;
  },

  async updateSettings(payload: CalendarSettingsPayload): Promise<CalendarConnection> {
    const { data } = await api.patch<CalendarConnection>(
      '/integrations/calendar/google',
      payload,
    );
    return data;
  },

  /**
   * Pull now, rather than waiting for the quarter-hourly sweep. Genuinely slow — a pull *and* a
   * backfill against Google — so it takes the cold ceiling rather than the warm one.
   */
  async syncNow(): Promise<CalendarSyncResult> {
    const { data } = await api.post<CalendarSyncResult>(
      '/integrations/calendar/google/sync',
      {},
      { timeout: 60_000 },
    );
    return data;
  },

  /**
   * Disconnect, and by default remove the calendar this app created in Google. `keepRemote` is on
   * the query string rather than in a body.
   */
  async disconnect(keepRemote = false): Promise<{ disconnected: boolean }> {
    const { data } = await api.delete<{ disconnected: boolean }>(
      '/integrations/calendar/google',
      { params: keepRemote ? { keepRemote: true } : undefined },
    );
    return data;
  },

  // --- The subscribable feed ------------------------------------------------

  /** Whether a feed exists, and whether anything has ever fetched it. */
  async feedStatus(): Promise<CalendarFeedStatus> {
    const { data } = await api.get<CalendarFeedStatus>('/integrations/calendar/feed');
    return data;
  },

  /**
   * Mint a feed URL, replacing any existing one. The value comes back exactly once. There is no
   * endpoint that returns it again — only its hash is stored.
   */
  async issueFeed(): Promise<CalendarFeedSecret> {
    const { data } = await api.post<CalendarFeedSecret>('/integrations/calendar/feed');
    return data;
  },

  async revokeFeed(): Promise<{ revoked: boolean }> {
    const { data } = await api.delete<{ revoked: boolean }>('/integrations/calendar/feed');
    return data;
  },
};
