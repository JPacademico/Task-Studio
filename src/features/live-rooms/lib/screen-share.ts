/**
 * A shared screen's sound, carried in the sender the microphone already has.
 *
 * ## Why not a second audio track
 *
 * The call negotiates exactly one audio and one video transceiver per peer,
 * once, and never again (see `use-live-call.ts`). A second audio track for the
 * screen would mean either renegotiating every connection each time somebody
 * shares, which is what that design exists to avoid, or a third m-section on
 * every connection for the whole call, which old clients in the same room
 * would not know to play: an `<audio>` or `<video>` element in Chromium plays
 * the first audio track of a stream and ignores the rest.
 *
 * So there is one outbound audio track per call, and it carries:
 *
 *   - the microphone alone, when nothing with sound is being shared;
 *   - the screen alone, when the presenter is muted, handed over as the raw
 *     captured track with no processing in between;
 *   - both, mixed here, only while the presenter is talking over a share
 *     that has sound.
 *
 * Every client in the room hears it with no change at their end, whatever
 * version they are on, because to them it is still the one audio track that
 * has always been there. It also costs one Opus stream per peer rather than
 * two: one encoder, one set of packet headers.
 *
 * ## Why the mix can be switched off
 *
 * A running `AudioContext` is an audio thread doing work every 2.7ms whether
 * or not anybody is listening to its output. The mix is only sent while the
 * microphone is live, so while it is not the context is suspended and the
 * thread sleeps.
 */

/**
 * How loud the shared sound sits under the presenter's voice.
 *
 * Below one, so the person talking is heard over the video they are talking
 * about, and so the sum of a loud clip and a loud voice clips less often. The
 * sound is sent at full level whenever the presenter is muted, because then it
 * is not competing with anything.
 */
const SCREEN_UNDER_VOICE = 0.7;

/**
 * One mix, for the length of one share.
 *
 * Built only once somebody both shares a screen with sound and unmutes, and
 * closed when the share ends.
 */
export class ScreenAudioMix {
  private readonly context: AudioContext;
  private readonly sources: MediaStreamAudioSourceNode[];
  private running = true;

  /** What the audio sender carries while this mix is in use. */
  readonly track: MediaStreamTrack;

  constructor(screen: MediaStreamTrack, microphone: MediaStreamTrack) {
    /*
     * 48kHz because that is what Opus encodes and what both inputs arrive at,
     * so nothing is resampled on the way in or on the way out.
     */
    this.context = new AudioContext({ latencyHint: 'interactive', sampleRate: 48_000 });
    const destination = this.context.createMediaStreamDestination();
    // Mixed in mono, which is what the call's Opus sends anyway.
    destination.channelCount = 1;

    const voice = this.context.createMediaStreamSource(new MediaStream([microphone]));
    voice.connect(destination);

    const sound = this.context.createMediaStreamSource(new MediaStream([screen]));
    const level = this.context.createGain();
    level.gain.value = SCREEN_UNDER_VOICE;
    sound.connect(level).connect(destination);

    this.sources = [voice, sound];
    this.track = destination.stream.getAudioTracks()[0];

    // A context made outside a click can start suspended; this one is made
    // to be sent at once.
    if (this.context.state === 'suspended') void this.context.resume().catch(() => undefined);
  }

  /** Whether the mix is being sent. A mix nobody is sending sleeps. */
  setRunning(running: boolean): void {
    if (this.running === running || this.context.state === 'closed') return;
    this.running = running;
    void (running ? this.context.resume() : this.context.suspend()).catch(() => undefined);
  }

  close(): void {
    for (const source of this.sources) source.disconnect();
    this.track.stop();
    void this.context.close().catch(() => undefined);
  }
}

/**
 * What to ask `getDisplayMedia` for.
 *
 * ## The picture
 *
 * At most 1280x720 and 27 frames a second. The ceiling is on the *capture*,
 * so a 4K monitor is scaled down once by the browser rather than captured at
 * full size and then scaled again by every one of the peer encoders. 27 rather
 * than 30 leaves the encoder a little room: a capture pinned at exactly the
 * encoder's limit drops frames unevenly whenever one arrives early, and an
 * uneven 30 looks worse than an even 27. `max`, never `exact` or `min`, which
 * `getDisplayMedia` refuses outright.
 *
 * ## The sound
 *
 * Asked for, which is what makes the browser's picker offer "share tab audio"
 * and, on Windows and ChromeOS, "share system audio". The three voice
 * processors are turned off because they are built for a voice in a room and
 * are wrong for anything else: noise suppression treats music as noise and
 * eats it, and gain control pumps the volume up and down with every scene.
 *
 * ## The two that keep the call out of its own share
 *
 * `restrictOwnAudio` leaves this tab's own sound out of the capture. Without
 * it, a presenter sharing their whole screen with system audio sends the other
 * participants' voices, which this tab is playing, straight back to them.
 * `selfBrowserSurface: 'exclude'` takes this tab out of the picker, since a
 * capture of the call inside the call is a hall of mirrors with the same echo.
 * Both are recent Chromium additions. Browsers that do not know them ignore
 * them, and the share works as it did.
 */
export const DISPLAY_MEDIA_OPTIONS = {
  video: {
    width: { max: 1280 },
    height: { max: 720 },
    frameRate: { ideal: 27, max: 27 },
  },
  audio: {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    restrictOwnAudio: true,
  },
  selfBrowserSurface: 'exclude',
  systemAudio: 'include',
} as DisplayMediaStreamOptions;
