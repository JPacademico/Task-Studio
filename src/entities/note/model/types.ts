import type { UserSummary } from '@/entities/user/model/types';

export type NoteScope = 'PERSONAL' | 'TASK' | 'PROJECT';
export type NoteKind = 'TEXT' | 'IMAGE';
export type NoteLinkStyle = 'ARROW' | 'DOUBLE_ARROW' | 'LINE' | 'DASHED';

export interface Note {
  id: string;
  title: string | null;
  content: string;
  color: string;
  scope: NoteScope;
  kind: NoteKind;
  imageKey: string | null;
  imageUrl: string | null;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  /** 0-based board page the object sits on. */
  pageIndex: number;
  /** Objects sharing a group move, link and delete together. */
  groupId: string | null;
  isPinned: boolean;
  /**
   * Ticked off, on a task's note checklist.
   *
   * Meaningless outside `scope: 'TASK'` — a note on a board is a thought, not
   * a step, and nothing draws a checkbox on one.
   */
  isCompleted: boolean;
  completedAt: string | null;
  /** Who ticked it. Null while it is open. */
  completedBy?: UserSummary | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  taskId: string | null;
  projectId: string | null;
  /**
   * Who stuck this one on the wall. Always sent by the API — traceability on a
   * shared surface is part of the note, not an extra lookup per card.
   */
  author?: UserSummary;

  /**
   * The id this sheet was *first* drawn under, which is not always its id.
   *
   * Client-only: the API never sends it and never sees it. It exists because a
   * note is drawn on the wall before the server has heard of it, under a
   * `pending-…` id, and is later replaced by the real row. Keying React on
   * `id` meant that swap unmounted the sheet and mounted a new one — which,
   * if the user was still dragging it, tore the drag out from under the
   * pointer and dropped the note back where it started.
   *
   * Keying on `clientKey ?? id` instead keeps one element for the whole life of
   * the sheet: the id underneath it changes, the DOM node does not, and the
   * gesture in progress never notices. See `adoptServerNote`.
   */
  clientKey?: string;
}

export interface NoteLink {
  id: string;
  style: NoteLinkStyle;
  color: string;
  label: string | null;
  sourceId: string;
  targetId: string;
  createdAt: string;
}

export interface BoardStroke {
  id: string;
  /** Normalised 0..1 point pairs. */
  points: [number, number][];
  color: string;
  width: number;
  pageIndex: number;
  createdAt: string;
}

export interface BoardPage {
  index: number;
  name: string;
}

export interface BoardSnapshot {
  pageIndex: number;
  pages: BoardPage[];
  notes: Note[];
  links: NoteLink[];
  strokes: BoardStroke[];
}

/** The project whiteboard's Post-it layer: one shared wall, no pages. */
export interface ProjectBoardSnapshot {
  projectId: string;
  notes: Note[];
  links: NoteLink[];
}

export interface CreateNotePayload {
  title?: string;
  content: string;
  color?: string;
  scope?: NoteScope;
  kind?: NoteKind;
  imageKey?: string;
  taskId?: string;
  projectId?: string;
  pageIndex?: number;
  groupId?: string;
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
  rotation?: number;
}

export interface UpdateNotePayload {
  title?: string;
  content?: string;
  color?: string;
  isPinned?: boolean;
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
  rotation?: number;
  zIndex?: number;
  pageIndex?: number;
  groupId?: string | null;
}

export interface ListNotesParams {
  scope?: NoteScope;
  taskId?: string;
  projectId?: string;
  pageIndex?: number;
  includeDeleted?: boolean;
}

export interface CreateNoteLinkPayload {
  sourceId: string;
  targetId: string;
  style?: NoteLinkStyle;
  color?: string;
  label?: string;
}

export interface CreateBoardStrokePayload {
  points: [number, number][];
  color?: string;
  width?: number;
  pageIndex?: number;
}
