import { api } from '@/shared/api/client';
import type {
  CreateMeetingPayload,
  ListMeetingsParams,
  Meeting,
  UpdateMeetingPayload,
} from '../model/types';

export const meetingApi = {
  /**
   * One project's live meetings, in clock order.
   *
   * Deliberately unpaged over the wire. The board pages by *day* and searches
   * by name, and both of those are answered instantly from a snapshot the
   * client already holds — a request per day arrow would be a round trip for a
   * filter, on a surface people scrub back and forth through. The server caps
   * the response and offers `from`/`to`/`search` for callers that need them.
   */
  async list(params: ListMeetingsParams): Promise<Meeting[]> {
    const { data } = await api.get<Meeting[]>('/meetings', { params });
    return data;
  },

  async create(payload: CreateMeetingPayload): Promise<Meeting> {
    const { data } = await api.post<Meeting>('/meetings', payload);
    return data;
  },

  async update(meetingId: string, payload: UpdateMeetingPayload): Promise<Meeting> {
    const { data } = await api.patch<Meeting>(`/meetings/${meetingId}`, payload);
    return data;
  },

  async remove(meetingId: string): Promise<void> {
    await api.delete(`/meetings/${meetingId}`);
  },
};
