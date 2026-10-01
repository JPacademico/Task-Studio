/**
 * A shared screen's sound, carried in the sender the microphone already has. The call negotiates
 * exactly one audio and one video transceiver per peer, once, and never again.
 */

/**
 * How loud the shared sound sits under the presenter's voice. Below one, so the person talking is
 * heard over the video they are talking about.
 */
const SCREEN_UNDER_VOICE = 0.7;

/**
 * One mix, for the length of one share. Built only once somebody both shares a screen with sound
 * and unmutes, and closed when the share ends.
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

/** What to ask `getDisplayMedia` for. At most 1280x720 and 27 frames a second. */
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
