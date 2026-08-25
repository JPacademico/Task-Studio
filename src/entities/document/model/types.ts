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
  /**
   * Everybody the author has handed the pen to.
   *
   * Reading a project's page is the roster's right; rewriting one is not. A
   * page is one person's argument at a particular moment, so it is editable by
   * its author, by the people in this list, and by the project's owner — see
   * the API's `DocumentEditorGrant` for why the owner and not every admin.
   */
  editors: UserSummary[];
  /**
   * Whether *this* reader may rewrite it.
   *
   * Answered by the server rather than worked out here. The rule reads three
   * different things — the author, this list, the project's owner — and a
   * client that re-derived it would be a second implementation of an
   * authorisation decision, drifting from the real one the first time either
   * changed.
   */
  canEdit: boolean;
  /** Whether this reader may change who else may edit. Narrower than `canEdit`. */
  canManageAccess: boolean;
  /**
   * Whether this reader may destroy it: the author, or a project admin.
   *
   * Deliberately not the same set as `canEdit`, and not a subset of it either.
   * A granted editor can rewrite the page and cannot delete it; an admin can
   * delete it and cannot rewrite it. Both directions are intentional — see the
   * API's `DocumentsService.canDelete`.
   */
  canDelete: boolean;
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

/**
 * A page as it arrives over the socket.
 *
 * Every `can*` flag is an answer to "may *you*", computed by the API from
 * whoever made the request that caused the broadcast — which is not the person
 * receiving it. The API therefore strips them all before emitting (see
 * `DocumentsService.broadcastShape`), and this type is what is left. Every
 * consumer merges it *over* what it already holds, so the reader keeps their
 * own answer to a question the event was never about.
 */
export type DocumentBroadcast = Omit<
  ProjectDocument,
  'canEdit' | 'canManageAccess' | 'canDelete'
>;
