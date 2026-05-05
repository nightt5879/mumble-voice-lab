import type { MumbleParameters } from "../presets/types";
import type { ExpressionSettings, ResolvedExpression } from "../expression/types";

export type PauseKind = "comma" | "sentence" | "question" | "exclaim" | "ellipsis";
export type TextLanguage = "zh" | "en" | "punct";
export type EventKind = "quick" | "emphasis" | "ending";
export type LanguageToolStatus = "loading" | "ready" | "fallback";
export type ParticleKind = "question" | "soft" | "continuing" | "exclaim" | "final";

export interface PitchContour {
  start: number;
  mid: number;
  end: number;
}

export interface FormantPoint {
  vowel: string;
  f1: number;
  f2: number;
  f3: number;
}

export interface TextSegment {
  id: string;
  text: string;
  language: TextLanguage;
  tokenIds: string[];
  startTokenIndex: number;
  endTokenIndex: number;
}

export interface TextParticle {
  unitId: string;
  text: string;
  kind: ParticleKind;
  phraseIndex: number;
}

export interface TextToken {
  id: string;
  wordId: string;
  language: TextLanguage;
  text: string;
  displayText: string;
  phraseIndex: number;
  estimatedEvents: number;
  eventUnitIds: string[];
  tone?: 0 | 1 | 2 | 3 | 4;
  particleKind?: ParticleKind;
  pauseKind?: PauseKind;
  pauseMs?: number;
}

export interface TextPhrase {
  index: number;
  tokenIds: string[];
  unitIds: string[];
  startUnitIndex: number;
  endUnitIndex: number;
  ending: PauseKind | "none";
  languageCounts: Record<TextLanguage, number>;
}

export interface TextUnit {
  kind: "syllable" | "pause";
  id: string;
  tokenId: string;
  wordId: string;
  wordPosition: number;
  language: TextLanguage;
  source: string;
  displayText: string;
  revealText: string;
  weight: number;
  phraseIndex: number;
  estimatedEvents: number;
  eventOrdinal: number;
  eventCount: number;
  tone?: 0 | 1 | 2 | 3 | 4;
  particleKind?: ParticleKind;
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
  languageToolStatus: LanguageToolStatus;
  segments: TextSegment[];
  particles: TextParticle[];
  tokens: TextToken[];
  phrases: TextPhrase[];
  dominantLanguage: TextLanguage;
  languageCounts: Record<TextLanguage, number>;
  units: TextUnit[];
}

export interface SyllableEvent {
  index: number;
  unitId: string;
  language: TextLanguage;
  eventKind: EventKind;
  tone?: 0 | 1 | 2 | 3 | 4;
  pitchContour: PitchContour;
  wordId: string;
  phraseBoundaryStrength: number;
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
  revealAt: number;
  revealText: string;
  phraseIndex: number;
  formantStart: FormantPoint;
  formantEnd: FormantPoint;
  sentenceEnd: boolean;
  punctuationAfter?: PauseKind;
  noiseSeed: number;
}

export interface TextRevealEvent {
  index: number;
  unitId: string;
  time: number;
  text: string;
  language: TextLanguage;
  phraseIndex: number;
  eventIndex?: number;
}

export interface MumbleSchedule {
  presetId: string;
  seedKey: string;
  duration: number;
  expressionVersion: string;
  expression: ExpressionSettings;
  resolvedExpression: ResolvedExpression;
  analysis: TextAnalysis;
  params: MumbleParameters;
  resolvedParams: MumbleParameters;
  events: SyllableEvent[];
  revealEvents: TextRevealEvent[];
}
