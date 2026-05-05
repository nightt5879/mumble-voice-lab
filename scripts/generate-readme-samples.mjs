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
    fileName: "cute-npc-neutral-mixed.wav",
    text: "你好 adventurer，今天的 quest 准备好了吗？",
    seed: "cute-npc-mixed",
    baseFreq: 330,
    blipMs: 88,
    pitchRange: 5.2,
    gain: 0.5,
    noise: 0.055,
    ring: 0,
    emotion: "neutral-mixed",
  },
  {
    fileName: "cute-npc-whisper-zh.wav",
    text: "小声一点，森林里面好像有人在睡觉。",
    seed: "cute-whisper",
    baseFreq: 310,
    blipMs: 105,
    pitchRange: 3.5,
    gain: 0.32,
    noise: 0.17,
    ring: 0,
    emotion: "whisper",
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
    fileName: "robot-guard-shout-mixed.wav",
    text: "警告！Gate opening in three seconds!",
    seed: "robot-shout-mixed",
    baseFreq: 155,
    blipMs: 58,
    pitchRange: 2,
    gain: 0.56,
    noise: 0.07,
    ring: 56,
    emotion: "shout",
  },
  {
    fileName: "robot-guard-chant-en.wav",
    text: "Access granted. Step forward. Remain calm.",
    seed: "robot-chant",
    baseFreq: 132,
    blipMs: 112,
    pitchRange: 0.8,
    gain: 0.46,
    noise: 0.025,
    ring: 44,
    emotion: "chant",
  },
  {
    fileName: "tiny-creature-surprised-en.wav",
    text: "Oh! You found the shiny seed?",
    seed: "tiny-surprised",
    baseFreq: 670,
    blipMs: 48,
    pitchRange: 9,
    gain: 0.47,
    noise: 0.035,
    ring: 10,
    emotion: "surprised",
  },
  {
    fileName: "tiny-creature-nervous-zh.wav",
    text: "等一下等一下！那个东西是不是在动？",
    seed: "tiny-nervous",
    baseFreq: 650,
    blipMs: 44,
    pitchRange: 10.5,
    gain: 0.45,
    noise: 0.045,
    ring: 14,
    emotion: "nervous",
  },
  {
    fileName: "tired-villager-sleepy-zh.wav",
    text: "明天再说吧，我现在真的有点困了。",
    seed: "villager-sleepy",
    baseFreq: 170,
    blipMs: 150,
    pitchRange: 2.2,
    gain: 0.42,
    noise: 0.12,
    ring: 0,
    emotion: "sleepy",
  },
  {
    fileName: "tired-villager-sad-en.wav",
    text: "The lantern went out before we reached home.",
    seed: "villager-sad-en",
    baseFreq: 180,
    blipMs: 135,
    pitchRange: 2.7,
    gain: 0.42,
    noise: 0.1,
    ring: 0,
    emotion: "sad",
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
  {
    fileName: "monster-angry-en.wav",
    text: "Leave this cave now!",
    seed: "monster-angry-en",
    baseFreq: 86,
    blipMs: 96,
    pitchRange: 5,
    gain: 0.62,
    noise: 0.22,
    ring: 34,
    emotion: "angry",
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
