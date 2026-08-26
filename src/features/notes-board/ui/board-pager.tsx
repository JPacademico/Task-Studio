import { useEffect, useRef, useState } from 'react';
import { Check, Pencil, Plus, X } from 'lucide-react';

import type { BoardPage } from '@/entities/note/model/types';
import { MAX_BOARD_PAGES, TEXT_LIMITS } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { clampText } from '@/shared/lib/text';
import { PageStack } from '@/shared/ui';
import { useT } from '@/shared/i18n';

interface BoardPagerProps {
  pages: BoardPage[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onRename: (index: number, name: string) => void;
  isAdding: boolean;
}

const MAX_NAME = TEXT_LIMITS.boardPageName;

/** Tabs across the top of the board — one per page, up to ten. */
export const BoardPager = ({
  pages,
  activeIndex,
  onSelect,
  onAdd,
  onRemove,
  onRename,
  isAdding,
}: BoardPagerProps) => {
  const t = useT();
  const isFull = pages.length >= MAX_BOARD_PAGES;

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingIndex !== null) inputRef.current?.select();
  }, [editingIndex]);

  const startRename = (page: BoardPage) => {
    setEditingIndex(page.index);
    setDraft(page.name);
  };

  const commit = () => {
    if (editingIndex === null) return;

    const name = draft.trim().slice(0, MAX_NAME);
    const page = pages.find((entry) => entry.index === editingIndex);
    if (name && name !== page?.name) onRename(editingIndex, name);

    setEditingIndex(null);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 inline-flex items-center gap-1.5 text-[11px] text-content-faint">
        <PageStack className="h-3.5 w-3.5" />
        {pages.length}/{MAX_BOARD_PAGES}
      </span>

      {pages.map((page) => {
        const isActive = page.index === activeIndex;
        const isEditing = editingIndex === page.index;

        if (isEditing) {
          return (
            // Renaming happens in place. A window.prompt() is the browser's
            // dialog, not the app's, and it cannot show the length limit or be
            // cancelled with anything but the keyboard.
            <span
              key={page.index}
              className="inline-flex items-center gap-1 rounded-xl border border-brand bg-brand/10 pl-2"
            >
              <input
                ref={inputRef}
                value={draft}
                maxLength={MAX_NAME}
                autoFocus
                onChange={(event) => setDraft(clampText(event.target.value, MAX_NAME))}
                onBlur={commit}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commit();
                  if (event.key === 'Escape') setEditingIndex(null);
                }}
                aria-label={t('common.renameNamed', { name: page.name })}
                className="w-28 bg-transparent py-1.5 text-xs font-medium outline-none"
              />
              <button
                type="button"
                aria-label={t('notes.savePageName')}
                // Fires before blur, so the click is not lost to the commit.
                onMouseDown={(event) => event.preventDefault()}
                onClick={commit}
                className="mr-1 rounded-lg p-1 text-brand transition-colors hover:bg-brand/15"
              >
                <Check className="h-3 w-3" strokeWidth={3} />
              </button>
            </span>
          );
        }

        return (
          <span
            key={page.index}
            className={cn(
              'group inline-flex items-center rounded-xl border transition-colors duration-150',
              isActive
                ? 'border-brand/40 bg-brand/12 text-brand'
                : 'border-edge text-content-muted hover:text-content',
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(page.index)}
              onDoubleClick={() => startRename(page)}
              title={t('notes.doubleClickRename')}
              className="max-w-[10rem] truncate px-3 py-1.5 text-xs font-medium"
            >
              {page.name}
            </button>

            {/* The visible way in. Double-click still works for anyone who
                already knows it, but a rename must not be a hidden gesture. */}
            <button
              type="button"
              aria-label={t('common.renameNamed', { name: page.name })}
              title={t('notes.renamePage')}
              onClick={() => startRename(page)}
              className={cn(
                'rounded-lg p-1 opacity-0 transition-opacity hover:text-brand',
                'group-hover:opacity-100 focus-visible:opacity-100',
                isActive && 'opacity-70',
              )}
            >
              <Pencil className="h-3 w-3" />
            </button>

            {pages.length > 1 && (
              <button
                type="button"
                aria-label={t('common.removeNamed', { name: page.name })}
                onClick={() => {
                  if (
                    window.confirm(t('notes.confirmRemovePage', { name: page.name }))
                  ) {
                    onRemove(page.index);
                  }
                }}
                className="mr-1 rounded-lg p-1 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100 focus-visible:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        );
      })}

      <button
        type="button"
        onClick={onAdd}
        disabled={isFull || isAdding}
        title={
          isFull
            ? t('board.pagesFull', { max: String(MAX_BOARD_PAGES) })
            : t('board.addPage')
        }
        className={cn(
          'inline-flex items-center gap-1 rounded-xl border border-dashed px-2.5 py-1.5 text-xs transition-colors',
          isFull
            ? 'cursor-not-allowed border-edge text-content-faint opacity-50'
            : 'border-edge text-content-muted hover:border-brand hover:text-brand',
        )}
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
        {t('notes.addPageAction')}
      </button>
    </div>
  );
};
