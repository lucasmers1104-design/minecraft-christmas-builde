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
    expect(collectVoxelIssues({ ...model, dimensions: { width: 49, height: 1, length: 1 } }).join()).toMatch(/Limit/);
    expect(() => createVoxelModel(DEFAULT_HOUSE_SPEC, { width: 1, height: 1, length: 1 }, ['minecraft:stone'], Uint16Array.from([0]))).toThrow(
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
    // Upper bound: 6 faces per non-air block; culling must remove a substantial share.
    expect(mesh.faceCount).toBeLessThan(countMaterials(model).totalBlocks * 6 * 0.6);
    expect(mesh.opaque.positions.length).toBe(mesh.opaque.faceCount * 4 * 3);
    expect(mesh.translucent.colors.length).toBe(mesh.translucent.faceCount * 4 * 4);
  });
});
