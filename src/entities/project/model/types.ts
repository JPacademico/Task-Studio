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
   * When the owner concluded it, or `null`. A finished project keeps its name, description, roster
   * and teams and has had every task and page cleared out of it.
   */
  completedAt: string | null;
  /**
   * The window the project is *aimed* at, as opposed to `completedAt`, which is when it actually
   * ended. Both optional and independent.
   */
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
  owner: UserSummary;
  isOwner: boolean;
  /**
   * The folder this project is filed under, if any. Sent to the whole roster, and grants nothing —
   * an organization is a grouping, not a permission.
   */
  organization: OrganizationRef | null;
  /**
   * The GitHub repository this project stands for, if one is linked. Set by an import at creation
   * time, and settable afterwards by an owner or admin.
   */
  repository: ProjectRepository | null;
  /**
   * The Figma file this project designs against, if one is connected. Beside `repository` and
   * shaped the same way.
   */
  figma: ProjectFigma | null;
  myRole: ProjectRole;
  isPinned: boolean;
  roster: RosterMember[];
}

/**
 * The Figma file a project designs against. Never carries the credential: the API's own shape has
 * no field for it, and the query behind it does not select the column.
 */
export interface ProjectFigma {
  /** The key in a Figma URL. Every API path is built from it. */
  fileKey: string;
  /** What the file is called in Figma, as of the last sync. */
  fileName: string;
  url: string;
  lastSyncedAt: string | null;
  connectedBy: { id: string; displayName: string };
}

export interface ProjectRepository {
  /** `owner/name`, canonical — GitHub follows renames and this is where it landed. */
  fullName: string;
  url: string;
  defaultBranch: string | null;
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
 * What `complete()` actually removed, so the client can say so. Every counter, not just the two the
 * toast names: the dialog promised to clear the whole project.
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
 * One project in the owner's recycle bin. Not a `Project`. A binned project is not something the
 * app can open — it has no board, no role and no membership to speak of from here.
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
  /** Completions per calendar month, oldest first, `YYYY-MM`, no gaps. */
  completionByMonth: { month: string; completed: number }[];
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
 * The three counters a single task write can move, as signed deltas. Only these three: `projects`
 * and `pinnedProjects` change on writes that already refetch the whole overview.
 */
export type OverviewDelta = Partial<
  Pick<UserOverview, 'openTasks' | 'completedTasks' | 'overdueTasks'>
>;
