import type { MumbleParameters } from "../presets/types";

export type PauseKind = "comma" | "sentence" | "question" | "exclaim";

export interface TextUnit {
  kind: "syllable" | "pause";
  source: string;
  weight: number;
  pauseMs?: number;
  pauseKind?: PauseKind;
}

export interface TextAnalysis {
  originalText: string;
  normalizedText: string;
  charCount: number;
  wordCount: number;
  sentenceCount: number;
  punctuationCount: number;
  estimatedSyllables: number;
  ending: PauseKind | "none";
  units: TextUnit[];
}

export interface SyllableEvent {
  index: number;
  time: number;
  duration: number;
  frequency: number;
  gain: number;
  pan: number;
  filterFreq: number;
  filterQ: number;
  attack: number;
  release: number;
  noiseAmount: number;
  ringModFreq: number;
  ringModDepth: number;
  vowel: string;
  sentenceEnd: boolean;
  punctuationAfter?: PauseKind;
  noiseSeed: number;
}

export interface MumbleSchedule {
  presetId: string;
  seedKey: string;
  duration: number;
  analysis: TextAnalysis;
  params: MumbleParameters;
  events: SyllableEvent[];
}
