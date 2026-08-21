import type { UserSummary } from '@/entities/user/model/types';

/** Just enough of a project to draw it as a row inside a folder. */
export interface OrganizationProject {
  id: string;
  name: string;
  description: string | null;
  color: string;
  bannerUrl: string | null;
  isArchived: boolean;
  updatedAt: string;
}

/**
 * A folder that groups projects.
 *
 * Deliberately thin: a name, a colour and a list of projects. It holds no
 * content and no roster of its own — everything that can be *done* still
 * happens inside a project, and a project's roster is still the only thing that
 * grants access to anything. See the API's `OrganizationsService` for why there
 * is no second membership system here.
 */
export interface Organization {
  id: string;
  name: string;
  description: string | null;
  color: string;
  createdAt: string;
  updatedAt: string;
  owner: UserSummary;
  /** Only the owner may rename, re-colour, delete or file projects into it. */
  isOwner: boolean;
  /**
   * How many of its projects *this reader* can see, which is not necessarily
   * how many it holds — the API deliberately does not count work you are not
   * on. Same for `projects`.
   */
  projectCount: number;
  projects: OrganizationProject[];
}

/** The folder chip a project's header draws. */
export interface OrganizationRef {
  id: string;
  name: string;
  color: string;
}

/** A project the signed-in user owns and has not filed anywhere yet. */
export interface AttachableProject {
  id: string;
  name: string;
  color: string;
}

export interface CreateOrganizationPayload {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateOrganizationPayload {
  name?: string;
  description?: string;
  color?: string;
}
