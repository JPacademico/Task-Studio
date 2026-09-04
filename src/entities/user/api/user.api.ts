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

  /**
   * Report somebody to whoever runs this deployment.
   *
   * Nothing about the subject comes back — not a count, not whether anybody
   * else has reported them — because every such field is a fact about somebody
   * else that a stranger could enumerate by reporting people one at a time.
   * Reporting the same person twice replaces the reason rather than adding a
   * second report; see `UserReport` on the API.
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
export type UploadScope =
  | 'avatars'
  | 'banners'
  | 'attachments'
  | 'notes'
  | 'files'
  /**
   * A board export waiting to be read by an importer.
   *
   * The one scope whose objects are temporary by contract: the importer
   * deletes the file as soon as the job ends, whichever way it ends.
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

/**
 * What a **text board** will import, in three kinds.
 *
 * Wider than a task attachment on one side and narrower on the other, and the
 * split is by what the board can *do* with the thing rather than by format
 * family:
 *
 *   - **Documents.** Plain text is here, because a `.txt` becomes an editable
 *     page with no model involved at all. `.doc`, the pre-2007 binary, is
 *     deliberately not: it can be *attached* to a task, where nothing has to
 *     read it, and it cannot become a page, where something does. The honest
 *     answer to somebody holding one is "save it as .docx".
 *   - **Pictures.** A screenshot, a mockup, a scanned page — things the board
 *     can show at full size, behind the project's own access rules, with
 *     nothing having interpreted them. Re-encoded before upload; see
 *     `uploadImportFile`.
 *   - **Archives.** A `.zip`, whose *contents* the board lists and whose files
 *     are still the download they always were.
 *
 * `image/svg+xml` is absent and must stay absent: an SVG is a document with
 * script in it, and an imported file is served back through the API's own
 * origin.
 */
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
 * The `accept` for the picker, mimes *and* extensions.
 *
 * Both spellings, because neither alone is enough. A machine with no Office
 * installed reports `''` for a `.docx`, and Windows has no registered type for
 * a `.zip` unless something claimed it — so a mime-only `accept` greys out
 * perfectly ordinary files. The extensions cover those; the mimes cover the
 * phones that report a type and no extension.
 */
export const IMPORT_ACCEPT = `${IMPORT_MIME_TYPES.join(
  ',',
)},.txt,.pdf,.docx,.png,.jpg,.jpeg,.webp,.zip`;

/** The `files` scope's document ceiling on the API. Checked here so the error is local. */
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

/**
 * And the archive one, which is larger because an archive is a *set* of files.
 *
 * Twelve, matching `MAX_ARCHIVE_BYTES` on the API — the number a person reads
 * in an error has to be the number that is actually enforced, or the second
 * attempt fails for a reason the first one did not mention.
 */
export const MAX_ARCHIVE_BYTES = 12 * 1024 * 1024;

/**
 * How large a *picked* picture may be, which is not what gets uploaded.
 *
 * A photograph never reaches the bucket as it was chosen: `prepareImage`
 * decodes it, caps it at 1600px on the long edge and re-encodes it as WebP, so
 * a 6 MB phone photo arrives as a couple of hundred kilobytes. The ceiling
 * that matters for storage is therefore met by construction, and this one
 * exists for a different reason entirely — decoding happens on the user's own
 * device, and a 60 MB scan will hang a mid-range phone long before it fails.
 *
 * Generous, because it is protecting a decode rather than a quota.
 */
export const MAX_IMAGE_SOURCE_BYTES = 32 * 1024 * 1024;

/**
 * What the operating system said the file was, or what its name implies.
 *
 * `File.type` is a hint, not a fact: it comes from the OS's own extension
 * registry, and a machine with no Office installed routinely reports `''` for
 * a `.docx` — at which point an allow-list check on the type alone rejects a
 * perfectly good Word file with "only PDF and Word documents". Falling back to
 * the extension is not a weakening of the rule: the API re-derives the type
 * from the presign request and refuses anything outside its own list, and the
 * bytes are never trusted here either way.
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
 * A file the board will not take, and the reason in a form the UI can render.
 *
 * ## Why a code rather than a sentence
 *
 * This used to throw `new Error('Only PDF, Word (.docx) and plain-text files
 * can be imported.')`, which was fine while the only surface was a file picker
 * that showed the message in a toast — and became wrong the moment files could
 * be *dropped*. A drop needs its refusal on the drop target, in the reader's
 * own language, while the pointer is still over it; an English string thrown
 * from an API module can be neither translated nor shown early.
 *
 * So the rule stays here — it has to, it is the same rule the upload enforces
 * — and the wording moves to the interface. `limitBytes` travels with it
 * because "too large" without a number is an error that does not say what to
 * do next.
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
 * Whether the board will take this file, decided without reading a byte of it.
 *
 * Shared by the picker and the drop target so the two cannot disagree, and
 * called *before* anything is uploaded so a wrong file costs nothing. The API
 * enforces every one of these rules again — a client check is a courtesy, not
 * a control — but somebody who picked the wrong file should find out from the
 * surface they are looking at rather than from a failed request.
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
 * What an import actually stored, which is not always what was picked.
 *
 * A picture is re-encoded on the way (see `uploadImportFile`), so three of
 * these can differ from the file on the user's disk: the extension, the mime
 * and — by an order of magnitude — the size. `originalSize` is kept so the
 * interface can say what that bought rather than quietly changing somebody's
 * file behind their back.
 */
export interface ImportedUpload extends UploadedFile {
  mime: string;
  kind: ImportKind;
  /** Bytes of the file as chosen. Equal to `size` for anything not re-encoded. */
  originalSize: number;
}

/**
 * Uploads a document exactly as it was chosen, against a given allow-list.
 *
 * Deliberately *not* `uploadImage`. That one re-encodes what it is given
 * before sending it, which is right for a photograph and catastrophic for a
 * document: there is nothing useful a canvas can do to a signed PDF, and the
 * whole point of attaching one is that the bytes the reader downloads are the
 * bytes the author attached. So this is `putObject` and nothing else.
 *
 * The guards here are duplicates of the API's, on purpose. The API is what
 * enforces them — a client check is a courtesy, not a control — but a person
 * who picked the wrong file should find out from the form they are looking at
 * rather than from a failed request after the upload has already started.
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

  /*
   * Re-wrapped when the OS gave no type of its own.
   *
   * `putObject` signs the presign for `blob.type` and PUTs with that same
   * `Content-Type`, so an empty one would sign a request the API's allow-list
   * rejects — and, if it somehow did not, store an object R2 serves as
   * `application/octet-stream` forever. A `Blob` copy is the cheapest way to
   * attach the type we resolved; it does not re-encode anything.
   */
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
 * Uploads a file that is about to become a page on a text board.
 *
 * ## Documents and archives: byte for byte
 *
 * Nothing is re-encoded. There is nothing useful a canvas can do to a signed
 * PDF, and the whole point of putting one on a board is that what a colleague
 * downloads is what the author uploaded — the argument `uploadFile` makes for
 * attachments, unchanged. An archive is that case twice over: repacking
 * somebody's zip would change the checksum of a thing whose entire purpose is
 * being passed on intact.
 *
 * ## Pictures: never as they were picked
 *
 * A photograph is decoded, capped at 1600px on the long edge and re-encoded as
 * WebP before it is signed for — `prepareImage`, the same path a board note's
 * image takes and for the reasons spelled out there. A 6 MB phone photo
 * becomes a couple of hundred kilobytes, which is the difference between a
 * bucket that holds a year of screenshots and one that holds a month, and it
 * is paid for three times over: storage, every reader's download, and the
 * decode on every render.
 *
 * Three things fall out of that round trip beyond the size. The metadata is
 * gone, so a photograph stops carrying the coordinates of where it was taken.
 * An animated GIF or a multi-frame WebP becomes one still, which is what a
 * document page wants anyway. And the work happens on the device that already
 * has the decoder and the idle time, rather than on a 512 MB container.
 *
 * The stored filename takes the extension it now really has, because a
 * `screenshot.png` served as WebP lies about itself in every downloads folder
 * it lands in. The page is titled from the name with the extension stripped
 * either way, so nothing the reader sees changes.
 *
 * If the browser cannot decode the picture at all the error propagates rather
 * than falling back to the original: an object the bucket accepts and nothing
 * can render is worse than a clear refusal.
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
 * The MIME types a board export arrives as.
 *
 * Longer than it looks like it should be, and every entry is a real browser's
 * real answer for a file a person picked. Windows with no Excel installed
 * reports a `.csv` as `text/plain`; Windows *with* Excel reports it as
 * `application/vnd.ms-excel`; Safari has its own opinion again. Refusing the
 * odd ones would make the feature fail for exactly the people most likely to
 * be migrating off a spreadsheet.
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
 * Uploads a board export, on its way to becoming a project.
 *
 * ## Why the type is resolved from the extension when the browser has no idea
 *
 * `putObject` signs the presign for `blob.type` and PUTs with that same
 * `Content-Type`, so a file the OS reported as `''` would sign a request the
 * API's allow-list rejects — with an error about MIME types, for somebody who
 * picked a perfectly ordinary `.csv`. The extension is the only signal left at
 * that point, and it is the one the user themselves can see.
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
