import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { useT } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';

/**
 * One page of a list, and the controls to move through it. The page follows the list: it clamps
 * when items go, and jumps to the end when `followNew` and an item is added.
 */
export const usePagedList = <T,>(items: T[], pageSize: number, followNew = false) => {
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const [page, setPage] = useState(0);
  const seen = useRef(items.length);

  useEffect(() => {
    if (followNew && items.length > seen.current) setPage(Math.ceil(items.length / pageSize) - 1);
    seen.current = items.length;
  }, [followNew, items.length, pageSize]);

  const current = Math.min(page, pages - 1);
  return {
    page: current,
    pages,
    setPage,
    items: items.slice(current * pageSize, current * pageSize + pageSize),
    offset: current * pageSize,
  };
};

interface PagerProps {
  page: number;
  pages: number;
  onChange: (page: number) => void;
  className?: string;
}

/** "‹ 2 / 4 ›" — drawn only when there is more than one page. */
export const Pager = ({ page, pages, onChange, className }: PagerProps) => {
  const t = useT();
  if (pages <= 1) return null;

  const step =
    'grid h-6 w-6 place-items-center rounded-md text-content-muted transition-colors hover:bg-surface-sunken hover:text-content disabled:pointer-events-none disabled:opacity-35';

  return (
    <nav
      aria-label={t('common.pagination')}
      className={cn('flex items-center justify-center gap-1.5', className)}
    >
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page === 0}
        aria-label={t('common.previousPage')}
        className={step}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-[3.5rem] text-center text-3xs font-medium tabular-nums text-content-faint">
        {t('common.pageOf', { page: String(page + 1), pages: String(pages) })}
      </span>
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= pages - 1}
        aria-label={t('common.nextPage')}
        className={step}
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </nav>
  );
};
