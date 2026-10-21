import { describe, expect, it } from 'vitest';
import { blockState } from '@/core/blocks/registry';
import { GeometryError, Priority, roofGable, VoxelBuilder } from '@/core/generator/geometry';
import { createSeededRandom } from '@/core/generator/seededRandom';
import { DEFAULT_HOUSE_SPEC } from '@/core/schema/buildSpec';

const stone = blockState('stone_bricks');
const wool = blockState('red_wool');

describe('VoxelBuilder', () => {
  it('prüft Grenzen und Maximalgrößen', () => {
    expect(() => new VoxelBuilder({ width: 49, height: 10, length: 10 })).toThrow(GeometryError);
    expect(() => new VoxelBuilder({ width: 10, height: 33, length: 10 })).toThrow(GeometryError);
    expect(() => new VoxelBuilder({ width: 0, height: 1, length: 1 })).toThrow(GeometryError);
    const b = new VoxelBuilder({ width: 4, height: 4, length: 4 });
    expect(() => b.setBlock(4, 0, 0, stone, Priority.STRUCTURE)).toThrow(GeometryError);
    expect(() => b.setBlock(0, -1, 0, stone, Priority.STRUCTURE)).toThrow(GeometryError);
    expect(() => b.fillBox({ x: 0, y: 0, z: 0 }, { x: 4, y: 0, z: 0 }, stone, Priority.STRUCTURE)).toThrow(GeometryError);
  });

  it('respektiert Prioritäten (Deko überschreibt keine Struktur oder Freiräume)', () => {
    const b = new VoxelBuilder({ width: 3, height: 3, length: 3 });
    b.setBlock(1, 1, 1, stone, Priority.STRUCTURE);
    expect(b.setBlock(1, 1, 1, wool, Priority.DECOR)).toBe(false);
    expect(b.getBlock(1, 1, 1)).toBe(stone);
    b.clear(0, 0, 0);
    expect(b.setBlock(0, 0, 0, stone, Priority.STRUCTURE)).toBe(false);
    expect(b.isAir(0, 0, 0)).toBe(true);
  });

  it('fillBox, hollowBox, line und placeSymmetric setzen genau die erwarteten Zellen', () => {
    const b = new VoxelBuilder({ width: 5, height: 3, length: 5 });
    b.hollowBox({ x: 0, y: 0, z: 0 }, { x: 4, y: 0, z: 4 }, stone, Priority.STRUCTURE);
    expect(b.countState(stone)).toBe(16);
    b.fillBox({ x: 1, y: 1, z: 1 }, { x: 3, y: 1, z: 3 }, wool, Priority.STRUCTURE);
    expect(b.countState(wool)).toBe(9);
    b.line({ x: 0, y: 2, z: 0 }, { x: 4, y: 2, z: 4 }, stone, Priority.STRUCTURE);
    expect(b.getBlock(2, 2, 2)).toBe(stone);
    const s = new VoxelBuilder({ width: 7, height: 1, length: 1 });
    s.placeSymmetric(1, 0, 0, 3, wool, Priority.DECOR);
    expect(s.getBlock(1, 0, 0)).toBe(wool);
    expect(s.getBlock(5, 0, 0)).toBe(wool);
  });

  it('roofGable baut ein geschlossenes, symmetrisches Satteldach', () => {
    const b = new VoxelBuilder({ width: 3, height: 10, length: 9 });
    const r = roofGable(b, { xFrom: 0, xTo: 2, zFront: 0, zBack: 8, baseY: 0, rise: 1, roof: stone });
    expect(r.ridgeZ).toBe(4);
    expect(r.ridgeY).toBe(4);
    for (let y = 0; y <= 4; y++)
      for (let z = 0; z <= 8; z++) expect(b.getBlock(1, y, z)).toBe(b.getBlock(1, y, 8 - z));
    // Every column under the ridge line has a roof block above it.
    for (let z = 0; z <= 8; z++) expect(b.firstSolidAbove(1, 0, z)).not.toBeNull();
  });

  it('toModel erzeugt ein kanonisches, valides Modell', () => {
    const b = new VoxelBuilder({ width: 2, height: 1, length: 1 });
    b.setBlock(1, 0, 0, stone, Priority.STRUCTURE);
    const m = b.toModel(DEFAULT_HOUSE_SPEC);
    expect(m.palette).toEqual(['minecraft:air', stone]);
    expect(Array.from(m.indices)).toEqual([0, 1]);
  });
});

describe('Seeded RNG', () => {
  it('ist deterministisch und seed-abhängig', () => {
    const seq = (seed: number) => Array.from({ length: 5 }, ((r) => () => r.next())(createSeededRandom(seed)));
    expect(seq(42)).toEqual(seq(42));
    expect(seq(42)).not.toEqual(seq(43));
    const r = createSeededRandom(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.int(2, 4);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(4);
    }
  });
});
