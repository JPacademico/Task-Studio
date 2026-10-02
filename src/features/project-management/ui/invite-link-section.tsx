import { useRef, useState } from 'react';
import { Check, Copy, Link2 } from 'lucide-react';

import type { InviteLinkExpiry } from '@/entities/project/api/invite-link.api';
import {
  useProjectInviteLink,
  useRevokeInviteLink,
  useRotateInviteLink,
} from '@/entities/project/model/invite-link.queries';
import { formatCalendarDate } from '@/shared/lib/dates';
import { toast } from '@/shared/lib/toast';
import { useT } from '@/shared/i18n';
import { Button, Select, Skeleton } from '@/shared/ui';

type ExpiryOption = '1' | '7' | '30' | 'never';

const toExpiry = (value: ExpiryOption): InviteLinkExpiry =>
  value === 'never' ? null : (Number(value) as 1 | 7 | 30);

/** Owners and admins share one join link; anyone without an account is sent to sign up first. */
export const InviteLinkSection = ({ projectId, isOpen }: { projectId: string; isOpen: boolean }) => {
  const t = useT();
  const { data: link, isLoading } = useProjectInviteLink(projectId, isOpen);
  const rotate = useRotateInviteLink(projectId);
  const revoke = useRevokeInviteLink(projectId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [expiry, setExpiry] = useState<ExpiryOption>('7');
  const [copied, setCopied] = useState(false);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      toast.success(t('inviteLink.copied'));
    } catch {
      // No clipboard outside a secure context: leave the text selected for Ctrl+C.
      inputRef.current?.select();
      toast(t('inviteLink.copyManually'));
    }
  };

  const create = async () => {
    const created = await rotate.mutateAsync(toExpiry(expiry));
    setIsConfirmingReset(false);
    void copy(created.url);
  };

  const expiryOptions = [
    { value: '1' as const, label: t('inviteLink.expires1') },
    { value: '7' as const, label: t('inviteLink.expires7') },
    { value: '30' as const, label: t('inviteLink.expires30') },
    { value: 'never' as const, label: t('inviteLink.expiresNever') },
  ];

  return (
    <section className="space-y-2.5 rounded-xl border border-edge bg-surface-sunken/50 p-3.5">
      <header className="flex items-center gap-2">
        <Link2 className="h-3.5 w-3.5 shrink-0 text-content-faint" />
        <h3 className="ui-panel-title text-xs font-semibold">{t('inviteLink.title')}</h3>
      </header>

      <p className="text-2xs leading-relaxed text-content-muted">{t('inviteLink.explain')}</p>

      {isLoading ? (
        <Skeleton className="h-9 rounded-lg" />
      ) : link ? (
        <>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              readOnly
              value={link.url}
              aria-label={t('inviteLink.title')}
              onFocus={(event) => event.target.select()}
              className="min-w-0 flex-1 rounded-lg border border-edge bg-surface-raised px-2.5 py-1.5 font-mono text-3xs text-content-muted outline-none focus:border-brand/50"
            />
            <Button type="button" size="sm" onClick={() => void copy(link.url)}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {t(copied ? 'inviteLink.copiedShort' : 'inviteLink.copy')}
            </Button>
          </div>

          <p className="text-3xs text-content-faint">
            {link.expiresAt
              ? t('inviteLink.expiresOn', { date: formatCalendarDate(link.expiresAt) })
              : t('inviteLink.neverExpires')}
            {' · '}
            {t('inviteLink.uses', { count: link.useCount })}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Select size="sm" value={expiry} onChange={setExpiry} options={expiryOptions} />
            <Button
              type="button"
              variant={isConfirmingReset ? 'danger' : 'secondary'}
              size="sm"
              onClick={() => (isConfirmingReset ? void create() : setIsConfirmingReset(true))}
              onBlur={() => setIsConfirmingReset(false)}
              isLoading={rotate.isPending}
            >
              {t(isConfirmingReset ? 'inviteLink.resetConfirm' : 'inviteLink.reset')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => revoke.mutate()}
              isLoading={revoke.isPending}
            >
              {t('inviteLink.turnOff')}
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Select size="sm" value={expiry} onChange={setExpiry} options={expiryOptions} />
          <Button type="button" size="sm" onClick={() => void create()} isLoading={rotate.isPending}>
            <Link2 className="h-3.5 w-3.5" />
            {t('inviteLink.create')}
          </Button>
        </div>
      )}
    </section>
  );
};
