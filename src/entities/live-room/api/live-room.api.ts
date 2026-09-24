import { api } from '@/shared/api/client';
import type {
  CreateLiveRoomPayload,
  GrantLiveRoomPayload,
  IceServerBundle,
  LiveEntitlements,
  LiveRoom,
  UpdateLiveRoomPayload,
} from '../model/types';

/**
 * The rooms, not the calls.
 *
 * Everything that happens *during* a call goes over the socket — signalling,
 * mute state, hands — because it is either per-frame or has to reach seven
 * other browsers in the same instant. What is left here is the part that
 * outlives a call and belongs in a cache.
 */
export const liveRoomApi = {
  async list(projectId: string, includeEnded = false): Promise<LiveRoom[]> {
    const { data } = await api.get<LiveRoom[]>('/live', {
      params: { projectId, ...(includeEnded ? { includeEnded: true } : {}) },
    });
    return data;
  },

  async findOne(roomId: string): Promise<LiveRoom> {
    const { data } = await api.get<LiveRoom>(`/live/${roomId}`);
    return data;
  },

  async create(payload: CreateLiveRoomPayload): Promise<LiveRoom> {
    const { data } = await api.post<LiveRoom>('/live', payload);
    return data;
  },

  async update(roomId: string, payload: UpdateLiveRoomPayload): Promise<LiveRoom> {
    const { data } = await api.patch<LiveRoom>(`/live/${roomId}`, payload);
    return data;
  },

  /** Close the call and keep the record. Not the same thing as `remove`. */
  async end(roomId: string): Promise<LiveRoom> {
    const { data } = await api.post<LiveRoom>(`/live/${roomId}/end`);
    return data;
  },

  async grant(
    roomId: string,
    payload: GrantLiveRoomPayload,
  ): Promise<LiveEntitlements & { userId: string }> {
    const { data } = await api.post<LiveEntitlements & { userId: string }>(
      `/live/${roomId}/grant`,
      payload,
    );
    return data;
  },

  async remove(roomId: string): Promise<void> {
    await api.delete(`/live/${roomId}`);
  },

  /**
   * The STUN (and possibly TURN) servers this deployment offers.
   *
   * Fetched rather than compiled in, because a TURN credential is a credential
   * and TURN relays bandwidth — putting one in the bundle publishes it to
   * everybody who loads the marketing page. See the API's `LiveController.ice`.
   */
  /**
   * The ICE list and its expiry.
   *
   * Returns the whole envelope rather than unwrapping to the array, which it
   * used to do. The expiry is not decoration: a TURN credential is minted per
   * request now and the caller has to know when to ask for another one. See
   * `useIceServers`.
   */
  async iceServers(): Promise<IceServerBundle> {
    const { data } = await api.get<IceServerBundle>('/live/ice');
    return data;
  },
};
