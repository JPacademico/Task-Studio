import { useState } from 'react';
import { AlertTriangle, KeyRound, Laptop } from 'lucide-react';

import { useApiTokens, useRevokeApiToken } from '@/entities/integration/model/queries';
import type { ApiToken } from '@/entities/integration/model/types';
import { formatRelative } from '@/shared/lib/dates';
import { Button, EmptyState, Modal, Skeleton } from '@/shared/ui';
import { useT } from '@/shared/i18n';

/**
 * One signed-in machine. The **name** is what `taskstudio login` sent — the machine's own hostname
 * — and it is the answer to the only question anybody asks of this list.
 */
const MachineRow = ({ token, onRevoke }: { token: ApiToken; onRevoke: () => void }) => {
  const t = useT();

  return (
    <li className="flex items-center gap-3 rounded-xl border border-edge px-3 py-2">
      <span
        aria-hidden
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-sunken text-content-muted"
      >
        <Laptop className="h-3.5 w-3.5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium" title={token.name}>
          {token.name}
        </p>
        <p className="text-2xs text-content-muted">
          <code>{token.prefix}…</code>
          {' · '}
          {token.lastUsedAt
            ? t('cli.lastUsed', { when: formatRelative(token.lastUsedAt) })
            : t('cli.neverUsed')}
          {token.expiresAt
            ? ` · ${t('cli.expires', { when: formatRelative(token.expiresAt) })}`
            : ` · ${t('cli.neverExpires')}`}
        </p>
      </div>

      {/* Named, so a screen reader hears five different rows rather than "Revoke, Revoke,
          Revoke, Revoke, Revoke". */}
      <Button variant="ghost" size="sm" onClick={onRevoke} aria-label={t('cli.revokeNamed', { name: token.name })}>
        {t('cli.revoke')}
      </Button>
    </li>
  );
};

/** The machines that can currently reach this account. */
export const CliMachinesPanel = () => {
  const t = useT();
  const { data: tokens, isLoading, isError, refetch, isRefetching } = useApiTokens();
  const revoke = useRevokeApiToken();

  // The machine awaiting confirmation, or null. A piece of state rather than `window.confirm`, and
  // the reason is not taste.
  const [pending, setPending] = useState<ApiToken | null>(null);

  const machines = (tokens ?? []).filter((token) => token.isActive);

  const confirmRevoke = () => {
    if (!pending) return;

    revoke.mutate(pending.id, {
      onSettled: () => setPending(null),
    });
  };

  return (
    <>
      {isLoading ? (
        <Skeleton className="h-16 w-full rounded-2xl" />
      ) : isError ? (
        <EmptyState
          icon={<AlertTriangle className="h-5 w-5" />}
          title={t('cli.machinesError')}
          description={t('cli.machinesErrorBody')}
          action={
            <Button variant="secondary" size="sm" onClick={() => void refetch()} isLoading={isRefetching}>
              {t('common.retry')}
            </Button>
          }
        />
      ) : machines.length === 0 ? (
        <EmptyState
          icon={<KeyRound className="h-5 w-5" />}
          title={t('cli.noMachines')}
          description={t('cli.noMachinesBody')}
        />
      ) : (
        <ul className="space-y-1.5">
          {machines.map((token) => (
            <MachineRow key={token.id} token={token} onRevoke={() => setPending(token)} />
          ))}
        </ul>
      )}

      <Modal
        isOpen={pending !== null}
        onClose={() => setPending(null)}
        title={t('cli.revokeTitle', { name: pending?.name ?? '' })}
        description={t('cli.revokeBody')}
        flat
        footer={
          <>
            <Button variant="ghost" onClick={() => setPending(null)}>
              {t('common.cancel')}
            </Button>
            {/* `danger`, matching the recycle bin's purge. The old control was a muted ghost
                button — lower visual weight than a Copy button's hover state. */}
            <Button variant="danger" onClick={confirmRevoke} isLoading={revoke.isPending}>
              {t('cli.revoke')}
            </Button>
          </>
        }
      >
        <p className="text-xs leading-relaxed text-content-muted">
          {t('cli.revokeDetail', { name: pending?.name ?? '' })}
        </p>
      </Modal>
    </>
  );
};
