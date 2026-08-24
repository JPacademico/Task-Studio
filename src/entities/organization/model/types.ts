import type { UserSummary } from '@/entities/user/model/types';

/**
 * The ladder inside a company, which is not the ladder inside a project.
 *
 * Deliberately a separate type from `ProjectRole` even though the three values
 * are spelled the same, mirroring the API's two enums: an organization ADMIN
 * may file projects and invite colleagues, and that says nothing at all about
 * what they may do inside any particular project.
 */
export type OrgRole = 'OWNER' | 'ADMIN' | 'MEMBER';

/** One project, as a card on the company's board. */
export interface OrganizationProject {
  id: string;
  name: string;
  description: string | null;
  color: string;
  bannerUrl: string | null;
  isArchived: boolean;
  /** Set once the owner concluded it — see `Project.completedAt`. */
  completedAt: string | null;
  updatedAt: string;
  ownerId: string;
  /**
   * Whether this reader is on the project's roster.
   *
   * The board shows staff every project the company runs, which means some of
   * these cards lead to a page that will refuse them. The card says so rather
   * than offering a link that dead-ends in a 404 — seeing a project exist and
   * being able to open it are two different permissions, and the interface has
   * to be honest about which one you have.
   */
  hasAccess: boolean;
}

/**
 * A company: its people, and the projects they run.
 *
 * This used to be a folder — a name, a colour and a list of projects, with no
 * roster of its own. It now has staff, invitations, a banner, a calendar and a
 * metrics board, because what it is asked to model is a company rather than a
 * shelf.
 *
 * What did **not** change is what it grants. Membership here lets you see the
 * company — its projects board, its numbers, its calendar, its staff list — and
 * nothing inside any of those projects. Opening one still requires being on its
 * roster, and that invitation still comes from the project. See the API's
 * `OrganizationsService` for why keeping those two questions apart is what
 * makes a second membership system safe.
 */
export interface Organization {
  id: string;
  name: string;
  description: string | null;
  color: string;
  /** The letterhead across the top of the organization page. */
  bannerUrl: string | null;
  createdAt: string;
  updatedAt: string;
  owner: UserSummary;

  /**
   * `null` for a reader who is not staff.
   *
   * An organization used to be visible to anybody on the roster of a project
   * inside it, and those people can still find it — but they are guests, not
   * employees. Every write refuses them, and the page shows them the company
   * without the controls. Spelled as `null` rather than folded into MEMBER so
   * that distinction cannot quietly stop being drawn.
   */
  myRole: OrgRole | null;
  isOwner: boolean;
  /** Admin or owner: may file projects, invite people and edit the company. */
  canManage: boolean;

  /** The real headcount. A staff list is the company saying how big it is. */
  memberCount: number;
  /**
   * How many projects are in `projects`, which for a guest is not how many the
   * company has — the API does not list work they have no connection to.
   */
  projectCount: number;
  projects: OrganizationProject[];
}

/** The company chip a project's header draws. */
export interface OrganizationRef {
  id: string;
  name: string;
  color: string;
}

/** One person on the staff list. */
export interface OrganizationMember extends UserSummary {
  role: OrgRole;
  /** Free text — "Head of Delivery", "Contractor". Never interpreted. */
  jobTitle: string | null;
  joinedAt: string;
}

/** An invitation this company has sent and nobody has answered yet. */
export interface OrganizationPendingInvitation {
  id: string;
  role: OrgRole;
  message: string | null;
  createdAt: string;
  recipient: UserSummary;
}

/** An invitation addressed to the signed-in user. */
export interface OrganizationInvitation {
  id: string;
  role: OrgRole;
  message: string | null;
  createdAt: string;
  organization: { id: string; name: string; color: string; bannerUrl: string | null };
  invitedBy: UserSummary;
}

/** A project the signed-in user owns and has not filed anywhere yet. */
export interface AttachableProject {
  id: string;
  name: string;
  color: string;
}

/**
 * One person to invite, as the composer collects them.
 *
 * `userId` when they were picked from a list the client already had, `email`
 * when the address was typed. Never both, and the API needs at least one.
 */
export interface OrganizationInviteDraft {
  userId?: string;
  email?: string;
  role?: OrgRole;
  jobTitle?: string;
  message?: string;
}

/**
 * What became of one invitation in a batch.
 *
 * Reported per person rather than as one "done", because a create dialog that
 * quietly drops a mistyped address is one where somebody discovers a week later
 * that they were never invited.
 */
export interface InviteOutcome {
  email: string | null;
  displayName: string | null;
  status: 'invited' | 'already-member' | 'not-found' | 'failed';
}

export interface CreateOrganizationPayload {
  name: string;
  description?: string;
  color?: string;
  /** Projects to file immediately. The caller must own every one of them. */
  projectIds?: string[];
  invites?: OrganizationInviteDraft[];
}

/** The create response is an organization plus the report on its invitations. */
export interface CreatedOrganization extends Organization {
  invitations: InviteOutcome[];
}

export interface UpdateOrganizationPayload {
  name?: string;
  description?: string;
  color?: string;
  /** `''` takes the banner down; the two always move together. */
  bannerKey?: string;
  bannerUrl?: string;
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

/**
 * One project's headline numbers, as the company's board reads them.
 *
 * The unit is a project rather than a task, and that is the whole difference
 * between this and a project dashboard: the reader is not doing the work, and
 * the question is "which of these needs me".
 */
export interface OrganizationProjectMetrics {
  id: string;
  name: string;
  color: string;
  isArchived: boolean;
  tasks: number;
  completed: number;
  open: number;
  overdue: number;
  dueThisWeek: number;
  completionRate: number;
  memberCount: number;
  nextDueAt: string | null;
}

export interface OrganizationDashboard {
  organizationId: string;
  generatedAt: string;
  totals: {
    projects: number;
    activeProjects: number;
    archivedProjects: number;
    members: number;
    tasks: number;
    completed: number;
    overdue: number;
    dueThisWeek: number;
    completionRate: number;
    upcomingMeetings: number;
  };
  projects: OrganizationProjectMetrics[];
  /** `null` until somebody has finished something. */
  busiestProject: OrganizationProjectMetrics | null;
  /** `null` when nothing is overdue, which is the answer worth having. */
  mostAtRiskProject: OrganizationProjectMetrics | null;
  completionTrend: { date: string; completed: number }[];
  upcomingDeadlines: {
    id: string;
    title: string;
    dueAt: string | null;
    color: string;
    project: { id: string; name: string; color: string };
  }[];
}
