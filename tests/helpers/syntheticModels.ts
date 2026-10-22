import { formatBlockState, isAvailableIn, listBlockDefinitions } from '@/core/blocks/registry';
import { DEFAULT_HOUSE_SPEC } from '@/core/schema/buildSpec';
import { createVoxelModel, MAX_PALETTE_SIZE, type VoxelModel } from '@/core/schema/voxelModel';

/** Every full block state the registry allows in a Minecraft version (cartesian product of property values). */
export function allRegistryStates(minecraftVersion: string = DEFAULT_HOUSE_SPEC.targetMinecraftVersion): string[] {
  const states: string[] = [];
  for (const def of listBlockDefinitions()) {
    if (!isAvailableIn(def.id, minecraftVersion)) continue;
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

/**
 * All registry states of a version, split into models whose palettes stay below the palette
 * limit (one block per state, plus air). Used to let the real WorldEdit reader check every
 * state the app can produce.
 */
export function allStateModels(minecraftVersion: string = DEFAULT_HOUSE_SPEC.targetMinecraftVersion): VoxelModel[] {
  const states = allRegistryStates(minecraftVersion).filter((s) => s !== 'minecraft:air');
  const chunk = MAX_PALETTE_SIZE - 1;
  const models: VoxelModel[] = [];
  for (let start = 0; start < states.length; start += chunk) {
    const part = states.slice(start, start + chunk);
    const width = 64;
    const length = Math.ceil(part.length / width);
    const dimensions = { width, height: 1, length };
    const indices = new Uint16Array(width * length);
    for (let i = 0; i < part.length; i++) indices[i] = i + 1;
    models.push(
      createVoxelModel({ ...DEFAULT_HOUSE_SPEC, seed: 1000 + models.length, targetMinecraftVersion: minecraftVersion }, dimensions, ['minecraft:air', ...part], indices),
    );
  }
  return models;
}
