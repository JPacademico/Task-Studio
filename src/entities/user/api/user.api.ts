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
export type UploadScope = 'avatars' | 'banners' | 'attachments' | 'notes';

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
