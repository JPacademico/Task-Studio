import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, ExternalLink } from 'lucide-react';

import { spotifyApi } from '@/entities/integration/api/spotify.api';
import {
  useDisconnectSpotify,
  useSetSpotifyEnabled,
  useSpotifyStatus,
} from '@/entities/integration/model/queries';
import { errorMessage } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { Button, Skeleton, SpotifyMark, Switch } from '@/shared/ui';
import { useT, type TranslationKey } from '@/shared/i18n';

/**
 * What the consent redirect says on the way back, per outcome.
 *
 * The same table the calendar panel keeps, for the same reason: the API
 * redirects to `/settings?spotify=…` rather than answering with JSON, because
 * the thing at the other end of an OAuth callback is a browser that was
 * *navigated* there. The flag is a slug rather than a sentence — the API has no
 * idea what language the reader is in.
 */
const OUTCOME: Record<string, { key: TranslationKey; tone: 'success' | 'error' | 'info' }> = {
  connected: { key: 'spotify.connected', tone: 'success' },
  cancelled: { key: 'spotify.cancelled', tone: 'info' },
  failed: { key: 'spotify.failed', tone: 'error' },
};

/**
 * Connecting a personal Spotify account.
 *
 * ## Why this is in Settings and not on a project
 *
 * Because it is a fact about the person, not about the work. Every other
 * integration in this product is connected *to a project* and paid for by its
 * owner — a webhook posts a project's events, a Figma file is a project's
 * design. Music follows the person between projects, and nobody on a shared
 * board should be able to see, let alone skip, what a colleague is playing. One
 * account, connected once, controlled by one person.
 *
 * ## Why disconnecting and hiding are two different controls
 *
 * The switch hides the player and keeps the grant; the button throws the grant
 * away. Somebody about to share their screen wants the first and would be
 * annoyed to be asked for consent again afterwards, which is what the second
 * costs them. Collapsing the two into "disconnect" would make the cheap action
 * expensive.
 */
export const SpotifyConnectionPanel = () => {
  const t = useT();
  const [params, setParams] = useSearchParams();

  const { data, isLoading } = useSpotifyStatus();
  const setEnabled = useSetSpotifyEnabled();
  const disconnect = useDisconnectSpotify();

  const [isConnecting, setIsConnecting] = useState(false);

  /*
   * The redirect's outcome, said once and then taken out of the URL — without
   * that, a reader who reloads settings is congratulated on connecting Spotify
   * every time they open the page.
   */
  useEffect(() => {
    const outcome = params.get('spotify');
    if (!outcome) return;

    const entry = OUTCOME[outcome];
    if (entry) {
      if (entry.tone === 'success') toast.success(t(entry.key));
      else if (entry.tone === 'error') toast.error(t(entry.key));
      else toast(t(entry.key));
    }

    const next = new URLSearchParams(params);
    next.delete('spotify');
    setParams(next, { replace: true });
  }, [params, setParams, t]);

  const connect = async () => {
    setIsConnecting(true);
    try {
      // A navigation, not a fetch: Spotify's consent screen is a page a human
      // presses a button on, and it refuses to be framed.
      window.location.assign(await spotifyApi.connectUrl());
    } catch (error) {
      setIsConnecting(false);
      toast.error(errorMessage(error, t('spotify.failed')));
    }
  };

  if (isLoading) return <Skeleton className="h-28 rounded-2xl" />;

  /*
   * A deployment with no Spotify application, or no encryption key.
   *
   * Said plainly rather than hidden, exactly as the calendar says it: somebody
   * looking for this because they read about it deserves to know it is a
   * deployment setting rather than something they have failed to find.
   */
  if (!data?.available) {
    return (
      <div className="rounded-2xl border border-edge bg-surface-raised p-4">
        <p className="text-xs font-medium text-content">{t('spotify.unavailable')}</p>
        <p className="mt-1 text-2xs leading-relaxed text-content-muted">
          {t('spotify.unavailableHint')}
        </p>
      </div>
    );
  }

  const connection = data.connection;

  // --- Not connected -------------------------------------------------------

  if (!connection) {
    return (
      /* The card is the control — there is exactly one thing to do with an
         unconnected account, so there is nothing for a button to disambiguate.
         Same shape as the calendar's, deliberately. */
      <button
        type="button"
        onClick={() => void connect()}
        disabled={isConnecting}
        className={cn(
          'ui-card flex w-full items-center gap-3 rounded-2xl border border-edge bg-surface-raised p-4 text-left',
          'transition-colors hover:border-brand/50 disabled:opacity-60',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
        )}
      >
        <SpotifyMark className="h-8 w-8 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-content">{t('spotify.title')}</span>
          <span className="mt-0.5 block text-2xs leading-relaxed text-content-muted">
            {t('spotify.pitch')}
          </span>
        </span>
        <span className="shrink-0 text-xs font-medium text-brand">{t('spotify.connect')}</span>
      </button>
    );
  }

  // --- Connected -----------------------------------------------------------

  return (
    <div className="rounded-2xl border border-edge bg-surface-raised p-4">
      <div className="flex items-start gap-3">
        <SpotifyMark className="h-8 w-8 shrink-0" />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-content">{t('spotify.title')}</p>
          <a
            href={connection.profileUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-0.5 inline-flex items-center gap-1 text-2xs text-content-muted hover:text-brand"
          >
            {t('spotify.connectedAs', { name: connection.displayName })}
            <ExternalLink className="h-3 w-3" />
          </a>

          {!connection.isPremium && (
            <p className="mt-1.5 text-3xs leading-relaxed text-content-faint">
              {t('spotify.premiumOnly')}
            </p>
          )}

          {connection.lastError && (
            /* The last thing Spotify refused. Kept on the row by the service
               precisely so a player that stopped working is not a mystery. */
            <p className="mt-2 flex items-start gap-1.5 text-3xs leading-relaxed text-warning">
              <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
              <span>{connection.lastError}</span>
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-edge pt-3">
        <label className="flex items-center gap-2.5">
          <Switch
            checked={connection.isEnabled}
            onChange={(checked) => setEnabled.mutate(checked)}
            label={t('spotify.showPlayer')}
          />
          <span className="text-2xs text-content-muted">{t('spotify.showPlayerHint')}</span>
        </label>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => disconnect.mutate()}
          isLoading={disconnect.isPending}
        >
          {t('spotify.disconnect')}
        </Button>
      </div>

      <p className="mt-3 text-3xs leading-relaxed text-content-faint">{t('spotify.notice')}</p>
    </div>
  );
};
