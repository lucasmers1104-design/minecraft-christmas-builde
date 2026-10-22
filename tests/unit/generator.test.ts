import { describe, expect, it } from 'vitest';
import { countMaterials } from '@/core/analysis/materialCounts';
import { checkBlockState } from '@/core/blocks/registry';
import { BuildLimitError, buildHouse, resolveHouseParameters } from '@/core/generator/buildHouse';
import { generateBuilding, generateVariants } from '@/core/generator/generateBuilding';
import {
  BUILD_SIZES,
  BUILD_STYLES,
  buildSpecSchema,
  COLOR_THEMES,
  DEFAULT_HOUSE_SPEC,
  DETAIL_LEVELS,
  MATERIAL_THEMES,
  type BuildSpec,
} from '@/core/schema/buildSpec';
import { collectVoxelIssues, MAX_DIMENSIONS } from '@/core/schema/voxelModel';
import { houseStructureProblems, idAt, isAir, isGlass } from '../helpers/houseInspection';

const spec = (patch: Partial<BuildSpec> = {}): BuildSpec => ({ ...DEFAULT_HOUSE_SPEC, ...patch });

describe('Determinismus', () => {
  it('gleiche Spec + gleicher Seed => bit-identische Blockdaten und Hash', () => {
    const a = generateBuilding(spec());
    const b = generateBuilding(spec());
    expect(a.dimensions).toEqual(b.dimensions);
    expect(a.palette).toEqual(b.palette);
    expect(Buffer.from(a.indices.buffer).equals(Buffer.from(b.indices.buffer))).toBe(true);
    expect(a.hash).toBe(b.hash);
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('Seeds 1, 2, 3 ergeben reproduzierbar unterschiedliche, gültige Varianten', () => {
    const [v1, v2, v3] = generateVariants(spec({ seed: 1 }));
    expect(new Set([v1!.hash, v2!.hash, v3!.hash]).size).toBe(3);
    for (const v of [v1!, v2!, v3!]) {
      expect(collectVoxelIssues(v)).toEqual([]);
      expect(houseStructureProblems(v, buildHouse(v.spec).layout)).toEqual([]);
    }
    expect([v1!.spec.seed, v2!.spec.seed, v3!.spec.seed]).toEqual([1, 2, 3]);
    // Same seed again => same result.
    expect(generateBuilding(spec({ seed: 2 })).hash).toBe(v2!.hash);
  });
});

describe('Weihnachtshaus-Struktur (Standard-Spec)', () => {
  const { builder, layout } = buildHouse(spec());
  const model = builder.toModel(spec());

  it('hat Fundament, vier Wände, Eingang, Fenster, Dach, Schornstein und keinen massiven Innenraum', () => {
    expect(houseStructureProblems(model, layout)).toEqual([]);
  });

  it('nutzt nur gültige Blockstates und bleibt in den MVP-Grenzen', () => {
    for (const state of model.palette) expect(checkBlockState(state)).toEqual({ ok: true, canonical: state });
    expect(model.dimensions.width).toBeLessThanOrEqual(MAX_DIMENSIONS.width);
    expect(model.dimensions.height).toBeLessThanOrEqual(MAX_DIMENSIONS.height);
    expect(model.dimensions.length).toBeLessThanOrEqual(MAX_DIMENSIONS.length);
    expect(model.indices.length).toBe(model.dimensions.width * model.dimensions.height * model.dimensions.length);
    expect(model.palette[0]).toBe('minecraft:air');
  });

  it('enthält Weihnachtsdetails aus Vanilla-Blöcken', () => {
    const ids = new Set(countMaterials(model).byBlock.map((b) => b.blockId));
    for (const id of [
      'minecraft:red_wool',
      'minecraft:spruce_leaves',
      'minecraft:snow_block',
      'minecraft:glowstone',
      'minecraft:glass',
      'minecraft:bricks',
    ])
      expect(ids).toContain(id);
  });

  it('Mittelgröße hat die geplante Grundfläche 13 x 11', () => {
    expect(layout.x1 - layout.x0 + 1).toBe(13);
    expect(layout.z1 - layout.z0 + 1).toBe(11);
  });
});

describe('alle Kombinationen aus Größe, Stil, Material, Farbe, Detailgrad', () => {
  const combos: BuildSpec[] = [];
  for (const size of BUILD_SIZES)
    for (const style of BUILD_STYLES)
      for (const materialTheme of MATERIAL_THEMES)
        for (const colorTheme of COLOR_THEMES)
          for (const detailLevel of DETAIL_LEVELS) combos.push(spec({ size, style, materialTheme, colorTheme, detailLevel }));

  it(`erzeugen ${combos.length} strukturell gültige Häuser`, () => {
    const failures: string[] = [];
    for (const s of combos) {
      for (const seed of [1, 2, 3]) {
        const withSeed = { ...s, seed };
        const { builder, layout } = buildHouse(withSeed);
        const model = builder.toModel(withSeed);
        const problems = [...collectVoxelIssues(model), ...houseStructureProblems(model, layout)];
        if (problems.length > 0) failures.push(`${JSON.stringify({ ...withSeed, description: undefined })}: ${problems.slice(0, 3).join(' | ')}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('jede einzelne Einstellung verändert das Blockmodell messbar', () => {
    const base = generateBuilding(spec());
    const variations: Partial<BuildSpec>[] = [
      { size: 'small' },
      { size: 'large' },
      { style: 'fairytale' },
      { style: 'realistic' },
      { materialTheme: 'oak' },
      { materialTheme: 'stone' },
      { colorTheme: 'ice_blue' },
      { colorTheme: 'natural' },
      { detailLevel: 1 },
      { detailLevel: 2 },
    ];
    for (const patch of variations) {
      expect(generateBuilding(spec(patch)).hash, JSON.stringify(patch)).not.toBe(base.hash);
    }
    expect(generateBuilding(spec({ size: 'small' })).dimensions.width).toBeLessThan(base.dimensions.width);
    expect(generateBuilding(spec({ size: 'large' })).dimensions.width).toBeGreaterThan(base.dimensions.width);
    expect(generateBuilding(spec({ style: 'fairytale' })).dimensions.height).toBeGreaterThan(base.dimensions.height);
  });

  it('der Generator liest den Freitext nicht selbst (er wirkt nur über Parser bzw. KI-Plan in der Spec)', () => {
    const a = generateBuilding(spec({ description: 'irgendwas' }));
    const b = generateBuilding(spec({ description: 'etwas ganz anderes' }));
    expect(a.hash).toBe(b.hash);
  });
});

describe('Eingabevalidierung', () => {
  it('lehnt ungültige Specs ab', () => {
    const bad: unknown[] = [
      {},
      { ...DEFAULT_HOUSE_SPEC, kind: 'castle' },
      { ...DEFAULT_HOUSE_SPEC, seed: -1 },
      { ...DEFAULT_HOUSE_SPEC, seed: 1.5 },
      { ...DEFAULT_HOUSE_SPEC, seed: 2 ** 31 },
      { ...DEFAULT_HOUSE_SPEC, detailLevel: 4 },
      { ...DEFAULT_HOUSE_SPEC, targetMinecraftVersion: '1.20.4' },
      { ...DEFAULT_HOUSE_SPEC, description: 'x'.repeat(601) },
      { ...DEFAULT_HOUSE_SPEC, extra: true },
      { ...DEFAULT_HOUSE_SPEC, schemaVersion: 2 },
    ];
    for (const input of bad) expect(buildSpecSchema.safeParse(input).success, JSON.stringify(input).slice(0, 80)).toBe(false);
    expect(() => generateBuilding({ ...DEFAULT_HOUSE_SPEC, seed: -5 })).toThrow();
  });

  it('alle Bauwerkstypen sind implementiert; unbekannte Typen werden abgelehnt', () => {
    for (const kind of ['house', 'tree', 'market_stall', 'station'] as const) {
      expect(collectVoxelIssues(generateBuilding(spec({ kind })))).toEqual([]);
    }
    expect(() => generateBuilding({ ...spec(), kind: 'castle' as never })).toThrow();
  });
});

describe('Strukturprüfung erkennt kaputte Häuser (Gegenprobe)', () => {
  const { builder, layout } = buildHouse(spec());
  const model = builder.toModel(spec());
  const withBlock = (x: number, y: number, z: number, state: string) => {
    let index = model.palette.indexOf(state);
    const palette = [...model.palette];
    if (index === -1) {
      index = palette.length;
      palette.push(state);
    }
    const indices = model.indices.slice();
    indices[x + model.dimensions.width * (z + model.dimensions.length * y)] = index;
    return { ...model, palette, indices };
  };

  it('Loch in der Wand, blockierter Eingang, schwebender Block, verdecktes Fenster', () => {
    const air = 'minecraft:air';
    const planks = 'minecraft:spruce_planks';
    expect(houseStructureProblems(withBlock(layout.x0, 1, layout.zc + 3, air), layout).join()).toMatch(/Loch in der Wand/);
    expect(houseStructureProblems(withBlock(layout.door.x, 1, layout.door.z, planks), layout).join()).toMatch(/Eingang blockiert/);
    expect(houseStructureProblems(withBlock(layout.xc, layout.wallTop - 1, layout.zc, planks), layout).join()).toMatch(/schwebende/);
    const pane = layout.windows.find((w) => w.wall === 'front')!.cells[0]!;
    expect(houseStructureProblems(withBlock(pane.x, pane.y, pane.z + 1, planks), layout).join()).toMatch(/innen verdeckt/);
  });
});

describe('Feinparameter (options)', () => {
  const base = generateBuilding(spec());
  const withOptions = (options: BuildSpec['options']) => spec({ options });

  it.each([
    ['Breite 21', { width: 21 }],
    ['Tiefe 15', { depth: 15 }],
    ['Wandhöhe 6', { wallHeight: 6 }],
    ['steiles Dach', { roofShape: 'steep' as const }],
    ['wenige Fenster', { windows: 'few' as const }],
    ['viele Fenster', { windows: 'many' as const }],
    ['ohne Schnee', { snow: false }],
    ['ohne Schornstein', { chimney: false }],
    ['ohne Licht', { lights: false }],
    ['ohne Girlande', { garland: false }],
    ['ohne Baum', { christmasTree: false }],
    ['ohne Geschenke', { presents: false }],
    ['Birkenrahmen', { frameWood: 'birch' as const }],
    ['Ziegelwände', { materials: { wall: 'bricks' as const } }],
    ['rotes Dach', { materials: { roof: 'red_terracotta' as const } }],
    ['Steinboden', { materials: { floor: 'smooth_stone' as const } }],
    ['Fundament', { materials: { foundation: 'stone_bricks' as const } }],
    ['blaue Akzente', { materials: { accent: 'blue_wool' as const } }],
  ] as [string, BuildSpec['options']][])('%s verändert das Modell und bleibt strukturell gültig', (_name, options) => {
    const s = withOptions(options);
    const { builder, layout } = buildHouse(s);
    const model = builder.toModel(s);
    expect(model.hash).not.toBe(base.hash);
    expect(houseStructureProblems(model, layout, { chimney: options.chimney !== false })).toEqual([]);
  });

  it('Maße aus den Optionen landen exakt im Modell', () => {
    const { layout } = buildHouse(withOptions({ width: 21, depth: 9, wallHeight: 6 }));
    expect(layout.x1 - layout.x0 + 1).toBe(21);
    expect(layout.z1 - layout.z0 + 1).toBe(9);
    expect(layout.wallTop).toBe(6);
  });

  it('Material-Wünsche erscheinen als echte Blöcke', () => {
    const m = generateBuilding(withOptions({ materials: { wall: 'bricks', roof: 'red_terracotta' }, snow: false }));
    expect(m.palette).toContain('minecraft:bricks');
    expect(m.palette).toContain('minecraft:red_terracotta');
    expect(m.palette).not.toContain('minecraft:snow_block');
  });

  it('die größte Kombination passt seit den neuen Grenzen (Höhe 384) ins Volumen', () => {
    expect(() => generateBuilding(withOptions({ depth: 25, wallHeight: 8, roofShape: 'steep' }))).not.toThrow();
    expect(new BuildLimitError('x').name).toBe('BuildLimitError');
  });

  it('alle Maß-Extreme innerhalb der Grenzen sind gültig (Satteldach)', () => {
    for (const width of [7, 33])
      for (const depth of [5, 25])
        for (const wallHeight of [3, 8]) {
          const s = withOptions({ width, depth, wallHeight });
          const { builder, layout } = buildHouse(s);
          expect(houseStructureProblems(builder.toModel(s), layout), `${width}x${depth}x${wallHeight}`).toEqual([]);
        }
  });

  it('ungerade Maße werden im Schema erzwungen', () => {
    expect(buildSpecSchema.safeParse(withOptions({ width: 14 })).success).toBe(false);
    expect(buildSpecSchema.safeParse(withOptions({ depth: 4 })).success).toBe(false);
    expect(buildSpecSchema.safeParse(withOptions({ materials: { wall: 'bedrock' as never } })).success).toBe(false);
  });
});

describe('Phase 4: Bauteile (Turm, Anbau, Vordach, Hecke, Walmdach)', () => {
  const variants: [string, BuildSpec['options']][] = [
    ['Turm links', { tower: 'left' }],
    ['Turm rechts', { tower: 'right' }],
    ['Anbau links', { annex: 'left' }],
    ['Anbau rechts', { annex: 'right' }],
    ['Vordach', { porch: true }],
    ['Hecke', { hedge: true }],
    ['Walmdach', { roofShape: 'hip' }],
    ['alles zusammen', { tower: 'left', annex: 'right', porch: true, hedge: true }],
    ['Walmdach + Turm + Vordach', { roofShape: 'hip', tower: 'right', porch: true }],
    ['steil + Turm', { roofShape: 'steep', tower: 'left' }],
  ];

  it.each(variants)('%s: gültig in allen Größen, verändert das Modell', (_name, options) => {
    for (const size of BUILD_SIZES) {
      const base = generateBuilding(spec({ size }));
      const s = spec({ size, options });
      const { builder, layout } = buildHouse(s);
      const model = builder.toModel(s);
      expect(collectVoxelIssues(model)).toEqual([]);
      expect(houseStructureProblems(model, layout), `${size}`).toEqual([]);
      const params = resolveHouseParameters(s);
      if (options.annex && params.annex === 'none') {
        // Too shallow for an annex: skipped with an explanation, model unchanged.
        expect(params.notes.join()).toMatch(/Anbau/);
      } else expect(model.hash).not.toBe(base.hash);
    }
  });

  it('Turm: Schacht ist vom Haus aus begehbar, Dach ragt über den First', () => {
    const s = spec({ options: { tower: 'left' } });
    const { builder, layout } = buildHouse(s);
    const m = builder.toModel(s);
    const tower = layout.components.find((c) => c.kind === 'tower')!;
    // Interior of the tower (centre = house corner) is free at walking height.
    expect(isAir(m, layout.x0, 1, layout.z0)).toBe(true);
    expect(isAir(m, layout.x0, 2, layout.z0)).toBe(true);
    // Doorway towards the main room.
    expect(isAir(m, layout.x0 + 2, 1, layout.z0 + 1)).toBe(true);
    // Tower roof is the highest structure.
    let top = 0;
    for (let y = 0; y < m.dimensions.height; y++) if (!isAir(m, layout.x0, y, layout.z0)) top = y;
    expect(top).toBeGreaterThan(layout.roof.ridgeY);
    expect(tower.x0).toBe(layout.x0 - 3);
  });

  it('Anbau: Durchgang offen, eigenes Dach und Fenster', () => {
    const s = spec({ options: { annex: 'right' } });
    const { builder, layout } = buildHouse(s);
    const m = builder.toModel(s);
    for (let y = 1; y <= 2; y++) {
      expect(isAir(m, layout.x1, y, layout.zc)).toBe(true);
      expect(isAir(m, layout.x1 + 1, y, layout.zc)).toBe(true);
    }
    const farX = layout.x1 + 6;
    expect(isGlass(m, farX, 2, layout.zc)).toBe(true);
    expect(isAir(m, farX - 2, 1, layout.zc)).toBe(true);
    // Roof above the annex interior.
    let covered = false;
    for (let y = 3; y < m.dimensions.height; y++) if (!isAir(m, farX - 2, y, layout.zc)) covered = true;
    expect(covered).toBe(true);
  });

  it('Vordach überdacht den Eingang, Durchgang bleibt frei', () => {
    const s = spec({ options: { porch: true } });
    const { builder, layout } = buildHouse(s);
    const m = builder.toModel(s);
    for (let z = layout.z0 - 3; z < layout.z0; z++) {
      expect(isAir(m, layout.xc, 1, z)).toBe(true);
      expect(isAir(m, layout.xc, 2, z)).toBe(true);
      expect(isAir(m, layout.xc, 4, z)).toBe(false);
    }
  });

  it('Hecke mit Lücke und Weg zur Tür', () => {
    const s = spec({ options: { hedge: true } });
    const { builder, layout } = buildHouse(s);
    const m = builder.toModel(s);
    expect(idAt(m, 0, 0, 5)).toBe('minecraft:spruce_leaves');
    expect(idAt(m, layout.xc, 0, 0)).not.toBe('minecraft:spruce_leaves');
    for (let z = 0; z < layout.z0; z++) expect(isAir(m, layout.xc, 0, z)).toBe(false);
    expect(isAir(m, layout.xc, 1, 0)).toBe(true);
  });

  it('Turm und Anbau auf derselben Seite werden aufgelöst und gemeldet', () => {
    const s = spec({ options: { tower: 'left', annex: 'left' } });
    expect(resolveHouseParameters(s).annex).toBe('right');
    expect(resolveHouseParameters(s).notes.join()).toMatch(/derselben Seite/);
  });
});
