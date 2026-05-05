import type {
  ParticleKind,
  PauseKind,
  TextAnalysis,
  TextLanguage,
  TextParticle,
  TextPhrase,
  TextSegment,
  TextToken,
  TextUnit,
} from "../audio/types";
import { fallbackLanguageTools, type LanguageTools } from "./languageTools";

const TOKEN_PATTERN =
  /\s+|\.{3}|[A-Za-z0-9']+|[\u3400-\u9fff]+|[.,!?;:\u2026\u3002\uff01\uff1f\uff1b\uff1a\uff0c]+|[^\s]/g;
const PUNCTUATION_PATTERN = /^(\.{3}|[.,!?;:\u2026\u3002\uff01\uff1f\uff1b\uff1a\uff0c]+)$/;
const CHINESE_RUN_PATTERN = /^[\u3400-\u9fff]+$/;
const CHINESE_CHAR_PATTERN = /^[\u3400-\u9fff]$/;
const ENGLISH_PATTERN = /^[A-Za-z0-9']+$/;
const ENGLISH_PHRASE_EVENT_LIMIT = 8;
const CHINESE_PHRASE_EVENT_LIMIT = 6;

const PARTICLE_KIND: Record<string, ParticleKind> = {
  "吗": "question",
  "呢": "continuing",
  "吧": "continuing",
  "啊": "soft",
  "呀": "exclaim",
  "哦": "soft",
  "啦": "soft",
  "嘛": "soft",
  "了": "final",
};

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
  if (CHINESE_RUN_PATTERN.test(token)) {
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
    return 130 + repeats * 22;
  }
  if (kind === "question") {
    return 260 + repeats * 30;
  }
  if (kind === "exclaim") {
    return 210 + repeats * 22;
  }
  if (kind === "ellipsis") {
    return 470 + repeats * 80;
  }
  return 295 + repeats * 34;
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

function getPhraseSyllableCount(phrase: TextPhrase, unitsById: Map<string, TextUnit>) {
  return phrase.unitIds.reduce((count, unitId) => {
    const unit = unitsById.get(unitId);
    return count + (unit?.kind === "syllable" ? 1 : 0);
  }, 0);
}

function createSyllableUnit(args: {
  token: TextToken;
  source: string;
  displayText: string;
  revealText: string;
  ordinal: number;
  eventCount: number;
  wordPosition: number;
}): TextUnit {
  const { token, source, displayText, revealText, ordinal, eventCount, wordPosition } = args;

  return {
    kind: "syllable",
    id: `${token.id}-u${ordinal}`,
    tokenId: token.id,
    wordId: token.wordId,
    wordPosition,
    language: token.language,
    source,
    displayText,
    revealText,
    weight: ordinal === eventCount - 1 ? 1.08 : 1,
    phraseIndex: token.phraseIndex,
    estimatedEvents: eventCount,
    eventOrdinal: ordinal,
    eventCount,
    tone: token.tone,
    particleKind: token.particleKind,
  };
}

function makeChineseSegments(
  text: string,
  tokenStartIndex: number,
  tools: LanguageTools,
): TextSegment[] {
  const segments = tools.cutChinese(text);
  let tokenIndex = tokenStartIndex;

  return segments.map((segment, index) => {
    const charCount = Array.from(segment).length;
    const textSegment: TextSegment = {
      id: `seg-${tokenStartIndex}-${index}`,
      text: segment,
      language: "zh",
      tokenIds: [],
      startTokenIndex: tokenIndex,
      endTokenIndex: tokenIndex + charCount - 1,
    };
    tokenIndex += charCount;
    return textSegment;
  });
}

export function analyzeText(
  text: string,
  wordCountMultiplier: number,
  languageTools: LanguageTools = fallbackLanguageTools,
): TextAnalysis {
  const trimmed = text.trim();
  const normalizedText = trimmed.replace(/\s+/g, " ");
  const fallbackText = normalizedText || "hm";
  const rawTokens = fallbackText.match(TOKEN_PATTERN) ?? ["hm"];
  const tokens: TextToken[] = [];
  const phrases: TextPhrase[] = [];
  const segments: TextSegment[] = [];
  const particles: TextParticle[] = [];
  const units: TextUnit[] = [];
  const unitsById = new Map<string, TextUnit>();
  const languageCounts = makeLanguageCounts();

  let currentPhrase = createPhrase(0, 0);
  let pendingSpace = false;
  let wordCount = 0;
  let punctuationCount = 0;
  let estimatedSyllables = 0;
  let ending: TextAnalysis["ending"] = "none";

  const pushUnit = (unit: TextUnit) => {
    units.push(unit);
    unitsById.set(unit.id, unit);
  };

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

  const maybeStartLengthPhrase = (language: TextLanguage, incomingEvents: number) => {
    if (currentPhrase.unitIds.length === 0) {
      return;
    }

    const limit = language === "zh" ? CHINESE_PHRASE_EVENT_LIMIT : ENGLISH_PHRASE_EVENT_LIMIT;
    const phraseEventCount = getPhraseSyllableCount(currentPhrase, unitsById);
    if (phraseEventCount + incomingEvents > limit) {
      commitPhrase("none");
    }
  };

  const addPauseToken = (rawToken: string) => {
    const pauseKind = getPauseKind(rawToken);
    const tokenId = `tok-${tokens.length}`;
    const token: TextToken = {
      id: tokenId,
      wordId: tokenId,
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
      wordId: token.wordId,
      wordPosition: 0,
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
    pushUnit(unit);
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
  };

  const addEnglishToken = (rawToken: string, displayText: string) => {
    const language = getTokenLanguage(rawToken);
    const eventCount =
      language === "en"
        ? Math.max(
            1,
            Math.round(languageTools.countEnglishSyllables(rawToken) * Math.max(0.25, wordCountMultiplier)),
          )
        : 1;
    maybeStartLengthPhrase(language, eventCount);

    const tokenId = `tok-${tokens.length}`;
    const token: TextToken = {
      id: tokenId,
      wordId: `word-${tokenId}`,
      language,
      text: rawToken,
      displayText,
      phraseIndex: currentPhrase.index,
      estimatedEvents: eventCount,
      eventUnitIds: [],
    };
    const syllableUnits = Array.from({ length: eventCount }, (_, index) =>
      createSyllableUnit({
        token,
        source: rawToken,
        displayText,
        revealText: index === 0 ? displayText : "",
        ordinal: index,
        eventCount,
        wordPosition: index,
      }),
    );

    token.eventUnitIds = syllableUnits.map((unit) => unit.id);
    tokens.push(token);
    syllableUnits.forEach(pushUnit);
    currentPhrase.tokenIds.push(token.id);
    currentPhrase.unitIds.push(...token.eventUnitIds);
    currentPhrase.languageCounts[language] += 1;
    languageCounts[language] += 1;
    estimatedSyllables += eventCount;
    wordCount += 1;
    pendingSpace = false;
  };

  const addChineseRun = (rawToken: string, displayPrefix: string) => {
    const runSegments = makeChineseSegments(rawToken, tokens.length, languageTools);

    runSegments.forEach((segment, segmentIndex) => {
      const chars = Array.from(segment.text).filter((char) => CHINESE_CHAR_PATTERN.test(char));
      if (chars.length === 0) {
        return;
      }
      maybeStartLengthPhrase("zh", chars.length);

      const segmentForPhrase = {
        ...segment,
        id: `seg-${segments.length}`,
        startTokenIndex: tokens.length,
        endTokenIndex: tokens.length + chars.length - 1,
      };
      const wordId = segmentForPhrase.id;

      chars.forEach((char, charIndex) => {
        const tokenId = `tok-${tokens.length}`;
        const tone = languageTools.getChineseTone(char);
        const particleKind = PARTICLE_KIND[char];
        const displayText = segmentIndex === 0 && charIndex === 0 ? `${displayPrefix}${char}` : char;
        const token: TextToken = {
          id: tokenId,
          wordId,
          language: "zh",
          text: char,
          displayText,
          phraseIndex: currentPhrase.index,
          estimatedEvents: 1,
          eventUnitIds: [],
          tone,
          particleKind,
        };
        const unit = createSyllableUnit({
          token,
          source: char,
          displayText,
          revealText: displayText,
          ordinal: 0,
          eventCount: 1,
          wordPosition: charIndex,
        });

        token.eventUnitIds = [unit.id];
        tokens.push(token);
        pushUnit(unit);
        segmentForPhrase.tokenIds.push(token.id);
        currentPhrase.tokenIds.push(token.id);
        currentPhrase.unitIds.push(unit.id);
        currentPhrase.languageCounts.zh += 1;
        languageCounts.zh += 1;
        estimatedSyllables += 1;
        wordCount += 1;

        if (particleKind) {
          particles.push({
            unitId: unit.id,
            text: char,
            kind: particleKind,
            phraseIndex: currentPhrase.index,
          });
        }
      });

      segments.push(segmentForPhrase);
    });

    pendingSpace = false;
  };

  for (const rawToken of rawTokens) {
    if (/^\s+$/.test(rawToken)) {
      pendingSpace = true;
      continue;
    }

    if (isPunctuation(rawToken)) {
      addPauseToken(rawToken);
      continue;
    }

    const displayPrefix = pendingSpace ? " " : "";
    if (CHINESE_RUN_PATTERN.test(rawToken)) {
      addChineseRun(rawToken, displayPrefix);
      continue;
    }

    addEnglishToken(rawToken, `${displayPrefix}${rawToken}`);
  }

  if (!units.some((unit) => unit.kind === "syllable")) {
    addEnglishToken("hm", "hm");
  }

  if (currentPhrase.tokenIds.length > 0 || currentPhrase.unitIds.length > 0) {
    commitPhrase("none");
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
    languageToolStatus: languageTools.status,
    segments,
    particles,
    tokens,
    phrases,
    dominantLanguage,
    languageCounts,
    units,
  };
}
