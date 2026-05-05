export interface SeededRandom {
  next: () => number;
  range: (min: number, max: number) => number;
  int: (min: number, max: number) => number;
  sign: () => -1 | 1;
  pick: <T>(items: readonly T[]) => T;
}

export function hashString(input: string): number {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function createSeededRandom(seedInput: string | number): SeededRandom {
  let state =
    typeof seedInput === "number"
      ? seedInput >>> 0
      : hashString(seedInput || "mumble-voice-lab");

  if (state === 0) {
    state = 0x6d756d62;
  }

  const next = () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    range: (min: number, max: number) => min + (max - min) * next(),
    int: (min: number, max: number) =>
      Math.floor(min + (max - min + 1) * next()),
    sign: () => (next() < 0.5 ? -1 : 1),
    pick: <T>(items: readonly T[]) => items[Math.floor(next() * items.length)],
  };
}
