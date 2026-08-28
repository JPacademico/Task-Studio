import type { Project } from '@/entities/project/model/types';

/** One contributor, and whether the app already knows who they are. */
export interface RepositoryContributor {
  login: string;
  avatarUrl: string | null;
  contributions: number;
  /**
   * The Task Studio account this contributor is, when they have linked one.
   *
   * Matched on the GitHub id stored against their sign-in — never on a name
   * that happens to look similar. Null means "no account here that we can
   * prove is them", which is the common case and is not a failure.
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

export interface RepositoryImportPayload {
  url: string;
  organizationId?: string;
  color?: string;
  /** False to skip the assistant and take the repository's own name and blurb. */
  useAssistant?: boolean;
}

/**
 * Where an import has got to.
 *
 * `CANCELLED` and `FAILED` are separate for a reason the tracker depends on:
 * one is something the user chose and the other is something that went wrong,
 * and a toast that apologises for a button somebody deliberately pressed reads
 * as a bug in itself.
 */
export type ImportStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';

/**
 * The named stages, mirroring the API's `IMPORT_STEPS`.
 *
 * A union of the slugs rather than a free string, so that the lookup which
 * turns each one into a translated sentence is exhaustive — a step added on
 * the API without a string here becomes a compile error rather than a raw
 * slug rendered in somebody's toast.
 *
 * `stopped` is the API's terminal step for a job that did not finish. It is
 * never drawn as a sentence, because a stopped job shows its error or its
 * cancellation instead, but it has to be in the union to be assignable.
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
 * One background import, as the tracker draws it.
 *
 * This is the whole reason importing a repository no longer holds the browser
 * hostage: the job is a row on the API, it is pushed over the socket as it
 * moves, and it is re-fetched on mount. Closing the tab, locking a phone or
 * switching device costs nothing.
 */
export interface RepositoryImportJob {
  id: string;
  status: ImportStatus;
  step: ImportStep;
  /** 0–100, coarse and monotonic. See the API's `IMPORT_PROGRESS`. */
  progress: number;
  /** What was pasted — a label for the toast before GitHub has answered. */
  sourceUrl: string;
  /** The canonical `owner/name`, once it is known. */
  fullName: string | null;
  error: string | null;
  /** The project it produced, once there is one. */
  projectId: string | null;
  taskCount: number;
  documentCount: number;
  invitedCount: number;
  /**
   * A cancel has been asked for and the job has not stopped yet.
   *
   * Its own field rather than a status, because the job genuinely is still
   * running: the runner only notices a cancel at a step boundary. This is what
   * lets the button say "cancelling…" and stop being pressable without the
   * status having to lie.
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

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

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
   * What went wrong last, cleared by the next clean sync.
   *
   * Shown rather than swallowed, because the two things that actually happen —
   * a revoked grant, and a change refused because the person may not edit that
   * meeting — are both things only the user can resolve, and a sync that
   * silently stopped working is worse than one that says why.
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
 * Kept so the import panel can still name what an import produced.
 *
 * The synchronous import result no longer exists as a response — the endpoint
 * answers with a job now — but the *summary* is still what the success toast
 * says, assembled from the finished job's counters.
 */
export interface RepositoryImportSummary {
  project: Pick<Project, 'id' | 'name'> | null;
  taskCount: number;
  documentCount: number;
  invited: number;
}
