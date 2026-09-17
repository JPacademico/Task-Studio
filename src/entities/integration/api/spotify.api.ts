import { api } from '@/shared/api/client';
import type {
  SpotifyPlayback,
  SpotifySearchResults,
  SpotifyStatus,
  SpotifyTransport,
} from '../model/types';

/**
 * The remote control, as HTTP.
 *
 * Every call here is scoped to the signed-in person by the API — there is no
 * user id in any of these paths, and that is deliberate on both sides. The
 * thing being controlled is an account somebody is listening to at this moment;
 * a route that took an id would be one URL away from letting a colleague pause
 * it.
 */
export const spotifyApi = {
  /** Whether the deployment offers this, and what this person has connected. */
  async status(): Promise<SpotifyStatus> {
    const { data } = await api.get<SpotifyStatus>('/integrations/spotify/status');
    return data;
  },

  /**
   * Where to send the browser to grant access.
   *
   * The API answers with a URL rather than redirecting, and the caller does
   * `window.location.assign` with it — a 302 inside an XHR is followed by the
   * browser and lands the consent page in a response body nobody can interact
   * with. Same shape as the calendar's, for the same reason.
   */
  async connectUrl(): Promise<string> {
    const { data } = await api.get<{ url: string }>('/integrations/spotify/connect');
    return data.url;
  },

  async disconnect(): Promise<void> {
    await api.delete('/integrations/spotify');
  },

  /** Keep the grant, hide the player. */
  async setEnabled(isEnabled: boolean): Promise<void> {
    await api.patch('/integrations/spotify', { isEnabled });
  },

  /** What is playing right now, across every device on the account. */
  async playback(): Promise<SpotifyPlayback> {
    const { data } = await api.get<SpotifyPlayback>('/integrations/spotify/playback');
    return data;
  },

  async command(action: SpotifyTransport): Promise<void> {
    await api.post('/integrations/spotify/command', { action });
  },

  async setVolume(volume: number): Promise<void> {
    await api.post('/integrations/spotify/volume', { volume });
  },

  /** Up to three tracks and three artists. The cap is the API's. */
  async search(q: string): Promise<SpotifySearchResults> {
    const { data } = await api.get<SpotifySearchResults>('/integrations/spotify/search', {
      params: { q },
    });
    return data;
  },

  async play(trackId: string): Promise<void> {
    await api.post('/integrations/spotify/play', { trackId });
  },
};
