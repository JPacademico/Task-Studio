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

export interface RepositoryImportResult {
  project: Project;
  repository: { fullName: string; htmlUrl: string };
  /** False when the assistant was skipped or was unavailable. */
  usedAssistant: boolean;
  /** Display names of the contributors who were sent an invitation. */
  invited: string[];
  taskCount: number;
  documentCount: number;
}
