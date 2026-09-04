import { useMemo, useState } from 'react';
import { AlertTriangle, FileArchive, Folder, Info, Search } from 'lucide-react';

import { useDocumentArchive } from '@/entities/document/model/queries';
import type { ArchiveEntry, DocumentSource } from '@/entities/document/model/types';
import { errorMessage } from '@/shared/api/client';
import { useT } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { formatDateTime } from '@/shared/lib/dates';
import { EmptyState, SkinLoader, formatFileSize } from '@/shared/ui';

interface ArchiveDocumentProps {
  documentId: string;
  source: DocumentSource;
}

/** `brand/logos/mark.svg` → the depth it sits at, for the indent. */
const depthOf = (path: string): number => path.split('/').length - 1;

/** The last segment, which is the only part a row has room to emphasise. */
const leafOf = (path: string): string => path.slice(path.lastIndexOf('/') + 1);

/**
 * A page that is an uploaded `.zip`.
 *
 * ## What this can and cannot do, and why the line is where it is
 *
 * It lists. Every path, every size, read out of the archive's central
 * directory on the API without inflating a single byte — see
 * `zip-directory.ts` there. It cannot extract, and that is a decision rather
 * than a gap: unpacking attacker-controlled data on a small container is a zip
 * bomb waiting for an afternoon, and a 12 MB upload can honestly declare
 * petabytes of output. The download button in the toolbar above has always
 * been the way to get the files, and it still is.
 *
 * That trade is worth the listing anyway, because the question a reader
 * actually has is not "give me the files" — it is *"is the thing I want in
 * here?"*, and before this the only way to answer it was to spend eight
 * megabytes finding out.
 *
 * ## Why a flat, indented list rather than a collapsible tree
 *
 * A handover archive is three or four folders deep and forty files long. A
 * tree of that costs an expand/collapse interaction on every folder to see
 * what one scroll already shows, and the filter below — which is what people
 * actually reach for — has to flatten the tree to work at all. The indent
 * carries the structure; the filter carries the search.
 */
export const ArchiveDocument = ({ documentId, source }: ArchiveDocumentProps) => {
  const t = useT();
  const { data, isLoading, error } = useDocumentArchive(documentId, true);
  const [filter, setFilter] = useState('');

  const entries = useMemo(() => {
    const all = data?.entries ?? [];
    const needle = filter.trim().toLowerCase();
    if (!needle) return all;

    return all.filter((entry) => entry.path.toLowerCase().includes(needle));
  }, [data?.entries, filter]);

  const fileCount = useMemo(
    () => (data?.entries ?? []).filter((entry) => !entry.isDirectory).length,
    [data?.entries],
  );

  const Row = ({ entry }: { entry: ArchiveEntry }) => (
    <li
      className={cn(
        'flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs',
        'transition-colors hover:bg-surface-sunken/70',
      )}
      /*
       * The indent is inline rather than a Tailwind class, because the depth
       * is data. A `pl-{n}` lookup table would cap at whatever depths somebody
       * thought of, and an archive is nested as deeply as whoever made it felt
       * like nesting it.
       */
      style={{ paddingLeft: `${0.5 + Math.min(depthOf(entry.path), 6) * 0.85}rem` }}
    >
      <span aria-hidden className="shrink-0 text-content-faint">
        {entry.isDirectory ? (
          <Folder className="h-3.5 w-3.5" />
        ) : (
          <FileArchive className="h-3.5 w-3.5" />
        )}
      </span>

      <span className="min-w-0 flex-1 truncate" title={entry.path}>
        <span className={cn(entry.isDirectory ? 'font-semibold' : 'font-medium')}>
          {leafOf(entry.path)}
        </span>
      </span>

      {entry.modifiedAt && (
        <span className="hidden shrink-0 text-3xs text-content-faint lg:inline">
          {formatDateTime(entry.modifiedAt)}
        </span>
      )}

      <span className="w-16 shrink-0 text-right text-3xs tabular-nums text-content-muted">
        {entry.isDirectory ? t('doc.archiveFolder') : formatFileSize(entry.size)}
      </span>
    </li>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {/* --- What this is, and what is in it -------------------------------- */}
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
          <FileArchive className="h-3.5 w-3.5" />
        </span>

        <span className="text-3xs uppercase tracking-wide text-content-faint">
          {t('doc.archive')} · {formatFileSize(source.size)}
          {data && ` · ${t('doc.archiveCount', {
            files: String(fileCount),
            size: formatFileSize(data.uncompressedSize),
          })}`}
        </span>

        <span className="ml-auto" />

        {/*
          The filter, and only once there is something to filter.

          Twelve rows do not need a search box and a search box over twelve
          rows is a control that makes a list look longer than it is.
        */}
        {(data?.entries.length ?? 0) > 12 && (
          <label className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-content-faint"
            />
            <input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder={t('doc.archiveSearch')}
              aria-label={t('doc.archiveSearch')}
              className="field h-6 w-40 pl-6 text-2xs"
            />
          </label>
        )}
      </div>

      {/* --- The listing ---------------------------------------------------- */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-edge bg-surface-raised">
        {isLoading && (
          <div className="grid flex-1 place-items-center">
            <SkinLoader label={t('doc.archiveLoading')} />
          </div>
        )}

        {error && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <AlertTriangle className="h-6 w-6 text-content-faint" />
            <p className="text-sm font-semibold">
              {errorMessage(error, t('doc.archiveFailed'))}
            </p>
            <p className="mx-auto max-w-sm text-xs leading-relaxed text-content-muted">
              {t('doc.previewFailedHint')}
            </p>
          </div>
        )}

        {data && data.entries.length === 0 && (
          <EmptyState
            className="flex-1"
            icon={<FileArchive className="h-6 w-6" />}
            title={t('doc.archiveEmpty')}
          />
        )}

        {data && data.entries.length > 0 && (
          <>
            <p className="flex items-center gap-1.5 border-b border-edge px-3 py-1.5 text-3xs text-content-faint">
              <Info className="h-3 w-3 shrink-0" />
              {t('doc.archiveHint')}
            </p>

            <ul className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-1.5">
              {entries.map((entry) => (
                <Row key={entry.path} entry={entry} />
              ))}

              {entries.length === 0 && (
                <li className="px-2 py-6 text-center text-xs text-content-faint">
                  {t('doc.archiveNoMatches')}
                </li>
              )}
            </ul>

            {/*
              Said out loud rather than left as a silently short list.

              A `node_modules` somebody zipped by accident is forty thousand
              rows, and the API stops at fifteen hundred. A listing that just
              ends is a listing the reader will trust to be complete.
            */}
            {data.isTruncated && (
              <p className="border-t border-edge px-3 py-1.5 text-3xs text-content-faint">
                {t('doc.archiveTruncated', {
                  shown: String(data.entries.length),
                  total: String(data.totalEntries),
                })}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
