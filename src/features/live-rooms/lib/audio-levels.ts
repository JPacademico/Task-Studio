/**
 * Who is talking, worked out in the browser rather than asked of the server. "Is this person
 * speaking" changes several times a second.
 */

/**
 * How loud counts as talking. Measured as RMS over a byte-domain waveform, so 0 is silence and 1 is
 * a square wave.
 */
const SPEAKING_THRESHOLD = 0.025;

/**
 * How long a tile keeps its ring after the sound stops. Without it the indicator flickers on every
 * syllable gap, which reads as a fault rather than as speech.
 */
const RELEASE_MS = 500;

/** How often the levels are sampled. 10 Hz is imperceptibly fast and cheap. */
const SAMPLE_MS = 100;

interface Tracked {
  analyser: AnalyserNode;
  source: MediaStreamAudioSourceNode;
  /**
   * Pinned to `ArrayBuffer` rather than left as a bare `Uint8Array`. The bare form widens to
   * `ArrayBufferLike`, which includes `SharedArrayBuffer`.
   */
  buffer: Uint8Array<ArrayBuffer>;
  /** When this stream was last above the threshold. */
  loudAt: number;
}

/**
 * A speaking detector for one call. Deliberately a plain object rather than a hook: it is
 * imperative, it owns resources that must be released in a particular order.
 */
export class SpeakingDetector {
  private context: AudioContext | null = null;
  private readonly tracked = new Map<string, Tracked>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private speaking = new Set<string>();

  /** Called whenever the set of talking participants changes. */
  constructor(private readonly onChange: (speaking: Set<string>) => void) {}

  /**
   * Watch one participant's audio. Takes the whole stream rather than a track because
   * `createMediaStreamSource` does, and re-adding an id replaces what was there.
   */
  add(id: string, stream: MediaStream): void {
    if (stream.getAudioTracks().length === 0) return;
    this.remove(id);

    const context = this.ensureContext();
    if (!context) return;

    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    // The smallest FFT the API allows. Nothing here looks at frequencies — it is an amplitude
    // measurement — so the window only has to be long enough to average out a single cycle.
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.2;
    source.connect(analyser);

    // Not connected to the destination, deliberately. The stream is already being played by an
    // `<audio>` element on the tile.
    this.tracked.set(id, {
      analyser,
      source,
      // Backed by an explicit `ArrayBuffer`: `getByteTimeDomainData` will not accept a view that
      // might be over a `SharedArrayBuffer`, which is what the bare constructor's type widens to.
      buffer: new Uint8Array(new ArrayBuffer(analyser.fftSize)),
      loudAt: 0,
    });

    this.start();
  }

  remove(id: string): void {
    const entry = this.tracked.get(id);
    if (!entry) return;

    entry.source.disconnect();
    entry.analyser.disconnect();
    this.tracked.delete(id);

    if (this.speaking.delete(id)) this.onChange(new Set(this.speaking));
    if (this.tracked.size === 0) this.stop();
  }

  /** Release everything. Safe to call twice. */
  close(): void {
    for (const id of [...this.tracked.keys()]) this.remove(id);
    this.stop();
    void this.context?.close().catch(() => undefined);
    this.context = null;
  }

  private ensureContext(): AudioContext | null {
    if (this.context) return this.context;

    try {
      this.context = new AudioContext();
      // Resumed explicitly, and the failure ignored. A context created outside a user gesture
      // starts suspended.
      void this.context.resume().catch(() => undefined);
      return this.context;
    } catch {
      // No Web Audio: the call works, the rings do not.
      return null;
    }
  }

  private start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.sample(), SAMPLE_MS);
  }

  private stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  private sample(): void {
    const now = Date.now();
    const next = new Set<string>();

    for (const [id, entry] of this.tracked) {
      entry.analyser.getByteTimeDomainData(entry.buffer);

      // RMS of the waveform, not the peak. A peak reading fires on a single click — a keyboard, a
      // door — which is exactly the thing a speaking indicator must not react to.
      let sum = 0;
      for (const sample of entry.buffer) {
        const centred = (sample - 128) / 128;
        sum += centred * centred;
      }

      if (Math.sqrt(sum / entry.buffer.length) > SPEAKING_THRESHOLD) entry.loudAt = now;
      if (now - entry.loudAt < RELEASE_MS) next.add(id);
    }

    // Compared rather than published every tick: this drives a React state update, and ten
    // re-renders a second of an unchanged set is the whole call's frame budget spent on nothing.
    if (next.size === this.speaking.size && [...next].every((id) => this.speaking.has(id))) {
      return;
    }

    this.speaking = next;
    this.onChange(new Set(next));
  }
}
