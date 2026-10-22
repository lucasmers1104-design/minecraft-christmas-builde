import { describe, expect, it } from 'vitest';
import { familyKey, lintAllStyles, lintPalette } from '@/core/style/lints';
import { brightnessOf, formOf, listMaterials } from '@/core/style/materials';
import { PALETTES } from '@/core/style/palettes';
import { STYLE_IDS, STYLES } from '@/core/style/styles';
import { TEXTURE_STATS } from '@/core/style/textureStats';
import { blockState } from '@/core/blocks/registry';

describe('Stile als Daten', () => {
  it('alle 8 Stile laden und alle Paletten-Lints sind grün', () => {
    expect(STYLE_IDS).toHaveLength(8);
    const result = lintAllStyles();
    expect(result.errors).toEqual([]);
  });

  it('jede Palette gehört zu einem Stil und jede Stilpalette existiert', () => {
    const used = new Set(STYLE_IDS.flatMap((s) => STYLES[s].palettes));
    expect(new Set(PALETTES.map((p) => p.id))).toEqual(used);
  });

  it('Lints erkennen Fehler (Dach = Wand, zu wenig Kontrast, Material ohne Treppe)', () => {
    const base = PALETTES.find((p) => p.id === 'rustic_spruce')!;
    const bad = { ...base, id: 'bad', roles: { ...base.roles, roof: [['spruce_planks', 1]] as const, frame: [['spruce_planks', 1]] as const } };
    const r = lintPalette(bad);
    expect(r.errors.join('\n')).toMatch(/dasselbe Material/);
    expect(r.errors.join('\n')).toMatch(/heben sich nicht/);
    const noStairs = { ...base, id: 'bad2', roles: { ...base.roles, roof: [['white_concrete', 1]] as const } };
    expect(lintPalette(noStairs).errors.join('\n')).toMatch(/keine eigene Treppe/);
  });

  it('jedes Material liefert gültige Blöcke; Ersatzfamilien füllen fehlende Formen', () => {
    for (const m of listMaterials()) for (const id of Object.values(m.forms)) expect(() => blockState(id), id).not.toThrow();
    expect(formOf('calcite', 'stairs')).toBe('smooth_quartz_stairs');
    expect(formOf('white_concrete', 'slab')).toBe('smooth_quartz_slab');
    expect(formOf('smooth_stone', 'stairs')).toBe('stone_stairs');
    expect(formOf('dark_oak_log', 'stairs')).toBe('dark_oak_stairs');
  });

  it('Helligkeitswerte stammen aus der Client-Datei und decken alle Materialien ab', () => {
    for (const m of listMaterials()) expect(TEXTURE_STATS[m.forms.block ?? m.id] ?? TEXTURE_STATS[m.id], m.id).toBeDefined();
    expect(brightnessOf('snow_block')).toBeGreaterThan(95);
    expect(brightnessOf('dark_oak_planks')).toBeLessThan(25);
    expect(familyKey('stripped_dark_oak_log')).toBe(familyKey('dark_oak_planks'));
    expect(familyKey('cobbled_deepslate')).toBe(familyKey('deepslate_tiles'));
  });
});

describe('Verwitterung und hierarchischer Zufall', () => {
  it('Verwitterung: unten stärker als oben, Cluster statt Streuung, keine Sprünge über 2 Stufen', async () => {
    const { weatheredBlock } = await import('@/core/style/texturing');
    const levels = ['stone_bricks', 'cracked_stone_bricks', 'mossy_stone_bricks'];
    const level = (x: number, y: number) => levels.indexOf(weatheredBlock('stone_bricks', 7, x, y, 0, { height: y }));
    let bottom = 0;
    let top = 0;
    let jumps = 0;
    let sameNeighbours = 0;
    let pairs = 0;
    for (let x = 0; x < 60; x++)
      for (let y = 0; y < 8; y++) {
        if (y === 0 && level(x, y) > 0) bottom++;
        if (y === 7 && level(x, y) > 0) top++;
        if (x > 0) {
          const d = Math.abs(level(x, y) - level(x - 1, y));
          if (d > 1) jumps++;
          if (d === 0) sameNeighbours++;
          pairs++;
        }
      }
    expect(bottom).toBeGreaterThan(top * 2);
    expect(jumps).toBe(0);
    // Clusters: most horizontal neighbours share the variant (no salt-and-pepper).
    expect(sameNeighbours / pairs).toBeGreaterThan(0.75);
  });

  it('fork() ist unabhängig vom Verbrauch des Elternstroms und deterministisch', async () => {
    const { createSeededRandom } = await import('@/core/generator/seededRandom');
    const a = createSeededRandom(42);
    const b = createSeededRandom(42);
    b.next();
    b.next();
    expect(a.fork('dach').next()).toBe(b.fork('dach').next());
    expect(a.fork('dach').next()).not.toBe(a.fork('fenster').next());
    expect(createSeededRandom(5).weighted([['x', 0], ['y', 1]] as const)).toBe('y');
  });
});
