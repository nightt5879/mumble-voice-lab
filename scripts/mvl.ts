import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, isAbsolute, join, resolve } from "node:path";
import { Buffer } from "node:buffer";
import { buildSchedule } from "../src/audio/scheduler";
import { createScheduleFile } from "../src/audio/scheduleFile";
import { renderEventsToPcmWav } from "../src/audio/pcmWav";
import { renderEventsToWav } from "../src/audio/wav";
import {
  defaultExpressionSettings,
  emotionDefinitions,
  speakingStyleDefinitions,
} from "../src/expression/defaultExpressions";
import type { EmotionId, ExpressionSettings, SpeakingStyleId } from "../src/expression/types";
import { defaultPresets } from "../src/presets/defaultPresets";
import type { MumbleParameters, MumblePreset } from "../src/presets/types";
import type { LanguageTools } from "../src/utils/languageTools";
import { makeNodeLanguageTools } from "./node-language-tools";

type FlagValue = string | boolean;
type AudioRenderer = "webaudio" | "pcm";
type LanguageToolsMode = "auto" | "fallback";

interface ParsedArgs {
  command?: string;
  flags: Record<string, FlagValue>;
}

interface RendererContext {
  languageTools: LanguageTools;
  audioRenderer: AudioRenderer;
}

interface BatchItem {
  id?: string;
  name?: string;
  text: string;
  preset?: string;
  presetFile?: string;
  emotion?: string;
  style?: string;
  intensity?: number | string;
  seed?: number | string;
}

export interface RenderResult {
  id: string;
  text: string;
  presetId: string;
  wavPath: string;
  schedulePath: string;
  duration: number;
  eventCount: number;
  bytes: number;
}

function parseArgs(argv: string[]): ParsedArgs {
  const [command, ...rest] = argv;
  const flags: Record<string, FlagValue> = {};

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected positional argument: ${arg}`);
    }

    const equalsIndex = arg.indexOf("=");
    if (equalsIndex >= 0) {
      flags[arg.slice(2, equalsIndex)] = arg.slice(equalsIndex + 1);
      continue;
    }

    const key = arg.slice(2);
    const next = rest[index + 1];
    if (next && !next.startsWith("--")) {
      flags[key] = next;
      index += 1;
    } else {
      flags[key] = true;
    }
  }

  return { command, flags };
}

function getString(flags: Record<string, FlagValue>, key: string) {
  const value = flags[key];
  if (value === undefined || value === false) return undefined;
  if (value === true) return "true";
  return value;
}

function getNumber(flags: Record<string, FlagValue>, key: string) {
  const value = getString(flags, key);
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`--${key} must be a finite number`);
  }
  return parsed;
}

function getAudioRenderer(flags: Record<string, FlagValue>): AudioRenderer {
  const value = getString(flags, "audio-renderer") ?? process.env.MVL_AUDIO_RENDERER ?? "webaudio";
  if (value === "webaudio" || value === "pcm") return value;
  throw new Error("--audio-renderer must be webaudio or pcm");
}

function getLanguageToolsMode(flags: Record<string, FlagValue>): LanguageToolsMode {
  const value = getString(flags, "language-tools") ?? process.env.MVL_LANGUAGE_TOOLS ?? "auto";
  if (value === "auto" || value === "fallback") return value;
  throw new Error("--language-tools must be auto or fallback");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function slugify(value: string) {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return cleaned || "mumble";
}

function resolveMaybeRelative(path: string, baseDir = process.cwd()) {
  return isAbsolute(path) ? path : resolve(baseDir, path);
}

async function readText(flags: Record<string, FlagValue>) {
  const inlineText = getString(flags, "text");
  if (inlineText !== undefined) return inlineText;

  const textFile = getString(flags, "text-file");
  if (textFile) {
    return readFile(resolveMaybeRelative(textFile), "utf8");
  }

  throw new Error("Missing --text or --text-file");
}

function requireParamObject(value: unknown): MumbleParameters {
  if (!value || typeof value !== "object") {
    throw new Error("Preset params must be an object");
  }

  const params = value as Record<string, unknown>;
  const keys: Array<keyof MumbleParameters> = [
    "basicFreq",
    "wordCountMultiplier",
    "syllableLengthMs",
    "syllableLengthRandomness",
    "pitchRandomSemitone",
    "speedCurve",
    "timingJitterMs",
    "ringModFreq",
    "ringModDepth",
    "noiseAmount",
    "filterFreq",
    "filterQ",
    "attackMs",
    "releaseMs",
    "volumeDb",
    "seed",
  ];

  for (const key of keys) {
    if (typeof params[key] !== "number" || !Number.isFinite(params[key])) {
      throw new Error(`Preset params.${key} must be a finite number`);
    }
  }

  if (typeof params.pitchFallAtEnd !== "boolean") {
    throw new Error("Preset params.pitchFallAtEnd must be a boolean");
  }

  return {
    basicFreq: params.basicFreq as number,
    wordCountMultiplier: params.wordCountMultiplier as number,
    syllableLengthMs: params.syllableLengthMs as number,
    syllableLengthRandomness: params.syllableLengthRandomness as number,
    pitchRandomSemitone: params.pitchRandomSemitone as number,
    pitchFallAtEnd: params.pitchFallAtEnd,
    speedCurve: params.speedCurve as number,
    timingJitterMs: params.timingJitterMs as number,
    ringModFreq: params.ringModFreq as number,
    ringModDepth: params.ringModDepth as number,
    noiseAmount: params.noiseAmount as number,
    filterFreq: params.filterFreq as number,
    filterQ: params.filterQ as number,
    attackMs: params.attackMs as number,
    releaseMs: params.releaseMs as number,
    volumeDb: params.volumeDb as number,
    seed: params.seed as number,
  };
}

async function loadPresetFromFile(path: string, baseDir?: string): Promise<MumblePreset> {
  const fullPath = resolveMaybeRelative(path, baseDir);
  const raw = JSON.parse(await readFile(fullPath, "utf8")) as Record<string, unknown>;

  if (raw.schema === "mumble-voice-lab/preset") {
    const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "Custom Preset";
    const basedOn = typeof raw.basedOn === "string" && raw.basedOn.trim() ? raw.basedOn.trim() : undefined;
    return {
      id: basedOn ?? slugify(name),
      name,
      swatch: typeof raw.swatch === "string" ? raw.swatch : "#f472b6",
      params: requireParamObject(raw.params),
    };
  }

  if (typeof raw.id === "string" && raw.params) {
    return {
      id: raw.id,
      name: typeof raw.name === "string" ? raw.name : raw.id,
      swatch: typeof raw.swatch === "string" ? raw.swatch : "#f472b6",
      params: requireParamObject(raw.params),
    };
  }

  throw new Error(`Unsupported preset file: ${fullPath}`);
}

async function resolvePreset(args: {
  presetId?: string;
  presetFile?: string;
  seed?: number;
  baseDir?: string;
}) {
  const source = args.presetFile
    ? await loadPresetFromFile(args.presetFile, args.baseDir)
    : defaultPresets.find((preset) => preset.id === (args.presetId ?? "cute-npc"));

  if (!source) {
    throw new Error(`Unknown preset: ${args.presetId}`);
  }

  const params = args.seed === undefined ? source.params : { ...source.params, seed: args.seed };
  return {
    ...source,
    params,
  };
}

function resolveExpressionFromValues(args: {
  emotion?: string;
  style?: string;
  intensity?: number | string;
}): ExpressionSettings {
  const emotion = args.emotion ?? defaultExpressionSettings.emotion;
  const style = args.style ?? defaultExpressionSettings.style;
  const validEmotion = emotionDefinitions.some((definition) => definition.id === emotion);
  const validStyle = speakingStyleDefinitions.some((definition) => definition.id === style);
  if (!validEmotion) throw new Error(`Unknown emotion: ${emotion}`);
  if (!validStyle) throw new Error(`Unknown style: ${style}`);

  const intensity =
    args.intensity === undefined ? defaultExpressionSettings.intensity : Number(args.intensity);
  if (!Number.isFinite(intensity)) {
    throw new Error("Intensity must be a finite number");
  }

  return {
    emotion: emotion as EmotionId,
    style: style as SpeakingStyleId,
    intensity: Math.round(clamp(intensity, 0, 100)),
  };
}

async function writeBlob(blob: Blob, path: string) {
  const bytes = Buffer.from(await blob.arrayBuffer());
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes);
  return bytes.length;
}

export async function createRendererContext(args: {
  audioRenderer?: AudioRenderer;
  languageToolsMode?: LanguageToolsMode;
} = {}): Promise<RendererContext> {
  const audioRenderer = args.audioRenderer ?? "webaudio";
  if (audioRenderer === "webaudio") {
    const nodeWebAudioModule = "./node-web-audio";
    const { installNodeWebAudio } = await import(nodeWebAudioModule);
    installNodeWebAudio();
  }

  return {
    audioRenderer,
    languageTools: await makeNodeLanguageTools(args.languageToolsMode),
  };
}

export async function renderMumbleAsset(args: {
  text: string;
  id?: string;
  preset: MumblePreset;
  expression: ExpressionSettings;
  wavPath: string;
  schedulePath: string;
  context: RendererContext;
}): Promise<RenderResult> {
  const id = args.id ?? `${args.preset.id}-${args.preset.params.seed}`;
  const schedule = buildSchedule(
    args.text,
    args.preset.params,
    args.preset.id,
    args.context.languageTools,
    args.expression,
  );
  const wav =
    args.context.audioRenderer === "pcm"
      ? await renderEventsToPcmWav(schedule.events, schedule.resolvedParams, schedule.duration)
      : await renderEventsToWav(schedule.events, schedule.resolvedParams, schedule.duration);
  const bytes = await writeBlob(wav, args.wavPath);
  const scheduleFile = createScheduleFile({
    id,
    text: args.text,
    preset: args.preset,
    schedule,
  });

  await mkdir(dirname(args.schedulePath), { recursive: true });
  await writeFile(args.schedulePath, JSON.stringify(scheduleFile, null, 2), "utf8");

  return {
    id,
    text: args.text,
    presetId: args.preset.id,
    wavPath: args.wavPath,
    schedulePath: args.schedulePath,
    duration: schedule.duration,
    eventCount: schedule.events.length,
    bytes,
  };
}

async function runRender(flags: Record<string, FlagValue>) {
  const text = await readText(flags);
  const seed = getNumber(flags, "seed");
  const outDir = resolveMaybeRelative(getString(flags, "out-dir") ?? "mvl-output");
  const preset = await resolvePreset({
    presetId: getString(flags, "preset"),
    presetFile: getString(flags, "preset-file"),
    seed,
  });
  const expression = resolveExpressionFromValues({
    emotion: getString(flags, "emotion"),
    style: getString(flags, "style"),
    intensity: getString(flags, "intensity"),
  });
  const audioRenderer = getAudioRenderer(flags);
  const languageToolsMode = getLanguageToolsMode(flags);
  const id = getString(flags, "id") ?? getString(flags, "name") ?? `${preset.id}-${slugify(text)}-${preset.params.seed}`;
  const name = slugify(getString(flags, "name") ?? id);
  const wavPath = resolveMaybeRelative(getString(flags, "wav") ?? join(outDir, `${name}.wav`));
  const schedulePath = resolveMaybeRelative(
    getString(flags, "schedule") ?? join(outDir, `${name}.mumble.json`),
  );
  const context = await createRendererContext({ audioRenderer, languageToolsMode });
  const result = await renderMumbleAsset({
    text,
    id,
    preset,
    expression,
    wavPath,
    schedulePath,
    context,
  });

  const manifestPath = getString(flags, "manifest");
  if (manifestPath) {
    await mkdir(dirname(resolveMaybeRelative(manifestPath)), { recursive: true });
    await writeFile(resolveMaybeRelative(manifestPath), JSON.stringify(result, null, 2), "utf8");
  }

  if (flags.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(
      `[mvl] rendered ${basename(result.wavPath)} (${result.eventCount} events, ${result.duration.toFixed(
        2,
      )}s, ${(result.bytes / 1024).toFixed(1)}kb)`,
    );
  }

  return result;
}

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  row.push(field);
  rows.push(row);

  const [header, ...body] = rows.filter((candidate) => candidate.some((cell) => cell.trim()));
  if (!header) return [];
  return body.map((cells) => {
    const record: Record<string, string> = {};
    header.forEach((key, index) => {
      record[key.trim()] = cells[index]?.trim() ?? "";
    });
    return record;
  });
}

async function loadBatchItems(inputPath: string): Promise<BatchItem[]> {
  const fullPath = resolveMaybeRelative(inputPath);
  const text = await readFile(fullPath, "utf8");
  if (extname(fullPath).toLowerCase() === ".csv") {
    return parseCsv(text).map((row) => ({
      id: row.id,
      name: row.name,
      text: row.text,
      preset: row.preset,
      presetFile: row.presetFile || row.preset_file,
      emotion: row.emotion,
      style: row.style,
      intensity: row.intensity,
      seed: row.seed,
    }));
  }

  const parsed = JSON.parse(text) as unknown;
  const items = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as { items?: unknown[] }).items)
      ? (parsed as { items: unknown[] }).items
      : undefined;

  if (!items) {
    throw new Error("Batch JSON must be an array or an object with an items array");
  }

  return items.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Batch item ${index + 1} must be an object`);
    }
    const typed = item as BatchItem;
    if (typeof typed.text !== "string" || !typed.text.trim()) {
      throw new Error(`Batch item ${index + 1} is missing text`);
    }
    return typed;
  });
}

async function runBatch(flags: Record<string, FlagValue>) {
  const input = getString(flags, "input");
  if (!input) throw new Error("Missing --input");

  const fullInput = resolveMaybeRelative(input);
  const inputDir = dirname(fullInput);
  const outDir = resolveMaybeRelative(getString(flags, "out-dir") ?? "mvl-output");
  const defaultPreset = getString(flags, "preset");
  const defaultPresetFile = getString(flags, "preset-file");
  const audioRenderer = getAudioRenderer(flags);
  const languageToolsMode = getLanguageToolsMode(flags);
  const items = await loadBatchItems(fullInput);
  const context = await createRendererContext({ audioRenderer, languageToolsMode });
  const results: RenderResult[] = [];

  for (const [index, item] of items.entries()) {
    const seed = item.seed === undefined || item.seed === "" ? getNumber(flags, "seed") : Number(item.seed);
    if (seed !== undefined && !Number.isFinite(seed)) {
      throw new Error(`Batch item ${index + 1} has invalid seed`);
    }

    const preset = await resolvePreset({
      presetId: item.preset || defaultPreset,
      presetFile: item.presetFile || defaultPresetFile,
      seed,
      baseDir: inputDir,
    });
    const expression = resolveExpressionFromValues({
      emotion: item.emotion || getString(flags, "emotion"),
      style: item.style || getString(flags, "style"),
      intensity: item.intensity ?? getString(flags, "intensity"),
    });
    const id = item.id || item.name || `${String(index + 1).padStart(3, "0")}-${preset.id}`;
    const name = slugify(id);
    const result = await renderMumbleAsset({
      text: item.text,
      id,
      preset,
      expression,
      wavPath: join(outDir, `${name}.wav`),
      schedulePath: join(outDir, `${name}.mumble.json`),
      context,
    });
    results.push(result);
    console.log(`[mvl] ${index + 1}/${items.length} ${basename(result.wavPath)}`);
  }

  const manifest = {
    schema: "mumble-voice-lab/batch-manifest",
    schemaVersion: "1.0",
    createdAt: new Date().toISOString(),
    input: fullInput,
    outDir,
    count: results.length,
    items: results,
  };
  const manifestPath = resolveMaybeRelative(
    getString(flags, "manifest") ?? join(outDir, "mumble-batch-manifest.json"),
  );
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  if (flags.json) {
    console.log(JSON.stringify(manifest, null, 2));
  } else {
    console.log(`[mvl] batch complete: ${results.length} items -> ${manifestPath}`);
  }

  return manifest;
}

function printHelp() {
  console.log(`Mumble Voice Lab CLI

Usage:
  npm run mvl -- render --text "Good morning!" --preset cute-npc --out-dir out
  npm run mvl -- batch --input dialogue.json --out-dir out

render options:
  --text <text>              Dialogue text.
  --text-file <path>         Read dialogue text from a UTF-8 file.
  --preset <id>              Built-in preset id. Default: cute-npc.
  --preset-file <path>       mumble-voice-lab/preset JSON or raw preset JSON.
  --emotion <id>             neutral, happy, angry, sad, nervous, sleepy, surprised, scared.
  --style <id>               normal, whisper, shout, mutter, formal, chant.
  --intensity <0-100>        Expression intensity. Default: 65.
  --seed <number>            Override the preset seed.
  --id <id>                  Schedule id.
  --name <name>              Output filename stem.
  --out-dir <path>           Output directory. Default: mvl-output.
  --wav <path>               Exact WAV output path.
  --schedule <path>          Exact schedule JSON output path.
  --manifest <path>          Write a small render result JSON file.
  --json                     Print result JSON.
  --audio-renderer <mode>    webaudio or pcm. Default: webaudio.
  --language-tools <mode>    auto or fallback. Default: auto.

batch input:
  JSON array/object with items, or CSV with headers:
  id,text,preset,presetFile,emotion,style,intensity,seed
`);
}

export async function runMvl(argv = process.argv.slice(2)) {
  const { command, flags } = parseArgs(argv);

  if (!command || command === "help" || flags.help) {
    printHelp();
    return undefined;
  }

  if (command === "render") {
    return runRender(flags);
  }

  if (command === "batch") {
    return runBatch(flags);
  }

  throw new Error(`Unknown command: ${command}`);
}

const directEntry = process.argv[1] ? resolve(process.argv[1]) : "";

if (
  process.env.MVL_DISABLE_AUTO_RUN !== "1" &&
  /(^|[\\/])mvl\.(ts|js|cjs|mjs)$/.test(directEntry)
) {
  runMvl().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
