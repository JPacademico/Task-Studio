import type { UserSummary } from '@/entities/user/model/types';

/**
 * A scheduled gathering on a project's calendar.
 *
 * Posted and edited by the project's owner or admins only — a meeting is an
 * assertion about other people's time — while everybody on the roster reads it.
 *
 * `participants` is advisory rather than a permission: it says who is expected
 * in the room, not who may see the entry. An empty list reads as "the whole
 * roster", which is what most meetings on a small team actually are.
 */
export interface Meeting {
  id: string;
  title: string;
  description: string | null;
  /** A room name, a floor, a video-call label — wherever it happens. */
  room: string;
  startAt: string;
  endAt: string;
  /**
   * Set once the meeting is signed off, at which point it leaves the board.
   *
   * Present on the type rather than filtered out of existence because a
   * completed meeting is still the anchor of whatever minutes were written
   * against it — see `MeetingRef` on a document.
   */
  completedAt: string | null;
  projectId: string;
  createdBy: UserSummary;
  participants: UserSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateMeetingPayload {
  projectId: string;
  title: string;
  room: string;
  startAt: string;
  endAt: string;
  description?: string;
  participantIds?: string[];
}

export interface UpdateMeetingPayload {
  title?: string;
  room?: string;
  startAt?: string;
  endAt?: string;
  description?: string;
  participantIds?: string[];
  isCompleted?: boolean;
}

export interface ListMeetingsParams {
  projectId: string;
  search?: string;
  from?: string;
  to?: string;
  includeCompleted?: boolean;
}
