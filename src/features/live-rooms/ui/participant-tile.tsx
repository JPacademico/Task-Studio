import { useEffect, useRef } from 'react';
import { Hand, Mic, MicOff, MonitorUp, ShieldCheck } from 'lucide-react';

import type { LivePeer } from '../model/use-live-call';
import { cn } from '@/shared/lib/cn';
import { Avatar } from '@/shared/ui';
import { useT } from '@/shared/i18n';

interface ParticipantTileProps {
  peer: LivePeer;
  /** True for the local tile, which is muted and mirrored. */
  isSelf: boolean;
  isSpeaking: boolean;
  /** Drawn only for a moderator, and only on somebody else's tile. */
  onGrantSpeak?: () => void;
  onGrantPresent?: () => void;
  canModerate: boolean;
}

/**
 * One person in a call.
 *
 * ## Why the media element is driven by a ref rather than a `src`
 *
 * A `MediaStream` is not a URL. `srcObject` is the only way to attach one, it
 * is not a React prop, and setting it during render would mutate the DOM
 * outside the commit phase. So the element is rendered empty and an effect
 * attaches the stream — which is also what lets the same element survive a peer
 * renegotiating and handing over a different stream object.
 *
 * ## Why the local tile is always muted
 *
 * Playing your own microphone back through your own speakers is a feedback
 * loop, and on a laptop it is an immediate howl. `muted` on the element does
 * not mute what is *sent* — the track is untouched — it only stops this
 * browser from playing it.
 */
export const ParticipantTile = ({
  peer,
  isSelf,
  isSpeaking,
  onGrantSpeak,
  onGrantPresent,
  canModerate,
}: ParticipantTileProps) => {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;

    // Cleared as well as set: leaving a dead stream attached keeps the last
    // frame on screen after a peer has gone.
    element.srcObject = peer.stream ?? null;
    if (peer.stream) {
      /*
       * `play()` is called explicitly and its rejection swallowed.
       *
       * Autoplay policy blocks a video with audio until the page has been
       * interacted with — which it has, because somebody pressed "join" — but
       * the promise still rejects on a tab that is backgrounded at the moment
       * the stream arrives, and that is not an error anybody can act on.
       */
      void element.play().catch(() => undefined);
    }
  }, [peer.stream]);

  /** A tile shows video when the person has a camera on, or is presenting. */
  const hasPicture = peer.flags.camOn || peer.flags.sharing;

  return (
    <div
      className={cn(
        'ui-card group relative flex aspect-video min-w-0 items-center justify-center',
        'overflow-hidden rounded-2xl border bg-surface-sunken transition-shadow duration-150',
        isSpeaking ? 'border-positive shadow-glow' : 'border-edge',
      )}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isSelf}
        className={cn(
          'h-full w-full',
          /*
           * A camera is contained, a screen is fitted.
           *
           * `cover` on a shared screen crops the edges off, which is where
           * the tabs and the toolbar of the thing being demonstrated live.
           * `contain` on a webcam letterboxes a face, which looks broken. The
           * two want opposite rules and the flag already distinguishes them.
           */
          peer.flags.sharing ? 'object-contain' : 'object-cover',
          // Mirrored, but only your own camera and never a shared screen:
          // reading a mirrored screen is impossible.
          isSelf && !peer.flags.sharing && 'scale-x-[-1]',
          !hasPicture && 'hidden',
        )}
      />

      {/* The fallback, which is what most of a call actually looks like: a
          room of people with their cameras off. */}
      {!hasPicture && (
        <div className="flex flex-col items-center gap-2">
          <Avatar
            name={peer.user.displayName}
            src={peer.user.avatarUrl}
            size="lg"
            className={cn(isSpeaking && 'ring-2 ring-positive ring-offset-2 ring-offset-surface-sunken')}
          />
        </div>
      )}

      {/* --- The name plate ------------------------------------------------ */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/70 to-transparent px-2.5 py-1.5">
        <span className="min-w-0 flex-1 truncate text-2xs font-medium text-white">
          {isSelf ? t('live.you') : peer.user.displayName}
        </span>

        {peer.isModerator && (
          <ShieldCheck
            className="h-3 w-3 shrink-0 text-white/80"
            aria-label={t('live.moderator')}
          />
        )}
        {peer.flags.sharing && (
          <MonitorUp className="h-3 w-3 shrink-0 text-white/80" aria-label={t('live.sharing')} />
        )}
        {peer.flags.handRaised && (
          <Hand className="h-3 w-3 shrink-0 text-warning" aria-label={t('live.handRaised')} />
        )}
        {peer.flags.micOn ? (
          <Mic
            className={cn('h-3 w-3 shrink-0', isSpeaking ? 'text-positive' : 'text-white/80')}
            aria-label={t('live.micOn')}
          />
        ) : (
          <MicOff className="h-3 w-3 shrink-0 text-white/50" aria-label={t('live.micOff')} />
        )}
      </div>

      {/*
        The moderator's controls, revealed on hover and on focus.

        Hidden by default because a call of eight would otherwise carry sixteen
        buttons nobody is looking at, and always reachable by keyboard because
        `group-focus-within` is what stops "hover to reveal" from meaning
        "mouse only".
      */}
      {canModerate && !isSelf && (
        <div
          className={cn(
            'absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity',
            'group-hover:opacity-100 group-focus-within:opacity-100',
          )}
        >
          {onGrantSpeak && (
            <button
              type="button"
              onClick={onGrantSpeak}
              title={peer.canSpeak ? t('live.denySpeak') : t('live.allowSpeak')}
              aria-label={peer.canSpeak ? t('live.denySpeak') : t('live.allowSpeak')}
              className={cn(
                'grid h-6 w-6 place-items-center rounded-lg bg-black/60 text-white',
                'transition-colors hover:bg-black/80 focus-visible:outline-none',
                'focus-visible:ring-2 focus-visible:ring-brand',
              )}
            >
              {peer.canSpeak ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
            </button>
          )}
          {onGrantPresent && (
            <button
              type="button"
              onClick={onGrantPresent}
              title={peer.canPresent ? t('live.denyPresent') : t('live.allowPresent')}
              aria-label={peer.canPresent ? t('live.denyPresent') : t('live.allowPresent')}
              className={cn(
                'grid h-6 w-6 place-items-center rounded-lg bg-black/60 text-white',
                'transition-colors hover:bg-black/80 focus-visible:outline-none',
                'focus-visible:ring-2 focus-visible:ring-brand',
                peer.canPresent && 'text-brand',
              )}
            >
              <MonitorUp className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
