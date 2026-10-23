import { assertInt, circle } from './circles';
import { centreOf, maskFrom, outline, type Mask2D, type OutlineMode } from './mask';

/** Minecraft horizontal directions: +X = east, +Z = south. */
export type Facing = 'north' | 'south' | 'east' | 'west';

/**
 * Direction from cell (x, z) towards `centre` (e.g. a roof stair on a tower ring facing the tower
 * axis): the dominant axis wins, a tie (diagonal cell) goes to the z axis. The centre cell itself gives 'north'.
 */
export function ringFacing(x: number, z: number, centre: { x: number; z: number }): Facing {
  const dx = centre.x - x;
  const dz = centre.z - z;
  if (Math.abs(dx) > Math.abs(dz)) return dx > 0 ? 'east' : 'west';
  return dz > 0 ? 'south' : 'north';
}

/** Outline cells of a layer (default: thick, so stair corners can join) with their facing towards the layer centre. */
export function facingRing(layer: Mask2D, mode: OutlineMode = 'thick'): Array<{ x: number; z: number; facing: Facing }> {
  const c = centreOf(layer);
  return outline(layer, mode)
    .cells()
    .map(([x, z]) => ({ x, z, facing: ringFacing(x, z, c) }));
}

/** The 8 symmetries of the square (dihedral group D4) applied to cell (x, z) of an n×n grid. */
export function dihedralImages(x: number, z: number, n: number): Array<[number, number]> {
  const m = n - 1;
  return [[x, z], [m - x, z], [x, m - z], [m - x, m - z], [z, x], [m - z, x], [z, m - x], [m - z, m - x]];
}

/**
 * Merlons on the thin ring of diameter `d`: ring cells sorted by angle (starting at the east axis,
 * turning towards south) alternate crenel / merlon, so the first cell (the east axis cell for odd d)
 * is a crenel. Reproduces the D15 diagram of the notes.
 */
export function battlementPattern(d: number): Mask2D {
  assertInt(d, 'Durchmesser');
  const ring = circle(d, 'thin');
  const vec = ([x, z]: [number, number]) => ({ x, z, u: 2 * x - d + 1, v: 2 * z - d + 1 });
  const half = (p: { u: number; v: number }) => (p.v > 0 || (p.v === 0 && p.u > 0) ? 0 : 1);
  const sorted = ring
    .cells()
    .map(vec)
    .sort((a, b) => half(a) - half(b) || b.u * a.v - a.u * b.v);
  const merlons = new Set(sorted.filter((_, i) => i % 2 === 1).map((p) => p.z * d + p.x));
  return maskFrom(d, d, (x, z) => merlons.has(z * d + x));
}

/**
 * True if the alternating merlon pattern on the thin ring is invariant under all 8 symmetries of the
 * square (90° turns and all mirror axes). Computed, not tabulated: for D 5–25 this holds for 7, 9, 15, 17, 21, 23.
 */
export function battlementSymmetric(d: number): boolean {
  const p = battlementPattern(d);
  if (p.count * 2 !== circle(d, 'thin').count) return false; // odd ring: the alternation does not close
  return p.cells().every(([x, z]) => dihedralImages(x, z, d).every(([a, b]) => p.has(a, b)));
}

/**
 * Parity-preserving taper: `steps + 1` diameters starting at `baseD`, each 2 smaller (one block per
 * side, so the axis never drifts half a block), clamped at 1 (odd) or 2 (even).
 */
export function taperDiameters(baseD: number, steps: number): number[] {
  assertInt(baseD, 'Durchmesser');
  assertInt(steps, 'Schritte', 0);
  const min = baseD % 2 === 1 ? 1 : 2;
  return Array.from({ length: steps + 1 }, (_, i) => Math.max(baseD - 2 * i, min));
}

// ---------------------------------------------------------------------------------------------
// Tower crowns and helms (research notes "Bauqualitaet 2026-10", report 16: T1, T2, T5, T7, T9).
// ---------------------------------------------------------------------------------------------

/**
 * Angle of cell (x, z) of an n×n grid folded into the first octant [0, π/4] (0 = on an axis,
 * π/4 = on a diagonal). All 8 images of a cell under the square's symmetries get the identical
 * value, so every rule based on it is exactly D4-symmetric (no floating-point asymmetry).
 */
function octantAngle(x: number, z: number, n: number): number {
  const u = Math.abs(2 * x - n + 1);
  const v = Math.abs(2 * z - n + 1);
  return Math.atan2(Math.min(u, v), Math.max(u, v));
}

const N4: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/**
 * Merlons by angular sectors on any ring mask (T2): `merlons` merlons (a multiple of 4) centred on
 * the axes, each covering the fraction `share` of its period (0.5 = merlon as wide as the crenel,
 * 2/3 = "two up, one down"). Works on the ring that is actually built (thick or thin, any
 * diameter), so there are no tooth gaps at the diagonal steps, and the pattern is invariant under
 * all 8 symmetries of the square for every diameter.
 */
export function sectorBattlements(ringMask: Mask2D, merlons: number, share = 0.5): Mask2D {
  assertInt(merlons, 'Zinnenzahl', 4);
  if (merlons % 4 !== 0) throw new RangeError(`Zinnenzahl muss durch 4 teilbar sein (erhalten: ${merlons})`);
  if (!(share > 0 && share < 1)) throw new RangeError(`Zinnenanteil muss zwischen 0 und 1 liegen (erhalten: ${share})`);
  if (ringMask.width !== ringMask.depth) throw new RangeError('Zinnen brauchen ein quadratisches Raster');
  const n = ringMask.width;
  const period = (2 * Math.PI) / merlons;
  return maskFrom(n, n, (x, z) => {
    if (!ringMask.has(x, z)) return false;
    let f = octantAngle(x, z, n) / period;
    f -= Math.round(f);
    return Math.abs(f) <= share / 2 + 1e-9;
  });
}

/** Outer silhouette of a ring: its cells with a 4-neighbour outside the filled circle of the grid. */
function silhouette(ringMask: Mask2D): Array<[number, number]> {
  const outer = circle(ringMask.width, 'filled');
  return ringMask.cells().filter(([x, z]) => N4.some(([dx, dz]) => !outer.has(x + dx, z + dz)));
}

/** Lengths of the merlon and crenel runs along the outer silhouette of a ring, in angular order (cyclic). */
export function battlementRuns(ringMask: Mask2D, merlonMask: Mask2D): { merlons: number[]; crenels: number[] } {
  const c = (ringMask.width - 1) / 2;
  const cells = silhouette(ringMask)
    .map(([x, z]) => ({ a: Math.atan2(z - c, x - c), m: merlonMask.has(x, z) }))
    .sort((p, q) => p.a - q.a);
  const out = { merlons: [] as number[], crenels: [] as number[] };
  const start = cells.findIndex((p, i) => p.m !== cells[(i - 1 + cells.length) % cells.length]!.m);
  if (start < 0) return out;
  let current = cells[start]!.m;
  let length = 0;
  for (let i = 0; i < cells.length; i++) {
    const p = cells[(start + i) % cells.length]!;
    if (p.m === current) length++;
    else {
      (current ? out.merlons : out.crenels).push(length);
      current = p.m;
      length = 1;
    }
  }
  (current ? out.merlons : out.crenels).push(length);
  return out;
}

/**
 * Picks merlon count (multiple of 4) and share for a ring so that merlons and crenels are as
 * regular as possible along the silhouette: crenels 1–2 wide, merlons 1–3. `wide` prefers merlons
 * wider than crenels ("two up, one down", research 08 T14), `even` 1:1. Deterministic.
 */
export function battlementLayout(ringMask: Mask2D, prefer: 'wide' | 'even' = 'wide'): { merlons: number; share: number } {
  const [tm, tc] = prefer === 'wide' ? [2, 1] : [1.5, 1.2];
  const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  let best: { merlons: number; share: number; score: number } | null = null;
  const cells = silhouette(ringMask).length;
  for (let merlons = 8; merlons <= Math.max(8, cells); merlons += 4)
    for (const share of [0.5, 0.6, 2 / 3, 0.75]) {
      const runs = battlementRuns(ringMask, sectorBattlements(ringMask, merlons, share));
      if (runs.merlons.length === 0 || runs.crenels.length === 0) continue;
      const mSpread = Math.max(...runs.merlons) - Math.min(...runs.merlons);
      const cSpread = Math.max(...runs.crenels) - Math.min(...runs.crenels);
      const meanM = mean(runs.merlons);
      const meanC = mean(runs.crenels);
      const score =
        2 * (mSpread + cSpread) +
        Math.abs(meanM - tm) +
        1.5 * Math.abs(meanC - tc) +
        (Math.max(...runs.crenels) > 2 ? 5 : 0) +
        (Math.max(...runs.merlons) > 3 ? 5 : 0) +
        (prefer === 'wide' && meanM < meanC ? 3 : 0);
      if (!best || score < best.score - 1e-9) best = { merlons, share, score };
    }
  if (!best) throw new RangeError('Kein Zinnenmuster für diesen Ring');
  return { merlons: best.merlons, share: best.share };
}

/**
 * Notch cells of a round wall of diameter `d` (T5), on the (d + 2) grid of the ring just outside
 * the wall: cells that touch the wall circle with two faces (the concave corner of a pixel step).
 * Per quadrant only the notches closest to the diagonal are kept (ties keep both, so the result
 * stays D4-symmetric). Posts or pilasters placed there cover exactly the steps of the circle.
 */
export function notchCells(d: number): Mask2D {
  assertInt(d, 'Durchmesser', 3);
  const n = d + 2;
  const wall = circle(d, 'filled');
  const isWall = (x: number, z: number) => wall.has(x - 1, z - 1);
  const candidates = circle(n, 'filled')
    .cells()
    .filter(([x, z]) => !isWall(x, z) && N4.filter(([dx, dz]) => isWall(x + dx, z + dz)).length >= 2);
  const off = (x: number, z: number) => Math.PI / 4 - octantAngle(x, z, n);
  const bestOff = Math.min(...candidates.map(([x, z]) => off(x, z)));
  const keep = new Set(candidates.filter(([x, z]) => off(x, z) <= bestOff + 1e-9).map(([x, z]) => z * n + x));
  return maskFrom(n, n, (x, z) => keep.has(z * n + x));
}

/**
 * Layer diameters of a spire (T9), bottom → top: base `baseD`, about `height` layers, radius
 * profile (1 − t)^exponent (1 = straight, > 1 concave, < 1 convex). Parity is kept, a layer is
 * never more than 2 narrower than the one below (no terraces), and the tip ends in at most
 * `maxSingles` single blocks (1 or the 2×2 centre) – thin elements (post, rod) take over above,
 * never a column of roof blocks.
 */
export function spireDiameters(baseD: number, height: number, exponent = 1, maxSingles = 2): number[] {
  assertInt(baseD, 'Durchmesser');
  assertInt(height, 'Höhe', 2);
  assertInt(maxSingles, 'Spitzenblöcke');
  if (!(exponent > 0)) throw new RangeError(`Exponent muss positiv sein (erhalten: ${exponent})`);
  const min = baseD % 2 === 1 ? 1 : 2;
  const out: number[] = [];
  for (let i = 0; i < height; i++) {
    // Profile sampled at the layer bottoms, rounded to the nearest diameter of the base's parity:
    // a straight spire gets even runs (9, 9, 7, 7, 5, 5 …), a concave one runs that grow upwards.
    const real = baseD * (1 - i / height) ** exponent;
    let w = Math.max(min, min + 2 * Math.round((real - min) / 2 - 1e-9));
    const prev = out.at(-1);
    if (prev !== undefined) w = Math.min(prev, Math.max(w, prev - 2));
    out.push(w);
  }
  while (out.at(-1)! > min) out.push(Math.max(min, out.at(-1)! - 2));
  return out.slice(0, out.indexOf(min) + maxSingles);
}

/** One layer of a helm: diameter and shift of its centre along the bend direction. */
export interface HelmLayer {
  d: number;
  /** Offset of the layer centre in blocks (0 = on the tower axis). */
  shift: number;
}

/**
 * Witch-hat helm for a round tower of odd diameter `towerD` (report 09, T7): a brim of d + 4 (to be
 * built as a ring of bottom slabs), a vertical hat band of d + 2, then a slender concave cone whose
 * runs grow upwards (2, 3, 4 … layers per diameter; compressed for wide towers so the hat stays
 * about 1.55 × the brim high) and, with `bend`, a tip bent by one block per stage starting at
 * diameter 3 – every shifted layer overlaps the one below with at least one face. Ends in two
 * single blocks.
 */
export function witchHatLayers(towerD: number, bend = true): HelmLayer[] {
  assertInt(towerD, 'Durchmesser', 3);
  if (towerD % 2 === 0) throw new RangeError('Der Hexenhut braucht einen ungeraden Turmdurchmesser');
  const brim = towerD + 4;
  const levels: number[] = [];
  for (let w = towerD + 2; w >= 3; w -= 2) levels.push(w);
  const L = levels.length;
  const growth = L > 1 ? Math.min(1, Math.max(0.25, (1.55 * brim - 3 - 2 * L) / ((L * (L - 1)) / 2))) : 0;
  const out: HelmLayer[] = [{ d: brim, shift: 0 }];
  levels.forEach((w, k) => {
    const run = Math.max(2, Math.floor(2 + k * growth + 0.5));
    for (let i = 0; i < run; i++) out.push({ d: w, shift: bend && w === 3 && i >= 2 ? 1 : 0 });
  });
  out.push({ d: 1, shift: bend ? 2 : 0 }, { d: 1, shift: bend ? 2 : 0 });
  return out;
}
