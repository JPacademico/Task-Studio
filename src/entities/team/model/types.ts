import type { UserSummary } from '@/entities/user/model/types';

/**
 * A named group of people, used to hand out work to all of them at once.
 *
 * ## What a team is, and what it is not
 *
 * A shortcut for a list of names. Not a permission, not a container, and not
 * something work belongs to. Picking an organization team when creating a
 * project puts its people on that project's roster — as individuals, then and
 * there — and the team is never consulted again. Picking a project team on a
 * task expands to that task's assignees the same way.
 *
 * That matters for a reason worth stating: it means "who is on this task" stays
 * a fact about the task. The alternative — storing the team and resolving it on
 * read — would make somebody who joins the team next week retroactively
 * responsible for work allocated before they arrived. See the API's
 * `TeamsService`.
 *
 * ## Two altitudes, and they do not mix
 *
 * An **organization** team is drawn from the company's staff, and is offered
 * when creating a project or booking a meeting. A **project** team is drawn
 * from that project's roster, and is offered when creating a task. Exactly one
 * of `organizationId` / `projectId` is set, and neither kind can be used in the
 * other's place.
 */
export interface Team {
  id: string;
  name: string;
  description: string | null;
  color: string;
  /** Exactly one of these two is set. */
  organizationId: string | null;
  projectId: string | null;
  members: UserSummary[];
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Which roster a team is drawn from — and therefore where it may be used. */
export type TeamScope =
  | { organizationId: string; projectId?: undefined }
  | { projectId: string; organizationId?: undefined };

export interface CreateTeamPayload {
  name: string;
  description?: string;
  color?: string;
  organizationId?: string;
  projectId?: string;
  memberIds?: string[];
}

export interface UpdateTeamPayload {
  name?: string;
  /** `''` clears it. */
  description?: string;
  color?: string;
  /** Sent in full when present: the list replaces, it does not merge. */
  memberIds?: string[];
}
