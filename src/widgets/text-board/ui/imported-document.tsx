import { useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink, FileText, Lock } from 'lucide-react';

import { documentApi } from '@/entities/document/api/document.api';
import type { DocumentSource } from '@/entities/document/model/types';
import { useT } from '@/shared/i18n';
import { errorMessage } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { SkinLoader, formatFileSize } from '@/shared/ui';
import { ArchiveDocument } from './archive-document';
import { ImageDocument } from './image-document';

/** `report.docx` → `DOCX`. The badge, so the format is legible at a glance. */
export const formatBadge = (source: DocumentSource): string => {
  const dot = source.name.lastIndexOf('.');
  if (dot > 0) return source.name.slice(dot + 1).toUpperCase().slice(0, 4);

  if (source.mime === 'application/pdf') return 'PDF';
  if (source.mime === 'text/plain') return 'TXT';
  return 'DOC';
};

/**
 * Only a PDF renders in a browser *frame*. Pictures and archives are previewable too, and much more
 * directly — they have their own components below and never reach this one's frame.
 */
const isPreviewable = (source: DocumentSource): boolean => source.mime === 'application/pdf';

const isImage = (source: DocumentSource): boolean => source.mime.startsWith('image/');
const isArchive = (source: DocumentSource): boolean => source.mime === 'application/zip';

interface ImportedDocumentProps {
  documentId: string;
  source: DocumentSource;
  /** The page's title, which is a picture's alt text. */
  title: string;
}

/**
 * A page that is the file somebody uploaded. This is the whole point of importing rather than
 * pasting: the page *is* the document — the original bytes.
 */
export const ImportedDocument = ({ documentId, source, title }: ImportedDocumentProps) => {
  const t = useT();
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  // The effect keys on the mime, not on `source`. `source` is a fresh object on every render of the
  // query cache — a teammate's save, a list refetch, a socket event.
  const { mime } = source;

  useEffect(() => {
    if (mime !== 'application/pdf') return;

    let url: string | null = null;
    let isStale = false;

    setObjectUrl(null);
    setFailure(null);

    documentApi
      .sourceObjectUrl(documentId, mime)
      .then((next) => {
        url = next;
        // Navigating to another page mid-fetch: revoke immediately rather than
        // handing a URL to a component that has moved on.
        if (isStale) URL.revokeObjectURL(next);
        else setObjectUrl(next);
      })
      .catch((error: unknown) => {
        if (!isStale) setFailure(errorMessage(error, t('doc.previewFailed')));
      });

    return () => {
      isStale = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [documentId, mime, t]);

  // The two kinds that have a surface of their own. Delegated rather than folded in as more
  // branches, because neither is a variation on "a file in a frame".
  if (isImage(source)) {
    return <ImageDocument documentId={documentId} source={source} title={title} />;
  }

  if (isArchive(source)) {
    return <ArchiveDocument documentId={documentId} source={source} />;
  }

  const canPreview = isPreviewable(source);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {/* --- The strip that says what this is, and what to do about it ---
          One line, and deliberately *without* the file name on it. */}
      <div
        className={cn(
          'ui-card flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-xl border border-edge',
          'bg-surface-sunken/60 px-2.5 py-1.5',
        )}
      >
        <span
          aria-hidden
          className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-brand/12 text-brand"
        >
          <FileText className="h-3.5 w-3.5" />
        </span>

        <span className="text-3xs uppercase tracking-wide text-content-faint">
          {formatBadge(source)} · {formatFileSize(source.size)} · {t('doc.asUploaded')}
        </span>

        <span className="ml-auto" />

        {/* A button, not a link — there is no URL to give it. Linking to the storage object
            would take the reader outside the app's access rules and onto a public URL. */}
        <button
          type="button"
          onClick={() => {
            const show = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

            if (objectUrl) show(objectUrl);
            else void documentApi.sourceObjectUrl(documentId, mime).then(show);
          }}
          title={t('doc.openOriginal')}
          className={cn(
            'ui-btn ui-btn--secondary inline-flex h-6 shrink-0 items-center gap-1.5 rounded-lg',
            'bg-surface-sunken px-2 text-2xs text-content transition-colors hover:bg-edge/60',
          )}
        >
          <ExternalLink className="h-3 w-3" />
          <span className="hidden sm:inline">{t('doc.openOriginal')}</span>
        </button>

        {/* A sentence, not a control. The question this card raises is "why can I not edit
            this?". */}
        <span className="hidden items-center gap-1.5 text-3xs leading-snug text-content-muted xl:inline-flex">
          <Lock className="h-3 w-3 shrink-0 text-content-faint" />
          {t('doc.keptAsUploaded')}
        </span>
      </div>

      {/* --- The document itself ------------------------------------------ */}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-edge bg-surface-raised">
        {canPreview && !failure && !objectUrl && (
          <div className="grid h-full place-items-center gap-2">
            <SkinLoader label={t('doc.loadingPreview')} />
          </div>
        )}

        {canPreview && objectUrl && (
          /* No `sandbox`, and that is a decision rather than an omission. A `blob:` URL inherits
             the creating document's origin, so a frame pointed at one is same-origin. */
          <iframe
            src={objectUrl}
            title={source.name}
            className="h-full w-full border-0 bg-white"
          />
        )}

        {(!canPreview || failure) && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="text-content-faint">
              {failure ? <AlertTriangle className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
            </span>
            <p className="text-sm font-semibold">
              {failure ?? t('doc.noPreview', { format: formatBadge(source) })}
            </p>
            <p className="mx-auto max-w-sm text-xs leading-relaxed text-content-muted">
              {failure ? t('doc.previewFailedHint') : t('doc.noPreviewHint')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
