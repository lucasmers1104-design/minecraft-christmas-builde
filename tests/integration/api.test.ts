import { describe, expect, it, vi } from 'vitest';
import { POST as exportRoute } from '@/app/api/export/route';
import { POST as generateRoute, type GenerateResponse } from '@/app/api/generate/route';
import { validateSchematic } from '@/core/export/validateSchematic';
import { DEFAULT_HOUSE_SPEC } from '@/core/schema/buildSpec';
import { decodeVoxelTransport, encodeVoxelTransport, MAX_TRANSPORT_REQUEST_BYTES } from '@/lib/serialization/voxelTransport';
import { generateBuilding } from '@/core/generator/generateBuilding';
import { largeBuildingModel } from '../helpers/largeModels';

/**
 * No spec option can exceed the (now large) block limits any more, so the generator's
 * BuildLimitError is triggered through a pass-through mock to keep the 422 mapping covered.
 */
const limit = vi.hoisted(() => ({ exceed: false }));
vi.mock('@/core/generator/generateBuilding', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/generator/generateBuilding')>();
  const { BuildLimitError } = await import('@/core/generator/generateBuilding');
  return {
    ...actual,
    generateVariants: (...args: Parameters<typeof actual.generateVariants>) => {
      if (limit.exceed) throw new BuildLimitError('Das Haus wäre 400×10×10 Blöcke groß und passt nicht in die Grenzen');
      return actual.generateVariants(...args);
    },
  };
});

const post = (body: unknown, raw?: string, headers: Record<string, string> = {}) =>
  new Request('http://localhost/api', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: raw ?? JSON.stringify(body),
  });

describe('POST /api/generate', () => {
  it('liefert drei vollständige, verlustfreie Varianten (RLE-kodiert)', async () => {
    const res = await generateRoute(post({ spec: DEFAULT_HOUSE_SPEC }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as GenerateResponse;
    expect(body.generator).toBe('rule-based');
    expect(body.profile).toEqual({ minecraftVersion: '1.21.11', dataVersion: 4671, schematic: 'Sponge Schematic v3' });
    expect(body.variants.map((v) => v.seed)).toEqual([1, 2, 3]);
    for (const v of body.variants) {
      expect(v.model.indexEncoding).toBe('rle-varint-base64');
      const model = decodeVoxelTransport(v.model);
      expect(model.hash).toBe(v.hash);
      expect(model.hash).toBe(generateBuilding({ ...DEFAULT_HOUSE_SPEC, seed: v.seed }).hash);
    }
  });

  it('meldet Fehler als echte HTTP-Fehler', async () => {
    expect((await generateRoute(post({ spec: { ...DEFAULT_HOUSE_SPEC, size: 'gigantisch' } }))).status).toBe(400);
    expect((await generateRoute(post(undefined, '{not json'))).status).toBe(400);
    expect((await generateRoute(post({ spec: DEFAULT_HOUSE_SPEC, extra: 1 }))).status).toBe(400);
    limit.exceed = true;
    try {
      const tooLarge = await generateRoute(post({ spec: DEFAULT_HOUSE_SPEC }));
      expect(tooLarge.status).toBe(422);
      expect(((await tooLarge.json()) as { error: string }).error).toMatch(/passt nicht/);
    } finally {
      limit.exceed = false;
    }
    const station = await generateRoute(post({ spec: { ...DEFAULT_HOUSE_SPEC, kind: 'station' }, variants: 1 }));
    expect(station.status).toBe(200);
    // The generate request only carries a spec: its limit stays small (16 KiB).
    expect((await generateRoute(post(undefined, JSON.stringify({ spec: DEFAULT_HOUSE_SPEC, pad: 'x'.repeat(20_000) })))).status).toBe(413);
  });
});

describe('POST /api/export', () => {
  const model = generateBuilding({ ...DEFAULT_HOUSE_SPEC, seed: 3 });

  it('exportiert genau das übergebene Volumen als geprüfte .schem', async () => {
    const res = await exportRoute(post(encodeVoxelTransport(model)));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/octet-stream');
    expect(res.headers.get('content-disposition')).toMatch(/^attachment; filename="christmas-house-medium-seed3-[0-9a-f]{8}\.schem"$/);
    expect(res.headers.get('x-mcb-voxel-hash')).toBe(model.hash);
    const file = new Uint8Array(await res.arrayBuffer());
    expect(file.length).toBeGreaterThan(0);
    const report = validateSchematic(file, { expected: model });
    expect(report.ok).toBe(true);
  });

  it('akzeptiert auch alte u16le-base64-Transporte', async () => {
    const res = await exportRoute(post(encodeVoxelTransport(model, { indexEncoding: 'u16le-base64' })));
    expect(res.status).toBe(200);
    expect(res.headers.get('x-mcb-voxel-hash')).toBe(model.hash);
  });

  it('exportiert ein großes Bauwerk (128×384×128)', async () => {
    const big = largeBuildingModel({ width: 128, height: 384, length: 128 });
    const res = await exportRoute(post(encodeVoxelTransport(big)));
    expect(res.status).toBe(200);
    expect(res.headers.get('x-mcb-voxel-hash')).toBe(big.hash);
    const report = validateSchematic(new Uint8Array(await res.arrayBuffer()), { expected: big });
    expect(report.issues).toEqual([]);
    expect(report.decoded?.dimensions).toEqual({ width: 128, height: 384, length: 128 });
  });

  it('verweigert manipulierte Modelle und zu große Anfragen', async () => {
    const t = encodeVoxelTransport(model);
    const tampered = await exportRoute(post({ ...t, hash: '0'.repeat(64) }));
    expect(tampered.status).toBe(400);
    expect(((await tampered.json()) as { issues: string[] }).issues.join()).toMatch(/Hash/);
    expect((await exportRoute(post({ ...t, palette: [...t.palette.slice(0, -1), 'minecraft:command_block'] }))).status).toBe(400);
    expect((await exportRoute(post({ prompt: 'Bitte ein Haus' }))).status).toBe(400);
    // Declared too large: rejected from the header alone.
    expect((await exportRoute(post(undefined, '{}', { 'content-length': String(MAX_TRANSPORT_REQUEST_BYTES + 1) }))).status).toBe(413);
    // Actually too large without a Content-Length: the streamed body is cut off at the limit.
    const oversized = await exportRoute(post(undefined, 'x'.repeat(MAX_TRANSPORT_REQUEST_BYTES + 1)));
    expect(oversized.status).toBe(413);
    // Invalid UTF-8 is a client error, not a crash.
    const invalidUtf8 = new Request('http://localhost/api', { method: 'POST', body: new Uint8Array([0x7b, 0xff, 0x7d]) });
    expect((await exportRoute(invalidUtf8)).status).toBe(400);
  });
});
