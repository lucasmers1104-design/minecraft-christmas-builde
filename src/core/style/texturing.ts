import { getMaterial } from '@/core/style/materials';
import { valueNoise } from '@/core/generator/seededRandom';

/**
 * Weathering field for walls (research report, "Gradienten und Verwitterung brauchen Cluster
 * statt Streuung", revised after research 07; derived, not tested in game): weathering is
 * strongest at the bottom, at corners, under overhangs and in drip streaks below windows, and
 * fades out over about eight blocks instead of three. Two noise octaves (cells 6 and 2) shift
 * the thresholds and a third one wobbles the height itself, so the variants form irregular
 * clusters that climb the wall here and there instead of a solid band along the bottom row
 * (the old field weathered ~70 % of row 0 and nothing above row 3). The clean block dominates:
 * about a third of row 0 is weathered, a few percent stay further up.
 *
 *   p(h) = 0.18 · max(0, 1 − h / 8) + 0.16  (+0.08 corner, +0.10 under overhang, +0.12 drip)
 */

export interface WeatherFactors {
  /** Height above the wall base (0 = lowest wall block). */
  height: number;
  corner?: boolean;
  underOverhang?: boolean;
  /** Below a window (drip streak), within 2 blocks. */
  drip?: boolean;
}

const P0 = 0.18;
const HW = 8;
const P_MIN = 0.16;

export function weatherAmount(f: WeatherFactors): number {
  let p = P0 * Math.max(0, 1 - f.height / HW) + P_MIN;
  if (f.corner) p += 0.08;
  if (f.underOverhang) p += 0.1;
  if (f.drip) p += 0.12;
  return Math.min(1, p);
}

/** Thresholds per number of variants: the clean variant clearly dominates. */
const THRESHOLDS: Readonly<Record<number, readonly number[]>> = {
  2: [0.4],
  3: [0.4, 0.5],
  4: [0.4, 0.48, 0.56],
};

/**
 * Block (short id) for a wall cell of a material: the clean block or one of its weathering
 * variants, depending on the field and deterministic noise at (x, y, z).
 */
export function weatheredBlock(materialId: string, seed: number, x: number, y: number, z: number, f: WeatherFactors): string {
  const material = getMaterial(materialId);
  const levels = material.weathering;
  const clean = material.forms.block ?? materialId;
  if (!levels || levels.length < 2) return clean;
  const noise = 0.65 * (valueNoise(seed, x, y, z, 6) - 0.5) + 0.35 * (valueNoise(seed ^ 0x5bd1e995, x, y, z, 2) - 0.5);
  const wobble = 3 * (valueNoise(seed ^ 0x27d4eb2d, x, y, z, 4) - 0.5);
  const w = weatherAmount({ ...f, height: Math.max(0, f.height + wobble) }) + noise * 0.6;
  const thresholds = THRESHOLDS[Math.min(4, levels.length)] ?? THRESHOLDS[4]!;
  let index = 0;
  while (index < thresholds.length && w >= thresholds[index]!) index++;
  return levels[Math.min(index, levels.length - 1)]!;
}
