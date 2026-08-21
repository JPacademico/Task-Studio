import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  optimisticNote,
  pendingImageId,
  type CreateNoteRequest,
} from '@/entities/note/lib/optimistic';
import type { Note } from '@/entities/note/model/types';
import { uploadImage } from '@/entities/user/api/user.api';
import { translate } from '@/shared/i18n';

/** Keeps an image note inside a sane box whatever the source resolution is. */
export const fitImage = (naturalWidth: number, naturalHeight: number) => {
  const width = Math.min(320, Math.max(140, naturalWidth));
  const scale = width / (naturalWidth || width);
  return { width: Math.round(width), height: Math.round((naturalHeight || width) * scale) + 28 };
};

interface ImageDropOptions {
  /** Rewrites the board's note list in place — the optimistic cache write. */
  patchNotes: (update: (notes: Note[]) => Note[]) => void;
  /**
   * Persists the real note once the file is in object storage.
   *
   * Typed against React Query's `mutate`, per-call callbacks included: this
   * hook holds a `blob:` URL that must not be revoked until the request that
   * replaces it has settled, and `onSettled` is where it knows.
   */
  createNote: (
    request: CreateNoteRequest,
    options?: { onSettled?: () => void },
  ) => void;
  /** Where on the board a new object lands. */
  dropPoint: () => { positionX: number; positionY: number };
  /** Whose sheet this is, for the attribution stamp on a shared wall. */
  currentUserId: string | undefined;
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
  currentUserId,
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
      const position = dropPoint();

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
        probe.onload = () => resolve(fitImage(probe.naturalWidth, probe.naturalHeight));
        probe.onerror = () => resolve(fitImage(240, 240));
        probe.src = previewUrl;
      });

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
        const uploaded = await uploadImage(file, 'notes');

        /*
         * The sheet stays exactly where it is; the create adopts it.
         *
         * `replacesId` hands this placeholder to the create mutation, which
         * swaps it for the server's row when the response lands and removes it
         * if the request fails. Taking it down here instead — which is what
         * this used to do — put a hole in the wall for the length of the
         * create request, right after the upload had finally finished.
         *
         * The object URL is released on `onSettled` rather than now, because
         * until the swap happens it is still the thing being drawn.
         */
        createNote(
          {
            content: '',
            kind: 'IMAGE',
            imageKey: uploaded.key,
            title,
            rotation,
            ...fitImage(uploaded.width, uploaded.height),
            ...position,
            replacesId: placeholderId,
          },
          { onSettled: () => release(previewUrl) },
        );
      } catch {
        drop();
        release(previewUrl);
        toast.error(translate('editor.uploadFailed'));
      } finally {
        setPendingCount((count) => Math.max(0, count - 1));
      }
    },
    [currentUserId, dropPoint, createNote, patchNotes, release],
  );

  return { addImage, isUploading: pendingCount > 0, pendingCount };
};
