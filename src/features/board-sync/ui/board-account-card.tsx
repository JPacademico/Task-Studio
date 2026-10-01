import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

import { useBoardStatus, useDisconnectBoard } from '@/entities/integration/model/boards.queries';
import type { BoardProvider } from '@/entities/integration/model/types';
import { cn } from '@/shared/lib/cn';
import { useT } from '@/shared/i18n';
import { Button, JiraMark, Skeleton, TrelloMark } from '@/shared/ui';
import { connectBoardAccount } from '../model/connect';

const MARKS = { TRELLO: TrelloMark, JIRA: JiraMark } as const;

interface BoardAccountCardProps {
  provider: BoardProvider;
  /** Reopen the import dialog after the provider redirect. */
  resumeImport?: boolean;
  compact?: boolean;
}

/** Connect or disconnect one person's Trello or Jira account. */
export const BoardAccountCard = ({ provider, resumeImport = false, compact = false }: BoardAccountCardProps) => {
  const t = useT();
  const { data, isLoading } = useBoardStatus();
  const disconnect = useDisconnectBoard();
  const [isConnecting, setIsConnecting] = useState(false);

  const Mark = MARKS[provider];
  const status = data?.[provider === 'TRELLO' ? 'trello' : 'jira'];
  const name = t(provider === 'TRELLO' ? 'connections.svc.trello' : 'connections.svc.jira');

  if (isLoading) return <Skeleton className={cn('rounded-2xl', compact ? 'h-16' : 'h-24')} />;

  if (!status?.available) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-dashed border-edge bg-surface-raised p-4">
        <Mark className="h-8 w-8 shrink-0 opacity-50 grayscale" />
        <div className="min-w-0">
          <p className="text-xs font-medium text-content">{t('boards.unavailable', { name })}</p>
          <p className="mt-1 text-2xs leading-relaxed text-content-muted">{t('boards.unavailableHint')}</p>
        </div>
      </div>
    );
  }

  const connect = async () => {
    setIsConnecting(true);
    await connectBoardAccount(provider, { resumeImport });
    setIsConnecting(false);
  };

  if (!status.connection) {
    return (
      <button
        type="button"
        onClick={() => void connect()}
        disabled={isConnecting}
        className={cn(
          'ui-card flex w-full items-center gap-3 rounded-2xl border border-edge bg-surface-raised text-left',
          compact ? 'p-3' : 'p-4',
          'transition-colors hover:border-brand/50 disabled:opacity-60',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
        )}
      >
        <Mark className="h-8 w-8 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-content">{name}</span>
          <span className="mt-0.5 block text-2xs leading-relaxed text-content-muted">
            {t(provider === 'TRELLO' ? 'boards.trelloPitch' : 'boards.jiraPitch')}
          </span>
        </span>
        <span className="shrink-0 text-xs font-medium text-brand">{t('boards.connect')}</span>
      </button>
    );
  }

  const { connection } = status;

  return (
    <div className={cn('rounded-2xl border border-edge bg-surface-raised', compact ? 'p-3' : 'p-4')}>
      <div className="flex items-center gap-3">
        <Mark className="h-8 w-8 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-content">{name}</p>
          <p className="mt-0.5 truncate text-2xs text-content-muted">
            {t('boards.connectedAs', { name: connection.accountName })}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => disconnect.mutate(provider)}
          isLoading={disconnect.isPending}
        >
          {t('boards.disconnect')}
        </Button>
      </div>

      {connection.lastError && (
        <div className="mt-2.5 flex items-start justify-between gap-3 rounded-xl bg-warning/10 p-2.5">
          <p className="flex items-start gap-1.5 text-3xs leading-relaxed text-warning">
            <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
            <span>{connection.lastError}</span>
          </p>
          <Button variant="secondary" size="sm" onClick={() => void connect()} isLoading={isConnecting}>
            {t('boards.reconnect')}
          </Button>
        </div>
      )}

      {!compact && <p className="mt-3 text-3xs leading-relaxed text-content-faint">{t('boards.readOnlyNote')}</p>}
    </div>
  );
};
