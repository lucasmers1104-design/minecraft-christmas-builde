import { AIR, blockIdOf, checkBlockState } from '@/core/blocks/registry';
import { createSeededRandom } from '@/core/generator/seededRandom';
import { DEFAULT_HOUSE_SPEC } from '@/core/schema/buildSpec';
import { createVoxelModel, type Dimensions, type VoxelModel } from '@/core/schema/voxelModel';
import { allRegistryStates } from './syntheticModels';

/**
 * Palette of `size` registry states (air first), one state per block id where possible, so
 * the palette looks like a real build (many different blocks) rather than one block in
 * hundreds of property variants.
 */
export function realisticPalette(size: number): string[] {
  const seen = new Set<string>();
  const firstPerBlock: string[] = [];
  const rest: string[] = [];
  for (const state of allRegistryStates()) {
    if (state === AIR || !checkBlockState(state, DEFAULT_HOUSE_SPEC.targetMinecraftVersion).ok) continue;
    const id = blockIdOf(state);
    if (seen.has(id)) rest.push(state);
    else {
      seen.add(id);
      firstPerBlock.push(state);
    }
  }
  return [AIR, ...firstPerBlock, ...rest].slice(0, size);
}

export interface LargeBuildingData {
  dimensions: Dimensions;
  palette: string[];
  indices: Uint16Array;
}

/**
 * Raw block data of a synthetic large building with a realistic mix: a hollow shell over
 * the whole footprint, a floor every 6 layers (with a border ring), outer walls whose
 * material changes every 24 layers, window rows, interior partition walls every 32 blocks
 * with door openings, corner pillars and scattered "furniture" on every storey (seeded,
 * spread over the whole palette). Roughly 20–25 % non-air, palette `paletteSize`.
 */
export function largeBuildingData(dimensions: Dimensions, paletteSize = 150, seed = 1): LargeBuildingData {
  const palette = realisticPalette(paletteSize);
  const { width: W, height: H, length: L } = dimensions;
  const indices = new Uint16Array(W * H * L);
  const random = createSeededRandom(seed);
  // Palette slots: 1..8 floors, 9 floor border, 10..21 walls, 22..25 glass, 26 pillar,
  // 27..30 partitions, 31.. furniture.
  const slot = (n: number) => Math.min(n, palette.length - 1);
  const furnitureFrom = slot(31);
  const furnitureCount = Math.max(1, palette.length - furnitureFrom);

  for (let y = 0; y < H; y++) {
    const storeyY = y % 6;
    const isFloor = storeyY === 0;
    const wall = slot(10 + (Math.floor(y / 24) % 12));
    const partition = slot(27 + (Math.floor(y / 48) % 4));
    for (let z = 0; z < L; z++) {
      for (let x = 0; x < W; x++) {
        const i = x + W * (z + L * y);
        const edgeX = x === 0 || x === W - 1;
        const edgeZ = z === 0 || z === L - 1;
        if (isFloor) {
          indices[i] = edgeX || edgeZ || x === 1 || z === 1 || x === W - 2 || z === L - 2 ? slot(9) : slot(1 + ((y / 6) % 8));
          continue;
        }
        if (edgeX && edgeZ) {
          indices[i] = slot(26);
          continue;
        }
        if (edgeX || edgeZ) {
          const along = edgeX ? z : x;
          const window = storeyY >= 2 && storeyY <= 4 && along % 5 >= 2 && along % 5 <= 3;
          indices[i] = window ? slot(22 + (Math.floor(y / 6) % 4)) : wall;
          continue;
        }
        const onPartition = (x % 32 === 0 || z % 32 === 0) && x > 1 && z > 1 && x < W - 2 && z < L - 2;
        if (onPartition) {
          const along = x % 32 === 0 ? z : x;
          const door = storeyY <= 2 && along % 32 >= 14 && along % 32 <= 16;
          if (!door) indices[i] = partition;
          continue;
        }
        if (storeyY === 1 && random.next() < 0.03) indices[i] = furnitureFrom + Math.floor(random.next() * furnitureCount);
      }
    }
  }
  return { dimensions, palette, indices };
}

export function largeBuildingModel(dimensions: Dimensions, paletteSize = 150, seed = 1): VoxelModel {
  const { palette, indices } = largeBuildingData(dimensions, paletteSize, seed);
  return createVoxelModel({ ...DEFAULT_HOUSE_SPEC, seed }, dimensions, palette, indices);
}
