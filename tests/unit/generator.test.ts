import { describe, expect, it } from 'vitest';
import { countMaterials } from '@/core/analysis/materialCounts';
import { checkBlockState } from '@/core/blocks/registry';
import { buildHouse } from '@/core/generator/buildHouse';
import { generateBuilding, generateVariants, NotImplementedBuildingError } from '@/core/generator/generateBuilding';
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
import { houseStructureProblems } from '../helpers/houseInspection';

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

  it('die Beschreibung allein verändert die Blockdaten nicht (Freitext wird noch nicht interpretiert)', () => {
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

  it('meldet nicht implementierte Bauwerkstypen ehrlich', () => {
    for (const kind of ['tree', 'market_stall', 'station'] as const) {
      expect(() => generateBuilding(spec({ kind }))).toThrow(NotImplementedBuildingError);
    }
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
