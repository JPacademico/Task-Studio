import { api } from '@/shared/api/client';
import { translate } from '@/shared/i18n';
import { prepareImage } from '@/shared/lib/prepare-image';
import { md5OfBlob } from '@/shared/lib/md5';
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

  /**
   * Report somebody to whoever runs this deployment. Nothing about the subject comes back — not a
   * count, not whether anybody else has reported them.
   */
  async report(userId: string, payload: { reason: string; projectId?: string }): Promise<void> {
    await api.post(`/users/${userId}/report`, payload);
  },

  /** Whether *this* reader has a standing report against that person. */
  async reportStatus(userId: string): Promise<boolean> {
    const { data } = await api.get<{ reported: boolean }>(`/users/${userId}/report`);
    return data.reported;
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

  /** The first-run tour is done, finished or skipped. Idempotent. */
  async completeTutorial(): Promise<CurrentUser> {
    const { data } = await api.post<CurrentUser>('/users/me/tutorial');
    return data;
  },

  async setAvatar(key: string): Promise<CurrentUser> {
    const { data } = await api.put<CurrentUser>('/users/me/avatar', { key });
    return data;
  },

  /** Starts the 24-hour countdown to deleting this account. */
  async scheduleDeletion(payload: { confirmEmail: string; password?: string }): Promise<CurrentUser> {
    const { data } = await api.post<CurrentUser>('/users/me/deletion', payload);
    return data;
  },

  /** Keeps the account: cancels a scheduled deletion. */
  async cancelDeletion(): Promise<CurrentUser> {
    const { data } = await api.delete<CurrentUser>('/users/me/deletion');
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
export type UploadScope =
  | 'avatars'
  | 'banners'
  | 'attachments'
  | 'notes'
  | 'files'
  /**
   * A board export waiting to be read by an importer. The one scope whose objects are temporary by
   * contract: the importer deletes the file as soon as the job ends, whichever way it ends.
   */
  | 'imports';

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

  let response: Response;
  try {
    response = await fetch(presigned.uploadUrl, {
      method: 'PUT',
      body: blob,
      headers: { 'Content-Type': blob.type },
    });
  } catch {
    // The PUT never produced a response at all. With a presign already in hand — so the API is
    // reachable and this session is fine.
    console.error(
      `[task-studio] Object storage refused an upload from ${window.location.origin}. ` +
        "Add this origin to the R2 bucket's CORS policy (methods PUT and GET, header content-type).",
    );
    throw new Error(translate('upload.storageBlocked'));
  }

  if (!response.ok) throw new Error(translate('upload.storageFailed'));

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
  /**
   * Asks whether these exact bytes are already stored, before sending them. Handed the MD5 of the
   * *prepared* file — the WebP that would be uploaded, not the original.
   */
  reuse?: (md5: string) => Promise<{ key: string; publicUrl: string } | null>;
}

/**
 * Uploads a picked image, downscaled and re-encoded first. The original file is never sent.
 * `prepareImage` turns it into a capped WebP.
 */
export const uploadImage = async (
  file: File,
  scope: UploadScope,
  { thumbnail = false, reuse }: UploadImageOptions = {},
): Promise<UploadedImage> => {
  const prepared = await prepareImage(file, { thumbnail });

  // Already stored?
  if (reuse && !thumbnail) {
    const existing = await md5OfBlob(prepared.display)
      .then(reuse)
      .catch(() => null);

    if (existing) {
      return {
        key: existing.key,
        publicUrl: existing.publicUrl,
        thumbKey: null,
        thumbUrl: null,
        width: prepared.width,
        height: prepared.height,
      };
    }
  }

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

/** What the `files` scope accepts, and what to put in an `<input accept>`. */
export const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
] as const;

export const DOCUMENT_ACCEPT = `${DOCUMENT_MIME_TYPES.join(',')},.pdf,.docx,.doc`;

/** What a **text board** will import, in three kinds. */
export const IMPORT_DOCUMENT_MIME = [
  'text/plain',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export const IMPORT_IMAGE_MIME = ['image/png', 'image/jpeg', 'image/webp'] as const;

export const IMPORT_ARCHIVE_MIME = ['application/zip'] as const;

export const IMPORT_MIME_TYPES = [
  ...IMPORT_DOCUMENT_MIME,
  ...IMPORT_IMAGE_MIME,
  ...IMPORT_ARCHIVE_MIME,
] as const;

/**
 * The `accept` for the picker, mimes *and* extensions. Both spellings, because neither alone is
 * enough.
 */
export const IMPORT_ACCEPT = `${IMPORT_MIME_TYPES.join(
  ',',
)},.txt,.pdf,.docx,.png,.jpg,.jpeg,.webp,.zip`;

/** The `files` scope's document ceiling on the API. Checked here so the error is local. */
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

/**
 * And the archive one, which is larger because an archive is a *set* of files. Twelve, matching
 * `MAX_ARCHIVE_BYTES` on the API.
 */
export const MAX_ARCHIVE_BYTES = 12 * 1024 * 1024;

/**
 * How large a *picked* picture may be, which is not what gets uploaded. A photograph never reaches
 * the bucket as it was chosen.
 */
export const MAX_IMAGE_SOURCE_BYTES = 32 * 1024 * 1024;

/**
 * What the operating system said the file was, or what its name implies. `File.type` is a hint, not
 * a fact: it comes from the OS's own extension registry.
 */
const EXTENSION_MIME: Record<string, string> = {
  txt: 'text/plain',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  zip: 'application/zip',
};

export const resolveFileMime = (file: File): string => {
  if (file.type) return file.type;

  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_MIME[extension] ?? '';
};

/** Which of the three things an importable file is. Decides what happens to it. */
export type ImportKind = 'document' | 'image' | 'archive';

/** Why a file was refused, as a code the interface can phrase. */
export type ImportRejectionReason = 'type' | 'empty' | 'tooLarge';

/**
 * A file the board will not take, and the reason in a form the UI can render. This used to throw
 * `new Error('Only PDF, Word (.docx) and plain-text files can be imported.')`.
 */
export class ImportRejection extends Error {
  constructor(
    readonly reason: ImportRejectionReason,
    readonly limitBytes?: number,
  ) {
    super(`import-rejected:${reason}`);
    this.name = 'ImportRejection';
  }
}

/**
 * Whether the board will take this file, decided without reading a byte of it. Shared by the picker
 * and the drop target so the two cannot disagree.
 */
export const classifyImportFile = (
  file: File,
): { kind: ImportKind; mime: string } | { rejection: ImportRejection } => {
  const mime = resolveFileMime(file);

  const kind: ImportKind | null = (IMPORT_IMAGE_MIME as readonly string[]).includes(mime)
    ? 'image'
    : (IMPORT_ARCHIVE_MIME as readonly string[]).includes(mime)
      ? 'archive'
      : (IMPORT_DOCUMENT_MIME as readonly string[]).includes(mime)
        ? 'document'
        : null;

  if (!kind) return { rejection: new ImportRejection('type') };
  if (file.size === 0) return { rejection: new ImportRejection('empty') };

  const ceiling =
    kind === 'archive'
      ? MAX_ARCHIVE_BYTES
      : kind === 'image'
        ? MAX_IMAGE_SOURCE_BYTES
        : MAX_DOCUMENT_BYTES;

  if (file.size > ceiling) return { rejection: new ImportRejection('tooLarge', ceiling) };

  return { kind, mime };
};

export interface UploadedFile {
  key: string;
  publicUrl: string;
  /** The name the user's own filesystem gave it — the object key is a UUID. */
  name: string;
  size: number;
}

/**
 * What an import actually stored, which is not always what was picked. A picture is re-encoded on
 * the way (see `uploadImportFile`), so three of these can differ from the file on the user's disk.
 */
export interface ImportedUpload extends UploadedFile {
  mime: string;
  kind: ImportKind;
  /** Bytes of the file as chosen. Equal to `size` for anything not re-encoded. */
  originalSize: number;
}

/**
 * Uploads a document exactly as it was chosen, against a given allow-list. Deliberately *not*
 * `uploadImage`.
 */
const putDocument = async (
  file: File,
  allowed: readonly string[],
  rejection: string,
): Promise<UploadedFile> => {
  const mimeType = resolveFileMime(file);

  if (!allowed.includes(mimeType)) throw new Error(rejection);
  if (file.size === 0) throw new Error('That file is empty.');
  if (file.size > MAX_DOCUMENT_BYTES) throw new Error('Documents must be 10 MB or smaller.');

  // Re-wrapped when the OS gave no type of its own. `putObject` signs the presign for `blob.type`
  // and PUTs with that same `Content-Type`.
  const blob = file.type ? file : new Blob([file], { type: mimeType });
  const uploaded = await putObject(blob, 'files');

  return {
    key: uploaded.key,
    publicUrl: uploaded.publicUrl,
    name: file.name,
    size: file.size,
  };
};

export const uploadFile = (file: File): Promise<UploadedFile> =>
  putDocument(file, DOCUMENT_MIME_TYPES, 'Only PDF and Word documents can be attached.');

/** `photo.png` becomes `photo.webp`: the stored file gets the extension it has. */
const withExtension = (name: string, extension: string): string =>
  `${name.replace(/\.[a-z0-9]+$/i, '')}.${extension}`;

/**
 * Uploads a file that is about to become a page on a text board. Nothing is re-encoded. There is
 * nothing useful a canvas can do to a signed PDF.
 */
export const uploadImportFile = async (file: File): Promise<ImportedUpload> => {
  const classified = classifyImportFile(file);
  if ('rejection' in classified) throw classified.rejection;

  const { kind, mime } = classified;

  if (kind !== 'image') {
    const blob = file.type ? file : new Blob([file], { type: mime });
    const uploaded = await putObject(blob, 'files');

    return {
      ...uploaded,
      name: file.name,
      size: file.size,
      originalSize: file.size,
      mime,
      kind,
    };
  }

  const prepared = await prepareImage(file);
  const uploaded = await putObject(prepared.display, 'files');

  return {
    ...uploaded,
    name: withExtension(file.name, 'webp'),
    size: prepared.display.size,
    originalSize: file.size,
    mime: 'image/webp',
    kind,
  };
};

/**
 * The MIME types a board export arrives as. Longer than it looks like it should be, and every entry
 * is a real browser's real answer for a file a person picked.
 */
const BOARD_EXPORT_MIME = [
  'application/json',
  'text/csv',
  'application/csv',
  'text/plain',
  'application/vnd.ms-excel',
];

/** Board exports are text, and five megabytes of it is fifty thousand cards. */
const MAX_BOARD_EXPORT_BYTES = 5 * 1024 * 1024;

/**
 * Uploads a board export, on its way to becoming a project. `putObject` signs the presign for
 * `blob.type` and PUTs with that same `Content-Type`.
 */
export const uploadBoardExport = async (file: File): Promise<UploadedFile> => {
  if (file.size === 0) throw new Error('That file is empty.');
  if (file.size > MAX_BOARD_EXPORT_BYTES) {
    throw new Error('Board exports must be 5 MB or smaller.');
  }

  const mimeType =
    file.type ||
    (file.name.toLowerCase().endsWith('.json') ? 'application/json' : 'text/csv');

  if (!BOARD_EXPORT_MIME.includes(mimeType)) {
    throw new Error('Board imports take a .json or .csv export.');
  }

  const blob = file.type ? file : new Blob([file], { type: mimeType });
  const uploaded = await putObject(blob, 'imports');

  return {
    key: uploaded.key,
    publicUrl: uploaded.publicUrl,
    name: file.name,
    size: file.size,
  };
};
