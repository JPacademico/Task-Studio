import type { OrganizationRef } from '@/entities/organization/model/types';
import type { UserSummary } from '@/entities/user/model/types';

export type ProjectRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface RosterMember extends UserSummary {
  role: ProjectRole;
  joinedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  bannerUrl: string | null;
  isArchived: boolean;
  /**
   * When the owner concluded it, or `null`.
   *
   * A finished project keeps its name, description, roster and teams and has
   * had every task and page cleared out of it. It is readable but takes no new
   * work; reopening gives back the shell and nothing that was in it. See the
   * API's `ProjectsService.complete`.
   */
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  owner: UserSummary;
  isOwner: boolean;
  /**
   * The folder this project is filed under, if any.
   *
   * Sent to the whole roster, and grants nothing — an organization is a
   * grouping, not a permission. See `entities/organization/model/types`.
   */
  organization: OrganizationRef | null;
  myRole: ProjectRole;
  isPinned: boolean;
  roster: RosterMember[];
}

export interface ProjectListItem extends Project {
  pinOrder: number | null;
  taskCount: number;
  openTaskCount: number;
  overdueTaskCount: number;
  /** Nearest deadline across the roster's open work. */
  nextDueAt: string | null;
  /** Nearest deadline among the caller's own open work. */
  myNextDueAt: string | null;
}

/**
 * What `complete()` actually removed, so the client can say so.
 *
 * Every counter, not just the two the toast names: the dialog promised to
 * clear the whole project, and reporting only tasks and pages would understate
 * what just happened to the whiteboard and the conversation.
 */
export interface ClearedCounts {
  tasks: number;
  documents: number;
  notes: number;
  whiteboardElements: number;
  chatMessages: number;
  meetings: number;
  invitations: number;
  aiSuggestions: number;
}

/**
 * One project in the owner's recycle bin.
 *
 * Not a `Project`. A binned project is not something the app can open — it has
 * no board, no role and no membership to speak of from here — so it is its own
 * shape, carrying only what the bin has to draw: what it was, how much is
 * still inside it, and when the server will destroy it.
 *
 * `purgeAt` comes from the API rather than being computed here. The retention
 * window is the server's rule (`PROJECT_PURGE_AFTER_MS`) and a client doing
 * its own arithmetic is a client that will eventually disagree with the
 * sweeper about which day something disappears.
 */
export interface BinnedProject {
  id: string;
  name: string;
  description: string | null;
  color: string;
  bannerUrl: string | null;
  deletedAt: string;
  /** Set if it had been finished before it was binned. */
  completedAt: string | null;
  organization: OrganizationRef | null;
  purgeAt: string | null;
  counts: {
    tasks: number;
    documents: number;
    notes: number;
    chatMessages: number;
    members: number;
  };
}

export interface ProjectInvitation {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REVOKED';
  role: ProjectRole;
  message: string | null;
  createdAt: string;
  project: { id: string; name: string; color: string; bannerUrl?: string | null };
  invitedBy: UserSummary;
}

export interface PendingInvitation {
  id: string;
  role: ProjectRole;
  createdAt: string;
  recipient: UserSummary;
}

export interface MemberProductivity extends UserSummary {
  assigned: number;
  completed: number;
  completionRate: number;
}

export interface ProjectDashboard {
  projectId: string;
  generatedAt: string;
  totals: {
    tasks: number;
    completed: number;
    inProgress: number;
    todo: number;
    overdue: number;
    dueThisWeek: number;
    completionRate: number;
  };
  byType: Record<'MEGA' | 'MICRO' | 'MULTI' | 'STANDARD', number>;
  members: MemberProductivity[];
  mostProductiveMember: MemberProductivity | null;
  completionTrend: { date: string; completed: number }[];
  upcomingDeadlines: {
    id: string;
    title: string;
    dueAt: string | null;
    color: string;
    assignees: UserSummary[];
  }[];
}

export interface UserOverview {
  openTasks: number;
  completedTasks: number;
  overdueTasks: number;
  projects: number;
  pinnedProjects: number;
  generatedAt: string;
}

/**
 * The three counters a single task write can move, as signed deltas.
 *
 * Only these three: `projects` and `pinnedProjects` change on writes that
 * already refetch the whole overview, and inventing a delta for them would be
 * two more chances to be wrong for no perceptible gain.
 */
export type OverviewDelta = Partial<
  Pick<UserOverview, 'openTasks' | 'completedTasks' | 'overdueTasks'>
>;
