import type { MumbleParameters } from "../presets/types";
import { createSeededRandom, type SeededRandom } from "../random/seededRandom";
import { analyzeText } from "../utils/textAnalysis";
import type {
  EventKind,
  FormantPoint,
  MumbleSchedule,
  PauseKind,
  SyllableEvent,
  TextLanguage,
  TextRevealEvent,
  TextUnit,
} from "./types";

const FORMANTS: Record<string, FormantPoint> = {
  ah: { vowel: "ah", f1: 760, f2: 1220, f3: 2550 },
  oh: { vowel: "oh", f1: 520, f2: 860, f3: 2400 },
  ee: { vowel: "ee", f1: 300, f2: 2320, f3: 3100 },
  uh: { vowel: "uh", f1: 430, f2: 1100, f3: 2350 },
  ih: { vowel: "ih", f1: 390, f2: 1980, f3: 2850 },
  eh: { vowel: "eh", f1: 560, f2: 1850, f3: 2600 },
  oo: { vowel: "oo", f1: 330, f2: 760, f3: 2300 },
};

const LANGUAGE_VOWELS: Record<Exclude<TextLanguage, "punct">, readonly string[]> = {
  zh: ["ah", "oh", "uh", "ih", "eh"],
  en: ["ah", "ee", "ih", "oh", "uh", "eh", "oo"],
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function semitoneToRatio(semitone: number) {
  return 2 ** (semitone / 12);
}

function nextPauseKind(units: TextUnit[], index: number): PauseKind | undefined {
  const nextUnit = units[index + 1];
  return nextUnit?.kind === "pause" ? nextUnit.pauseKind : undefined;
}

function punctuationPitchOffset(kind: PauseKind | "none" | undefined, phraseProgress: number) {
  if (phraseProgress < 0.58) {
    return 0;
  }

  const tail = (phraseProgress - 0.58) / 0.42;
  if (kind === "question") {
    return 4.8 * tail;
  }
  if (kind === "exclaim") {
    return 1.9 * Math.sin(tail * Math.PI);
  }
  if (kind === "ellipsis") {
    return -3.2 * tail;
  }
  if (kind === "sentence") {
    return -4.8 * tail;
  }
  return 0;
}

function getPhraseSyllableCounts(units: TextUnit[]) {
  const counts = new Map<number, number>();
  units.forEach((unit) => {
    if (unit.kind === "syllable") {
      counts.set(unit.phraseIndex, (counts.get(unit.phraseIndex) ?? 0) + 1);
    }
  });
  return counts;
}

function pickFormantPair(
  rng: SeededRandom,
  language: TextLanguage,
  previousVowel: string | undefined,
) {
  const pool = language === "zh" ? LANGUAGE_VOWELS.zh : LANGUAGE_VOWELS.en;
  let startName = rng.pick(pool);
  if (pool.length > 1) {
    let guard = 0;
    while (startName === previousVowel && guard < 6) {
      startName = rng.pick(pool);
      guard += 1;
    }
  }

  let endName = rng.pick(pool);
  if (pool.length > 1) {
    let guard = 0;
    while (endName === startName && guard < 6) {
      endName = rng.pick(pool);
      guard += 1;
    }
  }

  return {
    start: FORMANTS[startName],
    end: FORMANTS[endName],
  };
}

function getEventKind(
  unit: TextUnit,
  phraseProgress: number,
  punctuationAfter: PauseKind | undefined,
  rng: SeededRandom,
): EventKind {
  if (
    punctuationAfter === "sentence" ||
    punctuationAfter === "question" ||
    punctuationAfter === "ellipsis"
  ) {
    return "ending";
  }

  if (punctuationAfter === "exclaim") {
    return "emphasis";
  }

  const longEnglishStart = unit.language === "en" && unit.eventCount >= 3 && unit.eventOrdinal === 0;
  const phraseHighPoint = phraseProgress > 0.32 && phraseProgress < 0.72;
  const languageChance = unit.language === "zh" ? 0.08 : 0.15;
  if (longEnglishStart || (phraseHighPoint && rng.next() < languageChance)) {
    return "emphasis";
  }

  return "quick";
}

function getLanguageTimingFactor(language: TextLanguage, eventKind: EventKind) {
  if (language === "zh") {
    return eventKind === "ending" ? 1.18 : 0.95;
  }
  return eventKind === "ending" ? 1.3 : eventKind === "emphasis" ? 1.08 : 1;
}

function getEndingGain(punctuationAfter: PauseKind | undefined, eventKind: EventKind) {
  if (punctuationAfter === "exclaim") {
    return 1.24;
  }
  if (punctuationAfter === "ellipsis") {
    return 0.72;
  }
  if (eventKind === "emphasis") {
    return 1.14;
  }
  if (eventKind === "ending") {
    return 0.96;
  }
  return 1;
}

export function buildSchedule(
  text: string,
  params: MumbleParameters,
  presetId: string,
): MumbleSchedule {
  const analysis = analyzeText(text, params.wordCountMultiplier);
  const seedKey = `${presetId}:${params.seed}:${analysis.normalizedText}`;
  const rng = createSeededRandom(seedKey);
  const syllableUnits = analysis.units.filter((unit) => unit.kind === "syllable");
  const eventCount = Math.max(1, syllableUnits.length);
  const phraseSyllableCounts = getPhraseSyllableCounts(analysis.units);
  const phrasePositions = new Map<number, number>();
  const events: SyllableEvent[] = [];
  const revealEvents: TextRevealEvent[] = [];

  let cursor = 0.03;
  let syllableIndex = 0;
  let lastVowel: string | undefined;

  analysis.units.forEach((unit, unitIndex) => {
    if (unit.kind === "pause") {
      if (unit.revealText) {
        revealEvents.push({
          index: revealEvents.length,
          unitId: unit.id,
          time: Number(cursor.toFixed(4)),
          text: unit.revealText,
          language: "punct",
          phraseIndex: unit.phraseIndex,
        });
      }
      cursor += (unit.pauseMs ?? 120) / 1000;
      return;
    }

    const phrasePosition = phrasePositions.get(unit.phraseIndex) ?? 0;
    const phraseCount = Math.max(1, phraseSyllableCounts.get(unit.phraseIndex) ?? 1);
    const phraseProgress = phraseCount <= 1 ? 1 : phrasePosition / (phraseCount - 1);
    const globalProgress = eventCount <= 1 ? 0 : syllableIndex / (eventCount - 1);
    const punctuationAfter = nextPauseKind(analysis.units, unitIndex);
    const phrase = analysis.phrases[unit.phraseIndex];
    const eventKind = getEventKind(unit, phraseProgress, punctuationAfter, rng);
    const formants = pickFormantPair(rng, unit.language, lastVowel);
    const lengthRandomness =
      unit.language === "zh"
        ? params.syllableLengthRandomness * rng.range(-0.35, 0.35)
        : params.syllableLengthRandomness * rng.range(-1, 1);
    const curveFactor = clamp(1 - params.speedCurve * (globalProgress - 0.5) * 0.65, 0.55, 1.65);
    const phraseFinalLengthening = phraseProgress > 0.72 ? 1 + (phraseProgress - 0.72) * 0.8 : 1;
    const ellipsisSlowdown = punctuationAfter === "ellipsis" ? 1.35 : 1;
    const duration = clamp(
      (params.syllableLengthMs / 1000) *
        (1 + lengthRandomness) *
        curveFactor *
        getLanguageTimingFactor(unit.language, eventKind) *
        phraseFinalLengthening *
        ellipsisSlowdown,
      0.028,
      0.52,
    );
    const languagePitchJitter =
      unit.language === "zh"
        ? params.pitchRandomSemitone * 0.58
        : params.pitchRandomSemitone;
    const pitchJitter = rng.range(-languagePitchJitter, languagePitchJitter);
    const phraseReset = phrasePosition === 0 ? rng.range(1.1, 2.2) : 0;
    const stressPitch = eventKind === "emphasis" ? rng.range(0.8, 2.0) : 0;
    const phraseEnding = punctuationAfter ?? phrase?.ending ?? analysis.ending;
    const endingPitch = params.pitchFallAtEnd
      ? punctuationPitchOffset(phraseEnding, phraseProgress)
      : 0;
    const formantPitch =
      formants.start.vowel === "ee" || formants.start.vowel === "ih"
        ? 1.2
        : formants.start.vowel === "oh" || formants.start.vowel === "oo"
          ? -1.1
          : 0;
    const freq = clamp(
      params.basicFreq *
        semitoneToRatio(pitchJitter + phraseReset + stressPitch + endingPitch + formantPitch),
      35,
      2600,
    );
    const timingRange =
      unit.language === "zh" ? params.timingJitterMs * 0.4 : params.timingJitterMs;
    const timingJitter = rng.range(-timingRange, timingRange) / 1000;
    const startTime = Math.max(0.01, cursor + timingJitter);
    const gain =
      rng.range(0.82, 1.03) *
      unit.weight *
      getEndingGain(punctuationAfter, eventKind) *
      (phrasePosition === 0 ? 1.08 : 1);
    const sentenceEnd =
      punctuationAfter === "sentence" ||
      punctuationAfter === "question" ||
      punctuationAfter === "ellipsis";
    const eventIndex = events.length;

    if (unit.revealText) {
      revealEvents.push({
        index: revealEvents.length,
        unitId: unit.id,
        time: Number(startTime.toFixed(4)),
        text: unit.revealText,
        language: unit.language,
        phraseIndex: unit.phraseIndex,
        eventIndex,
      });
    }

    events.push({
      index: syllableIndex,
      unitId: unit.id,
      language: unit.language,
      eventKind,
      time: Number(startTime.toFixed(4)),
      duration: Number(duration.toFixed(4)),
      frequency: Number(freq.toFixed(2)),
      gain: Number(clamp(gain, 0.18, 1.35).toFixed(3)),
      pan: Number(rng.range(-0.08, 0.08).toFixed(3)),
      filterFreq: Number(
        clamp(
          params.filterFreq *
            (formants.start.f2 / 1450) *
            (unit.language === "zh" ? 0.92 : 1) *
            rng.range(0.94, 1.06),
          120,
          9500,
        ).toFixed(2),
      ),
      filterQ: Number(clamp(params.filterQ * rng.range(0.82, 1.08), 0.1, 30).toFixed(2)),
      attack: Number(Math.max(0.001, params.attackMs / 1000).toFixed(4)),
      release: Number(Math.max(0.004, params.releaseMs / 1000).toFixed(4)),
      noiseAmount: Number(
        clamp(
          params.noiseAmount *
            rng.range(0.72, 1.22) *
            (eventKind === "emphasis" ? 1.18 : 1),
          0,
          1,
        ).toFixed(3),
      ),
      ringModFreq: Number(Math.max(0, params.ringModFreq * rng.range(0.96, 1.04)).toFixed(2)),
      ringModDepth: Number(clamp(params.ringModDepth, 0, 1).toFixed(3)),
      vowel: `${formants.start.vowel}-${formants.end.vowel}`,
      revealAt: Number(startTime.toFixed(4)),
      revealText: unit.revealText,
      phraseIndex: unit.phraseIndex,
      formantStart: formants.start,
      formantEnd: formants.end,
      sentenceEnd,
      punctuationAfter,
      noiseSeed: rng.int(1, 2147483646),
    });

    lastVowel = formants.start.vowel;
    phrasePositions.set(unit.phraseIndex, phrasePosition + 1);
    cursor += duration + rng.range(unit.language === "zh" ? 0.018 : 0.012, unit.language === "zh" ? 0.036 : 0.048);
    syllableIndex += 1;
  });

  const duration = Math.max(
    0.25,
    Math.max(
      events.reduce((max, event) => Math.max(max, event.time + event.duration + event.release), 0),
      revealEvents.reduce((max, event) => Math.max(max, event.time), 0),
    ) + 0.18,
  );

  return {
    presetId,
    seedKey,
    duration: Number(duration.toFixed(3)),
    analysis,
    params: { ...params },
    events,
    revealEvents,
  };
}
