import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '@/shared/lib/toast';

import { useIceServers } from '@/entities/live-room/model/queries';
import type {
  IceServerConfig,
  LiveFlags,
  LiveJoinResult,
  LiveQuality,
  LiveQualityLevel,
  LiveSeat,
} from '@/entities/live-room/model/types';
import { emitWithAck, getSocket } from '@/shared/api/socket';
import { translate } from '@/shared/i18n';
import { SpeakingDetector } from '../lib/audio-levels';
import { DISPLAY_MEDIA_OPTIONS, ScreenAudioMix } from '../lib/screen-share';

/**
 * Where a call is, from the button being pressed to the first voice. `devices` is a state rather
 * than a boolean because it is the step that most often stalls.
 */
export type LiveCallStatus = 'idle' | 'devices' | 'joining' | 'live' | 'ended' | 'error';

/** One peer, as the stage draws it: who they are, plus what we are receiving. */
export interface LivePeer extends LiveSeat {
  stream: MediaStream | null;
  /**
   * Whether this person's camera is on but held back, because their uplink cannot carry it and
   * their voice at once.
   */
  videoHeld?: boolean;
}

/**
 * What the outbound video is allowed to cost, by how many people are in the room. A mesh sends one
 * copy of your camera to every other participant.
 */
const videoCeiling = (peerCount: number): number => {
  if (peerCount <= 1) return 700_000;
  if (peerCount <= 3) return 400_000;
  if (peerCount <= 5) return 250_000;
  return 150_000;
};

/** And what a *screen* is allowed to cost, which is not the same thing at all. */
const screenCeiling = (peerCount: number): number => {
  if (peerCount <= 1) return 2_500_000;
  if (peerCount <= 3) return 1_500_000;
  if (peerCount <= 5) return 900_000;
  return 600_000;
};

/** And what the microphone costs, which does not vary with the room. */
const AUDIO_BITRATE = 32_000;

/**
 * What the audio sender may use while it carries a shared screen's sound. Speech is a narrow,
 * forgiving signal and music is neither: at 32 kbps a soundtrack comes out underwater.
 */
const SCREEN_AUDIO_BITRATE = 96_000;

// How many frames a second a shared screen is sent at, by what else the presenter is doing.
// `FOCUSED` is a presenter who is muted, with the camera necessarily off.
const SHARE_FPS_FOCUSED = 27;
const SHARE_FPS_BESIDE_VOICE = 24;
const SHARE_FPS_STRAINED = 12;

/** The largest picture a share is sent at. See `DISPLAY_MEDIA_OPTIONS`. */
const SHARE_MAX_WIDTH = 1280;
const SHARE_MAX_HEIGHT = 720;

/**
 * And the largest while the presenter's microphone is on. 480p is what leaves the voice room: it is
 * under half the pixels of 720p.
 */
const SHARE_VOICE_WIDTH = 854;
const SHARE_VOICE_HEIGHT = 480;

// When an uplink counts as struggling.
const STRAIN_AUDIO_LOSS = 0.05;
const STRAIN_VIDEO_LOSS = 0.1;
const STRAIN_RTT_S = 0.5;
const CAMERA_FLOOR_BPS = 100_000;

/** And when a held camera may be tried again: the voice has to be clean. */
const CLEAR_AUDIO_LOSS = 0.02;
const CLEAR_RTT_S = 0.35;

/** Consecutive struggling polls before the camera is held back: four seconds. */
const HOLD_AFTER_SAMPLES = 2;

// How long a held camera waits before it is tried again.
const RETRY_BASE_MS = 10_000;
const RETRY_MAX_MS = 60_000;
const RELAPSE_MS = 20_000;

/**
 * What the camera is asked for. `ideal`, never `exact`: a constraint a device cannot meet with
 * `exact` makes `getUserMedia` throw.
 */
const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 640 },
  height: { ideal: 360 },
  frameRate: { ideal: 24, max: 30 },
};

/**
 * And the microphone, with the three processors that make a laptop usable. Every one of these is on
 * by default in every browser that implements it; they are named explicitly.
 */
const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

/** Falls back to a public STUN server if the API could not be reached. */
const FALLBACK_ICE: IceServerConfig[] = [{ urls: 'stun:stun.l.google.com:19302' }];

/**
 * How long a `disconnected` connection is given to sort itself out. ICE reports `disconnected` when
 * its consent checks go quiet.
 */
const DISCONNECT_GRACE_MS = 5_000;

/** How often every connection's stats are read. See `pollQuality`. */
const STATS_INTERVAL_MS = 2_000;

/** The outbound label stream, made on first use. See `outboundLabel`. */
const labelOf = (ref: { current: MediaStream | null }): MediaStream =>
  (ref.current ??= new MediaStream());

/**
 * What one sender should be set to. Every field is stated on every plan, so moving from a screen
 * back to the camera can never leave the screen's frame rate behind on the camera.
 */
interface SenderPlan {
  maxBitrate: number;
  /**
   * How the browser splits a connection's bandwidth between its senders, and how the packets are
   * marked for the network.
   */
  priority: RTCPriorityType;
  /** Video only. */
  maxFramerate?: number;
  scaleResolutionDownBy?: number;
  degradationPreference?: RTCDegradationPreference;
}

/** How far a shared picture has to shrink to fit within `maxWidth` x `maxHeight`. */
const shareScale = (track: MediaStreamTrack, maxWidth: number, maxHeight: number): number => {
  const { width, height } = track.getSettings();
  if (!width || !height) return 1;
  const scale = Math.max(1, width / maxWidth, height / maxHeight);
  // Two decimals, so a window being dragged a pixel does not count as a change.
  return Math.round(scale * 100) / 100;
};

/**
 * Hands a sender its plan. `degradationPreference` is the one field an engine may refuse outright
 * rather than ignore, and one refused field fails the whole call, bitrate ceiling included.
 */
const applyPlan = async (sender: RTCRtpSender, plan: SenderPlan): Promise<boolean> => {
  const attempt = async (withPreference: boolean) => {
    const parameters = sender.getParameters();
    const encoding = parameters.encodings?.[0];
    if (!encoding) return false;

    encoding.maxBitrate = plan.maxBitrate;
    encoding.priority = plan.priority;
    encoding.networkPriority = plan.priority;
    if (plan.maxFramerate !== undefined) encoding.maxFramerate = plan.maxFramerate;
    if (plan.scaleResolutionDownBy !== undefined) {
      encoding.scaleResolutionDownBy = plan.scaleResolutionDownBy;
    }
    if (withPreference && plan.degradationPreference) {
      parameters.degradationPreference = plan.degradationPreference;
    }

    await sender.setParameters(parameters);
    return true;
  };

  try {
    return await attempt(true);
  } catch {
    if (!plan.degradationPreference) return false;
    return attempt(false).catch(() => false);
  }
};

interface Connection {
  pc: RTCPeerConnection;
  /** The sender the camera *or* the screen occupies. See `startShare`. */
  videoSender: RTCRtpSender | null;
  audioSender: RTCRtpSender | null;
  /** Candidates that arrived before there was a remote description to attach them to. */
  pending: RTCIceCandidateInit[];
  /**
   * What this peer is sending us, assembled by hand. Only used when the far side's sender carried
   * no stream id (`a=msid:-`).
   */
  remote: MediaStream | null;
  /**
   * The seat this connection is to, kept so the recovery ladder can rebuild it without the roster.
   * `openConnection` is handed a seat; `closeConnection` used to throw it away.
   */
  peer: LiveSeat;
  /** Whether this client offered. Rebuilding has to preserve the direction. */
  isCaller: boolean;
  /** Whether this connection was rebuilt with `iceTransportPolicy: 'relay'`. */
  relayOnly: boolean;
  /** Whether `restartIce()` has already been spent on this connection. */
  restarted: boolean;
  /** Pending `disconnected` grace timer, so a recovery cannot stack. */
  graceTimer: number | undefined;
  /**
   * Whether this peer currently wants our video. True until they say otherwise — a connection
   * starts sending.
   */
  wantsVideo: boolean;
  /**
   * The last stats sample, so the next one can be turned into a rate. `getStats` reports cumulative
   * counters — packets received, packets lost.
   */
  lastStats: { packets: number; lost: number } | null;
  /**
   * Every track swap and parameter change on this connection, one at a time. `getParameters` and
   * `setParameters` are a pair that must not interleave with another pair on the same sender.
   */
  syncing: Promise<void>;
  /**
   * What each sender was last successfully set to, as a signature of its plan and track. A pass
   * whose plan has not changed costs a string comparison and no calls into the engine.
   */
  tuned: { audio: string | null; video: string | null };
  /** Whether the camera is held back from this peer. See `watchUplink`. */
  cameraHeld: boolean;
  /** The bookkeeping behind `cameraHeld`. */
  uplink: {
    /** Whether the last poll found the uplink struggling. */
    strained: boolean;
    /** Consecutive struggling polls while the camera was being sent. */
    run: number;
    /** When a held camera may next be tried. */
    retryAt: number;
    /** The wait that produced `retryAt`, doubled on a relapse. */
    backoffMs: number;
    /** When the camera last came back, to tell a relapse from a new problem. */
    resumedAt: number;
  };
}

interface UseLiveCallOptions {
  roomId: string | undefined;
  /** False while the tab is open but the user has not pressed join. */
  enabled: boolean;
  /** Whether the room lets this person unmute at all. */
  canSpeak: boolean;
  canPresent: boolean;
  onEnded?: () => void;
}

/**
 * One live call, as a hook. Every participant holds a direct `RTCPeerConnection` to every other
 * participant — a full mesh.
 */
export const useLiveCall = ({
  roomId,
  enabled,
  canSpeak,
  canPresent,
  onEnded,
}: UseLiveCallOptions) => {
  const { data: iceServers } = useIceServers(enabled);

  const [status, setStatus] = useState<LiveCallStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [self, setSelf] = useState<LiveSeat | null>(null);
  const [peers, setPeers] = useState<LivePeer[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  /**
   * What the presenter sees on their own tile while they share. A share swaps the screen into the
   * *peers'* video sender (see `startShare`) and never touches `localStream`, which is the camera.
   */
  const [screenPreview, setScreenPreview] = useState<MediaStream | null>(null);
  const [flags, setFlags] = useState<LiveFlags>({
    micOn: false,
    camOn: false,
    sharing: false,
    handRaised: false,
  });
  const [speaking, setSpeaking] = useState<Set<string>>(new Set());
  /**
   * How each connection is doing, keyed by participant id. State rather than a ref, unusually for
   * this hook, because it is the one derived number the stage actually draws.
   */
  const [quality, setQuality] = useState<Record<string, LiveQuality>>({});
  /** Whether the camera is held back from anybody. See `watchUplink`. */
  const [cameraHeld, setCameraHeld] = useState(false);
  /** Whether the current share is carrying sound. */
  const [sharingAudio, setSharingAudio] = useState(false);

  // Everything below lives in refs rather than state, and the rule is simple: if React re-rendering
  // because it changed would be wrong or wasteful, it is a ref.
  const connections = useRef(new Map<string, Connection>());
  /**
   * The roster, readable from a callback without being a dependency of it. `applyPlayoutHint` needs
   * to know whether a peer is sharing *right now*.
   */
  const peersRef = useRef<LivePeer[]>([]);
  peersRef.current = peers;
  /** The stats poll, so it can be stopped exactly once. See `pollQuality`. */
  const statsTimer = useRef<number | undefined>(undefined);
  const localRef = useRef<MediaStream | null>(null);
  const cameraTrack = useRef<MediaStreamTrack | null>(null);
  const screenTrack = useRef<MediaStreamTrack | null>(null);
  /** The shared screen's sound, when the presenter chose to share it. */
  const screenAudio = useRef<MediaStreamTrack | null>(null);
  /** Voice and screen sound together. See `ScreenAudioMix`. */
  const screenMix = useRef<ScreenAudioMix | null>(null);
  const selfRef = useRef<LiveSeat | null>(null);
  /**
   * What this client may do *right now*. The props are what the room row said when the tab last
   * fetched it; the seat is what the gateway says.
   */
  const allowedRef = useRef({ canSpeak, canPresent });
  const detector = useRef<SpeakingDetector | null>(null);
  /**
   * The stream id every outbound sender is labelled with. Never played and never given a track: it
   * exists so the SDP carries an `a=msid` naming one stream for both of this client's tracks.
   */
  const outboundLabel = useRef<MediaStream | null>(null);
  /**
   * Signals from a peer this client has no connection to *yet*. The joiner answers everybody
   * already in the room.
   */
  const earlySignals = useRef(new Map<string, { from: string; data: Record<string, unknown> }[]>());
  const iceRef = useRef<IceServerConfig[]>(FALLBACK_ICE);
  /** Guards the teardown against a join that is still in flight. */
  const leftRef = useRef(false);
  /**
   * The room the gateway has seated this client in, until it is told otherwise. Set when the join
   * is acknowledged and cleared when `leave` says goodbye.
   */
  const seatedRoom = useRef<string | null>(null);

  // The newest ICE list, held in a ref so a renewal never re-renders the call. It is read once per
  // `RTCPeerConnection`, at construction.
  useEffect(() => {
    const servers = iceServers?.iceServers;
    if (servers && servers.length > 0) iceRef.current = servers;
  }, [iceServers]);

  /*
   * The seat wins where there is one; the props are the answer before the
   * join has returned, which is when the button is still disabled anyway.
   */
  useEffect(() => {
    allowedRef.current = {
      canSpeak: self?.canSpeak ?? canSpeak,
      canPresent: self?.canPresent ?? canPresent,
    };
  }, [canPresent, canSpeak, self?.canPresent, self?.canSpeak]);

  // --- Peer plumbing -----------------------------------------------------------

  const patchPeer = useCallback((participantId: string, patch: Partial<LivePeer>) => {
    setPeers((current) =>
      current.map((peer) =>
        peer.participantId === participantId ? { ...peer, ...patch } : peer,
      ),
    );
  }, []);

  // --- The media plan: what each sender carries, and what it may cost ----------

  // The senders used to be filled in five places (join, mute, camera, share, a peer's interest) and
  // tuned in a sixth, each deciding for itself. That held while there was one question per sender.

  /** What the audio sender carries. See `ScreenAudioMix` for the three cases. */
  const outboundAudio = useCallback((): MediaStreamTrack | null => {
    const microphone = localRef.current?.getAudioTracks()[0] ?? null;
    const voice = microphone?.enabled ? microphone : null;
    const sound = screenAudio.current;
    if (voice && sound) return screenMix.current?.track ?? voice;
    return voice ?? sound;
  }, []);

  /**
   * What one peer's video sender carries. Nothing, if they have said they cannot see us
   * (`live:video-interest`). The screen, whenever there is one.
   */
  const outboundVideo = useCallback((connection: Connection): MediaStreamTrack | null => {
    if (!connection.wantsVideo) return null;
    if (screenTrack.current) return screenTrack.current;
    if (connection.cameraHeld) return null;
    return cameraTrack.current;
  }, []);

  /**
   * The bitrate ceiling and the rest of each sender's parameters. The ceiling is a function of the
   * room's size (see `videoCeiling`).
   */
  const planFor = useCallback(
    (connection: Connection, kind: 'audio' | 'video', track: MediaStreamTrack): SenderPlan => {
      if (kind === 'audio') {
        return {
          maxBitrate: screenAudio.current ? SCREEN_AUDIO_BITRATE : AUDIO_BITRATE,
          priority: 'high',
        };
      }

      const peerCount = connections.current.size;

      if (track !== screenTrack.current) {
        return {
          maxBitrate: videoCeiling(peerCount),
          priority: 'low',
          maxFramerate: 30,
          scaleResolutionDownBy: 1,
          degradationPreference: 'balanced',
        };
      }

      const isFocused = localRef.current?.getAudioTracks()[0]?.enabled !== true;
      return {
        maxBitrate: screenCeiling(peerCount),
        priority: isFocused ? 'high' : 'medium',
        maxFramerate: isFocused
          ? SHARE_FPS_FOCUSED
          : connection.uplink.strained
            ? SHARE_FPS_STRAINED
            : SHARE_FPS_BESIDE_VOICE,
        scaleResolutionDownBy: isFocused
          ? shareScale(track, SHARE_MAX_WIDTH, SHARE_MAX_HEIGHT)
          : shareScale(track, SHARE_VOICE_WIDTH, SHARE_VOICE_HEIGHT),
        degradationPreference: isFocused ? 'balanced' : 'maintain-resolution',
      };
    },
    [],
  );

  /**
   * Bring one connection's senders in line with the plan. Queued behind whatever that connection is
   * already doing (see `syncing`) and cheap to call often.
   */
  const syncConnection = useCallback(
    (connection: Connection): Promise<void> => {
      const run = async () => {
        if (connection.pc.signalingState === 'closed') return;

        const senders = [
          ['audio', connection.audioSender, outboundAudio()],
          ['video', connection.videoSender, outboundVideo(connection)],
        ] as const;

        for (const [, sender, track] of senders) {
          if (sender && sender.track !== track) {
            await sender.replaceTrack(track).catch(() => undefined);
          }
        }

        for (const [kind, sender, track] of senders) {
          if (!sender || !track) {
            connection.tuned[kind] = null;
            continue;
          }
          const plan = planFor(connection, kind, track);
          const signature = `${track.id}|${JSON.stringify(plan)}`;
          if (connection.tuned[kind] === signature) continue;
          connection.tuned[kind] = (await applyPlan(sender, plan)) ? signature : null;
        }
      };

      connection.syncing = connection.syncing.then(run).catch(() => undefined);
      return connection.syncing;
    },
    [outboundAudio, outboundVideo, planFor],
  );

  /**
   * Bring every connection in line, after anything that changes the plan. The two pieces that are
   * not per connection are settled first: whether the voice-and-screen mix is needed.
   */
  const syncAll = useCallback(async () => {
    const microphone = localRef.current?.getAudioTracks()[0] ?? null;
    const isVoiceLive = microphone?.enabled === true;
    const sound = screenAudio.current;

    if (sound && microphone && isVoiceLive && !screenMix.current) {
      try {
        screenMix.current = new ScreenAudioMix(sound, microphone);
      } catch {
        // Firefox refuses a 48kHz mix of a mic at another rate: retry at the device's own rate,
        // and failing that the voice is sent alone.
        try {
          screenMix.current = new ScreenAudioMix(sound, microphone, null);
        } catch {
          screenMix.current = null;
        }
      }
    }
    screenMix.current?.setRunning(Boolean(sound && isVoiceLive));

    const screen = screenTrack.current;
    if (screen) {
      // `detail` is how a browser treats a screen by default: resolution first, frames dropped
      // freely. `motion` is how it treats a camera.
      const hint = isVoiceLive ? 'detail' : 'motion';
      if (screen.contentHint !== hint) screen.contentHint = hint;
    }

    await Promise.all([...connections.current.values()].map(syncConnection));
  }, [syncConnection]);

  /**
   * Tear one connection down. `keepSeat` is what separates "this person left" from "this connection
   * has to be rebuilt".
   */
  const closeConnection = useCallback((participantId: string, keepSeat = false) => {
    const connection = connections.current.get(participantId);
    if (!connection) return;

    if (connection.graceTimer !== undefined) window.clearTimeout(connection.graceTimer);
    connection.pc.onicecandidate = null;
    connection.pc.ontrack = null;
    connection.pc.onconnectionstatechange = null;
    connection.pc.close();
    connections.current.delete(participantId);

    if (keepSeat) return;

    detector.current?.remove(participantId);
    setQuality((current) => {
      if (!current[participantId]) return current;
      const next = { ...current };
      delete next[participantId];
      return next;
    });
    setPeers((current) => current.filter((peer) => peer.participantId !== participantId));
  }, []);

  /**
   * Let a screen share buffer a little before it is played, and nothing else. `playoutDelayHint`
   * asks the browser to hold received frames for a moment before rendering them.
   */
  const applyPlayoutHint = useCallback((participantId: string) => {
    const connection = connections.current.get(participantId);
    if (!connection) return;

    const sharing =
      peersRef.current.find((peer) => peer.participantId === participantId)?.flags.sharing ??
      false;

    for (const receiver of connection.pc.getReceivers()) {
      if (receiver.track?.kind !== 'video') continue;
      (receiver as RTCRtpReceiver & { playoutDelayHint?: number }).playoutDelayHint = sharing
        ? 0.4
        : 0;
    }
  }, []);

  /**
   * The answerer's half of the transceiver pair: take the ones the offer made. Applying the
   * caller's offer creates one audio and one video transceiver here, `recvonly`.
   */
  const adoptOfferedTransceivers = useCallback(
    async (connection: Connection) => {
      if (connection.audioSender && connection.videoSender) return;

      const label = labelOf(outboundLabel);

      for (const transceiver of connection.pc.getTransceivers()) {
        const kind = transceiver.receiver.track.kind;
        const isFree =
          (kind === 'audio' && !connection.audioSender) ||
          (kind === 'video' && !connection.videoSender);
        if (!isFree || transceiver.currentDirection === 'stopped') continue;

        transceiver.direction = 'sendrecv';
        // Labels this side's tracks, for the same reason the caller passes `streams` — see
        // `openConnection`.
        transceiver.sender.setStreams?.(label);

        if (kind === 'audio') connection.audioSender = transceiver.sender;
        else connection.videoSender = transceiver.sender;
      }

      await syncConnection(connection);
    },
    [syncConnection],
  );

  /**
   * Build the connection to one peer. `isCaller` decides who offers and comes from the arrival
   * numbers — see the hook's note.
   */
  const openConnection = useCallback(
    async (peer: LiveSeat, isCaller: boolean, relayOnly = false) => {
      if (connections.current.has(peer.participantId)) return;

      const pc = new RTCPeerConnection({
        iceServers: iceRef.current,
        // A small pool, warmed before the offer is written. Gathering candidates takes a round trip
        // to every STUN server.
        iceCandidatePoolSize: 2,
        // Relay-only, on the second attempt and never on the first. This is the last rung of the
        // recovery ladder — see `recover`.
        ...(relayOnly ? { iceTransportPolicy: 'relay' as const } : {}),
      });

      // Only the caller builds transceivers up front. Both sides used to, and that was why calls
      // were one-way: when an offer is applied.
      const label = labelOf(outboundLabel);
      const audioTx = isCaller
        ? pc.addTransceiver('audio', { direction: 'sendrecv', streams: [label] })
        : null;
      const videoTx = isCaller
        ? pc.addTransceiver('video', { direction: 'sendrecv', streams: [label] })
        : null;

      const connection: Connection = {
        pc,
        audioSender: audioTx?.sender ?? null,
        videoSender: videoTx?.sender ?? null,
        pending: [],
        remote: null,
        peer,
        isCaller,
        relayOnly,
        restarted: false,
        graceTimer: undefined,
        wantsVideo: true,
        lastStats: null,
        syncing: Promise.resolve(),
        tuned: { audio: null, video: null },
        cameraHeld: false,
        uplink: { strained: false, run: 0, retryAt: 0, backoffMs: RETRY_BASE_MS, resumedAt: 0 },
      };
      connections.current.set(peer.participantId, connection);

      // A new connection starts with both cameras flowing, whatever the old one to this peer had
      // held back (see `recover`).
      setPeers((current) =>
        current.some((entry) => entry.participantId === peer.participantId && entry.videoHeld)
          ? current.map((entry) =>
              entry.participantId === peer.participantId ? { ...entry, videoHeld: false } : entry,
            )
          : current,
      );

      if (isCaller) await syncConnection(connection);

      pc.onicecandidate = (event) => {
        if (!event.candidate || !roomId) return;
        void emitWithAck('live:signal', {
          roomId,
          to: peer.participantId,
          data: { candidate: event.candidate.toJSON() },
        }).catch(() => undefined);
      };

      pc.ontrack = (event) => {
        // The stream the browser assembled, where there is one. `event.streams[0]` holds both the
        // audio and the video of this peer as one object.
        let [stream] = event.streams;
        if (!stream) {
          const kept = (connection.remote?.getTracks() ?? []).filter(
            (track) => track.kind !== event.track.kind,
          );
          stream = new MediaStream([...kept, event.track]);
          connection.remote = stream;
        }

        patchPeer(peer.participantId, { stream });
        detector.current?.add(peer.participantId, stream);
        // The peer may already have been sharing when this connection formed,
        // in which case the hint applies from the first frame.
        applyPlayoutHint(peer.participantId);
      };

      pc.onconnectionstatechange = () => {
        const connection = connections.current.get(peer.participantId);
        if (!connection) return;

        // The recovery ladder. Three rungs, each tried once.
        if (pc.connectionState === 'connected') {
          if (connection.graceTimer !== undefined) {
            window.clearTimeout(connection.graceTimer);
            connection.graceTimer = undefined;
          }
          connection.restarted = false;
          return;
        }

        if (pc.connectionState === 'disconnected') {
          if (connection.graceTimer !== undefined) return;
          connection.graceTimer = window.setTimeout(() => {
            connection.graceTimer = undefined;
            // Still not back. Treated exactly as `failed`, because after five
            // seconds of silence that is what it is.
            if (connections.current.get(peer.participantId) === connection) {
              recoverRef.current(peer.participantId);
            }
          }, DISCONNECT_GRACE_MS);
          return;
        }

        if (pc.connectionState === 'failed') recoverRef.current(peer.participantId);
      };

      if (!isCaller) {
        const early = earlySignals.current.get(peer.participantId);
        earlySignals.current.delete(peer.participantId);
        for (const signal of early ?? []) await handleSignalRef.current(signal);
        return;
      }

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (!roomId) return;
      await emitWithAck('live:signal', {
        roomId,
        to: peer.participantId,
        data: { description: pc.localDescription?.toJSON() },
      }).catch(() => undefined);
    },
    [applyPlayoutHint, patchPeer, roomId, syncConnection],
  );

  /** One rung down the ladder for a connection that has stopped working. */
  const recover = useCallback(
    (participantId: string) => {
      const connection = connections.current.get(participantId);
      if (!connection) return;

      const { peer, isCaller, relayOnly, restarted } = connection;

      if (!restarted) {
        connection.restarted = true;
        try {
          // Re-gather on the connection that already exists. Only the offering side may restart:
          // `restartIce()` marks the connection as needing negotiation.
          if (isCaller) {
            connection.pc.restartIce();
            void connection.pc
              .createOffer({ iceRestart: true })
              .then(async (offer) => {
                await connection.pc.setLocalDescription(offer);
                if (!roomId) return;
                await emitWithAck('live:signal', {
                  roomId,
                  to: participantId,
                  data: { description: connection.pc.localDescription?.toJSON() },
                });
              })
              .catch(() => undefined);
            return;
          }
        } catch {
          // `restartIce` throws on a closed connection, which is a race with the peer having left.
          // Falls through to the rebuild below, which finds no seat and does nothing.
        }
      }

      // The restart is spent, or this side could not make one. Rebuild. `keepSeat`, so the tile
      // stays on the stage while the new connection forms — the person has not left.
      if (relayOnly) {
        // Said out loud, once, because it is the one failure somebody can do something about.
        toast.warning(translate('live.mediaBlocked', { name: peer.user.displayName }));
        closeConnection(participantId);
        return;
      }

      closeConnection(participantId, true);
      void openConnection(peer, isCaller, true);
    },
    [closeConnection, openConnection, roomId],
  );

  // Read through a ref, because `openConnection` installs the handler that calls `recover`, and
  // `recover` calls `openConnection`.
  const recoverRef = useRef(recover);
  recoverRef.current = recover;

  // --- Telling a peer whether we can see them ----------------------------------

  /**
   * "Stop encoding your video for me" / "start again". In a mesh the sender pays for every stream —
   * one encoder and one uplink per peer.
   */
  const setVideoInterest = useCallback(
    (participantId: string, wanted: boolean) => {
      if (!roomId) return;
      void emitWithAck('live:video-interest', {
        roomId,
        to: participantId,
        wanted,
      }).catch(() => undefined);
    },
    [roomId],
  );

  // --- Holding the camera back for the voice -----------------------------------

  /**
   * Take the camera out of one peer's sender, or put it back, and say so. The peer is told over
   * `live:signal`, the addressed channel the negotiation already uses, because a hold is per pair.
   */
  const setHold = useCallback(
    (connection: Connection, held: boolean) => {
      if (connection.cameraHeld === held) return;
      connection.cameraHeld = held;
      void syncConnection(connection);
      if (!roomId) return;
      void emitWithAck('live:signal', {
        roomId,
        to: connection.peer.participantId,
        data: { videoHeld: held },
      }).catch(() => undefined);
    },
    [roomId, syncConnection],
  );

  /**
   * Decide, from one stats pass, whether this peer should get the camera. The camera is the last
   * priority.
   */
  const watchUplink = useCallback(
    (
      connection: Connection,
      sample: {
        audioLoss: number | null;
        videoLoss: number | null;
        rtt: number | null;
        outgoingBitrate: number | null;
      },
    ) => {
      const { uplink } = connection;
      const now = Date.now();

      uplink.strained =
        (sample.audioLoss ?? 0) > STRAIN_AUDIO_LOSS ||
        (sample.videoLoss ?? 0) > STRAIN_VIDEO_LOSS ||
        (sample.rtt ?? 0) > STRAIN_RTT_S ||
        (sample.outgoingBitrate !== null && sample.outgoingBitrate < CAMERA_FLOOR_BPS);

      const isVoiceLive = localRef.current?.getAudioTracks()[0]?.enabled === true;
      const isCameraLive = cameraTrack.current?.enabled === true && !screenTrack.current;
      if (!isVoiceLive || !isCameraLive) {
        uplink.run = 0;
        setHold(connection, false);
        return;
      }

      if (!connection.cameraHeld) {
        // Only a camera actually on the wire can be blamed for the strain.
        uplink.run = uplink.strained && connection.wantsVideo ? uplink.run + 1 : 0;
        if (uplink.run < HOLD_AFTER_SAMPLES) return;

        uplink.run = 0;
        uplink.backoffMs =
          now - uplink.resumedAt < RELAPSE_MS
            ? Math.min(uplink.backoffMs * 2, RETRY_MAX_MS)
            : RETRY_BASE_MS;
        uplink.retryAt = now + uplink.backoffMs;
        setHold(connection, true);
        return;
      }

      const isVoiceClear =
        (sample.audioLoss ?? 0) < CLEAR_AUDIO_LOSS && (sample.rtt ?? 0) < CLEAR_RTT_S;
      if (now >= uplink.retryAt && isVoiceClear) {
        uplink.resumedAt = now;
        setHold(connection, false);
      }
    },
    [setHold],
  );

  // --- Connection quality ------------------------------------------------------

  /**
   * Read every connection's stats and turn four numbers into three words. Every other degradation
   * in this file is silent.
   */
  const pollQuality = useCallback(async () => {
    const next: Record<string, LiveQuality> = {};

    await Promise.all(
      [...connections.current.entries()].map(async ([participantId, connection]) => {
        let report: RTCStatsReport;
        try {
          report = await connection.pc.getStats();
        } catch {
          // A connection closed between the iteration and the call. It has no
          // quality to report and is about to be removed anyway.
          return;
        }

        let packets = 0;
        let lost = 0;
        let jitter = 0;
        let outgoingBitrate: number | null = null;
        let isRelayed = false;
        // Our side of the link, as the peer reports it. See `watchUplink`.
        let audioLoss: number | null = null;
        let videoLoss: number | null = null;
        let rtt: number | null = null;

        report.forEach((entry) => {
          if (entry.type === 'remote-inbound-rtp') {
            if (entry.kind === 'audio') audioLoss = entry.fractionLost ?? null;
            if (entry.kind === 'video') videoLoss = entry.fractionLost ?? null;
          }

          if (entry.type === 'inbound-rtp' && !entry.isRemote) {
            packets += entry.packetsReceived ?? 0;
            lost += entry.packetsLost ?? 0;
            // Audio jitter, not video's, when both are present. Video has its own buffer and a
            // frame arriving late is a frame arriving late.
            if (entry.kind === 'audio') jitter = Math.max(jitter, (entry.jitter ?? 0) * 1000);
          }

          // The pair currently in use, and only that one. A connection accumulates a candidate pair
          // for every route it tried; `nominated` plus `succeeded` is the one carrying media.
          if (entry.type === 'candidate-pair' && entry.state === 'succeeded' && entry.nominated) {
            outgoingBitrate = entry.availableOutgoingBitrate ?? null;
            // From the connectivity checks, so it is there even when no media is.
            rtt = entry.currentRoundTripTime ?? null;
            const local = report.get(entry.localCandidateId);
            const remote = report.get(entry.remoteCandidateId);
            isRelayed =
              local?.candidateType === 'relay' || remote?.candidateType === 'relay';
          }
        });

        const previous = connection.lastStats;
        connection.lastStats = { packets, lost };

        const deltaPackets = previous ? packets - previous.packets : packets;
        const deltaLost = previous ? lost - previous.lost : lost;
        // No traffic in the last interval means no information, not perfect health — a peer who is
        // muted with their camera off sends almost nothing.
        const ratio = deltaPackets > 50 ? Math.max(0, deltaLost) / deltaPackets : 0;

        const level: LiveQualityLevel =
          ratio > 0.08 || jitter > 120
            ? 'bad'
            : ratio > 0.02 || jitter > 50
              ? 'weak'
              : 'good';

        next[participantId] = {
          level,
          loss: ratio,
          jitter,
          outgoingBitrate,
          isRelayed,
        };

        watchUplink(connection, { audioLoss, videoLoss, rtt, outgoingBitrate });
      }),
    );

    // A boolean, so a steady call sets the same value and React bails out.
    setCameraHeld([...connections.current.values()].some((connection) => connection.cameraHeld));
    // And the plan, re-checked on every pass. A share's frame rate follows the uplink, a resized
    // window can need a new scale.
    void syncAll();

    setQuality((current) => {
      const keys = Object.keys(next);
      if (keys.length === Object.keys(current).length) {
        const same = keys.every((key) => {
          const before = current[key];
          const after = next[key];
          return (
            before &&
            before.level === after.level &&
            before.isRelayed === after.isRelayed &&
            // Rounded before comparing, because these are floating-point numbers that will never be
            // equal twice and the interface only draws one decimal of either.
            Math.round(before.loss * 1000) === Math.round(after.loss * 1000) &&
            Math.round(before.jitter) === Math.round(after.jitter)
          );
        });
        if (same) return current;
      }
      return next;
    });
  }, [syncAll, watchUplink]);

  /** One leg of somebody else's negotiation. The queue is the part worth reading twice. */
  const handleSignal = useCallback(
    async (payload: { from: string; data: Record<string, unknown> }) => {
      // Not negotiation: the peer holding their camera back from us, or giving it back.
      if (typeof payload.data.videoHeld === 'boolean') {
        if (connections.current.has(payload.from)) {
          patchPeer(payload.from, { videoHeld: payload.data.videoHeld });
        }
        return;
      }

      const connection = connections.current.get(payload.from);
      if (!connection) {
        // Ahead of our own join acknowledgement. See `earlySignals`.
        const queue = earlySignals.current.get(payload.from) ?? [];
        if (queue.length < 64) queue.push(payload);
        earlySignals.current.set(payload.from, queue);
        return;
      }

      const { pc } = connection;
      const description = payload.data.description as RTCSessionDescriptionInit | undefined;
      const candidate = payload.data.candidate as RTCIceCandidateInit | undefined;

      try {
        if (description) {
          await pc.setRemoteDescription(description);

          // Everything that was waiting for exactly this.
          for (const queued of connection.pending.splice(0)) {
            await pc.addIceCandidate(queued).catch(() => undefined);
          }

          if (description.type === 'offer') {
            // Before the answer is written, or the answer says "recvonly" and
            // this side is never heard. See `adoptOfferedTransceivers`.
            await adoptOfferedTransceivers(connection);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            // The senders have encodings to tune only now that the answer is
            // set; the pass `join` made found none.
            void syncAll();
            if (!roomId) return;
            await emitWithAck('live:signal', {
              roomId,
              to: payload.from,
              data: { description: pc.localDescription?.toJSON() },
            }).catch(() => undefined);
          } else {
            // The caller's half: the answer is what settles the encodings.
            void syncConnection(connection);
          }
          return;
        }

        if (candidate) {
          if (!pc.remoteDescription) connection.pending.push(candidate);
          else await pc.addIceCandidate(candidate).catch(() => undefined);
        }
      } catch {
        // Swallowed on purpose. A rejected description is almost always a peer that has already
        // left, and the browser's own message.
      }
    },
    [adoptOfferedTransceivers, patchPeer, roomId, syncAll, syncConnection],
  );

  /* Read through a ref by `openConnection`, which is defined first — same reason as `recoverRef`. */
  const handleSignalRef = useRef(handleSignal);
  handleSignalRef.current = handleSignal;

  // --- Devices -----------------------------------------------------------------

  /**
   * Ask for the microphone and camera, and carry on without either. One prompt rather than two: a
   * browser asked for audio and then video shows the permission bar twice.
   */
  const acquireDevices = useCallback(async (): Promise<MediaStream | null> => {
    const wanted: MediaStreamConstraints = {
      audio: AUDIO_CONSTRAINTS,
      video: VIDEO_CONSTRAINTS,
    };

    const request = async (constraints: MediaStreamConstraints) =>
      navigator.mediaDevices.getUserMedia(constraints);

    try {
      return await request(wanted);
    } catch {
      try {
        return await request({ audio: AUDIO_CONSTRAINTS, video: false });
      } catch {
        toast.warning(translate('live.noDevices'));
        return null;
      }
    }
  }, []);

  // --- Join and leave ----------------------------------------------------------

  const leave = useCallback(() => {
    leftRef.current = true;

    if (statsTimer.current !== undefined) {
      window.clearInterval(statsTimer.current);
      statsTimer.current = undefined;
    }

    for (const participantId of [...connections.current.keys()]) closeConnection(participantId);

    // Stopped explicitly. Dropping the reference is not enough: a
    // `MediaStreamTrack` keeps the camera light on until something calls this.
    localRef.current?.getTracks().forEach((track) => track.stop());
    screenTrack.current?.stop();
    screenAudio.current?.stop();
    screenMix.current?.close();
    localRef.current = null;
    cameraTrack.current = null;
    screenTrack.current = null;
    screenAudio.current = null;
    screenMix.current = null;
    setScreenPreview(null);
    setSharingAudio(false);
    setCameraHeld(false);

    detector.current?.close();
    detector.current = null;
    earlySignals.current.clear();

    if (roomId) void emitWithAck('live:leave', { roomId }).catch(() => undefined);
    seatedRoom.current = null;

    setLocalStream(null);
    setPeers([]);
    setSelf(null);
    selfRef.current = null;
    setSpeaking(new Set());
    setQuality({});
    setFlags({ micOn: false, camOn: false, sharing: false, handRaised: false });
    setStatus('idle');
  }, [closeConnection, roomId]);

  const join = useCallback(async () => {
    if (!roomId) return;

    leftRef.current = false;
    setError(null);
    setStatus('devices');

    const stream = await acquireDevices();
    if (leftRef.current) {
      stream?.getTracks().forEach((track) => track.stop());
      return;
    }

    // Every track is disabled before anything is negotiated. The browser's permission prompt is
    // consent to be *able* to broadcast, not consent to broadcast.
    if (stream) {
      for (const track of stream.getTracks()) track.enabled = false;
      cameraTrack.current = stream.getVideoTracks()[0] ?? null;
      localRef.current = stream;
      setLocalStream(stream);
    }

    detector.current = new SpeakingDetector(setSpeaking);
    if (stream) detector.current.add('self', stream);

    setStatus('joining');

    try {
      const result = await emitWithAck<LiveJoinResult>('live:join', { roomId });
      // Seated from this moment, whatever happens next — including the reader having already left
      // while the acknowledgement was in flight.
      if (leftRef.current) {
        void emitWithAck('live:leave', { roomId }).catch(() => undefined);
        return;
      }
      seatedRoom.current = roomId;

      setSelf(result.self);
      selfRef.current = result.self;
      setPeers(result.peers.map((peer) => ({ ...peer, stream: null })));

      // The arrival numbers decide who dials whom. Everybody already here has a *lower* number than
      // this client, so this client answers all of them — `isCaller` is false throughout.
      await Promise.all(result.peers.map((peer) => openConnection(peer, false)));
      void syncAll();

      // The stats poll runs for the life of the call, not the life of the panel. Started here
      // rather than in an effect because the thing it measures is the set of connections.
      if (statsTimer.current !== undefined) window.clearInterval(statsTimer.current);
      statsTimer.current = window.setInterval(() => void pollQuality(), STATS_INTERVAL_MS);

      setStatus('live');
    } catch (cause) {
      if (leftRef.current) return;
      const message = cause instanceof Error ? cause.message : translate('live.joinFailed');
      setError(message);
      setStatus('error');
      // The devices were acquired before the refusal was known; without this
      // the camera light stays on after a failed join.
      stream?.getTracks().forEach((track) => track.stop());
      localRef.current = null;
      setLocalStream(null);
    }
  }, [acquireDevices, openConnection, pollQuality, roomId, syncAll]);

  // --- Controls ----------------------------------------------------------------

  /** Push the four tile flags to the room. Throttled by the gateway, not here. */
  const publish = useCallback(
    (next: Partial<LiveFlags>) => {
      // Emitted beside the state update, never inside it. A `setState` updater must be pure: React
      // is free to call it twice — it does exactly that in StrictMode.
      if (roomId) void emitWithAck('live:state', { roomId, ...next }).catch(() => undefined);
      setFlags((current) => ({ ...current, ...next }));
    },
    [roomId],
  );

  const toggleMic = useCallback(() => {
    const track = localRef.current?.getAudioTracks()[0];
    if (!track) {
      toast.warning(translate('live.noMicrophone'));
      return;
    }
    if (!allowedRef.current.canSpeak) {
      toast.warning(translate('live.askToSpeak'));
      return;
    }

    // `enabled` first, then the sender. The track is never stopped: that would release the
    // microphone.
    track.enabled = !track.enabled;
    publish({ micOn: track.enabled, handRaised: false });
    void syncAll();
  }, [publish, syncAll]);

  const toggleCam = useCallback(() => {
    const track = cameraTrack.current;
    if (!track) {
      toast.warning(translate('live.noCamera'));
      return;
    }
    // Ignored while a screen is being shared: the sender is occupied, and turning the camera "on"
    // would do nothing visible and leave the button lit. `stopShare` is what puts the camera back.
    if (screenTrack.current) return;

    track.enabled = !track.enabled;
    publish({ camOn: track.enabled });
    void syncAll();
  }, [publish, syncAll]);

  /**
   * Stop sending the shared screen's sound, and let go of the mix. Called when the share ends, and
   * on its own if the browser ends the sound before the picture, which it is free to do.
   */
  const dropScreenAudio = useCallback(async () => {
    const sound = screenAudio.current;
    if (!sound) return;

    screenAudio.current = null;
    setSharingAudio(false);
    // The senders move off the mix before it is closed, so nobody is sent a
    // track that has just been stopped.
    await syncAll();

    sound.onended = null;
    sound.stop();
    screenMix.current?.close();
    screenMix.current = null;
  }, [syncAll]);

  /**
   * Share a screen, by swapping it into the sender the camera was using. This is the payoff for
   * building the transceivers up front: no new track, no `negotiationneeded`.
   */
  const startShare = useCallback(async () => {
    if (!allowedRef.current.canPresent) {
      toast.warning(translate('live.askToPresent'));
      return;
    }

    let display: MediaStream;
    try {
      display = await navigator.mediaDevices.getDisplayMedia(DISPLAY_MEDIA_OPTIONS);
    } catch (cause) {
      // Dismissing the picker is the ordinary way to change your mind about which window to show,
      // and says nothing.
      const isOptionsProblem =
        cause instanceof TypeError ||
        (cause instanceof DOMException && cause.name === 'OverconstrainedError');
      if (!isOptionsProblem) return;
      try {
        display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      } catch {
        return;
      }
    }

    const track = display.getVideoTracks()[0];
    if (!track) {
      display.getTracks().forEach((each) => each.stop());
      return;
    }
    const sound = display.getAudioTracks()[0] ?? null;

    screenTrack.current = track;
    screenAudio.current = sound;
    setSharingAudio(sound !== null);
    // The presenter's own tile shows what is going out, and only the picture:
    // the tile is muted anyway, and the sound is not the tile's to play.
    setScreenPreview(new MediaStream([track]));

    // The camera stops capturing for the length of the share, not just sending. It could not be
    // sent anyway (there is one video sender and the screen is in it).
    const camera = cameraTrack.current;
    if (camera) camera.enabled = false;

    await syncAll();

    // The browser's own "stop sharing" bar ends the share too. Without this the bar stops the track
    // and every peer is left looking at a frozen final frame.
    track.onended = () => void stopShare();
    if (sound) sound.onended = () => void dropScreenAudio();

    publish({ sharing: true, camOn: false });
    // `stopShare` is defined below and is stable; referencing it here would
    // need a forward declaration for no benefit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropScreenAudio, publish, syncAll]);

  const stopShare = useCallback(async () => {
    const track = screenTrack.current;
    if (!track) return;

    track.onended = null;
    track.stop();
    screenTrack.current = null;
    setScreenPreview(null);

    // Back to the camera, or to nothing if there never was one. Its `enabled` is false, so the
    // peers see the tile go dark rather than the camera come on unannounced.
    const camera = cameraTrack.current;
    if (camera) camera.enabled = false;
    await dropScreenAudio();
    await syncAll();

    publish({ sharing: false, camOn: false });
  }, [dropScreenAudio, publish, syncAll]);

  const raiseHand = useCallback(() => {
    if (!roomId) return;
    void emitWithAck('live:request-talk', { roomId }).catch(() => undefined);
    setFlags((current) => ({ ...current, handRaised: true }));
  }, [roomId]);

  // --- The socket, while the call is up ----------------------------------------

  // Attached for the life of the hook, not gated on the call being up. It used to wait for `status`
  // to reach `joining`, which opened a race it lost about one join in five on a fast connection.
  useEffect(() => {
    const socket = getSocket();

    const onPeerJoined = ({ peer }: { peer: LiveSeat }) => {
      setPeers((current) => {
        if (current.some((entry) => entry.participantId === peer.participantId)) return current;
        return [...current, { ...peer, stream: null }];
      });

      // The arrival rule, from this side. The newcomer's number is higher than ours by
      // construction, so we are the caller. The newcomer runs the other branch for us and waits.
      const mine = selfRef.current?.seq ?? 0;
      void openConnection(peer, mine < peer.seq).then(() => syncAll());
    };

    const onPeerLeft = ({ participantId }: { participantId: string }) => {
      earlySignals.current.delete(participantId);
      closeConnection(participantId);
      void syncAll();
    };

    const onPeerState = ({
      participantId,
      flags: peerFlags,
    }: {
      participantId: string;
      flags: LiveFlags;
    }) => {
      patchPeer(participantId, { flags: peerFlags });
      // A share starting or stopping is the only thing that changes whether this peer's video
      // should be buffered — see `applyPlayoutHint`.
      queueMicrotask(() => applyPlayoutHint(participantId));
    };

    const onSignal = (payload: { from: string; data: Record<string, unknown> }) =>
      void handleSignal(payload);

    /**
     * A peer has stopped (or resumed) looking at our tile — see `setVideoInterest` for the other
     * half.
     */
    const onVideoInterest = ({ from, wanted }: { from: string; wanted: boolean }) => {
      const connection = connections.current.get(from);
      if (!connection || connection.wantsVideo === wanted) return;

      connection.wantsVideo = wanted;
      // The track goes in or out, and a track put back is tuned to the plan
      // on the same pass. See `outboundVideo`.
      void syncConnection(connection);
    };

    /** A moderator changed what this client may do, mid-call. */
    const onPermissions = (payload: {
      canSpeak: boolean;
      canPresent: boolean;
      isModerator: boolean;
    }) => {
      setSelf((current) => (current ? { ...current, ...payload } : current));
      selfRef.current = selfRef.current ? { ...selfRef.current, ...payload } : selfRef.current;

      // Silenced mid-sentence, honoured immediately. The gateway has already stopped broadcasting
      // this client's `micOn` to the room.
      if (!payload.canSpeak) {
        const track = localRef.current?.getAudioTracks()[0];
        if (track) track.enabled = false;
        setFlags((current) => ({ ...current, micOn: false }));
        void syncAll();
        toast.info(translate('live.muteByModerator'));
      }
      if (!payload.canPresent && screenTrack.current) void stopShare();
    };

    const onParticipantPermissions = (payload: {
      userId: string;
      canSpeak: boolean;
      canPresent: boolean;
      isModerator: boolean;
    }) =>
      setPeers((current) =>
        current.map((peer) => (peer.userId === payload.userId ? { ...peer, ...payload } : peer)),
      );

    const onEnd = () => {
      setStatus('ended');
      onEnded?.();
      leave();
    };

    const onDisplaced = () => {
      toast.info(translate('live.displaced'));
      leave();
    };

    socket.on('live:peer-joined', onPeerJoined);
    socket.on('live:peer-left', onPeerLeft);
    socket.on('live:peer-state', onPeerState);
    socket.on('live:signal', onSignal);
    socket.on('live:video-interest', onVideoInterest);
    socket.on('live:permissions', onPermissions);
    socket.on('live:participant-permissions', onParticipantPermissions);
    socket.on('live:room-ended', onEnd);
    socket.on('live:displaced', onDisplaced);

    return () => {
      socket.off('live:peer-joined', onPeerJoined);
      socket.off('live:peer-left', onPeerLeft);
      socket.off('live:peer-state', onPeerState);
      socket.off('live:video-interest', onVideoInterest);
      socket.off('live:signal', onSignal);
      socket.off('live:permissions', onPermissions);
      socket.off('live:participant-permissions', onParticipantPermissions);
      socket.off('live:room-ended', onEnd);
      socket.off('live:displaced', onDisplaced);
    };
  }, [
    applyPlayoutHint,
    closeConnection,
    handleSignal,
    leave,
    onEnded,
    openConnection,
    patchPeer,
    stopShare,
    syncAll,
    syncConnection,
  ]);

  // Leaving when the component goes, and only then. The empty dependency list is deliberate and is
  // the one place in this hook where the lint rule is wrong.
  useEffect(
    () => () => {
      leftRef.current = true;
      // Goodbye to the room, if nobody has said it yet. See `seatedRoom`.
      const seated = seatedRoom.current;
      seatedRoom.current = null;
      if (seated) void emitWithAck('live:leave', { roomId: seated }).catch(() => undefined);
      if (statsTimer.current !== undefined) window.clearInterval(statsTimer.current);
      for (const participantId of [...connections.current.keys()]) {
        const connection = connections.current.get(participantId);
        // The grace timer outlives the connection it belongs to unless it is cleared here: it is a
        // `setTimeout` holding a closure over a `RTCPeerConnection`.
        if (connection?.graceTimer !== undefined) window.clearTimeout(connection.graceTimer);
        connection?.pc.close();
      }
      connections.current.clear();
      localRef.current?.getTracks().forEach((track) => track.stop());
      screenTrack.current?.stop();
      screenAudio.current?.stop();
      screenMix.current?.close();
      detector.current?.close();
    },
    [],
  );

  /** Everybody on the call, this client included, in arrival order. */
  const roster = useMemo(() => {
    // While sharing, the local tile is the screen — see `screenPreview`.
    const ownStream = screenPreview ?? localStream;
    // Always a fresh array. `sort` works in place, and without a seat of our own `entries` used to
    // *be* `peers` — so this sorted React state directly.
    const entries = self
      ? [{ ...self, stream: ownStream, flags, videoHeld: cameraHeld }, ...peers]
      : [...peers];
    return entries.sort((a, b) => a.seq - b.seq);
  }, [cameraHeld, flags, localStream, peers, screenPreview, self]);

  return {
    status,
    error,
    self,
    peers,
    roster,
    localStream,
    flags,
    /** Participant ids currently making noise. `self` is the local tile's id. */
    speaking,
    /** How each connection is doing, keyed by participant id. See `pollQuality`. */
    quality,
    /**
     * Whether the camera is on but held back from somebody to keep the voice
     * clear. See `watchUplink`.
     */
    cameraHeld,
    /** Whether the screen being shared is carrying its sound. */
    sharingAudio,
    join,
    leave,
    toggleMic,
    toggleCam,
    startShare,
    stopShare,
    raiseHand,
    /**
     * Tell one peer whether we can currently see their video. Driven by whatever is watching the
     * tiles — see `LiveStage`.
     */
    setVideoInterest,
  };
};
