import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { gzipSync } from 'node:zlib';
import * as nbt from 'prismarine-nbt';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { countMaterials } from '@/core/analysis/materialCounts';
import { blockState } from '@/core/blocks/registry';
import { EditHistory, replaceAllCommand, setBlockCommand } from '@/core/editor/editOperations';
import { requireProfile } from '@/core/compat/profile';
import { buildSpongeV3Nbt, writeSpongeV3 } from '@/core/export/writeSpongeV3';
import { generateBuilding, generateVariants } from '@/core/generator/generateBuilding';
import { DEFAULT_HOUSE_SPEC, STYLE_IDS, type BuildSpec } from '@/core/schema/buildSpec';
import { MAX_DIMENSIONS, type VoxelModel } from '@/core/schema/voxelModel';
import { largeBuildingModel } from '../helpers/largeModels';
import { allStateModels, largePaletteModel } from '../helpers/syntheticModels';

/**
 * Opens our exported .schem files with the real EngineHub WorldEdit 7.4.2 reader
 * (SpongeSchematicV3Reader on the worldedit-cli platform, see tests/worldedit/README.md).
 * Build the reader once with `npm run worldedit:build`. Without the jar the suite is skipped,
 * unless MCB_REQUIRE_WORLDEDIT=1 (then a missing jar fails the run).
 */
const JAR = resolve(__dirname, '../worldedit/target/schem-reader.jar');
const jarAvailable = existsSync(JAR);
const required = process.env.MCB_REQUIRE_WORLDEDIT === '1';

interface ReaderOutput {
  ok: boolean;
  reader: string;
  format: string;
  registryDataVersion: number;
  schematicDataVersion: number | null;
  dimensions: { width: number; height: number; length: number };
  minimumPoint: [number, number, number];
  origin: [number, number, number];
  palette: string[];
  indices: number[];
  nonAirCount: number;
  warnings: string[];
  errors: string[];
}

const run = promisify(execFile);
let dir = '';

/**
 * The reader prints one palette index per block as JSON: ~32 MiB for 192 x 384 x 192.
 * Generous buffer and per-process timeout so the largest models can be read.
 */
const READER_MAX_BUFFER = 512 * 1024 * 1024;
const READER_TIMEOUT_MS = 5 * 60_000;

async function readWithWorldEdit(fileName: string, bytes: Uint8Array): Promise<{ code: number; out: ReaderOutput }> {
  const path = join(dir, fileName);
  await writeFile(path, bytes);
  try {
    const { stdout } = await run('java', ['-jar', JAR, '--require-canonical', path], {
      maxBuffer: READER_MAX_BUFFER,
      timeout: READER_TIMEOUT_MS,
    });
    return { code: 0, out: JSON.parse(stdout) as ReaderOutput };
  } catch (error) {
    const e = error as { code?: number; stdout?: string };
    return { code: e.code ?? -1, out: JSON.parse(e.stdout ?? '{}') as ReaderOutput };
  }
}

function expectIdenticalToModel(out: ReaderOutput, model: VoxelModel): void {
  expect(out.errors).toEqual([]);
  expect(out.warnings).toEqual([]);
  expect(out.ok).toBe(true);
  expect(out.format).toBe('SPONGE_V3_SCHEMATIC');
  const { dataVersion } = requireProfile(model.spec.targetMinecraftVersion);
  expect(out.schematicDataVersion).toBe(dataVersion);
  expect(out.registryDataVersion).toBe(dataVersion);
  expect(out.dimensions).toEqual(model.dimensions);
  expect(out.minimumPoint).toEqual([0, 0, 0]);
  expect(out.nonAirCount).toBe(countMaterials(model).totalBlocks);
  expect(out.indices.length).toBe(model.indices.length);
  let mismatches = 0;
  let first = '';
  for (let i = 0; i < model.indices.length; i++) {
    const want = model.palette[model.indices[i]!];
    const got = out.palette[out.indices[i]!];
    if (want !== got) {
      if (mismatches++ === 0) first = `index ${i}: erwartet ${want}, WorldEdit ${got}`;
    }
  }
  expect(mismatches, first).toBe(0);
}

describe.skipIf(!jarAvailable && !required)('Echter WorldEdit-Reader (EngineHub WorldEdit 7.4.2)', () => {
  beforeAll(async () => {
    if (!jarAvailable) throw new Error(`WorldEdit-Reader fehlt: ${JAR} – zuerst "npm run worldedit:build" ausführen`);
    dir = await mkdtemp(join(tmpdir(), 'mcb-worldedit-'));
  });
  afterAll(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  // Every style (Christmas and plain), every building type, both profiles and feature combinations.
  const specs: [string, BuildSpec][] = [
    ...STYLE_IDS.flatMap((style): [string, BuildSpec][] => [
      [`Haus ${style} weihnachtlich`, { ...DEFAULT_HOUSE_SPEC, style, theme: 'christmas', size: 'medium' }],
      [`Haus ${style} groß, ohne Thema`, { ...DEFAULT_HOUSE_SPEC, style, theme: 'none', size: 'large', detailLevel: 2 }],
    ]),
    ['Profil 1.21.1 (DataVersion 3955)', { ...DEFAULT_HOUSE_SPEC, targetMinecraftVersion: '1.21.1' }],
    ['Haus verwinkelt mit Turm, Anbau, Veranda, Gauben, Walmdach', { ...DEFAULT_HOUSE_SPEC, style: 'medieval', size: 'large', options: { tower: 'square', towerPosition: 'front_left', annex: 'right', porch: true, dormers: 2, roofType: 'hip', symmetry: 'rambling' } }],
    ['Haus Winter, Seelenlaternen, viele Laternen', { ...DEFAULT_HOUSE_SPEC, style: 'nordic', theme: 'winter', options: { soulLanterns: true, lanternDensity: 'many' } }],
    ['Weihnachtsbaum groß', { ...DEFAULT_HOUSE_SPEC, kind: 'tree', size: 'large', detailLevel: 3 }],
    ['Marktstand groß', { ...DEFAULT_HOUSE_SPEC, kind: 'market_stall', size: 'large' }],
    ['Bahnhof groß mit Schienen (1.21.11)', { ...DEFAULT_HOUSE_SPEC, kind: 'station', style: 'medieval', size: 'large' }],
    ['Bahnhof klein mit Schienen (1.21.1)', { ...DEFAULT_HOUSE_SPEC, kind: 'station', size: 'small', targetMinecraftVersion: '1.21.1' }],
    ['Turm', { ...DEFAULT_HOUSE_SPEC, kind: 'tower', style: 'fantasy', size: 'large' }],
    ['Turm mit Zinnen', { ...DEFAULT_HOUSE_SPEC, kind: 'tower', style: 'medieval', size: 'medium' }],
    ['Haus mit Rundturm, Erker, Balkon, Bogenfenstern', { ...DEFAULT_HOUSE_SPEC, style: 'medieval', size: 'large', options: { tower: 'round', towerPosition: 'back_right', oriel: true, balcony: true, floors: 2, windowFamily: 'arched' } }],
    ['Schnee auf Wunsch (Schneeschichten)', { ...DEFAULT_HOUSE_SPEC, style: 'nordic', theme: 'winter', options: { snow: true } }],
    ['Feinparameter (Ziegel, Kupferdach, Geschosse)', { ...DEFAULT_HOUSE_SPEC, options: { width: 21, floors: 3, windows: 'many', materials: { wall: 'bricks', roof: 'waxed_weathered_cut_copper', accent: 'red_wool' } } }],
  ];

  it('liest die drei Standard-Varianten Block für Block identisch', async () => {
    const variants = generateVariants(DEFAULT_HOUSE_SPEC);
    const results = await Promise.all(variants.map((m) => readWithWorldEdit(`house-seed${m.spec.seed}.schem`, writeSpongeV3(m))));
    results.forEach(({ code, out }, i) => {
      expect(code).toBe(0);
      expect(out.reader).toMatch(/EngineHub WorldEdit 7\.4\.2/);
      expectIdenticalToModel(out, variants[i]!);
    });
  });

  it.each(specs)('liest Stile, Bauwerke und Feinparameter identisch (%s)', { timeout: 120_000 }, async (_name, spec) => {
    const model = generateBuilding(spec);
    const { code, out } = await readWithWorldEdit('variant.schem', writeSpongeV3(model));
    expect(code).toBe(0);
    expectIdenticalToModel(out, model);
  });

  it('liest manuell bearbeitete Modelle identisch', async () => {
    const base = generateBuilding(DEFAULT_HOUSE_SPEC);
    const history = new EditHistory();
    let model = history.execute(base, setBlockCommand(base, { x: 0, y: 0, z: 0 }, blockState('jack_o_lantern', { facing: 'east' }))!);
    model = history.execute(model, replaceAllCommand(model, model.palette[1]!, blockState('hay_block', { axis: 'x' }))!);
    const { code, out } = await readWithWorldEdit('edited.schem', writeSpongeV3(model));
    expect(code).toBe(0);
    expectIdenticalToModel(out, model);
  });

  it.each(['1.21.11', '1.21.1'])(
    'liest jeden Registry-Zustand aller Formklassen identisch (Minecraft %s)',
    { timeout: 300_000 },
    async (version) => {
      const models = allStateModels(version);
      let states = 0;
      for (const [i, model] of models.entries()) {
        const { code, out } = await readWithWorldEdit(`all-states-${version}-${i}.schem`, writeSpongeV3(model));
        expect(code, out.errors?.join('\n')).toBe(0);
        expectIdenticalToModel(out, model);
        states += model.palette.length - 1;
      }
      expect(states).toBeGreaterThan(5000);
    },
  );

  it('liest Paletten mit >127 Einträgen (Mehrbyte-VarInts) identisch', async () => {
    const model = largePaletteModel();
    expect(model.palette.length).toBeGreaterThan(127);
    const { code, out } = await readWithWorldEdit('large-palette.schem', writeSpongeV3(model));
    expect(code).toBe(0);
    expectIdenticalToModel(out, model);
  });

  it.each([
    ['96×200×96', { width: 96, height: 200, length: 96 }],
    ['192×384×192 (Maximum)', MAX_DIMENSIONS],
  ])(
    'liest große synthetische Bauwerke (%s, Palette 150, Mehrbyte-VarInts) identisch',
    { timeout: READER_TIMEOUT_MS + 60_000 },
    async (_name, dimensions) => {
      const model = largeBuildingModel({ ...dimensions });
      expect(model.palette.length).toBeGreaterThan(127);
      const { code, out } = await readWithWorldEdit('large.schem', writeSpongeV3(model));
      expect(code).toBe(0);
      expectIdenticalToModel(out, model);
    },
  );

  it('Gegenprobe: WorldEdit-Harness weist einen ungültigen Blockstate zurück', async () => {
    const root = buildSpongeV3Nbt(generateBuilding(DEFAULT_HOUSE_SPEC));
    const palette = (((root.value.Schematic as nbt.Compound).value.Blocks as nbt.Compound).value.Palette as nbt.Compound).value;
    const key = Object.keys(palette).find((k) => k.includes('axis=y'))!;
    palette[key.replace('axis=y', 'axis=w')] = palette[key];
    delete palette[key];
    const { code, out } = await readWithWorldEdit('broken.schem', gzipSync(nbt.writeUncompressed(root, 'big')));
    expect(code).toBe(2);
    expect(out.ok).toBe(false);
  });
});
