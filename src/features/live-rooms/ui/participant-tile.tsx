import { useEffect, useRef, useState } from 'react';
import {
  Hand,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  MonitorUp,
  ShieldCheck,
  SignalHigh,
  SignalLow,
  SignalMedium,
  Video,
} from 'lucide-react';

import type { LiveQuality } from '@/entities/live-room/model/types';
import { canFullscreen, enterFullscreen, exitFullscreen } from '../lib/fullscreen';
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
  /** How this connection is doing. Absent for the local tile, which has none. */
  quality?: LiveQuality;
  /**
   * Called when this tile enters or leaves the viewport. The stage passes the peer's id down with
   * it - see `LiveStage`.
   */
  onVisibilityChange?: (visible: boolean) => void;
  /**
   * Whether this tile is the one filling the screen. Owned by the stage rather than read here,
   * because the stage is the one that has to act on it for every *other* tile too.
   */
  isFullscreen?: boolean;
}

/** How long the pointer can rest before a fullscreen tile hides its chrome. */
const CHROME_IDLE_MS = 2_500;

/**
 * The three states, as an icon and a colour. Signal bars rather than a coloured dot, because a dot
 * has to be learned and bars do not: everybody has read a signal meter.
 */
const QUALITY_ICON = {
  good: SignalHigh,
  weak: SignalMedium,
  bad: SignalLow,
} as const;

const QUALITY_TONE = {
  good: 'text-positive',
  weak: 'text-warning',
  bad: 'text-danger',
} as const;

/**
 * One person in a call. A `MediaStream` is not a URL. `srcObject` is the only way to attach one, it
 * is not a React prop, and setting it during render would mutate the DOM outside the commit phase.
 */
export const ParticipantTile = ({
  peer,
  isSelf,
  isSpeaking,
  onGrantSpeak,
  onGrantPresent,
  canModerate,
  quality,
  onVisibilityChange,
  isFullscreen = false,
}: ParticipantTileProps) => {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const tileRef = useRef<HTMLDivElement>(null);
  /** In fullscreen, whether the name plate and buttons have faded out. */
  const [isChromeHidden, setChromeHidden] = useState(false);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;

    // Cleared as well as set: leaving a dead stream attached keeps the last
    // frame on screen after a peer has gone.
    element.srcObject = peer.stream ?? null;
    if (peer.stream) {
      // `play()` is called explicitly and its rejection swallowed. Autoplay policy blocks a video
      // with audio until the page has been interacted with — which it has.
      void element.play().catch(() => undefined);
    }
  }, [peer.stream]);

  // Whether anybody can actually see this tile.
  useEffect(() => {
    if (!onVisibilityChange || isSelf) return;

    const element = tileRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      onVisibilityChange(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => onVisibilityChange(entry.isIntersecting),
      { rootMargin: '200px', threshold: 0 },
    );
    observer.observe(element);

    return () => {
      observer.disconnect();
      // Unmounting is not "invisible", it is "gone".
      onVisibilityChange(true);
    };
  }, [isSelf, onVisibilityChange]);

  /**
   * The camera is on but held back to keep this person's voice clear. See
   * `watchUplink`. Never during a share, which is not held.
   */
  const isCameraHeld = peer.flags.camOn && !peer.flags.sharing && Boolean(peer.videoHeld);

  /**
   * A tile shows video when the person has a camera on, or is presenting. Not a held camera on
   * somebody else's tile: nothing is arriving.
   */
  const hasPicture = peer.flags.sharing || (peer.flags.camOn && (isSelf || !isCameraHeld));

  // Fullscreen is offered on somebody else's picture, and only there. Not on your own tile: while
  // you present, that tile *is* your screen.
  const offersFullscreen = !isSelf && hasPicture && canFullscreen();

  const toggleFullscreen = () => {
    if (isFullscreen) {
      void exitFullscreen();
      return;
    }
    const tile = tileRef.current;
    if (tile && offersFullscreen) void enterFullscreen(tile, videoRef.current);
  };

  // Out of fullscreen when the picture goes. A presenter who stops sharing with their camera off
  // leaves an avatar behind.
  useEffect(() => {
    if (isFullscreen && !hasPicture) void exitFullscreen();
  }, [hasPicture, isFullscreen]);

  // The chrome fades when nobody is pointing at it. The name plate and the buttons sit over the
  // picture, which is fine in a grid and in the way on a full screen.
  useEffect(() => {
    const tile = tileRef.current;
    if (!isFullscreen || !tile) {
      setChromeHidden(false);
      return;
    }

    let timer: number | undefined;
    const wake = () => {
      setChromeHidden(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setChromeHidden(true), CHROME_IDLE_MS);
    };

    wake();
    tile.addEventListener('pointermove', wake);
    tile.addEventListener('pointerdown', wake);
    tile.addEventListener('keydown', wake);
    return () => {
      window.clearTimeout(timer);
      tile.removeEventListener('pointermove', wake);
      tile.removeEventListener('pointerdown', wake);
      tile.removeEventListener('keydown', wake);
    };
  }, [isFullscreen]);

  const QualityIcon = quality ? QUALITY_ICON[quality.level] : null;
  const qualityLabel =
    quality && quality.level !== 'good'
      ? t(quality.level === 'bad' ? 'live.qualityBad' : 'live.qualityWeak', {
          loss: (quality.loss * 100).toFixed(1),
          jitter: String(Math.round(quality.jitter)),
        })
      : null;

  return (
    <div
      ref={tileRef}
      data-participant-id={peer.participantId}
      // The quick way in, the way every video player has taught people. The
      // button below is the way that can be found and reached by keyboard.
      onDoubleClick={offersFullscreen || isFullscreen ? toggleFullscreen : undefined}
      className={cn(
        'group relative flex min-w-0 items-center justify-center overflow-hidden',
        isFullscreen
          ? /*
             * The browser sizes a fullscreen element to the screen, but the
             * card's rounding, border and skin surface would still be drawn
             * around the picture. On a full screen the letterbox is black,
             * whatever the skin, the way every player draws it.
             */
            'h-full w-full rounded-none border-0 bg-black'
          : cn(
              'ui-card aspect-video rounded-2xl border bg-surface-sunken transition-shadow duration-150',
              isSpeaking ? 'border-positive shadow-glow' : 'border-edge',
            ),
        isFullscreen && isChromeHidden && 'cursor-none',
      )}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isSelf}
        className={cn(
          'h-full w-full',
          /* A camera is contained, a screen is fitted. `cover` on a shared screen crops the edges
             off, which is where the tabs and the toolbar of the thing being demonstrated live. */
          // On a full screen a face is contained too: cropping somebody's
          // head to fit an ultrawide monitor is not seeing them better.
          peer.flags.sharing || isFullscreen ? 'object-contain' : 'object-cover',
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
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-1.5',
          'bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-300',
          isFullscreen ? 'px-5 pb-4 pt-10' : 'px-2.5 py-1.5',
          isFullscreen && isChromeHidden && 'opacity-0',
        )}
      >
        <span
          className={cn(
            'min-w-0 flex-1 truncate font-medium text-white',
            isFullscreen ? 'text-sm' : 'text-2xs',
          )}
        >
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
        {isCameraHeld && (
          <span
            className="relative shrink-0 text-warning"
            title={isSelf ? t('live.cameraHeld') : t('live.peerCameraHeld')}
          >
            <Video className="h-3 w-3" aria-hidden />
            <span
              aria-hidden
              className="absolute -right-1 -top-1 grid h-2.5 w-2.5 place-items-center rounded-full bg-warning text-5xs font-bold leading-none text-black"
            >
              !
            </span>
            <span className="sr-only">
              {isSelf ? t('live.cameraHeld') : t('live.peerCameraHeld')}
            </span>
          </span>
        )}
        {peer.flags.micOn ? (
          <Mic
            className={cn('h-3 w-3 shrink-0', isSpeaking ? 'text-positive' : 'text-white/80')}
            aria-label={t('live.micOn')}
          />
        ) : (
          <MicOff className="h-3 w-3 shrink-0 text-white/50" aria-label={t('live.micOff')} />
        )}

        {/* The connection meter, and only when it has something to say. A `good` connection
            draws nothing at all, which is the point. */}
        {QualityIcon && qualityLabel && quality && (
          <span className={cn('shrink-0', QUALITY_TONE[quality.level])} title={qualityLabel}>
            <QualityIcon className="h-3 w-3" aria-hidden />
            <span className="sr-only">{qualityLabel}</span>
          </span>
        )}

        {/* Relayed, which is not a fault and is worth saying anyway. It is the single most
            useful fact when somebody asks why one pair in a call is worse than the rest. */}
        {quality?.isRelayed && (
          <span className="shrink-0 text-white/50" title={t('live.relayed')}>
            <span aria-hidden className="text-3xs font-bold tracking-wide">
              TURN
            </span>
            <span className="sr-only">{t('live.relayed')}</span>
          </span>
        )}
      </div>

      {/* The tile's own buttons: fullscreen for anybody watching, and the moderator's two
          grants. Revealed on hover and on focus. */}
      {((canModerate && !isSelf) || offersFullscreen || isFullscreen) && (
        <div
          className={cn(
            'absolute flex gap-1 transition-opacity duration-300',
            isFullscreen ? 'right-4 top-4' : 'right-1.5 top-1.5',
            /* In a grid, revealed on hover and on focus, and always shown where there is no hover
               to reveal it with: a phone has no pointer resting over a tile. */
            isFullscreen
              ? isChromeHidden
                ? 'opacity-0 group-has-[:focus-visible]:opacity-100'
                : 'opacity-100'
              : cn(
                  'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
                  '[@media(hover:none)]:opacity-100',
                ),
          )}
        >
          {/* The moderator's two grants stay out of the fullscreen view. Handing somebody the
              microphone is room management. */}
          {canModerate && !isSelf && !isFullscreen && onGrantSpeak && (
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
          {canModerate && !isSelf && !isFullscreen && onGrantPresent && (
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

          {(offersFullscreen || isFullscreen) && (
            <button
              type="button"
              onClick={toggleFullscreen}
              title={isFullscreen ? t('live.exitFullscreen') : t('live.fullscreen')}
              aria-label={isFullscreen ? t('live.exitFullscreen') : t('live.fullscreen')}
              className={cn(
                'grid place-items-center rounded-lg bg-black/60 text-white',
                'transition-colors hover:bg-black/80 focus-visible:outline-none',
                'focus-visible:ring-2 focus-visible:ring-brand',
                isFullscreen ? 'h-10 w-10' : 'h-6 w-6',
              )}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-3 w-3" />
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
