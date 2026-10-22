import { getMaterial } from '@/core/style/materials';
import { valueNoise } from '@/core/generator/seededRandom';

/**
 * Weathering field for walls (research report, "Gradienten und Verwitterung brauchen Cluster
 * statt Streuung"; derived, not tested in game): weathering is strong at the bottom, at
 * corners, under overhangs and in drip streaks below windows. Low-frequency noise (cell size
 * 2–3) shifts the thresholds, so variants form irregular clusters instead of salt-and-pepper
 * splatter or horizontal bands. Neighbouring blocks differ by at most one variant step in
 * practice because the field is smooth.
 *
 *   p(h) = p0 · max(0, 1 − h / Hw) + p_min  (+0.12 corner, +0.12 under overhang, +0.15 drip)
 */

export interface WeatherFactors {
  /** Height above the wall base (0 = lowest wall block). */
  height: number;
  corner?: boolean;
  underOverhang?: boolean;
  /** Below a window (drip streak), within 2 blocks. */
  drip?: boolean;
}

const P0 = 0.42;
const HW = 3.5;
const P_MIN = 0.08;

export function weatherAmount(f: WeatherFactors): number {
  let p = P0 * Math.max(0, 1 - f.height / HW) + P_MIN;
  if (f.corner) p += 0.12;
  if (f.underOverhang) p += 0.12;
  if (f.drip) p += 0.15;
  return Math.min(1, p);
}

/** Thresholds per number of variants: the clean variant clearly dominates (≈ 50/30/15/5). */
const THRESHOLDS: Readonly<Record<number, readonly number[]>> = {
  2: [0.42],
  3: [0.36, 0.52],
  4: [0.33, 0.46, 0.6],
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
  const noise = valueNoise(seed, x, y, z, 2.5) - 0.5;
  const w = weatherAmount(f) + noise * 0.5;
  const thresholds = THRESHOLDS[Math.min(4, levels.length)] ?? THRESHOLDS[4]!;
  let index = 0;
  while (index < thresholds.length && w >= thresholds[index]!) index++;
  return levels[Math.min(index, levels.length - 1)]!;
}
