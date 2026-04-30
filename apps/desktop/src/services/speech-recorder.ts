// PCM audio capture using ScriptProcessorNode.
// Outputs 16 kHz, 16-bit mono Int16 utterance buffers via VAD.

const TARGET_SR = 16_000;
const BUFFER_SIZE = 4_096;
const SILENCE_THRESHOLD = 0.012;   // RMS below this = silence
const SILENCE_NEEDED_MS = 1_200;   // silence duration to end utterance
const MIN_SPEECH_MS = 400;         // minimum speech before we accept it
const MAX_SPEECH_MS = 10_000;      // force-flush at this duration

function rms(data: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
  return Math.sqrt(sum / data.length);
}

function downsampleMono(src: Float32Array, fromSR: number, toSR: number): Float32Array {
  if (fromSR === toSR) return src;
  const ratio = fromSR / toSR;
  const out = new Float32Array(Math.round(src.length / ratio));
  for (let i = 0; i < out.length; i++) {
    out[i] = src[Math.min(Math.round(i * ratio), src.length - 1)];
  }
  return out;
}

function float32ToInt16(src: Float32Array): Int16Array {
  const out = new Int16Array(src.length);
  for (let i = 0; i < src.length; i++) {
    const s = Math.max(-1, Math.min(1, src[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

export type UtteranceCallback = (pcm: ArrayBuffer) => void;

export class SpeechRecorder {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  private accumulated: Float32Array[] = [];
  private accumulatedSamples = 0;
  private speechDetected = false;
  private silenceStart: number | null = null;
  private speechStart: number | null = null;

  private onUtterance: UtteranceCallback | null = null;

  setOnUtterance(cb: UtteranceCallback): void {
    this.onUtterance = cb;
  }

  async start(deviceId?: string): Promise<void> {
    const constraints: MediaStreamConstraints = {
      audio: deviceId
        ? { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: true, sampleRate: TARGET_SR }
        : { echoCancellation: true, noiseSuppression: true, sampleRate: TARGET_SR },
    };

    this.stream = await navigator.mediaDevices.getUserMedia(constraints);

    this.ctx = new AudioContext();
    this.source = this.ctx.createMediaStreamSource(this.stream);

    // ScriptProcessorNode is deprecated but universally supported in Electron's Chromium
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    this.processor = this.ctx.createScriptProcessor(BUFFER_SIZE, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const downsampled = downsampleMono(input, this.ctx!.sampleRate, TARGET_SR);
      this.handleChunk(downsampled);
    };

    this.source.connect(this.processor);
    this.processor.connect(this.ctx.destination);
    this.reset();
  }

  stop(): void {
    if (this.processor) {
      this.processor.disconnect();
      this.processor.onaudioprocess = null;
      this.processor = null;
    }
    if (this.source) { this.source.disconnect(); this.source = null; }
    if (this.ctx) { void this.ctx.close(); this.ctx = null; }
    if (this.stream) { this.stream.getTracks().forEach((t) => t.stop()); this.stream = null; }
    this.reset();
  }

  private reset(): void {
    this.accumulated = [];
    this.accumulatedSamples = 0;
    this.speechDetected = false;
    this.silenceStart = null;
    this.speechStart = null;
  }

  private handleChunk(chunk: Float32Array): void {
    const energy = rms(chunk);
    const now = Date.now();
    const isSpeech = energy > SILENCE_THRESHOLD;

    if (isSpeech) {
      this.silenceStart = null;
      if (!this.speechDetected) {
        this.speechDetected = true;
        this.speechStart = now;
      }
      this.accumulated.push(chunk.slice());
      this.accumulatedSamples += chunk.length;
    } else {
      if (this.speechDetected) {
        // Still accumulate a bit during silence so words don't get cut off
        this.accumulated.push(chunk.slice());
        this.accumulatedSamples += chunk.length;

        if (this.silenceStart === null) this.silenceStart = now;

        const silenceMs = now - this.silenceStart;
        const speechMs = now - (this.speechStart ?? now);

        if (
          (silenceMs >= SILENCE_NEEDED_MS && speechMs >= MIN_SPEECH_MS) ||
          speechMs >= MAX_SPEECH_MS
        ) {
          this.flush();
        }
      }
    }
  }

  private flush(): void {
    if (this.accumulated.length === 0) { this.reset(); return; }

    // Merge all chunks
    const merged = new Float32Array(this.accumulatedSamples);
    let offset = 0;
    for (const chunk of this.accumulated) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    const int16 = float32ToInt16(merged);
    const copy = int16.buffer.slice(0) as ArrayBuffer;
    this.onUtterance?.(copy);
    this.reset();
  }
}
