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
import { buildSpongeV3Nbt, writeSpongeV3 } from '@/core/export/writeSpongeV3';
import { generateBuilding, generateVariants } from '@/core/generator/generateBuilding';
import { DEFAULT_HOUSE_SPEC, type BuildSpec } from '@/core/schema/buildSpec';
import type { VoxelModel } from '@/core/schema/voxelModel';
import { largePaletteModel } from '../helpers/syntheticModels';

/**
 * Opens our exported .schem files with the real EngineHub WorldEdit 7.3.8 reader
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

async function readWithWorldEdit(fileName: string, bytes: Uint8Array): Promise<{ code: number; out: ReaderOutput }> {
  const path = join(dir, fileName);
  await writeFile(path, bytes);
  try {
    const { stdout } = await run('java', ['-jar', JAR, '--require-canonical', path], { maxBuffer: 16 * 1024 * 1024 });
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
  expect(out.schematicDataVersion).toBe(3955);
  expect(out.registryDataVersion).toBe(3955);
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

describe.skipIf(!jarAvailable && !required)('Echter WorldEdit-Reader (EngineHub WorldEdit 7.3.8)', () => {
  beforeAll(async () => {
    if (!jarAvailable) throw new Error(`WorldEdit-Reader fehlt: ${JAR} – zuerst "npm run worldedit:build" ausführen`);
    dir = await mkdtemp(join(tmpdir(), 'mcb-worldedit-'));
  });
  afterAll(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  const specs: [string, BuildSpec][] = [
    ['klein/realistisch/eiche/natur', { ...DEFAULT_HOUSE_SPEC, size: 'small', style: 'realistic', materialTheme: 'oak', colorTheme: 'natural', detailLevel: 1 }],
    ['groß/märchenhaft/stein/eisblau', { ...DEFAULT_HOUSE_SPEC, size: 'large', style: 'fairytale', materialTheme: 'stone', colorTheme: 'ice_blue', detailLevel: 3 }],
  ];

  it('liest die drei Standard-Varianten Block für Block identisch', async () => {
    const variants = generateVariants(DEFAULT_HOUSE_SPEC);
    const results = await Promise.all(variants.map((m) => readWithWorldEdit(`house-seed${m.spec.seed}.schem`, writeSpongeV3(m))));
    results.forEach(({ code, out }, i) => {
      expect(code).toBe(0);
      expect(out.reader).toMatch(/EngineHub WorldEdit 7\.3\.8/);
      expectIdenticalToModel(out, variants[i]!);
    });
  });

  it.each(specs)('liest weitere Stil-/Größenvarianten identisch (%s)', async (_name, spec) => {
    const model = generateBuilding(spec);
    const { code, out } = await readWithWorldEdit('variant.schem', writeSpongeV3(model));
    expect(code).toBe(0);
    expectIdenticalToModel(out, model);
  });

  it('liest Paletten mit >127 Einträgen (Mehrbyte-VarInts) identisch', async () => {
    const model = largePaletteModel();
    expect(model.palette.length).toBeGreaterThan(127);
    const { code, out } = await readWithWorldEdit('large-palette.schem', writeSpongeV3(model));
    expect(code).toBe(0);
    expectIdenticalToModel(out, model);
  });

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
