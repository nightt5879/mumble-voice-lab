export interface MumbleParameters {
  basicFreq: number;
  wordCountMultiplier: number;
  syllableLengthMs: number;
  syllableLengthRandomness: number;
  pitchRandomSemitone: number;
  pitchFallAtEnd: boolean;
  speedCurve: number;
  timingJitterMs: number;
  ringModFreq: number;
  ringModDepth: number;
  noiseAmount: number;
  filterFreq: number;
  filterQ: number;
  attackMs: number;
  releaseMs: number;
  volumeDb: number;
  seed: number;
}

export interface MumblePreset {
  id: string;
  name: string;
  swatch: string;
  params: MumbleParameters;
}
