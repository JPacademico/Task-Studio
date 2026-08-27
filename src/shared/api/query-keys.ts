import type { ListTasksParams } from '@/entities/task/model/types';

/**
 * Central query-key registry. Invalidation is the most bug-prone part of a
 * cache, so the keys live in one file instead of being spelled out inline.
 */
export const queryKeys = {
  session: ['session'] as const,

  projects: {
    all: ['projects'] as const,
    list: (params?: object) => ['projects', 'list', params ?? {}] as const,
    detail: (projectId: string) => ['projects', projectId] as const,
    dashboard: (projectId: string) => ['projects', projectId, 'dashboard'] as const,
    members: (projectId: string) => ['projects', projectId, 'members'] as const,
    invitations: (projectId: string) => ['projects', projectId, 'invitations'] as const,
    overview: ['projects', 'overview'] as const,
    /**
     * The owner's binned projects.
     *
     * Under `projects` so that invalidating `projects.all` after a delete or a
     * restore refreshes the bin too — the two lists are opposite halves of the
     * same set, and one moving without the other is exactly the bug a shared
     * prefix prevents.
     */
    recycleBin: ['projects', 'recycle-bin'] as const,
  },

  /**
   * A project's changelog.
   *
   * A root of its own rather than a branch of `projects`, because every write
   * anywhere in the app invalidates `projects.all` — a rename, a pin, a
   * roster change — and a changelog nested under it would refetch its whole
   * scrolled history each time. It is fed by the socket instead; see
   * `useProjectActivityRealtime`.
   */
  activity: {
    all: ['activity'] as const,
    list: (projectId: string) => ['activity', projectId] as const,
  },

  tasks: {
    all: ['tasks'] as const,
    list: (params?: ListTasksParams) => ['tasks', 'list', params ?? {}] as const,
    agenda: (params?: ListTasksParams) => ['tasks', 'agenda', params ?? {}] as const,
    detail: (taskId: string) => ['tasks', taskId] as const,
    recycleBin: (projectId?: string) => ['tasks', 'recycle-bin', projectId ?? 'all'] as const,
  },

  /**
   * The grouping board's columns.
   *
   * A root of its own rather than a branch of `tasks`, and the reason is what
   * invalidating each one is *for*. A task write moves cards between columns
   * and must refresh `taskGroups.board`; a column write renames or reorders a
   * lane and must not blow away every task list in the cache to do it. Nesting
   * these under `tasks` would make the second impossible to express.
   */
  taskGroups: {
    all: ['task-groups'] as const,
    list: (projectId: string) => ['task-groups', projectId] as const,
    board: (projectId: string) => ['task-groups', projectId, 'board'] as const,
  },

  notes: {
    all: ['notes'] as const,
    list: (params?: object) => ['notes', 'list', params ?? {}] as const,
    board: (pageIndex: number) => ['notes', 'board', pageIndex] as const,
    /** The project whiteboard's shared Post-it layer. */
    projectBoard: (projectId: string) => ['notes', 'board', 'project', projectId] as const,
    /** Soft-deleted personal notes, restorable from the recycle bin. */
    recycleBin: ['notes', 'recycle-bin'] as const,
  },

  chat: {
    history: (projectId: string) => ['chat', projectId] as const,
  },

  whiteboard: {
    scene: (projectId: string) => ['whiteboard', projectId] as const,
  },

  documents: {
    all: ['documents'] as const,
    /** No project id is the caller's own desk, which is a scope of its own. */
    list: (projectId: string | undefined, taskId?: string) =>
      ['documents', 'list', projectId ?? 'personal', taskId ?? 'all'] as const,
    detail: (documentId: string) => ['documents', documentId] as const,
  },

  meetings: {
    all: ['meetings'] as const,
    /**
     * One calendar, as one entry.
     *
     * The board's day paging and name search are local filters over this
     * snapshot, so they are deliberately *not* in the key: putting them there
     * would make every arrow press a cache miss and a request.
     *
     * The scope is part of the key rather than just the id, because a project's
     * calendar and a company's are different questions with overlapping
     * answers — a company's includes the meetings of every project filed under
     * it, so keying both on a bare id would have one overwrite the other the
     * first time somebody opened a project from the company page.
     */
    list: (scope: 'project' | 'organization', id: string) =>
      ['meetings', 'list', scope, id] as const,
    /**
     * The personal agenda, keyed by its one server-side filter.
     *
     * `projectId` *is* in the key, unlike the board's local filters above,
     * because narrowing the agenda to a project is a different query rather
     * than a different view of the same answer — the unfiltered response is
     * capped, so it is not guaranteed to contain the filtered one.
     */
    agenda: (projectId?: string) => ['meetings', 'agenda', projectId ?? 'all'] as const,
  },

  notifications: {
    all: ['notifications'] as const,
    list: (unread?: boolean) => ['notifications', 'list', Boolean(unread)] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
  },

  organizations: {
    all: ['organizations'] as const,
    list: ['organizations', 'list'] as const,
    detail: (organizationId: string) => ['organizations', organizationId] as const,
    /** The company's staff list. */
    members: (organizationId: string) =>
      ['organizations', organizationId, 'members'] as const,
    /** Invitations this company has sent and nobody has answered yet. */
    invitations: (organizationId: string) =>
      ['organizations', organizationId, 'invitations'] as const,
    /** Project-level metrics for the whole company. */
    dashboard: (organizationId: string) =>
      ['organizations', organizationId, 'dashboard'] as const,
    /** What the "file a project here" picker offers. */
    attachable: ['organizations', 'attachable'] as const,
  },

  teams: {
    all: ['teams'] as const,
    /**
     * One roster's teams, keyed by the altitude they belong to.
     *
     * The scope is in the key rather than just the id because an organization
     * and a project can never share one: they are different rosters with
     * different membership rules, and a bare id would let a project's teams
     * answer a query for a company's.
     */
    list: (scope: 'organization' | 'project', id: string) =>
      ['teams', 'list', scope, id] as const,
  },

  invitations: {
    /**
     * Project invitations addressed to the signed-in user.
     *
     * Kept apart from the organization ones below rather than merged into one
     * key, because they come from two endpoints and are answered by two
     * different routes — one cache entry holding both would have to be
     * invalidated by every write to either, and a reply to one would refetch
     * the other for nothing.
     */
    mine: ['invitations', 'mine'] as const,
    organizations: ['invitations', 'organizations'] as const,
  },

  ai: {
    status: ['ai', 'status'] as const,
    history: (projectId?: string) => ['ai', 'history', projectId ?? 'all'] as const,
  },
} as const;
