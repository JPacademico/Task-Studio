import type { UserSummary } from '@/entities/user/model/types';

/**
 * A scheduled gathering on a calendar — a project's, a company's, or both.
 *
 * Posted and edited by the owner or admins of whichever thing it hangs from — a
 * meeting is an assertion about other people's time — while everybody who can
 * see that calendar reads it.
 *
 * `participants` is advisory rather than a permission: it says who is expected
 * in the room, not who may see the entry. An empty list reads as "everybody who
 * can see this", which is what most meetings on a small team actually are.
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

  /**
   * The project whose board this sits on, or `null`.
   *
   * Nullable since organizations grew calendars of their own. A meeting belongs
   * to a project, to a company, or to both — never to neither.
   */
  projectId: string | null;
  /**
   * The company this was posted *at*, or `null`.
   *
   * Deliberately not "the company this project belongs to". A meeting booked on
   * a project that happens to be filed under a company leaves this null and
   * still appears on that company's calendar — the API finds it by joining
   * through the project, so that filing or unfiling a project moves its
   * meetings with it instead of stranding them. See the API's `MeetingsService`.
   *
   * What this being set *does* mean: somebody booked this on the company's own
   * calendar, and if `projectId` is also set they deliberately put it on both.
   */
  organizationId: string | null;

  /**
   * Which project this belongs to, spelled out.
   *
   * Sent on every read now, including a project's own board where it is the
   * same name on every row — the board simply ignores it. The alternative was a
   * second response shape that omits it, which is one more thing to keep in
   * step every time a meeting grows a field.
   */
  project: MeetingProjectRef | null;
  /** Which company posted it, for a calendar that mixes several sources. */
  organization: MeetingProjectRef | null;

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
   * At least one of these, and both is the interesting case.
   *
   * Sending both is how a company books a meeting *about* one of its projects:
   * it lands on the company's calendar and on that project's board, because it
   * genuinely belongs to both audiences. The API refuses the pair unless the
   * project really is filed under that company.
   */
  projectId?: string;
  organizationId?: string;
  title: string;
  room: string;
  startAt: string;
  endAt: string;
  description?: string;
  participantIds?: string[];
  /**
   * Teams to invite wholesale, merged into `participantIds` by the API.
   *
   * A company meeting draws on the company's teams; a project meeting on that
   * project's. Expanded when the meeting is posted rather than stored, so the
   * guest list stays a fact about this meeting — see the API's `TeamsService`.
   */
  teamIds?: string[];
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
  /** Exactly one of the two: a calendar is a project's or a company's. */
  projectId?: string;
  organizationId?: string;
  search?: string;
  from?: string;
  to?: string;
  includeCompleted?: boolean;
}

/**
 * The personal agenda's query.
 *
 * `projectId` is optional here and required above, which is the whole
 * difference between the two surfaces: a board is scoped to one project, an
 * agenda is scoped to a person and merely *filtered* by project.
 */
export interface AgendaParams {
  projectId?: string;
  search?: string;
  from?: string;
  to?: string;
  includeCompleted?: boolean;
}
