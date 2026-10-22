import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { promisify } from 'node:util';
import { gzipSync } from 'node:zlib';
import * as nbt from 'prismarine-nbt';
import { describe, expect, it } from 'vitest';
import { encodeVarIntArray } from '@/core/export/encodeVarInt';
import { exportSchematic } from '@/core/export/exportSchematic';
import { MAX_UNCOMPRESSED_BYTES, validateSchematic } from '@/core/export/validateSchematic';
import { buildSpongeV3Nbt, writeSpongeV3 } from '@/core/export/writeSpongeV3';
import { DEFAULT_HOUSE_SPEC } from '@/core/schema/buildSpec';
import {
  checkDimensions,
  collectVoxelIssues,
  computeVoxelHash,
  createVoxelModel,
  MAX_DIMENSIONS,
  MAX_VOLUME,
  type Dimensions,
} from '@/core/schema/voxelModel';
import {
  decodeIndices,
  decodeVoxelTransport,
  encodeVoxelTransport,
  MAX_TRANSPORT_REQUEST_BYTES,
  TransportError,
  type IndexEncoding,
} from '@/lib/serialization/voxelTransport';
import { largeBuildingData, largeBuildingModel } from '../helpers/largeModels';

describe('Große Bauwerke: Grenzen', () => {
  it('erlaubt bis 192×384×192 (volle Weltenhöhe), lehnt mehr ab', () => {
    expect(MAX_DIMENSIONS).toEqual({ width: 192, height: 384, length: 192 });
    expect(MAX_VOLUME).toBe(192 * 384 * 192);
    expect(MAX_VOLUME).toBeGreaterThanOrEqual(128 * 384 * 128);
    expect(checkDimensions({ width: 128, height: 384, length: 128 })).toEqual([]);
    expect(checkDimensions(MAX_DIMENSIONS)).toEqual([]);
    expect(checkDimensions({ width: 1, height: 385, length: 1 }).join()).toMatch(/height=385/);
    expect(checkDimensions({ width: 193, height: 1, length: 1 }).join()).toMatch(/width=193/);
    expect(checkDimensions({ width: 1, height: 1, length: 193 }).join()).toMatch(/length=193/);
  });

  it('Transport lehnt zu große Maße vor dem Dekodieren ab', () => {
    const t = encodeVoxelTransport(largeBuildingModel({ width: 16, height: 12, length: 16 }));
    for (const dimensions of [
      { width: 16, height: 385, length: 16 },
      { width: 193, height: 12, length: 16 },
    ]) {
      let error: unknown;
      try {
        decodeVoxelTransport({ ...t, dimensions });
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(TransportError);
      expect((error as TransportError).issues.join()).toMatch(/dimensions.(height|width)/);
    }
  });
});

describe('Große Bauwerke: ganzer Datenweg bei 192×384×192', () => {
  it('Modell → RLE-Transport → JSON → Modell → .schem → Validator ist verlustfrei', () => {
    const model = largeBuildingModel(MAX_DIMENSIONS);
    expect(model.indices.length).toBe(MAX_VOLUME);
    expect(model.palette.length).toBeGreaterThan(127); // two-byte VarInts in the .schem

    const transport = encodeVoxelTransport(model);
    expect(transport.indexEncoding).toBe('rle-varint-base64');
    const json = JSON.stringify(transport);
    expect(json.length).toBeLessThan(MAX_TRANSPORT_REQUEST_BYTES);
    const decoded = decodeVoxelTransport(JSON.parse(json));
    expect(decoded.hash).toBe(model.hash);
    expect(Buffer.from(decoded.indices.buffer).equals(Buffer.from(model.indices.buffer))).toBe(true);

    const { file, report } = exportSchematic(decoded);
    expect(report.ok).toBe(true);
    expect(report.uncompressedBytes).toBeLessThanOrEqual(MAX_UNCOMPRESSED_BYTES);
    expect(report.decoded?.hash).toBe(model.hash);
    expect(validateSchematic(file, { expected: model }).ok).toBe(true);
  });

  it('der Zip-Bomben-Schutz greift erst oberhalb der größten legalen Datei', () => {
    // A file that decompresses to more than the bound is rejected without parsing it.
    const bomb = gzipSync(Buffer.alloc(MAX_UNCOMPRESSED_BYTES + 1));
    expect(bomb.length).toBeLessThan(64 * 1024);
    expect(validateSchematic(bomb).issues.join()).toMatch(/GZip/);
  });
});

// ---------------------------------------------------------------------------------------
// Measurements (MCB_MEASURE=1, e.g. via `node scripts/measure-large.mjs`). Prints the
// numbers for docs/ARCHITECTURE.md; asserts only correctness, never timings.

const MiB = 1024 * 1024;
const fmtBytes = (n: number) => (n >= MiB ? `${(n / MiB).toFixed(2)} MiB` : `${(n / 1024).toFixed(1)} KiB`);
const fmtMs = (n: number) => `${n.toFixed(n < 10 ? 1 : 0)} ms`;

/** Median of `reps` runs (after the warm-up done by the caller). */
function timed<T>(fn: () => T, reps = 3): { ms: number; value: T } {
  const times: number[] = [];
  let value!: T;
  for (let i = 0; i < reps; i++) {
    const start = performance.now();
    value = fn();
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  return { ms: times[Math.floor(times.length / 2)]!, value };
}

const JAR = resolve(__dirname, '../worldedit/target/schem-reader.jar');
const run = promisify(execFile);

async function measureSize(dimensions: Dimensions, lines: string[]): Promise<void> {
  const label = `${dimensions.width}×${dimensions.height}×${dimensions.length}`;
  const data = largeBuildingData(dimensions);
  const create = timed(() => createVoxelModel({ ...DEFAULT_HOUSE_SPEC, seed: 1 }, dimensions, data.palette, data.indices));
  const model = create.value;
  let nonAir = 0;
  for (let i = 0; i < model.indices.length; i++) if (model.indices[i] !== 0) nonAir++;
  lines.push(
    `## ${label} (${model.indices.length.toLocaleString('de-DE')} Blöcke, ${((100 * nonAir) / model.indices.length).toFixed(1)} % nicht Luft, Palette ${model.palette.length})`,
  );
  lines.push(`createVoxelModel (kanonisieren + Registry + Hash + Prüfung): ${fmtMs(create.ms)}`);
  const hash = timed(() => computeVoxelHash(model.dimensions, model.palette, model.indices), 5);
  expect(hash.value).toBe(model.hash);
  lines.push(
    `computeVoxelHash über ${fmtBytes(model.indices.byteLength)}: ${fmtMs(hash.ms)} (${(model.indices.byteLength / MiB / (hash.ms / 1000)).toFixed(0)} MiB/s)`,
  );
  lines.push(`collectVoxelIssues (inkl. Hash): ${fmtMs(timed(() => collectVoxelIssues(model)).ms)}`);

  for (const encoding of ['u16le-base64', 'rle-varint-base64'] as IndexEncoding[]) {
    const enc = timed(() => encodeVoxelTransport(model, { indexEncoding: encoding }));
    const json = JSON.stringify(enc.value);
    const indicesOnly = timed(() => decodeIndices(encoding, enc.value.indices, model.indices.length, model.palette.length));
    expect(Buffer.from(indicesOnly.value.buffer).equals(Buffer.from(model.indices.buffer))).toBe(true);
    const dec = timed(() => decodeVoxelTransport(JSON.parse(json)));
    expect(dec.value.hash).toBe(model.hash);
    lines.push(
      `Transport ${encoding}: Indizes ${fmtBytes(enc.value.indices.length)} Base64, JSON ${fmtBytes(json.length)}; kodieren ${fmtMs(enc.ms)}, Indizes dekodieren ${fmtMs(indicesOnly.ms)}, JSON.parse + decodeVoxelTransport (inkl. Prüfung + Hash) ${fmtMs(dec.ms)}`,
    );
  }

  const varints = timed(() => encodeVarIntArray(model.indices));
  const root = buildSpongeV3Nbt(model);
  const nbtWrite = timed(() => nbt.writeUncompressed(root, 'big'));
  const gzip = timed(() => gzipSync(nbtWrite.value, { level: 9 }), 1);
  const write = timed(() => writeSpongeV3(model), 1);
  const exported = timed(() => exportSchematic(model), 1);
  expect(exported.value.report.ok).toBe(true);
  const validate = timed(() => validateSchematic(write.value, { expected: model }), 1);
  expect(validate.value.ok).toBe(true);
  lines.push(
    `Export: writeSpongeV3 ${fmtMs(write.ms)} (VarInts ${fmtMs(varints.ms)} → ${fmtBytes(varints.value.length)}, NBT schreiben ${fmtMs(nbtWrite.ms)} → ${fmtBytes(nbtWrite.value.length)}, gzip -9 ${fmtMs(gzip.ms)}), .schem ${fmtBytes(write.value.length)}`,
  );
  lines.push(`validateSchematic (gunzip + NBT + VarInts + Block-für-Block-Vergleich + Hash): ${fmtMs(validate.ms)}`);
  lines.push(`exportSchematic (schreiben + Selbstprüfung): ${fmtMs(exported.ms)}`);

  if (existsSync(JAR)) {
    const dir = await mkdtemp(join(tmpdir(), 'mcb-measure-'));
    try {
      const path = join(dir, 'large.schem');
      await writeFile(path, write.value);
      const start = performance.now();
      const { stdout } = await run('java', ['-jar', JAR, '--require-canonical', path], {
        maxBuffer: 512 * MiB,
        timeout: 600_000,
      });
      const ms = performance.now() - start;
      const out = JSON.parse(stdout) as { ok: boolean; palette: string[]; indices: number[]; errors: string[] };
      expect(out.errors).toEqual([]);
      expect(out.ok).toBe(true);
      let mismatches = 0;
      for (let i = 0; i < model.indices.length; i++) if (out.palette[out.indices[i]!] !== model.palette[model.indices[i]!]) mismatches++;
      expect(mismatches).toBe(0);
      lines.push(`WorldEdit 7.4.2 Reader (JVM-Start + Lesen + JSON-Ausgabe ${fmtBytes(stdout.length)}): ${fmtMs(ms)}, Block für Block identisch`);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  } else {
    lines.push('WorldEdit-Reader: nicht gebaut, übersprungen');
  }
}

describe.skipIf(!process.env.MCB_MEASURE)('Messung großer Bauwerke (MCB_MEASURE=1)', () => {
  it('misst den Datenweg (Standard 128×384×128, MCB_MEASURE_SIZES=WxHxL,…)', { timeout: 900_000 }, async () => {
    const lines: string[] = [`Node ${process.version}, ${process.platform}/${process.arch}`];
    // Warm-up so the JIT has compiled the hot loops before the real measurement.
    await measureSize({ width: 32, height: 48, length: 32 }, []);
    const sizes = (process.env.MCB_MEASURE_SIZES ?? '128x384x128')
      .split(',')
      .map((s) => s.split('x').map(Number))
      .map(([width, height, length]) => ({ width: width!, height: height!, length: length! }));
    for (const size of sizes) await measureSize(size, lines);
    console.log(`\n${lines.join('\n')}\n`);
  });
});
