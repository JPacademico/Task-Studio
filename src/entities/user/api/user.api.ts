import { api } from '@/shared/api/client';
import { prepareImage } from '@/shared/lib/prepare-image';
import type { CurrentUser, ThemePreference, ThemeSkin, UserSummary } from '../model/types';

export interface PresignedUpload {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  expiresIn: number;
}

export const userApi = {
  async me(): Promise<CurrentUser> {
    const { data } = await api.get<CurrentUser>('/users/me');
    return data;
  },

  async updateProfile(payload: {
    displayName?: string;
    bio?: string;
    theme?: ThemePreference;
    themeSkin?: ThemeSkin;
  }): Promise<CurrentUser> {
    const { data } = await api.patch<CurrentUser>('/users/me', payload);
    return data;
  },

  async search(query: string): Promise<UserSummary[]> {
    if (query.trim().length < 2) return [];
    const { data } = await api.get<UserSummary[]>('/users/search', {
      params: { q: query.trim() },
    });
    return data;
  },

  async setAvatar(key: string): Promise<CurrentUser> {
    const { data } = await api.put<CurrentUser>('/users/me/avatar', { key });
    return data;
  },

  async removeAvatar(): Promise<CurrentUser> {
    const { data } = await api.delete<CurrentUser>('/users/me/avatar');
    return data;
  },
};

/**
 * Two-step upload: the API only signs the request, the bytes go straight from
 * the browser to Cloudflare R2. The API never proxies media.
 */
export type UploadScope = 'avatars' | 'banners' | 'attachments' | 'notes' | 'files';

/** Signs one object and PUTs one blob. The primitive both uploads build on. */
const putObject = async (
  blob: Blob,
  scope: UploadScope,
): Promise<{ key: string; publicUrl: string }> => {
  const { data: presigned } = await api.post<PresignedUpload>('/storage/uploads', {
    scope,
    mimeType: blob.type,
    sizeBytes: blob.size,
  });

  const response = await fetch(presigned.uploadUrl, {
    method: 'PUT',
    body: blob,
    headers: { 'Content-Type': blob.type },
  });

  if (!response.ok) throw new Error('Upload to storage failed.');

  return { key: presigned.key, publicUrl: presigned.publicUrl };
};

export interface UploadedImage {
  key: string;
  publicUrl: string;
  /**
   * Small rendition. Null unless the caller asked for one — see
   * `PreparedImage.thumb` for why nothing asks yet.
   */
  thumbKey: string | null;
  thumbUrl: string | null;
  width: number;
  height: number;
}

export interface UploadImageOptions {
  /** Also upload a small rendition. Costs a second object and a second presign. */
  thumbnail?: boolean;
}

/**
 * Uploads a picked image, downscaled and re-encoded first.
 *
 * The original file is never sent. `prepareImage` turns it into a capped WebP
 * — see the note there for why that happens in the browser rather than on the
 * API — and it is that, not the file the user chose, which is signed and PUT.
 *
 * The thumbnail is off by default and deliberately so. Each rendition is a
 * separate object and therefore a separate presigned request, and
 * `/storage/uploads` now carries the tightest rate limit in the app precisely
 * because signing is the cheapest way to fill a bucket. Paying that twice for a
 * rendition nothing currently renders would be spending the budget this change
 * exists to defend.
 *
 * If the browser cannot decode the file at all the error propagates: better a
 * clear failure than an object in the bucket nothing can ever render.
 */
export const uploadImage = async (
  file: File,
  scope: UploadScope,
  { thumbnail = false }: UploadImageOptions = {},
): Promise<UploadedImage> => {
  const prepared = await prepareImage(file, { thumbnail });

  const display = await putObject(prepared.display, scope);
  const thumb = prepared.thumb ? await putObject(prepared.thumb, scope) : null;

  return {
    key: display.key,
    publicUrl: display.publicUrl,
    thumbKey: thumb?.key ?? null,
    thumbUrl: thumb?.publicUrl ?? null,
    width: prepared.width,
    height: prepared.height,
  };
};

/**
 * What the `files` scope accepts, and what to put in an `<input accept>`.
 *
 * Mirrors the API's own allow-list, which is the thing that actually enforces
 * it — this exists so the file picker offers the right files rather than
 * letting somebody choose a 40 MB video and learn about the rule from a 503.
 */
export const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
] as const;

export const DOCUMENT_ACCEPT = `${DOCUMENT_MIME_TYPES.join(',')},.pdf,.docx,.doc`;

/** The `files` scope's ceiling on the API. Checked here so the error is local. */
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export interface UploadedFile {
  key: string;
  publicUrl: string;
  /** The name the user's own filesystem gave it — the object key is a UUID. */
  name: string;
  size: number;
}

/**
 * Uploads a document — a PDF or a Word file — exactly as it was chosen.
 *
 * Deliberately *not* `uploadImage`. That one re-encodes what it is given
 * before sending it, which is right for a photograph and catastrophic for a
 * document: there is nothing useful a canvas can do to a signed PDF, and the
 * whole point of attaching one is that the bytes the reader downloads are the
 * bytes the author attached. So this is `putObject` and nothing else.
 *
 * The two guards here are duplicates of the API's, on purpose. The API is what
 * enforces them — a client check is a courtesy, not a control — but a person
 * who picked the wrong file should find out from the form they are looking at
 * rather than from a failed request after the upload has already started.
 */
export const uploadFile = async (file: File): Promise<UploadedFile> => {
  if (!(DOCUMENT_MIME_TYPES as readonly string[]).includes(file.type)) {
    throw new Error('Only PDF and Word documents can be attached.');
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new Error('Documents must be 10 MB or smaller.');
  }

  const uploaded = await putObject(file, 'files');

  return {
    key: uploaded.key,
    publicUrl: uploaded.publicUrl,
    name: file.name,
    size: file.size,
  };
};
