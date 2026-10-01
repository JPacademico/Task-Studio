import { useMemo, useState } from 'react';
import { Check, ExternalLink, Search } from 'lucide-react';

import { useBoardChoices } from '@/entities/integration/model/boards.queries';
import type { BoardChoice, BoardProvider } from '@/entities/integration/model/types';
import { errorMessage } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { useT } from '@/shared/i18n';
import { Skeleton } from '@/shared/ui';

interface BoardPickerProps {
  provider: BoardProvider;
  value: BoardChoice | null;
  onChange: (choice: BoardChoice) => void;
}

/** The boards or projects the connected account can see, filterable by name. */
export const BoardPicker = ({ provider, value, onChange }: BoardPickerProps) => {
  const t = useT();
  const { data = [], isLoading, error } = useBoardChoices(provider, true);
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? data.filter((choice) => choice.name.toLowerCase().includes(needle)) : data;
  }, [data, query]);

  if (isLoading) return <Skeleton className="h-40 rounded-xl" />;

  if (error) {
    return (
      <p className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-2xs leading-relaxed text-danger">
        {errorMessage(error, t('boards.listFailed'))}
      </p>
    );
  }

  if (data.length === 0) {
    return (
      <p className="rounded-xl border border-edge bg-surface-sunken/40 p-3 text-2xs leading-relaxed text-content-muted">
        {t(provider === 'TRELLO' ? 'boards.noTrelloBoards' : 'boards.noJiraProjects')}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 rounded-xl border border-edge bg-surface-sunken/50 px-3 py-2 focus-within:border-brand/50">
        <Search aria-hidden className="h-3.5 w-3.5 shrink-0 text-content-faint" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value.slice(0, 80))}
          placeholder={t(provider === 'TRELLO' ? 'boards.searchBoards' : 'boards.searchProjects')}
          aria-label={t(provider === 'TRELLO' ? 'boards.searchBoards' : 'boards.searchProjects')}
          className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-content-faint"
        />
      </label>

      <ul className="max-h-56 space-y-1 overflow-y-auto overscroll-contain pr-1">
        {visible.map((choice) => {
          const isSelected = value?.id === choice.id && value.siteId === choice.siteId;
          return (
            <li key={`${choice.siteId ?? ''}:${choice.id}`}>
              <div
                className={cn(
                  'flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors',
                  isSelected ? 'border-brand/60 bg-brand/[0.07]' : 'border-transparent hover:bg-surface-sunken/60',
                )}
              >
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onChange(choice)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left focus-visible:outline-none"
                >
                  <span
                    aria-hidden
                    className={cn(
                      'grid h-4 w-4 shrink-0 place-items-center rounded-full border',
                      isSelected ? 'border-brand bg-brand text-white' : 'border-edge',
                    )}
                  >
                    {isSelected && <Check className="h-2.5 w-2.5" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium">{choice.name}</span>
                    {choice.siteName && (
                      <span className="block truncate text-3xs text-content-faint">{choice.siteName}</span>
                    )}
                  </span>
                </button>
                {choice.url && (
                  <a
                    href={choice.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t('boards.openSource')}
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-content-faint hover:bg-surface-raised hover:text-content"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </li>
          );
        })}
        {visible.length === 0 && (
          <li className="px-3 py-2 text-2xs text-content-muted">{t('boards.noMatch')}</li>
        )}
      </ul>
    </div>
  );
};
