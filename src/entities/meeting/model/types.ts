import type { AttachedFile, UserSummary } from '@/entities/user/model/types';

/** A scheduled gathering on a calendar — a project's, a company's, or both. */
export interface Meeting {
  id: string;
  title: string;
  description: string | null;
  /** A room name, a floor, a video-call label — wherever it happens. */
  room: string;
  /**
   * The registered room behind that name, or `null` for one typed by hand. Both spellings are live
   * and neither is going away.
   */
  roomId: string | null;
  startAt: string;
  endAt: string;
  /**
   * Set once the meeting is signed off, at which point it leaves the board. Present on the type
   * rather than filtered out of existence.
   */
  completedAt: string | null;

  /**
   * The project whose board this sits on, or `null`. Nullable since organizations grew calendars of
   * their own. A meeting belongs to a project, to a company, or to both — never to neither.
   */
  projectId: string | null;
  /**
   * The company this was posted *at*, or `null`. Deliberately not "the company this project belongs
   * to".
   */
  organizationId: string | null;

  /**
   * Which project this belongs to, spelled out. Sent on every read now, including a project's own
   * board where it is the same name on every row — the board simply ignores it.
   */
  project: MeetingProjectRef | null;
  /** Which company posted it, for a calendar that mixes several sources. */
  organization: MeetingProjectRef | null;

  /**
   * The paper the meeting is about: an agenda, a deck, a contract. Minutes written *after* the fact
   * still live on the text board, where they can be edited by whoever was in the room.
   */
  file: AttachedFile | null;

  createdBy: UserSummary;
  participants: UserSummary[];
  createdAt: string;
  updatedAt: string;
}

/** Just enough of a project or a company to label and colour an agenda row. */
export interface MeetingProjectRef {
  id: string;
  name: string;
  color: string;
}

export interface CreateMeetingPayload {
  /**
   * At least one of these, and both is the interesting case. Sending both is how a company books a
   * meeting *about* one of its projects.
   */
  projectId?: string;
  organizationId?: string;
  title: string;
  /** Where it happens, as text. Required unless `roomId` says which room. */
  room?: string;
  /** A registered room to book. Refused when that room is already taken. */
  roomId?: string;
  startAt: string;
  endAt: string;
  description?: string;
  participantIds?: string[];
  /**
   * Teams to invite wholesale, merged into `participantIds` by the API. A company meeting draws on
   * the company's teams; a project meeting on that project's.
   */
  teamIds?: string[];
  /** The uploaded document to pin to it — key, filename and size. */
  file?: { key: string; name: string; size: number };
}

export interface UpdateMeetingPayload {
  title?: string;
  room?: string;
  /** An id books a room, `null` gives it back, absent changes nothing. */
  roomId?: string | null;
  startAt?: string;
  endAt?: string;
  description?: string;
  participantIds?: string[];
  teamIds?: string[];
  /** An object attaches or replaces, `null` detaches, absent leaves it alone. */
  file?: { key: string; name: string; size: number } | null;
  isCompleted?: boolean;
}

export interface ListMeetingsParams {
  /** Exactly one of the two: a calendar is a project's or a company's. */
  projectId?: string;
  organizationId?: string;
  search?: string;
  from?: string;
  to?: string;
  includeCompleted?: boolean;
}

/**
 * The personal agenda's query. `projectId` is optional here and required above, which is the whole
 * difference between the two surfaces: a board is scoped to one project.
 */
export interface AgendaParams {
  projectId?: string;
  search?: string;
  from?: string;
  to?: string;
  includeCompleted?: boolean;
}

/** A room somebody can actually book. */
export interface MeetingRoom {
  id: string;
  name: string;
  /** "3rd floor, east wing", or a video-call link. Uninterpreted. */
  location: string | null;
  /** Advisory. Nothing refuses a booking for exceeding it. */
  capacity: number | null;
  /** Retired: off the picker, and out of the clash check. */
  isArchived: boolean;
  projectId: string | null;
  organizationId: string | null;
  scope: 'project' | 'organization';
  /** Borrowed from the company this project is filed under, so read-only here. */
  isInherited: boolean;
  createdAt: string;
}

export interface RoomScope {
  projectId?: string;
  organizationId?: string;
}

export interface CreateMeetingRoomPayload extends RoomScope {
  name: string;
  location?: string;
  capacity?: number;
}

export interface UpdateMeetingRoomPayload {
  name?: string;
  location?: string | null;
  capacity?: number | null;
  isArchived?: boolean;
}
