import { api } from '@/shared/api/client';
import type {
  AgendaParams,
  CreateMeetingPayload,
  CreateMeetingRoomPayload,
  ListMeetingsParams,
  Meeting,
  MeetingRoom,
  RoomScope,
  UpdateMeetingPayload,
  UpdateMeetingRoomPayload,
} from '../model/types';

export const meetingApi = {
  /**
   * One calendar's live meetings, in clock order. Deliberately unpaged over the wire. The board
   * pages by *day* and searches by name.
   */
  async list(params: ListMeetingsParams): Promise<Meeting[]> {
    const { data } = await api.get<Meeting[]>('/meetings', { params });
    return data;
  },

  /** Everything one person is expected at, across every project they are on. */
  async agenda(params: AgendaParams = {}): Promise<Meeting[]> {
    const { data } = await api.get<Meeting[]>('/meetings/agenda', { params });
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

/**
 * The rooms a calendar can book. A separate object rather than four more methods on `meetingApi`,
 * because they answer a different question with a different lifetime.
 */
export const meetingRoomApi = {
  async list(scope: RoomScope): Promise<MeetingRoom[]> {
    const { data } = await api.get<MeetingRoom[]>('/meetings/rooms', { params: scope });
    return data;
  },

  async create(payload: CreateMeetingRoomPayload): Promise<MeetingRoom> {
    const { data } = await api.post<MeetingRoom>('/meetings/rooms', payload);
    return data;
  },

  async update(roomId: string, payload: UpdateMeetingRoomPayload): Promise<MeetingRoom> {
    const { data } = await api.patch<MeetingRoom>(`/meetings/rooms/${roomId}`, payload);
    return data;
  },

  async remove(roomId: string): Promise<void> {
    await api.delete(`/meetings/rooms/${roomId}`);
  },
};
