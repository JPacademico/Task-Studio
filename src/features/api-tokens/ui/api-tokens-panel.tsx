import { useState } from 'react';
import { toast } from 'sonner';
import { Check, Copy, KeyRound, Plus } from 'lucide-react';

import {
  useApiTokens,
  useCreateApiToken,
  useRevokeApiToken,
} from '@/entities/integration/model/queries';
import { formatDateTime, formatRelative } from '@/shared/lib/dates';
import { cn } from '@/shared/lib/cn';
import { Button, Input, Select, Skeleton } from '@/shared/ui';
import { useT } from '@/shared/i18n';

/** How long a new token lives. `0` is the app's spelling of "no expiry". */
const LIFETIMES = [
  { value: '30', labelKey: 'tokens.days30' },
  { value: '90', labelKey: 'tokens.days90' },
  { value: '365', labelKey: 'tokens.days365' },
  { value: '0', labelKey: 'tokens.never' },
] as const;

/**
 * Personal access tokens, for everything that is not a browser.
 *
 * ## Why anybody needs one
 *
 * The app's own session is a fifteen-minute token refreshed by a browser.
 * Nothing else can use that — a cron job, a script, a Zapier action reading a
 * project — and without an alternative the workaround people reach for is
 * putting their password in a script. This exists so that never has to be the
 * answer.
 *
 * It ships alongside webhooks deliberately: a webhook is how the app tells you
 * something happened, and this is how you ask. Between them they cover both
 * directions without the app needing to know about any particular vendor.
 *
 * ## Why the panel is blunt about what a token can do
 *
 * Because it can do everything its owner can. There are no scopes — see the
 * API's `ApiTokenService` for why a half-enforced permission system is worse
 * than an honest absence — and a UI that implied otherwise, or simply did not
 * mention it, would be the place that implication came from. So the sentence
 * is on the panel, above the button, rather than in documentation nobody
 * opens.
 */
export const ApiTokensPanel = () => {
  const t = useT();

  const { data: tokens = [], isLoading } = useApiTokens();
  const create = useCreateApiToken();
  const revoke = useRevokeApiToken();

  const [isComposing, setIsComposing] = useState(false);
  const [name, setName] = useState('');
  const [lifetime, setLifetime] = useState<string>('90');

  /**
   * The token, held only as long as the panel is open.
   *
   * Never written to the query cache, for the same reason the calendar feed's
   * URL is not: the cache survives navigation and is read by anything that
   * asks for the key, and this is a credential whose entire security model is
   * that it exists in exactly one place for exactly one moment.
   */
  const [revealed, setRevealed] = useState<{ name: string; token: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async () => {
    if (name.trim().length === 0) return;

    const days = Number.parseInt(lifetime, 10);
    const result = await create.mutateAsync({
      name: name.trim(),
      // `0` is the panel's spelling of "no expiry"; the API's is an absent
      // field. Translated here rather than sending a zero the DTO would refuse.
      expiresInDays: days > 0 ? days : undefined,
    });

    setRevealed({ name: result.name, token: result.token });
    setIsComposing(false);
    setName('');
    setCopied(false);
  };

  const copy = async () => {
    if (!revealed) return;

    try {
      await navigator.clipboard.writeText(revealed.token);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      toast.error(t('tokens.copyFailed'));
    }
  };

  if (isLoading) return <Skeleton className="h-24 rounded-2xl" />;

  return (
    <div className="space-y-3 rounded-2xl border border-edge bg-surface-raised p-4">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-edge bg-surface-sunken text-content-muted"
        >
          <KeyRound className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold">{t('tokens.title')}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-content-muted">
            {t('tokens.pitch')}
          </p>
        </div>
      </div>

      {/* --- The value, once --------------------------------------------- */}
      {revealed && (
        <div className="space-y-2 rounded-xl border border-brand/40 bg-brand/[0.06] p-3">
          <p className="text-[11px] font-medium text-brand">
            {t('tokens.copyNow', { name: revealed.name })}
          </p>

          <div className="flex items-center gap-1.5">
            <input
              readOnly
              value={revealed.token}
              onFocus={(event) => event.currentTarget.select()}
              aria-label={t('tokens.title')}
              className="field h-8 flex-1 py-0 font-mono text-[10px]"
            />
            <Button
              size="sm"
              variant={copied ? 'secondary' : 'primary'}
              onClick={() => void copy()}
              className="h-8 shrink-0 gap-1.5 px-2.5 text-[11px]"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {t(copied ? 'tokens.copied' : 'tokens.copy')}
            </Button>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setRevealed(null)}
            className="h-6 px-2 text-[10px]"
          >
            {t('tokens.dismiss')}
          </Button>
        </div>
      )}

      {/* --- The list ----------------------------------------------------- */}
      {tokens.length > 0 && (
        <ul className="divide-y divide-edge/70 border-t border-edge/70">
          {tokens.map((token) => (
            <li key={token.id} className="flex items-center gap-2 py-2">
              <div className="min-w-0 flex-1 leading-tight">
                <p className="flex items-center gap-1.5 truncate text-xs font-medium">
                  <span className="truncate">{token.name}</span>
                  {!token.isActive && (
                    <span className="shrink-0 rounded-full border border-edge px-1.5 text-[9px] uppercase tracking-wider text-content-faint">
                      {t(token.revokedAt ? 'tokens.revokedTag' : 'tokens.expiredTag')}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px] text-content-faint">
                  <span className="font-mono">{token.prefix}…</span>
                  <span>
                    {token.lastUsedAt
                      ? t('tokens.lastUsed', { when: formatRelative(token.lastUsedAt) })
                      : t('tokens.neverUsed')}
                  </span>
                  {token.expiresAt && token.isActive && (
                    <span title={formatDateTime(token.expiresAt)}>
                      {t('tokens.expires', { when: formatRelative(token.expiresAt) })}
                    </span>
                  )}
                </p>
              </div>

              {token.isActive && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => revoke.mutate(token.id)}
                  className="h-7 shrink-0 px-2 text-[10px] text-danger hover:text-danger"
                >
                  {t('tokens.revoke')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* --- The composer -------------------------------------------------- */}
      {isComposing ? (
        <div className="space-y-2 border-t border-edge/70 pt-3">
          <div className="flex flex-wrap items-end gap-2">
            <Input
              label={t('tokens.name')}
              name="tokenName"
              value={name}
              onChange={(event) => setName(event.target.value.slice(0, 60))}
              placeholder={t('tokens.namePlaceholder')}
              maxLength={60}
              wrapperClassName="min-w-[10rem] flex-1"
              autoFocus
            />
            <Select
              size="md"
              label={t('tokens.lifetime')}
              value={lifetime}
              onChange={setLifetime}
              options={LIFETIMES.map((option) => ({
                value: option.value,
                label: t(option.labelKey),
              }))}
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              onClick={() => void submit()}
              isLoading={create.isPending}
              disabled={name.trim().length === 0}
              className="h-7 px-2.5 text-[10px]"
            >
              {t('tokens.create')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsComposing(false)}
              className="h-7 px-2.5 text-[10px]"
            >
              {t('common.cancel')}
            </Button>
          </div>

          <p className={cn('text-[10px] leading-relaxed text-warning')}>
            {t('tokens.scopeWarning')}
          </p>
        </div>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setIsComposing(true)}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
          {t('tokens.new')}
        </Button>
      )}
    </div>
  );
};
