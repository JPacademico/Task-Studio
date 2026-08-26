import { useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink, FileText, Sparkles } from 'lucide-react';

import { documentApi } from '@/entities/document/api/document.api';
import type { DocumentSource } from '@/entities/document/model/types';
import { useT } from '@/shared/i18n';
import { errorMessage } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { SkinLoader, formatFileSize } from '@/shared/ui';

/** `report.docx` → `DOCX`. The badge, so the format is legible at a glance. */
export const formatBadge = (source: DocumentSource): string => {
  const dot = source.name.lastIndexOf('.');
  if (dot > 0) return source.name.slice(dot + 1).toUpperCase().slice(0, 4);

  if (source.mime === 'application/pdf') return 'PDF';
  if (source.mime === 'text/plain') return 'TXT';
  return 'DOC';
};

/** Only one of the three importable formats renders in a browser frame. */
const isPreviewable = (source: DocumentSource): boolean => source.mime === 'application/pdf';

interface ImportedDocumentProps {
  documentId: string;
  source: DocumentSource;
  /**
   * Whether to point at the toolbar's Edit button.
   *
   * False for a reader who may not rewrite the page: telling them to press a
   * control that is not drawn for them is worse than saying nothing.
   */
  canEdit: boolean;
  /** The conversion is running — the toolbar's Edit button started it. */
  isConverting: boolean;
}

/**
 * A page that is still the file somebody uploaded.
 *
 * This is the whole point of importing rather than pasting: until somebody
 * presses **Convert**, the page *is* the document — the original bytes, shown
 * as they are — and nothing has rewritten a word of it. A conversion is a
 * language model's reading of somebody's work, which is exactly the sort of
 * thing that should happen because a person asked for it and not because a
 * file finished uploading.
 *
 * ## Why the PDF is fetched rather than framed from storage
 *
 * The bucket hands out public URLs, and the app's CSP is `frame-src 'self'
 * blob:` — deliberately, because widening it to a storage origin widens it for
 * every other page too. So the file comes through the API (which checks the
 * project's roster on the way, something an unguessable URL cannot do) and is
 * framed from a `blob:` URL made here. The object URL is revoked on unmount;
 * leaving it behind pins the whole file in memory for the life of the tab.
 *
 * A `.docx` gets no frame, because no browser renders one. It gets the same
 * card with the honest version of the situation and the two things that
 * actually help: open it in whatever opens Word files, or convert it.
 */
export const ImportedDocument = ({
  documentId,
  source,
  canEdit,
  isConverting,
}: ImportedDocumentProps) => {
  const t = useT();
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  /*
   * The effect keys on the mime, not on `source`.
   *
   * `source` is a fresh object on every render of the query cache — a
   * teammate's save, a list refetch, a socket event — and depending on it
   * would re-download the file each time, revoking a URL the `<iframe>` is
   * still displaying. The id and the format are the only two facts the fetch
   * actually depends on, and both are primitives.
   */
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

  const canPreview = isPreviewable(source);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {/* --- The strip that says what this is, and what to do about it ----- */}
      <div
        className={cn(
          'ui-card flex flex-wrap items-center gap-2.5 rounded-2xl border border-edge',
          'bg-surface-sunken/60 px-3 py-2.5',
        )}
      >
        <span
          aria-hidden
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand/12 text-brand"
        >
          <FileText className="h-4 w-4" />
        </span>

        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-xs font-semibold" title={source.name}>
            {source.name}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-content-faint">
            {formatBadge(source)} · {formatFileSize(source.size)} · {t('doc.asUploaded')}
          </span>
        </span>

        {/*
          A button, not a link — there is no URL to give it.

          Linking to the storage object would take the reader outside the
          app's access rules and onto a public URL; the file is fetched through
          the API instead, and what is opened is the blob this component
          already holds. The formats with no preview never fetched one, so
          those pay for it on the click rather than on every page open.
        */}
        <button
          type="button"
          onClick={() => {
            const show = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

            if (objectUrl) show(objectUrl);
            else void documentApi.sourceObjectUrl(documentId, mime).then(show);
          }}
          className={cn(
            'ui-btn ui-btn--secondary inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl',
            'bg-surface-sunken px-3 text-xs text-content transition-colors hover:bg-edge/60',
          )}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('doc.openOriginal')}</span>
        </button>

        {/*
          A sentence, not a second button.

          The conversion is started from the toolbar's Edit button — that is
          the control somebody reaches for when they want to change a document,
          and putting a second copy of it down here would be two ways to do one
          thing on a surface that already has plenty. What is missing without
          this line is not a control, it is the explanation of *why* pressing
          Edit does something unusual, so that is what it says.
        */}
        {canEdit && (
          <span className="inline-flex items-center gap-1.5 text-[11px] leading-snug text-content-muted">
            <Sparkles className="h-3 w-3 shrink-0 text-brand" />
            {t('doc.pressEditToConvert')}
          </span>
        )}
      </div>

      {/* --- The document itself ------------------------------------------ */}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-edge bg-surface-raised">
        {/*
          The conversion covers the document rather than replacing it.

          It takes tens of seconds — a model is reading the whole thing — and
          swapping the page for a spinner in the meantime would take away the
          document somebody is looking at to tell them it is being read.
        */}
        {isConverting && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-surface/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2 px-6 text-center">
              <SkinLoader label={t('doc.converting')} />
              <p className="text-xs font-semibold">{t('doc.converting')}</p>
              <p className="max-w-xs text-[11px] leading-relaxed text-content-muted">
                {t('doc.convertingHint')}
              </p>
            </div>
          </div>
        )}

        {canPreview && !failure && !objectUrl && (
          <div className="grid h-full place-items-center gap-2">
            <SkinLoader label={t('doc.loadingPreview')} />
          </div>
        )}

        {canPreview && objectUrl && (
          /*
            No `sandbox`, and that is a decision rather than an omission.

            A `blob:` URL inherits the creating document's origin, so a frame
            pointed at one is same-origin — which would matter a great deal if
            the browser could be talked into treating the bytes as HTML. It
            cannot: a blob's recorded type is authoritative and is never
            sniffed, and `sourceObjectUrl` rebuilds the blob as the mime the
            API recorded at upload (which came from its own allow-list). So
            this frame renders in the browser's PDF viewer or it renders
            nothing.

            The empty `sandbox` that would otherwise be right here also breaks
            the PDF viewer outright in Chromium — it needs scripting to draw —
            so the choice was between a preview that works and an attribute
            that reads as careful while doing nothing.
          */
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
