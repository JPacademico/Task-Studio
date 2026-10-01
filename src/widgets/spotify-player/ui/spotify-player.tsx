import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useReducedMotion } from 'framer-motion';
import {
  ListPlus,
  Pause,
  Pin,
  PinOff,
  Play,
  Search,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react';

import {
  useSpotifyCommand,
  useSpotifyPlayback,
  useSpotifyQueueTrack,
  useSpotifyStatus,
  useSpotifyVolume,
} from '@/entities/integration/model/queries';
import { spotifyApi } from '@/entities/integration/api/spotify.api';
import type { SpotifySearchResults } from '@/entities/integration/model/types';
import { useT } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { useLocalStorage } from '@/shared/lib/hooks';
import { STORAGE_KEYS } from '@/shared/config/constants';
import { useViewportDragBounds } from '@/shared/lib/use-viewport-drag-bounds';
import { SpotifyMark } from '@/shared/ui';

/**
 * The closed size and the open panel, both in `rem` rather than pixels. This application scales its
 * root font size with the viewport — 15px at 1024px up to 22px on a 21:9 panel.
 */
const ICON_REM = 2.75;
const PANEL_REM = 21;

/** How much clear space the panel wants on the side it opens towards. */
const EDGE_MARGIN_PX = 12;

/**
 * How long the volume slider waits after the last movement before it commits. A native `range`
 * fires `change` on every step of a drag.
 */
const VOLUME_COMMIT_MS = 260;

/** Pixels per `rem`, read from the root where the scale actually lives. */
const remToPx = (rem: number): number => {
  const root = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
  return rem * (Number.isFinite(root) && root > 0 ? root : 16);
};

/**
 * A remote control for the music, parked on the screen. The obvious build is a button that opens a
 * popover next to it, and it is wrong for a thing that can be dragged anywhere.
 */
export const SpotifyPlayer = () => {
  const t = useT();
  const reduceMotion = useReducedMotion();

  const { data: status } = useSpotifyStatus();
  const connection = status?.connection ?? null;
  const isLive = Boolean(connection?.isEnabled);

  const [isPinned, setIsPinned] = useLocalStorage(STORAGE_KEYS.spotifyPinned, false);
  const [isHovered, setIsHovered] = useState(false);
  const isOpen = isLive && (isPinned || isHovered);

  // The poll only runs while the panel is open. A closed player is an icon, and an icon does not
  // need to know what is playing.
  const { data: playback } = useSpotifyPlayback(isOpen);

  const command = useSpotifyCommand();
  const setVolume = useSpotifyVolume();
  const queueTrack = useSpotifyQueueTrack();

  const [position, setPosition] = useLocalStorage(STORAGE_KEYS.spotifyPosition, { x: 0, y: 0 });
  const x = useMotionValue(position.x);
  const y = useMotionValue(position.y);
  const shellRef = useRef<HTMLDivElement>(null);
  const { bounds, measure } = useViewportDragBounds(shellRef, x, y);

  // Which side the panel unfolds towards, decided from where the *shut* icon is sitting.
  const [opensLeft, setOpensLeft] = useState(false);

  const measureSide = useCallback(() => {
    const node = shellRef.current;
    if (!node) return;

    const { left } = node.getBoundingClientRect();
    setOpensLeft(left + remToPx(PANEL_REM) + EDGE_MARGIN_PX > window.innerWidth);
  }, []);

  // `useLayoutEffect`, not `useEffect`, and that is the no-glitch part. The pinned player is open
  // on its very first render.
  useLayoutEffect(() => {
    measureSide();

    window.addEventListener('resize', measureSide);
    return () => window.removeEventListener('resize', measureSide);
  }, [measureSide, isLive, position.x, position.y]);

  // A drag must not also be a click. The whole shell is draggable and the icon inside it is a
  // button, so every drop lands a click on the mark.
  const didDragRef = useRef(false);

  const isPlaying = Boolean(playback?.isPlaying);
  const track = playback?.track ?? null;
  const canControl = Boolean(playback?.isPremium ?? connection?.isPremium);
  // Whether there is anything on the other end to shout at. Spotify answers `204 No Content` for
  // "nothing is playing anywhere", which the API turns into a null device.
  const hasDevice = playback === undefined || playback.deviceName !== null;

  if (!isLive) return null;

  const transition = { type: 'spring' as const, stiffness: 420, damping: 34 };

  return (
    <motion.div
      ref={shellRef}
      drag
      dragConstraints={bounds}
      dragMomentum={false}
      dragElastic={0.03}
      onPointerDown={() => {
        didDragRef.current = false;
      }}
      onDragStart={() => {
        didDragRef.current = true;
        measure();
      }}
      onDragEnd={() => {
        setPosition({ x: x.get(), y: y.get() });
        // The icon has landed somewhere new, so which way it can afford to open may have changed
        // with it.
        measureSide();
      }}
      style={{ x, y, width: `${ICON_REM}rem`, height: `${ICON_REM}rem` }}
      onMouseEnter={() => {
        // Before the open, not after it. See `measureSide`.
        measureSide();
        setIsHovered(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        // Bottom left, above the page and below the rails — the same band the shortcut pills sit
        // in, because it is the same kind of object.
        'fixed bottom-5 left-5 z-30 select-none',
        'cursor-grab active:cursor-grabbing',
      )}
    >
      {/* The panel is positioned rather than in flow, and the shell above it keeps the icon's
          size forever. That is what makes the two directions symmetrical. */}
      <motion.div
        initial={false}
        animate={{ width: `${isOpen ? PANEL_REM : ICON_REM}rem` }}
        transition={reduceMotion ? { duration: 0 } : transition}
        className={cn(
          // `panel` rather than a hand-rolled surface: it is the class every floating thing in the
          // product is made of, so the player is drawn in each skin's own material — arcade tile.
          'panel absolute bottom-0',
          /* Clipped shut, open when open. The clip is what makes the closed state a *circle* —
             without it the panel's content would spill out of the disc during the collapse. */
          isOpen ? 'overflow-visible rounded-2xl' : 'overflow-hidden rounded-full',
          // The corner the panel is nailed to. Shut, the two are the same point; open, this is the
          // edge that does not move while the other one travels.
          opensLeft ? 'right-0' : 'left-0',
        )}
        style={{ height: isOpen ? 'auto' : `${ICON_REM}rem` }}
      >
        {/* ---- The top row: mark, pin, volume, disc ----------------------- */}
        <div className={cn('flex items-center gap-2', isOpen ? 'px-3 pt-3' : 'p-0')}>
          <button
            type="button"
            onClick={() => {
              if (didDragRef.current) return;
              setIsPinned(!isPinned);
            }}
            aria-expanded={isOpen}
            aria-label={t(isOpen ? 'spotify.close' : 'spotify.open')}
            className={cn(
              'grid shrink-0 place-items-center rounded-full transition-transform',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
              isOpen ? 'h-8 w-8' : 'h-11 w-11',
            )}
          >
            <SpotifyMark className={isOpen ? 'h-7 w-7' : 'h-8 w-8'} />
          </button>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex min-w-0 flex-1 items-center gap-2"
              >
                {/* The pin, next to the mark rather than in the panel's far corner. It belongs
                    to the same object as the logo — both answer "is this thing staying". */}
                <PinButton
                  isPinned={isPinned}
                  label={t(isPinned ? 'spotify.unpin' : 'spotify.pin')}
                  onClick={() => setIsPinned(!isPinned)}
                />

                <VolumeControl
                  value={playback?.volume ?? null}
                  disabled={!canControl || !hasDevice}
                  title={!hasDevice ? t('spotify.noDevice') : undefined}
                  onCommit={(value) => setVolume.mutate(value)}
                />

                <Disc
                  isSpinning={isPlaying && !reduceMotion}
                  isPlaying={isPlaying}
                  disabled={!canControl}
                  label={t(isPlaying ? 'spotify.pause' : 'spotify.play')}
                  onClick={() => command.mutate(isPlaying ? 'pause' : 'play')}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              /* `relative z-10` on this half, and it is the search results that need it. The row
                 above — mark, volume, disc — is animated by its own `AnimatePresence` child. */
              className="relative z-10 px-3 pb-3 pt-2.5"
            >
              {/* ---- The transport row ---------------------------------- */}
              <div className="flex items-center gap-2.5">
                <TransportButton
                  label={t('spotify.previous')}
                  disabled={!canControl}
                  onClick={() => command.mutate('previous')}
                >
                  <SkipBack className="h-4 w-4" />
                </TransportButton>

                <div className="min-w-0 flex-1 text-center">
                  {track ? (
                    <>
                      {/* The title and the artist are links, and they go to two different
                          places — the track and whoever made it. */}
                      <a
                        href={track.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="block truncate text-sm font-semibold text-content hover:text-brand"
                        title={track.name}
                      >
                        {track.name}
                      </a>
                      <a
                        href={track.artistUrl ?? track.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="block truncate text-2xs text-content-muted hover:text-brand"
                        title={track.artist}
                      >
                        {track.artist}
                      </a>
                    </>
                  ) : (
                    /* Nothing playing is not an error — Spotify answers 204 for
                       it — so it gets a sentence rather than a warning. */
                    <p className="truncate text-xs text-content-faint">{t('spotify.idle')}</p>
                  )}
                </div>

                <TransportButton
                  label={t('spotify.next')}
                  disabled={!canControl}
                  onClick={() => command.mutate('next')}
                >
                  <SkipForward className="h-4 w-4" />
                </TransportButton>
              </div>

              {!canControl && (
                /* Said once, quietly, instead of four buttons that each fail.
                   Spotify refuses transport control on a free account. */
                <p className="mt-1.5 text-center text-3xs text-content-faint">
                  {t('spotify.premiumOnly')}
                </p>
              )}

              <SearchBox onQueue={(found) => queueTrack.mutate(found)} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

// --- The pieces ---

/**
 * The switch that keeps the panel on screen. `aria-pressed` rather than a checkbox: it is a toggle
 * on a thing that is already visible, not a preference in a form.
 */
const PinButton = ({
  isPinned,
  label,
  onClick,
}: {
  isPinned: boolean;
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={isPinned}
    aria-label={label}
    title={label}
    className={cn(
      'grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
      isPinned
        ? 'bg-brand/15 text-brand'
        : 'text-content-faint hover:bg-surface-sunken hover:text-content',
    )}
  >
    {/* Two glyphs rather than one rotated: `PinOff` is a struck-through pin, which says "press
        this to stop pinning" — the *action*, which is what a button's icon is for. */}
    {isPinned ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
  </button>
);

const TransportButton = ({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
    className={cn(
      'grid h-8 w-8 shrink-0 place-items-center rounded-lg text-content-muted',
      'transition-colors hover:bg-surface-sunken hover:text-content',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
      'disabled:pointer-events-none disabled:opacity-40',
    )}
  >
    {children}
  </button>
);

/**
 * The record, turning while the music is. A pause button that says "paused" only by swapping a
 * glyph is a control the reader has to *read*.
 */
const Disc = ({
  isSpinning,
  isPlaying,
  disabled,
  label,
  onClick,
}: {
  isSpinning: boolean;
  isPlaying: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
    className={cn(
      'relative grid h-10 w-10 shrink-0 place-items-center rounded-full',
      'transition-transform hover:scale-105 active:scale-95',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
      'disabled:pointer-events-none disabled:opacity-40',
    )}
  >
    <span
      aria-hidden
      className="sp-disc absolute inset-0 rounded-full"
      style={{ animationPlayState: isSpinning ? 'running' : 'paused' }}
    />
    <span className="relative text-content">
      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
    </span>
  </button>
);

/**
 * The volume, between the pin and the disc. A native `range`, restyled by `.sp-volume` in
 * `index.css`.
 */
const VolumeControl = ({
  value,
  disabled,
  title,
  onCommit,
}: {
  value: number | null;
  disabled: boolean;
  title?: string;
  onCommit: (value: number) => void;
}) => {
  const [local, setLocal] = useState(value ?? 50);
  const seenRef = useRef(value);
  const timerRef = useRef<number | undefined>(undefined);

  if (value !== seenRef.current) {
    seenRef.current = value;
    if (value !== null && value !== local) setLocal(value);
  }

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const nudge = (next: number) => {
    setLocal(next);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => onCommit(next), VOLUME_COMMIT_MS);
  };

  const Icon = local === 0 ? VolumeX : local < 55 ? Volume1 : Volume2;

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5" title={title}>
      <Icon className="h-4 w-4 shrink-0 text-content-faint" />
      <input
        type="range"
        min={0}
        max={100}
        value={local}
        disabled={disabled}
        onChange={(event) => nudge(Number(event.target.value))}
        aria-label="Volume"
        className="sp-volume min-w-0 flex-1 disabled:opacity-40"
      />
    </div>
  );
};

/**
 * Search, with the results opening upwards over the panel. Pressing a song in here used to call
 * `play`, which replaces the playback context outright.
 */
const SearchBox = ({ onQueue }: { onQueue: (track: { id: string; name: string }) => void }) => {
  const t = useT();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotifySearchResults | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      spotifyApi
        .search(trimmed)
        .then((found) => {
          // The guard is not about React's warning — it is about *order*. Two searches in flight
          // can land in either order.
          if (!cancelled) setResults(found);
        })
        .catch(() => {
          if (!cancelled) setResults(null);
        });
    }, 320);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  // Three rows, whatever they are. The API offers three tracks and three artists; six rows is a
  // list, and a list is not what this is.
  const rows = results
    ? [
        ...results.tracks.map((track) => ({ kind: 'track' as const, ...track })),
        ...results.artists.map((artist) => ({
          kind: 'artist' as const,
          id: artist.id,
          name: artist.name,
          url: artist.url,
          artist: '',
        })),
      ].slice(0, 3)
    : [];

  return (
    <div className="relative mt-2.5">
      {rows.length > 0 && (
        <div
          className={cn(
            // Anchored to the top of the box and drawn upwards, over whatever is behind it. `z-10`
            // clears the transport row; the panel itself is the boundary.
            'absolute bottom-full left-0 right-0 z-10 mb-1.5 overflow-hidden rounded-xl',
            'border border-edge bg-surface-raised shadow-[0_18px_40px_-20px_rgb(0_0_0/0.7)]',
          )}
        >
          {rows.map((row) =>
            row.kind === 'track' ? (
              <button
                key={`t-${row.id}`}
                type="button"
                onClick={() => {
                  onQueue({ id: row.id, name: row.name });
                  setQuery('');
                  setResults(null);
                }}
                className="group flex w-full items-center gap-2 px-2.5 py-2 text-left hover:bg-surface-sunken"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-content">
                    {row.name}
                  </span>
                  <span className="block truncate text-3xs text-content-muted">{row.artist}</span>
                </span>
                {/* The verb, drawn. */}
                <ListPlus
                  aria-hidden
                  className="h-3.5 w-3.5 shrink-0 text-content-faint group-hover:text-brand"
                />
              </button>
            ) : (
              /* An artist is not queueable in one call — Spotify would need a context URI and a
                 device — so it opens instead. */
              <a
                key={`a-${row.id}`}
                href={row.url}
                target="_blank"
                rel="noreferrer noopener"
                className="block truncate px-2.5 py-2 text-xs text-content-muted hover:bg-surface-sunken hover:text-content"
              >
                {row.name}
              </a>
            ),
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5 rounded-xl border border-edge bg-surface-sunken/60 px-2.5 py-1.5">
        <Search className="h-3.5 w-3.5 shrink-0 text-content-faint" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('spotify.searchPlaceholder')}
          aria-label={t('spotify.searchPlaceholder')}
          className="min-w-0 flex-1 bg-transparent text-xs text-content outline-none placeholder:text-content-faint"
        />
      </div>
    </div>
  );
};
