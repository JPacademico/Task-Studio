import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FileText,
  Hand,
  LogOut,
  Mic,
  MicOff,
  MonitorUp,
  MonitorX,
  PhoneOff,
  Video,
  VideoOff,
  Volume2,
} from 'lucide-react';

import { useLiveRoomActions } from '@/entities/live-room/model/queries';
import type { LiveRoom } from '@/entities/live-room/model/types';
import { cn } from '@/shared/lib/cn';
import { Button, SkinLoader } from '@/shared/ui';
import { useT } from '@/shared/i18n';
import { FULLSCREEN_EVENTS, fullscreenElement } from '../lib/fullscreen';
import { useLiveCallStore } from '../model/live-call.store';
import { useLiveCall } from '../model/use-live-call';
import { ParticipantTile } from './participant-tile';

interface LiveStageProps {
  room: LiveRoom;
  /** Leaving the call, as opposed to ending the room for everybody. */
  onLeave: () => void;
  /** Opens the linked page on the text board. */
  onOpenDocument?: (documentId: string) => void;
}

/**
 * How the tiles are laid out, by how many there are.
 *
 * Written as a lookup rather than as `auto-fit` with a `minmax`, because the
 * two disagree about the case that matters most. `auto-fit` given a 320px
 * minimum puts two people side by side in a wide panel and leaves each of them
 * a strip a third as tall as the space — whereas a call of two wants two large
 * tiles, and a call of five wants a 3x2 grid with one gap rather than five
 * columns of postage stamps.
 *
 * Capped at three columns because `LIVE_MAX_PARTICIPANTS` is eight: four
 * columns would put the eighth tile alone on a second row with three empty
 * cells beside it.
 */
const gridFor = (count: number): string => {
  if (count <= 1) return 'grid-cols-1';
  if (count <= 4) return 'grid-cols-1 sm:grid-cols-2';
  return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
};

/**
 * The call itself.
 *
 * Everything technical lives in `useLiveCall` — this is the surface. The one
 * decision it does make is the order of the controls, which is worth stating:
 * **microphone, camera, screen, hand, leave**, left to right, with leave
 * separated. That is the order of how often they are pressed, and the gap is
 * because leave is the one that cannot be undone by pressing it again.
 */
export const LiveStage = ({ room, onLeave, onOpenDocument }: LiveStageProps) => {
  const t = useT();
  const { end, grant } = useLiveRoomActions(room.projectId);

  const call = useLiveCall({
    roomId: room.id,
    enabled: true,
    canSpeak: room.you.canSpeak,
    canPresent: room.you.canPresent,
    onEnded: onLeave,
  });

  /*
   * The rest of the app is told the call is up, and how to end it.
   *
   * Only while it is actually live — not while the devices are being asked
   * for or the join is in flight — because what this enables is the project
   * page keeping the stage alive across tabs and the guard stopping somebody
   * leaving the project, and both are about a call that exists. Cleared on
   * the way out, whichever way out that is. See `useLiveCallStore`.
   */
  const register = useLiveCallStore((state) => state.register);
  const unregister = useLiveCallStore((state) => state.unregister);
  const hangUp = call.leave;
  const isLive = call.status === 'live';

  useEffect(() => {
    if (!isLive) return;
    register({
      projectId: room.projectId,
      roomId: room.id,
      roomTitle: room.title,
      leave: hangUp,
    });
    return () => unregister(room.id);
  }, [hangUp, isLive, register, room.id, room.projectId, room.title, unregister]);

  /*
   * The live answer, not the one the room row was fetched with.
   *
   * `room.you` is what the API said when the tab last loaded the list; the
   * seat is what the gateway says right now, and a moderator raising somebody
   * mid-call changes the second without touching the first.
   */
  const you = call.self ?? room.you;
  const canModerate = call.self?.isModerator ?? room.you.isModerator;

  const roster = call.roster;
  const columns = useMemo(() => gridFor(roster.length), [roster.length]);

  /*
   * One stable callback for the whole grid, not one arrow function per tile.
   *
   * `ParticipantTile`'s visibility effect depends on the handler it is given,
   * so a fresh closure per render would tear the `IntersectionObserver` down
   * and build a new one on every render of the stage - and the stage
   * re-renders whenever anybody mutes, unmutes, raises a hand or changes
   * connection quality, which in a call of eight is constantly. Rebuilding an
   * observer fires it again immediately, so that would also emit a
   * `live:video-interest` frame per tile per re-render.
   *
   * The curry is what keeps it stable while still telling the call *which*
   * peer moved: `visibilityHandlers` memoises one bound function per
   * participant, created on first use and reused thereafter.
   */
  const setVideoInterest = call.setVideoInterest;
  const visibilityHandlers = useRef(new Map<string, (visible: boolean) => void>());

  /*
   * What each tile last said about itself, and which one fills the screen.
   *
   * Interest is now two questions rather than one: can this tile be seen, and
   * is somebody else's tile covering everything. Both are kept here so either
   * can change and the answer sent is always the pair of them together.
   */
  const tileVisible = useRef(new Map<string, boolean>());
  const [fullscreenId, setFullscreenId] = useState<string | null>(null);
  const fullscreenRef = useRef<string | null>(null);

  const wantsVideoFrom = useCallback((participantId: string) => {
    const focused = fullscreenRef.current;
    return (
      (tileVisible.current.get(participantId) ?? true) &&
      (focused === null || focused === participantId)
    );
  }, []);

  const visibilityHandlerFor = useCallback(
    (participantId: string) => {
      const existing = visibilityHandlers.current.get(participantId);
      if (existing) return existing;

      const handler = (visible: boolean) => {
        tileVisible.current.set(participantId, visible);
        setVideoInterest(participantId, wantsVideoFrom(participantId));
      };
      visibilityHandlers.current.set(participantId, handler);
      return handler;
    },
    [setVideoInterest, wantsVideoFrom],
  );

  /*
   * One tile full screen, and every other stream paused while it is.
   *
   * ## Why the stage listens rather than the tile
   *
   * A tile knows when *it* goes full screen, but what matters is what that
   * does to every other tile: they are all still mounted and still intersecting
   * the viewport underneath, so their observers would keep saying "visible" to
   * peers whose video nobody can see. Only the stage has all of them in hand.
   *
   * It also catches the exits nobody pressed a button for: Escape, the
   * browser's own gesture, and the tile being unmounted because its peer left,
   * which takes the fullscreen element out of the document and ends it.
   *
   * ## What pausing buys the person watching
   *
   * Each paused peer stops encoding for us (see `setVideoInterest`), so the
   * downlink and the decoder that were spread over the grid are left to the one
   * stream on screen. On a home connection that is the difference between a
   * shared document being readable at full size and smearing every time somebody
   * else in the call moves. It is also a saving for the paused peers, who send
   * one fewer stream.
   *
   * ## Why the matching is by attribute
   *
   * `data-participant-id` is on each tile, so the element that went full screen
   * names its own peer. There is no map of elements to keep in step with the
   * roster.
   */
  useEffect(() => {
    const sync = () => {
      const element = fullscreenElement();
      const id =
        element instanceof HTMLElement ? (element.dataset.participantId ?? null) : null;
      if (id === fullscreenRef.current) return;

      fullscreenRef.current = id;
      setFullscreenId(id);

      const selfId = call.self?.participantId;
      for (const peer of call.roster) {
        if (peer.participantId === selfId) continue;
        setVideoInterest(peer.participantId, wantsVideoFrom(peer.participantId));
      }
    };

    for (const name of FULLSCREEN_EVENTS) document.addEventListener(name, sync);
    return () => {
      for (const name of FULLSCREEN_EVENTS) document.removeEventListener(name, sync);
    };
  }, [call.roster, call.self?.participantId, setVideoInterest, wantsVideoFrom]);

  if (call.status === 'idle' || call.status === 'error') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-edge bg-surface-raised p-8 text-center">
        <p className="text-sm font-semibold">{room.title}</p>
        {call.error && <p className="max-w-sm text-xs text-danger">{call.error}</p>}
        <p className="max-w-sm text-xs leading-relaxed text-content-muted">
          {t('live.joinHint')}
        </p>
        <div className="flex gap-2">
          <Button onClick={() => void call.join()}>{t('live.join')}</Button>
          <Button variant="ghost" onClick={onLeave}>
            {t('common.close')}
          </Button>
        </div>
      </div>
    );
  }

  if (call.status === 'devices' || call.status === 'joining') {
    return (
      <div className="grid place-items-center rounded-2xl border border-edge bg-surface-raised p-12">
        <SkinLoader
          label={call.status === 'devices' ? t('live.requestingDevices') : t('live.connecting')}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* --- What this call is about ------------------------------------- */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{room.title}</p>

        <span className="text-2xs tabular-nums text-content-faint">
          {t('live.inRoom', {
            count: String(roster.length),
            max: String(room.maxParticipants),
          })}
        </span>

        {room.document && (
          <button
            type="button"
            onClick={() => onOpenDocument?.(room.document!.id)}
            className={cn(
              'ui-chip inline-flex items-center gap-1.5 rounded-lg bg-surface-sunken px-2 py-1',
              'text-2xs text-content-muted transition-colors hover:text-content',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
            )}
          >
            <FileText className="h-3 w-3" />
            <span className="max-w-[12rem] truncate">{room.document.title}</span>
          </button>
        )}
      </div>

      {/* --- The people --------------------------------------------------- */}
      <div className={cn('grid min-h-0 flex-1 content-start gap-2', columns)}>
        {roster.map((peer) => {
          const isSelf = peer.participantId === call.self?.participantId;

          return (
            <ParticipantTile
              key={peer.participantId}
              peer={peer}
              isSelf={isSelf}
              /*
               * The local tile is keyed on the literal `self`, because that is
               * what the detector was handed for the local stream — it exists
               * before a participant id does.
               */
              /*
               * Only with the microphone on. A muted presenter's stream can
               * still carry sound, their shared screen's, and a speaking ring
               * around somebody who is muted would be a lie about the one
               * thing the ring is for.
               */
              isSpeaking={
                peer.flags.micOn && call.speaking.has(isSelf ? 'self' : peer.participantId)
              }
              canModerate={canModerate}
              /*
               * No quality on your own tile, because there is no connection to
               * measure - the local preview is the camera, not a stream that
               * crossed a network. Reporting "good" there would be a claim
               * about somebody else's experience of you, which this client
               * cannot see.
               */
              quality={isSelf ? undefined : call.quality[peer.participantId]}
              onVisibilityChange={isSelf ? undefined : visibilityHandlerFor(peer.participantId)}
              isFullscreen={fullscreenId === peer.participantId}
              onGrantSpeak={() =>
                grant.mutate({
                  roomId: room.id,
                  // `null` clears the override rather than pinning a "no", so
                  // somebody let back in follows the room's policy again.
                  payload: { userId: peer.userId, canSpeak: peer.canSpeak ? null : true },
                })
              }
              onGrantPresent={() =>
                grant.mutate({
                  roomId: room.id,
                  payload: { userId: peer.userId, canPresent: peer.canPresent ? null : true },
                })
              }
            />
          );
        })}
      </div>

      {/* --- Being told you are listening only ---------------------------- */}
      {!you.canSpeak && (
        <p className="flex items-center gap-1.5 rounded-lg bg-warning/10 px-2.5 py-1.5 text-2xs text-content">
          <MicOff className="h-3 w-3 shrink-0 text-warning" />
          {t('live.listenOnly')}
        </p>
      )}

      {/* --- The controls -------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-edge bg-surface-raised p-2">
        <ControlButton
          onClick={call.toggleMic}
          isActive={call.flags.micOn}
          isDisabled={!you.canSpeak}
          label={call.flags.micOn ? t('live.muteSelf') : t('live.unmuteSelf')}
          icon={call.flags.micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        />

        <ControlButton
          onClick={call.toggleCam}
          isActive={call.flags.camOn}
          isDisabled={call.flags.sharing}
          label={call.flags.camOn ? t('live.cameraOff') : t('live.cameraOn')}
          /*
           * The camera held back for the voice (see `watchUplink`). On the
           * button because that is where somebody looks when they wonder
           * whether their camera is on, and the title says what happened.
           */
          warning={call.flags.camOn && call.cameraHeld ? t('live.cameraHeld') : undefined}
          icon={
            call.flags.camOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />
          }
        />

        <ControlButton
          onClick={() => (call.flags.sharing ? void call.stopShare() : void call.startShare())}
          isActive={call.flags.sharing}
          isDisabled={!you.canPresent}
          label={
            call.flags.sharing
              ? call.sharingAudio
                ? t('live.stopShareWithAudio')
                : t('live.stopShare')
              : t('live.share')
          }
          // Whether the picker's "share audio" box was ticked is easy to miss,
          // so a share that carries sound says so on the button.
          mark={
            call.flags.sharing && call.sharingAudio ? <Volume2 className="h-2.5 w-2.5" /> : undefined
          }
          icon={
            call.flags.sharing ? (
              <MonitorX className="h-4 w-4" />
            ) : (
              <MonitorUp className="h-4 w-4" />
            )
          }
        />

        {/* Only where it means something: a room anybody can talk in has no
            queue to join, and a button that does nothing is worse than none. */}
        {!you.canSpeak && (
          <ControlButton
            onClick={call.raiseHand}
            isActive={call.flags.handRaised}
            label={t('live.raiseHand')}
            icon={<Hand className="h-4 w-4" />}
          />
        )}

        <span className="mx-1 h-6 w-px bg-edge" aria-hidden />

        <Button size="sm" variant="ghost" onClick={() => { call.leave(); onLeave(); }}>
          <LogOut className="h-3.5 w-3.5" />
          {t('live.leave')}
        </Button>

        {/* Ending the room turns everybody out, so it is a moderator's
            control and it is the last thing on the row. */}
        {canModerate && (
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              end.mutate(room.id);
              call.leave();
              onLeave();
            }}
          >
            <PhoneOff className="h-3.5 w-3.5" />
            {t('live.end')}
          </Button>
        )}
      </div>
    </div>
  );
};

interface ControlButtonProps {
  onClick: () => void;
  isActive: boolean;
  isDisabled?: boolean;
  label: string;
  icon: React.ReactNode;
  /**
   * Something wrong with what this control runs, said as a yellow "!" on its
   * corner, and in its title and accessible name ahead of the label.
   */
  warning?: string;
  /** A small neutral badge on the corner, for a state worth seeing at a glance. */
  mark?: React.ReactNode;
}

/**
 * One round control.
 *
 * `aria-pressed` rather than a second label for the on state: these are
 * toggles, and a screen reader announcing "microphone, pressed" is both
 * shorter and more accurate than two strings that have to be kept in step.
 * The visible `title` still changes, because sighted users have no equivalent
 * of the pressed state being read out.
 */
const ControlButton = ({
  onClick,
  isActive,
  isDisabled,
  label,
  icon,
  warning,
  mark,
}: ControlButtonProps) => {
  const title = warning ? `${warning} ${label}` : label;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-pressed={isActive}
      aria-label={title}
      title={title}
      className={cn(
        'relative grid h-10 w-10 place-items-center rounded-full border transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60',
        'disabled:cursor-not-allowed disabled:opacity-40',
        isActive
          ? 'border-brand bg-brand text-brand-contrast'
          : 'border-edge bg-surface-sunken text-content-muted hover:text-content',
      )}
    >
      {icon}
      {warning ? (
        <span
          aria-hidden
          className={cn(
            'absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full',
            'bg-warning text-3xs font-bold leading-none text-black ring-2 ring-surface-raised',
          )}
        >
          !
        </span>
      ) : (
        mark && (
          <span
            aria-hidden
            className={cn(
              'absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full',
              'bg-surface-raised text-content ring-1 ring-edge',
            )}
          >
            {mark}
          </span>
        )
      )}
    </button>
  );
};
