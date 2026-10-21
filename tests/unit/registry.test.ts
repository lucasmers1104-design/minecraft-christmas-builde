import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { blockState, checkBlockState, formatBlockState, listBlockDefinitions, parseBlockState } from '@/core/blocks/registry';
import { colorPalette, materialPalette } from '@/core/blocks/palettes';
import { DEFAULT_PROFILE } from '@/core/compat/profile';
import { COLOR_THEMES, MATERIAL_THEMES } from '@/core/schema/buildSpec';

const require = createRequire(import.meta.url);
// minecraft-data (PrismarineJS) is used as independent reference for Java 1.21.1 block states.
const mcData = require('minecraft-data')(DEFAULT_PROFILE.minecraftVersion) as {
  version: { minecraftVersion: string; dataVersion: number };
  blocksByName: Record<string, { states: { name: string; type: string; values?: string[] }[] } | undefined>;
};
const protocolVersions = require('minecraft-data/minecraft-data/data/pc/common/protocolVersions.json') as {
  minecraftVersion: string;
  dataVersion?: number;
}[];

describe('Kompatibilitätsprofil', () => {
  it('DataVersion 3955 entspricht Minecraft Java 1.21.1 laut minecraft-data', () => {
    expect(mcData.version.minecraftVersion).toBe('1.21.1');
    expect(mcData.version.dataVersion).toBe(DEFAULT_PROFILE.dataVersion);
    const entry = protocolVersions.find((v) => v.minecraftVersion === '1.21.1');
    expect(entry?.dataVersion).toBe(3955);
  });
});

describe('Blockstate-Registry gegen minecraft-data 1.21.1', () => {
  it('jeder Registry-Block existiert mit exakt denselben Eigenschaften und Werten', () => {
    for (const def of listBlockDefinitions()) {
      const name = def.id.replace(/^minecraft:/, '');
      const ref = mcData.blocksByName[name];
      expect(ref, `${def.id} fehlt in minecraft-data 1.21.1`).toBeDefined();
      const refProps = Object.fromEntries(
        ref!.states.map((s) => [s.name, s.type === 'bool' ? ['true', 'false'] : (s.values ?? [])]),
      );
      expect(Object.keys(def.properties).sort(), def.id).toEqual(Object.keys(refProps).sort());
      for (const [prop, values] of Object.entries(def.properties)) {
        expect([...values].sort(), `${def.id}.${prop}`).toEqual([...refProps[prop]!].sort());
      }
    }
  });

  it('enthält genug Zustände für Paletten mit mehr als 127 Einträgen', () => {
    const states = listBlockDefinitions().reduce(
      (n, d) => n + Object.values(d.properties).reduce((m, v) => m * v.length, 1),
      0,
    );
    expect(states).toBeGreaterThan(127);
  });

  it('alle Themen-Paletten bestehen aus gültigen Blockstates', () => {
    for (const t of MATERIAL_THEMES) for (const s of Object.values(materialPalette(t))) expect(checkBlockState(s).ok).toBe(true);
    for (const t of COLOR_THEMES)
      for (const v of Object.values(colorPalette(t))) {
        for (const s of Array.isArray(v) ? v : v === null ? [] : [v]) expect(checkBlockState(s).ok, s).toBe(true);
      }
  });
});

describe('checkBlockState', () => {
  it('akzeptiert kanonische vollständige Zustände', () => {
    expect(checkBlockState('minecraft:air')).toEqual({ ok: true, canonical: 'minecraft:air' });
    expect(checkBlockState('minecraft:spruce_log[axis=y]').ok).toBe(true);
    expect(checkBlockState('minecraft:spruce_leaves[distance=7,persistent=true,waterlogged=false]').ok).toBe(true);
  });

  it.each([
    ['minecraft:diamond_ore', /nicht freigegeben/],
    ['minecraft:not_a_block', /nicht freigegeben/],
    ['minecraft:spruce_log[axis=w]', /Ungültiger Wert/],
    ['minecraft:spruce_log[facing=north]', /keine Eigenschaft/],
    ['minecraft:spruce_log', /fehlt/],
    ['minecraft:spruce_leaves[waterlogged=false,persistent=true,distance=7]', /nicht kanonisch/],
    ['spruce_planks', /Syntax/],
    ['minecraft:glass[]', /Syntax/],
    ['minecraft:spruce_log[axis=y,axis=x]', /Syntax/],
    ['MINECRAFT:GLASS', /Syntax/],
  ])('lehnt %s ab', (state, reason) => {
    const result = checkBlockState(state);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(reason);
  });

  it('blockState() füllt Defaults und wirft bei Unbekanntem', () => {
    expect(blockState('oak_log')).toBe('minecraft:oak_log[axis=y]');
    expect(blockState('oak_log', { axis: 'x' })).toBe('minecraft:oak_log[axis=x]');
    expect(() => blockState('bedrock')).toThrow();
    expect(() => blockState('oak_log', { axis: 'q' })).toThrow();
    expect(parseBlockState('minecraft:oak_log[axis=x]')).toEqual({ id: 'minecraft:oak_log', properties: { axis: 'x' } });
    expect(formatBlockState('minecraft:a', { z: '1', a: '2' })).toBe('minecraft:a[a=2,z=1]');
  });
});
