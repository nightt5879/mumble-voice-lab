// Regenerates the 12 cache-busted WAVs under public/samples/ that the
// listening showcase plays. Drives the same pipeline the live React app
// uses — buildSchedule + renderEventsToWav — so the audio matches what
// users get when they click "Export WAV" in the studio.
//
// Run with: npm run samples
//
// Requires: node-web-audio-api (OfflineAudioContext polyfill) + tsx.

import * as nodeAudio from "node-web-audio-api";
// Hoist Web Audio API constructors onto globalThis so the imported audio
// modules can use `new OfflineAudioContext(...)` exactly like in the browser.
for (const key of Object.keys(nodeAudio) as (keyof typeof nodeAudio)[]) {
  if (!(key in globalThis)) {
    (globalThis as unknown as Record<string, unknown>)[key] = nodeAudio[key];
  }
}

import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Buffer } from "node:buffer";

import { pinyin } from "pinyin-pro";
import { syllable } from "syllable";

import { buildSchedule } from "../src/audio/scheduler";
import { renderEventsToWav } from "../src/audio/wav";
import { defaultPresets } from "../src/presets/defaultPresets";
import type { LanguageTools } from "../src/utils/languageTools";
import type { EmotionId, SpeakingStyleId } from "../src/expression/types";

const HAN_RUN_PATTERN = /^[㐀-鿿]+$/;

function fallbackCutChinese(text: string) {
  return Array.from(text);
}

function countEnglishSyllables(word: string) {
  const cleaned = word.replace(/[^A-Za-z0-9']/g, "");
  if (!cleaned) return 1;
  return Math.max(1, Math.min(6, syllable(cleaned)));
}

function getChineseTone(char: string): 0 | 1 | 2 | 3 | 4 | undefined {
  if (!HAN_RUN_PATTERN.test(char)) return undefined;
  const [tone] = pinyin(char, { pattern: "num", toneSandhi: true, type: "array" });
  const parsed = Number(tone);
  return parsed >= 0 && parsed <= 4 ? (parsed as 0 | 1 | 2 | 3 | 4) : undefined;
}

async function makeLanguageTools(): Promise<LanguageTools> {
  // jieba-wasm ships a Node-conditional export that loads the WASM
  // synchronously. If anything goes wrong fall back to per-character
  // segmentation — the same fallback the live app uses on init failure.
  try {
    const jieba = (await import("jieba-wasm")) as {
      cut?: (text: string, hmm: boolean) => string[];
      default?: { cut?: (text: string, hmm: boolean) => string[] };
    };
    const cutFn = jieba.cut ?? jieba.default?.cut;
    if (typeof cutFn !== "function") {
      throw new Error("jieba.cut not exported from Node build");
    }
    return {
      status: "ready",
      cutChinese: (text: string) => {
        if (!HAN_RUN_PATTERN.test(text)) return fallbackCutChinese(text);
        const segments = cutFn(text, true).filter(Boolean);
        return segments.length > 0 ? segments : fallbackCutChinese(text);
      },
      countEnglishSyllables,
      getChineseTone,
    };
  } catch (error) {
    console.warn(
      `[samples] jieba-wasm unavailable in Node — falling back to per-char segmentation. (${
        error instanceof Error ? error.message : String(error)
      })`,
    );
    return {
      status: "fallback",
      cutChinese: fallbackCutChinese,
      countEnglishSyllables,
      getChineseTone,
    };
  }
}

interface SampleSpec {
  fileName: string;
  presetId: string;
  emotion: EmotionId;
  style: SpeakingStyleId;
  intensity: number;
  text: string;
}

const samples: SampleSpec[] = [
  {
    fileName: "cute-npc-happy-zh.wav",
    presetId: "cute-npc",
    emotion: "happy",
    style: "normal",
    intensity: 75,
    text: "早上好，旅行者！准备出发了吗？",
  },
  {
    fileName: "cute-npc-neutral-mixed.wav",
    presetId: "cute-npc",
    emotion: "neutral",
    style: "normal",
    intensity: 50,
    text: "你好 adventurer，今天的 quest 准备好了吗？",
  },
  {
    fileName: "cute-npc-whisper-zh.wav",
    presetId: "cute-npc",
    emotion: "neutral",
    style: "whisper",
    intensity: 75,
    text: "小声一点，森林里面好像有人在睡觉。",
  },
  {
    fileName: "robot-guard-formal-en.wav",
    presetId: "robot-guard",
    emotion: "neutral",
    style: "formal",
    intensity: 65,
    text: "Good morning, traveler! Ready?",
  },
  {
    fileName: "robot-guard-shout-mixed.wav",
    presetId: "robot-guard",
    emotion: "angry",
    style: "shout",
    intensity: 85,
    text: "警告！Gate opening in three seconds!",
  },
  {
    fileName: "robot-guard-chant-en.wav",
    presetId: "robot-guard",
    emotion: "neutral",
    style: "chant",
    intensity: 75,
    text: "Access granted. Step forward. Remain calm.",
  },
  {
    fileName: "tiny-creature-surprised-en.wav",
    presetId: "tiny-creature",
    emotion: "surprised",
    style: "normal",
    intensity: 80,
    text: "Oh! You found the shiny seed?",
  },
  {
    fileName: "tiny-creature-nervous-zh.wav",
    presetId: "tiny-creature",
    emotion: "nervous",
    style: "normal",
    intensity: 80,
    text: "等一下等一下！那个东西是不是在动？",
  },
  {
    fileName: "tired-villager-sleepy-zh.wav",
    presetId: "tired-villager",
    emotion: "sleepy",
    style: "normal",
    intensity: 75,
    text: "明天再说吧，我现在真的有点困了。",
  },
  {
    fileName: "tired-villager-sad-en.wav",
    presetId: "tired-villager",
    emotion: "sad",
    style: "normal",
    intensity: 75,
    text: "The lantern went out before we reached home.",
  },
  {
    fileName: "monster-scared-zh.wav",
    presetId: "monster",
    emotion: "scared",
    style: "normal",
    intensity: 80,
    text: "你听到了吗？刚才那边好像有什么声音。",
  },
  {
    fileName: "monster-angry-en.wav",
    presetId: "monster",
    emotion: "angry",
    style: "normal",
    intensity: 85,
    text: "Leave this cave now!",
  },
];

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const outDir = join(__dirname, "..", "public", "samples");
  await mkdir(outDir, { recursive: true });

  const languageTools = await makeLanguageTools();
  console.log(`[samples] languageTools.status = ${languageTools.status}`);
  console.log(`[samples] writing ${samples.length} clips to ${outDir}`);

  for (const spec of samples) {
    const preset = defaultPresets.find((p) => p.id === spec.presetId);
    if (!preset) throw new Error(`Unknown preset id: ${spec.presetId}`);

    const schedule = buildSchedule(
      spec.text,
      preset.params,
      preset.id,
      languageTools,
      { emotion: spec.emotion, style: spec.style, intensity: spec.intensity },
    );
    const blob = await renderEventsToWav(
      schedule.events,
      schedule.resolvedParams,
      schedule.duration,
    );
    const bytes = Buffer.from(await blob.arrayBuffer());
    await writeFile(join(outDir, spec.fileName), bytes);
    console.log(
      `  ✓ ${spec.fileName.padEnd(36)} ${schedule.events.length
        .toString()
        .padStart(3)} events  ${schedule.duration.toFixed(2)}s  ${(
        bytes.length / 1024
      ).toFixed(1)}kb`,
    );
  }

  console.log(`[samples] done.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
