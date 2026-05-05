import type { MumbleParameters } from "../presets/types";
import { createSeededRandom } from "../random/seededRandom";
import type { SyllableEvent } from "./types";

let sharedContext: AudioContext | undefined;

function dbToGain(db: number) {
  return 10 ** (db / 20);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function makeNoiseBuffer(context: BaseAudioContext, duration: number, seed: number) {
  const sampleCount = Math.max(1, Math.ceil(context.sampleRate * duration));
  const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
  const data = buffer.getChannelData(0);
  const rng = createSeededRandom(seed);

  for (let index = 0; index < sampleCount; index += 1) {
    data[index] = rng.range(-1, 1);
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
  const attackTime = clamp(attack, 0.001, duration * 0.5);
  const releaseTime = clamp(release, 0.004, duration + release);
  const sustainEnd = Math.max(start + attackTime, start + duration - releaseTime * 0.35);

  // A tiny non-zero starting gain prevents zipper noise while keeping the blip silent.
  gain.setValueAtTime(0.0001, start);
  gain.linearRampToValueAtTime(peak, start + attackTime);
  gain.setTargetAtTime(peak * 0.72, start + attackTime, 0.018);
  gain.linearRampToValueAtTime(0.0001, sustainEnd + releaseTime);
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
  const stop = start + event.duration + event.release + 0.04;
  const peakGain = clamp(event.gain * 0.95, 0.02, 1.18);
  const oscillator = context.createOscillator();
  const eventGain = context.createGain();
  const vowelFilter = context.createBiquadFilter();
  const panner = context.createStereoPanner();

  oscillator.type = event.ringModDepth > 0.35 ? "triangle" : "sine";
  oscillator.frequency.setValueAtTime(event.frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(
    Math.max(24, event.frequency * (event.sentenceEnd ? 0.92 : 1.015)),
    start + event.duration,
  );

  // A bandpass-only voice can erase the audible fundamental. Lowpass keeps the
  // blip loud while Q and cutoff movement still imply simple vowel coloration.
  vowelFilter.type = "lowpass";
  vowelFilter.frequency.setValueAtTime(event.filterFreq, start);
  vowelFilter.Q.setValueAtTime(event.filterQ, start);
  panner.pan.setValueAtTime(event.pan, start);

  eventGain.gain.setValueAtTime(0.0001, start);
  scheduleEnvelope(eventGain.gain, start, event.duration, event.attack, event.release, peakGain);

  oscillator.connect(vowelFilter);
  vowelFilter.connect(eventGain);
  eventGain.connect(panner);
  panner.connect(destination);

  if (event.ringModDepth > 0 && event.ringModFreq > 0) {
    const ringOscillator = context.createOscillator();
    const ringGain = context.createGain();
    ringOscillator.type = "sine";
    ringOscillator.frequency.setValueAtTime(event.ringModFreq, start);
    ringGain.gain.setValueAtTime(peakGain * event.ringModDepth * 0.65, start);
    ringOscillator.connect(ringGain);
    ringGain.connect(eventGain.gain);
    ringOscillator.start(start);
    ringOscillator.stop(stop);
  }

  if (event.noiseAmount > 0.001) {
    const noiseSource = context.createBufferSource();
    const noiseGain = context.createGain();
    const noiseFilter = context.createBiquadFilter();
    noiseSource.buffer = makeNoiseBuffer(context, event.duration + event.release + 0.04, event.noiseSeed);
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(event.filterFreq * 1.18, start);
    noiseFilter.Q.setValueAtTime(Math.max(0.8, params.filterQ * 0.65), start);
    noiseGain.gain.setValueAtTime(0.0001, start);
    scheduleEnvelope(
      noiseGain.gain,
      start,
      event.duration,
      event.attack,
      event.release,
      peakGain * event.noiseAmount * 0.72,
    );
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
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
) {
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
}

export async function playMumbleEvents(
  events: SyllableEvent[],
  params: MumbleParameters,
) {
  if (!sharedContext) {
    sharedContext = new AudioContext();
  }

  if (sharedContext.state === "suspended") {
    await sharedContext.resume();
  }

  scheduleMumbleEvents(sharedContext, sharedContext.destination, events, params, sharedContext.currentTime + 0.02);
}
