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
 * The closed size and the open panel, both in `rem` rather than pixels.
 *
 * ## Why the unit is the whole feature
 *
 * This application scales its root font size with the viewport — 15px at
 * 1024px up to 22px on a 21:9 panel, and clamped by *height* as well as width
 * so a short laptop is treated as the short screen it is (see the scale at the
 * top of `index.css`). Everything expressed in `rem` therefore follows the
 * screen for free, and everything expressed in pixels quietly does not.
 *
 * The player was the latter: a 292px panel with 44px of icon, which on a 4K
 * panel was a postage stamp beside chrome that had grown half again, and on a
 * 1366×768 laptop was a card whose text had shrunk but whose padding had not.
 * Stating both in `rem` is the "adapt to the resolution" behaviour, and it
 * costs one multiplication at the two places that genuinely need a number —
 * the width the panel animates to, and the decision about which way it opens.
 *
 * The open panel is also simply *bigger* than it was: 21rem against the old
 * 292px, which at the same root size is a 15% wider card. What that buys is
 * spent on the controls rather than on air — a transport row that is not
 * shoulder to shoulder, a title at reading size rather than at caption size,
 * and a disc big enough to aim at without looking.
 */
const ICON_REM = 2.75;
const PANEL_REM = 21;

/** How much clear space the panel wants on the side it opens towards. */
const EDGE_MARGIN_PX = 12;

/**
 * How long the volume slider waits after the last movement before it commits.
 *
 * ## Why there is a delay at all
 *
 * A native `range` fires `change` on every step of a drag. Sending each one was
 * thirty-odd calls to Spotify for a gesture that expresses a single intention,
 * and on an account with nothing playing every one of them came back 404 — the
 * toast storm this is the fix for. It also burned the endpoint's per-minute
 * budget in about two seconds of dragging.
 *
 * 260ms is past the gap between two steps of a continuous drag and well inside
 * the time it takes to let go of a thumb and look at what happened, so the
 * device follows the pointer in one hop rather than thirty. The thumb itself
 * does not wait: it is local state, moved on every event, so the control is as
 * immediate as it ever was — it is only the *network* that has been made to
 * wait for a pause.
 */
const VOLUME_COMMIT_MS = 260;

/** Pixels per `rem`, read from the root where the scale actually lives. */
const remToPx = (rem: number): number => {
  const root = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
  return rem * (Number.isFinite(root) && root > 0 ? root : 16);
};

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
 * Here there is one box. Shut, it is a circle with the Spotify mark in it;
 * open, the same box grows to a panel with the mark still in its corner. Only
 * one element is ever positioned, dragged or measured, the growth reads as the
 * icon unfolding, and the anchor never moves relative to the content.
 *
 * ## Which way it opens
 *
 * Normally rightwards, because that is where the room is for something parked
 * in the bottom-left corner. Dragged near the right-hand edge of the screen it
 * opens *leftwards* instead — see `opensLeft`. The direction is decided before
 * the panel is allowed to grow rather than corrected afterwards, which is the
 * difference between "it opens the other way over there" and a panel that
 * visibly overshoots the window and snaps back.
 *
 * ## Hover, pin, and the click that used to be a latch
 *
 * Hovering opens it and leaving closes it — a glance costs nothing and cleans
 * up after itself. Keeping it open is now a *pin*, with its own labelled
 * button inside the panel, because the two things somebody actually stays for
 * are typing in the search box and dragging the volume, and both would be
 * destroyed by a panel that closes when the pointer strays.
 *
 * The pin is one piece of state with two ways in: the button, and a click on
 * the mark itself. The mark has to keep doing it — on a touch screen there is
 * no hover to open the panel with at all, and a control reachable only by
 * pointing is not reachable on a phone. What changed is that the behaviour now
 * has a name and a visible switch, instead of being a latch somebody had to
 * discover by clicking a logo twice.
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

  const [isPinned, setIsPinned] = useLocalStorage(STORAGE_KEYS.spotifyPinned, false);
  const [isHovered, setIsHovered] = useState(false);
  const isOpen = isLive && (isPinned || isHovered);

  /*
   * The poll only runs while the panel is open.
   *
   * A closed player is an icon, and an icon does not need to know what is
   * playing. This is the single most important line for the cost of the
   * feature: without it, every signed-in tab would ask Spotify for a track
   * every five seconds forever. A *pinned* player is open, and pays for it
   * knowingly — that is what pinning means.
   */
  const { data: playback } = useSpotifyPlayback(isOpen);

  const command = useSpotifyCommand();
  const setVolume = useSpotifyVolume();
  const queueTrack = useSpotifyQueueTrack();

  const [position, setPosition] = useLocalStorage(STORAGE_KEYS.spotifyPosition, { x: 0, y: 0 });
  const x = useMotionValue(position.x);
  const y = useMotionValue(position.y);
  const shellRef = useRef<HTMLDivElement>(null);
  const { bounds, measure } = useViewportDragBounds(shellRef, x, y);

  /*
   * Which side the panel unfolds towards, decided from where the *shut* icon
   * is sitting.
   *
   * Measuring the closed shell rather than the open panel is what makes this
   * answerable before anything has moved: the icon's box is the anchor, the
   * panel's width is known, and the question is simply whether the one plus
   * the other still fits. Asking after the panel had opened would mean reading
   * a box that is either mid-animation or already off the screen.
   */
  const [opensLeft, setOpensLeft] = useState(false);

  const measureSide = useCallback(() => {
    const node = shellRef.current;
    if (!node) return;

    const { left } = node.getBoundingClientRect();
    setOpensLeft(left + remToPx(PANEL_REM) + EDGE_MARGIN_PX > window.innerWidth);
  }, []);

  /*
   * `useLayoutEffect`, not `useEffect`, and that is the no-glitch part.
   *
   * The pinned player is open on its very first render. A measurement taken
   * after paint would let one frame of a right-opening panel reach the screen
   * before the correction landed, which is exactly the flicker this is for.
   * Layout effects run before the browser paints, so the first frame anybody
   * sees already knows which way it goes.
   *
   * ## Why `isLive` is in the dependencies
   *
   * Because the component returns `null` until the connection status has
   * arrived, so on the first pass there is no element to measure — `measure`
   * reads a null ref and does nothing. Without re-running when the shell
   * actually appears, the answer stays at its default forever, and a player
   * parked against the right-hand edge opens straight off the screen. That is
   * not a subtle case: it is every pinned player on every page load.
   *
   * `position` is in there for the same reason at one remove: a player whose
   * remembered corner is restored after the first paint has moved, and which
   * side it can afford to open towards moved with it.
   */
  useLayoutEffect(() => {
    measureSide();

    window.addEventListener('resize', measureSide);
    return () => window.removeEventListener('resize', measureSide);
  }, [measureSide, isLive, position.x, position.y]);

  /*
   * A drag must not also be a click.
   *
   * The whole shell is draggable and the icon inside it is a button, so every
   * drop lands a click on the mark. Raised on drag start, lowered on the next
   * `pointerdown` — the same shape `ChatPin` arrived at, and for the same
   * reason: whether a drag synthesises a click is browser-dependent, so
   * clearing it in the click handler leaves it pinned forever on the engines
   * where it does not.
   */
  const didDragRef = useRef(false);

  const isPlaying = Boolean(playback?.isPlaying);
  const track = playback?.track ?? null;
  const canControl = Boolean(playback?.isPremium ?? connection?.isPremium);
  /*
   * Whether there is anything on the other end to shout at.
   *
   * Spotify answers `204 No Content` for "nothing is playing anywhere", which
   * the API turns into a null device — and every transport call against that
   * state comes back 404. Reading it here is what lets the controls be
   * *disabled* rather than merely failing: a volume slider that cannot work
   * should not move under the pointer and then apologise.
   *
   * `undefined` playback is "we have not asked yet", not "no device", so the
   * controls stay live until the first answer arrives rather than flashing
   * disabled on every open.
   */
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
        // The icon has landed somewhere new, so which way it can afford to
        // open may have changed with it. Measured on the drop rather than on
        // every frame of the drag: the panel is shut throughout a drag, so
        // there is nothing on screen that the intermediate answers would fix.
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
        // Bottom left, above the page and below the rails — the same band the
        // shortcut pills sit in, because it is the same kind of object: the
        // reader's own furniture rather than the application's chrome.
        'fixed bottom-5 left-5 z-30 select-none',
        'cursor-grab active:cursor-grabbing',
      )}
    >
      {/*
        The panel is positioned rather than in flow, and the shell above it
        keeps the icon's size forever.

        That is what makes the two directions symmetrical. A shell that grew
        with its contents would push its own right edge outwards, so "open
        leftwards" would have had to be a negative margin fighting a growing
        box — and the drag bounds, which measure the shell, would have snapped
        to a different size the moment the pointer arrived. A fixed 2.75rem
        anchor with an absolutely positioned panel hanging off one corner of it
        means the thing being dragged is always the icon, whatever is unfolded
        beside it.
      */}
      <motion.div
        initial={false}
        animate={{ width: `${isOpen ? PANEL_REM : ICON_REM}rem` }}
        transition={reduceMotion ? { duration: 0 } : transition}
        className={cn(
          // `panel` rather than a hand-rolled surface: it is the class every
          // floating thing in the product is made of, so the player is drawn in
          // each skin's own material — arcade tile, newsprint, glass — without
          // this file knowing any of their names.
          'panel absolute bottom-0',
          /*
           * Clipped shut, open when open.
           *
           * The clip is what makes the closed state a *circle* — without it the
           * panel's content would spill out of the disc during the collapse.
           * Open, it is the opposite: the search results are drawn upwards out
           * of the top of the panel, and clipping them there would cut the
           * first row in half, which is exactly what it did.
           */
          isOpen ? 'overflow-visible rounded-2xl' : 'overflow-hidden rounded-full',
          // The corner the panel is nailed to. Shut, the two are the same
          // point; open, this is the edge that does not move while the other
          // one travels.
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
                {/*
                  The pin, next to the mark rather than in the panel's far
                  corner.

                  It belongs to the same object as the logo — both answer "is
                  this thing staying" — and putting it at the other end of the
                  row would have had it sitting beside the transport, where
                  every other control does something to the *music*.
                */}
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

/* -------------------------------------------------------------------------- *
 * The pieces
 * -------------------------------------------------------------------------- */

/**
 * The switch that keeps the panel on screen.
 *
 * `aria-pressed` rather than a checkbox: it is a toggle on a thing that is
 * already visible, not a preference in a form, and a screen reader saying
 * "pressed" is the right description of a pin that is currently holding
 * something open.
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
    {/* Two glyphs rather than one rotated: `PinOff` is a struck-through pin,
        which says "press this to stop pinning" — the *action*, which is what a
        button's icon is for. */}
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
 * ## Why it is the biggest control in the panel
 *
 * It was 2rem across with a 0.75rem glyph in it, which is smaller than the two
 * skip buttons look and about half the size of the thing it is: the record. It
 * is now 2.5rem with a 1rem glyph — the largest target in the row, which is
 * what it should have been, since play/pause is the button pressed more often
 * than the other three put together.
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
 * The volume, between the pin and the disc.
 *
 * A native `range`, restyled by `.sp-volume` in `index.css`. Everything a
 * hand-built slider would have to reimplement — keyboard steps, page up and
 * down, the screen reader announcement, the touch target — comes free, and the
 * only reason people build them by hand is the track and thumb, which CSS can
 * reach.
 *
 * ## Why the thumb and the device are on different clocks
 *
 * They have to be. The thumb has to be on the pointer's clock or the control
 * does not work; the device cannot be, or one gesture is thirty requests. So
 * the position is local state — written on every `change`, which is what makes
 * the slider feel native — and the *commit* is a timer that restarts on each
 * movement and fires once the hand has stopped. See `VOLUME_COMMIT_MS`.
 *
 * The timer is also cleared on unmount, which matters more here than it looks:
 * the panel unmounts the moment the pointer leaves it, and a volume committed
 * after that would be a change nobody was still asking for.
 *
 * ## Why an external change can still move it
 *
 * `value` keeps arriving from the five-second poll, and a slider that ignored
 * it would drift away from a device somebody turned down at the speaker. The
 * incoming number wins whenever it differs from the last one *seen*, which is
 * not the same as whenever it differs from the thumb — that would have the
 * poll yanking the thumb back mid-drag, every five seconds, for the whole of a
 * gesture it has not been told about yet.
 *
 * `null` means the device did not report a volume (some speakers and cast
 * targets do not). The slider shows a middle position and still works: sending
 * a volume to a device that has one is harmless, and refusing to draw the
 * control would be worse than being one notch out on the rare device.
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
 * Search, with the results opening upwards over the panel.
 *
 * ## Why a result is queued rather than played
 *
 * Pressing a song in here used to call `play`, which replaces the playback
 * context outright: the album somebody was listening to stopped, the chosen
 * track started, and "next" afterwards did nothing because the device had been
 * left holding a one-item queue. That is the *less* likely reading of the
 * gesture — somebody who hears a song mentioned while an album is running
 * wants it after this one, not instead of it — and it was the destructive one,
 * which is the combination worth changing.
 *
 * `queue` appends to the user queue, so nothing is interrupted and the track
 * plays when the current one ends. The glyph on the row says so: a list with a
 * plus, not a play triangle.
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
   * because queueing one is the only thing in here that does not leave the app.
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
    <div className="relative mt-2.5">
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
                {/* The verb, drawn. A row that plays and a row that queues look
                    identical without it, and the difference is the whole of
                    what changed about this control. */}
                <ListPlus
                  aria-hidden
                  className="h-3.5 w-3.5 shrink-0 text-content-faint group-hover:text-brand"
                />
              </button>
            ) : (
              /* An artist is not queueable in one call — Spotify would need a
                 context URI and a device — so it opens instead. The distinction
                 is drawn by the element: a button acts, a link leaves. */
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
