import { useState } from 'react';
import { Download, FolderArchive, ImageOff, Images, Trash2 } from 'lucide-react';

import { documentApi } from '@/entities/document/api/document.api';
import { useDocumentFolder, useRemoveFolderItem } from '@/entities/document/model/queries';
import type { DocumentFolder, FolderItem } from '@/entities/document/model/types';
import { errorMessage } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { toast } from '@/shared/lib/toast';
import { Button, EmptyState, ImageViewer, Skeleton, formatFileSize } from '@/shared/ui';
import { useT } from '@/shared/i18n';
import { saveBlob } from './download-menu';

interface FolderDocumentProps {
  documentId: string;
  folder: DocumentFolder;
  title: string;
}

/**
 * A folder page: the pictures pinned to one page of the project whiteboard.
 *
 * ## What is on it
 *
 * Every picture, as a grid, in the order it went up on the wall. Each one opens
 * full-screen in the same viewer a task's attachment and a Post-it use, and can
 * be saved on its own; the whole folder can be saved at once as a zip, built by
 * the API when asked and never stored.
 *
 * ## Why removing is here, and what it means
 *
 * It is the "clear unused assets" gesture the Documents board's ceiling points
 * people at. Taking a picture out of the folder frees the board's space at
 * once — but the picture itself is only deleted when nothing else shows it, so
 * one still pinned on the whiteboard stays on the whiteboard. The button says
 * "remove from folder" rather than "delete" for exactly that reason.
 *
 * ## Why the grid draws the stored pictures rather than thumbnails
 *
 * There is no second, smaller copy to draw: storing one would double the
 * bucket cost of every picture, which is the cost this feature is built not to
 * have. Pictures arrive already downscaled to 1600px WebP (see
 * `prepareImage`), and the grid loads them lazily, so a folder only fetches
 * what is scrolled into view.
 */
export const FolderDocument = ({ documentId, folder, title }: FolderDocumentProps) => {
  const t = useT();
  const { data, isLoading, isError } = useDocumentFolder(documentId, true);
  const removeItem = useRemoveFolderItem(documentId);

  const [viewing, setViewing] = useState<FolderItem | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const items = data?.items ?? [];

  const saveItem = async (item: FolderItem) => {
    setSavingId(item.id);
    try {
      saveBlob(await documentApi.folderItem(documentId, item.id), item.name);
    } catch (error) {
      toast.error(errorMessage(error, t('folder.saveFailed')));
    } finally {
      setSavingId(null);
    }
  };

  const saveAll = async () => {
    setIsZipping(true);
    try {
      const { blob, count, total } = await documentApi.folderArchive(documentId);
      const stem = title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') || 'whiteboard';
      saveBlob(blob, `${stem}.zip`);

      // Said only when the zip is not the whole folder — the one case the
      // reader could not otherwise tell from the file they just saved.
      if (count !== null && total !== null && count < total) {
        toast.warning(t('folder.zipPartial', { count: String(count), total: String(total) }));
      }
    } catch (error) {
      toast.error(errorMessage(error, t('folder.saveFailed')));
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* --- What this folder is, and the one-click way to take all of it ---- */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-edge bg-surface-sunken/60 px-3 py-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand/12 text-brand">
          <Images className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-content">
            {t('folder.summary', {
              count: String(items.length || folder.itemCount),
              size: formatFileSize(data?.totalBytes ?? 0),
            })}
          </p>
          <p className="text-3xs leading-relaxed text-content-muted">
            {t(folder.pageIndex === null ? 'folder.detached' : 'folder.explain')}
          </p>
        </div>

        <Button
          size="sm"
          variant="secondary"
          onClick={() => void saveAll()}
          isLoading={isZipping}
          disabled={items.length === 0}
        >
          <FolderArchive className="h-3.5 w-3.5" />
          {t('folder.downloadAll')}
        </Button>
      </div>

      {/* --- The pictures ------------------------------------------------------ */}
      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
        {isLoading && (
          <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: Math.min(8, Math.max(2, folder.itemCount)) }, (_, index) => (
              <li key={index}>
                <Skeleton className="aspect-square rounded-xl" />
              </li>
            ))}
          </ul>
        )}

        {!isLoading && (isError || items.length === 0) && (
          <EmptyState
            className="border-none py-10"
            icon={<ImageOff className="h-6 w-6" />}
            title={t(isError ? 'folder.loadFailed' : 'folder.empty')}
            description={t(isError ? 'folder.loadFailedBody' : 'folder.emptyBody')}
          />
        )}

        {items.length > 0 && (
          <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4 min-[1800px]:grid-cols-5">
            {items.map((item) => (
              <li
                key={item.id}
                className="ui-card group/tile overflow-hidden rounded-xl border border-edge bg-surface-raised"
              >
                <button
                  type="button"
                  onClick={() => setViewing(item)}
                  title={t('image.expand')}
                  aria-label={`${t('image.expand')}: ${item.name}`}
                  className={cn(
                    'block aspect-square w-full overflow-hidden bg-surface-sunken',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/60',
                  )}
                >
                  <img
                    src={item.url}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-300 ease-studio group-hover/tile:scale-[1.03]"
                  />
                </button>

                <div className="flex items-center gap-1 px-2 py-1.5">
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-2xs font-medium text-content" title={item.name}>
                      {item.name}
                    </p>
                    <p className="text-4xs tabular-nums text-content-faint">
                      {formatFileSize(item.size)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void saveItem(item)}
                    disabled={savingId === item.id}
                    aria-label={t('folder.downloadOne', { name: item.name })}
                    title={t('folder.downloadOne', { name: item.name })}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-content-muted transition-colors hover:bg-surface-sunken hover:text-content disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>

                  {/* Two-step, like every destructive control on this board —
                      and it says "from folder", because that is all it does to
                      a picture still pinned on the whiteboard. */}
                  {item.canRemove && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirmingId !== item.id) {
                          setConfirmingId(item.id);
                          return;
                        }
                        setConfirmingId(null);
                        removeItem.mutate(item.id);
                      }}
                      onBlur={() => setConfirmingId((current) => (current === item.id ? null : current))}
                      aria-label={t('folder.remove', { name: item.name })}
                      title={t(confirmingId === item.id ? 'folder.removeConfirm' : 'folder.removeHint')}
                      className={cn(
                        'grid h-7 shrink-0 place-items-center rounded-lg transition-colors',
                        confirmingId === item.id
                          ? 'bg-danger px-2 text-3xs font-semibold text-white'
                          : 'w-7 text-content-muted hover:bg-danger/10 hover:text-danger',
                      )}
                    >
                      {confirmingId === item.id ? (
                        t('folder.removeConfirm')
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ImageViewer
        src={viewing?.url ?? ''}
        alt={viewing?.name ?? ''}
        isOpen={viewing !== null}
        onClose={() => setViewing(null)}
        actions={
          viewing && (
            <button
              type="button"
              onClick={() => void saveItem(viewing)}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-white/10 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/20"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">{t('folder.download')}</span>
            </button>
          )
        }
      />
    </div>
  );
};
