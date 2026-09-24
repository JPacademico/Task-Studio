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
 * And what the microphone costs, which does not vary.
 *
 * Opus is transparent for speech at 32 kbps and the difference between seven
 * of those and seven of anything cheaper is not worth the words being harder
 * to make out. Audio is the part of a call that must never degrade — a
 * conversation survives frozen video and does not survive broken sound.
 */
const AUDIO_BITRATE = 32_000;

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
 * it is worth stating plainly. Every connection is built with exactly one
 * audio and one video transceiver, in that order, on both sides — before any
 * offer is made and whether or not this client has a camera. Everything
 * afterwards is `replaceTrack`:
 *
 *   - turning the camera on swaps a track into a sender that already exists;
 *   - sharing a screen swaps the screen track into the *same* sender;
 *   - stopping either swaps back to null.
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
  const iceRef = useRef<IceServerConfig[]>(FALLBACK_ICE);
  /** Guards the teardown against a join that is still in flight. */
  const leftRef = useRef(false);

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

  /**
   * The bitrate ceiling, applied to every connection this client sends on.
   *
   * Re-run whenever the room's size changes, because the ceiling is a function
   * of it — somebody joining a call of three has to make the other three send
   * less, and nothing else in WebRTC will tell them to.
   */
  const applyBitrates = useCallback((peerCount: number) => {
    /*
     * Which table applies is decided by what is in the sender right now, not
     * by a flag — see `screenCeiling`. `screenTrack` is the single source of
     * truth for that on this client, and it is the same ref `startShare` sets.
     */
    const isSharing = screenTrack.current !== null;
    const ceiling = isSharing ? screenCeiling(peerCount) : videoCeiling(peerCount);

    for (const connection of connections.current.values()) {
      const tune = (
        sender: RTCRtpSender | null,
        maxBitrate: number,
        degradationPreference?: RTCDegradationPreference,
      ) => {
        if (!sender) return;
        const parameters = sender.getParameters();
        // A sender that has not negotiated yet has no encodings to edit. It
        // will be tuned by the next call to this, after somebody joins or
        // leaves — and until then the browser's own default applies.
        if (!parameters.encodings || parameters.encodings.length === 0) return;

        parameters.encodings[0].maxBitrate = maxBitrate;

        /*
         * What to give up first when the link cannot carry the stream.
         *
         * The browser has to sacrifice either frame rate or resolution and its
         * default guess is `balanced`, which is right for a face and wrong for
         * a screen. Text at half resolution is unreadable, and unreadable at
         * 30 fps is strictly worse than readable at 5 — a share is something
         * people *read*, and a reader would rather the scroll stuttered than
         * that the words dissolved.
         *
         * A camera keeps the default. Faces survive being soft and do not
         * survive being slow: a talking head at 8 fps is unsettling in a way
         * a slightly blurry one at 24 is not.
         *
         * Assigned rather than compared first, because reading the current
         * value back is not reliable across engines — some report the default
         * as `undefined` even after it has been set.
         */
        if (degradationPreference) parameters.degradationPreference = degradationPreference;

        // Ignored rather than reported: `setParameters` rejects if the
        // transceiver changed underneath us, which is a race with a peer
        // leaving and is corrected on the next pass.
        void sender.setParameters(parameters).catch(() => undefined);
      };

      /*
       * A sender the peer has paused is left alone entirely.
       *
       * Its track is null (see `live:video-interest`), so there are no
       * encodings to tune and `setParameters` would be a wasted call per peer
       * per roster change. It is tuned when the track goes back in.
       */
      if (connection.wantsVideo) {
        tune(
          connection.videoSender,
          ceiling,
          isSharing ? 'maintain-resolution' : 'balanced',
        );
      }
      tune(connection.audioSender, AUDIO_BITRATE);
    }
  }, []);

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

      const audioTx = pc.addTransceiver('audio', { direction: 'sendrecv' });
      const videoTx = pc.addTransceiver('video', { direction: 'sendrecv' });

      const connection: Connection = {
        pc,
        audioSender: audioTx.sender,
        videoSender: videoTx.sender,
        pending: [],
        peer,
        isCaller,
        relayOnly,
        restarted: false,
        graceTimer: undefined,
        wantsVideo: true,
        lastStats: null,
      };
      connections.current.set(peer.participantId, connection);

      // Whatever this client currently has. Null is fine and is the ordinary
      // case for somebody who joined muted with the camera off.
      const audio = localRef.current?.getAudioTracks()[0] ?? null;
      const video = screenTrack.current ?? cameraTrack.current ?? null;
      await audioTx.sender.replaceTrack(audio).catch(() => undefined);
      await videoTx.sender.replaceTrack(video).catch(() => undefined);

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
         * The stream the browser assembled, not one built from the track.
         *
         * `event.streams[0]` holds both the audio and the video of this peer
         * as one object, which is what an `<audio>`/`<video>` element wants
         * and what the speaking detector analyses. Constructing a
         * `new MediaStream([event.track])` per event — the obvious-looking
         * alternative — gives two separate single-track streams and a tile
         * that plays video with no sound.
         */
        const [stream] = event.streams;
        if (!stream) return;

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

      if (!isCaller) return;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (!roomId) return;
      await emitWithAck('live:signal', {
        roomId,
        to: peer.participantId,
        data: { description: pc.localDescription?.toJSON() },
      }).catch(() => undefined);
    },
    [applyPlayoutHint, patchPeer, roomId],
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

        report.forEach((entry) => {
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
      }),
    );

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
  }, []);

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
      const connection = connections.current.get(payload.from);
      if (!connection) return;

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
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            if (!roomId) return;
            await emitWithAck('live:signal', {
              roomId,
              to: payload.from,
              data: { description: pc.localDescription?.toJSON() },
            }).catch(() => undefined);
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
    [roomId],
  );

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
    localRef.current = null;
    cameraTrack.current = null;
    screenTrack.current = null;

    detector.current?.close();
    detector.current = null;

    if (roomId) void emitWithAck('live:leave', { roomId }).catch(() => undefined);

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
      if (leftRef.current) return;

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
      applyBitrates(result.peers.length);

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
  }, [acquireDevices, applyBitrates, openConnection, pollQuality, roomId]);

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
     * `enabled`, not `stop()` and not `replaceTrack(null)`.
     *
     * A disabled track keeps the connection and the encoder alive and sends
     * silence, so unmuting is instantaneous. Removing the track would make
     * every unmute a round trip through the sender — and stopping it would
     * release the microphone, so the *next* unmute would raise the browser's
     * permission prompt again in the middle of a conversation.
     */
    track.enabled = !track.enabled;
    publish({ micOn: track.enabled, handRaised: false });
  }, [publish]);

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
  }, [publish]);

  /**
   * Share a screen, by swapping it into the sender the camera was using.
   *
   * This is the payoff for building the transceivers up front: no new track,
   * no `negotiationneeded`, no seven simultaneous renegotiations. The peers
   * see the same video stream change content, which is exactly what a viewer
   * wants and is one `replaceTrack` per connection.
   */
  const startShare = useCallback(async () => {
    if (!allowedRef.current.canPresent) {
      toast.warning(translate('live.askToPresent'));
      return;
    }

    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 12, max: 15 } },
        // Deliberately not requesting the tab's audio. It is the commonest way
        // to put a second copy of the call into the call, and nothing in a
        // project review needs it.
        audio: false,
      });

      const track = display.getVideoTracks()[0];
      if (!track) return;

      screenTrack.current = track;
      for (const connection of connections.current.values()) {
        await connection.videoSender?.replaceTrack(track).catch(() => undefined);
      }

      /*
       * The browser's own "stop sharing" bar ends the share too.
       *
       * Without this the bar stops the track and every peer is left looking at
       * a frozen final frame, with this client's UI still saying it is
       * sharing.
       */
      track.onended = () => void stopShare();

      // The camera is off for the duration whether or not it was on: there is
      // one video sender and the screen is in it.
      publish({ sharing: true, camOn: false });
    } catch {
      // The picker was dismissed. Not an error — it is the ordinary way to
      // change your mind about which window to show.
    }
    // `stopShare` is defined below and is stable; referencing it here would
    // need a forward declaration for no benefit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publish]);

  const stopShare = useCallback(async () => {
    const track = screenTrack.current;
    if (!track) return;

    track.onended = null;
    track.stop();
    screenTrack.current = null;

    // Back to the camera, or to nothing if there never was one. Its `enabled`
    // is false, so the peers see the tile go dark rather than the camera come
    // on unannounced.
    const camera = cameraTrack.current;
    if (camera) camera.enabled = false;
    for (const connection of connections.current.values()) {
      await connection.videoSender?.replaceTrack(camera ?? null).catch(() => undefined);
    }

    publish({ sharing: false, camOn: false });
  }, [publish]);

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
      void openConnection(peer, mine < peer.seq).then(() =>
        applyBitrates(connections.current.size),
      );
    };

    const onPeerLeft = ({ participantId }: { participantId: string }) => {
      closeConnection(participantId);
      applyBitrates(Math.max(0, connections.current.size));
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

      const track = wanted ? (screenTrack.current ?? cameraTrack.current ?? null) : null;
      void connection.videoSender?.replaceTrack(track).catch(() => undefined);

      /*
       * A resumed sender has never been tuned — `applyBitrates` skips paused
       * ones, and a track put back into a sender comes with the browser's
       * default ceiling rather than the one this room requires. Re-running it
       * for the whole map is cheaper than tracking which senders are dirty,
       * and it happens at most once per tile scrolling into view.
       */
      if (wanted) applyBitrates(connections.current.size);
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
    applyBitrates,
    applyPlayoutHint,
    closeConnection,
    handleSignal,
    leave,
    onEnded,
    openConnection,
    patchPeer,
    stopShare,
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
      detector.current?.close();
    },
    [],
  );

  /** Everybody on the call, this client included, in arrival order. */
  const roster = useMemo(() => {
    const entries = self ? [{ ...self, stream: localStream, flags }, ...peers] : peers;
    return entries.sort((a, b) => a.seq - b.seq);
  }, [flags, localStream, peers, self]);

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
