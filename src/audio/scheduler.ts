import type { MumbleParameters } from "../presets/types";
import { createSeededRandom } from "../random/seededRandom";
import { analyzeText } from "../utils/textAnalysis";
import type { MumbleSchedule, PauseKind, SyllableEvent, TextUnit } from "./types";

const VOWELS = [
  { name: "ah", pitch: 0, filter: 0.9 },
  { name: "oh", pitch: -1.5, filter: 0.74 },
  { name: "ee", pitch: 2.5, filter: 1.45 },
  { name: "uh", pitch: -2.2, filter: 0.62 },
  { name: "ih", pitch: 1.1, filter: 1.18 },
] as const;

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

function progressFall(progress: number, enabled: boolean) {
  if (!enabled || progress < 0.68) {
    return 0;
  }
  return -5.5 * ((progress - 0.68) / 0.32);
}

function punctuationPitchOffset(
  ending: ReturnType<typeof analyzeText>["ending"],
  progress: number,
) {
  if (progress < 0.72) {
    return 0;
  }
  const tail = (progress - 0.72) / 0.28;

  if (ending === "question") {
    return 4.2 * tail;
  }
  if (ending === "exclaim") {
    return 1.5 * Math.sin(tail * Math.PI);
  }
  return 0;
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
  const events: SyllableEvent[] = [];

  let cursor = 0.03;
  let syllableIndex = 0;

  analysis.units.forEach((unit, unitIndex) => {
    if (unit.kind === "pause") {
      cursor += (unit.pauseMs ?? 120) / 1000;
      return;
    }

    const progress = eventCount <= 1 ? 0 : syllableIndex / (eventCount - 1);
    const vowel = rng.pick(VOWELS);
    const lengthRandomness = params.syllableLengthRandomness * rng.range(-1, 1);
    const curveFactor = clamp(1 - params.speedCurve * (progress - 0.5) * 0.65, 0.55, 1.65);
    const duration = clamp(
      (params.syllableLengthMs / 1000) * (1 + lengthRandomness) * curveFactor,
      0.025,
      0.45,
    );
    const pitchJitter = rng.range(
      -params.pitchRandomSemitone,
      params.pitchRandomSemitone,
    );
    const endingPitch =
      progressFall(progress, params.pitchFallAtEnd) +
      punctuationPitchOffset(analysis.ending, progress);
    const punctuationAfter = nextPauseKind(analysis.units, unitIndex);
    const exclaimBoost = punctuationAfter === "exclaim" ? 1.16 : 1;
    const sentenceEnd = punctuationAfter === "sentence" || punctuationAfter === "question";
    const freq = clamp(
      params.basicFreq * semitoneToRatio(pitchJitter + vowel.pitch + endingPitch),
      35,
      2600,
    );
    const timingJitter = rng.range(-params.timingJitterMs, params.timingJitterMs) / 1000;
    const startTime = Math.max(0.01, cursor + timingJitter);

    events.push({
      index: syllableIndex,
      time: Number(startTime.toFixed(4)),
      duration: Number(duration.toFixed(4)),
      frequency: Number(freq.toFixed(2)),
      gain: Number(clamp(rng.range(0.78, 1.0) * unit.weight * exclaimBoost, 0.2, 1.2).toFixed(3)),
      pan: Number(rng.range(-0.09, 0.09).toFixed(3)),
      filterFreq: Number(
        clamp(
          params.filterFreq * vowel.filter * rng.range(0.92, 1.08),
          90,
          9000,
        ).toFixed(2),
      ),
      filterQ: Number(clamp(params.filterQ * rng.range(0.88, 1.12), 0.1, 30).toFixed(2)),
      attack: Number(Math.max(0.001, params.attackMs / 1000).toFixed(4)),
      release: Number(Math.max(0.004, params.releaseMs / 1000).toFixed(4)),
      noiseAmount: Number(clamp(params.noiseAmount * rng.range(0.72, 1.22), 0, 1).toFixed(3)),
      ringModFreq: Number(Math.max(0, params.ringModFreq * rng.range(0.96, 1.04)).toFixed(2)),
      ringModDepth: Number(clamp(params.ringModDepth, 0, 1).toFixed(3)),
      vowel: vowel.name,
      sentenceEnd,
      punctuationAfter,
      noiseSeed: rng.int(1, 2147483646),
    });

    cursor += duration + rng.range(0.012, 0.045);
    syllableIndex += 1;
  });

  const duration = Math.max(
    0.25,
    events.reduce((max, event) => Math.max(max, event.time + event.duration + event.release), 0) +
      0.18,
  );

  return {
    presetId,
    seedKey,
    duration: Number(duration.toFixed(3)),
    analysis,
    params: { ...params },
    events,
  };
}
