import type { MumbleParameters } from "../presets/types";
import { createSeededRandom } from "../random/seededRandom";
import type { SyllableEvent } from "./types";

let sharedContext: AudioContext | undefined;
let activePlayback: MumblePlaybackHandle | undefined;
let activeChatterHandles: MumblePlaybackHandle[] = [];
const silenceGain = 0.0001;

export interface MumblePlaybackHandle {
  startedAt: number;
  stop: () => void;
}

function dbToGain(db: number) {
  return 10 ** (db / 20);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function semitoneToRatio(semitone: number) {
  return 2 ** (semitone / 12);
}

function smoothStep(value: number) {
  return value * value * (3 - 2 * value);
}

function resolveEnvelopeTimes(event: SyllableEvent) {
  const lowFrequency = event.frequency < 120;
  const highFrequency = event.frequency > 520;
  const shortBlip = event.duration < 0.075;
  const minAttack = lowFrequency ? 0.011 : highFrequency || shortBlip ? 0.0055 : 0.004;
  const minRelease = lowFrequency ? 0.072 : highFrequency || shortBlip ? 0.038 : 0.028;

  return {
    attack: Math.max(event.attack, minAttack),
    release: Math.max(event.release, minRelease),
  };
}

function makeNoiseBuffer(
  context: BaseAudioContext,
  duration: number,
  seed: number,
  brightness: number,
) {
  const sampleCount = Math.max(1, Math.ceil(context.sampleRate * duration));
  const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
  const data = buffer.getChannelData(0);
  const rng = createSeededRandom(seed);
  const brightBlend = clamp(brightness, 0.06, 0.24);
  let lowNoise = 0;
  let midNoise = 0;

  for (let index = 0; index < sampleCount; index += 1) {
    const white = rng.range(-1, 1);
    lowNoise = lowNoise * 0.88 + white * 0.12;
    midNoise = midNoise * 0.56 + white * 0.44;
    data[index] = lowNoise * (1 - brightBlend) + midNoise * brightBlend;
  }

  return buffer;
}

function scheduleEnvelope(
  gain: AudioParam,
  start: number,
  duration: number,
  attack: number,
  release: number,
  peak: number,
) {
  const attackTime = clamp(attack, 0.0025, Math.max(0.003, duration * 0.55));
  const releaseTime = clamp(release, 0.018, 0.28);
  const totalTime = Math.max(duration + releaseTime, attackTime + releaseTime);
  const sustainEnd = Math.max(attackTime + 0.004, duration - releaseTime * 0.32);
  const curve = new Float32Array(96);

  for (let index = 0; index < curve.length; index += 1) {
    const time = (index / (curve.length - 1)) * totalTime;
    let value = silenceGain;

    if (time <= attackTime) {
      const progress = clamp(time / attackTime, 0, 1);
      value = silenceGain + (peak - silenceGain) * smoothStep(progress);
    } else if (time <= sustainEnd) {
      const progress = clamp(
        (time - attackTime) / Math.max(0.001, sustainEnd - attackTime),
        0,
        1,
      );
      value = peak * (1 - progress * 0.18);
    } else {
      const progress = clamp(
        (time - sustainEnd) / Math.max(0.001, totalTime - sustainEnd),
        0,
        1,
      );
      value = silenceGain + peak * 0.82 * (1 - smoothStep(progress));
    }

    curve[index] = Math.max(silenceGain, value);
  }

  gain.setValueAtTime(silenceGain, start);
  gain.setValueCurveAtTime(curve, start, totalTime);

  return {
    attackTime,
    releaseTime,
    totalTime,
  };
}

function createLimiter(context: BaseAudioContext) {
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -10;
  compressor.knee.value = 10;
  compressor.ratio.value = 18;
  compressor.attack.value = 0.002;
  compressor.release.value = 0.08;
  return compressor;
}

function createSoftClipper(context: BaseAudioContext) {
  const shaper = context.createWaveShaper();
  const samples = 65536;
  const curve = new Float32Array(samples);
  const drive = 2.25;

  for (let index = 0; index < samples; index += 1) {
    const x = (index / (samples - 1)) * 2 - 1;
    curve[index] = Math.tanh(x * drive) / Math.tanh(drive);
  }

  shaper.curve = curve;
  shaper.oversample = "4x";
  return shaper;
}

function scheduleEvent(
  context: BaseAudioContext,
  destination: AudioNode,
  event: SyllableEvent,
  params: MumbleParameters,
  startAt: number,
) {
  const start = startAt + event.time;
  const envelopeTimes = resolveEnvelopeTimes(event);
  const stop = start + event.duration + envelopeTimes.release + 0.06;
  const peakGain = clamp(event.gain * 0.9, 0.02, 1.08);
  const oscillator = context.createOscillator();
  const eventGain = context.createGain();
  const formantOne = context.createBiquadFilter();
  const formantTwo = context.createBiquadFilter();
  const vowelFilter = context.createBiquadFilter();
  const panner = context.createStereoPanner();
  const contourStart = semitoneToRatio(event.pitchContour.start);
  const contourMid = semitoneToRatio(event.pitchContour.mid);
  const contourEnd = semitoneToRatio(
    event.pitchContour.end + (event.sentenceEnd ? -0.25 : 0),
  );
  const contourMidTime = start + event.duration * 0.52;
  const contourEndTime = start + event.duration;

  oscillator.type =
    event.eventKind === "emphasis" || event.ringModDepth > 0.35
      ? "triangle"
      : "sine";
  oscillator.frequency.setValueAtTime(Math.max(24, event.frequency * contourStart), start);
  oscillator.frequency.exponentialRampToValueAtTime(
    Math.max(24, event.frequency * contourMid),
    contourMidTime,
  );
  oscillator.frequency.exponentialRampToValueAtTime(
    Math.max(24, event.frequency * contourEnd),
    contourEndTime,
  );

  // Two moving peaking filters create a compact "mouth shape" gesture without
  // attempting real phoneme pronunciation.
  formantOne.type = "peaking";
  formantOne.frequency.setValueAtTime(event.formantStart.f1, start);
  formantOne.frequency.exponentialRampToValueAtTime(event.formantEnd.f1, start + event.duration);
  formantOne.Q.setValueAtTime(4.8, start);
  formantOne.gain.setValueAtTime(9, start);

  formantTwo.type = "peaking";
  formantTwo.frequency.setValueAtTime(event.formantStart.f2, start);
  formantTwo.frequency.exponentialRampToValueAtTime(event.formantEnd.f2, start + event.duration);
  formantTwo.Q.setValueAtTime(5.8, start);
  formantTwo.gain.setValueAtTime(event.language === "zh" ? 5.5 : 7.5, start);

  vowelFilter.type = "lowpass";
  vowelFilter.frequency.setValueAtTime(Math.max(event.filterFreq, event.formantStart.f3), start);
  vowelFilter.frequency.exponentialRampToValueAtTime(
    Math.max(event.filterFreq, event.formantEnd.f3),
    start + event.duration,
  );
  vowelFilter.Q.setValueAtTime(Math.max(0.7, event.filterQ * 0.35), start);
  panner.pan.setValueAtTime(event.pan, start);

  eventGain.gain.setValueAtTime(silenceGain, start);
  scheduleEnvelope(
    eventGain.gain,
    start,
    event.duration,
    envelopeTimes.attack,
    envelopeTimes.release,
    peakGain,
  );

  oscillator.connect(formantOne);
  formantOne.connect(formantTwo);
  formantTwo.connect(vowelFilter);
  let carrierOutput: AudioNode = vowelFilter;

  if (event.ringModDepth > 0 && event.ringModFreq > 0) {
    const ringModulator = context.createGain();
    const ringOscillator = context.createOscillator();
    const ringDepth = context.createGain();
    const safeRingDepth = clamp(event.ringModDepth, 0, 0.52);
    const modulationAmount = safeRingDepth * 0.46;

    ringModulator.gain.setValueAtTime(1 - safeRingDepth * 0.12, start);
    ringOscillator.type = "sine";
    ringOscillator.frequency.setValueAtTime(event.ringModFreq, start);
    scheduleEnvelope(
      ringDepth.gain,
      start,
      event.duration,
      envelopeTimes.attack,
      envelopeTimes.release,
      modulationAmount,
    );
    ringOscillator.connect(ringDepth);
    ringDepth.connect(ringModulator.gain);
    vowelFilter.connect(ringModulator);
    carrierOutput = ringModulator;
    ringOscillator.start(start);
    ringOscillator.stop(stop);
  }

  carrierOutput.connect(eventGain);
  eventGain.connect(panner);
  panner.connect(destination);

  if (event.noiseAmount > 0.001) {
    const noiseSource = context.createBufferSource();
    const noiseGain = context.createGain();
    const noiseFilter = context.createBiquadFilter();
    const noiseTone = context.createBiquadFilter();
    const noiseBrightness = clamp(event.filterFreq / 9000 + event.noiseAmount * 0.16, 0.06, 0.24);
    noiseSource.buffer = makeNoiseBuffer(
      context,
      event.duration + envelopeTimes.release + 0.04,
      event.noiseSeed,
      noiseBrightness,
    );
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(
      clamp(event.formantStart.f2 * 0.92, 340, 2800),
      start,
    );
    noiseFilter.frequency.exponentialRampToValueAtTime(
      clamp(event.formantEnd.f2 * 0.92, 340, 2800),
      start + event.duration,
    );
    noiseFilter.Q.setValueAtTime(clamp(params.filterQ * 0.32, 0.45, 3.2), start);
    noiseTone.type = "lowpass";
    noiseTone.frequency.setValueAtTime(
      clamp(Math.min(event.filterFreq * 1.05, event.formantStart.f3 * 0.86), 850, 3800),
      start,
    );
    noiseTone.frequency.exponentialRampToValueAtTime(
      clamp(Math.min(event.filterFreq * 1.05, event.formantEnd.f3 * 0.86), 850, 3800),
      start + event.duration,
    );
    noiseTone.Q.setValueAtTime(0.55, start);
    noiseGain.gain.setValueAtTime(silenceGain, start);
    scheduleEnvelope(
      noiseGain.gain,
      start,
      event.duration,
      envelopeTimes.attack,
      envelopeTimes.release,
      peakGain * event.noiseAmount * 0.56,
    );
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseTone);
    noiseTone.connect(noiseGain);
    noiseGain.connect(panner);
    noiseSource.start(start);
    noiseSource.stop(stop);
  }

  oscillator.start(start);
  oscillator.stop(stop);
}

export function scheduleMumbleEvents(
  context: BaseAudioContext,
  destination: AudioNode,
  events: SyllableEvent[],
  params: MumbleParameters,
  startAt = context.currentTime,
): MumblePlaybackHandle {
  const master = context.createGain();
  const limiter = createLimiter(context);
  const makeup = context.createGain();
  const clipper = createSoftClipper(context);

  master.gain.value = clamp(dbToGain(params.volumeDb), 0.01, 6);
  makeup.gain.value = 1.45;
  master.connect(limiter);
  limiter.connect(makeup);
  makeup.connect(clipper);
  clipper.connect(destination);

  events.forEach((event) => scheduleEvent(context, master, event, params, startAt));

  return {
    startedAt: startAt,
    stop: () => {
      const now = context.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setTargetAtTime(0.0001, now, 0.012);

      if (context instanceof AudioContext) {
        window.setTimeout(() => {
          master.disconnect();
          limiter.disconnect();
          makeup.disconnect();
          clipper.disconnect();
        }, 90);
      }
    },
  };
}

export async function playMumbleEvents(
  events: SyllableEvent[],
  params: MumbleParameters,
): Promise<MumblePlaybackHandle> {
  if (!sharedContext) {
    sharedContext = new AudioContext();
  }

  if (sharedContext.state === "suspended") {
    await sharedContext.resume();
  }

  activePlayback?.stop();
  activeChatterHandles.forEach((handle) => handle.stop());
  activeChatterHandles = [];
  activePlayback = scheduleMumbleEvents(
    sharedContext,
    sharedContext.destination,
    events,
    params,
    sharedContext.currentTime + 0.02,
  );
  return activePlayback;
}

export interface ChatterSpeaker {
  events: SyllableEvent[];
  params: MumbleParameters;
}

export async function playChatter(
  speakers: ChatterSpeaker[],
): Promise<MumblePlaybackHandle> {
  if (speakers.length === 0) {
    throw new Error("playChatter requires at least one speaker");
  }

  if (!sharedContext) {
    sharedContext = new AudioContext();
  }

  if (sharedContext.state === "suspended") {
    await sharedContext.resume();
  }

  activePlayback?.stop();
  activePlayback = undefined;
  activeChatterHandles.forEach((handle) => handle.stop());
  activeChatterHandles = [];

  const startAt = sharedContext.currentTime + 0.04;
  // Pull each voice down a touch so N stacked masters don't clip the mix.
  // -3 dB per doubling matches equal-power mixing for incoherent sources.
  const headroomDb = -10 * Math.log10(speakers.length);

  activeChatterHandles = speakers.map(({ events, params }) => {
    const adjustedParams: MumbleParameters = {
      ...params,
      volumeDb: params.volumeDb + headroomDb,
    };
    return scheduleMumbleEvents(
      sharedContext!,
      sharedContext!.destination,
      events,
      adjustedParams,
      startAt,
    );
  });

  const combinedHandle: MumblePlaybackHandle = {
    startedAt: startAt,
    stop: () => {
      activeChatterHandles.forEach((handle) => handle.stop());
      activeChatterHandles = [];
    },
  };
  return combinedHandle;
}

export function stopMumblePlayback() {
  activePlayback?.stop();
  activePlayback = undefined;
  activeChatterHandles.forEach((handle) => handle.stop());
  activeChatterHandles = [];
}
