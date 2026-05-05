import type { MumbleParameters } from "../presets/types";

export type PauseKind = "comma" | "sentence" | "question" | "exclaim" | "ellipsis";
export type TextLanguage = "zh" | "en" | "punct";
export type EventKind = "quick" | "emphasis" | "ending";

export interface FormantPoint {
  vowel: string;
  f1: number;
  f2: number;
  f3: number;
}

export interface TextToken {
  id: string;
  language: TextLanguage;
  text: string;
  displayText: string;
  phraseIndex: number;
  estimatedEvents: number;
  eventUnitIds: string[];
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
  language: TextLanguage;
  source: string;
  displayText: string;
  revealText: string;
  weight: number;
  phraseIndex: number;
  estimatedEvents: number;
  eventOrdinal: number;
  eventCount: number;
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
  analysis: TextAnalysis;
  params: MumbleParameters;
  events: SyllableEvent[];
  revealEvents: TextRevealEvent[];
}
