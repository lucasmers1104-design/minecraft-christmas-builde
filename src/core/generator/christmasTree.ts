import { blockState, profileBlockId } from '@/core/blocks/registry';
import { Priority, type VoxelBuilder } from '@/core/generator/geometry';
import type { SeededRandom } from '@/core/generator/seededRandom';
import { treeKitFor, type TreeKit } from '@/core/generator/festiveKits';
import type { StyleId, Theme } from '@/core/style/styles';

/**
 * Christmas tree (research 2026-10, report 17 A1–A6 and report 14 B1–B4):
 *
 * - **Tiers with a deep step back (A1):** crown height C = H − visible trunk − star, base
 *   radius R = round(0.35·C), T tiers with bottom radius rb_i = round(R·((i+1)/T)^0.7); a tier
 *   starts at rb_{i−1} − max(2, round(0.45·rb_{i−1})) and grows by one per layer. Spare layers
 *   repeat the bottom radius of the lower tiers. **Hanging tips** one layer under every tier.
 * - **Lobed, irregular layers (A2):** r(θ) = r·(1 + 0.15·cos(n·(θ − φ))) for r ≥ 3 with
 *   n = 5…9 branches per tier and the phase turned by 137.5° per tier, a little edge noise
 *   (gaps, never two side by side, and fringe cells); branches of logs inside tiers with rb ≥ 4.
 * - **Hollow (A3):** leaves only up to three blocks below the outer contour of each layer;
 *   the trunk grows with the height (1×1, plus, 3×3) and is visible under the lowest tier.
 * - **Ornaments (A5, B1):** 3 / 4.5 / 6 % of the side hull (half that at H = 12), 70 % on
 *   tier rims and hanging tips, at most three colours from the style kit, Chebyshev distance
 *   ≥ 2 to any ornament and ≥ 4 to the same colour; **no full-block ornaments under H = 12**
 *   (hanging lanterns on chains instead). **One light type**: half of the lights glow one
 *   block behind the hull, the rest replace hull cells.
 * - **Star grows with the tree (A6, B4):** a sparkle of end rods up to H = 14, a crossed 3×3
 *   plus up to 22, a crossed 5×5 pixel star up to 32 and a 7×7 one above; never a single
 *   gold cube.
 *
 * Leaves are always persistent; nothing that needs support stands on leaves (chains hang
 * freely, lanterns hang from chains); no pumpkins (golem traps). The profile is derived from
 * the research formulas, not copied from a tested build.
 */

export type StarKind = 'sparkle' | 'plus' | 'star5' | 'star7';

export interface TreeShape {
  /** Nominal leaf radius per crown layer from the top (index 0 = crown top). */
  radii: number[];
  /** Visible trunk rows under the lowest layer (hanging tips use the top one at the rim). */
  trunkBelow: number;
  /** Layer index ranges [from, to] per tier, from the top. */
  tiers: { from: number; to: number }[];
  /** Rows of the star above the crown top. */
  starHeight: number;
  star: StarKind;
}

function starFor(height: number): { star: StarKind; starHeight: number } {
  if (height <= 14) return { star: 'sparkle', starHeight: 1 };
  if (height <= 22) return { star: 'plus', starHeight: 2 };
  if (height <= 32) return { star: 'star5', starHeight: 5 };
  return { star: 'star7', starHeight: 7 };
}

/** Tier radii (from the top) for T tiers and base radius R, or null if they need more than C layers. */
function tierLayers(R: number, T: number, C: number): number[][] | null {
  const tiers: number[][] = [];
  let prevBottom = 0;
  for (let i = 0; i < T; i++) {
    const rb = Math.max(1, Math.round(R * ((i + 1) / T) ** 0.7));
    const rs = i === 0 ? 0 : Math.max(1, prevBottom - Math.max(2, Math.round(0.45 * prevBottom)));
    const layers: number[] = [];
    for (let r = rs; r <= Math.max(rs, rb); r++) layers.push(r);
    tiers.push(layers);
    prevBottom = layers.at(-1)!;
  }
  let total = tiers.reduce((n, t) => n + t.length, 0);
  if (total > C) return null;
  // Spare layers: the lower tiers get taller (their bottom radius repeats), bottom tier first.
  for (let k = 0; total < C; k++, total++) {
    const tier = tiers[T - 1 - (k % T)]!;
    tier.push(tier.at(-1)!);
  }
  return tiers;
}

/** Tiered profile for a tree of total height `height` (trunk base to star tip). */
export function treeProfile(height: number): TreeShape {
  const { star, starHeight } = starFor(height);
  const trunkBelow = height >= 24 ? 3 : 2;
  const C = Math.max(3, height - trunkBelow - starHeight);
  for (let R = Math.max(1, Math.round(BASE_FACTOR * C)); R >= 1; R--) {
    const tMax = Math.min(8, Math.max(2, Math.floor(C / 3)));
    for (let T = tMax; T >= 2; T--) {
      const tiers = tierLayers(R, T, C);
      if (!tiers) continue;
      const ranges: TreeShape['tiers'] = [];
      let i = 0;
      for (const t of tiers) {
        ranges.push({ from: i, to: i + t.length - 1 });
        i += t.length;
      }
      return { radii: tiers.flat(), trunkBelow, tiers: ranges, starHeight, star };
    }
  }
  return { radii: [0, 1, 1], trunkBelow, tiers: [{ from: 0, to: 2 }], starHeight, star };
}

export interface TreeOptions {
  theme: Theme;
  /** 1–3: amount of ornaments and lights. */
  intensity: 1 | 2 | 3;
  lights: boolean;
  star: boolean;
  /** Style kit for ornament colours and the light (default: rustic kit). */
  style?: StyleId;
  /** Snow on request: lights become exposed copper bulbs (light 12, snow next to them stays). */
  snow?: boolean;
  lantern?: 'lantern' | 'soul_lantern';
  minecraftVersion?: string;
}

export interface TreeResult {
  /** y of the topmost star block. */
  top: number;
  /** Nominal radius of the lowest tier. */
  bottomRadius: number;
  /** y of the lowest leaf layer. */
  bottomY: number;
  /** Free ground cells under the lowest tier (1 ≤ r ≤ R − 1) with their free headroom. */
  under: { x: number; y: number; z: number; headroom: number }[];
}

/** Base radius R = round(BASE_FACTOR · C) (research: 0.35; a little wider reads better as a fir). */
const BASE_FACTOR = 0.35;
/** Edge noise on layers with r ≥ 4: gaps and fringe cells (research: 0.12 / 0.08). */
const GAP_P = 0;
const FRINGE_P = 0;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const PHASE_STEP = (137.5 * Math.PI) / 180;
const TAU = 2 * Math.PI;
const SIDES4 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

interface LayerCell {
  x: number;
  z: number;
}

const k2 = (x: number, z: number) => `${x},${z}`;
const k3 = (x: number, y: number, z: number) => `${x},${y},${z}`;

/** Lobe count of a tier: one branch per ~3 blocks of circumference, 5–9. */
function lobesOf(rb: number): number {
  return Math.min(9, Math.max(5, Math.round((TAU * rb) / 3)));
}

/** Cells of one layer: lobed disc of nominal radius r, hollow beyond three blocks depth. */
function layerCells(r: number, n: number, phase: number, rng: SeededRandom): { cells: Map<string, LayerCell>; outer: Set<string> } {
  const a = r >= 3 ? 0.15 : 0;
  const cells = new Map<string, LayerCell>();
  const radius = (x: number, z: number) => r * (1 + a * Math.cos(n * (Math.atan2(z, x) - phase)));
  const reach = Math.ceil(r * 1.15) + 2;
  for (let x = -reach; x <= reach; x++)
    for (let z = -reach; z <= reach; z++) if (Math.hypot(x, z) <= radius(x, z) + 0.5) cells.set(k2(x, z), { x, z });
  const isOuter = (c: LayerCell) => SIDES4.some(([dx, dz]) => !cells.has(k2(c.x + dx, c.z + dz)));
  if (r >= 4) {
    // Edge noise: a few gaps (never two neighbours) and a few fringe cells one further out.
    const removed = new Set<string>();
    const outer = [...cells.values()].filter(isOuter).sort((p, q) => p.x - q.x || p.z - q.z);
    for (const c of outer) {
      const roll = rng.next();
      if (roll < GAP_P) {
        if (!SIDES4.some(([dx, dz]) => removed.has(k2(c.x + dx, c.z + dz)))) removed.add(k2(c.x, c.z));
      } else if (roll < GAP_P + FRINGE_P) {
        const len = Math.hypot(c.x, c.z);
        const fx = c.x + Math.round(c.x / len);
        const fz = c.z + Math.round(c.z / len);
        if (!cells.has(k2(fx, fz))) cells.set(k2(fx, fz), { x: fx, z: fz });
      }
    }
    for (const k of removed) cells.delete(k);
  }
  // Hollow: keep only cells within three blocks of the outer contour (and the trunk column).
  for (const [k, c] of cells) {
    if (c.x === 0 && c.z === 0) continue;
    if (Math.hypot(c.x, c.z) <= radius(c.x, c.z) - 2.5) cells.delete(k);
  }
  const outer = new Set<string>();
  for (const [k, c] of cells) if (isOuter(c) && Math.hypot(c.x, c.z) >= r - 1.5) outer.add(k);
  return { cells, outer };
}

/** Pixel stars, rows from the bottom, centre column in the middle: O outline, Y core, e end rod. */
const STAR5 = ['O.e.O', '.OeO.', '.OYO.', 'OOYOO', '..O..'];
const STAR7 = ['OO.e.OO', '.OOeOO.', '..OYO..', '.OYYYO.', 'OOOYOOO', '...O...', '...O...'];

interface Hull {
  x: number;
  y: number;
  z: number;
  angle: number;
  /** Relative height from the top (0) to the lowest layer (1). */
  h: number;
  /** In the widest layer of its tier (branch tips). */
  rim: boolean;
  /** Leaf one block further in (towards the trunk), for lights behind the hull. */
  inner: [number, number] | null;
}

type Cell = { x: number; y: number; z: number };
const cheb = (p: Cell, q: Cell) => Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y), Math.abs(p.z - q.z));

/** Hull cell closest to a target angle and relative height that passes `ok`. */
function pickNear(pool: readonly Hull[], angle: number, h: number, ok: (c: Hull) => boolean): Hull | null {
  let best: Hull | null = null;
  let bestScore = Infinity;
  for (const c of pool) {
    if (!ok(c)) continue;
    const da = Math.abs(Math.atan2(Math.sin(c.angle - angle), Math.cos(c.angle - angle)));
    const score = da * 2 + Math.abs(c.h - h) * 8;
    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

/**
 * Builds a tree with its trunk base at (cx, y0, cz); y0 is the first row above the ground.
 */
export function buildChristmasTree(b: VoxelBuilder, rng: SeededRandom, cx: number, y0: number, cz: number, height: number, o: TreeOptions): TreeResult {
  const shape = treeProfile(height);
  const kit: TreeKit = treeKitFor(o.style, o.theme);
  const festive = o.theme !== 'none';
  const leaves = blockState('spruce_leaves', { persistent: 'true' });
  const log = (axis: 'x' | 'y' | 'z') => blockState('spruce_log', { axis });
  const C = shape.radii.length;
  const bottomY = y0 + shape.trunkBelow;
  const crownTop = bottomY + C - 1;
  const r = rng.fork('tree');
  const set = (x: number, y: number, z: number, state: string) => {
    if (b.inside(x, y, z)) b.setBlock(x, y, z, state, Priority.STRUCTURE);
  };
  const free = (x: number, y: number, z: number) => b.inside(x, y, z) && b.isAir(x, y, z);

  const hull: Hull[] = [];
  const tips: Hull[] = [];
  const leafAt = new Set<string>();
  const stillLeaf = (c: Cell) => leafAt.has(k3(c.x, c.y, c.z));

  shape.tiers.forEach((tier, t) => {
    const rb = shape.radii[tier.to]!;
    const n = lobesOf(rb);
    const phase = t * PHASE_STEP + r.next() * 0.3;
    for (let i = tier.from; i <= tier.to; i++) {
      const y = crownTop - i;
      const { cells, outer } = layerCells(shape.radii[i]!, n, phase, r.fork(`layer${i}`));
      for (const c of cells.values()) {
        if (!b.inside(cx + c.x, y, cz + c.z)) continue;
        set(cx + c.x, y, cz + c.z, leaves);
        leafAt.add(k3(cx + c.x, y, cz + c.z));
      }
      for (const key of outer) {
        const c = cells.get(key)!;
        const len = Math.hypot(c.x, c.z) || 1;
        const ix = c.x - Math.round(c.x / len);
        const iz = c.z - Math.round(c.z / len);
        const inner: [number, number] | null = cells.has(k2(ix, iz)) && !outer.has(k2(ix, iz)) && (ix !== 0 || iz !== 0) ? [cx + ix, cz + iz] : null;
        hull.push({ x: cx + c.x, y, z: cz + c.z, angle: Math.atan2(c.z, c.x), h: i / C, rim: i === tier.to, inner });
      }
    }
    // Hanging tips one layer under the tier, in the lobe directions (±12°, p = 0.7).
    const yRim = crownTop - tier.to;
    const yTip = yRim - 1;
    if (yTip >= y0 && t < shape.tiers.length - 1) {
      for (const c of hull.filter((h) => h.y === yRim)) {
        const rel = ((((c.angle - phase) * n) % TAU) + TAU) % TAU;
        const offLobe = Math.min(rel, TAU - rel) / n;
        if (offLobe > (12 * Math.PI) / 180 || Math.hypot(c.x - cx, c.z - cz) < rb - 1 || !free(c.x, yTip, c.z) || !r.chance(0.7)) continue;
        set(c.x, yTip, c.z, leaves);
        leafAt.add(k3(c.x, yTip, c.z));
        tips.push({ x: c.x, y: yTip, z: c.z, angle: c.angle, h: (tier.to + 1) / C, rim: true, inner: null });
      }
    }
    // Branches (A2): logs towards every other lobe in the widest layer, a fence at the end.
    if (rb >= 4) {
      const len = Math.round(0.6 * rb);
      for (let k = 0; k < n; k += 2) {
        const th = phase + (k * TAU) / n;
        let px = 0;
        let pz = 0;
        for (let s = 1; s <= len; s++) {
          const x = Math.round(Math.cos(th) * s);
          const z = Math.round(Math.sin(th) * s);
          if (x === px && z === pz) continue;
          const straight = x === px || z === pz;
          const state = s === len ? blockState('spruce_fence') : straight ? log(x !== px ? 'x' : 'z') : blockState('spruce_wood', { axis: 'y' });
          set(cx + x, yRim, cz + z, state);
          leafAt.delete(k3(cx + x, yRim, cz + z));
          px = x;
          pz = z;
        }
      }
    }
  });

  // Trunk: through the crown, wider at the base of big trees (plus, then 3×3).
  for (let y = y0; y <= crownTop - 1; y++) {
    set(cx, y, cz, log('y'));
    leafAt.delete(k3(cx, y, cz));
  }
  const plusTop = height >= 24 ? bottomY + Math.round(C / 3) : -1;
  const squareTop = height >= 36 ? bottomY + Math.round(C / 4) : -1;
  for (let y = y0; y <= plusTop; y++)
    for (const [dx, dz] of SIDES4) {
      set(cx + dx, y, cz + dz, log('y'));
      leafAt.delete(k3(cx + dx, y, cz + dz));
    }
  for (let y = y0; y <= squareTop; y++)
    for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
      set(cx + dx, y, cz + dz, log('y'));
      leafAt.delete(k3(cx + dx, y, cz + dz));
    }
  // Root flare on big trees: a stair towards the trunk and a log lying on the ground.
  if (height >= 24) {
    const base = height >= 36 ? 2 : 1;
    for (const [dx, dz, facing, axis] of [
      [1, 0, 'west', 'x'],
      [-1, 0, 'east', 'x'],
      [0, 1, 'north', 'z'],
      [0, -1, 'south', 'z'],
    ] as const) {
      const sx = cx + dx * (base + 1);
      const sz = cz + dz * (base + 1);
      if (free(sx, y0, sz)) set(sx, y0, sz, blockState('spruce_stairs', { facing, half: 'bottom' }));
      if (free(sx + dx, y0, sz + dz)) set(sx + dx, y0, sz + dz, log(axis));
    }
    // Rooted and coarse dirt around the foot (only where the ground is grass).
    const rr = Math.max(2, Math.round(shape.radii[C - 1]! / 2));
    const grass = blockState('grass_block');
    for (let dx = -rr; dx <= rr; dx++)
      for (let dz = -rr; dz <= rr; dz++) {
        if (Math.hypot(dx, dz) > rr + 0.3 || y0 < 1 || !b.inside(cx + dx, y0 - 1, cz + dz)) continue;
        if (b.getBlock(cx + dx, y0 - 1, cz + dz) !== grass) continue;
        b.setBlock(cx + dx, y0 - 1, cz + dz, blockState(r.chance(0.5) ? 'rooted_dirt' : 'coarse_dirt'), Priority.DECOR);
      }
  }

  // Ornaments (festive trees from H = 12 only).
  const placed: (Cell & { id: string })[] = [];
  if (festive && height >= 12 && kit.ornaments.length > 0) {
    const share = { 1: 0.03, 2: 0.045, 3: 0.06 }[o.intensity] * (height <= 12 ? 0.5 : 1);
    const n = Math.max(2, Math.round(hull.length * share));
    const rimPool = [...hull.filter((c) => c.rim), ...tips];
    const flankPool = hull.filter((c) => !c.rim);
    const orng = r.fork('ornaments');
    for (let i = 0; i < n; i++) {
      const pool = i < Math.round(n * 0.7) ? rimPool : flankPool;
      const angle = i * GOLDEN + 0.4;
      const h = 0.15 + (0.8 * (i + 0.5)) / n;
      const first = orng.weighted(kit.ornaments);
      for (const id of [first, ...kit.ornaments.map(([c]) => c).filter((c) => c !== first)]) {
        const c = pickNear(pool, angle, h, (q) => stillLeaf(q) && placed.every((p) => cheb(p, q) >= (p.id === id ? 4 : 2)));
        if (!c) continue;
        set(c.x, c.y, c.z, blockState(id));
        leafAt.delete(k3(c.x, c.y, c.z));
        placed.push({ x: c.x, y: c.y, z: c.z, id });
        break;
      }
    }
  }

  // Lights: one type; three in five glow one block behind the hull (all of them on small trees).
  if (festive && o.lights) {
    const lightState = o.snow
      ? blockState('waxed_exposed_copper_bulb', { lit: 'true' })
      : blockState(kit.light, kit.light.endsWith('froglight') ? { axis: 'y' } : {});
    const share = height < 12 ? 0.04 : { 1: 0.03, 2: 0.04, 3: 0.05 }[o.intensity];
    const n = Math.max(2, Math.round(hull.length * share));
    const lights: Cell[] = [];
    for (let i = 0; i < n; i++) {
      const behind = height < 12 || i % 5 < 3;
      const at = (q: Hull): Cell | null => (behind ? (q.inner ? { x: q.inner[0], y: q.y, z: q.inner[1] } : null) : q);
      const c = pickNear(hull, i * GOLDEN + 1.9, 0.08 + (0.88 * (i + 0.5)) / n, (q) => {
        const p = at(q);
        if (!p || !stillLeaf(p) || !stillLeaf(q)) return false;
        return lights.every((l) => cheb(l, p) >= 3) && placed.every((m) => cheb(m, p) >= 2);
      });
      if (!c) continue;
      const p = at(c)!;
      set(p.x, p.y, p.z, lightState);
      leafAt.delete(k3(p.x, p.y, p.z));
      lights.push(p);
    }
  }

  // Small trees (H < 12): lanterns on chains under the rim of the lowest tier instead of balls.
  if (festive && height < 12) {
    const chain = blockState(profileBlockId('iron_chain', o.minecraftVersion ?? '1.21.11'), { axis: 'y' });
    const lantern = blockState(o.lantern ?? 'lantern', { hanging: 'true' });
    const rim = hull.filter((c) => c.y === bottomY);
    const count = height < 10 ? 2 : o.intensity >= 3 ? 4 : 3;
    const hung: Cell[] = [];
    for (let i = 0; i < count; i++) {
      const c = pickNear(rim, (i * TAU) / count + 0.6, 1, (q) => stillLeaf(q) && q.y - 2 >= y0 && free(q.x, q.y - 1, q.z) && free(q.x, q.y - 2, q.z) && hung.every((p) => cheb(p, q) >= 3));
      if (!c) continue;
      set(c.x, c.y - 1, c.z, chain);
      set(c.x, c.y - 2, c.z, lantern);
      hung.push(c);
    }
  }

  // Star.
  let top = crownTop;
  if (festive && o.star) {
    const outline = blockState(kit.starOutline);
    const core = blockState(kit.starCore, kit.starCore.endsWith('froglight') ? { axis: 'y' } : {});
    const rodUp = blockState('end_rod', { facing: 'up' });
    const rays = [
      [1, 0, 'east'],
      [-1, 0, 'west'],
      [0, 1, 'south'],
      [0, -1, 'north'],
    ] as const;
    if (shape.star === 'sparkle') {
      // No cube: an end rod on the top leaf, four horizontal ones around it.
      set(cx, crownTop + 1, cz, rodUp);
      for (const [dx, dz, facing] of rays) if (free(cx + dx, crownTop, cz + dz)) set(cx + dx, crownTop, cz + dz, blockState('end_rod', { facing }));
      top = crownTop + 1;
    } else if (shape.star === 'plus') {
      set(cx, crownTop, cz, outline);
      set(cx, crownTop + 1, cz, core);
      set(cx, crownTop + 2, cz, outline);
      for (const [dx, dz] of SIDES4) set(cx + dx, crownTop + 1, cz + dz, outline);
      top = crownTop + 2;
    } else {
      const rows = shape.star === 'star5' ? STAR5 : STAR7;
      const half = (rows[0]!.length - 1) / 2;
      rows.forEach((row, j) => {
        [...row].forEach((ch, i) => {
          const state = ch === 'O' ? outline : ch === 'Y' ? core : ch === 'e' ? rodUp : null;
          if (!state) return;
          set(cx + i - half, crownTop + 1 + j, cz, state);
          set(cx, crownTop + 1 + j, cz + i - half, state);
        });
      });
      top = crownTop + rows.length;
      if (shape.star === 'star7') {
        // End-rod rays at the four arm tips and on top.
        const armY = crownTop + 5;
        for (const [dx, dz, facing] of rays) {
          const x = cx + dx * (half + 1);
          const z = cz + dz * (half + 1);
          if (free(x, armY, z)) set(x, armY, z, blockState('end_rod', { facing }));
        }
        if (free(cx, top + 1, cz)) set(cx, ++top, cz, rodUp);
      }
    }
  }

  // Free ground under the lowest tier (presents): 1 ≤ r ≤ R − 1, headroom up to the leaves.
  const R = shape.radii[C - 1]!;
  const under: TreeResult['under'] = [];
  for (let dx = -R; dx <= R; dx++)
    for (let dz = -R; dz <= R; dz++) {
      const d = Math.hypot(dx, dz);
      if (d < 1 || d > R - 0.7) continue;
      const x = cx + dx;
      const z = cz + dz;
      let headroom = 0;
      while (headroom < bottomY - y0 && free(x, y0 + headroom, z)) headroom++;
      if (headroom >= 2 && y0 >= 1 && b.inside(x, y0 - 1, z) && !b.isAir(x, y0 - 1, z)) under.push({ x, y: y0, z, headroom });
    }
  return { top, bottomRadius: R, bottomY, under };
}
