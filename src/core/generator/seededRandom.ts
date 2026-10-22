/**
 * Deterministic PRNG (mulberry32). Same seed => same sequence on every platform, which is
 * what makes "same spec + same seed => bit-identical block data" hold.
 *
 * Randomness is hierarchical (project → building → part): `fork(label)` derives a child
 * generator from the parent's seed and a label, independent of how many numbers the parent
 * has drawn. Changing one part (e.g. the chimney) therefore never reshuffles the others.
 */
export interface SeededRandom {
  /** The seed this generator was created with. */
  readonly seed: number;
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max] (inclusive). */
  int(min: number, max: number): number;
  chance(probability: number): boolean;
  pick<T>(items: readonly T[]): T;
  /** Picks by weight; entries with weight ≤ 0 are never chosen. */
  weighted<T>(entries: readonly (readonly [T, number])[]): T;
  /** Returns a shuffled copy (Fisher–Yates). */
  shuffle<T>(items: readonly T[]): T[];
  /** Independent child generator for a named part. */
  fork(label: string): SeededRandom;
}

/** 32-bit hash of a seed and a label (FNV-1a over the label, mixed with the seed). */
export function hashSeed(seed: number, label: string): number {
  let h = (0x811c9dc5 ^ (seed >>> 0)) >>> 0;
  for (let i = 0; i < label.length; i++) {
    h ^= label.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  // Final avalanche (murmur3 fmix32).
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/** Deterministic value in [0, 1) for an integer lattice point (for noise fields). */
export function latticeValue(seed: number, x: number, y: number, z: number): number {
  let h = (seed ^ Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(z | 0, 0x9e3779b1)) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d) >>> 0;
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39) >>> 0;
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/** Smooth value noise in [0, 1) with the given cell size (trilinear, smoothstep). */
export function valueNoise(seed: number, x: number, y: number, z: number, cell: number): number {
  const fx = x / cell;
  const fy = y / cell;
  const fz = z / cell;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const z0 = Math.floor(fz);
  const s = (t: number) => t * t * (3 - 2 * t);
  const tx = s(fx - x0);
  const ty = s(fy - y0);
  const tz = s(fz - z0);
  const v = (dx: number, dy: number, dz: number) => latticeValue(seed, x0 + dx, y0 + dy, z0 + dz);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  return lerp(
    lerp(lerp(v(0, 0, 0), v(1, 0, 0), tx), lerp(v(0, 1, 0), v(1, 1, 0), tx), ty),
    lerp(lerp(v(0, 0, 1), v(1, 0, 1), tx), lerp(v(0, 1, 1), v(1, 1, 1), tx), ty),
    tz,
  );
}

export function createSeededRandom(seed: number): SeededRandom {
  const root = seed >>> 0;
  let state = root;
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
    seed: root,
    next,
    int,
    chance: (probability) => next() < probability,
    pick: <T,>(items: readonly T[]): T => {
      if (items.length === 0) throw new Error('pick() auf leerer Liste');
      return items[int(0, items.length - 1)] as T;
    },
    weighted: <T,>(entries: readonly (readonly [T, number])[]): T => {
      const total = entries.reduce((sum, [, w]) => sum + Math.max(0, w), 0);
      if (total <= 0) throw new Error('weighted() ohne positive Gewichte');
      let r = next() * total;
      for (const [value, w] of entries) {
        if (w <= 0) continue;
        r -= w;
        if (r < 0) return value;
      }
      return entries.filter(([, w]) => w > 0).at(-1)![0];
    },
    shuffle: <T,>(items: readonly T[]): T[] => {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = int(0, i);
        [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
      }
      return copy;
    },
    fork: (label: string) => createSeededRandom(hashSeed(root, label)),
  };
}
