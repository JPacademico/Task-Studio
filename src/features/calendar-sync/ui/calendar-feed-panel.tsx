import { useState } from 'react';
import { toast } from 'sonner';
import { Check, Copy, Link2, RotateCcw, Rss } from 'lucide-react';

import {
  useCalendarFeed,
  useIssueCalendarFeed,
  useRevokeCalendarFeed,
} from '@/entities/integration/model/queries';
import { formatRelative } from '@/shared/lib/dates';
import { cn } from '@/shared/lib/cn';
import { Button, Skeleton } from '@/shared/ui';
import { useT } from '@/shared/i18n';

/**
 * A calendar feed anybody's calendar application can subscribe to.
 *
 * ## Why this sits under the Google panel rather than replacing it
 *
 * They are different trades and most people want this one. Google sync is
 * two-way and costs a consent screen, a stored credential and a background
 * poll; a feed is one-way and costs a URL. Somebody on Outlook, on a phone's
 * built-in calendar, or who simply does not want to grant an app write access
 * to their account gets the whole of what they actually wanted from the
 * cheaper half.
 *
 * Second in the panel rather than first, because it is the one that needs
 * explaining. Connecting Google is a button somebody recognises; subscribing
 * to a URL is a thing people have to be shown once.
 *
 * ## Why the URL is shown once and then never again
 *
 * Because only its hash is stored — it is a bearer credential, and it is kept
 * the way every other bearer credential in this app is kept. That has a real
 * cost in the interface: somebody who closes this panel without copying the
 * URL has to rotate to get another, which invalidates the subscription they
 * may have already set up on one device.
 *
 * So the reveal is deliberately sticky — it stays until dismissed rather than
 * disappearing on the next render — and the copy button is the primary action
 * rather than a secondary affordance next to the text.
 */
export const CalendarFeedPanel = () => {
  const t = useT();

  const { data, isLoading } = useCalendarFeed();
  const issue = useIssueCalendarFeed();
  const revoke = useRevokeCalendarFeed();

  /**
   * The URL, held in component state for as long as the panel is open.
   *
   * Deliberately not written into the query cache. The cache is read by
   * anything that asks for that key and survives navigation; this is a secret
   * that should live exactly as long as the moment it is being copied in.
   */
  const [revealed, setRevealed] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isConfirmingRotate, setIsConfirmingRotate] = useState(false);

  const mint = async () => {
    const result = await issue.mutateAsync();
    setRevealed(result.url);
    setIsConfirmingRotate(false);
    setCopied(false);
  };

  const copy = async () => {
    if (!revealed) return;

    try {
      await navigator.clipboard.writeText(revealed);
      setCopied(true);
      // Reverts on its own, so the button does not sit reading "Copied"
      // forever and stop looking like something that can be pressed again.
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      /*
       * `writeText` is refused outright in a few contexts — an insecure
       * origin, Safari outside a user gesture — and the honest fallback is to
       * tell somebody to copy it themselves rather than to fail silently. The
       * URL is on screen; only the shortcut is missing.
       */
      toast.error(t('feed.copyFailed'));
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
          <Rss className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold">{t('feed.title')}</p>
          <p className="mt-1 text-2xs leading-relaxed text-content-muted">
            {t('feed.pitch')}
          </p>
        </div>
      </div>

      {/* --- The URL, once ------------------------------------------------ */}
      {revealed && (
        <div className="space-y-2 rounded-xl border border-brand/40 bg-brand/[0.06] p-3">
          <p className="text-2xs font-medium text-brand">{t('feed.copyNow')}</p>

          <div className="flex items-center gap-1.5">
            {/*
              A read-only input rather than a `<p>`: it is selectable with a
              triple-click, it scrolls rather than wrapping a 120-character URL
              across four lines, and it is what somebody reaches for when the
              clipboard button does not work.
            */}
            <input
              readOnly
              value={revealed}
              onFocus={(event) => event.currentTarget.select()}
              aria-label={t('feed.title')}
              className="field h-8 flex-1 py-0 font-mono text-3xs"
            />
            <Button
              size="sm"
              variant={copied ? 'secondary' : 'primary'}
              onClick={() => void copy()}
              className="h-8 shrink-0 gap-1.5 px-2.5 text-2xs"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {t(copied ? 'feed.copied' : 'feed.copy')}
            </Button>
          </div>

          <p className="text-3xs leading-relaxed text-content-muted">
            {t('feed.howTo')}
          </p>
        </div>
      )}

      {/* --- State and controls ------------------------------------------- */}
      {!data?.exists ? (
        <Button size="sm" variant="secondary" onClick={() => void mint()} isLoading={issue.isPending}>
          <Link2 className="h-3.5 w-3.5" />
          {t('feed.create')}
        </Button>
      ) : (
        <div className="space-y-2 border-t border-edge/70 pt-3">
          <p className="text-3xs text-content-faint">
            {data.lastAccessedAt
              ? t('feed.lastFetched', { when: formatRelative(data.lastAccessedAt) })
              : t('feed.neverFetched')}
          </p>

          {isConfirmingRotate ? (
            <div className="space-y-2">
              <p className="text-2xs leading-relaxed text-content-muted">
                {t('feed.rotateExplain')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => void mint()}
                  isLoading={issue.isPending}
                  className="h-7 px-2.5 text-3xs"
                >
                  {t('feed.rotateConfirm')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsConfirmingRotate(false)}
                  className="h-7 px-2.5 text-3xs"
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setIsConfirmingRotate(true)}
                className="h-7 gap-1 px-2.5 text-3xs"
              >
                <RotateCcw className="h-3 w-3" />
                {t('feed.rotate')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setRevealed(null);
                  revoke.mutate();
                }}
                isLoading={revoke.isPending}
                className={cn('h-7 px-2.5 text-3xs text-danger hover:text-danger')}
              >
                {t('feed.revoke')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
