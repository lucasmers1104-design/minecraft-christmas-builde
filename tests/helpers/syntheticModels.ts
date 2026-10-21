import { formatBlockState, listBlockDefinitions } from '@/core/blocks/registry';
import { DEFAULT_HOUSE_SPEC } from '@/core/schema/buildSpec';
import { createVoxelModel, type VoxelModel } from '@/core/schema/voxelModel';

/** Every full block state the registry allows (cartesian product of property values). */
export function allRegistryStates(): string[] {
  const states: string[] = [];
  for (const def of listBlockDefinitions()) {
    let combos: Record<string, string>[] = [{}];
    for (const [prop, values] of Object.entries(def.properties)) {
      combos = combos.flatMap((c) => values.map((v) => ({ ...c, [prop]: v })));
    }
    for (const c of combos) states.push(formatBlockState(def.id, c));
  }
  return states;
}

/**
 * Synthetic model whose palette has more than 127 entries, so palette indices >= 128 need
 * two-byte VarInts. Blocks are laid out in index order, cycling through all states.
 */
export function largePaletteModel(): VoxelModel {
  const states = allRegistryStates();
  const dimensions = { width: 16, height: 4, length: 12 };
  const volume = dimensions.width * dimensions.height * dimensions.length;
  const indices = new Uint16Array(volume);
  for (let i = 0; i < volume; i++) indices[i] = i % states.length;
  return createVoxelModel({ ...DEFAULT_HOUSE_SPEC, seed: 999 }, dimensions, states, indices);
}
