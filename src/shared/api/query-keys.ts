import type { ListTasksParams } from '@/entities/task/model/types';

/**
 * Central query-key registry. Invalidation is the most bug-prone part of a
 * cache, so the keys live in one file instead of being spelled out inline.
 */
export const queryKeys = {
  session: ['session'] as const,

  /**
   * The plan, and what it costs. Two keys rather than one, because they have opposite lifetimes.
   * The catalogue is the same table for everybody and changes when the deployment is redeployed.
   */
  billing: {
    catalogue: ['billing', 'plans'] as const,
    summary: ['billing', 'me'] as const,
  },

  projects: {
    all: ['projects'] as const,
    list: (params?: object) => ['projects', 'list', params ?? {}] as const,
    detail: (projectId: string) => ['projects', projectId] as const,
    dashboard: (projectId: string) => ['projects', projectId, 'dashboard'] as const,
    members: (projectId: string) => ['projects', projectId, 'members'] as const,
    invitations: (projectId: string) => ['projects', projectId, 'invitations'] as const,
    inviteLink: (projectId: string) => ['projects', projectId, 'invite-link'] as const,
    boardSync: (projectId: string) => ['projects', projectId, 'board-sync'] as const,
    overview: ['projects', 'overview'] as const,
    /**
     * The owner's binned projects. Under `projects` so that invalidating `projects.all` after a
     * delete or a restore refreshes the bin too.
     */
    recycleBin: ['projects', 'recycle-bin'] as const,
  },

  /**
   * A project's changelog. A root of its own rather than a branch of `projects`, because every
   * write anywhere in the app invalidates `projects.all` — a rename, a pin, a roster change.
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
   * The grouping board's columns. A root of its own rather than a branch of `tasks`, and the reason
   * is what invalidating each one is *for*.
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
    /** One page of a project's shared wall. The prefix without a page is every page. */
    projectBoard: (projectId: string, pageIndex = 0) =>
      ['notes', 'board', 'project', projectId, pageIndex] as const,
    projectBoardAll: (projectId: string) => ['notes', 'board', 'project', projectId] as const,
    /** Soft-deleted personal notes, restorable from the recycle bin. */
    recycleBin: ['notes', 'recycle-bin'] as const,
  },

  chat: {
    history: (projectId: string) => ['chat', projectId] as const,
  },

  whiteboard: {
    scene: (projectId: string, pageIndex = 0) => ['whiteboard', projectId, pageIndex] as const,
  },

  documents: {
    all: ['documents'] as const,
    /** No project id is the caller's own desk, which is a scope of its own. */
    list: (projectId: string | undefined, taskId?: string) =>
      ['documents', 'list', projectId ?? 'personal', taskId ?? 'all'] as const,
    detail: (documentId: string) => ['documents', documentId] as const,
    /**
     * How full one board is. Same scoping rule as `list`: no project id is the caller's own desk.
     * Under the `documents` prefix on purpose.
     */
    usage: (projectId: string | undefined) =>
      ['documents', 'usage', projectId ?? 'personal'] as const,
    /** A folder page's pictures. Under the prefix for the same reason. */
    folder: (documentId: string) => ['documents', documentId, 'folder'] as const,
  },

  /**
   * Live calls, which are not meetings. A root of its own rather than a branch of `meetings`, and
   * the reason is invalidation rather than taxonomy.
   */
  live: {
    all: ['live'] as const,
    /**
     * One project's rooms. `includeEnded` is in the key because it is a different question rather
     * than a wider view of the same one: the default response omits finished rooms entirely.
     */
    list: (projectId: string, includeEnded: boolean) =>
      ['live', 'list', projectId, includeEnded] as const,
    detail: (roomId: string) => ['live', roomId] as const,
    /**
     * The ICE servers, which are deployment configuration. Cached hard and never invalidated by
     * anything a user does — it changes when the API is redeployed.
     */
    ice: ['live', 'ice'] as const,
  },

  meetings: {
    all: ['meetings'] as const,
    /**
     * One calendar, as one entry. The board's day paging and name search are local filters over
     * this snapshot, so they are deliberately *not* in the key.
     */
    list: (scope: 'project' | 'organization', id: string) =>
      ['meetings', 'list', scope, id] as const,
    /**
     * The personal agenda, keyed by its one server-side filter. `projectId` *is* in the key, unlike
     * the board's local filters above.
     */
    agenda: (projectId?: string) => ['meetings', 'agenda', projectId ?? 'all'] as const,
    /**
     * The bookable rooms of one calendar. Keyed by scope for the same reason the list above is, and
     * with one extra consequence worth naming: a project's answer *includes* its company's rooms.
     */
    rooms: (scope: 'project' | 'organization', id: string) =>
      ['meetings', 'rooms', scope, id] as const,
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
     * One roster's teams, keyed by the altitude they belong to. The scope is in the key rather than
     * just the id because an organization and a project can never share one.
     */
    list: (scope: 'organization' | 'project', id: string) =>
      ['teams', 'list', scope, id] as const,
  },

  inviteLinks: {
    preview: (token: string) => ['invite-links', token] as const,
  },

  invitations: {
    /**
     * Project invitations addressed to the signed-in user. Kept apart from the organization ones
     * below rather than merged into one key.
     */
    mine: ['invitations', 'mine'] as const,
    organizations: ['invitations', 'organizations'] as const,
  },

  ai: {
    status: ['ai', 'status'] as const,
    history: (projectId?: string) => ['ai', 'history', projectId ?? 'all'] as const,
  },

  /**
   * Things that reach outside this app on the user's behalf. A root of its own rather than branches
   * of `projects` and `meetings`, and the reason is what invalidating each one is *for*.
   */
  integrations: {
    all: ['integrations'] as const,
    /** This person's live imports, plus a short tail of finished ones. */
    imports: ['integrations', 'imports'] as const,
    /** Their linked calendar, and whether the deployment offers one. */
    calendar: ['integrations', 'calendar'] as const,
    /** Their Spotify grant, and whether the deployment offers one. */
    spotify: ['integrations', 'spotify'] as const,
    /** Their Trello and Jira accounts, and whether the deployment offers each. */
    boards: ['integrations', 'boards'] as const,
    boardChoices: (provider: string) => ['integrations', 'boards', provider] as const,
    /**
     * What is playing right now. Its own key rather than a field on `spotify`, and for a stronger
     * reason than the feed's below.
     */
    spotifyPlayback: ['integrations', 'spotify', 'playback'] as const,
    /**
     * The subscribable feed's *status* — never its URL. A separate key from `calendar` rather than
     * a field on it, because the two change for completely unrelated reasons.
     */
    calendarFeed: ['integrations', 'calendar', 'feed'] as const,
    /**
     * One project's outbound webhooks. Under `integrations` rather than under `projects`, even
     * though the route hangs off a project — for the reason the changelog gives about itself.
     */
    webhooks: (projectId: string) => ['integrations', 'webhooks', projectId] as const,
    /** This person's personal access tokens. */
    apiTokens: ['integrations', 'api-tokens'] as const,
    /**
     * Whether this deployment offers Figma at all. One key with no project in it, because the
     * answer has no project in it: the integration needs an encryption key on the server.
     */
    figma: ['integrations', 'figma'] as const,
  },
} as const;
