import type { Note } from '@/entities/note/model/types';

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Which notes a lasso caught. Intersection, not containment: asking a user to fully enclose every
 * note means a box that also swallows everything between them.
 */
export const notesInsideRect = (notes: Note[], rect: Box): string[] => {
  const right = rect.left + rect.width;
  const bottom = rect.top + rect.height;

  return notes
    .filter(
      (note) =>
        note.positionX < right &&
        note.positionX + note.width > rect.left &&
        note.positionY < bottom &&
        note.positionY + note.height > rect.top,
    )
    .map((note) => note.id);
};

/**
 * A stable colour per group, derived from its id. Groups have no colour of their own in the data,
 * but they need to be distinguishable on the board.
 */
export const groupTintFor = (groupId: string | null): string | undefined => {
  if (!groupId) return undefined;

  let hash = 0;
  for (let index = 0; index < groupId.length; index += 1) {
    hash = (hash * 31 + groupId.charCodeAt(index)) | 0;
  }

  return `hsl(${Math.abs(hash) % 360} 78% 55%)`;
};
