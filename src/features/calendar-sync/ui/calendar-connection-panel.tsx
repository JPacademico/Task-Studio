import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from '@/shared/lib/toast';
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, RefreshCw } from 'lucide-react';

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
import { Button, GoogleCalendarMark, Skeleton, Spinner, Switch } from '@/shared/ui';
import { useT, type TranslationKey } from '@/shared/i18n';

/**
 * What the consent redirect says on the way back, per outcome. The API redirects to
 * `/settings?calendar=…` rather than answering with JSON.
 */
const OUTCOME: Record<string, { key: TranslationKey; tone: 'success' | 'error' | 'info' }> = {
  connected: { key: 'calendar.connected', tone: 'success' },
  cancelled: { key: 'calendar.cancelled', tone: 'info' },
  failed: { key: 'calendar.connectFailed', tone: 'error' },
  noRefreshToken: { key: 'calendar.noRefreshToken', tone: 'error' },
};

/**
 * Connecting a personal Google Calendar, and choosing which way it flows. The *effect* is entirely
 * on the meetings tab — that is what gets mirrored.
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

  // The consent redirect's outcome, said once and then removed from the URL. Stripping the
  // parameter matters more than it looks.
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
      // A full-page navigation, not a fetch. Google's consent screen is a page a human has to look
      // at and press a button on.
      window.location.assign(await calendarApi.connectUrl());
    } catch (error) {
      setIsConnecting(false);
      toast.error(errorMessage(error, t('calendar.connectFailed')));
    }
  };

  if (isLoading) return <Skeleton className="h-32 rounded-2xl" />;

  // A deployment with no Google credentials, or no encryption key. Said plainly rather than hidden.
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
      /* The card is the control. It used to be a card *containing* a control: an icon, two lines,
         and a "Connect" button underneath them. */
      <button
        type="button"
        onClick={() => void connect()}
        disabled={isConnecting}
        aria-busy={isConnecting || undefined}
        className={cn(
          'ui-card group flex w-full items-center gap-3 rounded-2xl border border-edge',
          'bg-surface-raised p-4 text-left transition-colors',
          'hover:border-brand/50 hover:bg-surface-sunken/40',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
          'focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
          isConnecting && 'cursor-progress opacity-80',
        )}
      >
        {/* 28px inside a 44px chip. At the 20px it was drawn at, a mark made of four coloured
            edges and a date block is a smudge. */}
        <span
          aria-hidden
          className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-edge bg-surface-sunken"
        >
          <GoogleCalendarMark className="h-9 w-9" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold tracking-tight">{t('calendar.title')}</span>
          <span className="mt-0.5 block text-2xs leading-relaxed text-content-muted">
            {t('calendar.pitch')}
          </span>
        </span>

        <span
          title={t('calendar.connect')}
          className={cn(
            'shrink-0 rounded-full border border-edge px-2 py-0.5',
            'text-3xs font-medium uppercase tracking-wide text-content-muted',
            'transition-colors group-hover:border-brand/50 group-hover:text-content',
          )}
        >
          {isConnecting ? <Spinner /> : t('connections.connect')}
        </span>
      </button>
    );
  }

  // --- Connected -----------------------------------------------------------

  return (
    <div
      className={cn(
        'space-y-3 rounded-2xl border p-4',
        // Live, and saying so the same way a connected service says it on the project's Connections
        // shelf — see `.neon-ring`.
        connection.isEnabled
          ? 'neon-ring border-transparent'
          : 'border-edge bg-surface-raised',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            'mt-0.5 grid h-14 w-14 shrink-0 place-items-center rounded-xl border',
            connection.isEnabled
              ? 'border-positive/30 bg-positive/[0.08]'
              : 'border-edge bg-surface-sunken',
          )}
        >
          {/* The mark rather than a state glyph. */}
          <GoogleCalendarMark
            className={cn('h-9 w-9', !connection.isEnabled && 'opacity-40 grayscale')}
          />
        </span>

        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-xs font-semibold">{connection.accountEmail}</p>
          <p className="mt-0.5 text-3xs text-content-faint">
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
          className="h-7 gap-1 px-2 text-3xs"
        >
          <RefreshCw className="h-3 w-3" />
          {t('calendar.syncNow')}
        </Button>
      </div>

      {/* The last thing that went wrong, shown rather than swallowed. The two failures that
          actually happen are both things only the user can resolve — a revoked grant. */}
      {connection.lastError && (
        <p className="flex items-start gap-1.5 rounded-lg bg-warning/10 px-2.5 py-2 text-2xs leading-snug text-warning">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          {connection.lastError}
        </p>
      )}

      <div className="space-y-2 border-t border-edge/70 pt-3">
        <Switch
          checked={connection.isEnabled}
          onChange={(isEnabled) => updateSettings.mutate({ isEnabled })}
          label={t('calendar.enabled')}
          className="text-2xs"
        />

        {/* The two directions, disabled together when the whole thing is paused. */}
        <div className={cn('space-y-2 pl-1', !connection.isEnabled && 'pointer-events-none opacity-50')}>
          <Switch
            checked={connection.pushEnabled}
            onChange={(pushEnabled) => updateSettings.mutate({ pushEnabled })}
            label={t('calendar.push')}
            className="text-2xs"
          />
          <Switch
            checked={connection.pullEnabled}
            onChange={(pullEnabled) => updateSettings.mutate({ pullEnabled })}
            label={t('calendar.pull')}
            className="text-2xs"
          />
        </div>

        <p className="flex items-start gap-1.5 text-3xs leading-relaxed text-content-faint">
          <ArrowUpFromLine aria-hidden className="mt-0.5 h-2.5 w-2.5 shrink-0" />
          {t('calendar.pushHint')}
        </p>
        <p className="flex items-start gap-1.5 text-3xs leading-relaxed text-content-faint">
          <ArrowDownToLine aria-hidden className="mt-0.5 h-2.5 w-2.5 shrink-0" />
          {t('calendar.pullHint')}
        </p>
      </div>

      {/* --- Disconnecting ---
          Two steps, because the default takes the mirrored calendar with it. */}
      <div className="border-t border-edge/70 pt-3">
        {isConfirmingDisconnect ? (
          <div className="space-y-2">
            <p className="text-2xs leading-relaxed text-content-muted">
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
                className="h-7 px-2.5 text-3xs"
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
                className="h-7 px-2.5 text-3xs"
              >
                {t('calendar.disconnectKeep')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsConfirmingDisconnect(false)}
                className="h-7 px-2.5 text-3xs"
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
            className="h-7 px-2 text-3xs text-danger hover:text-danger"
          >
            {t('calendar.disconnect')}
          </Button>
        )}
      </div>
    </div>
  );
};
