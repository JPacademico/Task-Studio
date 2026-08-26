import type { UserSummary } from '@/entities/user/model/types';

/**
 * The file behind an imported page.
 *
 * A page can arrive two ways: typed into the editor, or uploaded as a document
 * somebody already had. This is set for the second kind and is what the board
 * reads to decide whether it is drawing an editor or a file.
 */
export interface DocumentSource {
  /** The uploader's own filename. The object key is a UUID, so this is it. */
  name: string;
  mime: string;
  size: number;
  /**
   * Whether the page's body is a conversion of that file.
   *
   * False means the page **is** the upload: there is no body yet, the board
   * shows the file itself, and pressing Edit is what runs the conversion.
   * Answered by the API rather than inferred from an empty `content`, which
   * would misread a converted page somebody has since emptied.
   */
  isConverted: boolean;
  convertedAt: string | null;
  /**
   * Whether Edit has to go through the assistant first.
   *
   * False for `.txt`, which the browser converts at upload — turning plain
   * text into paragraphs is a `split`, not a judgement, so it costs no model
   * call and the page is editable from the first moment. True for PDF and
   * `.docx`.
   */
  needsConversion: boolean;
}

/** The three things a page can be downloaded as. */
export type DocumentExportFormat = 'pdf' | 'txt' | 'html';

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
   * The file this page was imported from, or null if it was typed here.
   *
   * Present on table-of-contents rows as well as on an open page, so the list
   * can badge an import before anybody clicks it.
   */
  source: DocumentSource | null;
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
 * Registering an already-uploaded file as a page.
 *
 * The bytes are not here. They went straight from the browser to storage
 * through a presigned PUT, exactly as a task attachment does; this is the
 * receipt, and the API checks that the object key really belongs to whoever
 * is sending it.
 */
export interface ImportDocumentPayload {
  projectId?: string;
  taskId?: string;
  meetingId?: string;
  title?: string;
  sourceKey: string;
  sourceUrl: string;
  sourceName: string;
  sourceMime: string;
  sourceSize: number;
  /**
   * The page body, when the browser could produce it without a model.
   *
   * Only ever set for `text/plain` — see `DocumentSource.needsConversion`. The
   * API refuses to honour it for any other format.
   */
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
