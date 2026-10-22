import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { itemsForState, stackSizeOf } from '@/core/analysis/materialCounts';
import { DYE_COLORS } from '@/core/blocks/families';
import {
  blockState,
  checkBlockState,
  formatBlockState,
  isAvailableIn,
  listBlockDefinitions,
  parseBlockState,
  profileBlockId,
} from '@/core/blocks/registry';
import { colorPalette, materialPalette } from '@/core/blocks/palettes';
import { DEFAULT_PROFILE, PROFILES } from '@/core/compat/profile';
import { COLOR_THEMES, MATERIAL_THEMES } from '@/core/schema/buildSpec';

const require = createRequire(import.meta.url);
type McBlock = { states: { name: string; type: string; values?: string[] }[]; defaultState: number; minStateId: number };
type McData = {
  version: { minecraftVersion: string; dataVersion: number };
  blocksByName: Record<string, McBlock | undefined>;
  itemsByName: Record<string, { stackSize: number } | undefined>;
};
// minecraft-data (PrismarineJS) is the independent reference for Java block states per version.
const mcData = (version: string) => require('minecraft-data')(version) as McData;
const protocolVersions = require('minecraft-data/minecraft-data/data/pc/common/protocolVersions.json') as {
  minecraftVersion: string;
  dataVersion?: number;
}[];

describe('Kompatibilitätsprofile', () => {
  it('Standard ist Minecraft 1.21.11 (Server des Nutzers)', () => {
    expect(DEFAULT_PROFILE.minecraftVersion).toBe('1.21.11');
    expect(PROFILES.map((p) => p.minecraftVersion)).toEqual(['1.21.11', '1.21.1']);
  });

  it.each(PROFILES.map((p) => [p.minecraftVersion, p.dataVersion] as const))(
    'DataVersion von %s ist %i laut minecraft-data',
    (version, dataVersion) => {
      expect(mcData(version).version.minecraftVersion).toBe(version);
      expect(mcData(version).version.dataVersion).toBe(dataVersion);
      expect(protocolVersions.find((v) => v.minecraftVersion === version)?.dataVersion).toBe(dataVersion);
    },
  );
});

/** Vanilla default state of a block, decoded from minecraft-data's state id layout. */
function vanillaDefaults(ref: McBlock): Record<string, string> {
  const states = ref.states.map((s) => ({ name: s.name, values: s.type === 'bool' ? ['true', 'false'] : (s.values ?? []) }));
  let index = ref.defaultState - ref.minStateId;
  const out: Record<string, string> = {};
  for (let i = states.length - 1; i >= 0; i--) {
    const s = states[i]!;
    out[s.name] = s.values[index % s.values.length]!;
    index = Math.floor(index / s.values.length);
  }
  return out;
}

/** Defaults that deliberately differ from vanilla (documented in shapes.ts). */
const DEFAULT_OVERRIDES: Record<string, string> = { persistent: 'true' };

describe.each(PROFILES.map((p) => p.minecraftVersion))('Blockstate-Registry gegen minecraft-data %s', (version) => {
  const data = mcData(version);
  const available = listBlockDefinitions().filter((d) => isAvailableIn(d.id, version));

  it('jeder verfügbare Registry-Block existiert mit exakt denselben Eigenschaften und Werten', () => {
    for (const def of available) {
      const name = def.id.replace(/^minecraft:/, '');
      const ref = data.blocksByName[name];
      expect(ref, `${def.id} fehlt in minecraft-data ${version}`).toBeDefined();
      const refProps = Object.fromEntries(
        ref!.states.map((s) => [s.name, s.type === 'bool' ? ['true', 'false'] : (s.values ?? [])]),
      );
      expect(Object.keys(def.properties).sort(), def.id).toEqual(Object.keys(refProps).sort());
      for (const [prop, values] of Object.entries(def.properties)) {
        expect([...values].sort(), `${def.id}.${prop}`).toEqual([...refProps[prop]!].sort());
      }
    }
  });

  it('Standardzustände entsprechen Vanilla (außer dokumentierten Ausnahmen)', () => {
    for (const def of available) {
      const ref = data.blocksByName[def.id.replace(/^minecraft:/, '')]!;
      const expected = vanillaDefaults(ref);
      for (const [prop, value] of Object.entries(def.defaults)) {
        const want = DEFAULT_OVERRIDES[prop] ?? expected[prop];
        expect(value, `${def.id}.${prop}`).toBe(want);
      }
    }
  });

  it('Blöcke mit Versionsangabe fehlen in den anderen Versionen wirklich', () => {
    for (const def of listBlockDefinitions().filter((d) => !isAvailableIn(d.id, version))) {
      expect(data.blocksByName[def.id.replace(/^minecraft:/, '')], `${def.id} in ${version}`).toBeUndefined();
    }
  });

  it('Item-Stapelgrößen stimmen (Materialliste)', () => {
    for (const def of available) {
      for (const item of itemsForState(blockState(def.id))) {
        const ref = data.itemsByName[item.item.replace(/^minecraft:/, '')];
        expect(ref, `Item ${item.item} (aus ${def.id}) fehlt in ${version}`).toBeDefined();
        expect(stackSizeOf(item.item), item.item).toBe(ref!.stackSize);
      }
    }
  });
});

describe('Versionen', () => {
  it('iron_chain gibt es nur in 1.21.11, chain nur in 1.21.1; profileBlockId übersetzt', () => {
    expect(checkBlockState('minecraft:iron_chain[axis=y,waterlogged=false]', '1.21.11').ok).toBe(true);
    expect(checkBlockState('minecraft:iron_chain[axis=y,waterlogged=false]', '1.21.1').ok).toBe(false);
    expect(checkBlockState('minecraft:chain[axis=y,waterlogged=false]', '1.21.11').ok).toBe(false);
    expect(profileBlockId('iron_chain', '1.21.1')).toBe('minecraft:chain');
    expect(profileBlockId('iron_chain', '1.21.11')).toBe('minecraft:iron_chain');
  });

  it('enthält die geforderten Familien vollständig', () => {
    const ids = new Set(listBlockDefinitions().map((d) => d.id.replace('minecraft:', '')));
    for (const wood of ['oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak', 'mangrove', 'cherry', 'pale_oak', 'bamboo', 'crimson', 'warped']) {
      for (const form of ['stairs', 'slab', 'fence', 'fence_gate', 'trapdoor', 'door']) expect(ids, `${wood}_${form}`).toContain(`${wood}_${form}`);
    }
    for (const stone of ['stone_brick', 'cobblestone', 'mossy_cobblestone', 'mossy_stone_brick', 'deepslate_tile', 'deepslate_brick', 'brick', 'mud_brick', 'tuff_brick', 'sandstone', 'polished_blackstone', 'andesite', 'granite', 'red_sandstone', 'prismarine', 'diorite']) {
      expect(ids, `${stone}_stairs`).toContain(`${stone}_stairs`);
      expect(ids, `${stone}_slab`).toContain(`${stone}_slab`);
    }
    for (const id of ['smooth_quartz_stairs', 'glass_pane', 'iron_bars', 'lantern', 'soul_lantern', 'iron_chain', 'candle', 'red_candle', 'campfire', 'cherry_leaves', 'pink_petals', 'bamboo_block', 'waxed_cut_copper_stairs', 'potted_spruce_sapling', 'potted_oak_sapling', 'potted_azalea_bush', 'white_carpet', 'snow', 'end_rod', 'lightning_rod']) {
      expect(ids, id).toContain(id);
    }
    expect(DYE_COLORS.every((c) => ids.has(`${c.id}_stained_glass_pane`) && ids.has(`${c.id}_candle`))).toBe(true);
  });
});

describe('Registry allgemein', () => {
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
