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
   * Whether the page has a body of its own, or *is* still the file.
   *
   * False means there is nothing to edit and nothing to render: the board
   * shows the upload itself and offers it back for download. A PDF and a
   * `.docx` are always false and stay that way — nothing on the API reads one.
   * True for a `.txt`, whose paragraphs the browser writes at upload time, and
   * for the pages that were converted while that feature existed: they keep
   * their text and are ordinary editable documents.
   *
   * Answered by the API rather than inferred from an empty `content`, which
   * would misread a page somebody has since emptied.
   */
  hasBody: boolean;
}

/** The three things a page can be downloaded as. */
export type DocumentExportFormat = 'pdf' | 'txt' | 'html';

/**
 * One record inside an imported `.zip`.
 *
 * Read from the archive's central directory on the API, which is names and
 * numbers and no decompression anywhere — see `zip-directory.ts` there. It is
 * deliberately not possible to fetch one of these out of the archive: the
 * download button beside the listing is what gets the files.
 */
export interface ArchiveEntry {
  /** Always `/`-separated, and normalised — see the reader's `readablePath`. */
  path: string;
  /** Bytes this entry takes up inside the archive. */
  compressedSize: number;
  /** Bytes it would take up on disk. Zero for a folder. */
  size: number;
  isDirectory: boolean;
  modifiedAt: string | null;
}

export interface ArchiveListing {
  entries: ArchiveEntry[];
  /** How many records the archive declares, before any truncation. */
  totalEntries: number;
  /** True when `entries` stops short of `totalEntries`. */
  isTruncated: boolean;
  uncompressedSize: number;
}

/** One object on a Figma page — a frame, a component, a section. */
export interface FigmaNodeSummary {
  id: string;
  name: string;
  /** Figma's own node type: `FRAME`, `COMPONENT`, `SECTION`, and so on. */
  type: string;
}

export interface FigmaPageSummary {
  id: string;
  name: string;
  nodes: FigmaNodeSummary[];
  isTruncated: boolean;
}

/**
 * A Figma file's structure as of the last sync.
 *
 * The API's reduction of a node tree that is megabytes of vectors and fills —
 * pages, and each page's top-level objects, which is the granularity somebody
 * navigates and exports at.
 */
export interface FigmaSnapshot {
  name: string;
  version: string;
  lastModified: string | null;
  thumbnailUrl: string | null;
  pages: FigmaPageSummary[];
  isTruncated: boolean;
}

/**
 * The Figma file a page mirrors, when the page *is* a design.
 *
 * The fourth kind of page and the only one holding no bytes anywhere: what is
 * stored is an address plus the snapshot below, and the pixels come from
 * Figma's renderer when somebody asks for them.
 */
export interface DocumentFigma {
  fileKey: string;
  /** One frame, when the page is scoped to one. Null means the whole file. */
  nodeId: string | null;
  /** The address a browser opens. Derived on the API. */
  url: string;
  /** Figma's own revision marker as of `syncedAt`. */
  version: string | null;
  syncedAt: string | null;
  /**
   * The cached tree. Absent on table-of-contents rows, where twenty designs
   * would otherwise ship twenty node trees to render twenty titles.
   */
  snapshot?: FigmaSnapshot | null;
}

/** What a single object in a design can be pulled out as. */
export type FigmaExportFormat = 'png' | 'jpg' | 'svg' | 'pdf';

/**
 * The assistant's reading of a design's *structure*.
 *
 * Written from page and frame names — never from artwork — and returned to
 * whoever asked rather than written onto anything. See `figma-brief.prompt.ts`
 * on the API for why that distinction is the whole of the safety argument.
 */
export interface FigmaBrief {
  summary: string;
  flows: { name: string; detail: string }[];
  tasks: string[];
  gaps: string[];
}

/** Putting a Figma file on a project's board as a page. */
export interface CreateFigmaPagePayload {
  /**
   * Required, unlike on every sibling payload: the credential is a property of
   * the project, so a personal design page would be a row that can never
   * render.
   */
  projectId: string;
  /** Omit for the file the project already designs against. */
  url?: string;
  taskId?: string;
  meetingId?: string;
  title?: string;
}

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
   * The Figma file this page mirrors, or null on every other kind of page.
   *
   * Mutually exclusive with `source` in practice — a page is either bytes in a
   * bucket or an address in Figma — though nothing needs to enforce that,
   * because the two are set by different routes and neither ever sets both.
   *
   * Present on table-of-contents rows so the list can mark a design before
   * anybody clicks it, with `snapshot` omitted there. See `DocumentFigma`.
   */
  figma: DocumentFigma | null;
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
   * Only ever set for `text/plain` — turning plain text into paragraphs is a
   * `split`, so the browser does it at upload. The API refuses to honour it
   * for any other format.
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
