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
 * Where a call is, from the button being pressed to the first voice.
 *
 * `devices` is a state rather than a boolean because it is the step that most
 * often stalls: the browser's permission prompt sits in front of it and a user
 * who has not noticed it needs to be told what is waiting for them.
 */
export type LiveCallStatus = 'idle' | 'devices' | 'joining' | 'live' | 'ended' | 'error';

/** One peer, as the stage draws it: who they are, plus what we are receiving. */
export interface LivePeer extends LiveSeat {
  stream: MediaStream | null;
  /**
   * Whether this person's camera is on but held back, because their uplink
   * cannot carry it and their voice at once. See `watchUplink`.
   *
   * On somebody else's tile it means their camera is paused *for us*, as they
   * told us over `live:signal`, and the tile shows their avatar rather than
   * the frozen last frame. On your own tile it means it is paused for at least
   * one person in the room.
   */
  videoHeld?: boolean;
}

/**
 * What the outbound video is allowed to cost, by how many people are in the
 * room.
 *
 * ## Why this is capped at all
 *
 * A mesh sends one copy of your camera to every other participant, so an
 * uncapped encoder negotiating 2.5 Mbps with seven peers asks for 17 Mbps of
 * upload from a laptop on hotel wifi. The result is not a slightly worse call:
 * the encoder and the network fight, packets are dropped across *all* seven
 * connections at once, and everybody's video stutters because of one person's
 * connection.
 *
 * Browsers do adapt on their own, but they adapt per connection and slowly,
 * and each connection's estimate is made in ignorance of the other six. The
 * ceiling is the piece of information only this client has — how many streams
 * it is sending — so it is the one thing worth saying out loud.
 *
 * ## Why the numbers
 *
 * 640x360 at 24fps is comfortable at about 400 kbps in VP8, usable at 250, and
 * blocky below 150. The tiers keep total upload near 1.5 Mbps at every room
 * size, which is what an ordinary domestic connection sustains without
 * starving everything else on it.
 */
const videoCeiling = (peerCount: number): number => {
  if (peerCount <= 1) return 700_000;
  if (peerCount <= 3) return 400_000;
  if (peerCount <= 5) return 250_000;
  return 150_000;
};

/**
 * And what a *screen* is allowed to cost, which is not the same thing at all.
 *
 * ## Why the camera's tiers were the wrong ceiling for this
 *
 * They were shared until now, and it meant that in a room of six the thing
 * people had actually come to look at — somebody's editor, somebody's design,
 * somebody's spreadsheet — was being encoded at 150 kbps. A face at 150 kbps
 * is a slightly soft face and the conversation is unaffected. Text at 150 kbps
 * is not text.
 *
 * The other half of the argument is that a screen share is *cheap* most of the
 * time. A camera sends 24 changing frames a second forever; a slide sends one
 * frame and then almost nothing until somebody scrolls. The ceiling is a cap
 * rather than a target, so raising it costs nothing on the still content that
 * makes up most of a share, and buys legibility on the moving content where it
 * matters.
 *
 * It still drops with the room, because a mesh still sends one copy per peer
 * and the uplink is still the scarce thing. It just drops from a height where
 * text survives.
 *
 * ## Why there is only ever one of these in flight
 *
 * A share occupies the camera's own sender (see `startShare`), so a client is
 * never sending both. That is what makes two ceilings safe rather than
 * additive: whichever track is in the sender picks the table, and the total
 * uplink is bounded by the larger of the two rather than by their sum.
 */
const screenCeiling = (peerCount: number): number => {
  if (peerCount <= 1) return 2_500_000;
  if (peerCount <= 3) return 1_500_000;
  if (peerCount <= 5) return 900_000;
  return 600_000;
};

/**
 * And what the microphone costs, which does not vary with the room.
 *
 * Opus is transparent for speech at 32 kbps and the difference between seven
 * of those and seven of anything cheaper is not worth the words being harder
 * to make out. Audio is the part of a call that must never degrade — a
 * conversation survives frozen video and does not survive broken sound.
 */
const AUDIO_BITRATE = 32_000;

/**
 * What the audio sender may use while it carries a shared screen's sound.
 *
 * Speech is a narrow, forgiving signal and music is neither: at 32 kbps a
 * soundtrack comes out underwater. 96 kbps is where mono Opus stops being
 * the thing anybody notices, and it is still a fraction of the picture it
 * arrives with. Back to `AUDIO_BITRATE` the moment the share ends.
 */
const SCREEN_AUDIO_BITRATE = 96_000;

/*
 * How many frames a second a shared screen is sent at, by what else the
 * presenter is doing.
 *
 * `FOCUSED` is a presenter who is muted, with the camera necessarily off (a
 * share occupies the camera's sender). The screen is the only thing going
 * out, so it gets the capture's full rate and its sender is told to keep the
 * motion smooth. `BESIDE_VOICE` is somebody talking over their share: the
 * voice comes first, so the screen steps down to 480p (see
 * `SHARE_VOICE_WIDTH`) and keeps a film's frame rate. `STRAINED` is the same
 * with an uplink that is already losing packets, and the one case allowed
 * under 24, because every frame not sent is room for the voice. See
 * `planFor`.
 */
const SHARE_FPS_FOCUSED = 27;
const SHARE_FPS_BESIDE_VOICE = 24;
const SHARE_FPS_STRAINED = 12;

/** The largest picture a share is sent at. See `DISPLAY_MEDIA_OPTIONS`. */
const SHARE_MAX_WIDTH = 1280;
const SHARE_MAX_HEIGHT = 720;

/**
 * And the largest while the presenter's microphone is on.
 *
 * 480p is what leaves the voice room: it is under half the pixels of 720p,
 * so the same ceiling buys the encoder far more bits per pixel and the frame
 * rate holds at 24 without the screen crowding the uplink the voice is on.
 */
const SHARE_VOICE_WIDTH = 854;
const SHARE_VOICE_HEIGHT = 480;

/*
 * When an uplink counts as struggling. See `watchUplink`.
 *
 * Loss is what the *peer* reports receiving from us (RTCP receiver reports),
 * so it measures our uplink and not theirs. 5% on the voice is where it starts
 * to sound clipped; video tolerates twice that before it is worse than no
 * video. Half a second of round trip is well past any route that is merely
 * long, relays included. 100 kbps is below the smallest camera tier the room
 * ever asks for, so a link estimated under it cannot carry a picture at all.
 */
const STRAIN_AUDIO_LOSS = 0.05;
const STRAIN_VIDEO_LOSS = 0.1;
const STRAIN_RTT_S = 0.5;
const CAMERA_FLOOR_BPS = 100_000;

/** And when a held camera may be tried again: the voice has to be clean. */
const CLEAR_AUDIO_LOSS = 0.02;
const CLEAR_RTT_S = 0.35;

/** Consecutive struggling polls before the camera is held back: four seconds. */
const HOLD_AFTER_SAMPLES = 2;

/*
 * How long a held camera waits before it is tried again.
 *
 * The congestion controller cannot tell us the link has recovered while the
 * camera is off it, since there is no video left to measure with, so the
 * only way to find out is to try. Ten seconds first; each time the camera
 * trips again within `RELAPSE_MS` of coming back, the wait doubles, up to a
 * minute, so a link that genuinely cannot carry video is not made to prove it
 * every ten seconds with a burst of frozen frames.
 */
const RETRY_BASE_MS = 10_000;
const RETRY_MAX_MS = 60_000;
const RELAPSE_MS = 20_000;

/**
 * What the camera is asked for.
 *
 * `ideal`, never `exact`: a constraint a device cannot meet with `exact` makes
 * `getUserMedia` throw, which would turn "your webcam is unusual" into "you
 * cannot join the call". 640x360 is also what the bitrate tiers above are
 * calculated against — asking for 1080p and then capping it to 250 kbps is how
 * you get a blurry call that also costs more to encode.
 */
const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 640 },
  height: { ideal: 360 },
  frameRate: { ideal: 24, max: 30 },
};

/**
 * And the microphone, with the three processors that make a laptop usable.
 *
 * Every one of these is on by default in every browser that implements it;
 * they are named explicitly because the defaults are not guaranteed and a call
 * without echo cancellation is unusable the moment one person is on speakers.
 */
const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

/** Falls back to a public STUN server if the API could not be reached. */
const FALLBACK_ICE: IceServerConfig[] = [{ urls: 'stun:stun.l.google.com:19302' }];

/**
 * How long a `disconnected` connection is given to sort itself out.
 *
 * ICE reports `disconnected` when its consent checks go quiet, which happens
 * constantly and recovers on its own far more often than not — a wifi
 * handover, a tunnel, a lift. Five seconds is comfortably longer than any of
 * those and comfortably shorter than somebody's patience.
 */
const DISCONNECT_GRACE_MS = 5_000;

/** How often every connection's stats are read. See `pollQuality`. */
const STATS_INTERVAL_MS = 2_000;

/** The outbound label stream, made on first use. See `outboundLabel`. */
const labelOf = (ref: { current: MediaStream | null }): MediaStream =>
  (ref.current ??= new MediaStream());

/**
 * What one sender should be set to. Every field is stated on every plan, so
 * moving from a screen back to the camera can never leave the screen's frame
 * rate behind on the camera.
 */
interface SenderPlan {
  maxBitrate: number;
  /**
   * How the browser splits a connection's bandwidth between its senders, and
   * how the packets are marked for the network. Voice is always `high` and
   * the camera always `low`: the order the call gives things up in.
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
 * Hands a sender its plan.
 *
 * `degradationPreference` is the one field an engine may refuse outright
 * rather than ignore, and one refused field fails the whole call, bitrate
 * ceiling included. So a refusal is retried once without it: the ceiling is
 * the part that protects the room, and it must not be lost to the part that
 * only shapes how the picture degrades.
 *
 * Resolves false when there was nothing to tune yet (a sender that has not
 * negotiated has no encodings) or the engine refused, so the caller knows to
 * try again on its next pass.
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
  /**
   * Candidates that arrived before there was a remote description to attach
   * them to. See `handleSignal` — this queue is the single most common source
   * of "it works on my machine" in a mesh.
   */
  pending: RTCIceCandidateInit[];
  /**
   * What this peer is sending us, assembled by hand.
   *
   * Only used when the far side's sender carried no stream id (`a=msid:-`),
   * in which case `ontrack` delivers a bare track with `event.streams` empty.
   * See `ontrack`.
   */
  remote: MediaStream | null;
  /**
   * The seat this connection is to, kept so the recovery ladder can rebuild
   * it without the roster.
   *
   * `openConnection` is handed a seat; `closeConnection` used to throw it
   * away, which is why a failed connection could only ever be torn down. See
   * `recover`.
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
   * Whether this peer currently wants our video.
   *
   * True until they say otherwise — a connection starts sending, and the
   * viewer's observer corrects it within a frame if the tile is not on screen.
   * Failing towards "keep sending" is the right direction: the cost of being
   * wrong is some wasted uplink, where the other way round it is a frozen
   * participant.
   */
  wantsVideo: boolean;
  /**
   * The last stats sample, so the next one can be turned into a rate.
   *
   * `getStats` reports cumulative counters — packets received, packets lost —
   * and a loss *ratio* computed from the totals is the average since the call
   * began, which by the tenth minute cannot move however bad things get. The
   * useful number is the ratio over the last interval, and that needs the
   * previous reading.
   */
  lastStats: { packets: number; lost: number } | null;
  /**
   * Every track swap and parameter change on this connection, one at a time.
   *
   * `getParameters` and `setParameters` are a pair that must not interleave
   * with another pair on the same sender, and a mute, a share and a stats
   * pass can all want to touch the senders within the same few milliseconds.
   * Chaining them here is what lets every caller just ask for a sync.
   */
  syncing: Promise<void>;
  /**
   * What each sender was last successfully set to, as a signature of its plan
   * and track. A pass whose plan has not changed costs a string comparison
   * and no calls into the engine. See `syncConnection`.
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
 * One live call, as a hook.
 *
 * ## The shape of the thing
 *
 * Every participant holds a direct `RTCPeerConnection` to every other
 * participant — a full mesh. Nothing but signalling passes through the API,
 * which is what makes the feature affordable (see the API's `LiveGateway`) and
 * also what bounds it: `n - 1` outbound streams each, so the room is capped.
 *
 * ## Two transceivers, created once, never renegotiated
 *
 * This is the design decision that matters most for how the call *feels*, so
 * it is worth stating plainly. Every connection carries exactly one audio and
 * one video transceiver, whether or not this client has a camera. The caller
 * creates them before its offer; the answerer adopts the pair that offer
 * creates on its side (see `adoptOfferedTransceivers` — building its own was
 * the bug that made calls one-way). Everything afterwards is `replaceTrack`:
 *
 *   - turning the camera on swaps a track into a sender that already exists;
 *   - sharing a screen swaps the screen track into the *same* sender, and
 *     its sound into the microphone's (see `ScreenAudioMix`);
 *   - muting swaps the microphone out, and unmuting swaps it back in;
 *   - stopping any of them swaps back to null.
 *
 * What goes into which sender, and at what cost, is decided in one place:
 * see "The media plan" below.
 *
 * `replaceTrack` does not renegotiate. The alternative — `addTrack` when you
 * unmute, `removeTrack` when you stop — fires `negotiationneeded` on every
 * one of those actions, which in a mesh is seven simultaneous offer/answer
 * exchanges every time somebody shares their screen, with seven chances to
 * glare. Here the SDP is exchanged once per pair and never again for the life
 * of the call.
 *
 * ## Who offers, and why there is no glare
 *
 * The gateway stamps every seat with an arrival number, and **the lower number
 * offers**. That is the whole collision-avoidance protocol: arrival order is
 * total, both sides know it before either speaks, and it never ties — so
 * exactly one offer exists per pair and there is nothing to roll back. It is
 * the cheap half of "perfect negotiation" and it works here because the only
 * thing that would ever trigger a renegotiation has been designed out above.
 *
 * A reconnecting peer gets a *new*, higher number, so the peers that stayed
 * put do the offering — which is the right way round, since they are not the
 * ones whose connection just failed.
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
   * What the presenter sees on their own tile while they share.
   *
   * A share swaps the screen into the *peers'* video sender (see
   * `startShare`) and never touches `localStream`, which is the camera. The
   * local tile rendered `localStream` regardless, so the presenter saw their
   * disabled camera — a black tile — for as long as everybody else saw the
   * screen. It was not a device problem; the presenter was simply never shown
   * what they were sending. This is that stream, for the length of the share.
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
   * How each connection is doing, keyed by participant id.
   *
   * State rather than a ref, unusually for this hook, because it is the one
   * derived number the stage actually draws — and it changes twice a second
   * at most. See `pollQuality` for why that rate is safe and how the object
   * identity is kept stable when nothing has moved.
   */
  const [quality, setQuality] = useState<Record<string, LiveQuality>>({});
  /** Whether the camera is held back from anybody. See `watchUplink`. */
  const [cameraHeld, setCameraHeld] = useState(false);
  /** Whether the current share is carrying sound. */
  const [sharingAudio, setSharingAudio] = useState(false);

  /*
   * Everything below lives in refs rather than state, and the rule is simple:
   * if React re-rendering because it changed would be wrong or wasteful, it is
   * a ref. A `RTCPeerConnection` map re-rendering the stage on every ICE
   * candidate would be a hundred renders per join.
   */
  const connections = useRef(new Map<string, Connection>());
  /**
   * The roster, readable from a callback without being a dependency of it.
   *
   * `applyPlayoutHint` needs to know whether a peer is sharing *right now*,
   * and depending on `peers` would rebuild it — and therefore
   * `openConnection`, and therefore the whole socket effect — every time
   * anybody's tile flags changed, which is several times a minute per person
   * in a call of eight. Re-registering the signal handler mid-negotiation is
   * how a peer ends up connected to nobody.
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
   * What this client may do *right now*.
   *
   * The props are what the room row said when the tab last fetched it; the
   * seat is what the gateway says, and a moderator raising somebody mid-call
   * changes the second without touching the first. Reading the props in
   * `toggleMic` was a real bug: somebody handed the microphone was still
   * refused by their own client until they left and rejoined.
   *
   * A ref rather than derived state because the controls are callbacks —
   * recreating them on every permission change would be churn for a value
   * only read at the moment a button is pressed.
   */
  const allowedRef = useRef({ canSpeak, canPresent });
  const detector = useRef<SpeakingDetector | null>(null);
  /**
   * The stream id every outbound sender is labelled with.
   *
   * Never played and never given a track: it exists so the SDP carries an
   * `a=msid` naming one stream for both of this client's tracks. Without it
   * the far side's `ontrack` fires with `event.streams` empty — which the
   * handler used to treat as "nothing to show", so nobody ever heard or saw
   * anybody.
   */
  const outboundLabel = useRef<MediaStream | null>(null);
  /**
   * Signals from a peer this client has no connection to *yet*.
   *
   * The joiner answers everybody already in the room, but it only builds
   * those connections once its own `live:join` is acknowledged — and the
   * peers are told about the joiner at the same moment, so on a fast link an
   * offer can land first. It used to be dropped (`handleSignal` found no
   * connection), leaving that pair silent for the whole call. It is held here
   * and replayed the moment the connection exists.
   */
  const earlySignals = useRef(new Map<string, { from: string; data: Record<string, unknown> }[]>());
  const iceRef = useRef<IceServerConfig[]>(FALLBACK_ICE);
  /** Guards the teardown against a join that is still in flight. */
  const leftRef = useRef(false);
  /**
   * The room the gateway has seated this client in, until it is told
   * otherwise.
   *
   * Set when the join is acknowledged and cleared when `leave` says goodbye.
   * The unmount path reads it, because the component can go without `leave`
   * ever being called — the reader leaving the project, the tab closing the
   * panel — and before this nothing told the room. The seat stayed on the
   * server, every peer kept a connection to nobody until its recovery ladder
   * gave up, and the person was still listed as present.
   */
  const seatedRoom = useRef<string | null>(null);

  /*
   * The newest ICE list, held in a ref so a renewal never re-renders the call.
   *
   * It is read once per `RTCPeerConnection`, at construction, so a list that
   * arrives mid-call changes nothing about the connections already up — which
   * is correct: coturn checks a relay credential when the allocation is made
   * and not again, so an established relay keeps working past its credential's
   * expiry. What the renewal is for is the *next* connection: a peer joining
   * an hour in, and, more importantly, the relay-only rebuild the recovery
   * ladder makes (see `recover`), which is precisely the moment a stale
   * credential would turn a recoverable connection into a lost one.
   */
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

  // -------------------------------------------------------------------------
  // Peer plumbing
  // -------------------------------------------------------------------------

  const patchPeer = useCallback((participantId: string, patch: Partial<LivePeer>) => {
    setPeers((current) =>
      current.map((peer) =>
        peer.participantId === participantId ? { ...peer, ...patch } : peer,
      ),
    );
  }, []);

  // -------------------------------------------------------------------------
  // The media plan: what each sender carries, and what it may cost
  // -------------------------------------------------------------------------

  /*
   * ## Why one plan rather than a handler per button
   *
   * The senders used to be filled in five places (join, mute, camera, share,
   * a peer's interest) and tuned in a sixth, each deciding for itself. That
   * held while there was one question per sender. There are now several, and
   * they interact: whether the voice is live decides whether the screen may
   * run smooth, whether the uplink is struggling decides whether the camera
   * goes at all, and whether the share has sound decides what the audio sender
   * carries and at what bitrate. So every one of those places now changes its
   * own piece of state and asks for a sync, and the answer is worked out here,
   * from everything at once, in priority order:
   *
   *   1. the voice, which is never held back and always goes `high`;
   *   2. the shared screen and its sound;
   *   3. the camera, which is the first thing given up and the last restored.
   *
   * What is not being used is not sent. A muted microphone empties the audio
   * sender, rather than sending fifty packets a second of encoded silence to
   * every peer; with a camera off during a share, that leaves the uplink to
   * the screen alone.
   */

  /** What the audio sender carries. See `ScreenAudioMix` for the three cases. */
  const outboundAudio = useCallback((): MediaStreamTrack | null => {
    const microphone = localRef.current?.getAudioTracks()[0] ?? null;
    const voice = microphone?.enabled ? microphone : null;
    const sound = screenAudio.current;
    if (voice && sound) return screenMix.current?.track ?? voice;
    return voice ?? sound;
  }, []);

  /**
   * What one peer's video sender carries.
   *
   * Nothing, if they have said they cannot see us (`live:video-interest`).
   * The screen, whenever there is one. Otherwise the camera, unless it is
   * held back from this peer to keep the voice clear (`watchUplink`).
   *
   * A camera that is merely switched off stays in the sender, disabled. It
   * costs one black frame a second, and it means the last frame the peer
   * received is black rather than whatever the camera saw before it went off,
   * which is what they would otherwise glimpse the next time it comes on.
   */
  const outboundVideo = useCallback((connection: Connection): MediaStreamTrack | null => {
    if (!connection.wantsVideo) return null;
    if (screenTrack.current) return screenTrack.current;
    if (connection.cameraHeld) return null;
    return cameraTrack.current;
  }, []);

  /**
   * The bitrate ceiling and the rest of each sender's parameters.
   *
   * The ceiling is a function of the room's size (see `videoCeiling`), so
   * somebody joining a call of three has to make the other three send less,
   * and nothing else in WebRTC will tell them to.
   *
   * ## What a share gives up first
   *
   * With the presenter talking, the screen is sent at 480p and 24 fps, and
   * under pressure it sheds frames rather than resolution
   * (`maintain-resolution`): 480p is already the floor for reading, and text
   * below it is unreadable, which is strictly worse than readable at 12 fps.
   * The browser's own default guesses `balanced`, which is right for a face
   * and wrong here.
   *
   * With the presenter muted it is the only thing going out, so it is sent
   * the way they asked for: 27 fps, `balanced`, top priority, and hinted as
   * motion so the encoder stops treating it as a slide.
   *
   * A camera keeps `balanced`. Faces survive being soft and do not survive
   * being slow: a talking head at 8 fps is unsettling in a way a slightly
   * blurry one at 24 is not.
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
   * Bring one connection's senders in line with the plan.
   *
   * Queued behind whatever that connection is already doing (see `syncing`)
   * and cheap to call often: a sender whose track is already right is not
   * touched, and one whose plan has not changed since it was last applied is
   * not tuned. That is what makes it safe to run on every stats pass, which in
   * turn is what corrects a `setParameters` that lost a race with a peer
   * leaving, or a shared window that was resized past 720p.
   *
   * A sender with nothing in it is left untuned. It has nothing to encode, and
   * the plan goes on with the track that fills it.
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
   * Bring every connection in line, after anything that changes the plan.
   *
   * The two pieces that are not per connection are settled first: whether the
   * voice-and-screen mix is needed (built on first use, asleep while unused),
   * and which kind of content the screen's encoder should expect.
   */
  const syncAll = useCallback(async () => {
    const microphone = localRef.current?.getAudioTracks()[0] ?? null;
    const isVoiceLive = microphone?.enabled === true;
    const sound = screenAudio.current;

    if (sound && microphone && isVoiceLive && !screenMix.current) {
      screenMix.current = new ScreenAudioMix(sound, microphone);
    }
    screenMix.current?.setRunning(Boolean(sound && isVoiceLive));

    const screen = screenTrack.current;
    if (screen) {
      /*
       * `detail` is how a browser treats a screen by default: resolution
       * first, frames dropped freely. `motion` is how it treats a camera.
       * A muted presenter asked for smoothness, so the screen is sent as
       * motion for exactly as long as nothing else is going out. Changing it
       * mid-stream reconfigures the encoder in place; nothing renegotiates.
       */
      const hint = isVoiceLive ? 'detail' : 'motion';
      if (screen.contentHint !== hint) screen.contentHint = hint;
    }

    await Promise.all([...connections.current.values()].map(syncConnection));
  }, [syncConnection]);

  /**
   * Tear one connection down.
   *
   * `keepSeat` is what separates "this person left" from "this connection has
   * to be rebuilt". The recovery ladder needs the second: the peer is still in
   * the room, still on the roster, still drawn on the stage — it is only the
   * `RTCPeerConnection` that is being replaced, and removing their tile for
   * the half-second that takes would be a flicker that looks like a drop.
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
   * Let a screen share buffer a little before it is played, and nothing else.
   *
   * ## What the trade is
   *
   * `playoutDelayHint` asks the browser to hold received frames for a moment
   * before rendering them, which gives the jitter buffer room to smooth out an
   * uneven arrival rate. The cost is exactly that: latency, paid in full.
   *
   * For a conversation that is a bad trade and it is not close. 400ms of added
   * delay on speech is the difference between talking over each other and not,
   * and a call where people cannot judge when to speak is a broken call
   * however smooth the video is. So audio is never touched, and neither is a
   * camera — a face is mostly there to be read alongside the voice it belongs
   * to, and desynchronising the two is worse than a stutter.
   *
   * For a screen share it is a good trade and the reasoning inverts. Nobody
   * interacts with a demo on a 400ms timescale; what they do is *read* it, and
   * a scroll that judders is much harder to read than one that is smooth and
   * arrives a third of a second late. The presenter is talking over it, and
   * their voice — which is on the untouched audio path — stays in time with
   * the conversation.
   *
   * ## Why it is applied and removed rather than set once
   *
   * Because the same receiver carries both. A share occupies the camera's
   * sender on the far side, so the video receiver here is a camera one minute
   * and a screen the next, with no renegotiation to hang the decision on. The
   * peer's `sharing` flag is the signal, and it arrives over `live:peer-state`.
   *
   * ## Why nothing here is guarded against it not existing
   *
   * `playoutDelayHint` is not in the WebRTC specification — it is a Chromium
   * extension, and Firefox and Safari ignore the assignment entirely. That is
   * the correct behaviour for a progressive enhancement and the reason this is
   * a plain assignment through a cast rather than a feature test: on the
   * engines that do not have it, writing the property is a no-op on an object
   * nobody else reads.
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
   * The answerer's half of the transceiver pair: take the ones the offer made.
   *
   * Applying the caller's offer creates one audio and one video transceiver
   * here, `recvonly`. Turning those to `sendrecv` and filling their senders —
   * before the answer is written — is what makes the answer say this side
   * sends too. Idempotent: an ICE-restart offer finds both senders already in
   * place and changes nothing.
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
        // Labels this side's tracks, for the same reason the caller passes
        // `streams` — see `openConnection`. Missing on some engines, which the
        // far side's `ontrack` fallback covers.
        transceiver.sender.setStreams?.(label);

        if (kind === 'audio') connection.audioSender = transceiver.sender;
        else connection.videoSender = transceiver.sender;
      }

      await syncConnection(connection);
    },
    [syncConnection],
  );

  /**
   * Build the connection to one peer.
   *
   * `isCaller` decides who offers and comes from the arrival numbers — see the
   * hook's note. The transceivers are created here, in a fixed order, on both
   * sides: `setRemoteDescription` matches an offer's m-sections to existing
   * unassociated transceivers of the same kind in order, so building them
   * symmetrically is what makes one negotiation enough.
   *
   * `relayOnly` is the ladder's bottom rung and is never true on a first
   * attempt — see `recover`.
   */
  const openConnection = useCallback(
    async (peer: LiveSeat, isCaller: boolean, relayOnly = false) => {
      if (connections.current.has(peer.participantId)) return;

      const pc = new RTCPeerConnection({
        iceServers: iceRef.current,
        /*
         * A small pool, warmed before the offer is written.
         *
         * Gathering candidates takes a round trip to every STUN server. Doing
         * it in advance means the first offer already carries most of them,
         * which measurably shortens the gap between pressing join and hearing
         * somebody. Two, not ten: each one is a socket held open, times seven
         * peers.
         */
        iceCandidatePoolSize: 2,
        /*
         * Relay-only, on the second attempt and never on the first.
         *
         * This is the last rung of the recovery ladder — see `recover`. It
         * discards host and server-reflexive candidates entirely and allows
         * only the TURN relay, which is the one route that works when one side
         * is behind a symmetric NAT. It is deliberately not the default:
         * relaying pushes the media through our own droplet, costs bandwidth
         * that direct connections cost nothing, and adds a hop of latency to
         * the large majority of pairs that never needed it.
         */
        ...(relayOnly ? { iceTransportPolicy: 'relay' as const } : {}),
      });

      /*
       * Only the caller builds transceivers up front.
       *
       * Both sides used to, and that was why calls were one-way: when an offer
       * is applied, the browser pairs its m-sections only with transceivers
       * that `addTrack` created (JSEP §5.10 — Chrome checks
       * `created_by_addtrack`). One made by `addTransceiver` is never reused;
       * a fresh *recvonly* pair is created beside it instead. So the answerer
       * ended up sending into a pair nobody had negotiated, its answer said
       * "recvonly", and the person who joined second was never heard or seen.
       * The answerer now adopts the pair the offer creates — see
       * `adoptOfferedTransceivers`.
       *
       * `streams` is the other half of the fix. Without it the SDP names no
       * stream and the far side's `ontrack` receives an empty `event.streams`.
       */
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

      /*
       * A new connection starts with both cameras flowing, whatever the old
       * one to this peer had held back (see `recover`). So if they had been
       * holding theirs back from us, that is over as of now.
       */
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
        /*
         * The stream the browser assembled, where there is one.
         *
         * `event.streams[0]` holds both the audio and the video of this peer
         * as one object, which is what an `<audio>`/`<video>` element wants
         * and what the speaking detector analyses.
         *
         * Where there is not — a far side whose browser could not label its
         * sender (`setStreams` is missing on some engines) — the tracks are
         * gathered into one stream per peer by hand. This used to `return`,
         * which silently dropped the peer's audio and video on the floor. A
         * new object each time rather than `addTrack` on the old one, so the
         * tile's effect re-attaches it and calls `play()` again.
         */
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

        /*
         * The recovery ladder. Three rungs, each tried once.
         *
         * What this replaced was a single line: `failed` closed the connection
         * and the peer's tile simply disappeared, with nothing anywhere that
         * would ever try again. On a mesh that produces the failure people
         * actually report — a call that half-works, where five tiles connect
         * and one never does, and the person it does not work for has no
         * recourse but to leave and rejoin and hope the dice land differently.
         *
         * 1. `disconnected` is not a failure and must not be treated as one.
         *    ICE raises it whenever consent checks go quiet, which happens on
         *    every wifi handover and in every lift, and it recovers by itself
         *    far more often than not. It gets `DISCONNECT_GRACE_MS` to do so.
         *
         * 2. `failed` gets one `restartIce()`. That re-gathers candidates on
         *    the *existing* connection, which is the standard recovery from a
         *    network change — switching to a phone hotspot, a VPN coming up, a
         *    NAT rebinding — and it is cheap: no new peer connection, no new
         *    transceivers, and the media resumes on the same tracks.
         *
         * 3. If the restart also fails, the connection is rebuilt forcing
         *    TURN. This is the rung that pays for having stood coturn up: a
         *    symmetric NAT on one side produces exactly this signature, and
         *    nothing short of a relay will ever connect that pair. Only after
         *    that does the tile go.
         *
         * `connected` resets the ladder, so a peer that recovers and fails
         * again an hour later gets the full sequence rather than falling
         * straight to the bottom rung it used last time.
         */
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

  /**
   * One rung down the ladder for a connection that has stopped working.
   *
   * See `onconnectionstatechange` for the whole sequence and why it exists.
   * This is the part that acts, kept separate because it has to call
   * `openConnection`, which in turn installs the handler that calls this —
   * hence the ref below rather than a direct reference.
   */
  const recover = useCallback(
    (participantId: string) => {
      const connection = connections.current.get(participantId);
      if (!connection) return;

      const { peer, isCaller, relayOnly, restarted } = connection;

      if (!restarted) {
        connection.restarted = true;
        try {
          /*
           * Re-gather on the connection that already exists.
           *
           * Only the offering side may restart: `restartIce()` marks the
           * connection as needing negotiation, and on the answering side there
           * is nobody to answer an offer it is not allowed to make. The
           * answerer's restart comes to it as a fresh offer from the caller,
           * which `handleSignal` already knows how to apply — it is an ordinary
           * `setRemoteDescription` / `createAnswer` pair.
           */
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
          // `restartIce` throws on a closed connection, which is a race with
          // the peer having left. Falls through to the rebuild below, which
          // finds no seat and does nothing.
        }
      }

      /*
       * The restart is spent, or this side could not make one. Rebuild.
       *
       * `keepSeat`, so the tile stays on the stage while the new connection
       * forms — the person has not left, their connection is being replaced,
       * and a tile that vanishes and returns reads as a drop.
       *
       * Once. A connection already forced onto the relay that still cannot
       * form has exhausted everything available: there is no fourth thing to
       * try, and looping would be a reconnect storm against a peer that is
       * simply not reachable. That is when the tile goes.
       */
      if (relayOnly) {
        /*
         * Said out loud, once, because it is the one failure somebody can do
         * something about: a network that blocks both direct media and the
         * relay is almost always a workplace or campus firewall, and the fix
         * is on their side of it — another network, or a word with IT.
         */
        toast.warning(translate('live.mediaBlocked', { name: peer.user.displayName }));
        closeConnection(participantId);
        return;
      }

      closeConnection(participantId, true);
      void openConnection(peer, isCaller, true);
    },
    [closeConnection, openConnection, roomId],
  );

  /*
   * Read through a ref, because `openConnection` installs the handler that
   * calls `recover`, and `recover` calls `openConnection`. A ref breaks the
   * cycle without either of them being rebuilt on every render — which would
   * mean re-registering handlers mid-call.
   */
  const recoverRef = useRef(recover);
  recoverRef.current = recover;

  // -------------------------------------------------------------------------
  // Telling a peer whether we can see them
  // -------------------------------------------------------------------------

  /**
   * "Stop encoding your video for me" / "start again".
   *
   * ## Why the viewer is the one who decides
   *
   * In a mesh the sender pays for every stream — one encoder and one uplink
   * per peer — and the sender is the one party who cannot possibly know
   * whether anybody is looking. Only the viewer knows that its tile has been
   * scrolled out of the grid or that the whole stage is collapsed behind
   * another panel, so the viewer is the one who has to say.
   *
   * The far side answers by calling `replaceTrack(null)` on that one peer's
   * video sender, which does not renegotiate. So the whole mechanism is one
   * socket frame each way and a track swap — no SDP, no `negotiationneeded`,
   * nothing that could disturb the other six connections. An SFU calls this
   * "consumer pausing" and needs a server-side subscription model for it.
   *
   * ## Why nothing is remembered here
   *
   * The sender holds the only copy that matters (`connection.wantsVideo`), and
   * the observer that drives this is idempotent — it fires on change, not on a
   * timer. Caching the last value on this side to skip duplicate emits would
   * add a second copy of the truth to save a frame that only gets sent when
   * something actually moved.
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

  // -------------------------------------------------------------------------
  // Holding the camera back for the voice
  // -------------------------------------------------------------------------

  /**
   * Take the camera out of one peer's sender, or put it back, and say so.
   *
   * The peer is told over `live:signal`, the addressed channel the negotiation
   * already uses, because a hold is per pair: my uplink to one person can be
   * saturated while my route to the rest is fine. The gateway relays `data`
   * as it is, so nothing on the server had to learn about this, and a client
   * that predates it ignores a signal with no description and no candidate.
   * Without the notice their tile would sit on a frozen frame; with it, it
   * shows my avatar and why.
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
   * Decide, from one stats pass, whether this peer should get the camera.
   *
   * ## The rule
   *
   * The camera is the last priority. When somebody is talking with their
   * camera on and the route to a peer starts losing their voice, the camera
   * is what goes, for that peer, so the voice has the link to itself. It
   * applies only while both are live: with the microphone muted the camera
   * is not competing with anything, and during a share the camera is not
   * being sent at all.
   *
   * ## What counts as struggling
   *
   * What the peer says it is losing of what we send (RTCP receiver reports,
   * so this is our uplink, where the inbound figures on the tile are theirs),
   * the round trip, and what the congestion controller thinks the route can
   * carry. Two passes in a row, so one lost burst does not turn a camera off.
   *
   * ## Coming back
   *
   * Once the camera is off the link there is no video left to measure
   * whether the link could carry it, so the only test is to try. After the
   * wait (see `RETRY_BASE_MS`), and only if the voice is clean at that
   * moment, the camera goes back in; tripping again soon after doubles the
   * wait before the next try.
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

  // -------------------------------------------------------------------------
  // Connection quality
  // -------------------------------------------------------------------------

  /**
   * Read every connection's stats and turn four numbers into three words.
   *
   * ## Why this exists at all
   *
   * Every other degradation in this file is silent. The bitrate ceiling drops
   * when a seventh person joins, `degradationPreference` decides to hold
   * resolution and shed frames, the recovery ladder quietly rebuilds a pair
   * through the relay — and from the outside all of that looks the same as a
   * call that is simply bad. "The call was bad" is then unattributable: nobody
   * can tell a saturated uplink from a CPU-bound encoder from a relayed pair,
   * and without that nobody can do the one thing that would help, which is
   * usually "turn your camera off" or "stop sharing".
   *
   * ## Why three states and not a number
   *
   * A percentage invites arithmetic the reader has no basis for. What somebody
   * on a call needs is whether this is fine, whether it is degrading, and
   * whether it is already broken — and the thresholds below are where those
   * three actually sit for interactive media: under 2% loss is imperceptible,
   * 2–8% is where speech starts to sound clipped and video to smear, and past
   * 8% the stream is not really arriving.
   *
   * ## Why the loss is measured over the interval
   *
   * `packetsLost` and `packetsReceived` are cumulative counters, so a ratio
   * taken from the totals is the average since the call began — which after
   * ten minutes cannot move far however bad the last thirty seconds were. The
   * previous sample is kept on the connection so this reads a *rate*.
   *
   * ## Why 0.5 Hz, and why the state is compared before it is set
   *
   * `getStats()` walks a report of a few dozen objects per connection, times
   * seven connections. It is cheap but not free, and nothing in the interface
   * changes faster than a person can read. Twice a second would be seven
   * reports and a re-render of the stage for numbers that had not visibly
   * moved; every two seconds is below the threshold where a change feels
   * delayed.
   *
   * The comparison at the end is the other half of that: a poll that always
   * called `setQuality` would re-render the stage every two seconds forever,
   * on a screen that is mostly video elements. Returning the same object when
   * nothing has changed means a steady call costs one `getStats` per peer and
   * no React work at all.
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
            /*
             * Audio jitter, not video's, when both are present.
             *
             * Video has its own buffer and a frame arriving late is a frame
             * arriving late; speech arriving unevenly is what people actually
             * hear as a bad call. Taking the larger of the two would let a
             * perfectly audible conversation be reported as bad because the
             * camera was struggling.
             */
            if (entry.kind === 'audio') jitter = Math.max(jitter, (entry.jitter ?? 0) * 1000);
          }

          /*
           * The pair currently in use, and only that one.
           *
           * A connection accumulates a candidate pair for every route it
           * tried; `nominated` plus `succeeded` is the one carrying media.
           * Reading any pair would report a relay on every connection that
           * merely *considered* one.
           */
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
        /*
         * No traffic in the last interval means no information, not perfect
         * health — a peer who is muted with their camera off sends almost
         * nothing, and dividing by a handful of packets turns one lost one
         * into 20% loss. Under fifty packets in two seconds is below anything
         * a live stream produces, so the reading is held at zero rather than
         * invented.
         */
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
    /*
     * And the plan, re-checked on every pass. A share's frame rate follows
     * the uplink, a resized window can need a new scale, and a
     * `setParameters` that lost a race with a leaving peer is retried here.
     * A pass with nothing to change touches nothing (see `syncConnection`).
     */
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
            // Rounded before comparing, because these are floating-point
            // numbers that will never be equal twice and the interface only
            // draws one decimal of either.
            Math.round(before.loss * 1000) === Math.round(after.loss * 1000) &&
            Math.round(before.jitter) === Math.round(after.jitter)
          );
        });
        if (same) return current;
      }
      return next;
    });
  }, [syncAll, watchUplink]);

  /**
   * One leg of somebody else's negotiation.
   *
   * The queue is the part worth reading twice. ICE candidates routinely arrive
   * before the description they belong to — they are generated the instant a
   * peer sets its *local* description and travel over the same socket, so on a
   * fast connection several land before the offer they accompany. Calling
   * `addIceCandidate` then throws, the candidate is lost, and the call
   * connects only if some later candidate happens to work. Holding them until
   * there is a remote description to attach them to is the fix.
   */
  const handleSignal = useCallback(
    async (payload: { from: string; data: Record<string, unknown> }) => {
      /*
       * Not negotiation: the peer holding their camera back from us, or
       * giving it back. See `setHold`. Dropped rather than queued when there
       * is no connection, because it describes one that no longer exists and
       * the next one starts with the camera flowing.
       */
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
        /*
         * Swallowed on purpose.
         *
         * A rejected description is almost always a peer that has already
         * left, and the browser's own message ("Failed to set remote answer
         * sdp: Called in wrong state") is not something a user can act on.
         * `connectionstatechange` is what notices a connection that genuinely
         * will not form.
         */
      }
    },
    [adoptOfferedTransceivers, patchPeer, roomId, syncAll, syncConnection],
  );

  /* Read through a ref by `openConnection`, which is defined first — same reason as `recoverRef`. */
  const handleSignalRef = useRef(handleSignal);
  handleSignalRef.current = handleSignal;

  // -------------------------------------------------------------------------
  // Devices
  // -------------------------------------------------------------------------

  /**
   * Ask for the microphone and camera, and carry on without either.
   *
   * ## Why both are requested at once, and why failure is not fatal
   *
   * One prompt rather than two: a browser asked for audio and then video shows
   * the permission bar twice, and the second one arrives after the user has
   * already started listening to the call and is no longer looking at the
   * address bar.
   *
   * Denial is not an error. Somebody who wants to listen to a stand-up from a
   * quiet carriage has a perfectly good reason to refuse both, and the mesh
   * handles it natively — the transceivers exist either way, so they receive
   * everything and send nothing. The fallback is a second request for audio
   * alone, because "no camera" is far more common than "no microphone" and a
   * single combined request fails entirely when only the camera is missing.
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

  // -------------------------------------------------------------------------
  // Join and leave
  // -------------------------------------------------------------------------

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

    /*
     * Every track is disabled before anything is negotiated.
     *
     * The browser's permission prompt is consent to be *able* to broadcast,
     * not consent to broadcast — and a call that turns your microphone on as
     * you walk in is one people stop trusting. The tracks exist so the senders
     * have something to carry the moment somebody presses unmute; they carry
     * silence until then.
     */
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
      /*
       * Seated from this moment, whatever happens next — including the reader
       * having already left while the acknowledgement was in flight, in which
       * case the room is told straight away rather than never.
       */
      if (leftRef.current) {
        void emitWithAck('live:leave', { roomId }).catch(() => undefined);
        return;
      }
      seatedRoom.current = roomId;

      setSelf(result.self);
      selfRef.current = result.self;
      setPeers(result.peers.map((peer) => ({ ...peer, stream: null })));

      /*
       * The arrival numbers decide who dials whom.
       *
       * Everybody already here has a *lower* number than this client, so this
       * client answers all of them — `isCaller` is false throughout. The
       * offers are made by the peers, which receive `live:peer-joined` and run
       * the other branch. One offer per pair, settled before either side
       * speaks. See the hook's note.
       */
      await Promise.all(result.peers.map((peer) => openConnection(peer, false)));
      void syncAll();

      /*
       * The stats poll runs for the life of the call, not the life of the
       * panel.
       *
       * Started here rather than in an effect because the thing it measures is
       * the set of connections, and that set only exists between a successful
       * join and a leave. An effect keyed on `status` would be a second copy
       * of that lifecycle, with its own ways of getting out of step.
       *
       * Cleared in `leave` and in the unmount effect, and guarded here against
       * a double join leaving an orphan behind it.
       */
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

  // -------------------------------------------------------------------------
  // Controls
  // -------------------------------------------------------------------------

  /** Push the four tile flags to the room. Throttled by the gateway, not here. */
  const publish = useCallback(
    (next: Partial<LiveFlags>) => {
      /*
       * Emitted beside the state update, never inside it.
       *
       * A `setState` updater must be pure: React is free to call it twice —
       * it does exactly that in StrictMode — and a socket emit in there sends
       * every mute twice. The two are independent anyway; nothing about the
       * frame depends on the merged result.
       */
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

    /*
     * `enabled` first, then the sender.
     *
     * The track is never stopped: that would release the microphone, and the
     * next unmute would raise the browser's permission prompt again in the
     * middle of a conversation. Disabling it silences it on this very line.
     *
     * The sender is then emptied (see `outboundAudio`). A disabled track
     * still goes out as encoded silence, fifty packets a second to every
     * peer, which is uplink a muted presenter's screen can use instead.
     * `replaceTrack` does not renegotiate and the encoder starts on the first
     * packet, so unmuting is as quick as it was.
     */
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
    // Ignored while a screen is being shared: the sender is occupied, and
    // turning the camera "on" would do nothing visible and leave the button
    // lit. `stopShare` is what puts the camera back.
    if (screenTrack.current) return;

    track.enabled = !track.enabled;
    publish({ camOn: track.enabled });
    void syncAll();
  }, [publish, syncAll]);

  /**
   * Stop sending the shared screen's sound, and let go of the mix.
   *
   * Called when the share ends, and on its own if the browser ends the sound
   * before the picture, which it is free to do.
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
   * Share a screen, by swapping it into the sender the camera was using.
   *
   * This is the payoff for building the transceivers up front: no new track,
   * no `negotiationneeded`, no seven simultaneous renegotiations. The peers
   * see the same video stream change content, which is exactly what a viewer
   * wants and is one `replaceTrack` per connection. Its sound, if the
   * presenter ticked the box for it, goes the same way into the audio sender
   * (see `ScreenAudioMix`).
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
      /*
       * Dismissing the picker is the ordinary way to change your mind about
       * which window to show, and says nothing. So does a capture the system
       * refused. What is worth one more try is an engine that choked on one
       * of the newer options, which should not cost anybody the share: it is
       * asked again with the plainest request there is, and the encoder
       * still holds the result to 720p and 27 fps.
       */
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

    /*
     * The camera stops capturing for the length of the share, not just
     * sending. It could not be sent anyway (there is one video sender and the
     * screen is in it), so leaving it on was a light and a capture pipeline
     * running for nothing.
     */
    const camera = cameraTrack.current;
    if (camera) camera.enabled = false;

    await syncAll();

    /*
     * The browser's own "stop sharing" bar ends the share too.
     *
     * Without this the bar stops the track and every peer is left looking at
     * a frozen final frame, with this client's UI still saying it is
     * sharing.
     */
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

    // Back to the camera, or to nothing if there never was one. Its `enabled`
    // is false, so the peers see the tile go dark rather than the camera come
    // on unannounced.
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

  // -------------------------------------------------------------------------
  // The socket, while the call is up
  // -------------------------------------------------------------------------

  /*
   * Attached for the life of the hook, not gated on the call being up.
   *
   * It used to wait for `status` to reach `joining`, which opened a race it
   * lost about one join in five on a fast connection: `setStatus('joining')`
   * only schedules a render, the effect that attaches `live:signal` runs after
   * that render commits, and a peer that received `live:peer-joined` in the
   * meantime had already sent its offer — into a socket with no listener. The
   * result was a participant who could see everybody and hear nobody, with no
   * error anywhere.
   *
   * Nothing is gained by the gate. Every handler below is a no-op without a
   * matching connection, and these events only reach a socket that has joined
   * the room's channel — which is the condition the gate was trying to express
   * and the server already enforces.
   */
  useEffect(() => {
    const socket = getSocket();

    const onPeerJoined = ({ peer }: { peer: LiveSeat }) => {
      setPeers((current) => {
        if (current.some((entry) => entry.participantId === peer.participantId)) return current;
        return [...current, { ...peer, stream: null }];
      });

      /*
       * The arrival rule, from this side.
       *
       * The newcomer's number is higher than ours by construction, so we are
       * the caller. The newcomer runs the other branch for us and waits.
       */
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
      /*
       * A share starting or stopping is the only thing that changes whether
       * this peer's video should be buffered — see `applyPlayoutHint`.
       *
       * Deferred to a microtask so the hint reads the roster *after*
       * `patchPeer`'s state update has been applied to `peersRef`. Reading it
       * synchronously here would see the previous value of `sharing` and set
       * exactly the wrong hint, one state change behind, forever.
       */
      queueMicrotask(() => applyPlayoutHint(participantId));
    };

    const onSignal = (payload: { from: string; data: Record<string, unknown> }) =>
      void handleSignal(payload);

    /**
     * A peer has stopped (or resumed) looking at our tile — see
     * `setVideoInterest` for the other half.
     *
     * `replaceTrack(null)` rather than `track.enabled = false`: a disabled
     * track keeps the encoder running and keeps sending black frames, which
     * saves the bandwidth and none of the CPU. Removing the track from the
     * sender stops the encoder for that peer entirely, which in a mesh is the
     * expensive half — seven encoders on a laptop is what makes a full room
     * hot rather than seven uplinks.
     *
     * It also does not renegotiate, which is the whole reason this fits: the
     * far side's `<video>` simply stops receiving frames and holds its last
     * one, and resuming puts the track back with no SDP exchange.
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

      /*
       * Silenced mid-sentence, honoured immediately.
       *
       * The gateway has already stopped broadcasting this client's `micOn` to
       * the room, but the audio track is still live and still reaching seven
       * peers directly — the server cannot stop that, because it is not in the
       * path. Only this client can, and it must.
       */
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

  /*
   * Leaving when the component goes, and only then.
   *
   * The empty dependency list is deliberate and is the one place in this hook
   * where the lint rule is wrong: `leave` is recreated whenever `roomId`
   * changes, and listing it would tear the call down every time React decided
   * to rebuild the callback — which is to say, in the middle of the call.
   */
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
        // The grace timer outlives the connection it belongs to unless it is
        // cleared here: it is a `setTimeout` holding a closure over a
        // `RTCPeerConnection`, and it would fire into a torn-down call.
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
    /*
     * Always a fresh array. `sort` works in place, and without a seat of our
     * own `entries` used to *be* `peers` — so this sorted React state directly,
     * behind the back of the render that owned it.
     */
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
     * Tell one peer whether we can currently see their video.
     *
     * Driven by whatever is watching the tiles — see `LiveStage`. The hook
     * deliberately does not own that observation: what counts as "visible"
     * depends on the layout the stage happens to be in, and a hook that tried
     * to decide it would need a reference to every tile element.
     */
    setVideoInterest,
  };
};
