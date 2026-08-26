import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, FileCode2, FileText, FileType2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { documentApi } from '@/entities/document/api/document.api';
import type { DocumentExportFormat, DocumentSource } from '@/entities/document/model/types';
import { errorMessage } from '@/shared/api/client';
import { useT } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { Button, SkinLoader } from '@/shared/ui';

interface DownloadMenuProps {
  documentId: string;
  /**
   * The page's title, used as the filename stem.
   *
   * Taken from what is on screen rather than from the response, so renaming a
   * page and downloading it without saving first still produces a file called
   * what the reader just called it. The API names the file too — that is what
   * a direct hit on the endpoint gets — and this overrides it locally.
   */
  title: string;
  /** Set when the page was imported, so the original can be offered too. */
  source: DocumentSource | null;
  /**
   * The editor's buffer, when there is one.
   *
   * Downloading mid-edit gives what is on the screen rather than the last
   * save, which is what the person looking at it means by "this document".
   */
  draft?: string;
}

const ICONS: Record<DocumentExportFormat, typeof FileText> = {
  pdf: FileType2,
  txt: FileText,
  html: FileCode2,
};

/**
 * Saves a blob the browser has already been handed.
 *
 * `download` on an `<a>` is only honoured same-origin, which is exactly what a
 * `blob:` URL is — so this works where a link straight to the storage host
 * would silently navigate instead.
 */
const saveBlob = (blob: Blob, fileName: string): void => {
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
 * Choosing what a page is downloaded *as*.
 *
 * It used to be one button that always produced HTML, which is the right
 * answer for exactly one audience — somebody who wanted to open it in a
 * browser — and no help at all to the two who wanted to print it or paste it
 * into something else. So the button became a choice of three, rendered from
 * one code path on the API so all three agree about what a heading and a list
 * item are.
 *
 * A popover rather than a dialog. Picking a file format is a one-click
 * decision with no consequences to explain, and stopping the world to ask is
 * out of proportion to it — the same reasoning as the language picker, whose
 * dismissal pattern this borrows.
 *
 * ## The line about the assistant
 *
 * On an imported page nobody has converted yet, there is no HTML to render
 * from — so the API reads the original through the model on the way out.
 * That is slow and it spends quota, and neither is something to discover from
 * a spinner, so the menu says so before the click rather than after.
 */
export const DocumentDownloadMenu = ({
  documentId,
  title,
  source,
  draft,
}: DownloadMenuProps) => {
  const t = useT();
  const [isOpen, setIsOpen] = useState(false);
  const [pending, setPending] = useState<DocumentExportFormat | 'source' | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  /** True when the API will have to read the original before it can re-render it. */
  const needsAssistant = (format: DocumentExportFormat): boolean => {
    if (!source || source.isConverted || draft) return false;

    // The two cases where the file already *is* what was asked for: the API
    // hands the original straight back, no model involved.
    if (format === 'pdf' && source.mime === 'application/pdf') return false;
    if (format === 'txt' && source.mime === 'text/plain') return false;

    return true;
  };

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
              className="panel absolute right-0 top-10 z-50 w-60 overflow-hidden p-1.5"
            >
              <li className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-content-faint">
                {t('doc.downloadAs')}
              </li>

              {(['pdf', 'txt', 'html'] as const).map((format) => {
                const Icon = ICONS[format];
                const viaAssistant = needsAssistant(format);

                return (
                  <li key={format}>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void download(format)}
                      className={cn(
                        'flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-xs',
                        'text-content transition-colors hover:bg-surface-sunken',
                      )}
                    >
                      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-content-faint" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{t(`doc.format.${format}`)}</span>
                        <span className="block text-[10px] leading-snug text-content-faint">
                          {viaAssistant ? (
                            <span className="inline-flex items-center gap-1 text-brand">
                              <Sparkles className="h-2.5 w-2.5" />
                              {t('doc.convertedOnDownload')}
                            </span>
                          ) : (
                            t(`doc.format.${format}.hint`)
                          )}
                        </span>
                      </span>
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
                    className={cn(
                      'flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-xs',
                      'text-content transition-colors hover:bg-surface-sunken',
                    )}
                  >
                    <Download className="mt-0.5 h-3.5 w-3.5 shrink-0 text-content-faint" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{t('doc.originalFile')}</span>
                      <span className="block truncate text-[10px] text-content-faint">
                        {source.name}
                      </span>
                    </span>
                  </button>
                </li>
              )}
            </motion.ul>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
