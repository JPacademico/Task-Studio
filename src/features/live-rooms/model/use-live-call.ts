import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '@/shared/lib/toast';

import { useIceServers } from '@/entities/live-room/model/queries';
import type {
  IceServerConfig,
  LiveFlags,
  LiveJoinResult,
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

  /*
   * Everything below lives in refs rather than state, and the rule is simple:
   * if React re-rendering because it changed would be wrong or wasteful, it is
   * a ref. A `RTCPeerConnection` map re-rendering the stage on every ICE
   * candidate would be a hundred renders per join.
   */
  const connections = useRef(new Map<string, Connection>());
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

  useEffect(() => {
    if (iceServers && iceServers.length > 0) iceRef.current = iceServers;
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
    const ceiling = videoCeiling(peerCount);

    for (const connection of connections.current.values()) {
      const tune = (sender: RTCRtpSender | null, maxBitrate: number) => {
        if (!sender) return;
        const parameters = sender.getParameters();
        // A sender that has not negotiated yet has no encodings to edit. It
        // will be tuned by the next call to this, after somebody joins or
        // leaves — and until then the browser's own default applies.
        if (!parameters.encodings || parameters.encodings.length === 0) return;

        parameters.encodings[0].maxBitrate = maxBitrate;
        // Ignored rather than reported: `setParameters` rejects if the
        // transceiver changed underneath us, which is a race with a peer
        // leaving and is corrected on the next pass.
        void sender.setParameters(parameters).catch(() => undefined);
      };

      tune(connection.videoSender, ceiling);
      tune(connection.audioSender, AUDIO_BITRATE);
    }
  }, []);

  const closeConnection = useCallback(
    (participantId: string) => {
      const connection = connections.current.get(participantId);
      if (!connection) return;

      connection.pc.onicecandidate = null;
      connection.pc.ontrack = null;
      connection.pc.onconnectionstatechange = null;
      connection.pc.close();
      connections.current.delete(participantId);

      detector.current?.remove(participantId);
      setPeers((current) => current.filter((peer) => peer.participantId !== participantId));
    },
    [],
  );

  /**
   * Build the connection to one peer.
   *
   * `isCaller` decides who offers and comes from the arrival numbers — see the
   * hook's note. The transceivers are created here, in a fixed order, on both
   * sides: `setRemoteDescription` matches an offer's m-sections to existing
   * unassociated transceivers of the same kind in order, so building them
   * symmetrically is what makes one negotiation enough.
   */
  const openConnection = useCallback(
    async (peer: LiveSeat, isCaller: boolean) => {
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
      });

      const audioTx = pc.addTransceiver('audio', { direction: 'sendrecv' });
      const videoTx = pc.addTransceiver('video', { direction: 'sendrecv' });

      const connection: Connection = {
        pc,
        audioSender: audioTx.sender,
        videoSender: videoTx.sender,
        pending: [],
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
      };

      pc.onconnectionstatechange = () => {
        /*
         * `failed` is terminal; `disconnected` is not.
         *
         * A `disconnected` connection is one whose ICE checks have gone quiet
         * — a wifi handover, a tunnel — and it recovers on its own far more
         * often than not. Tearing it down there would turn every lift journey
         * into a dropped call. `failed` means the browser has given up, and
         * the peer that stayed put will re-offer when the other side rejoins.
         */
        if (pc.connectionState === 'failed') closeConnection(peer.participantId);
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
    [closeConnection, patchPeer, roomId],
  );

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
  }, [acquireDevices, applyBitrates, openConnection, roomId]);

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
    }) => patchPeer(participantId, { flags: peerFlags });

    const onSignal = (payload: { from: string; data: Record<string, unknown> }) =>
      void handleSignal(payload);

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
    socket.on('live:permissions', onPermissions);
    socket.on('live:participant-permissions', onParticipantPermissions);
    socket.on('live:room-ended', onEnd);
    socket.on('live:displaced', onDisplaced);

    return () => {
      socket.off('live:peer-joined', onPeerJoined);
      socket.off('live:peer-left', onPeerLeft);
      socket.off('live:peer-state', onPeerState);
      socket.off('live:signal', onSignal);
      socket.off('live:permissions', onPermissions);
      socket.off('live:participant-permissions', onParticipantPermissions);
      socket.off('live:room-ended', onEnd);
      socket.off('live:displaced', onDisplaced);
    };
  }, [
    applyBitrates,
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
      for (const participantId of [...connections.current.keys()]) {
        connections.current.get(participantId)?.pc.close();
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
    join,
    leave,
    toggleMic,
    toggleCam,
    startShare,
    stopShare,
    raiseHand,
  };
};
