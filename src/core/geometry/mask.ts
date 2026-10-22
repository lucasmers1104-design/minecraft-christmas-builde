/**
 * Compact, immutable 2D cell masks. All shapes of the geometry library are expressed as masks of
 * integer cells; nothing here knows about blocks. Plan views use (x, z) with +X = east and
 * +Z = south (row z = 0 is the north edge); facade views reuse the same type as (x, y).
 */
export interface Mask2D {
  /** Extent along the first axis (x). */
  readonly width: number;
  /** Extent along the second axis (z in plan views, y in facade views). */
  readonly depth: number;
  /** Number of set cells. */
  readonly count: number;
  /** True if the cell is set; cells outside the grid are never set. */
  has(x: number, z: number): boolean;
  /** All set cells, row by row (z ascending, then x ascending). */
  cells(): Array<[number, number]>;
}

/** Outline style: `thin` = 4-neighbour test (corner-connected), `thick` = 8-neighbour test (edge-connected). */
export type OutlineMode = 'thin' | 'thick';

const N4: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const N8: ReadonlyArray<readonly [number, number]> = [...N4, [1, 1], [1, -1], [-1, 1], [-1, -1]];

class BitMask implements Mask2D {
  readonly count: number;

  constructor(
    readonly width: number,
    readonly depth: number,
    private readonly bits: Uint8Array,
  ) {
    let n = 0;
    for (const b of bits) n += b;
    this.count = n;
  }

  has(x: number, z: number): boolean {
    if (!Number.isInteger(x) || !Number.isInteger(z)) return false;
    if (x < 0 || z < 0 || x >= this.width || z >= this.depth) return false;
    return this.bits[z * this.width + x] === 1;
  }

  cells(): Array<[number, number]> {
    const out: Array<[number, number]> = [];
    for (let z = 0; z < this.depth; z++)
      for (let x = 0; x < this.width; x++) if (this.bits[z * this.width + x] === 1) out.push([x, z]);
    return out;
  }
}

/** Builds a mask of `width × depth` cells from a predicate. */
export function maskFrom(width: number, depth: number, inside: (x: number, z: number) => boolean): Mask2D {
  if (!Number.isInteger(width) || !Number.isInteger(depth) || width < 0 || depth < 0) {
    throw new RangeError(`Ungültige Maskengröße ${width}×${depth}`);
  }
  const bits = new Uint8Array(width * depth);
  for (let z = 0; z < depth; z++) for (let x = 0; x < width; x++) if (inside(x, z)) bits[z * width + x] = 1;
  return new BitMask(width, depth, bits);
}

/** Keeps the cells of `mask` that have at least one empty 4- (`thin`) or 8-neighbour (`thick`). */
export function outline(mask: Mask2D, mode: OutlineMode): Mask2D {
  const nb = mode === 'thin' ? N4 : N8;
  return maskFrom(mask.width, mask.depth, (x, z) => mask.has(x, z) && nb.some(([dx, dz]) => !mask.has(x + dx, z + dz)));
}

/** Geometric centre of the grid in cell coordinates (half-integer for even extents). */
export function centreOf(mask: Mask2D): { x: number; z: number } {
  return { x: (mask.width - 1) / 2, z: (mask.depth - 1) / 2 };
}

/** Width of the set cells along x (bounding box), 0 for an empty mask. */
export function spanX(mask: Mask2D): number {
  let min = Infinity;
  let max = -Infinity;
  for (const [x] of mask.cells()) {
    min = Math.min(min, x);
    max = Math.max(max, x);
  }
  return max < min ? 0 : max - min + 1;
}

/** ASCII rendering, one string per row (z = 0 first), for tests and debugging. */
export function renderMask(mask: Mask2D, on = '#', off = '.'): string[] {
  return Array.from({ length: mask.depth }, (_, z) =>
    Array.from({ length: mask.width }, (_, x) => (mask.has(x, z) ? on : off)).join(''),
  );
}
