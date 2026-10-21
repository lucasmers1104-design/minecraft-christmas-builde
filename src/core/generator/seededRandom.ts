/**
 * Deterministic PRNG (mulberry32). Same seed => same sequence on every platform, which is
 * what makes "same spec + same seed => bit-identical block data" hold.
 */
export interface SeededRandom {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max] (inclusive). */
  int(min: number, max: number): number;
  chance(probability: number): boolean;
  pick<T>(items: readonly T[]): T;
  /** Returns a shuffled copy (Fisher–Yates). */
  shuffle<T>(items: readonly T[]): T[];
}

export function createSeededRandom(seed: number): SeededRandom {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number): number => {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
      throw new Error(`Ungültiger Bereich [${min}, ${max}]`);
    }
    return min + Math.floor(next() * (max - min + 1));
  };
  return {
    next,
    int,
    chance: (probability) => next() < probability,
    pick: <T,>(items: readonly T[]): T => {
      if (items.length === 0) throw new Error('pick() auf leerer Liste');
      return items[int(0, items.length - 1)] as T;
    },
    shuffle: <T,>(items: readonly T[]): T[] => {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = int(0, i);
        [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
      }
      return copy;
    },
  };
}
