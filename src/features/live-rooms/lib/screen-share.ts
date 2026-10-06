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

  /**
   * 48kHz by default, because that is what Opus encodes. Pass `null` for the device's own rate:
   * Firefox refuses to mix a source whose rate differs from the context's.
   */
  constructor(
    screen: MediaStreamTrack,
    microphone: MediaStreamTrack,
    sampleRate: number | null = 48_000,
  ) {
    this.context = new AudioContext({
      latencyHint: 'interactive',
      ...(sampleRate ? { sampleRate } : {}),
    });
    try {
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
    } catch (error) {
      // A context left open on failure is never closed: browsers cap how many may exist.
      void this.context.close().catch(() => undefined);
      throw error;
    }

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
