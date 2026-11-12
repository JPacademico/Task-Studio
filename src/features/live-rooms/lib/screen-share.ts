/**
 * A shared screen's sound, carried in the sender the microphone already has. The call negotiates
 * exactly one audio and one video transceiver per peer, once, and never again.
 */

/**
 * How loud the shared sound sits under the presenter's voice. Below one, so the person talking is
 * heard over the video they are talking about.
 */
const SCREEN_UNDER_VOICE = 0.7;

/** Where loose (whole-system) sound drops to while somebody else in the call is talking. */
const DUCKED = 0.08;

/** RMS over a float waveform that counts as somebody talking; the speaking rings use about this. */
const VOICE_THRESHOLD = 0.02;

/** How often the far end is checked, and how long the duck holds after it goes quiet. */
const GATE_SAMPLE_MS = 20;
const GATE_HOLD_MS = 450;

/** Seconds to reach the new level: fast down, so an echo's first syllable is caught, slow up. */
const DUCK_ATTACK = 0.008;
const DUCK_RELEASE = 0.25;

/**
 * One mix, for the length of one share. With `gate` on it also ducks the shared sound whenever the
 * other participants' audio is live: their voices are in whole-system sound and would echo back.
 */
export class ScreenAudioMix {
  private readonly context: AudioContext;
  private readonly sources: MediaStreamAudioSourceNode[];
  private readonly level: GainNode;
  private readonly farEnd: AnalyserNode;
  private readonly samples: Float32Array<ArrayBuffer>;
  private readonly references = new Map<string, MediaStreamAudioSourceNode>();
  private running = true;
  private voiceLive = true;
  private ducked = false;
  private loudAt = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  /** What the audio sender carries while this mix is in use. */
  readonly track: MediaStreamTrack;

  /**
   * 48kHz by default, because that is what Opus encodes. Pass `null` for the device's own rate:
   * Firefox refuses to mix a source whose rate differs from the context's.
   */
  constructor(
    screen: MediaStreamTrack,
    microphone: MediaStreamTrack | null,
    sampleRate: number | null = 48_000,
    private readonly gate = false,
  ) {
    this.context = new AudioContext({
      latencyHint: 'interactive',
      ...(sampleRate ? { sampleRate } : {}),
    });
    try {
      const destination = this.context.createMediaStreamDestination();
      // Mixed in mono, which is what the call's Opus sends anyway.
      destination.channelCount = 1;

      const sources: MediaStreamAudioSourceNode[] = [];
      if (microphone) {
        const voice = this.context.createMediaStreamSource(new MediaStream([microphone]));
        voice.connect(destination);
        sources.push(voice);
      }

      const sound = this.context.createMediaStreamSource(new MediaStream([screen]));
      this.level = this.context.createGain();
      this.level.gain.value = SCREEN_UNDER_VOICE;
      sound.connect(this.level).connect(destination);
      sources.push(sound);

      // The other participants, summed and measured, never played: the tiles already play them.
      this.farEnd = this.context.createAnalyser();
      this.farEnd.fftSize = 512;
      this.samples = new Float32Array(new ArrayBuffer(this.farEnd.fftSize * 4));

      this.sources = sources;
      this.track = destination.stream.getAudioTracks()[0];
    } catch (error) {
      // A context left open on failure is never closed: browsers cap how many may exist.
      void this.context.close().catch(() => undefined);
      throw error;
    }

    // A context made outside a click can start suspended; this one is made
    // to be sent at once.
    if (this.context.state === 'suspended') void this.context.resume().catch(() => undefined);
    if (this.gate) this.timer = setInterval(() => this.sample(), GATE_SAMPLE_MS);
  }

  /** Whether the mix is being sent. A mix nobody is sending sleeps. */
  setRunning(running: boolean): void {
    if (this.running === running || this.context.state === 'closed') return;
    this.running = running;
    void (running ? this.context.resume() : this.context.suspend()).catch(() => undefined);
  }

  /** Full level while the presenter is muted, under the voice while they talk. */
  setVoiceLive(live: boolean): void {
    if (this.voiceLive === live) return;
    this.voiceLive = live;
    if (!this.ducked) this.glide(this.baseLevel(), DUCK_RELEASE);
  }

  /** One participant's audio, as a reason to duck. Re-adding an id replaces it. */
  addReference(id: string, stream: MediaStream): void {
    if (!this.gate || stream.getAudioTracks().length === 0 || this.context.state === 'closed') {
      return;
    }
    this.removeReference(id);
    const source = this.context.createMediaStreamSource(stream);
    source.connect(this.farEnd);
    this.references.set(id, source);
  }

  removeReference(id: string): void {
    this.references.get(id)?.disconnect();
    this.references.delete(id);
  }

  close(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    for (const source of [...this.sources, ...this.references.values()]) source.disconnect();
    this.references.clear();
    this.track.stop();
    void this.context.close().catch(() => undefined);
  }

  private baseLevel(): number {
    return this.voiceLive ? SCREEN_UNDER_VOICE : 1;
  }

  private glide(target: number, seconds: number): void {
    if (this.context.state === 'closed') return;
    this.level.gain.setTargetAtTime(target, this.context.currentTime, seconds);
  }

  private sample(): void {
    if (!this.running || this.references.size === 0) return;

    this.farEnd.getFloatTimeDomainData(this.samples);
    let sum = 0;
    for (const sample of this.samples) sum += sample * sample;
    const now = Date.now();
    if (Math.sqrt(sum / this.samples.length) > VOICE_THRESHOLD) this.loudAt = now;

    const shouldDuck = now - this.loudAt < GATE_HOLD_MS;
    if (shouldDuck === this.ducked) return;
    this.ducked = shouldDuck;
    this.glide(shouldDuck ? DUCKED : this.baseLevel(), shouldDuck ? DUCK_ATTACK : DUCK_RELEASE);
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
  // A window brings its own app's sound only. Chrome's default is the whole system's.
  windowAudio: 'window',
} as DisplayMediaStreamOptions;

/** Chrome's label for one app's sound. Whole-system sound is "System Audio". */
const WINDOW_ONLY_SOUND = 'Application Audio';

/**
 * Whether a share's sound is only what is shown. Where the OS can't isolate a window or keep the
 * call out (Windows 10, older macOS), Chrome sends every app's sound — the call's own included.
 */
export const isSoundContained = (picture: MediaStreamTrack, sound: MediaStreamTrack): boolean => {
  const { displaySurface } = picture.getSettings();
  if (displaySurface === 'browser') return true;
  if (displaySurface === 'window') return sound.label === WINDOW_ONLY_SOUND;
  return (sound.getSettings() as { restrictOwnAudio?: boolean }).restrictOwnAudio === true;
};
