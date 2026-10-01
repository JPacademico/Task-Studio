import type { UserSummary } from '@/entities/user/model/types';

/**
 * A named group of people, used to hand out work to all of them at once. A shortcut for a list of
 * names. Not a permission, not a container, and not something work belongs to.
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
