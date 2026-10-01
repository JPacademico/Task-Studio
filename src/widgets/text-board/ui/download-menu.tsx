import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Download,
  FileArchive,
  FileCode2,
  FileText,
  FileType2,
  ImageIcon,
  Lock,
} from 'lucide-react';
import { toast } from '@/shared/lib/toast';

import { documentApi } from '@/entities/document/api/document.api';
import { useDocumentAssets } from '@/entities/document/model/queries';
import type { DocumentExportFormat, DocumentSource } from '@/entities/document/model/types';
import { errorMessage } from '@/shared/api/client';
import { useT, type TranslationKey } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { Button, SkinLoader } from '@/shared/ui';

interface DownloadMenuProps {
  documentId: string;
  /**
   * The page's title, used as the filename stem. Taken from what is on screen rather than from the
   * response.
   */
  title: string;
  /** Set when the page was imported, so the original can be offered too. */
  source: DocumentSource | null;
  /**
   * The editor's buffer, when there is one. Downloading mid-edit gives what is on the screen rather
   * than the last save, which is what the person looking at it means by "this document".
   */
  draft?: string;
}

const FORMATS: DocumentExportFormat[] = ['pdf', 'docx', 'txt', 'html'];

const ICONS: Record<DocumentExportFormat, typeof FileText> = {
  pdf: FileType2,
  docx: FileText,
  txt: FileText,
  html: FileCode2,
};

/** The mime an import has to be for that format to hand back the original. */
const PASSTHROUGH_MIME: Partial<Record<DocumentExportFormat, string>> = {
  pdf: 'application/pdf',
  txt: 'text/plain',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

/**
 * Saves a blob the browser has already been handed. `download` on an `<a>` is only honoured
 * same-origin.
 */
export const saveBlob = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = fileName;
  anchor.click();

  // Chrome needs the URL to outlive the click by a frame; revoking in the same
  // tick occasionally cancels the download it was created for.
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
};

/** `Q4 report` → `Q4-report`. No separators, no surprises in a folder. */
const stem = (title: string): string =>
  title
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'document';

/**
 * Choosing what a page is downloaded *as*, and what can be taken out of it. It used to be one
 * button that always produced HTML, which is the right answer for exactly one audience.
 */
export const DocumentDownloadMenu = ({
  documentId,
  title,
  source,
  draft,
}: DownloadMenuProps) => {
  const t = useT();
  const [isOpen, setIsOpen] = useState(false);
  const [pending, setPending] = useState<
    DocumentExportFormat | 'source' | 'assets' | number | null
  >(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  // Whether there is a page here to render into a file at all. False only for an import that never
  // got a body — a PDF, a `.docx`, a picture, an archive.
  const hasRenderableBody = !source || source.hasBody || Boolean(draft);

  /** What each format can do with *this* page, and why not when it cannot. */
  const availability = useMemo(
    () =>
      FORMATS.map((format) => ({
        format,
        isAvailable:
          hasRenderableBody || (source ? PASSTHROUGH_MIME[format] === source.mime : false),
      })),
    [hasRenderableBody, source],
  );

  const assets = useDocumentAssets(documentId, isOpen && hasRenderableBody);

  const download = async (format: DocumentExportFormat) => {
    setPending(format);
    setIsOpen(false);

    try {
      const blob = await documentApi.exportAs(documentId, format, draft);
      saveBlob(blob, `${stem(title)}.${format}`);
    } catch (error) {
      toast.error(errorMessage(error, t('doc.downloadFailed')));
    } finally {
      setPending(null);
    }
  };

  const downloadOriginal = async () => {
    if (!source) return;

    setPending('source');
    setIsOpen(false);

    try {
      const url = await documentApi.sourceObjectUrl(documentId, source.mime);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = source.name;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch (error) {
      toast.error(errorMessage(error, t('doc.downloadFailed')));
    } finally {
      setPending(null);
    }
  };

  const downloadAsset = async (index: number, name: string) => {
    setPending(index);
    setIsOpen(false);

    try {
      saveBlob(await documentApi.asset(documentId, index), name);
      toast.success(t('doc.imageDownloaded', { name }));
    } catch (error) {
      toast.error(errorMessage(error, t('doc.imageDownloadFailed')));
    } finally {
      setPending(null);
    }
  };

  /**
   * Everything in the page, in one file. The saved count comes back from the API rather than being
   * taken from the list on screen.
   */
  const downloadAllAssets = async () => {
    setPending('assets');
    setIsOpen(false);

    try {
      const { blob, count } = await documentApi.assetsArchive(documentId);
      saveBlob(blob, `${stem(title)}-images.zip`);
      toast.success(
        count === null
          ? t('doc.imagesDownloaded')
          : t('doc.imagesDownloadedCount', { count: String(count) }),
      );
    } catch (error) {
      toast.error(errorMessage(error, t('doc.imagesDownloadFailed')));
    } finally {
      setPending(null);
    }
  };

  /** One row, whether it is a live format, a refused one or a picture. */
  const rowClasses = (isAvailable: boolean) =>
    cn(
      'flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors',
      isAvailable
        ? 'text-content hover:bg-surface-sunken'
        : 'cursor-not-allowed text-content-faint',
    );

  return (
    <div ref={rootRef} className="relative">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title={t('doc.download')}
        isLoading={pending !== null}
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t('doc.download')}</span>
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Same dismissal pattern as the language picker and the bell. */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.ul
              role="menu"
              aria-label={t('doc.downloadAs')}
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                'panel absolute right-0 top-10 z-50 w-64 overflow-hidden p-1.5',
                // A page with a dozen pictures would otherwise run off the bottom of a short
                // window; the formats stay reachable and the list scrolls under them.
                'max-h-[min(28rem,70dvh)] overflow-y-auto scrollbar-thin',
              )}
            >
              <li className="px-2.5 pb-1 pt-1.5 text-3xs font-semibold uppercase tracking-[0.16em] text-content-faint">
                {t('doc.downloadAs')}
              </li>

              {availability.map(({ format, isAvailable }) => {
                const Icon = ICONS[format];

                return (
                  <li key={format}>
                    <button
                      type="button"
                      role="menuitem"
                      disabled={!isAvailable}
                      aria-disabled={!isAvailable}
                      onClick={() => void download(format)}
                      title={
                        isAvailable
                          ? undefined
                          : `${t('doc.formatUnavailable')} — ${t('doc.originalOnly')}`
                      }
                      className={rowClasses(isAvailable)}
                    >
                      <Icon
                        className={cn(
                          'mt-0.5 h-3.5 w-3.5 shrink-0',
                          isAvailable ? 'text-content-faint' : 'text-content-faint/60',
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">
                          {t(`doc.format.${format}` as TranslationKey)}
                        </span>
                        <span className="block text-3xs leading-snug text-content-faint">
                          {isAvailable
                            ? t(`doc.format.${format}.hint` as TranslationKey)
                            : t('doc.formatUnavailable')}
                        </span>
                      </span>
                      {/* A padlock rather than nothing: the row has to look
                          refused at a glance, not merely quiet. */}
                      {!isAvailable && (
                        <Lock aria-hidden className="mt-0.5 h-3 w-3 shrink-0 text-content-faint/70" />
                      )}
                      {pending === format && <SkinLoader size="sm" />}
                    </button>
                  </li>
                );
              })}

              {source && (
                <li className="mt-1 border-t border-edge/70 pt-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void downloadOriginal()}
                    className={rowClasses(true)}
                  >
                    <Download className="mt-0.5 h-3.5 w-3.5 shrink-0 text-content-faint" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{t('doc.originalFile')}</span>
                      <span className="block truncate text-3xs text-content-faint">
                        {source.name}
                      </span>
                    </span>
                  </button>
                </li>
              )}

              {/* --- The pictures inside the page --------------------------- */}
              {hasRenderableBody && (assets.isPending || (assets.data?.length ?? 0) > 0) && (
                <>
                  <li className="mt-1 border-t border-edge/70 px-2.5 pb-1 pt-2 text-3xs font-semibold uppercase tracking-[0.16em] text-content-faint">
                    {t('doc.downloadImages')}
                    {assets.data && assets.data.length > 0 && (
                      <span className="ml-1 font-normal normal-case tracking-normal">
                        · {t('doc.downloadImagesHint', { count: String(assets.data.length) })}
                      </span>
                    )}
                  </li>

                  {assets.isPending && (
                    <li className="grid place-items-center py-3">
                      <SkinLoader size="sm" />
                    </li>
                  )}

                  {/* Take the lot, offered only where it is worth offering. */}
                  {(assets.data?.length ?? 0) > 2 && (
                    <li>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => void downloadAllAssets()}
                        className={cn(rowClasses(true), 'font-semibold')}
                      >
                        <FileArchive className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                        <span className="min-w-0 flex-1">
                          <span className="block">{t('doc.downloadAllImages')}</span>
                          <span className="block text-3xs font-normal leading-snug text-content-faint">
                            {t('doc.downloadAllImagesHint', {
                              count: String(assets.data?.length ?? 0),
                            })}
                          </span>
                        </span>
                        {pending === 'assets' && <SkinLoader size="sm" />}
                      </button>
                    </li>
                  )}

                  {assets.data?.map((asset) => (
                    <li key={asset.index}>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => void downloadAsset(asset.index, asset.name)}
                        className={rowClasses(true)}
                      >
                        <ImageIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-content-faint" />
                        <span className="min-w-0 flex-1">
                          {/* The author's alt text where there is one — it is the only thing
                              anybody ever wrote about the picture. */}
                          <span className="block truncate font-semibold">
                            {asset.alt ||
                              t('doc.imageUntitled', { index: String(asset.index + 1) })}
                          </span>
                          <span className="block truncate text-3xs text-content-faint">
                            {asset.name}
                          </span>
                        </span>
                        {pending === asset.index && <SkinLoader size="sm" />}
                      </button>
                    </li>
                  ))}
                </>
              )}
            </motion.ul>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
