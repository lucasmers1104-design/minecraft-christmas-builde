import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { countMaterials, formatStacks } from '@/core/analysis/materialCounts';
import { generateBuilding } from '@/core/generator/generateBuilding';
import { DEFAULT_HOUSE_SPEC } from '@/core/schema/buildSpec';
import {
  canonicalizeVoxelData,
  collectVoxelIssues,
  computeVoxelHash,
  createVoxelModel,
  linearIndex,
  VoxelModelError,
} from '@/core/schema/voxelModel';
import { buildVoxelMesh } from '@/components/preview/buildVoxelMesh';

const model = generateBuilding(DEFAULT_HOUSE_SPEC);

describe('VoxelModel', () => {
  it('Indexformel x + width * (z + length * y)', () => {
    const d = { width: 4, height: 3, length: 5 };
    expect(linearIndex(d, 0, 0, 0)).toBe(0);
    expect(linearIndex(d, 1, 0, 0)).toBe(1);
    expect(linearIndex(d, 0, 0, 1)).toBe(4);
    expect(linearIndex(d, 0, 1, 0)).toBe(20);
    expect(linearIndex(d, 3, 2, 4)).toBe(59);
  });

  it('kanonisiert die Palette (Luft zuerst, Reihenfolge des Auftretens, ungenutzte entfernt)', () => {
    const c = canonicalizeVoxelData(['minecraft:glass', 'minecraft:stone_bricks', 'minecraft:air'], Uint16Array.from([1, 2, 1, 1]));
    expect(c.palette).toEqual(['minecraft:air', 'minecraft:stone_bricks']);
    expect(Array.from(c.indices)).toEqual([1, 0, 1, 1]);
  });

  it('Hash: festes Format (Kopfzeilen + Indizes als u16 little-endian), auch für große Modelle', () => {
    const d = { width: 2, height: 1, length: 2 };
    const palette = ['minecraft:air', 'minecraft:stone_bricks'];
    expect(computeVoxelHash(d, palette, Uint16Array.from([0, 1, 1, 0]))).toBe(
      '4d70d6145af064613b703138fd2d202db25ab8a5229c83dccfd74d86b5bb1475',
    );
    // Reference: the original definition, hashed in one piece with node:crypto.
    const reference = (dims: typeof d, p: string[], indices: Uint16Array) => {
      const header = Buffer.from(`mcb-voxel-v1\n${dims.width}x${dims.height}x${dims.length}\n${p.join('\n')}\n`, 'utf8');
      const body = Buffer.alloc(indices.length * 2);
      indices.forEach((v, i) => body.writeUInt16LE(v, i * 2));
      return createHash('sha256').update(Buffer.concat([header, body])).digest('hex');
    };
    expect(model.hash).toBe(reference(model.dimensions, model.palette, model.indices));
    const big = { width: 128, height: 64, length: 128 };
    const indices = new Uint16Array(big.width * big.height * big.length);
    for (let i = 0; i < indices.length; i++) indices[i] = (i * 2654435761) % 4093;
    const states = Array.from({ length: 4093 }, (_, i) => `minecraft:test_${i}`);
    expect(computeVoxelHash(big, states, indices)).toBe(reference(big, states, indices));
    // A view into a larger buffer hashes only its own elements.
    const view = new Uint16Array(indices.buffer, 2, 4);
    expect(computeVoxelHash(d, palette, view)).toBe(reference(d, palette, Uint16Array.from(view)));
  });

  it('Hash ändert sich, wenn sich ein einziger Block ändert', () => {
    const indices = model.indices.slice();
    indices[5] = indices[5] === 0 ? 1 : 0;
    expect(computeVoxelHash(model.dimensions, model.palette, indices)).not.toBe(model.hash);
  });

  it('erkennt inkonsistente Modelle', () => {
    expect(collectVoxelIssues(model)).toEqual([]);
    expect(collectVoxelIssues({ ...model, hash: '0'.repeat(64) }).join()).toMatch(/Hash/);
    expect(collectVoxelIssues({ ...model, indices: model.indices.slice(1) }).join()).toMatch(/Indexanzahl/);
    const bad = model.indices.slice();
    bad[0] = model.palette.length;
    expect(collectVoxelIssues({ ...model, indices: bad }).join()).toMatch(/außerhalb der Palette/);
    expect(collectVoxelIssues({ ...model, palette: [...model.palette, 'minecraft:bedrock'] }).join()).toMatch(/nicht freigegeben/);
    expect(collectVoxelIssues({ ...model, palette: [...model.palette, model.palette[1]!] }).join()).toMatch(/Doppelt/);
    expect(collectVoxelIssues({ ...model, dimensions: { width: 193, height: 1, length: 1 } }).join()).toMatch(/Limit/);
    expect(collectVoxelIssues({ ...model, dimensions: { width: 1, height: 385, length: 1 } }).join()).toMatch(/Limit/);
    expect(() => createVoxelModel(DEFAULT_HOUSE_SPEC, { width: 1, height: 1, length: 1 }, ['minecraft:bedrock'], Uint16Array.from([0]))).toThrow(
      VoxelModelError,
    );
  });
});

describe('Materialliste', () => {
  it('zählt direkt aus den Indizes, ohne Luft, mit Stacks', () => {
    const summary = countMaterials(model);
    let nonAir = 0;
    for (const i of model.indices) if (model.palette[i] !== 'minecraft:air') nonAir++;
    expect(summary.totalBlocks).toBe(nonAir);
    expect(summary.totalBlocks + summary.airBlocks).toBe(model.indices.length);
    expect(summary.entries.some((e) => e.state === 'minecraft:air')).toBe(false);
    expect(summary.entries.reduce((s, e) => s + e.count, 0)).toBe(summary.totalBlocks);
    expect(summary.byBlock.reduce((s, e) => s + e.count, 0)).toBe(summary.totalBlocks);
    for (const e of summary.entries) expect(e.stacks * 64 + e.remainder).toBe(e.count);
    expect(formatStacks(130)).toBe('2 × 64 + 2');
    expect(formatStacks(64)).toBe('1 × 64');
    expect(formatStacks(5)).toBe('5');
  });
});

describe('Vorschau-Mesh', () => {
  it('cullt verdeckte Flächen und erzeugt nichts für Luft', () => {
    const cube = createVoxelModel(
      DEFAULT_HOUSE_SPEC,
      { width: 3, height: 3, length: 3 },
      ['minecraft:stone_bricks'],
      new Uint16Array(27),
    );
    expect(buildVoxelMesh(cube).faceCount).toBe(54);
    const air = createVoxelModel(DEFAULT_HOUSE_SPEC, { width: 2, height: 2, length: 2 }, ['minecraft:air'], new Uint16Array(8));
    expect(buildVoxelMesh(air).faceCount).toBe(0);
  });

  it('rendert das Haus aus genau den Modellblöcken (Glas separat)', () => {
    const mesh = buildVoxelMesh(model);
    expect(mesh.translucent.faceCount).toBeGreaterThan(0);
    expect(mesh.emissive.faceCount).toBeGreaterThan(0);
    // Upper bound: 6 faces per non-air block; culling must remove a substantial share (shaped
    // blocks – stairs, slabs, fences, lanterns – keep most of their faces).
    expect(mesh.faceCount).toBeLessThan(countMaterials(model).totalBlocks * 6 * 0.7);
    expect(mesh.opaque.positions.length).toBe(mesh.opaque.faceCount * 4 * 3);
    expect(mesh.translucent.colors.length).toBe(mesh.translucent.faceCount * 4 * 4);
    expect(mesh.opaque.indices.length).toBe(mesh.opaque.faceCount * 6);
  });

  it('Formen verdecken nur mit voller Seite; verbundene Scheiben ohne Zwischenflächen', () => {
    const row = (states: string[], dims = { width: states.length, height: 1, length: 1 }) => {
      const palette = [...new Set(['minecraft:air', ...states])];
      return createVoxelModel(DEFAULT_HOUSE_SPEC, dims, palette, Uint16Array.from(states.map((s) => palette.indexOf(s))));
    };
    const bricks = 'minecraft:stone_bricks';
    const facesOfCell = (m: ReturnType<typeof buildVoxelMesh>, cell: number) =>
      [m.opaque, m.emissive, m.translucent].reduce((n, b) => n + b.faceCells.filter((c) => c === cell).length, 0);
    // Bottom slab on bricks hides the bricks' top face; a top slab does not touch it.
    const tower = (top: string) => facesOfCell(buildVoxelMesh(row([bricks, top], { width: 1, height: 2, length: 1 })), 0);
    expect(tower('minecraft:oak_slab[type=bottom,waterlogged=false]')).toBe(5);
    expect(tower('minecraft:oak_slab[type=top,waterlogged=false]')).toBe(6);
    expect(tower('minecraft:glass')).toBe(6);
    // Post (6 faces) + arm (6 faces) per pane; the touching end faces of the two arms vanish.
    const east = 'minecraft:glass_pane[east=true,north=false,south=false,waterlogged=false,west=false]';
    const west = 'minecraft:glass_pane[east=false,north=false,south=false,waterlogged=false,west=true]';
    expect(buildVoxelMesh(row([east, west])).faceCount).toBe(22);
    const lone = 'minecraft:glass_pane[east=false,north=false,south=false,waterlogged=false,west=false]';
    expect(buildVoxelMesh(row([lone, lone], { width: 1, height: 2, length: 1 })).faceCount).toBe(10);
  });
});
