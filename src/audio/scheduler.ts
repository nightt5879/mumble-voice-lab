import type { MumbleParameters } from "../presets/types";
import { defaultExpressionSettings } from "../expression/defaultExpressions";
import { resolveExpression } from "../expression/resolveExpression";
import type { ExpressionSettings } from "../expression/types";
import { createSeededRandom, type SeededRandom } from "../random/seededRandom";
import { analyzeText } from "../utils/textAnalysis";
import type {
  EventKind,
  FormantPoint,
  MumbleSchedule,
  ParticleKind,
  PauseKind,
  PitchContour,
  SyllableEvent,
  TextLanguage,
  TextRevealEvent,
  TextUnit,
} from "./types";
import { fallbackLanguageTools, type LanguageTools } from "../utils/languageTools";

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

function getToneContour(tone: TextUnit["tone"], particleKind?: ParticleKind): PitchContour {
  let contour: PitchContour;

  if (tone === 1) {
    contour = { start: 0.04, mid: 0.08, end: 0.03 };
  } else if (tone === 2) {
    contour = { start: -0.22, mid: 0.08, end: 0.38 };
  } else if (tone === 3) {
    contour = { start: 0.04, mid: -0.42, end: 0.08 };
  } else if (tone === 4) {
    contour = { start: 0.42, mid: 0.02, end: -0.42 };
  } else if (tone === 0) {
    contour = { start: 0, mid: -0.04, end: -0.12 };
  } else {
    contour = { start: 0, mid: 0, end: 0 };
  }

  if (particleKind === "question") {
    return {
      start: contour.start,
      mid: contour.mid + 0.12,
      end: contour.end + 0.42,
    };
  }

  if (particleKind === "soft") {
    return {
      start: contour.start * 0.55,
      mid: contour.mid * 0.55,
      end: contour.end * 0.55 - 0.08,
    };
  }

  if (particleKind === "continuing") {
    return {
      start: contour.start,
      mid: contour.mid + 0.06,
      end: contour.end + 0.2,
    };
  }

  if (particleKind === "final") {
    return {
      start: contour.start,
      mid: contour.mid - 0.04,
      end: contour.end - 0.2,
    };
  }

  return contour;
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
  emphasisChanceBonus: number,
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

  if (unit.particleKind === "question" || unit.particleKind === "final") {
    return "ending";
  }

  if (unit.particleKind === "exclaim") {
    return "emphasis";
  }

  const longEnglishStart = unit.language === "en" && unit.eventCount >= 3 && unit.eventOrdinal === 0;
  const phraseHighPoint = phraseProgress > 0.32 && phraseProgress < 0.72;
  const languageChance = clamp(
    (unit.language === "zh" ? 0.08 : 0.15) + emphasisChanceBonus,
    0,
    0.45,
  );
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

function getParticleDurationFactor(kind: ParticleKind | undefined) {
  if (kind === "soft" || kind === "continuing") {
    return 1.12;
  }
  if (kind === "question" || kind === "final") {
    return 1.18;
  }
  if (kind === "exclaim") {
    return 0.88;
  }
  return 1;
}

function getParticleGainFactor(kind: ParticleKind | undefined) {
  if (kind === "soft" || kind === "continuing") {
    return 0.86;
  }
  if (kind === "question") {
    return 0.92;
  }
  if (kind === "exclaim") {
    return 1.14;
  }
  return 1;
}

function getPhraseBoundaryStrength(
  unit: TextUnit,
  phrasePosition: number,
  phraseCount: number,
  isWordEnd: boolean,
) {
  if (phrasePosition === 0 || phrasePosition === phraseCount - 1) {
    return 1;
  }
  if (unit.wordPosition === 0 || isWordEnd) {
    return 0.55;
  }
  return 0.15;
}

function getNextSyllableUnit(units: TextUnit[], index: number) {
  for (let nextIndex = index + 1; nextIndex < units.length; nextIndex += 1) {
    const unit = units[nextIndex];
    if (unit.kind === "syllable") {
      return unit;
    }
    if (unit.kind === "pause") {
      return undefined;
    }
  }
  return undefined;
}

function getTimingJitterRange(
  params: MumbleParameters,
  language: TextLanguage,
  duration: number,
  phraseBoundaryStrength: number,
) {
  const rawRange = language === "zh" ? params.timingJitterMs * 0.2 : params.timingJitterMs * 0.7;
  const boundaryFactor = phraseBoundaryStrength >= 1 ? 0.82 : 1;
  const durationCap = Math.max(3, duration * 1000 * 0.24);
  return Math.min(rawRange * boundaryFactor, durationCap);
}

function getContinuityGap(
  unit: TextUnit,
  nextSyllableUnit: TextUnit | undefined,
  duration: number,
  rng: SeededRandom,
) {
  const sameWord = nextSyllableUnit?.wordId === unit.wordId;
  const samePhrase = nextSyllableUnit?.phraseIndex === unit.phraseIndex;
  let gap: number;

  if (sameWord) {
    gap = rng.range(unit.language === "zh" ? 0.005 : 0.004, unit.language === "zh" ? 0.014 : 0.016);
  } else if (samePhrase) {
    gap = rng.range(unit.language === "zh" ? 0.018 : 0.01, unit.language === "zh" ? 0.042 : 0.038);
  } else {
    gap = rng.range(unit.language === "zh" ? 0.024 : 0.014, unit.language === "zh" ? 0.052 : 0.048);
  }

  const overlap = sameWord
    ? Math.min(duration * 0.2, 0.018)
    : samePhrase
      ? Math.min(duration * 0.08, 0.01)
      : 0;
  const minimumGap = sameWord ? -0.014 : samePhrase ? -0.004 : 0.006;
  return Math.max(minimumGap, gap - overlap);
}

function getSafeEnvelopeTimes(params: MumbleParameters, duration: number, frequency: number) {
  const lowFrequency = frequency < 120;
  const highFrequency = frequency > 520;
  const shortBlip = duration < 0.075;
  const minAttack = lowFrequency ? 0.011 : highFrequency || shortBlip ? 0.0055 : 0.004;
  const minRelease = lowFrequency ? 0.072 : highFrequency || shortBlip ? 0.038 : 0.028;

  return {
    attack: Math.max(params.attackMs / 1000, minAttack),
    release: Math.max(params.releaseMs / 1000, minRelease),
  };
}

function getSafeNoiseAmount(value: number, frequency: number, filterQ: number) {
  const frequencyFactor = frequency > 520 ? 0.82 : frequency < 120 ? 0.9 : 1;
  const resonanceFactor = 1 - clamp((filterQ - 5) / 16, 0, 0.26);
  return clamp(value * frequencyFactor * resonanceFactor, 0, 0.62);
}

export function buildSchedule(
  text: string,
  baseParams: MumbleParameters,
  presetId: string,
  languageTools: LanguageTools = fallbackLanguageTools,
  expressionSettings: ExpressionSettings = defaultExpressionSettings,
): MumbleSchedule {
  const resolvedExpression = resolveExpression(baseParams, expressionSettings);
  const params = resolvedExpression.params;
  const analysis = analyzeText(text, params.wordCountMultiplier, languageTools);
  const expressionSeed = [
    resolvedExpression.version,
    resolvedExpression.settings.emotion,
    resolvedExpression.settings.style,
    resolvedExpression.settings.intensity,
  ].join(":");
  const seedKey = `${presetId}:${params.seed}:${expressionSeed}:${analysis.languageToolStatus}:${analysis.normalizedText}`;
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
      cursor += ((unit.pauseMs ?? 120) / 1000) * resolvedExpression.modifiers.pauseScale;
      return;
    }

    const phrasePosition = phrasePositions.get(unit.phraseIndex) ?? 0;
    const phraseCount = Math.max(1, phraseSyllableCounts.get(unit.phraseIndex) ?? 1);
    const phraseProgress = phraseCount <= 1 ? 1 : phrasePosition / (phraseCount - 1);
    const globalProgress = eventCount <= 1 ? 0 : syllableIndex / (eventCount - 1);
    const punctuationAfter = nextPauseKind(analysis.units, unitIndex);
    const nextSyllableUnit = getNextSyllableUnit(analysis.units, unitIndex);
    const phrase = analysis.phrases[unit.phraseIndex];
    const eventKind = getEventKind(
      unit,
      phraseProgress,
      punctuationAfter,
      rng,
      resolvedExpression.modifiers.emphasisChanceBonus,
    );
    const formants = pickFormantPair(rng, unit.language, lastVowel);
    const lengthRandomness =
      unit.language === "zh"
        ? params.syllableLengthRandomness * rng.range(-0.35, 0.35)
        : params.syllableLengthRandomness * rng.range(-1, 1);
    const curveFactor = clamp(1 - params.speedCurve * (globalProgress - 0.5) * 0.65, 0.55, 1.65);
    const phraseFinalLengthening = phraseProgress > 0.72 ? 1 + (phraseProgress - 0.72) * 0.8 : 1;
    const ellipsisSlowdown = punctuationAfter === "ellipsis" ? 1.35 : 1;
    const particleDuration = getParticleDurationFactor(unit.particleKind);
    const duration = clamp(
      (params.syllableLengthMs / 1000) *
        (1 + lengthRandomness) *
        curveFactor *
        getLanguageTimingFactor(unit.language, eventKind) *
        phraseFinalLengthening *
        ellipsisSlowdown *
        particleDuration *
        (unit.tone === 0 ? 0.88 : 1),
      0.028,
      0.52,
    );
    const languagePitchJitter =
      unit.language === "zh"
        ? params.pitchRandomSemitone * 0.58
        : params.pitchRandomSemitone;
    const pitchJitter = rng.range(-languagePitchJitter, languagePitchJitter);
    const phraseReset =
      phrasePosition === 0
        ? rng.range(1.1, 2.2)
        : unit.wordPosition === 0
          ? rng.range(0.2, 0.7)
          : 0;
    const stressPitch = eventKind === "emphasis" ? rng.range(0.8, 2.0) : 0;
    const phraseEnding = punctuationAfter ?? phrase?.ending ?? analysis.ending;
    const endingPitch = params.pitchFallAtEnd
      ? punctuationPitchOffset(phraseEnding, phraseProgress)
      : 0;
    const expressionEndingPitch =
      phraseProgress > 0.45
        ? resolvedExpression.modifiers.endingPitchSemitone *
          ((phraseProgress - 0.45) / 0.55)
        : 0;
    const pitchContour =
      unit.language === "zh"
        ? getToneContour(unit.tone, unit.particleKind)
        : { start: 0, mid: 0, end: 0 };
    const formantPitch =
      formants.start.vowel === "ee" || formants.start.vowel === "ih"
        ? 1.2
        : formants.start.vowel === "oh" || formants.start.vowel === "oo"
          ? -1.1
          : 0;
    const freq = clamp(
      params.basicFreq *
        semitoneToRatio(
          pitchJitter +
            phraseReset +
            stressPitch +
            endingPitch +
            expressionEndingPitch +
            formantPitch +
            pitchContour.start * 0.35,
        ),
      35,
      2600,
    );
    const isWordEnd = nextSyllableUnit?.wordId !== unit.wordId;
    const phraseBoundaryStrength = getPhraseBoundaryStrength(
      unit,
      phrasePosition,
      phraseCount,
      isWordEnd,
    );
    const envelopeTimes = getSafeEnvelopeTimes(params, duration, freq);
    const timingRange = getTimingJitterRange(
      params,
      unit.language,
      duration,
      phraseBoundaryStrength,
    );
    const timingJitter = rng.range(-timingRange, timingRange) / 1000;
    const startTime = Math.max(0.01, cursor + timingJitter);
    const gain =
      rng.range(0.82, 1.03) *
      unit.weight *
      getEndingGain(punctuationAfter, eventKind) *
      getParticleGainFactor(unit.particleKind) *
      (unit.tone === 0 ? 0.82 : 1) *
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

    const filterQ = clamp(params.filterQ * rng.range(0.82, 1.08), 0.1, 30);
    const rawNoiseAmount =
      params.noiseAmount *
      rng.range(0.72, 1.22) *
      (eventKind === "emphasis" ? 1.18 : 1);

    events.push({
      index: syllableIndex,
      unitId: unit.id,
      language: unit.language,
      eventKind,
      tone: unit.tone,
      pitchContour,
      wordId: unit.wordId,
      phraseBoundaryStrength,
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
      filterQ: Number(filterQ.toFixed(2)),
      attack: Number(envelopeTimes.attack.toFixed(4)),
      release: Number(envelopeTimes.release.toFixed(4)),
      noiseAmount: Number(getSafeNoiseAmount(rawNoiseAmount, freq, filterQ).toFixed(3)),
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
    cursor += duration + getContinuityGap(unit, nextSyllableUnit, duration, rng);
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
    expressionVersion: resolvedExpression.version,
    expression: resolvedExpression.settings,
    resolvedExpression,
    analysis,
    params: { ...baseParams },
    resolvedParams: { ...params },
    events,
    revealEvents,
  };
}
