import { api } from '@/shared/api/client';
import type {
  BoardPage,
  BoardSnapshot,
  BoardStroke,
  CreateBoardStrokePayload,
  CreateNoteLinkPayload,
  CreateNotePayload,
  ListNotesParams,
  Note,
  NoteLink,
  ProjectBoardSnapshot,
  UpdateNotePayload,
} from '../model/types';

export const noteApi = {
  async list(params: ListNotesParams = {}): Promise<Note[]> {
    const { data } = await api.get<Note[]>('/notes', { params });
    return data;
  },

  async create(payload: CreateNotePayload): Promise<Note> {
    const { data } = await api.post<Note>('/notes', payload);
    return data;
  },

  async update(noteId: string, payload: UpdateNotePayload): Promise<Note> {
    const { data } = await api.patch<Note>(`/notes/${noteId}`, payload);
    return data;
  },

  /**
   * Batched drag positions. The board debounces pointer movement and sends one
   * request per gesture instead of one per frame.
   */
  async savePositions(
    moves: { id: string; positionX: number; positionY: number; zIndex?: number }[],
  ): Promise<{ updated: number }> {
    const { data } = await api.put<{ updated: number }>('/notes/positions', { moves });
    return data;
  },

  async remove(noteId: string): Promise<void> {
    await api.delete(`/notes/${noteId}`);
  },

  async restore(noteId: string): Promise<Note> {
    const { data } = await api.post<Note>(`/notes/${noteId}/restore`);
    return data;
  },

  async purge(noteId: string): Promise<void> {
    await api.delete(`/notes/${noteId}/purge`);
  },
};

/**
 * The personal board as one surface: Post-its, the connectors between them and
 * the freehand ink all arrive together, because painting a page needs all three.
 */
export const boardApi = {
  async snapshot(pageIndex: number): Promise<BoardSnapshot> {
    const { data } = await api.get<BoardSnapshot>('/notes/board', { params: { pageIndex } });
    return data;
  },

  /** The project whiteboard's shared Post-it layer. */
  async projectSnapshot(projectId: string): Promise<ProjectBoardSnapshot> {
    const { data } = await api.get<ProjectBoardSnapshot>(`/notes/board/project/${projectId}`);
    return data;
  },

  async addPage(): Promise<BoardPage[]> {
    const { data } = await api.post<BoardPage[]>('/notes/board/pages');
    return data;
  },

  async renamePage(index: number, name: string): Promise<BoardPage[]> {
    const { data } = await api.patch<BoardPage[]>(`/notes/board/pages/${index}`, { name });
    return data;
  },

  async removePage(index: number): Promise<BoardPage[]> {
    const { data } = await api.delete<BoardPage[]>(`/notes/board/pages/${index}`);
    return data;
  },

  async clearPage(pageIndex: number): Promise<{ pageIndex: number; clearedNotes: number }> {
    const { data } = await api.post<{ pageIndex: number; clearedNotes: number }>(
      '/notes/board/clear',
      undefined,
      { params: { pageIndex } },
    );
    return data;
  },

  async createLink(payload: CreateNoteLinkPayload): Promise<NoteLink> {
    const { data } = await api.post<NoteLink>('/notes/board/links', payload);
    return data;
  },

  async removeLink(linkId: string): Promise<void> {
    await api.delete(`/notes/board/links/${linkId}`);
  },

  async addStroke(payload: CreateBoardStrokePayload): Promise<BoardStroke> {
    const { data } = await api.post<BoardStroke>('/notes/board/strokes', payload);
    return data;
  },

  async clearStrokes(pageIndex: number): Promise<void> {
    await api.delete('/notes/board/strokes', { params: { pageIndex } });
  },

  async group(
    noteIds: string[],
    groupId?: string | null,
  ): Promise<{ groupId: string | null; updated: number }> {
    const { data } = await api.put<{ groupId: string | null; updated: number }>(
      '/notes/board/groups',
      { noteIds, ...(groupId === undefined ? {} : { groupId }) },
    );
    return data;
  },
};
