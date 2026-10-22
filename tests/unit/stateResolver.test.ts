import { describe, expect, it } from 'vitest';
import { countMaterials } from '@/core/analysis/materialCounts';
import { AIR, blockState, listBlockDefinitions, propsOf } from '@/core/blocks/registry';
import { PaletteGrid, resolveStates } from '@/core/blocks/stateResolver';
import { mirrorState, rotateState } from '@/core/blocks/transform';
import { validateAndRepair } from '@/core/blocks/validator';
import { createSeededRandom } from '@/core/generator/seededRandom';

function grid(w: number, h: number, l: number): PaletteGrid {
  return new PaletteGrid({ width: w, height: h, length: l }, [AIR], new Uint16Array(w * h * l));
}

const stairs = (facing: string, half = 'bottom') => blockState('oak_stairs', { facing, half });
const prop = (g: PaletteGrid, x: number, y: number, z: number, name: string) => propsOf(g.get(x, y, z))[name];

describe('Zustandsauflöser: Treppen', () => {
  it('Walmdach-Ring: Außenecken wie in den Vanilla-Modellen (NW south/outer_left …)', () => {
    const g = grid(5, 1, 5);
    for (let x = 0; x < 5; x++) {
      g.set(x, 0, 0, stairs('south'));
      g.set(x, 0, 4, stairs('north'));
    }
    for (let z = 1; z < 4; z++) {
      g.set(0, 0, z, stairs('east'));
      g.set(4, 0, z, stairs('west'));
    }
    resolveStates(g);
    expect(prop(g, 0, 0, 0, 'shape')).toBe('outer_left');
    expect(prop(g, 4, 0, 0, 'shape')).toBe('outer_right');
    expect(prop(g, 0, 0, 4, 'shape')).toBe('outer_right');
    expect(prop(g, 4, 0, 4, 'shape')).toBe('outer_left');
    expect(prop(g, 2, 0, 0, 'shape')).toBe('straight');
    expect(prop(g, 0, 0, 2, 'shape')).toBe('straight');
  });

  it('Kehle zwischen Hauptdach und Flügel ergibt Innenecken (inner_right / inner_left)', () => {
    // Main roof south slope (facing north) meets a wing running south: its west slope faces east.
    const g = grid(5, 1, 4);
    g.set(1, 0, 1, stairs('north'));
    g.set(1, 0, 2, stairs('east'));
    resolveStates(g);
    expect(prop(g, 1, 0, 1, 'shape')).toBe('inner_right');
    const h = grid(5, 1, 4);
    h.set(3, 0, 1, stairs('north'));
    h.set(3, 0, 2, stairs('west'));
    resolveStates(h);
    expect(prop(h, 3, 0, 1, 'shape')).toBe('inner_left');
  });

  it('obere und untere Treppen verbinden sich nicht', () => {
    const g = grid(2, 1, 2);
    g.set(0, 0, 0, stairs('south', 'top'));
    g.set(0, 0, 1, stairs('east'));
    resolveStates(g);
    expect(prop(g, 0, 0, 0, 'shape')).toBe('straight');
  });
});

describe('Zustandsauflöser: Verbindungen', () => {
  it('Zäune verbinden sich mit Zäunen, Toren und vollen Flächen, nicht mit Laub, Scheiben oder Kürbis', () => {
    const g = grid(5, 1, 3);
    for (let x = 1; x < 4; x++) g.set(x, 0, 1, blockState('spruce_fence'));
    g.set(0, 0, 1, blockState('stone_bricks'));
    g.set(4, 0, 1, blockState('oak_fence_gate', { facing: 'north' }));
    g.set(2, 0, 0, blockState('spruce_leaves'));
    g.set(2, 0, 2, blockState('glass_pane'));
    resolveStates(g);
    expect(propsOf(g.get(1, 0, 1))).toMatchObject({ west: 'true', east: 'true', north: 'false', south: 'false' });
    expect(propsOf(g.get(3, 0, 1))).toMatchObject({ west: 'true', east: 'true' });
    expect(propsOf(g.get(2, 0, 1))).toMatchObject({ north: 'false', south: 'false' });
    // A gate facing north spans x, so it connects east/west only.
    const h = grid(1, 1, 2);
    h.set(0, 0, 0, blockState('oak_fence'));
    h.set(0, 0, 1, blockState('oak_fence_gate', { facing: 'north' }));
    resolveStates(h);
    expect(prop(h, 0, 0, 0, 'south')).toBe('false');
  });

  it('Glasscheiben verbinden sich mit Scheiben, Mauern, Treppenrücken und Blöcken, nicht mit Stufen', () => {
    const g = grid(3, 1, 3);
    g.set(1, 0, 1, blockState('glass_pane'));
    g.set(0, 0, 1, blockState('stone_bricks'));
    g.set(2, 0, 1, blockState('oak_slab'));
    g.set(1, 0, 0, blockState('oak_stairs', { facing: 'south' })); // back (full) side faces the pane? no: facing south = full side south
    g.set(1, 0, 2, blockState('cobblestone_wall'));
    resolveStates(g);
    expect(propsOf(g.get(1, 0, 1))).toMatchObject({ west: 'true', east: 'false', north: 'true', south: 'true' });
    const h = grid(3, 1, 1);
    h.set(1, 0, 0, blockState('glass_pane'));
    h.set(0, 0, 0, blockState('oak_stairs', { facing: 'west' })); // full side faces away from the pane
    resolveStates(h);
    expect(prop(h, 1, 0, 0, 'west')).toBe('false');
  });

  it('Mauern: gerade Reihe ohne Pfosten, Enden mit Pfosten, Block darüber macht sie hoch, Laterne setzt den Pfosten', () => {
    const g = grid(5, 2, 1);
    for (let x = 0; x < 5; x++) g.set(x, 0, 0, blockState('cobblestone_wall'));
    g.set(2, 1, 0, blockState('stone_bricks'));
    g.set(3, 1, 0, blockState('lantern'));
    resolveStates(g);
    expect(propsOf(g.get(0, 0, 0))).toMatchObject({ east: 'low', west: 'none', up: 'true' });
    expect(propsOf(g.get(1, 0, 0))).toMatchObject({ east: 'low', west: 'low', up: 'false' });
    expect(propsOf(g.get(2, 0, 0))).toMatchObject({ east: 'tall', west: 'tall', up: 'false' });
    expect(propsOf(g.get(3, 0, 0))).toMatchObject({ east: 'low', west: 'low', up: 'true' });
  });

  it('Zauntor zwischen Mauern sitzt tiefer (in_wall)', () => {
    const g = grid(3, 1, 1);
    g.set(0, 0, 0, blockState('cobblestone_wall'));
    g.set(1, 0, 0, blockState('spruce_fence_gate', { facing: 'north' }));
    g.set(2, 0, 0, blockState('cobblestone_wall'));
    resolveStates(g);
    expect(prop(g, 1, 0, 0, 'in_wall')).toBe('true');
    expect(prop(g, 0, 0, 0, 'east')).toBe('low');
  });
});

describe('Zustandsauflöser: Türen, Laub, Gras', () => {
  it('ergänzt die obere Türhälfte mit denselben Eigenschaften', () => {
    const g = grid(1, 3, 1);
    g.set(0, 0, 0, blockState('stone'));
    g.set(0, 1, 0, blockState('spruce_door', { facing: 'south', hinge: 'right' }));
    resolveStates(g);
    expect(propsOf(g.get(0, 2, 0))).toMatchObject({ half: 'upper', facing: 'south', hinge: 'right' });
    expect(validateAndRepair(g, '1.21.11')).toEqual([]);
  });

  it('Laub bekommt die Entfernung zum Stamm (1–7) und bleibt persistent', () => {
    const g = grid(10, 1, 1);
    g.set(0, 0, 0, blockState('spruce_log'));
    for (let x = 1; x < 10; x++) g.set(x, 0, 0, blockState('spruce_leaves', { persistent: 'false' }));
    resolveStates(g);
    expect(Array.from({ length: 9 }, (_, i) => prop(g, i + 1, 0, 0, 'distance'))).toEqual(['1', '2', '3', '4', '5', '6', '7', '7', '7']);
    expect(prop(g, 5, 0, 0, 'persistent')).toBe('true');
  });

  it('Gras unter Schnee ist verschneit, Lagerfeuer über Heu raucht hoch', () => {
    const g = grid(2, 2, 1);
    g.set(0, 0, 0, blockState('grass_block'));
    g.set(0, 1, 0, blockState('snow'));
    g.set(1, 0, 0, blockState('hay_block'));
    g.set(1, 1, 0, blockState('campfire'));
    resolveStates(g);
    expect(prop(g, 0, 0, 0, 'snowy')).toBe('true');
    expect(prop(g, 1, 1, 0, 'signal_fire')).toBe('true');
  });
});

describe('Zustandsauflöser: Fixpunkt', () => {
  it('ist idempotent auf zufälligen Gittern aus allen Formblöcken (simuliert WorldEdit-Nachbar-Updates)', () => {
    const pool = listBlockDefinitions()
      .filter((d) => ['stairs', 'fence', 'pane', 'wall', 'fence_gate', 'slab', 'cube', 'leaves', 'pillar', 'trapdoor', 'lantern'].includes(d.shape))
      .filter((_, i) => i % 7 === 0)
      .map((d) => d.id);
    for (let seed = 1; seed <= 20; seed++) {
      const rng = createSeededRandom(seed);
      const g = grid(8, 6, 8);
      for (let y = 0; y < 6; y++)
        for (let z = 0; z < 8; z++)
          for (let x = 0; x < 8; x++) {
            if (!rng.chance(0.6)) continue;
            const id = rng.pick(pool);
            const def = listBlockDefinitions().find((d) => d.id === id)!;
            const props: Record<string, string> = {};
            for (const [k, values] of Object.entries(def.properties)) props[k] = rng.pick(values);
            g.set(x, y, z, blockState(id, props));
          }
      resolveStates(g);
      const once = Array.from(g.indices, (i) => g.palette[i]);
      resolveStates(g);
      const twice = Array.from(g.indices, (i) => g.palette[i]);
      expect(twice).toEqual(once);
    }
  });
});

describe('Validator', () => {
  it('repariert Laternen ohne Halt (umhängen oder entfernen) und protokolliert es', () => {
    const g = grid(3, 3, 1);
    g.set(0, 2, 0, blockState('oak_slab'));
    g.set(0, 1, 0, blockState('lantern')); // standing, but only the slab above → hang it
    g.set(2, 1, 0, blockState('lantern', { hanging: 'true' })); // nothing anywhere → remove
    const repairs = validateAndRepair(g, '1.21.11');
    expect(prop(g, 0, 1, 0, 'hanging')).toBe('true');
    expect(g.get(2, 1, 0)).toBe(AIR);
    expect(repairs.map((r) => r.reason)).toHaveLength(2);
  });

  it('Kerzen nicht auf Laub, Laterne hängt an Kette, steht auf Zaun', () => {
    const g = grid(3, 3, 1);
    g.set(0, 0, 0, blockState('spruce_leaves'));
    g.set(0, 1, 0, blockState('red_candle'));
    g.set(1, 2, 0, blockState('iron_chain'));
    g.set(1, 1, 0, blockState('lantern', { hanging: 'true' }));
    g.set(2, 0, 0, blockState('spruce_fence'));
    g.set(2, 1, 0, blockState('lantern'));
    const repairs = validateAndRepair(g, '1.21.11');
    expect(g.get(0, 1, 0)).toBe(AIR);
    expect(repairs).toHaveLength(1);
  });

  it('erkennt Golem-Muster (Kürbis an zwei Schneeblöcken, an Kupfer) in jeder Richtung', () => {
    const g = grid(5, 3, 1);
    g.set(0, 0, 0, blockState('snow_block'));
    g.set(0, 1, 0, blockState('snow_block'));
    g.set(0, 2, 0, blockState('carved_pumpkin'));
    g.set(2, 0, 0, blockState('jack_o_lantern'));
    g.set(3, 0, 0, blockState('snow_block'));
    g.set(4, 0, 0, blockState('snow_block'));
    g.set(2, 2, 0, blockState('carved_pumpkin'));
    g.set(2, 1, 0, blockState('waxed_copper_block'));
    const repairs = validateAndRepair(g, '1.21.11');
    expect(repairs.map((r) => r.reason.split(':')[0])).toEqual(['Schneegolem-Muster', 'Schneegolem-Muster', 'Kupfergolem-Muster']);
    expect([g.get(0, 2, 0), g.get(2, 0, 0), g.get(2, 2, 0)].every((s) => s === blockState('pumpkin'))).toBe(true);
  });

  it('ersetzt iron_chain für 1.21.1 durch chain und entfernt Schnee auf Treppen', () => {
    const g = grid(2, 2, 1);
    g.set(0, 0, 0, blockState('iron_chain'));
    g.set(1, 0, 0, blockState('oak_stairs'));
    g.set(1, 1, 0, blockState('snow'));
    validateAndRepair(g, '1.21.1');
    expect(g.get(0, 0, 0)).toBe('minecraft:chain[axis=y,waterlogged=false]');
    expect(g.get(1, 1, 0)).toBe(AIR);
  });

  it('Schnee hält auf umgedrehten Treppen und oberen Stufen, schmilzt neben Laternen', () => {
    const g = grid(9, 2, 1);
    g.set(0, 0, 0, blockState('oak_stairs', { half: 'top' }));
    g.set(0, 1, 0, blockState('snow'));
    g.set(1, 0, 0, blockState('oak_slab', { type: 'top' }));
    g.set(1, 1, 0, blockState('snow'));
    g.set(8, 0, 0, blockState('stone'));
    g.set(8, 1, 0, blockState('snow'));
    g.set(6, 1, 0, blockState('lantern', { hanging: 'false' }));
    g.set(6, 0, 0, blockState('stone'));
    validateAndRepair(g, '1.21.11');
    expect(g.get(0, 1, 0)).not.toBe(AIR);
    expect(g.get(1, 1, 0)).not.toBe(AIR);
    expect(g.get(8, 1, 0)).toBe(AIR); // taxicab distance 2 to a light-15 lantern
  });
});

describe('Drehen und Spiegeln', () => {
  const samples = [
    blockState('oak_stairs', { facing: 'north', shape: 'inner_left' }),
    blockState('spruce_door', { facing: 'east', hinge: 'left' }),
    blockState('oak_fence', { north: 'true', east: 'true' }),
    blockState('cobblestone_wall', { north: 'low', west: 'tall' }),
    blockState('oak_log', { axis: 'x' }),
    blockState('rail', { shape: 'ascending_north' }),
  ];

  it('vier Vierteldrehungen und doppeltes Spiegeln ergeben den Ausgangszustand', () => {
    for (const s of samples) {
      expect(rotateState(rotateState(rotateState(rotateState(s, 1), 1), 1), 1)).toBe(s);
      expect(mirrorState(mirrorState(s, 'x'), 'x')).toBe(s);
      expect(mirrorState(mirrorState(s, 'z'), 'z')).toBe(s);
    }
  });

  it('dreht facing, axis und Verbindungen; spiegelt hinge und left/right', () => {
    expect(propsOf(rotateState(samples[0]!, 1))).toMatchObject({ facing: 'east', shape: 'inner_left' });
    expect(propsOf(rotateState(samples[2]!, 1))).toMatchObject({ east: 'true', south: 'true', north: 'false', west: 'false' });
    expect(propsOf(rotateState(samples[4]!, 1)).axis).toBe('z');
    expect(propsOf(rotateState(samples[5]!, 1)).shape).toBe('ascending_east');
    expect(propsOf(mirrorState(samples[1]!, 'x'))).toMatchObject({ facing: 'west', hinge: 'right' });
    expect(propsOf(mirrorState(samples[0]!, 'z'))).toMatchObject({ facing: 'south', shape: 'inner_right' });
  });
});

describe('Materialliste: Zählregeln', () => {
  it('Tür zählt einmal, Doppelstufe zweimal, Kerzen nach Anzahl, Topf = Topf + Pflanze', () => {
    const g = grid(6, 3, 1);
    g.set(0, 0, 0, blockState('stone'));
    g.set(0, 1, 0, blockState('oak_door'));
    resolveStates(g);
    g.set(1, 0, 0, blockState('oak_slab', { type: 'double' }));
    g.set(2, 0, 0, blockState('red_candle', { candles: '3' }));
    g.set(3, 0, 0, blockState('potted_spruce_sapling'));
    g.set(4, 0, 0, blockState('snow', { layers: '2' }));
    const summary = countMaterials({ palette: g.palette, indices: g.indices });
    const items = Object.fromEntries(summary.items.map((i) => [i.item, i.count]));
    expect(items).toEqual({
      'minecraft:stone': 1,
      'minecraft:oak_door': 1,
      'minecraft:oak_slab': 2,
      'minecraft:red_candle': 3,
      'minecraft:flower_pot': 1,
      'minecraft:spruce_sapling': 1,
      'minecraft:snow': 2,
    });
    expect(summary.totalBlocks).toBe(7);
    expect(summary.totalItems).toBe(11);
  });
});
