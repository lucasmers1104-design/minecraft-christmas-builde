import type { VoxelModel } from '@/core/schema/voxelModel';

/**
 * File name of an exported schematic. Kept in its own module without Node imports, so the
 * browser can show the name before the first download.
 */
export function schematicFileName(model: VoxelModel): string {
  const { kind, size, seed } = model.spec;
  return `christmas-${kind}-${size}-seed${seed}-${model.hash.slice(0, 8)}.schem`;
}
