import type {
  PauseKind,
  TextAnalysis,
  TextLanguage,
  TextPhrase,
  TextToken,
  TextUnit,
} from "../audio/types";

const TOKEN_PATTERN =
  /\s+|\.{3}|[A-Za-z0-9']+|[\u3400-\u9fff]|[.,!?;:\u2026\u3002\uff01\uff1f\uff1b\uff1a\uff0c]+|[^\s]/g;
const PUNCTUATION_PATTERN = /^(\.{3}|[.,!?;:\u2026\u3002\uff01\uff1f\uff1b\uff1a\uff0c]+)$/;
const CHINESE_PATTERN = /^[\u3400-\u9fff]$/;
const ENGLISH_PATTERN = /^[A-Za-z0-9']+$/;
const PHRASE_EVENT_LIMIT = 8;

function makeLanguageCounts(): Record<TextLanguage, number> {
  return {
    zh: 0,
    en: 0,
    punct: 0,
  };
}

function isPunctuation(token: string) {
  return PUNCTUATION_PATTERN.test(token);
}

function getTokenLanguage(token: string): TextLanguage {
  if (CHINESE_PATTERN.test(token)) {
    return "zh";
  }
  if (ENGLISH_PATTERN.test(token)) {
    return "en";
  }
  return "punct";
}

function getPauseKind(token: string): PauseKind {
  if (token === "..." || /[\u2026]/.test(token)) {
    return "ellipsis";
  }
  if (/[?\uff1f]/.test(token)) {
    return "question";
  }
  if (/[!\uff01]/.test(token)) {
    return "exclaim";
  }
  if (/[.\u3002]/.test(token)) {
    return "sentence";
  }
  return "comma";
}

function getPauseMs(kind: PauseKind, token: string) {
  const repeats = Math.min(3, token.length);
  if (kind === "comma") {
    return 105 + repeats * 24;
  }
  if (kind === "question") {
    return 230 + repeats * 28;
  }
  if (kind === "exclaim") {
    return 185 + repeats * 22;
  }
  if (kind === "ellipsis") {
    return 360 + repeats * 70;
  }
  return 250 + repeats * 36;
}

function estimateWordSyllables(word: string) {
  if (CHINESE_PATTERN.test(word)) {
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

function createPhrase(index: number, startUnitIndex: number): TextPhrase {
  return {
    index,
    tokenIds: [],
    unitIds: [],
    startUnitIndex,
    endUnitIndex: startUnitIndex,
    ending: "none",
    languageCounts: makeLanguageCounts(),
  };
}

function isTerminalPause(kind: PauseKind) {
  return kind === "sentence" || kind === "question" || kind === "exclaim" || kind === "ellipsis";
}

function createSyllableUnit(
  token: TextToken,
  ordinal: number,
  eventCount: number,
): TextUnit {
  return {
    kind: "syllable",
    id: `${token.id}-u${ordinal}`,
    tokenId: token.id,
    language: token.language,
    source: token.text,
    displayText: token.displayText,
    revealText: ordinal === 0 ? token.displayText : "",
    weight: ordinal === eventCount - 1 ? 1.08 : 1,
    phraseIndex: token.phraseIndex,
    estimatedEvents: eventCount,
    eventOrdinal: ordinal,
    eventCount,
  };
}

export function analyzeText(text: string, wordCountMultiplier: number): TextAnalysis {
  const trimmed = text.trim();
  const normalizedText = trimmed.replace(/\s+/g, " ");
  const fallbackText = normalizedText || "hm";
  const rawTokens = fallbackText.match(TOKEN_PATTERN) ?? ["hm"];
  const tokens: TextToken[] = [];
  const phrases: TextPhrase[] = [];
  const units: TextUnit[] = [];
  const languageCounts = makeLanguageCounts();

  let currentPhrase = createPhrase(0, 0);
  let pendingSpace = false;
  let wordCount = 0;
  let punctuationCount = 0;
  let estimatedSyllables = 0;
  let ending: TextAnalysis["ending"] = "none";

  const commitPhrase = (phraseEnding: PauseKind | "none") => {
    currentPhrase.ending = phraseEnding;
    currentPhrase.endUnitIndex = Math.max(
      currentPhrase.startUnitIndex,
      units.length - 1,
    );
    if (currentPhrase.tokenIds.length > 0 || currentPhrase.unitIds.length > 0) {
      phrases.push(currentPhrase);
    }
    currentPhrase = createPhrase(phrases.length, units.length);
  };

  const maybeStartLengthPhrase = () => {
    const phraseEventCount = currentPhrase.unitIds.reduce((count, unitId) => {
      const unit = units.find((item) => item.id === unitId);
      return count + (unit?.kind === "syllable" ? 1 : 0);
    }, 0);

    if (phraseEventCount >= PHRASE_EVENT_LIMIT) {
      commitPhrase("none");
    }
  };

  for (const rawToken of rawTokens) {
    if (/^\s+$/.test(rawToken)) {
      pendingSpace = true;
      continue;
    }

    if (isPunctuation(rawToken)) {
      const pauseKind = getPauseKind(rawToken);
      const tokenId = `tok-${tokens.length}`;
      const token: TextToken = {
        id: tokenId,
        language: "punct",
        text: rawToken,
        displayText: rawToken,
        phraseIndex: currentPhrase.index,
        estimatedEvents: 0,
        eventUnitIds: [],
        pauseKind,
        pauseMs: getPauseMs(pauseKind, rawToken),
      };
      const unit: TextUnit = {
        kind: "pause",
        id: `${tokenId}-p0`,
        tokenId,
        language: "punct",
        source: rawToken,
        displayText: rawToken,
        revealText: rawToken,
        weight: pauseKind === "comma" ? 0.6 : 1,
        phraseIndex: currentPhrase.index,
        estimatedEvents: 0,
        eventOrdinal: 0,
        eventCount: 0,
        pauseMs: token.pauseMs,
        pauseKind,
      };

      tokens.push(token);
      units.push(unit);
      currentPhrase.tokenIds.push(token.id);
      currentPhrase.unitIds.push(unit.id);
      currentPhrase.languageCounts.punct += 1;
      languageCounts.punct += 1;
      punctuationCount += rawToken.length;
      ending = pauseKind;
      pendingSpace = false;

      if (isTerminalPause(pauseKind)) {
        commitPhrase(pauseKind);
      }
      continue;
    }

    maybeStartLengthPhrase();

    const language = getTokenLanguage(rawToken);
    const displayText = pendingSpace ? ` ${rawToken}` : rawToken;
    const baseCount = estimateWordSyllables(rawToken);
    const eventCount =
      language === "en"
        ? Math.max(1, Math.round(baseCount * Math.max(0.25, wordCountMultiplier)))
        : 1;
    const tokenId = `tok-${tokens.length}`;
    const token: TextToken = {
      id: tokenId,
      language,
      text: rawToken,
      displayText,
      phraseIndex: currentPhrase.index,
      estimatedEvents: eventCount,
      eventUnitIds: [],
    };
    const syllableUnits = Array.from({ length: eventCount }, (_, index) =>
      createSyllableUnit(token, index, eventCount),
    );

    token.eventUnitIds = syllableUnits.map((unit) => unit.id);
    tokens.push(token);
    units.push(...syllableUnits);
    currentPhrase.tokenIds.push(token.id);
    currentPhrase.unitIds.push(...token.eventUnitIds);
    currentPhrase.languageCounts[language] += 1;
    languageCounts[language] += 1;
    estimatedSyllables += eventCount;
    wordCount += 1;
    pendingSpace = false;
  }

  if (!units.some((unit) => unit.kind === "syllable")) {
    const token: TextToken = {
      id: "tok-fallback",
      language: "en",
      text: "hm",
      displayText: "hm",
      phraseIndex: currentPhrase.index,
      estimatedEvents: 2,
      eventUnitIds: [],
    };
    const fallbackUnits = [createSyllableUnit(token, 0, 2), createSyllableUnit(token, 1, 2)];
    token.eventUnitIds = fallbackUnits.map((unit) => unit.id);
    tokens.unshift(token);
    units.unshift(...fallbackUnits);
    currentPhrase.tokenIds.unshift(token.id);
    currentPhrase.unitIds.unshift(...token.eventUnitIds);
    currentPhrase.languageCounts.en += 1;
    languageCounts.en += 1;
    estimatedSyllables += fallbackUnits.length;
    wordCount += 1;
  }

  if (currentPhrase.tokenIds.length > 0 || currentPhrase.unitIds.length > 0) {
    commitPhrase(ending === "none" ? "none" : currentPhrase.ending);
  }

  const dominantLanguage =
    languageCounts.zh > languageCounts.en ? "zh" : languageCounts.en > 0 ? "en" : "zh";
  const sentenceCount = phrases.filter((phrase) => phrase.ending !== "none").length;

  return {
    originalText: text,
    normalizedText: fallbackText,
    charCount: normalizedText.replace(/\s/g, "").length,
    wordCount,
    sentenceCount: Math.max(1, sentenceCount || (estimatedSyllables > 0 ? 1 : 0)),
    punctuationCount,
    estimatedSyllables,
    ending,
    tokens,
    phrases,
    dominantLanguage,
    languageCounts,
    units,
  };
}
