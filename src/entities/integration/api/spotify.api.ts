import { api } from '@/shared/api/client';
import type {
  SpotifyPlayback,
  SpotifySearchResults,
  SpotifyStatus,
  SpotifyTransport,
} from '../model/types';

/**
 * The remote control, as HTTP. Every call here is scoped to the signed-in person by the API — there
 * is no user id in any of these paths, and that is deliberate on both sides.
 */
export const spotifyApi = {
  /** Whether the deployment offers this, and what this person has connected. */
  async status(): Promise<SpotifyStatus> {
    const { data } = await api.get<SpotifyStatus>('/integrations/spotify/status');
    return data;
  },

  /**
   * Where to send the browser to grant access. The API answers with a URL rather than redirecting.
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

  /** The same track, next in line instead of now. */
  async queue(trackId: string): Promise<void> {
    await api.post('/integrations/spotify/queue', { trackId });
  },
};
