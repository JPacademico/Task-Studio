import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '@/shared/lib/toast';

import {
  optimisticNote,
  pendingImageId,
  type CreateNoteRequest,
} from '@/entities/note/lib/optimistic';
import type { Note } from '@/entities/note/model/types';
import { uploadImage, type UploadedImage } from '@/entities/user/api/user.api';
import { errorMessage } from '@/shared/api/client';
import { translate } from '@/shared/i18n';

/** The caption strip under the picture. */
const CAPTION_HEIGHT = 28;

/**
 * The box the API accepts for any note — `@Min(80) @Max(900)` on both sides of
 * `CreateNoteDto`. An image note is a note, so it has to land inside it too.
 */
const NOTE_MIN = 80;
const NOTE_MAX = 900;

const clampSide = (value: number) => Math.round(Math.min(NOTE_MAX, Math.max(NOTE_MIN, value)));

/**
 * What an image sheet spends around its picture: `p-2` on either side, and the
 * caption row plus the padding above and below it.
 */
const SHEET_PAD_X = 16;
const SHEET_PAD_Y = 16 + CAPTION_HEIGHT;

/** Clear space kept between a dropped picture and the board's own edge. */
const BOARD_EDGE = 16;

/** The visible board, in the same pixels a note's position is stored in. */
export interface BoardSize {
  width: number;
  height: number;
}

/**
 * Keeps an image note inside a sane box whatever the source resolution is.
 *
 * It used to scale by width alone, which is right for an ordinary photo and
 * wrong at both extremes: a long screenshot came out taller than the API's
 * 900px ceiling and a panorama shorter than its 80px floor, and either one
 * made the create fail *after* the upload had finished — the picture went up
 * on the wall, then came down again with an error. Tall pictures are now
 * narrowed until they fit, and the result is clamped to the note limits; the
 * image itself is `object-cover`, so a clamp crops a sliver rather than
 * distorting anything.
 */
export const fitImage = (naturalWidth: number, naturalHeight: number, board?: BoardSize | null) => {
  const sourceWidth = naturalWidth || 240;
  const sourceHeight = naturalHeight || sourceWidth;

  let width = Math.min(320, Math.max(140, sourceWidth));
  let pictureHeight = sourceHeight * (width / sourceWidth);

  if (pictureHeight + CAPTION_HEIGHT > NOTE_MAX) {
    pictureHeight = NOTE_MAX - CAPTION_HEIGHT;
    width = sourceWidth * (pictureHeight / sourceHeight);
  }

  /*
   * And then inside the board that is actually on screen.
   *
   * The API's 900px ceiling is not the board's. A desk is `78dvh` tall — about
   * 560px on a laptop — so a long screenshot could arrive a perfectly valid
   * 320×900 and still hang off the bottom of the wall, cropped by the board's
   * own border, leaving the reader to hunt for a corner handle they could not
   * see in order to shrink it back into view. Scaling it down here means every
   * picture lands whole, whatever its shape.
   *
   * Measured against what the sheet really draws: the picture fills the width
   * inside the sheet's padding, and the caption row sits above it. The scale
   * is applied to the picture alone, so the chrome keeps its size and the
   * aspect ratio is untouched.
   */
  if (board && board.width > 0 && board.height > 0) {
    const room = {
      width: board.width - BOARD_EDGE * 2 - SHEET_PAD_X,
      height: board.height - BOARD_EDGE * 2 - SHEET_PAD_Y,
    };
    const pictureWidth = width - SHEET_PAD_X;
    const drawnHeight = sourceHeight * (pictureWidth / sourceWidth);
    const scale = Math.min(1, room.width / pictureWidth, room.height / drawnHeight);

    if (scale < 1) {
      width = pictureWidth * scale + SHEET_PAD_X;
      pictureHeight = drawnHeight * scale;
    }
  }

  return { width: clampSide(width), height: clampSide(pictureHeight + CAPTION_HEIGHT) };
};

/**
 * Nudges a drop point so the whole sheet is on the board.
 *
 * The drop point is chosen before anybody knows how big the picture is — near
 * the top, near the middle — and a tall picture dropped 180px down a 560px
 * board would still run off the bottom even at a size that fits. Moving the
 * point is cheaper than shrinking the picture further.
 */
const placeInside = (
  point: { positionX: number; positionY: number },
  size: { width: number; height: number },
  board: BoardSize | null,
) => {
  if (!board) return point;

  const within = (value: number, extent: number, limit: number) =>
    Math.round(Math.max(BOARD_EDGE, Math.min(value, limit - extent - BOARD_EDGE)));

  return {
    positionX: within(point.positionX, size.width, board.width),
    positionY: within(point.positionY, size.height, board.height),
  };
};

interface ImageDropOptions {
  /** Rewrites the board's note list in place — the optimistic cache write. */
  patchNotes: (update: (notes: Note[]) => Note[]) => void;
  /**
   * Persists the real note once the file is in object storage.
   *
   * Typed against React Query's `mutateAsync`, not `mutate`. This hook holds a
   * `blob:` URL that must not be revoked until the request that replaces it
   * has settled, and it hands the server's note to `onCreated` — and TanStack
   * only runs `mutate`'s per-call callbacks for the *latest* call. Three
   * pictures dropped together were three calls, so the first two never heard
   * back: their previews stayed pinned in memory until the board unmounted,
   * and anything they had to report was lost. A promise per call answers each
   * one. Failures are the mutation's own business (it takes the placeholder
   * down and says why), so they are swallowed here.
   */
  createNote: (request: CreateNoteRequest) => Promise<Note>;
  /** Where on the board a new object lands. */
  dropPoint: () => { positionX: number; positionY: number };
  /**
   * The board's visible size, read at the moment of the drop.
   *
   * A picture is scaled and placed to land wholly inside it — see `fitImage`.
   * Null (or absent) keeps the API's own limits as the only bound.
   */
  boardSize?: () => BoardSize | null;
  /** Whose sheet this is, for the attribution stamp on a shared wall. */
  currentUserId: string | undefined;
  /**
   * How the file reaches the bucket. `uploadImage` into the `notes` scope by
   * default; the project whiteboard passes one that first asks whether the
   * picture is already stored — see `UploadImageOptions.reuse`.
   */
  upload?: (file: File) => Promise<UploadedImage>;
  /** Called with the server's note once the picture is really on the wall. */
  onCreated?: (note: Note) => void;
}

/**
 * Pinning a photograph, without waiting for the photograph.
 *
 * ## What this replaces
 *
 * Both boards did the obvious thing: `await uploadImage(file)`, then create the
 * note from the key it returns. Correct, and it meant the board showed nothing
 * at all for the length of a downscale plus an upload to R2 — which on a phone
 * photograph over a phone connection is several seconds of a spinner in the
 * toolbar and an unchanged, apparently unresponsive wall. The one piece of
 * feedback that mattered — *the picture is going here* — was the last thing to
 * arrive.
 *
 * ## What it does instead
 *
 * The file is readable locally the instant it is chosen, so the sheet goes up
 * immediately with a `blob:` URL and its real dimensions, and the upload
 * happens underneath it. When the key comes back the placeholder is swapped for
 * a real note; if the upload fails the placeholder is taken down and the user
 * is told, which is the same outcome as before minus the waiting.
 *
 * Several can be in flight at once — picking three images is one gesture, not
 * three — so the placeholders are keyed individually rather than tracked with a
 * single `isUploading` flag.
 *
 * ## About the object URLs
 *
 * Every `createObjectURL` pins the whole decoded file in memory until it is
 * revoked, and a board is somewhere people pin a lot of photographs. They are
 * revoked when the placeholder is resolved and, as a backstop, when the
 * component unmounts with uploads still running.
 */
export const useImageDrop = ({
  patchNotes,
  createNote,
  dropPoint,
  boardSize,
  currentUserId,
  upload,
  onCreated,
}: ImageDropOptions) => {
  const [pendingCount, setPendingCount] = useState(0);
  const objectUrls = useRef(new Set<string>());

  useEffect(() => {
    const urls = objectUrls.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  const release = useCallback((url: string) => {
    if (!objectUrls.current.delete(url)) return;
    URL.revokeObjectURL(url);
  }, []);

  const addImage = useCallback(
    async (file: File) => {
      const placeholderId = pendingImageId();
      const previewUrl = URL.createObjectURL(file);
      objectUrls.current.add(previewUrl);

      const title = file.name.replace(/\.[^.]+$/, '').slice(0, 60);
      const rotation = Math.round((Math.random() * 5 - 2.5) * 10) / 10;
      // Read once: the board the picture was dropped on is the one it is
      // fitted to, even if the window is resized while it uploads.
      const board = boardSize?.() ?? null;

      setPendingCount((count) => count + 1);

      /*
       * The browser's own measurement, not the server's.
       *
       * `uploadImage` reports the dimensions of what it produced, which is the
       * authoritative answer — but it does not have one until it is finished,
       * and the point of this is to draw the sheet before then. Decoding the
       * file for its size is cheap next to encoding and uploading it, and the
       * downscale preserves the aspect ratio, so the box measured here is the
       * box the real note ends up with.
       */
      const measured = await new Promise<{ width: number; height: number }>((resolve) => {
        const probe = new Image();
        probe.onload = () => resolve(fitImage(probe.naturalWidth, probe.naturalHeight, board));
        probe.onerror = () => resolve(fitImage(240, 240, board));
        probe.src = previewUrl;
      });

      /*
       * Placed by the sheet as drawn, not by the stored box: a note's `height`
       * is the picture plus its caption, and the sheet adds its own padding
       * around both. Measured against the stored box, a picture fitted to the
       * board landed with its bottom edge on the border instead of inside it.
       */
      const drawn = { width: measured.width, height: measured.height + SHEET_PAD_Y - CAPTION_HEIGHT };
      const position = placeInside(dropPoint(), drawn, board);

      /*
       * Built through the shared placeholder factory, with the two fields an
       * image note owns on top: the local `blob:` preview and the measured box.
       */
      const placeholder: Note = {
        ...optimisticNote(
          { content: '', title, rotation, ...measured, ...position },
          { id: placeholderId, userId: currentUserId, scope: 'PERSONAL' },
        ),
        kind: 'IMAGE',
        color: '#ffffff',
        imageUrl: previewUrl,
      };

      patchNotes((notes) => [...notes, placeholder]);

      const drop = () => patchNotes((notes) => notes.filter((note) => note.id !== placeholderId));

      try {
        const uploaded = await (upload ? upload(file) : uploadImage(file, 'notes'));

        /*
         * The sheet stays exactly where it is; the create adopts it.
         *
         * `replacesId` hands this placeholder to the create mutation, which
         * swaps it for the server's row when the response lands and removes it
         * if the request fails. Taking it down here instead — which is what
         * this used to do — put a hole in the wall for the length of the
         * create request, right after the upload had finally finished.
         *
         * The object URL is released once the create settles rather than now,
         * because until the swap happens it is still the thing being drawn.
         */
        void createNote({
          content: '',
          kind: 'IMAGE',
          imageKey: uploaded.key,
          title,
          rotation,
          ...fitImage(uploaded.width, uploaded.height, board),
          ...position,
          replacesId: placeholderId,
        })
          .then((note) => onCreated?.(note))
          .catch(() => undefined)
          .finally(() => release(previewUrl));
      } catch (error) {
        drop();
        release(previewUrl);
        // The reason, where there is one worth reading — a blocked bucket, a
        // file the API refused, the upload rate limit — rather than the same
        // sentence for all of them.
        toast.error(errorMessage(error, translate('editor.uploadFailed')));
      } finally {
        setPendingCount((count) => Math.max(0, count - 1));
      }
    },
    [boardSize, currentUserId, dropPoint, createNote, onCreated, patchNotes, release, upload],
  );

  return { addImage, isUploading: pendingCount > 0, pendingCount };
};
