import type { PauseKind, TextAnalysis, TextUnit } from "../audio/types";

const TOKEN_PATTERN =
  /[A-Za-z0-9']+|[\u3400-\u9fff]|[.,!?;:\u2026\u3002\uff01\uff1f\uff1b\uff1a]+/g;

function isPunctuation(token: string) {
  return /^[.,!?;:\u2026\u3002\uff01\uff1f\uff1b\uff1a]+$/.test(token);
}

function getPauseKind(token: string): PauseKind {
  if (/[?\uff1f]/.test(token)) {
    return "question";
  }
  if (/[!\uff01]/.test(token)) {
    return "exclaim";
  }
  if (/[.\u2026\u3002]/.test(token)) {
    return "sentence";
  }
  return "comma";
}

function getPauseMs(kind: PauseKind, token: string) {
  const repeats = Math.min(3, token.length);
  if (kind === "comma") {
    return 95 + repeats * 24;
  }
  if (kind === "question") {
    return 210 + repeats * 28;
  }
  if (kind === "exclaim") {
    return 180 + repeats * 22;
  }
  return 230 + repeats * 36;
}

function estimateWordSyllables(word: string) {
  if (/^[\u3400-\u9fff]$/.test(word)) {
    return 1;
  }

  const cleaned = word.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!cleaned) {
    return 1;
  }

  const vowelGroups = cleaned.match(/[aeiouy]+/g)?.length ?? 0;
  const lengthGuess = Math.ceil(cleaned.length / 4.2);
  return Math.max(1, Math.min(5, Math.round((vowelGroups + lengthGuess) / 2)));
}

function makeSyllableUnits(token: string, count: number): TextUnit[] {
  return Array.from({ length: count }, (_, index) => ({
    kind: "syllable",
    source: token,
    weight: index === count - 1 ? 1.08 : 1,
  }));
}

export function analyzeText(text: string, wordCountMultiplier: number): TextAnalysis {
  const trimmed = text.trim();
  const normalizedText = trimmed.replace(/\s+/g, " ");
  const fallbackText = normalizedText || "hm";
  const tokens = fallbackText.match(TOKEN_PATTERN) ?? ["hm"];
  const units: TextUnit[] = [];

  let wordCount = 0;
  let punctuationCount = 0;
  let sentenceCount = 0;
  let estimatedSyllables = 0;
  let ending: TextAnalysis["ending"] = "none";

  for (const token of tokens) {
    if (isPunctuation(token)) {
      const pauseKind = getPauseKind(token);
      punctuationCount += token.length;
      if (pauseKind !== "comma") {
        sentenceCount += 1;
      }
      ending = pauseKind;
      units.push({
        kind: "pause",
        source: token,
        weight: pauseKind === "comma" ? 0.6 : 1,
        pauseMs: getPauseMs(pauseKind, token),
        pauseKind,
      });
      continue;
    }

    wordCount += 1;
    const baseCount = estimateWordSyllables(token);
    const syllableCount = Math.max(
      1,
      Math.round(baseCount * Math.max(0.25, wordCountMultiplier)),
    );
    estimatedSyllables += syllableCount;
    units.push(...makeSyllableUnits(token, syllableCount));
  }

  if (!units.some((unit) => unit.kind === "syllable")) {
    const fallbackUnits = makeSyllableUnits("hm", 3);
    units.unshift(...fallbackUnits);
    estimatedSyllables += fallbackUnits.length;
  }

  return {
    originalText: text,
    normalizedText: fallbackText,
    charCount: normalizedText.replace(/\s/g, "").length,
    wordCount,
    sentenceCount: Math.max(1, sentenceCount || (estimatedSyllables > 0 ? 1 : 0)),
    punctuationCount,
    estimatedSyllables,
    ending,
    units,
  };
}
