import { describe, expect, it } from 'vitest';
import { lintHouse } from '@/core/analysis/buildingLints';
import { blockIdOf, checkBlockState, getBlockDefinition, isAvailableIn, profileBlockId } from '@/core/blocks/registry';
import { SUPPORTED_MINECRAFT_VERSIONS } from '@/core/compat/profile';
import { generateBuildingWithReport } from '@/core/generator/generateBuilding';
import { DEFAULT_HOUSE_SPEC, type BuildSpec } from '@/core/schema/buildSpec';
import { blocksOf, listMaterials } from '@/core/style/materials';
import { PALETTES, ROLES } from '@/core/style/palettes';
import { STYLE_IDS, STYLES, type StyleId } from '@/core/style/styles';

/**
 * Palettes from research 07–13: every palette builds in both Minecraft versions without
 * validator repairs; blocks added in 1.21.4 (pale oak, resin) appear in 1.21.11 and are replaced
 * by their stand-in in 1.21.1.
 */

const OLD = '1.21.1';
const styleOf = (paletteId: string): StyleId => STYLE_IDS.find((s) => STYLES[s].palettes.includes(paletteId))!;
const isNewer = (block: string) => !isAvailableIn(`minecraft:${block}`, OLD);
const usesNewer = (paletteId: string) => {
  const p = PALETTES.find((x) => x.id === paletteId)!;
  return ROLES.some((role) => p.roles[role].some(([m]) => blocksOf(m).some(isNewer)));
};
const NEWER_PALETTES = PALETTES.map((p) => p.id).filter(usesNewer);

function build(paletteId: string, over: Partial<BuildSpec>) {
  const spec: BuildSpec = { ...DEFAULT_HOUSE_SPEC, style: styleOf(paletteId), ...over, options: { palette: paletteId } };
  const r = generateBuildingWithReport(spec);
  const ctx = `${paletteId} ${spec.kind} ${spec.size} ${spec.theme} ${spec.seed} ${spec.targetMinecraftVersion}`;
  expect(r.repairs, ctx).toEqual([]);
  for (const state of r.model.palette) expect(checkBlockState(state, spec.targetMinecraftVersion).ok, `${ctx}: ${state}`).toBe(true);
  if (r.house) expect(lintHouse(r.model, r.house), ctx).toEqual([]);
  return { r, ids: new Set(r.model.palette.map(blockIdOf)) };
}

describe('Versionsersatz für Blöcke ab 1.21.4', () => {
  it('jeder Block ab 1.21.4 im Materialkatalog hat für 1.21.1 einen Ersatz gleicher Form', () => {
    let checked = 0;
    for (const m of listMaterials())
      for (const block of blocksOf(m.id).filter(isNewer)) {
        const id = `minecraft:${block}`;
        const standIn = profileBlockId(id, OLD);
        expect(standIn, block).not.toBe(id);
        expect(isAvailableIn(standIn, OLD), standIn).toBe(true);
        expect(getBlockDefinition(standIn)?.shape, `${block} → ${standIn}`).toBe(getBlockDefinition(id)?.shape);
        expect(profileBlockId(id, '1.21.11'), block).toBe(id);
        checked++;
      }
    expect(checked).toBeGreaterThan(10);
    expect(NEWER_PALETTES.length).toBeGreaterThanOrEqual(4);
  });

  it.each(NEWER_PALETTES)('%s: alle Bauwerkstypen in 1.21.11 und 1.21.1 ohne Reparatur, nur gültige Zustände', (paletteId) => {
    let newerIn11 = 0;
    for (const targetMinecraftVersion of SUPPORTED_MINECRAFT_VERSIONS) {
      const specs: Partial<BuildSpec>[] = [
        ...(['small', 'large'] as const).flatMap((size) => (['none', 'christmas'] as const).map((theme) => ({ kind: 'house' as const, size, theme, seed: size === 'small' ? 1 : 2 }))),
        { kind: 'station', size: 'medium' },
        { kind: 'market_stall', size: 'medium' },
        { kind: 'tower', size: 'medium' },
      ];
      for (const s of specs) {
        const { ids } = build(paletteId, { ...s, targetMinecraftVersion });
        const newer = [...ids].filter((id) => !isAvailableIn(id, OLD));
        if (targetMinecraftVersion === OLD) expect(newer, `${paletteId} ${s.kind} ${OLD}`).toEqual([]);
        else newerIn11 += newer.length;
      }
    }
    // The palette really shows its new blocks in 1.21.11 (accents only are not built).
    const p = PALETTES.find((x) => x.id === paletteId)!;
    const onlyAccent = ROLES.filter((role) => role !== 'accent').every((role) => p.roles[role].every(([m]) => !blocksOf(m).some(isNewer)));
    if (!onlyAccent) expect(newerIn11, paletteId).toBeGreaterThan(0);
  });
});

describe('Paletten der Recherche 07–13', () => {
  it.each(PALETTES.map((p) => p.id))('%s: Haus in 1.21.11 und 1.21.1 ohne Reparatur und ohne Lint-Befund', (paletteId) => {
    build(paletteId, { size: 'medium', theme: 'christmas', seed: 1 });
    build(paletteId, { size: 'large', theme: 'none', seed: 2, targetMinecraftVersion: OLD });
  });

  it('Paletten-IDs, die Parser, Few-Shot-Beispiele und Tests nennen, gibt es weiter', () => {
    for (const id of ['medieval_tudor', 'medieval_stone', 'japanese_temple', 'nordic_longhouse', 'rustic_logs', 'rustic_spruce']) {
      expect(PALETTES.some((p) => p.id === id), id).toBe(true);
    }
    // rustic_logs stays the log cabin: walls of logs laid as courses.
    const logs = PALETTES.find((p) => p.id === 'rustic_logs')!;
    for (const role of ['wall', 'upperWall'] as const) expect(logs.roles[role].every(([m]) => m.endsWith('_log')), role).toBe(true);
  });
});
