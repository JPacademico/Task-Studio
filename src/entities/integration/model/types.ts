import type { Project } from '@/entities/project/model/types';

/** One contributor, and whether the app already knows who they are. */
export interface RepositoryContributor {
  login: string;
  avatarUrl: string | null;
  contributions: number;
  /**
   * The Task Studio account this contributor is, when they have linked one. Matched on the GitHub
   * id stored against their sign-in — never on a name that happens to look similar.
   */
  matchedUser: { id: string; displayName: string; avatarUrl: string | null } | null;
}

/** What the import would produce, answered before it produces it. */
export interface RepositoryPreview {
  owner: string;
  repo: string;
  fullName: string;
  description: string | null;
  language: string | null;
  topics: string[];
  stars: number;
  openIssues: number;
  isArchived: boolean;
  htmlUrl: string;
  /** Files that would become pages on the Documents tab. */
  documents: string[];
  contributors: RepositoryContributor[];
  /** False on a deployment with no Gemini key — the import still works. */
  canUseAssistant: boolean;
}

/** Starting a board import. The file is uploaded first; this is its key. */
export interface BoardImportPayload {
  source: BoardImportSource;
  /** R2 object key from the presigned upload, scope `imports`. */
  payloadKey: string;
  payloadName?: string;
  organizationId?: string;
  color?: string;
  startsAt?: string;
  endsAt?: string;
}

export interface RepositoryImportPayload {
  url: string;
  organizationId?: string;
  color?: string;
  /** False to skip the assistant and take the repository's own name and blurb. */
  useAssistant?: boolean;
  /**
   * A short note steering what the assistant reads. Only meaningful alongside `useAssistant` —
   * there is nothing to steer otherwise — and capped at 400 characters by the API.
   */
  guidance?: string;
}

/** The API's own ceiling, mirrored so the field can count down against it. */
export const MAX_IMPORT_GUIDANCE = 400;

/**
 * Where an import has got to. `CANCELLED` and `FAILED` are separate for a reason the tracker
 * depends on: one is something the user chose and the other is something that went wrong.
 */
export type ImportStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';

/**
 * Where an import is reading from. Every value is a format that needs no credential — a public
 * repository address, or a file the user already has.
 */
export type ImportSource = 'GITHUB' | 'TRELLO_JSON' | 'BOARD_CSV' | 'TRELLO_API' | 'JIRA_API';

/** The two a file picker offers. `GITHUB` takes a URL and has its own panel. */
export type BoardImportSource = 'TRELLO_JSON' | 'BOARD_CSV';

/**
 * The named stages, mirroring the API's `IMPORT_STEPS`. A union of the slugs rather than a free
 * string, so that the lookup which turns each one into a translated sentence is exhaustive.
 */
export type ImportStep =
  | 'queued'
  | 'resolving'
  | 'reading'
  | 'analysing'
  | 'writing'
  | 'inviting'
  | 'done'
  | 'stopped';

/**
 * One background import, as the tracker draws it. This is the whole reason importing a repository
 * no longer holds the browser hostage: the job is a row on the API.
 */
export interface RepositoryImportJob {
  id: string;
  /**
   * Which reader ran. The client uses it for exactly one thing — whether the summary line says
   * "pages" or "columns".
   */
  source: ImportSource;
  status: ImportStatus;
  step: ImportStep;
  /** 0–100, coarse and monotonic. See the API's `IMPORT_PROGRESS`. */
  progress: number;
  /** What was pasted — a label for the toast before GitHub has answered. */
  sourceUrl: string;
  /** The canonical `owner/name`, or the board's own name, once it is known. */
  fullName: string | null;
  /** The uploaded file's name, which is the label for a board import. */
  payloadName: string | null;
  error: string | null;
  /** The project it produced, once there is one. */
  projectId: string | null;
  taskCount: number;
  documentCount: number;
  invitedCount: number;
  /**
   * A cancel has been asked for and the job has not stopped yet. Its own field rather than a
   * status, because the job genuinely is still running.
   */
  isCancelling: boolean;
  createdAt: string;
  finishedAt: string | null;
}

/** What `DELETE /imports/:id` answers. */
export interface CancelImportResult extends RepositoryImportJob {
  /** False when it had already finished — a race, not an error. */
  cancelling: boolean;
}

// --- Calendar ----------------------------------------------------------------

/** One person's linked calendar, minus anything secret. */
export interface CalendarConnection {
  id: string;
  provider: 'GOOGLE';
  /** Which Google account — so somebody with two can tell them apart. */
  accountEmail: string;
  /** The whole thing, paused. Distinct from the two directions below. */
  isEnabled: boolean;
  /** Mirror meetings out to Google. */
  pushEnabled: boolean;
  /** Apply changes made in Google back to the meeting here. */
  pullEnabled: boolean;
  lastSyncedAt: string | null;
  /**
   * What went wrong last, cleared by the next clean sync. Shown rather than swallowed, because the
   * two things that actually happen — a revoked grant, and a change refused.
   */
  lastError: string | null;
  createdAt: string;
}

export interface CalendarStatus {
  /** False when the deployment has no Google credentials or no encryption key. */
  available: boolean;
  connection: CalendarConnection | null;
}

export interface CalendarSettingsPayload {
  isEnabled?: boolean;
  pushEnabled?: boolean;
  pullEnabled?: boolean;
}

/** `syncNow` answers with the connection plus what the pull actually changed. */
export interface CalendarSyncResult extends CalendarConnection {
  applied: number;
}

/**
 * Kept so the import panel can still name what an import produced. The synchronous import result no
 * longer exists as a response — the endpoint answers with a job now.
 */
export interface RepositoryImportSummary {
  project: Pick<Project, 'id' | 'name'> | null;
  taskCount: number;
  documentCount: number;
  invited: number;
}

/**
 * The subscribable calendar feed. `url` is present only in the response to *minting* one — the
 * token behind it is stored as a hash and is genuinely unrecoverable afterwards.
 */
export interface CalendarFeedStatus {
  exists: boolean;
  createdAt: string | null;
  /** Null until a calendar client has actually fetched it once. */
  lastAccessedAt: string | null;
}

export interface CalendarFeedSecret {
  url: string;
}

// --- Webhooks ----------------------------------------------------------------

/** Which chat product a hook points at, recognised from its hostname. */
export type WebhookFlavour = 'generic' | 'slack' | 'discord';

/**
 * The events a project can post. Mirrors the API's `WEBHOOK_EVENTS`. Deliberately short — see the
 * note there on the test each one had to pass.
 */
export type WebhookEvent =
  | 'task.created'
  | 'task.completed'
  | 'task.deleted'
  | 'meeting.scheduled'
  | 'member.joined'
  | 'project.completed';

export interface ProjectWebhook {
  id: string;
  url: string;
  flavour: WebhookFlavour;
  /** Empty means every event, which is the default. */
  events: WebhookEvent[];
  isEnabled: boolean;
  /** The last HTTP status the endpoint answered with, or null. */
  lastStatus: number | null;
  lastAttemptAt: string | null;
  lastError: string | null;
  /** Consecutive failures. At ten the hook disables itself. */
  failureCount: number;
  createdAt: string;
  createdBy: { id: string; displayName: string } | null;
}

/** Creating one answers with the signing secret, once and never again. */
export interface CreatedWebhook extends ProjectWebhook {
  secret: string;
}

export interface WebhookPayloadDraft {
  url: string;
  events?: WebhookEvent[];
}

/** What a test delivery reports. */
export interface WebhookTestResult {
  delivered: boolean;
  status: number | null;
  error: string | null;
}

// --- Personal access tokens --------------------------------------------------

export interface ApiToken {
  id: string;
  name: string;
  /** The first few characters, so two tokens can be told apart. Not secret. */
  prefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  /**
   * Whether it still works — revoked and expired resolved into one answer by
   * the API, so a client cannot disagree with the guard about it.
   */
  isActive: boolean;
}

/** Minting one answers with its value, once. */
export interface CreatedApiToken {
  id: string;
  name: string;
  prefix: string;
  expiresAt: string | null;
  createdAt: string;
  /** Shown once. No endpoint will ever return this again. */
  token: string;
}


// --- Spotify -----------------------------------------------------------------

/** One person's connected account, as the API describes it. */
export interface SpotifyConnection {
  displayName: string;
  spotifyUserId: string;
  /** Where the person's own Spotify profile is, for the name to link to. */
  profileUrl: string;
  /**
   * Whether the transport controls will work. Spotify refuses play, pause, skip and volume for
   * everybody who is not Premium.
   */
  isPremium: boolean;
  /** The user's own switch: keeps the grant, hides the player. */
  isEnabled: boolean;
  /** The last thing Spotify refused. Cleared by the next call that works. */
  lastError: string | null;
  connectedAt: string;
}

export interface SpotifyStatus {
  /** Whether the deployment has the credentials for this at all. */
  available: boolean;
  connection: SpotifyConnection | null;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  /** Every artist on the track, joined — the player has one line for them. */
  artist: string;
  url: string;
  artistUrl: string | null;
  albumArt: string | null;
}

export interface SpotifyPlayback {
  isPlaying: boolean;
  /** Null when nothing is playing anywhere, which is not an error. */
  track: SpotifyTrack | null;
  /** 0-100, or null on a device that does not report one. */
  volume: number | null;
  deviceName: string | null;
  isPremium: boolean;
}

export interface SpotifySearchResults {
  tracks: SpotifyTrack[];
  artists: { id: string; name: string; url: string }[];
}

/** The four verbs the API accepts. A closed list on both sides. */
export type SpotifyTransport = 'play' | 'pause' | 'next' | 'previous';

/* --- Trello and Jira ------------------------------------------------------- */

export type BoardProvider = 'TRELLO' | 'JIRA';

export interface BoardConnection {
  accountName: string;
  lastError: string | null;
  connectedAt: string;
}

export interface BoardProviderStatus {
  /** False when the deployment has no key for this provider. */
  available: boolean;
  connection: BoardConnection | null;
}

export type BoardStatus = Record<'trello' | 'jira', BoardProviderStatus>;

/** A board or project the connected account can see. */
export interface BoardChoice {
  id: string;
  name: string;
  url: string | null;
  siteId: string | null;
  siteName: string | null;
  updatedAt: string | null;
}

export interface BoardSyncSummary {
  created: number;
  updated: number;
  adopted: number;
  conflicts: number;
  removed: number;
  skippedTasks: number;
  columns: number;
  skippedColumns: number;
}

export interface BoardSyncLink {
  provider: BoardProvider;
  externalName: string;
  externalUrl: string | null;
  autoSync: boolean;
  /** False after a file import, or once the account behind it disconnected. */
  isConnected: boolean;
  connectedAs: string | null;
  isMine: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
  lastSummary: BoardSyncSummary | null;
}

export interface BoardSyncStatus {
  link: BoardSyncLink | null;
  canManage: boolean;
  intervalMinutes: number;
}

export interface LinkBoardPayload {
  provider: BoardProvider;
  externalId: string;
  siteId?: string;
  autoSync?: boolean;
}

export interface ConnectedImportPayload {
  provider: BoardProvider;
  externalId: string;
  siteId?: string;
  name?: string;
  keepInSync?: boolean;
  organizationId?: string;
  color?: string;
  startsAt?: string;
  endsAt?: string;
}
