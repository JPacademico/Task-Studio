import { useState } from 'react';
import { Download, FileText, Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';

import {
  DOCUMENT_ACCEPT,
  uploadFile,
  type UploadedFile,
} from '@/entities/user/api/user.api';
import type { AttachedFile, AttachedFileDraft } from '@/entities/user/model/types';
import { cn } from '@/shared/lib/cn';
import { useT } from '@/shared/i18n';
import { Spinner } from './primitives';

/**
 * "3.2 MB", "740 KB" — the number a person decides with.
 *
 * Decimal units rather than binary, because the file manager the reader will
 * compare this against says the same thing, and being technically right about
 * mebibytes only makes the two disagree.
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1000 * 1000) return `${Math.round(bytes / 1000)} KB`;
  return `${(bytes / (1000 * 1000)).toFixed(1)} MB`;
};

/** `report.docx` → `DOCX`. The badge on the row, so the format is legible. */
const extensionOf = (name: string): string => {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toUpperCase().slice(0, 4) : 'FILE';
};

interface FileAttachmentFieldProps {
  label: string;
  /** What is on the form now — either loaded from the row or just uploaded. */
  value: AttachedFileDraft | null;
  onChange: (next: AttachedFileDraft | null) => void;
  className?: string;
}

/**
 * Pick a document, or take one off.
 *
 * The picture attachment beside it re-encodes what it is handed before
 * uploading — see `prepareImage` — and this deliberately does not: there is
 * nothing useful to do to a signed PDF, and the point of attaching one is that
 * the reader downloads the bytes the author attached. What it borrows from the
 * image field is everything else: the same two-step presigned upload so the
 * bytes never transit the API, the same "one attachment, replace or remove"
 * shape, and the same dashed drop target when the slot is empty.
 *
 * Never a preview. A PDF rendered inline is a second document viewer to build
 * and a megabyte to fetch before anybody has said they want it; the row says
 * what the file is, how big it is, and offers to open it.
 */
export const FileAttachmentField = ({
  label,
  value,
  onChange,
  className,
}: FileAttachmentFieldProps) => {
  const t = useT();
  const [isUploading, setIsUploading] = useState(false);

  const handlePick = async (file: File) => {
    setIsUploading(true);
    try {
      const uploaded: UploadedFile = await uploadFile(file);
      onChange({
        key: uploaded.key,
        name: uploaded.name,
        size: uploaded.size,
        url: uploaded.publicUrl,
      });
      toast.success(t('file.attached'));
    } catch (error) {
      // `uploadFile` throws its own words for the two client-side rules (wrong
      // type, too large); anything else is the network or the bucket.
      toast.error(error instanceof Error ? error.message : t('file.uploadFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs font-medium text-content-muted">{label}</p>

      {value ? (
        <FileAttachmentRow
          file={value}
          onRemove={() => onChange(null)}
          removeLabel={t('file.remove')}
        />
      ) : (
        <label
          className={cn(
            'flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-edge',
            'px-4 py-5 text-xs text-content-muted transition-colors hover:border-brand hover:text-brand',
          )}
        >
          {isUploading ? <Spinner /> : <Paperclip className="h-4 w-4" />}
          {isUploading ? t('settings.uploading') : t('file.attach')}
          <input
            type="file"
            accept={DOCUMENT_ACCEPT}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handlePick(file);
              // Reset, so picking the same file twice still fires a change.
              event.target.value = '';
            }}
          />
        </label>
      )}

      <p className="text-2xs leading-relaxed text-content-faint">{t('file.hint')}</p>
    </div>
  );
};

interface FileAttachmentRowProps {
  file: AttachedFile | AttachedFileDraft;
  /** Omitted where the file is only being read — a task sheet, an agenda row. */
  onRemove?: () => void;
  removeLabel?: string;
}

/**
 * One attached document, drawn as a row.
 *
 * Shared between the composers (where it can be taken off) and the read-only
 * surfaces (where it can only be opened), because the thing being described is
 * the same and a second layout for it would drift.
 *
 * The link is `target="_blank"` with `rel="noreferrer"`: the object lives on
 * the storage host, so this leaves the app either way, and a `download`
 * attribute is inert cross-origin — the browser navigates instead, which for a
 * PDF is the better outcome anyway.
 */
export const FileAttachmentRow = ({ file, onRemove, removeLabel }: FileAttachmentRowProps) => (
  <div className="flex items-center gap-2.5 rounded-xl border border-edge bg-surface-sunken px-3 py-2.5">
    <span
      aria-hidden
      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand/12 text-brand"
    >
      <FileText className="h-4 w-4" />
    </span>

    <span className="min-w-0 flex-1 leading-tight">
      <span className="block truncate text-xs font-semibold" title={file.name}>
        {file.name}
      </span>
      <span className="text-3xs uppercase tracking-wide text-content-faint">
        {extensionOf(file.name)} · {formatFileSize(file.size)}
      </span>
    </span>

    <a
      href={file.url}
      target="_blank"
      rel="noreferrer"
      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-content-faint transition-colors hover:bg-brand/10 hover:text-brand"
    >
      <Download className="h-3.5 w-3.5" />
    </a>

    {onRemove && (
      <button
        type="button"
        aria-label={removeLabel}
        title={removeLabel}
        onClick={onRemove}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-content-faint transition-colors hover:bg-danger/10 hover:text-danger"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    )}
  </div>
);
