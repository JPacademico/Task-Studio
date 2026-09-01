import { useState } from 'react';
import { AlertTriangle, KeyRound, Laptop } from 'lucide-react';

import { useApiTokens, useRevokeApiToken } from '@/entities/integration/model/queries';
import type { ApiToken } from '@/entities/integration/model/types';
import { formatRelative } from '@/shared/lib/dates';
import { Button, EmptyState, Modal, Skeleton } from '@/shared/ui';
import { useT } from '@/shared/i18n';

/**
 * One signed-in machine.
 *
 * ## What earns each line
 *
 * The **name** is what `taskstudio login` sent — the machine's own hostname —
 * and it is the answer to the only question anybody asks of this list: "which
 * of these is the laptop I sold". It carries a `title` because at 375px a
 * realistic hostname truncates, and a truncated answer to that question is no
 * answer.
 *
 * The **last used** date is what makes the name actionable; a name alone
 * cannot tell you whether the machine you are worried about has been near your
 * account this month.
 *
 * The **expiry** is new. `ApiToken` has carried `expiresAt` all along and this
 * panel never drew it, so a credential dying on Thursday looked identical to
 * one that never expires — on a list whose entire job is to say what can reach
 * your account.
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
        <p className="text-[11px] text-content-muted">
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

      {/*
        Named, so a screen reader hears five different rows rather than
        "Revoke, Revoke, Revoke, Revoke, Revoke". The visible label stays one
        word because the column is narrow and the name is already beside it.
      */}
      <Button variant="ghost" size="sm" onClick={onRevoke} aria-label={t('cli.revokeNamed', { name: token.name })}>
        {t('cli.revoke')}
      </Button>
    </li>
  );
};

/**
 * The machines that can currently reach this account.
 *
 * ## Why this is its own panel and its own section
 *
 * Because it is an inventory of live credentials, and it was previously bolted
 * onto the CLI's install offer inside one border. That fusion made the panel
 * argue with itself: the offer wants to fold away for the majority who will
 * never install a CLI, and an inventory of things that can reach your account
 * must not. Splitting them lets each obey its own rule.
 *
 * ## Three states, not one
 *
 * The version this replaces rendered the list behind `active.length > 0`, which
 * is also what a **failed request** looks like — `isLoading` goes false, the
 * array is empty, and the heading and list unmount together. A network error
 * was pixel-identical to "nothing can reach your account", on the one surface
 * where those two must never be confused. So the empty state and the error
 * state are both drawn, and both say which one they are.
 *
 * ## Why revoked tokens are not listed
 *
 * The API keeps the row so `lastUsedAt` survives a panicked revocation, and
 * that record is worth having — but this list answers a question about the
 * present. A revoked credential in a list of what can reach your account is a
 * line the reader has to rule out. That belongs in an audit view.
 */
export const CliMachinesPanel = () => {
  const t = useT();
  const { data: tokens, isLoading, isError, refetch, isRefetching } = useApiTokens();
  const revoke = useRevokeApiToken();

  /*
   * The machine awaiting confirmation, or null.
   *
   * A piece of state rather than `window.confirm`, and the reason is not
   * taste. A native dialog is suppressible: a browser told to block dialogs
   * for this origin returns `false` from `confirm()` synchronously, so Revoke
   * would do nothing, forever, with no feedback — on the one irreversible
   * action in this feature. It is also unstyled by all thirteen skins, and its
   * OK/Cancel arrive in the *browser's* UI language while this app stores its
   * own locale separately.
   *
   * `CalendarConnectionPanel`, forty pixels below this one, already refused
   * `window.confirm` for an action that is undone by reconnecting. The more
   * destructive one had the weaker guard.
   */
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
            {/*
              `danger`, matching the recycle bin's purge. The old control was a
              muted ghost button — lower visual weight than a Copy button's
              hover state, for the only action on this surface that cannot be
              undone.
            */}
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
