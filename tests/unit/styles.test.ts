import { describe, expect, it } from 'vitest';
import { familyKey, isForbidden, lintAllStyles, lintPalette } from '@/core/style/lints';
import { brightnessOf, colorDistance, deltaE00, formOf, listMaterials } from '@/core/style/materials';
import { PALETTES, type Palette, type Role, type Weighted } from '@/core/style/palettes';
import { STYLE_IDS, STYLES, type StyleId } from '@/core/style/styles';
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
    expect(r.errors.join('\n')).toMatch(/Rahmen spruce_planks hebt sich nicht/);
    expect(r.errors.join('\n')).toMatch(/Dach spruce_planks hebt sich nicht/);
    const noStairs = { ...base, id: 'bad2', roles: { ...base.roles, roof: [['white_concrete', 1]] as const } };
    expect(lintPalette(noStairs).errors.join('\n')).toMatch(/keine eigene Treppe/);
  });

  const variant = (id: string, roles: Partial<Record<Role, readonly Weighted[]>>): Palette => {
    const base = PALETTES.find((p) => p.id === id)!;
    return { ...base, id: `${id}*`, roles: { ...base.roles, ...roles } };
  };
  const errorsOf = (p: Palette, style: StyleId) => lintPalette(p, STYLES[style]).errors.join('\n');

  it('Lints der Recherche 06/07/08: Rahmen im Dach, Mauerwerk als Dachkante, Streben, buntes Glas', () => {
    // The old rustic_spruce: spruce_log posts under a dark oak roof (ΔE00 2.1), plank verge = wall.
    expect(errorsOf(variant('rustic_spruce', { frame: [['spruce_log', 1]], roofTrim: [['spruce_planks', 1]] }), 'rustic')).toMatch(/verschwindet im Dach/);
    // The old medieval_stone: a stone-brick verge on a slate roof.
    expect(errorsOf(variant('medieval_stone', { roofTrim: [['stone_bricks', 1]] }), 'medieval')).toMatch(/Mauerwerk auf dem Dach/);
    // A bark log whose planks are far lighter: the braces would not match the posts.
    expect(errorsOf(variant('medieval_timber', { frame: [['birch_log', 1]] }), 'medieval')).toMatch(/Streben birch_stairs passen nicht/);
    // The old fantasy_crimson window; coloured glass stays allowed as accent.
    expect(errorsOf(variant('fantasy_witch', { window: [['purple_stained_glass', 1]] }), 'fantasy')).toMatch(/zu bunt/);
    expect(errorsOf(variant('cherry_slate', { accent: [['pink_stained_glass', 1]] }), 'cherry')).toBe('');
    // A verge board the eye cannot tell from the roof.
    expect(errorsOf(variant('medieval_timber', { roofTrim: [['stripped_spruce_log', 1]] }), 'medieval')).toMatch(/kaum vom Dach/);
  });

  it('Versionsersatz: Blöcke ab 1.21.4 nur mit Ersatz und nicht in Rollen, die die Dach-Engine ohne Version baut', () => {
    // Pale oak posts are built per version (stand-in quartz pillar in 1.21.1).
    expect(errorsOf(variant('nordic_falu', { frame: [['stripped_pale_oak_log', 1]] }), 'nordic')).toBe('');
    // The roof engine places trims and gables straight from the material: no pale oak there.
    expect(errorsOf(variant('nordic_falu', { roofTrim: [['pale_oak_planks', 1]] }), 'nordic')).toMatch(/Dach-Engine baut diese Rolle ohne Versionsersatz/);
    expect(errorsOf(variant('nordic_falu', { upperWall: [['pale_oak_planks', 1]] }), 'nordic')).toMatch(/ohne Versionsersatz/);
  });

  it('verbotene Namensteile mit Ausnahmen: modern verbietet Rindenstämme, nicht entrindete', () => {
    expect(isForbidden('spruce_log', 'log!stripped')).toBe(true);
    expect(isForbidden('stripped_spruce_log', 'log!stripped')).toBe(false);
    expect(isForbidden('spruce_planks', 'log!stripped')).toBe(false);
    expect(isForbidden('birch_planks', 'birch_planks')).toBe(true);
    expect(isForbidden('stripped_birch_log', 'birch_planks')).toBe(false);
    expect(isForbidden('red_nether_bricks', 'nether')).toBe(true);
  });

  it('ΔE00 nach CIEDE2000 (Referenzpaare von Sharma et al.) und gemessene Blockpaare aus Bericht 07', () => {
    // Test pairs 1, 7 and 17 of Sharma, Wu and Dalal (2005), table 1.
    expect(deltaE00([50, 2.6772, -79.7751], [50, 0, -82.7485])).toBeCloseTo(2.0425, 3);
    expect(deltaE00([50, 0, 0], [50, -1, 2])).toBeCloseTo(2.3669, 3);
    expect(deltaE00([50, 2.5, 0], [73, 25, -18])).toBeCloseTo(27.1492, 3);
    // Report 07 (same textures): spruce_log ↔ dark_oak_planks 2.1, stone_bricks ↔ resin_bricks 27.5.
    expect(colorDistance('spruce_log', 'dark_oak_planks')).toBeCloseTo(2.1, 0);
    expect(colorDistance('stone_bricks', 'resin_bricks')).toBeCloseTo(27.5, 0);
  });

  it('je Stil 4–6 Paletten; kein Kirschholzdach im Kirschstil (Bericht 11)', () => {
    for (const s of STYLE_IDS) {
      expect(STYLES[s].palettes.length, s).toBeGreaterThanOrEqual(4);
      expect(STYLES[s].palettes.length, s).toBeLessThanOrEqual(6);
    }
    for (const id of STYLES.cherry.palettes) expect(PALETTES.find((p) => p.id === id)!.roles.roof.some(([m]) => m.startsWith('cherry')), id).toBe(false);
  });

  it('jedes Material liefert gültige Blöcke; Ersatzfamilien füllen fehlende Formen', () => {
    for (const m of listMaterials()) for (const id of Object.values(m.forms)) expect(() => blockState(id), id).not.toThrow();
    expect(formOf('calcite', 'stairs')).toBe('smooth_quartz_stairs');
    expect(formOf('white_concrete', 'slab')).toBe('smooth_quartz_slab');
    expect(formOf('smooth_stone', 'stairs')).toBe('stone_stairs');
    expect(formOf('dark_oak_log', 'stairs')).toBe('dark_oak_stairs');
    // Bark logs take braces and sills from the wood that matches the bark (research 08 T3).
    expect(formOf('spruce_log', 'stairs')).toBe('dark_oak_stairs');
    expect(formOf('cherry_log', 'fence')).toBe('dark_oak_fence');
    expect(formOf('stripped_spruce_log', 'stairs')).toBe('spruce_stairs');
    expect(formOf('stripped_pale_oak_log', 'pillar')).toBe('stripped_pale_oak_log');
  });

  it('Helligkeitswerte stammen aus der Client-Datei und decken alle Materialien ab', () => {
    for (const m of listMaterials()) expect(TEXTURE_STATS[m.forms.block ?? m.id] ?? TEXTURE_STATS[m.id], m.id).toBeDefined();
    expect(brightnessOf('snow_block')).toBeGreaterThan(95);
    expect(brightnessOf('dark_oak_planks')).toBeLessThan(25);
    expect(familyKey('stripped_dark_oak_log')).toBe(familyKey('dark_oak_planks'));
    expect(familyKey('cobbled_deepslate')).toBe(familyKey('deepslate_tiles'));
    expect(familyKey('waxed_oxidized_cut_copper')).toBe(familyKey('waxed_cut_copper'));
    expect(familyKey('packed_mud')).toBe(familyKey('mud_bricks'));
    expect(familyKey('quartz_pillar')).toBe(familyKey('smooth_quartz'));
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
