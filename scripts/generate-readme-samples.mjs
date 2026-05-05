import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const sampleRate = 44100;
const outDir = join("public", "samples");

function createRng(seedText) {
  let seed = 2166136261;
  for (let index = 0; index < seedText.length; index += 1) {
    seed ^= seedText.charCodeAt(index);
    seed = Math.imul(seed, 16777619);
  }

  return () => {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function semitoneToRatio(semitone) {
  return 2 ** (semitone / 12);
}

function encodeWav(samples) {
  const bytesPerSample = 2;
  const channelCount = 1;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channelCount, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channelCount * bytesPerSample, 28);
  buffer.writeUInt16LE(channelCount * bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  samples.forEach((sample, index) => {
    const value = clamp(sample, -1, 1);
    const int16 = value < 0 ? value * 0x8000 : value * 0x7fff;
    buffer.writeInt16LE(Math.round(int16), 44 + index * bytesPerSample);
  });

  return buffer;
}

function renderMumble({ text, seed, baseFreq, blipMs, pitchRange, gain, noise, ring, emotion }) {
  const rng = createRng(`${seed}:${text}:${emotion}`);
  const units = Array.from(text).filter((char) => !/\s/.test(char));
  const eventCount = Math.max(8, Math.min(28, Math.round(units.length * 0.62)));
  const durationSeconds = eventCount * (blipMs / 1000 + 0.055) + 0.55;
  const samples = new Float32Array(Math.ceil(durationSeconds * sampleRate));
  let cursor = 0.08;

  for (let eventIndex = 0; eventIndex < eventCount; eventIndex += 1) {
    const progress = eventIndex / Math.max(1, eventCount - 1);
    const punctuationLift = /[?？]/.test(text) ? progress * 2.2 : 0;
    const sentenceFall = /[.。]/.test(text) ? -progress * 1.7 : 0;
    const emphasis = /[!！]/.test(text) && rng() > 0.62 ? 1.28 : 1;
    const start = Math.floor(cursor * sampleRate);
    const length = Math.floor((blipMs / 1000) * (0.75 + rng() * 0.55) * sampleRate);
    const frequency =
      baseFreq *
      semitoneToRatio((rng() * 2 - 1) * pitchRange + punctuationLift + sentenceFall);
    const ringFrequency = ring > 0 ? ring * (0.9 + rng() * 0.25) : 0;

    for (let offset = 0; offset < length; offset += 1) {
      const t = offset / sampleRate;
      const local = offset / Math.max(1, length - 1);
      const attack = Math.min(1, local / 0.18);
      const release = Math.min(1, (1 - local) / 0.38);
      const envelope = Math.sin(Math.min(1, attack * release) * Math.PI * 0.5);
      const vowelSweep = 1 + Math.sin(local * Math.PI) * 0.018;
      const carrier = Math.sin(2 * Math.PI * frequency * vowelSweep * t);
      const harmonic = Math.sin(2 * Math.PI * frequency * 2.01 * t) * 0.24;
      const ringSignal = ringFrequency > 0 ? 1 + Math.sin(2 * Math.PI * ringFrequency * t) * 0.35 : 1;
      const noiseSignal = (rng() * 2 - 1) * noise;
      const sample = (carrier + harmonic + noiseSignal) * ringSignal * envelope * gain * emphasis;
      const index = start + offset;
      if (index < samples.length) {
        samples[index] += sample;
      }
    }

    cursor += blipMs / 1000 + 0.03 + rng() * 0.07;
    if (/[,，、]/.test(units[eventIndex] ?? "")) {
      cursor += 0.12;
    }
  }

  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = Math.tanh(samples[index] * 1.35) * 0.78;
  }

  return encodeWav(samples);
}

const samples = [
  {
    fileName: "cute-npc-happy-zh.wav",
    text: "早上好，旅行者！准备出发了吗？",
    seed: "cute-npc-happy",
    baseFreq: 390,
    blipMs: 82,
    pitchRange: 6.2,
    gain: 0.52,
    noise: 0.04,
    ring: 0,
    emotion: "happy",
  },
  {
    fileName: "robot-guard-formal-en.wav",
    text: "Good morning, traveler! Ready?",
    seed: "robot-formal",
    baseFreq: 145,
    blipMs: 72,
    pitchRange: 1.4,
    gain: 0.48,
    noise: 0.025,
    ring: 48,
    emotion: "formal",
  },
  {
    fileName: "monster-scared-zh.wav",
    text: "你听到了吗？刚才那边好像有什么声音。",
    seed: "monster-scared",
    baseFreq: 96,
    blipMs: 118,
    pitchRange: 8.2,
    gain: 0.58,
    noise: 0.18,
    ring: 26,
    emotion: "scared",
  },
];

await mkdir(outDir, { recursive: true });
await Promise.all(
  samples.map(async (sample) => {
    const wav = renderMumble(sample);
    await writeFile(join(outDir, sample.fileName), wav);
  }),
);

console.log(`Generated ${samples.length} README audio samples in ${outDir}`);
