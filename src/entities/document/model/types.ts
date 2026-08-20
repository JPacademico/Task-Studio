import type { UserSummary } from '@/entities/user/model/types';

/**
 * A written page belonging to a project — or, when `taskId` is set, to one
 * task inside it, or — when `projectId` is null — to one person's own desk.
 */
export interface ProjectDocument {
  id: string;
  title: string;
  /**
   * Sanitised rich-text HTML.
   *
   * Absent on list responses: a project's table of contents would otherwise
   * ship every page's full body to render a sidebar. `excerpt` is what the
   * list rows read from.
   */
  content?: string;
  /** Plain-text opening of the body, derived server-side. */
  excerpt: string;
  /** Null on a personal page — one nobody but its author can open. */
  projectId: string | null;
  taskId: string | null;
  task: { id: string; title: string; color: string } | null;
  /**
   * Set when the page is the minutes of a meeting. Mutually exclusive with
   * `taskId`: a page hangs off one thing.
   */
  meetingId: string | null;
  meeting: {
    id: string;
    title: string;
    startAt: string;
    /** A finished meeting keeps its minutes but takes no new pages. */
    completedAt: string | null;
  } | null;
  createdBy: UserSummary;
  updatedBy: UserSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentPayload {
  /** Omit for a page on your own desk. */
  projectId?: string;
  /** Omit for a project-wide page. Only valid alongside a project. */
  taskId?: string;
  /**
   * Makes the page the minutes of one meeting. Only valid alongside a project,
   * and never together with `taskId`.
   */
  meetingId?: string;
  title?: string;
  content?: string;
}

export interface UpdateDocumentPayload {
  title?: string;
  content?: string;
}
