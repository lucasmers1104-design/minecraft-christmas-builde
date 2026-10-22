import { blockState } from '@/core/blocks/registry';
import { Priority, type VoxelBuilder } from '@/core/generator/geometry';
import type { SeededRandom } from '@/core/generator/seededRandom';
import { circle } from '@/core/geometry';
import type { Theme } from '@/core/style/styles';

/**
 * Christmas tree (phase 5, research report "Weihnachtsdekor nur aus Blöcken"; the profile is
 * derived, not taken from a tested build): tiers of 3–4 layers, each tier starting one or two
 * blocks smaller than the previous one ended, maximum radius ≈ 0.38 · height. Ornaments (wool
 * or concrete, 8–12 % of the hull) and lights (light blocks *inside* the leaves, 4–6 %) are
 * spread along the golden angle; the star is a gold block (or glowstone) with end-rod rays.
 * Leaves are always persistent; nothing stands on leaves; no pumpkins (golem traps).
 */

export interface TreeShape {
  /** Leaf radius per layer from the top (index 0 = just under the star). */
  radii: number[];
  trunkBelow: number;
}

function radiiFor(maxR: number, tierLength: number): number[] {
  // Top tier 0,1; every further tier starts one below where the previous one ended (research:
  // H = 12 → 0,1 | 1,2,3 | 2,3,4 | 3,4,5 | 4).
  const radii = [0, 1];
  let start = 1;
  for (;;) {
    for (let i = 0; i < tierLength; i++) radii.push(Math.min(maxR, start + i));
    const end = radii.at(-1)!;
    if (end >= maxR) break;
    start = Math.max(start + 1, end - 1);
  }
  radii.push(maxR - 1);
  return radii;
}

/** Radii from the top down; the largest radius (≈ 0.38 · height) that still fits the height. */
export function treeProfile(height: number): TreeShape {
  const tierLength = height >= 18 ? 4 : 3;
  for (let maxR = Math.max(2, Math.round(0.38 * height)); maxR >= 2; maxR--) {
    const radii = radiiFor(maxR, tierLength);
    const trunkBelow = height - 1 - radii.length;
    if (trunkBelow >= 1) return { radii, trunkBelow };
  }
  return { radii: [0, 1, 1, 2, 1], trunkBelow: Math.max(1, height - 6) };
}

export interface TreeOptions {
  theme: Theme;
  /** 1–3: amount of ornaments and lights. */
  intensity: 1 | 2 | 3;
  lights: boolean;
  star: boolean;
}

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

const ORNAMENTS: Readonly<Record<Theme, readonly string[]>> = {
  christmas: ['red_wool', 'yellow_concrete', 'red_concrete', 'white_wool', 'blue_concrete', 'gold_block'],
  winter: ['white_wool', 'light_blue_concrete', 'white_concrete', 'light_gray_wool'],
  none: [],
};

/**
 * Builds a tree with its trunk base at (cx, y0, cz); y0 is the first row above the ground.
 * Returns the y of the star block.
 */
export function buildChristmasTree(b: VoxelBuilder, rng: SeededRandom, cx: number, y0: number, cz: number, height: number, o: TreeOptions): number {
  const shape = treeProfile(height);
  const leaves = blockState('spruce_leaves', { persistent: 'true' });
  const log = blockState('spruce_log', { axis: 'y' });
  const top = y0 + height - 1;
  const crownTop = top - 1;
  const hull: { x: number; y: number; z: number; angle: number; h: number }[] = [];

  shape.radii.forEach((r, i) => {
    const y = crownTop - i;
    const d = 2 * r + 1;
    const mask = circle(d, 'filled');
    const ring = circle(d, 'thick');
    for (const [mx, mz] of mask.cells()) {
      const x = cx + mx - r;
      const z = cz + mz - r;
      if (!b.inside(x, y, z)) continue;
      b.setBlock(x, y, z, leaves, Priority.STRUCTURE);
      if (ring.has(mx, mz) || r === 0) hull.push({ x, y, z, angle: Math.atan2(z - cz, x - cx), h: i / shape.radii.length });
    }
  });
  // Trunk through the crown and below it.
  for (let y = y0; y <= crownTop - 1; y++) b.setBlock(cx, y, cz, log, Priority.STRUCTURE);

  const r = rng.fork('tree');
  const palette = ORNAMENTS[o.theme];
  const pickNear = (angle: number, h: number) => {
    let best = -1;
    let bestScore = Infinity;
    hull.forEach((c, i) => {
      const da = Math.abs(Math.atan2(Math.sin(c.angle - angle), Math.cos(c.angle - angle)));
      const score = da * 2 + Math.abs(c.h - h) * 8;
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    });
    return best >= 0 ? hull.splice(best, 1)[0]! : null;
  };
  // Ornaments along the golden angle (outer hull).
  if (palette.length > 0) {
    const share = o.intensity === 1 ? 0.08 : o.intensity === 2 ? 0.1 : 0.12;
    const n = Math.round(hull.length * share);
    for (let i = 0; i < n; i++) {
      const c = pickNear(i * GOLDEN, 0.08 + (0.88 * (i + 0.5)) / n);
      if (c) b.setBlock(c.x, c.y, c.z, blockState(r.pick(palette)), Priority.STRUCTURE);
    }
  }
  // Lights inside the leaves (not on them): froglights glow through the crown.
  if (o.lights && o.theme !== 'none') {
    const share = o.intensity === 1 ? 0.04 : o.intensity === 2 ? 0.05 : 0.06;
    const n = Math.round((hull.length + 10) * share);
    const light = o.theme === 'winter' ? blockState('pearlescent_froglight', { axis: 'y' }) : blockState('ochre_froglight', { axis: 'y' });
    for (let i = 0; i < n; i++) {
      const c = pickNear(i * GOLDEN + 1.3, 0.05 + (0.9 * (i + 0.5)) / n);
      if (c) b.setBlock(c.x, c.y, c.z, light, Priority.STRUCTURE);
    }
  }
  // Star with end-rod rays.
  if (o.star) {
    const star = blockState(o.theme === 'winter' ? 'glowstone' : 'gold_block');
    b.setBlock(cx, top, cz, star, Priority.STRUCTURE);
    if (b.inside(cx, top + 1, cz)) b.setBlock(cx, top + 1, cz, blockState('end_rod', { facing: 'up' }), Priority.STRUCTURE);
    for (const [dx, dz, facing] of [
      [1, 0, 'east'],
      [-1, 0, 'west'],
      [0, 1, 'south'],
      [0, -1, 'north'],
    ] as const) {
      if (b.inside(cx + dx, top, cz + dz) && b.isAir(cx + dx, top, cz + dz)) b.setBlock(cx + dx, top, cz + dz, blockState('end_rod', { facing }), Priority.STRUCTURE);
    }
  }
  return top;
}
