import type { MumbleParameters, MumblePreset } from "./types";

export interface CustomPreset {
  id: string;
  name: string;
  swatch: string;
  basedOn?: string;
  savedAt: string;
  params: MumbleParameters;
}

export interface PresetConfigFile {
  schema: "mumble-voice-lab/preset";
  schemaVersion: "1.0";
  name: string;
  swatch: string;
  basedOn?: string;
  savedAt: string;
  params: MumbleParameters;
}

const STORAGE_KEY = "mumble-voice-lab-custom-presets";
const SCHEMA = "mumble-voice-lab/preset";
const SCHEMA_VERSION = "1.0";

interface ParamRange {
  key: keyof MumbleParameters;
  min: number;
  max: number;
}

const NUMERIC_RANGES: ParamRange[] = [
  { key: "basicFreq", min: 45, max: 900 },
  { key: "wordCountMultiplier", min: 0.35, max: 2.2 },
  { key: "syllableLengthMs", min: 35, max: 240 },
  { key: "syllableLengthRandomness", min: 0, max: 0.85 },
  { key: "pitchRandomSemitone", min: 0, max: 14 },
  { key: "speedCurve", min: -1, max: 1 },
  { key: "timingJitterMs", min: 0, max: 90 },
  { key: "ringModFreq", min: 0, max: 180 },
  { key: "ringModDepth", min: 0, max: 1 },
  { key: "noiseAmount", min: 0, max: 0.7 },
  { key: "filterFreq", min: 180, max: 5200 },
  { key: "filterQ", min: 0.4, max: 18 },
  { key: "attackMs", min: 1, max: 80 },
  { key: "releaseMs", min: 5, max: 190 },
  { key: "volumeDb", min: -24, max: 12 },
  { key: "seed", min: 1, max: 99999 },
];

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{3,8}$/.test(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function makeId(): string {
  const stamp = Date.now().toString(36);
  const rand = Math.floor(Math.random() * 0x100000)
    .toString(36)
    .padStart(4, "0");
  return `user-${stamp}-${rand}`;
}

export function loadCustomPresets(): CustomPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidStoredPreset);
  } catch {
    return [];
  }
}

export function saveCustomPresets(presets: CustomPreset[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch (error) {
    console.error("Failed to persist custom presets to localStorage", error);
  }
}

export function createCustomPreset(args: {
  name: string;
  swatch: string;
  basedOn?: string;
  params: MumbleParameters;
}): CustomPreset {
  return {
    id: makeId(),
    name: args.name.trim() || "Untitled",
    swatch: args.swatch,
    basedOn: args.basedOn,
    savedAt: new Date().toISOString(),
    params: { ...args.params },
  };
}

export function serializePreset(preset: {
  name: string;
  swatch: string;
  basedOn?: string;
  params: MumbleParameters;
  savedAt?: string;
}): PresetConfigFile {
  return {
    schema: SCHEMA,
    schemaVersion: SCHEMA_VERSION,
    name: preset.name,
    swatch: preset.swatch,
    basedOn: preset.basedOn,
    savedAt: preset.savedAt ?? new Date().toISOString(),
    params: { ...preset.params },
  };
}

export type ParseResult =
  | { ok: true; preset: CustomPreset }
  | { ok: false; reason: string };

export function parsePresetConfig(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    return { ok: false, reason: "JSON 解析失败" };
  }

  if (!raw || typeof raw !== "object") {
    return { ok: false, reason: "顶层不是 JSON 对象" };
  }

  const obj = raw as Record<string, unknown>;

  if (obj.schema !== SCHEMA) {
    return { ok: false, reason: `schema 字段必须是 "${SCHEMA}"` };
  }
  if (obj.schemaVersion !== SCHEMA_VERSION) {
    return {
      ok: false,
      reason: `schemaVersion 不支持（需要 ${SCHEMA_VERSION}）`,
    };
  }
  if (typeof obj.name !== "string" || obj.name.trim().length === 0) {
    return { ok: false, reason: "name 必须是非空字符串" };
  }
  if (!isHexColor(obj.swatch)) {
    return { ok: false, reason: "swatch 必须是十六进制颜色" };
  }
  if (obj.basedOn !== undefined && typeof obj.basedOn !== "string") {
    return { ok: false, reason: "basedOn 必须是字符串" };
  }
  if (typeof obj.savedAt !== "string") {
    return { ok: false, reason: "savedAt 必须是字符串" };
  }
  if (!obj.params || typeof obj.params !== "object") {
    return { ok: false, reason: "params 必须是对象" };
  }

  const params = obj.params as Record<string, unknown>;
  if (typeof params.pitchFallAtEnd !== "boolean") {
    return { ok: false, reason: "params.pitchFallAtEnd 必须是 boolean" };
  }

  for (const range of NUMERIC_RANGES) {
    const value = params[range.key];
    if (!isFiniteNumber(value)) {
      return { ok: false, reason: `params.${range.key} 必须是有限数值` };
    }
    if (value < range.min || value > range.max) {
      return {
        ok: false,
        reason: `params.${range.key} 超出范围 [${range.min}, ${range.max}]`,
      };
    }
  }

  const validatedParams: MumbleParameters = {
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

  const preset: CustomPreset = {
    id: makeId(),
    name: obj.name.trim(),
    swatch: obj.swatch,
    basedOn: obj.basedOn as string | undefined,
    savedAt: obj.savedAt,
    params: validatedParams,
  };

  return { ok: true, preset };
}

function isValidStoredPreset(value: unknown): value is CustomPreset {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.id !== "string" || typeof obj.name !== "string") return false;
  if (!isHexColor(obj.swatch)) return false;
  if (obj.basedOn !== undefined && typeof obj.basedOn !== "string") return false;
  if (typeof obj.savedAt !== "string") return false;
  if (!obj.params || typeof obj.params !== "object") return false;
  const params = obj.params as Record<string, unknown>;
  if (typeof params.pitchFallAtEnd !== "boolean") return false;
  for (const range of NUMERIC_RANGES) {
    if (!isFiniteNumber(params[range.key])) return false;
  }
  return true;
}

export function presetFilenameSlug(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 40);
  return cleaned || "preset";
}

export function asMumblePreset(custom: CustomPreset): MumblePreset {
  return {
    id: custom.id,
    name: custom.name,
    swatch: custom.swatch,
    params: custom.params,
  };
}
