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
   * One calendar's live meetings, in clock order.
   *
   * Deliberately unpaged over the wire. The board pages by *day* and searches
   * by name, and both of those are answered instantly from a snapshot the
   * client already holds — a request per day arrow would be a round trip for a
   * filter, on a surface people scrub back and forth through. The server caps
   * the response and offers `from`/`to`/`search` for callers that need them.
   *
   * `params` carries either a `projectId` or an `organizationId`. A company's
   * calendar answers with its own meetings *and* those of every project filed
   * under it, which is why asking for both at once is rejected rather than
   * merged — it would be one question with two overlapping answers.
   */
  async list(params: ListMeetingsParams): Promise<Meeting[]> {
    const { data } = await api.get<Meeting[]>('/meetings', { params });
    return data;
  },

  /**
   * Everything one person is expected at, across every project they are on.
   *
   * Each row carries its own `project`, because this is the one meetings
   * surface where "which project is this?" is a real question.
   */
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
 * The rooms a calendar can book.
 *
 * A separate object rather than four more methods on `meetingApi`, because
 * they answer a different question with a different lifetime: the calendar is
 * refetched constantly and rooms change a few times a year. Keeping them apart
 * is what lets the picker hold a room list for an hour while the meetings under
 * it stay a minute fresh.
 *
 * Asking for a *project's* rooms answers with the project's own **plus** every
 * room its company holds — the inheritance is resolved by the server on read,
 * so a project filed under a company gains the building immediately and loses
 * it again if it is unfiled. See the API's `MeetingRoomsService`.
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
