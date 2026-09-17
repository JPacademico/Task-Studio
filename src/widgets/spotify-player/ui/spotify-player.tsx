import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useReducedMotion } from 'framer-motion';
import { Pause, Play, Search, SkipBack, SkipForward, Volume1, Volume2, VolumeX } from 'lucide-react';

import {
  useSpotifyCommand,
  useSpotifyPlayback,
  useSpotifyPlayTrack,
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

/** The closed size, which is also the icon's. See the note on the shell. */
const ICON = 44;
/** The open panel. Wide enough for a title and a search box, and no wider. */
const PANEL_WIDTH = 292;

/**
 * A remote control for the music, parked on the screen.
 *
 * ## Why the icon *is* the container
 *
 * The obvious build is a button that opens a popover next to it, and it is
 * wrong for a thing that can be dragged anywhere: a popover has to decide which
 * side to open on, flip near an edge, and keep its own position in step with a
 * button that moves. Two boxes, two positions, one of them derived.
 *
 * Here there is one box. Shut, it is a 44px circle with the Spotify mark in it;
 * open, the same box grows to a panel with the mark still in its corner. Only
 * one element is ever positioned, dragged or measured, the growth reads as the
 * icon unfolding, and there is no edge case near the screen edge because the
 * anchor never moves relative to the content.
 *
 * ## Hover and click are different promises
 *
 * Hovering opens it and leaving closes it — a glance costs nothing and cleans
 * up after itself. Clicking *latches* it open until it is clicked again,
 * because the two things somebody actually stays for are typing in the search
 * box and dragging the volume, and both would be destroyed by a panel that
 * closes when the pointer strays. The latch survives the pointer leaving; the
 * hover does not.
 *
 * ## What it never does
 *
 * It does not autoplay, it does not follow the user between devices, and it
 * stores nothing about what they listened to — see the service. It also never
 * appears for somebody who has not connected an account: no placeholder, no
 * "connect Spotify" nag on the screen. The offer lives in Settings, once.
 */
export const SpotifyPlayer = () => {
  const t = useT();
  const reduceMotion = useReducedMotion();

  const { data: status } = useSpotifyStatus();
  const connection = status?.connection ?? null;
  const isLive = Boolean(connection?.isEnabled);

  const [isLatched, setIsLatched] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isOpen = isLive && (isLatched || isHovered);

  /*
   * The poll only runs while the panel is open.
   *
   * A closed player is an icon, and an icon does not need to know what is
   * playing. This is the single most important line for the cost of the
   * feature: without it, every signed-in tab would ask Spotify for a track
   * every five seconds forever.
   */
  const { data: playback } = useSpotifyPlayback(isOpen);

  const command = useSpotifyCommand();
  const setVolume = useSpotifyVolume();
  const playTrack = useSpotifyPlayTrack();

  const [position, setPosition] = useLocalStorage(STORAGE_KEYS.spotifyPosition, { x: 0, y: 0 });
  const x = useMotionValue(position.x);
  const y = useMotionValue(position.y);
  const shellRef = useRef<HTMLDivElement>(null);
  const { bounds, measure } = useViewportDragBounds(shellRef, x, y);

  /*
   * A drag must not also be a click.
   *
   * The whole shell is draggable and the icon inside it is a button, so every
   * drop lands a click on the latch. Raised on drag start, lowered on the next
   * `pointerdown` — the same shape `ChatPin` arrived at, and for the same
   * reason: whether a drag synthesises a click is browser-dependent, so
   * clearing it in the click handler leaves it latched forever on the engines
   * where it does not.
   */
  const didDragRef = useRef(false);

  const isPlaying = Boolean(playback?.isPlaying);
  const track = playback?.track ?? null;
  const canControl = Boolean(playback?.isPremium ?? connection?.isPremium);

  if (!isLive) return null;

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
      onDragEnd={() => setPosition({ x: x.get(), y: y.get() })}
      style={{ x, y }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        // Bottom left, above the page and below the rails — the same band the
        // shortcut pills sit in, because it is the same kind of object: the
        // reader's own furniture rather than the application's chrome.
        'fixed bottom-5 left-5 z-30 select-none',
        'cursor-grab active:cursor-grabbing',
      )}
    >
      <motion.div
        layout={!reduceMotion}
        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        className={cn(
          // `panel` rather than a hand-rolled surface: it is the class every
          // floating thing in the product is made of, so the player is drawn in
          // each skin's own material — arcade tile, newsprint, glass — without
          // this file knowing any of their names.
          'panel',
          /*
           * Clipped shut, open when open.
           *
           * The clip is what makes the closed state a *circle* — without it the
           * panel's content would spill out of the 44px disc during the
           * collapse. Open, it is the opposite: the search results are drawn
           * upwards out of the top of the panel, and clipping them there would
           * cut the first row in half, which is exactly what it did.
           */
          isOpen ? 'overflow-visible rounded-2xl' : 'overflow-hidden rounded-full',
        )}
        style={{ width: isOpen ? PANEL_WIDTH : ICON, height: isOpen ? 'auto' : ICON }}
      >
        {/* ---- The top row: mark, volume, disc ---------------------------- */}
        <div className={cn('flex items-center gap-2', isOpen ? 'px-2.5 pt-2.5' : 'p-0')}>
          <button
            type="button"
            onClick={() => {
              if (didDragRef.current) return;
              setIsLatched((latched) => !latched);
            }}
            aria-expanded={isOpen}
            aria-label={t(isOpen ? 'spotify.close' : 'spotify.open')}
            className={cn(
              'grid shrink-0 place-items-center rounded-full transition-transform',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
              isOpen ? 'h-7 w-7' : 'h-11 w-11',
            )}
          >
            <SpotifyMark className={isOpen ? 'h-6 w-6' : 'h-8 w-8'} />
          </button>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex min-w-0 flex-1 items-center gap-2"
              >
                <VolumeControl
                  value={playback?.volume ?? null}
                  disabled={!canControl}
                  onChange={(value) => setVolume.mutate(value)}
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
              /*
               * `relative z-10` on this half, and it is the search results that
               * need it.
               *
               * The row above — mark, volume, disc — is animated by its own
               * `AnimatePresence` child, and an element with an opacity
               * animation forms a stacking context. Two sibling contexts paint
               * in DOM order, so raising the dropdown's own `z-index` inside
               * this one could never lift it over that one: the results opened
               * upwards and the volume slider was drawn straight through them.
               *
               * Raising the *context* rather than the child is what fixes it,
               * because that is the level the comparison actually happens at.
               */
              className="relative z-10 px-2.5 pb-2.5 pt-2"
            >
              {/* ---- The transport row ---------------------------------- */}
              <div className="flex items-center gap-2">
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
                      {/*
                        The title and the artist are links, and they go to two
                        different places — the track and whoever made it. A
                        single link on the pair would have to pick one, and
                        "open the artist" is the more common intent by a long
                        way while "open this track" is the more obvious one.
                      */}
                      <a
                        href={track.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="block truncate text-xs font-semibold text-content hover:text-brand"
                        title={track.name}
                      >
                        {track.name}
                      </a>
                      <a
                        href={track.artistUrl ?? track.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="block truncate text-3xs text-content-muted hover:text-brand"
                        title={track.artist}
                      >
                        {track.artist}
                      </a>
                    </>
                  ) : (
                    /* Nothing playing is not an error — Spotify answers 204 for
                       it — so it gets a sentence rather than a warning. */
                    <p className="truncate text-2xs text-content-faint">{t('spotify.idle')}</p>
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

              <SearchBox onPlay={(trackId) => playTrack.mutate(trackId)} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

/* -------------------------------------------------------------------------- *
 * The pieces
 * -------------------------------------------------------------------------- */

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
      'grid h-7 w-7 shrink-0 place-items-center rounded-lg text-content-muted',
      'transition-colors hover:bg-surface-sunken hover:text-content',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
      'disabled:pointer-events-none disabled:opacity-40',
    )}
  >
    {children}
  </button>
);

/**
 * The record, turning while the music is.
 *
 * ## Why the spin is the state
 *
 * A pause button that says "paused" only by swapping a glyph is a control the
 * reader has to *read*. A disc that stops turning is the same information at a
 * glance from across the desk, and it is the one piece of physical vocabulary
 * everybody already has for this. The glyph in the middle still changes — it is
 * the thing being clicked — but it is no longer carrying the message alone.
 *
 * `animation-play-state` rather than mounting and unmounting the animation, so
 * the disc resumes from the angle it stopped at instead of snapping back to
 * zero. Stopping a record and starting it again does not rewind it.
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
      'relative grid h-8 w-8 shrink-0 place-items-center rounded-full',
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
      {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
    </span>
  </button>
);

/**
 * The volume, between the mark and the disc.
 *
 * A native `range`, restyled by `.sp-volume` in `index.css`. Everything a
 * hand-built slider would have to reimplement — keyboard steps, page up and
 * down, the screen reader announcement, the touch target — comes free, and the
 * only reason people build them by hand is the track and thumb, which CSS can
 * reach.
 *
 * `null` means the device did not report a volume (some speakers and cast
 * targets do not). The slider shows a middle position and still works: sending
 * a volume to a device that has one is harmless, and refusing to draw the
 * control would be worse than being one notch out on the rare device.
 */
const VolumeControl = ({
  value,
  disabled,
  onChange,
}: {
  value: number | null;
  disabled: boolean;
  onChange: (value: number) => void;
}) => {
  const current = value ?? 50;
  const Icon = current === 0 ? VolumeX : current < 55 ? Volume1 : Volume2;

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0 text-content-faint" />
      <input
        type="range"
        min={0}
        max={100}
        value={current}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label="Volume"
        className="sp-volume min-w-0 flex-1 disabled:opacity-40"
      />
    </div>
  );
};

/**
 * Search, with the results opening upwards over the panel.
 *
 * ## Why upwards and over
 *
 * The box is at the bottom of a panel that is itself at the bottom of the
 * screen, so a list below it would open off the edge. Opening it *over* the
 * track row rather than pushing the panel taller is the other half: a container
 * that grows by 90px while somebody is typing moves the box under their
 * fingers, and near the bottom of the screen it would push itself off.
 *
 * ## Why the query is debounced here rather than in the API layer
 *
 * Because it is a property of *typing*, not of searching. A caller that wants
 * one search does one search; only a text field needs to be talked out of
 * asking on every keystroke. 320ms is about the length of a pause between
 * words.
 */
const SearchBox = ({ onPlay }: { onPlay: (trackId: string) => void }) => {
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
          // The guard is not about React's warning — it is about *order*. Two
          // searches in flight can land in either order, and the older one
          // landing last would show results for a prefix of what is typed.
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

  /*
   * Three rows, whatever they are.
   *
   * The API offers three tracks and three artists; six rows is a list, and a
   * list is not what this is. Three is what the panel can show without the
   * dropdown becoming the biggest thing on screen, and tracks come first
   * because playing one is the only thing in here that does not leave the app.
   */
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
    <div className="relative mt-2">
      {rows.length > 0 && (
        <div
          className={cn(
            // Anchored to the top of the box and drawn upwards, over whatever
            // is behind it. `z-10` clears the transport row; the panel itself
            // is the boundary, so nothing escapes the player.
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
                  onPlay(row.id);
                  setQuery('');
                  setResults(null);
                }}
                className="block w-full px-2.5 py-1.5 text-left hover:bg-surface-sunken"
              >
                <span className="block truncate text-2xs font-medium text-content">{row.name}</span>
                <span className="block truncate text-3xs text-content-muted">{row.artist}</span>
              </button>
            ) : (
              /* An artist is not playable in one call — Spotify would need a
                 context URI and a device — so it opens instead. The distinction
                 is drawn by the element: a button plays, a link leaves. */
              <a
                key={`a-${row.id}`}
                href={row.url}
                target="_blank"
                rel="noreferrer noopener"
                className="block truncate px-2.5 py-1.5 text-2xs text-content-muted hover:bg-surface-sunken hover:text-content"
              >
                {row.name}
              </a>
            ),
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5 rounded-xl border border-edge bg-surface-sunken/60 px-2 py-1">
        <Search className="h-3 w-3 shrink-0 text-content-faint" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('spotify.searchPlaceholder')}
          aria-label={t('spotify.searchPlaceholder')}
          className="min-w-0 flex-1 bg-transparent text-2xs text-content outline-none placeholder:text-content-faint"
        />
      </div>
    </div>
  );
};
