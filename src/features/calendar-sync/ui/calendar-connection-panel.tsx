import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarCheck2,
  CalendarX2,
  RefreshCw,
} from 'lucide-react';

import { calendarApi } from '@/entities/integration/api/calendar.api';
import {
  useCalendarStatus,
  useDisconnectCalendar,
  useSyncCalendar,
  useUpdateCalendarSettings,
} from '@/entities/integration/model/queries';
import { errorMessage } from '@/shared/api/client';
import { formatRelative } from '@/shared/lib/dates';
import { cn } from '@/shared/lib/cn';
import { Button, Skeleton, Switch } from '@/shared/ui';
import { useT, type TranslationKey } from '@/shared/i18n';

/**
 * What the consent redirect says on the way back, per outcome.
 *
 * The API redirects to `/settings?calendar=…` rather than answering with JSON,
 * because the thing at the other end of an OAuth callback is a browser that was
 * *navigated* there — it has no code waiting to read a response body. The flag
 * is deliberately a short slug rather than a message: the API has no idea what
 * language the reader is in, and a sentence in a query string would be frozen
 * in whichever one the server was written in.
 */
const OUTCOME: Record<string, { key: TranslationKey; tone: 'success' | 'error' | 'info' }> = {
  connected: { key: 'calendar.connected', tone: 'success' },
  cancelled: { key: 'calendar.cancelled', tone: 'info' },
  failed: { key: 'calendar.connectFailed', tone: 'error' },
  noRefreshToken: { key: 'calendar.noRefreshToken', tone: 'error' },
};

/**
 * Connecting a personal Google Calendar, and choosing which way it flows.
 *
 * ## Where this lives, and why it is not on the meetings tab
 *
 * The *effect* is entirely on the meetings tab — that is what gets mirrored —
 * but the connection is a fact about the **account**, not about a project. One
 * person connects once and every project they are on is covered. Putting the
 * control on a project's calendar would imply the opposite: that it is
 * per-project, that a second project needs a second connection, and that
 * disconnecting affects only what is on screen. None of those is true, and all
 * three are what somebody would reasonably assume from where the button was.
 *
 * The meetings tab gets a *badge* instead — see `CalendarSyncBadge` — which is
 * the right division: the setting is where settings are, and the surface it
 * affects says whether it is on.
 *
 * ## Why the two directions are separate switches
 *
 * "Sync my calendar" sounds like one thing and is two, with genuinely
 * different risk. Pushing writes into somebody's Google account; pulling lets
 * Google move a meeting that other people are coming to. Plenty of people want
 * the first and not the second — a read-only mirror is a completely reasonable
 * thing to want — and a single switch would make that impossible to ask for.
 *
 * `isEnabled` on top of both is a *pause*, not "neither direction". It is what
 * the background sweep skips on, so a paused connection costs nothing at all
 * rather than costing a token refresh to discover it has nothing to do.
 */
export const CalendarConnectionPanel = () => {
  const t = useT();
  const [params, setParams] = useSearchParams();

  const { data, isLoading } = useCalendarStatus();
  const updateSettings = useUpdateCalendarSettings();
  const sync = useSyncCalendar();
  const disconnect = useDisconnectCalendar();

  const [isConnecting, setIsConnecting] = useState(false);
  const [isConfirmingDisconnect, setIsConfirmingDisconnect] = useState(false);

  /*
   * The consent redirect's outcome, said once and then removed from the URL.
   *
   * Stripping the parameter matters more than it looks: without it, a reader
   * who bookmarks the settings page or presses reload is told they connected
   * their calendar every single time they open it.
   */
  useEffect(() => {
    const outcome = params.get('calendar');
    if (!outcome) return;

    const entry = OUTCOME[outcome];
    if (entry) {
      if (entry.tone === 'success') toast.success(t(entry.key));
      else if (entry.tone === 'error') toast.error(t(entry.key));
      else toast(t(entry.key));
    }

    const next = new URLSearchParams(params);
    next.delete('calendar');
    setParams(next, { replace: true });
  }, [params, setParams, t]);

  const connect = async () => {
    setIsConnecting(true);
    try {
      /*
       * A full-page navigation, not a fetch.
       *
       * Google's consent screen is a page a human has to look at and press a
       * button on. It cannot be loaded into an XHR — and it refuses to be
       * framed — so the API answers with a URL and the browser goes there. It
       * comes back to `/settings?calendar=…`, which the effect above reads.
       */
      window.location.assign(await calendarApi.connectUrl());
    } catch (error) {
      setIsConnecting(false);
      toast.error(errorMessage(error, t('calendar.connectFailed')));
    }
  };

  if (isLoading) return <Skeleton className="h-32 rounded-2xl" />;

  /*
   * A deployment with no Google credentials, or no encryption key.
   *
   * Said plainly rather than hidden. Somebody looking for this feature because
   * they read about it deserves to know it is a deployment setting rather than
   * something they have failed to find — and whoever runs the deployment is
   * frequently the same person.
   */
  if (!data?.available) {
    return (
      <div className="rounded-2xl border border-edge bg-surface-raised p-4">
        <p className="text-xs text-content-muted">{t('calendar.unavailable')}</p>
      </div>
    );
  }

  const connection = data.connection;

  // --- Not connected -------------------------------------------------------

  if (!connection) {
    return (
      <div className="space-y-3 rounded-2xl border border-edge bg-surface-raised p-4">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/12 text-brand"
          >
            <CalendarCheck2 className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold">{t('calendar.title')}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-content-muted">
              {t('calendar.pitch')}
            </p>
          </div>
        </div>

        <Button size="sm" onClick={() => void connect()} isLoading={isConnecting}>
          {t('calendar.connect')}
        </Button>

        {/*
          What the grant actually covers, said before it is asked for.

          Worth the two lines: the scope this app requests is the narrow one
          (`calendar.app.created`), which cannot read anybody's existing
          appointments and can only write to the calendar it makes itself.
          That is unusual enough that not saying it would leave people
          assuming the worst, which is the reasonable assumption about a
          calendar integration.
        */}
        <p className="text-[10px] leading-relaxed text-content-faint">
          {t('calendar.scopeNote')}
        </p>
      </div>
    );
  }

  // --- Connected -----------------------------------------------------------

  return (
    <div className="space-y-3 rounded-2xl border border-edge bg-surface-raised p-4">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            'mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl',
            connection.isEnabled
              ? 'bg-positive/12 text-positive'
              : 'bg-surface-sunken text-content-faint',
          )}
        >
          {connection.isEnabled ? (
            <CalendarCheck2 className="h-4 w-4" />
          ) : (
            <CalendarX2 className="h-4 w-4" />
          )}
        </span>

        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-xs font-semibold">{connection.accountEmail}</p>
          <p className="mt-0.5 text-[10px] text-content-faint">
            {connection.lastSyncedAt
              ? t('calendar.lastSynced', { when: formatRelative(connection.lastSyncedAt) })
              : t('calendar.neverSynced')}
          </p>
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => sync.mutate()}
          isLoading={sync.isPending}
          title={t('calendar.syncNowHint')}
          className="h-7 gap-1 px-2 text-[10px]"
        >
          <RefreshCw className="h-3 w-3" />
          {t('calendar.syncNow')}
        </Button>
      </div>

      {/*
        The last thing that went wrong, shown rather than swallowed.

        The two failures that actually happen are both things only the user can
        resolve — a revoked grant, and a change refused because they may not
        edit that meeting — and a sync that silently stopped working is worse
        than one that says why it did.
      */}
      {connection.lastError && (
        <p className="flex items-start gap-1.5 rounded-lg bg-warning/10 px-2.5 py-2 text-[11px] leading-snug text-warning">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          {connection.lastError}
        </p>
      )}

      <div className="space-y-2 border-t border-edge/70 pt-3">
        <Switch
          checked={connection.isEnabled}
          onChange={(isEnabled) => updateSettings.mutate({ isEnabled })}
          label={t('calendar.enabled')}
          className="text-[11px]"
        />

        {/* The two directions, disabled together when the whole thing is
            paused — a switch that changes a setting nothing is reading is a
            control that lies about having done something. */}
        <div className={cn('space-y-2 pl-1', !connection.isEnabled && 'pointer-events-none opacity-50')}>
          <Switch
            checked={connection.pushEnabled}
            onChange={(pushEnabled) => updateSettings.mutate({ pushEnabled })}
            label={t('calendar.push')}
            className="text-[11px]"
          />
          <Switch
            checked={connection.pullEnabled}
            onChange={(pullEnabled) => updateSettings.mutate({ pullEnabled })}
            label={t('calendar.pull')}
            className="text-[11px]"
          />
        </div>

        <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-content-faint">
          <ArrowUpFromLine aria-hidden className="mt-0.5 h-2.5 w-2.5 shrink-0" />
          {t('calendar.pushHint')}
        </p>
        <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-content-faint">
          <ArrowDownToLine aria-hidden className="mt-0.5 h-2.5 w-2.5 shrink-0" />
          {t('calendar.pullHint')}
        </p>
      </div>

      {/* --- Disconnecting ------------------------------------------------

          Two steps, because the default takes the mirrored calendar with it.
          That is the right default — the scope guarantees it is a calendar
          this app created, so nothing of the user's own can be caught by it —
          but it is still a deletion in somebody else's account, and it is
          worth one sentence and one more press. */}
      <div className="border-t border-edge/70 pt-3">
        {isConfirmingDisconnect ? (
          <div className="space-y-2">
            <p className="text-[11px] leading-relaxed text-content-muted">
              {t('calendar.disconnectExplain')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  disconnect.mutate(false);
                  setIsConfirmingDisconnect(false);
                }}
                isLoading={disconnect.isPending}
                className="h-7 px-2.5 text-[10px]"
              >
                {t('calendar.disconnectAndRemove')}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  disconnect.mutate(true);
                  setIsConfirmingDisconnect(false);
                }}
                className="h-7 px-2.5 text-[10px]"
              >
                {t('calendar.disconnectKeep')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsConfirmingDisconnect(false)}
                className="h-7 px-2.5 text-[10px]"
              >
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsConfirmingDisconnect(true)}
            className="h-7 px-2 text-[10px] text-danger hover:text-danger"
          >
            {t('calendar.disconnect')}
          </Button>
        )}
      </div>
    </div>
  );
};
