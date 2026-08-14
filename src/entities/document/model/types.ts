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
  title?: string;
  content?: string;
}

export interface UpdateDocumentPayload {
  title?: string;
  content?: string;
}
