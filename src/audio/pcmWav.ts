import { createSeededRandom } from "../random/seededRandom";
import type { MumbleParameters } from "../presets/types";
import type { SyllableEvent } from "./types";

const SAMPLE_RATE = 44100;
const CHANNELS = 2;
const BYTES_PER_SAMPLE = 2;
const TAU = Math.PI * 2;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function dbToGain(db: number) {
  return 10 ** (db / 20);
}

function semitoneToRatio(semitone: number) {
  return 2 ** (semitone / 12);
}

function smoothStep(value: number) {
  return value * value * (3 - 2 * value);
}

function triangle(phase: number) {
  return 2 * Math.abs(2 * (phase - Math.floor(phase + 0.5))) - 1;
}

function floatToInt16(sample: number) {
  const clamped = clamp(sample, -1, 1);
  return clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
}

function writeString(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function envelopeAt(time: number, event: SyllableEvent) {
  const attack = clamp(event.attack, 0.0025, Math.max(0.003, event.duration * 0.55));
  const release = clamp(event.release, 0.018, 0.28);
  const sustainEnd = Math.max(attack + 0.004, event.duration - release * 0.32);
  const total = Math.max(event.duration + release, attack + release);

  if (time < 0 || time > total) return 0;
  if (time <= attack) return smoothStep(clamp(time / attack, 0, 1));
  if (time <= sustainEnd) {
    const progress = clamp((time - attack) / Math.max(0.001, sustainEnd - attack), 0, 1);
    return 1 - progress * 0.18;
  }

  const progress = clamp((time - sustainEnd) / Math.max(0.001, total - sustainEnd), 0, 1);
  return 0.82 * (1 - smoothStep(progress));
}

function contourFrequency(event: SyllableEvent, time: number) {
  const progress = clamp(time / Math.max(0.001, event.duration), 0, 1);
  const mid = 0.52;
  const startRatio = semitoneToRatio(event.pitchContour.start);
  const midRatio = semitoneToRatio(event.pitchContour.mid);
  const endRatio = semitoneToRatio(event.pitchContour.end + (event.sentenceEnd ? -0.25 : 0));

  if (progress <= mid) {
    const amount = progress / mid;
    return event.frequency * (startRatio + (midRatio - startRatio) * amount);
  }

  const amount = (progress - mid) / (1 - mid);
  return event.frequency * (midRatio + (endRatio - midRatio) * amount);
}

function encodeStereoWav(left: Float32Array, right: Float32Array) {
  const samples = left.length;
  const blockAlign = CHANNELS * BYTES_PER_SAMPLE;
  const dataSize = samples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, CHANNELS, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let index = 0; index < samples; index += 1) {
    view.setInt16(offset, floatToInt16(left[index]), true);
    offset += BYTES_PER_SAMPLE;
    view.setInt16(offset, floatToInt16(right[index]), true);
    offset += BYTES_PER_SAMPLE;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export async function renderEventsToPcmWav(
  events: SyllableEvent[],
  params: MumbleParameters,
  duration: number,
) {
  const frameCount = Math.ceil(Math.max(0.3, duration) * SAMPLE_RATE);
  const left = new Float32Array(frameCount);
  const right = new Float32Array(frameCount);
  const masterGain = clamp(dbToGain(params.volumeDb), 0.01, 6) * 0.55;

  for (const event of events) {
    const startFrame = Math.max(0, Math.floor(event.time * SAMPLE_RATE));
    const endFrame = Math.min(
      frameCount,
      Math.ceil((event.time + event.duration + event.release + 0.06) * SAMPLE_RATE),
    );
    const rng = createSeededRandom(`${event.noiseSeed}:${event.unitId}:${event.index}`);
    let phase = 0;
    let ringPhase = 0;
    let lowNoise = 0;
    const leftPan = Math.cos(((event.pan + 1) * Math.PI) / 4);
    const rightPan = Math.sin(((event.pan + 1) * Math.PI) / 4);

    for (let frame = startFrame; frame < endFrame; frame += 1) {
      const time = frame / SAMPLE_RATE - event.time;
      const envelope = envelopeAt(time, event);
      if (envelope <= 0) continue;

      const frequency = clamp(contourFrequency(event, time), 20, 8000);
      phase += frequency / SAMPLE_RATE;
      ringPhase += Math.max(0, event.ringModFreq) / SAMPLE_RATE;

      const base =
        event.eventKind === "emphasis" || event.ringModDepth > 0.35
          ? triangle(phase)
          : Math.sin(TAU * phase);
      const harmonic = Math.sin(TAU * phase * 2) * 0.18 + Math.sin(TAU * phase * 3) * 0.08;
      const ring =
        event.ringModDepth > 0 && event.ringModFreq > 0
          ? 1 - event.ringModDepth * 0.12 + Math.sin(TAU * ringPhase) * event.ringModDepth * 0.42
          : 1;
      const white = rng.range(-1, 1);
      lowNoise = lowNoise * 0.84 + white * 0.16;
      const noise = lowNoise * event.noiseAmount * 0.52;
      const sample = (base * 0.78 + harmonic + noise) * ring * envelope * event.gain * masterGain;

      left[frame] += sample * leftPan;
      right[frame] += sample * rightPan;
    }
  }

  for (let index = 0; index < frameCount; index += 1) {
    left[index] = Math.tanh(left[index] * 1.35);
    right[index] = Math.tanh(right[index] * 1.35);
  }

  return encodeStereoWav(left, right);
}
