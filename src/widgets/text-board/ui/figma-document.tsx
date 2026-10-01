import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  ExternalLink,
  ImageOff,
  Layers,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { toast } from '@/shared/lib/toast';

import { documentApi } from '@/entities/document/api/document.api';
import {
  useFigmaBrief,
  useFigmaImages,
  useSyncFigmaDocument,
} from '@/entities/document/model/queries';
import type {
  DocumentFigma,
  FigmaBrief,
  FigmaExportFormat,
  FigmaNodeSummary,
} from '@/entities/document/model/types';
import { errorMessage } from '@/shared/api/client';
import { useT } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { formatRelative } from '@/shared/lib/dates';
import { Button, EmptyState, FigmaMark, Skeleton } from '@/shared/ui';
import { FigmaBriefPanel } from './figma-brief-panel';

interface FigmaDocumentProps {
  documentId: string;
  figma: DocumentFigma;
  /** Saves a brief as its own page. Absent for a reader who cannot create one. */
  onSaveBrief?: (brief: FigmaBrief) => Promise<void> | void;
}

/**
 * How many objects on a page get a rendered thumbnail. Every one of them is a render Figma performs
 * and an image the browser downloads, and a page in a mature design file holds a hundred and fifty.
 */
const MAX_THUMBNAILS = 24;

/**
 * What a raster export is rendered at. Two, because the overwhelming reason somebody pulls a frame
 * out of Figma is to put it somewhere it will be looked at on a modern display.
 */
const EXPORT_SCALE = 2;

const FORMATS: FigmaExportFormat[] = ['png', 'jpg', 'svg', 'pdf'];

/** Saves a blob the browser already holds. `download` is honoured on `blob:`. */
const saveBlob = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = fileName;
  anchor.click();

  // Chrome needs the URL to outlive the click by a frame.
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
};

/** One object in the design, with its picture and a way to take it away. */
const NodeCard = ({
  documentId,
  node,
  previewUrl,
  isLoadingPreview,
}: {
  documentId: string;
  node: FigmaNodeSummary;
  previewUrl: string | undefined;
  isLoadingPreview: boolean;
}) => {
  const t = useT();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pending, setPending] = useState<FigmaExportFormat | null>(null);

  const download = async (format: FigmaExportFormat) => {
    setPending(format);
    setIsMenuOpen(false);

    try {
      const blob = await documentApi.figmaExport(
        documentId,
        node.id,
        format,
        // Figma refuses a scale on the vector formats rather than ignoring it.
        format === 'png' || format === 'jpg' ? EXPORT_SCALE : undefined,
      );

      // Named here as well as by the API. The response carries a `Content-Disposition` with the
      // node's own name, which is what a direct hit on the endpoint gets.
      const stem = node.name.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 60) || 'export';
      saveBlob(blob, `${stem}.${format}`);
      toast.success(t('figma.downloaded', { name: node.name }));
    } catch (error) {
      toast.error(errorMessage(error, t('figma.downloadFailed')));
    } finally {
      setPending(null);
    }
  };

  return (
    <li className="group/node relative">
      <div
        className={cn(
          'ui-card flex h-full flex-col overflow-hidden rounded-xl border border-edge',
          'bg-surface-raised transition-colors hover:border-brand/40',
        )}
      >
        {/* A checkerboard behind the thumbnail rather than a solid fill. Half of what gets
            exported out of a design file has a transparent background — icons, logos. */}
        <div
          className="relative grid h-28 place-items-center overflow-hidden border-b border-edge bg-surface-sunken"
          style={{
            backgroundImage:
              'linear-gradient(45deg, rgb(0 0 0 / 0.04) 25%, transparent 25%, transparent 75%, rgb(0 0 0 / 0.04) 75%), linear-gradient(45deg, rgb(0 0 0 / 0.04) 25%, transparent 25%, transparent 75%, rgb(0 0 0 / 0.04) 75%)',
            backgroundSize: '12px 12px',
            backgroundPosition: '0 0, 6px 6px',
          }}
        >
          {isLoadingPreview && <Skeleton className="h-full w-full rounded-none" />}

          {!isLoadingPreview && previewUrl && (
            <img
              src={previewUrl}
              alt={node.name}
              loading="lazy"
              decoding="async"
              className="max-h-full max-w-full object-contain"
            />
          )}

          {!isLoadingPreview && !previewUrl && (
            <ImageOff aria-hidden className="h-5 w-5 text-content-faint" />
          )}
        </div>

        <div className="flex items-center gap-1.5 px-2 py-1.5">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-2xs font-semibold" title={node.name}>
              {node.name}
            </span>
            <span className="block text-3xs uppercase tracking-wide text-content-faint">
              {node.type.replace(/_/g, ' ').toLowerCase()}
            </span>
          </span>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            aria-label={t('figma.download')}
            title={t('figma.download')}
            isLoading={pending !== null}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {isMenuOpen && (
        <>
          {/* The same dismissal pattern as the page's download menu. */}
          <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
          <ul
            role="menu"
            aria-label={t('figma.downloadAs')}
            className="panel absolute right-1 top-full z-50 w-44 overflow-hidden p-1.5"
          >
            <li className="px-2 pb-1 pt-1 text-3xs font-semibold uppercase tracking-[0.16em] text-content-faint">
              {t('figma.downloadAs')}
            </li>
            {FORMATS.map((format) => (
              <li key={format}>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void download(format)}
                  className={cn(
                    'flex w-full flex-col rounded-lg px-2 py-1.5 text-left',
                    'transition-colors hover:bg-surface-sunken',
                  )}
                >
                  <span className="text-2xs font-semibold">{t(`figma.format.${format}`)}</span>
                  <span className="text-3xs leading-snug text-content-faint">
                    {t(`figma.format.${format}.hint`)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </li>
  );
};

/**
 * A page that *is* a Figma file. The structure — pages, and the frames and components on them — is
 * the snapshot cached on the row, so opening this costs a database read and no network at all.
 */
export const FigmaDocument = ({ documentId, figma, onSaveBrief }: FigmaDocumentProps) => {
  const t = useT();
  const snapshot = figma.snapshot ?? null;

  const [pageId, setPageId] = useState<string | null>(null);
  const [isBriefOpen, setIsBriefOpen] = useState(false);
  const [savedBrief, setSavedBrief] = useState<FigmaBrief | null>(null);
  const [isSavingBrief, setIsSavingBrief] = useState(false);

  const sync = useSyncFigmaDocument();
  const brief = useFigmaBrief();

  // The first page with something on it, not simply the first page. Design files routinely open on
  // a cover or a changelog page holding one text layer.
  const pages = useMemo(() => snapshot?.pages ?? [], [snapshot]);

  useEffect(() => {
    if (pages.length === 0) {
      setPageId(null);
      return;
    }

    setPageId((current) => {
      if (current && pages.some((page) => page.id === current)) return current;
      return (pages.find((page) => page.nodes.length > 0) ?? pages[0]).id;
    });
  }, [pages]);

  const page = pages.find((entry) => entry.id === pageId) ?? null;

  // A stable array of ids, memoised on the two things it depends on. It goes into a React Query
  // key, and a fresh array on every render would make that key a new key on every render.
  const thumbnailIds = useMemo(
    () => (page?.nodes ?? []).slice(0, MAX_THUMBNAILS).map((node) => node.id),
    [page],
  );

  const images = useFigmaImages(documentId, thumbnailIds, figma.version);

  /** Held so the panel keeps its answer while a re-run is in flight. */
  const briefRef = useRef<FigmaBrief | null>(null);
  if (brief.data) briefRef.current = brief.data;

  const openBrief = () => {
    setIsBriefOpen(true);
    brief.mutate(documentId);
  };

  const saveBrief = async () => {
    const current = briefRef.current;
    if (!current || !onSaveBrief) return;

    setIsSavingBrief(true);
    try {
      await onSaveBrief(current);
      setSavedBrief(current);
      setIsBriefOpen(false);
    } finally {
      setIsSavingBrief(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {/* --- What this is, when it was last read, and the ways out --------- */}
      <div
        className={cn(
          'ui-card flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-xl border border-edge',
          'bg-surface-sunken/60 px-2.5 py-1.5',
        )}
      >
        <FigmaMark aria-hidden className="h-5 w-4 shrink-0" />

        <span className="min-w-0 truncate text-2xs font-semibold" title={snapshot?.name}>
          {snapshot?.name ?? t('figma.design')}
        </span>

        {/* The staleness, stated rather than implied. Every other page on this board is exactly
            what it was when it was last saved. */}
        <span className="text-3xs text-content-faint">
          {figma.syncedAt
            ? t('figma.syncedAt', { when: formatRelative(figma.syncedAt) })
            : t('figma.neverSynced')}
        </span>

        <span className="ml-auto" />

        <Button
          size="sm"
          variant="ghost"
          onClick={() => sync.mutate(documentId)}
          isLoading={sync.isPending}
          title={t('figma.sync')}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            {sync.isPending ? t('figma.syncing') : t('figma.sync')}
          </span>
        </Button>

        {/* The assistant, and only where there is structure for it to read. */}
        {pages.some((entry) => entry.nodes.length > 0) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={openBrief}
            title={t('figma.briefHint')}
            isLoading={brief.isPending && !isBriefOpen}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('figma.brief')}</span>
          </Button>
        )}

        <a
          href={figma.url}
          target="_blank"
          rel="noreferrer noopener"
          title={t('figma.open')}
          className={cn(
            'ui-btn ui-btn--secondary inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg',
            'bg-surface-sunken px-2 text-2xs text-content transition-colors hover:bg-edge/60',
          )}
        >
          <ExternalLink className="h-3 w-3" />
          <span className="hidden sm:inline">{t('figma.open')}</span>
        </a>
      </div>

      {/* --- The file ------------------------------------------------------ */}
      <div
        className={cn(
          'grid min-h-0 flex-1 gap-2',
          isBriefOpen
            ? 'lg:grid-cols-[150px_minmax(0,1fr)_260px]'
            : 'lg:grid-cols-[150px_minmax(0,1fr)]',
        )}
      >
        {/* Pages. A rail rather than a dropdown: a design file's pages are its table of
            contents, and hiding them behind a control makes the file look like one screen. */}
        <aside className="scrollbar-thin hidden min-h-0 flex-col gap-1 overflow-y-auto rounded-2xl border border-edge bg-surface-raised p-1.5 lg:flex">
          <p className="px-2 pb-1 pt-1.5 text-3xs font-semibold uppercase tracking-[0.16em] text-content-faint">
            {t('figma.pagesCount', { count: String(pages.length) })}
          </p>

          {pages.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setPageId(entry.id)}
              className={cn(
                'w-full rounded-lg border px-2 py-1.5 text-left transition-colors duration-150',
                entry.id === pageId
                  ? 'border-brand bg-brand/[0.08]'
                  : 'border-transparent hover:border-edge hover:bg-surface-sunken/60',
              )}
            >
              <span className="block truncate text-2xs font-semibold">{entry.name}</span>
              <span className="block text-3xs text-content-faint">
                {t('figma.objectsCount', { count: String(entry.nodes.length) })}
              </span>
            </button>
          ))}
        </aside>

        {/* The objects on the chosen page. */}
        <section className="scrollbar-thin min-h-0 overflow-y-auto rounded-2xl border border-edge bg-surface-raised p-2">
          {pages.length === 0 && (
            <EmptyState
              className="h-full"
              icon={<Layers className="h-6 w-6" />}
              title={t('figma.noPages')}
            />
          )}

          {page && page.nodes.length === 0 && (
            <EmptyState
              className="h-full"
              icon={<Layers className="h-6 w-6" />}
              title={t('figma.noFrames')}
            />
          )}

          {page && page.nodes.length > 0 && (
            <>
              <ul className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(9.5rem,1fr))]">
                {page.nodes.map((node, index) => (
                  <NodeCard
                    key={node.id}
                    documentId={documentId}
                    node={node}
                    previewUrl={images.data?.[node.id]}
                    // Only the first two dozen were ever asked for; the rest
                    // are not loading, they are deliberately without a picture.
                    isLoadingPreview={index < MAX_THUMBNAILS && images.isPending}
                  />
                ))}
              </ul>

              {images.isError && (
                <p className="px-1 pt-2 text-3xs text-content-faint">{t('figma.previewFailed')}</p>
              )}

              {(page.isTruncated || snapshot?.isTruncated) && (
                <p className="px-1 pt-2 text-3xs text-content-faint">{t('figma.truncated')}</p>
              )}
            </>
          )}
        </section>

        {isBriefOpen && (
          <FigmaBriefPanel
            brief={briefRef.current}
            isLoading={brief.isPending}
            onClose={() => setIsBriefOpen(false)}
            // Hidden once this exact brief has been saved: a second press
            // would make a second page saying the same thing.
            onSave={onSaveBrief && savedBrief !== briefRef.current ? () => void saveBrief() : undefined}
            isSaving={isSavingBrief}
          />
        )}
      </div>
    </div>
  );
};
