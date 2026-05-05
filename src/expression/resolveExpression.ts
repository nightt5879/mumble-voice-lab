import type { MumbleParameters } from "../presets/types";
import {
  EXPRESSION_VERSION,
  emotionDefinitions,
  identityExpressionModifiers,
  speakingStyleDefinitions,
} from "./defaultExpressions";
import type {
  EmotionId,
  ExpressionDefinition,
  ExpressionModifiers,
  ExpressionSettings,
  ResolvedExpression,
  SpeakingStyleId,
} from "./types";

const ADDITIVE_KEYS: Array<keyof ExpressionModifiers> = [
  "pitchShiftSemitone",
  "gainDb",
  "endingPitchSemitone",
  "emphasisChanceBonus",
];

const MULTIPLIER_KEYS: Array<keyof ExpressionModifiers> = [
  "durationMultiplier",
  "timingJitterMultiplier",
  "pitchRandomMultiplier",
  "noiseMultiplier",
  "attackMultiplier",
  "releaseMultiplier",
  "pauseScale",
  "brightnessMultiplier",
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function semitoneToRatio(semitone: number) {
  return 2 ** (semitone / 12);
}

function findDefinition<TId extends string>(
  definitions: Array<ExpressionDefinition<TId>>,
  id: TId,
) {
  return definitions.find((definition) => definition.id === id) ?? definitions[0];
}

function applyDefinition(
  target: ExpressionModifiers,
  definition: Partial<ExpressionModifiers>,
  weight: number,
) {
  ADDITIVE_KEYS.forEach((key) => {
    target[key] += (definition[key] ?? 0) * weight;
  });

  MULTIPLIER_KEYS.forEach((key) => {
    target[key] *= lerp(1, definition[key] ?? 1, weight);
  });
}

function resolveParams(
  baseParams: MumbleParameters,
  modifiers: ExpressionModifiers,
): MumbleParameters {
  return {
    ...baseParams,
    basicFreq: Math.round(
      clamp(baseParams.basicFreq * semitoneToRatio(modifiers.pitchShiftSemitone), 35, 1200),
    ),
    syllableLengthMs: Math.round(
      clamp(baseParams.syllableLengthMs * modifiers.durationMultiplier, 30, 280),
    ),
    pitchRandomSemitone: Number(
      clamp(baseParams.pitchRandomSemitone * modifiers.pitchRandomMultiplier, 0, 16).toFixed(2),
    ),
    timingJitterMs: Math.round(
      clamp(baseParams.timingJitterMs * modifiers.timingJitterMultiplier, 0, 120),
    ),
    noiseAmount: Number(
      clamp(baseParams.noiseAmount * modifiers.noiseMultiplier, 0, 0.95).toFixed(3),
    ),
    filterFreq: Math.round(
      clamp(baseParams.filterFreq * modifiers.brightnessMultiplier, 120, 6200),
    ),
    attackMs: Math.round(clamp(baseParams.attackMs * modifiers.attackMultiplier, 1, 110)),
    releaseMs: Math.round(clamp(baseParams.releaseMs * modifiers.releaseMultiplier, 4, 240)),
    volumeDb: Number(clamp(baseParams.volumeDb + modifiers.gainDb, -30, 16).toFixed(1)),
  };
}

export function resolveExpression(
  baseParams: MumbleParameters,
  settings: ExpressionSettings,
): ResolvedExpression {
  const intensity01 = clamp(settings.intensity, 0, 100) / 100;
  const emotion = findDefinition<EmotionId>(emotionDefinitions, settings.emotion);
  const style = findDefinition<SpeakingStyleId>(speakingStyleDefinitions, settings.style);
  const styleWeight = settings.emotion === "neutral" ? intensity01 : intensity01 * 0.65;
  const modifiers: ExpressionModifiers = { ...identityExpressionModifiers };

  applyDefinition(modifiers, emotion.modifiers, intensity01);
  applyDefinition(modifiers, style.modifiers, styleWeight);

  return {
    version: EXPRESSION_VERSION,
    settings: {
      emotion: emotion.id,
      style: style.id,
      intensity: Math.round(intensity01 * 100),
    },
    emotion,
    style,
    intensity01,
    emotionWeight: intensity01,
    styleWeight,
    modifiers: {
      pitchShiftSemitone: Number(modifiers.pitchShiftSemitone.toFixed(3)),
      durationMultiplier: Number(modifiers.durationMultiplier.toFixed(3)),
      timingJitterMultiplier: Number(modifiers.timingJitterMultiplier.toFixed(3)),
      pitchRandomMultiplier: Number(modifiers.pitchRandomMultiplier.toFixed(3)),
      gainDb: Number(modifiers.gainDb.toFixed(3)),
      noiseMultiplier: Number(modifiers.noiseMultiplier.toFixed(3)),
      attackMultiplier: Number(modifiers.attackMultiplier.toFixed(3)),
      releaseMultiplier: Number(modifiers.releaseMultiplier.toFixed(3)),
      pauseScale: Number(modifiers.pauseScale.toFixed(3)),
      endingPitchSemitone: Number(modifiers.endingPitchSemitone.toFixed(3)),
      emphasisChanceBonus: Number(modifiers.emphasisChanceBonus.toFixed(3)),
      brightnessMultiplier: Number(modifiers.brightnessMultiplier.toFixed(3)),
    },
    params: resolveParams(baseParams, modifiers),
    summary: [emotion.name, style.name, `${Math.round(intensity01 * 100)}%`],
  };
}
