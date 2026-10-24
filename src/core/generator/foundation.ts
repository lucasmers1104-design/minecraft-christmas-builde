import { AIR, blockIdOf, blockState, definitionOf } from '@/core/blocks/registry';
import { Priority, type VoxelBuilder } from '@/core/generator/geometry';
import { cellHash, pickBy } from '@/core/generator/landscapeSite';

/**
 * Foundation below the ground (option „Fundament nach unten“, 0–4 layers, default off): the
 * finished building is lifted by `depth` layers and the layers below its ground are filled, so
 * a pasted .schem does not float above uneven terrain. The export writes Offset [0, −depth, 0]:
 * WorldEdit then puts the ground layer exactly where it would be without a foundation.
 *
 * - Under walls and plinths (a full building block with something standing on it) the block of
 *   the ground layer continues downwards.
 * - Under lawn, paths and floors: earth (dirt, some coarse and rooted dirt).
 * - The plot edge becomes an embankment (reference 20102835): exposed faces show coarse dirt,
 *   dirt and a little stone, and where the landscape dissolved the edge, the cut-out cells step
 *   down one layer per ring with grass on top – a terrace edge instead of a hole.
 */

/** Ground materials: below them comes earth, not more of the same block. */
const SOIL = new Set([
  'grass_block',
  'dirt',
  'coarse_dirt',
  'rooted_dirt',
  'podzol',
  'mycelium',
  'moss_block',
  'pale_moss_block',
  'dirt_path',
  'farmland',
  'mud',
  'gravel',
  'sand',
  'red_sand',
  'clay',
  'snow_block',
  'ice',
  'packed_ice',
  'blue_ice',
]);

const INNER: readonly (readonly [string, number])[] = [
  ['dirt', 70],
  ['coarse_dirt', 20],
  ['rooted_dirt', 10],
];
const FACE: readonly (readonly [string, number])[] = [
  ['coarse_dirt', 35],
  ['dirt', 45],
  ['rooted_dirt', 10],
  ['stone', 10],
];
/** Deeper than two layers below the ground the embankment turns stony. */
const DEEP_FACE: readonly (readonly [string, number])[] = [
  ['dirt', 35],
  ['coarse_dirt', 20],
  ['stone', 30],
  ['andesite', 15],
];

/** Highest terrace ring that steps down from the plot (one layer per ring). */
const TERRACE_RINGS = 2;

function isBuildingBlock(state: string): boolean {
  if (state === AIR || SOIL.has(blockIdOf(state).slice('minecraft:'.length))) return false;
  const shape = definitionOf(state).shape;
  return shape === 'cube' || shape === 'pillar' || shape === 'facing_cube';
}

/**
 * The building `depth` layers higher with its foundation filled in. Returns the same builder for
 * depth 0. Deterministic: materials come from a hash of the seed and the cell.
 */
export function extendFoundation(b: VoxelBuilder, depth: number, seed: number): VoxelBuilder {
  if (depth <= 0) return b;
  const { width: W, length: L } = b.dimensions;
  const out = b.raised(depth);
  const at = (x: number, z: number) => x + W * z;
  // Top layer (new y) of the fill per column: depth − 1 under the ground, lower on the terrace
  // rings, −1 where nothing goes.
  const top = new Int16Array(W * L).fill(-1);
  const soil = new Uint8Array(W * L);
  for (let z = 0; z < L; z++)
    for (let x = 0; x < W; x++) {
      const g = b.getBlock(x, 0, z);
      if (g === AIR) continue;
      top[at(x, z)] = depth - 1;
      soil[at(x, z)] = isBuildingBlock(g) && b.dimensions.height > 1 && !b.isAir(x, 1, z) ? 0 : 1;
    }
  // Terrace: empty cells near the plot step down one layer per ring (Chebyshev distance to soil).
  const ring = new Int8Array(W * L);
  for (let z = 0; z < L; z++)
    for (let x = 0; x < W; x++) {
      if (top[at(x, z)]! >= 0) continue;
      let d = 0;
      for (let r = 1; r <= TERRACE_RINGS && d === 0; r++)
        for (let dz = -r; dz <= r && d === 0; dz++)
          for (let dx = -r; dx <= r && d === 0; dx++) {
            const nx = x + dx;
            const nz = z + dz;
            if (nx >= 0 && nz >= 0 && nx < W && nz < L && soil[at(nx, nz)] && b.getBlock(nx, 0, nz) !== AIR) d = r;
          }
      if (d > 0 && depth - d >= 0) ring[at(x, z)] = d;
    }
  for (let i = 0; i < W * L; i++)
    if (ring[i]! > 0) {
      top[i] = depth - ring[i]!;
      soil[i] = 1;
    }
  const exposed = (x: number, y: number, z: number) =>
    [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].some(([dx, dz]) => {
      const nx = x + dx!;
      const nz = z + dz!;
      return nx < 0 || nz < 0 || nx >= W || nz >= L || top[at(nx, nz)]! < y;
    });
  const grass = blockState('grass_block');
  for (let z = 0; z < L; z++)
    for (let x = 0; x < W; x++) {
      const t = top[at(x, z)]!;
      if (t < 0) continue;
      if (!soil[at(x, z)]) {
        const g = b.getBlock(x, 0, z);
        for (let y = 0; y <= t; y++) out.setBlock(x, y, z, g, Priority.STRUCTURE);
        continue;
      }
      for (let y = 0; y <= t; y++) {
        const terraceTop = ring[at(x, z)]! > 0 && y === t;
        const u = cellHash(seed, x, z, 40 + y);
        const mix = !exposed(x, y, z) ? INNER : depth - y > 2 ? DEEP_FACE : FACE;
        out.setBlock(x, y, z, terraceTop ? grass : blockState(pickBy(mix, u)), Priority.DECOR);
      }
    }
  return out;
}
