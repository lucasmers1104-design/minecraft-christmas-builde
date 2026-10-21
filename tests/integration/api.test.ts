import { describe, expect, it } from 'vitest';
import { POST as exportRoute } from '@/app/api/export/route';
import { POST as generateRoute, type GenerateResponse } from '@/app/api/generate/route';
import { validateSchematic } from '@/core/export/validateSchematic';
import { DEFAULT_HOUSE_SPEC } from '@/core/schema/buildSpec';
import { decodeVoxelTransport, encodeVoxelTransport } from '@/lib/serialization/voxelTransport';
import { generateBuilding } from '@/core/generator/generateBuilding';

const post = (body: unknown, raw?: string) =>
  new Request('http://localhost/api', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ?? JSON.stringify(body),
  });

describe('POST /api/generate', () => {
  it('liefert drei vollständige, verlustfreie Varianten', async () => {
    const res = await generateRoute(post({ spec: DEFAULT_HOUSE_SPEC }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as GenerateResponse;
    expect(body.generator).toBe('rule-based');
    expect(body.profile).toEqual({ minecraftVersion: '1.21.1', dataVersion: 3955, schematic: 'Sponge Schematic v3' });
    expect(body.variants.map((v) => v.seed)).toEqual([1, 2, 3]);
    for (const v of body.variants) {
      const model = decodeVoxelTransport(v.model);
      expect(model.hash).toBe(v.hash);
      expect(model.hash).toBe(generateBuilding({ ...DEFAULT_HOUSE_SPEC, seed: v.seed }).hash);
    }
  });

  it('meldet Fehler als echte HTTP-Fehler', async () => {
    expect((await generateRoute(post({ spec: { ...DEFAULT_HOUSE_SPEC, size: 'huge' } }))).status).toBe(400);
    expect((await generateRoute(post(undefined, '{not json'))).status).toBe(400);
    expect((await generateRoute(post({ spec: DEFAULT_HOUSE_SPEC, extra: 1 }))).status).toBe(400);
    const notImplemented = await generateRoute(post({ spec: { ...DEFAULT_HOUSE_SPEC, kind: 'station' } }));
    expect(notImplemented.status).toBe(422);
    expect(((await notImplemented.json()) as { error: string }).error).toMatch(/noch nicht verfügbar/);
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

  it('verweigert manipulierte Modelle und zu große Anfragen', async () => {
    const t = encodeVoxelTransport(model);
    const tampered = await exportRoute(post({ ...t, hash: '0'.repeat(64) }));
    expect(tampered.status).toBe(400);
    expect(((await tampered.json()) as { issues: string[] }).issues.join()).toMatch(/Hash/);
    expect((await exportRoute(post({ ...t, palette: [...t.palette.slice(0, -1), 'minecraft:command_block'] }))).status).toBe(400);
    expect((await exportRoute(post({ prompt: 'Bitte ein Haus' }))).status).toBe(400);
    expect((await exportRoute(post(undefined, 'x'.repeat(600 * 1024)))).status).toBe(413);
  });
});
