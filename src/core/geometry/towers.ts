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
