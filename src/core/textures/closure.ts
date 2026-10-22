import { resourceName, type AssetPack, type ModelJson } from '@/core/textures/assetTypes';

/**
 * The subset of an asset pack needed to draw the given blocks: their blockstates, every model
 * those reference (with parents) and every texture those models use.
 */
export function packSubset(pack: AssetPack, blockIds: readonly string[]): AssetPack {
  const out: AssetPack = { version: pack.version, blockstates: {}, models: {}, textures: {} };
  const addModel = (name: string, depth = 0): void => {
    const key = resourceName(name);
    if (out.models[key] || depth > 32) return;
    const model: ModelJson | undefined = pack.models[key];
    if (!model) return;
    out.models[key] = model;
    for (const value of Object.values(model.textures ?? {})) {
      if (value.startsWith('#')) continue;
      const tex = resourceName(value);
      if (pack.textures[tex]) out.textures[tex] = pack.textures[tex];
    }
    if (model.parent) addModel(model.parent, depth + 1);
  };
  for (const id of blockIds) {
    const key = resourceName(id);
    const state = pack.blockstates[key];
    if (!state) continue;
    out.blockstates[key] = state;
    const variants = [
      ...Object.values(state.variants ?? {}).flat(),
      ...(state.multipart ?? []).flatMap((c) => (Array.isArray(c.apply) ? c.apply : [c.apply])),
    ];
    for (const v of variants) addModel(v.model);
  }
  return out;
}
