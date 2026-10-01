import { useEffect, useState } from 'react';
import { AlertTriangle, Sparkles } from 'lucide-react';

import { documentApi } from '@/entities/document/api/document.api';
import type { DocumentSource } from '@/entities/document/model/types';
import { errorMessage } from '@/shared/api/client';
import { useT } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { SkinLoader, ZoomableImage, formatFileSize } from '@/shared/ui';

interface ImageDocumentProps {
  documentId: string;
  source: DocumentSource;
  /** The page's title, so the picture has a real alt text rather than a filename. */
  title: string;
}

/**
 * A page that is a picture. The same reason a PDF's do (see `ImportedDocument`): the bucket hands
 * out public URLs.
 */
export const ImageDocument = ({ documentId, source, title }: ImageDocumentProps) => {
  const t = useT();
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  // Keyed on the id and the mime rather than on `source`, which is a fresh object on every render
  // of the query cache — see the note in `ImportedDocument` for the re-download that would cause.
  const { mime } = source;

  useEffect(() => {
    let url: string | null = null;
    let isStale = false;

    setObjectUrl(null);
    setFailure(null);

    documentApi
      .sourceObjectUrl(documentId, mime)
      .then((next) => {
        url = next;
        if (isStale) URL.revokeObjectURL(next);
        else setObjectUrl(next);
      })
      .catch((error: unknown) => {
        if (!isStale) setFailure(errorMessage(error, t('doc.imageFailed')));
      });

    return () => {
      isStale = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [documentId, mime, t]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {/* The strip that says what this is — and, uniquely for a picture, what happened to it.
          Every other imported page is the bytes somebody chose. */}
      <div
        className={cn(
          'ui-card flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-xl border border-edge',
          'bg-surface-sunken/60 px-2.5 py-1.5',
        )}
      >
        <span className="text-3xs uppercase tracking-wide text-content-faint">
          {t('doc.picture')} · {formatFileSize(source.size)}
        </span>

        <span
          title={t('doc.optimisedHint')}
          className="inline-flex items-center gap-1 text-3xs text-content-muted"
        >
          <Sparkles className="h-3 w-3 shrink-0 text-content-faint" />
          {t('doc.optimisedBadge')}
        </span>
      </div>

      {/* --- The picture itself -------------------------------------------- */}
      <div className="relative grid min-h-0 flex-1 place-items-center overflow-hidden rounded-2xl border border-edge bg-surface-raised p-3">
        {!objectUrl && !failure && <SkinLoader label={t('doc.loadingPreview')} />}

        {objectUrl && (
          <ZoomableImage
            variant="fill"
            src={objectUrl}
            thumbSrc={objectUrl}
            alt={title}
            className="border-0 bg-transparent"
          />
        )}

        {failure && (
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <AlertTriangle className="h-6 w-6 text-content-faint" />
            <p className="text-sm font-semibold">{failure}</p>
            <p className="mx-auto max-w-sm text-xs leading-relaxed text-content-muted">
              {t('doc.previewFailedHint')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
