import type { MumbleParameters } from "../presets/types";

export type EmotionId =
  | "neutral"
  | "happy"
  | "angry"
  | "sad"
  | "nervous"
  | "sleepy"
  | "surprised"
  | "scared";

export type SpeakingStyleId =
  | "normal"
  | "whisper"
  | "shout"
  | "mutter"
  | "formal"
  | "chant";

export interface ExpressionSettings {
  emotion: EmotionId;
  style: SpeakingStyleId;
  intensity: number;
}

export interface ExpressionModifiers {
  pitchShiftSemitone: number;
  durationMultiplier: number;
  timingJitterMultiplier: number;
  pitchRandomMultiplier: number;
  gainDb: number;
  noiseMultiplier: number;
  attackMultiplier: number;
  releaseMultiplier: number;
  pauseScale: number;
  endingPitchSemitone: number;
  emphasisChanceBonus: number;
  brightnessMultiplier: number;
}

export interface ExpressionDefinition<TId extends string> {
  id: TId;
  name: string;
  description: string;
  modifiers: Partial<ExpressionModifiers>;
}

export interface ResolvedExpression {
  version: string;
  settings: ExpressionSettings;
  emotion: ExpressionDefinition<EmotionId>;
  style: ExpressionDefinition<SpeakingStyleId>;
  intensity01: number;
  emotionWeight: number;
  styleWeight: number;
  modifiers: ExpressionModifiers;
  params: MumbleParameters;
  summary: string[];
}
