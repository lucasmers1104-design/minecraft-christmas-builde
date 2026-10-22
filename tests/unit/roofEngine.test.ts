import { describe, expect, it } from 'vitest';
import { AIR, blockIdOf, propsOf } from '@/core/blocks/registry';
import { VoxelBuilder } from '@/core/generator/geometry';
import { capRise, columnPieces, normalizeDeltas, profileDeltas, rawDeltas, tops } from '@/core/generator/roof/profiles';
import { buildRoofs, planRoofs, type RoofSectionSpec } from '@/core/generator/roof/roofEngine';
import { DEFAULT_HOUSE_SPEC } from '@/core/schema/buildSpec';
import { blockAt, type VoxelModel } from '@/core/schema/voxelModel';

const MATERIALS = { roof: 'spruce_planks', trim: 'dark_oak_planks', ridge: 'dark_oak_planks', soffit: 'spruce_planks', gable: 'oak_planks' };

function section(over: Partial<RoofSectionSpec>): RoofSectionSpec {
  return {
    id: 'main',
    x0: 2,
    z0: 2,
    x1: 10,
    z1: 8,
    wallTop: 4,
    type: 'gable',
    ridgeAxis: 'x',
    profile: 'standard',
    overhang: 1,
    materials: MATERIALS,
    ridgeStyle: 'slab',
    soffit: true,
    ...over,
  };
}

function build(sections: RoofSectionSpec[], size = { width: 16, height: 20, length: 16 }): { model: VoxelModel; result: ReturnType<typeof buildRoofs> } {
  const b = new VoxelBuilder(size);
  const result = buildRoofs(b, sections);
  const { model, repairs } = b.finalize(DEFAULT_HOUSE_SPEC);
  expect(repairs).toEqual([]);
  return { model, result };
}

const at = (m: VoxelModel, x: number, y: number, z: number) => blockAt(m, x, y, z);

describe('Dachprofile (Δ-Folgen)', () => {
  it('Spaltenalgorithmus wie in den Notizen: Δ=1 Stufe, Δ=2 Treppe, Δ=3 obere Stufe + Treppe, Δ=4 Block + Treppe', () => {
    expect(columnPieces(0, 1)).toEqual([{ y: 0, kind: 'slab_bottom' }]);
    expect(columnPieces(1, 2)).toEqual([{ y: 0, kind: 'slab_top' }]);
    expect(columnPieces(2, 4)).toEqual([{ y: 1, kind: 'stairs' }]);
    expect(columnPieces(3, 6)).toEqual([{ y: 2, kind: 'stairs' }, { y: 1, kind: 'slab_top' }]);
    expect(columnPieces(4, 8)).toEqual([{ y: 3, kind: 'stairs' }, { y: 2, kind: 'full' }]);
  });

  it('Profile haben die dokumentierte Form und gerade Treppen-Oberkanten', () => {
    expect(rawDeltas('flared', 5)).toEqual([1, 1, 2, 2, 2]);
    expect(rawDeltas('bell', 7)).toEqual([1, 1, 2, 2, 2, 4, 4]);
    expect(rawDeltas('convex', 6)).toEqual([4, 4, 2, 2, 1, 1]);
    for (const profile of ['standard', 'steep', 'shallow', 'flared', 'bell', 'convex', 'ogee', 'mansard'] as const) {
      for (let n = 1; n < 14; n++) {
        const d = profileDeltas(profile, n);
        expect(d).toHaveLength(n);
        const t = tops(d);
        d.forEach((delta, i) => {
          if (delta >= 2) expect(t[i]! % 2, `${profile} n=${n}`).toBe(0);
        });
        expect(t.at(-1)!, `${profile} n=${n}`).toBeLessThanOrEqual(14);
      }
    }
    expect(normalizeDeltas([1, 2, 2])).toEqual([1, 3, 2]);
    expect(capRise([4, 4, 4, 4], 10).reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(10);
  });
});

describe('Dach-Engine', () => {
  it('Satteldach 9 × 7 mit Überstand 1: Traufe neben der Wandkrone, First aus Stufe, Kontrastkante, Untersicht', () => {
    const { model } = build([section({})]);
    // Cross-section at x = 6: walls z = 2..8, overhang to z = 1 and 9, ridge at z = 5.
    expect(at(model, 6, 4, 1)).toContain('dark_oak_stairs'); // eave row (trim) beside the wall top
    expect(propsOf(at(model, 6, 4, 1))).toMatchObject({ facing: 'south', half: 'bottom' });
    expect(at(model, 6, 5, 2)).toContain('spruce_stairs');
    expect(at(model, 6, 8, 5)).toBe('minecraft:dark_oak_slab[type=bottom,waterlogged=false]'); // ridge cap
    expect(propsOf(at(model, 6, 4, 9))).toMatchObject({ facing: 'north' });
    // Cornice under the eave, full side against the wall.
    expect(at(model, 6, 3, 1)).toContain('spruce_stairs');
    expect(propsOf(at(model, 6, 3, 1))).toMatchObject({ facing: 'south', half: 'top' });
    // Verge board under the gable overhang (x = 1).
    expect(propsOf(at(model, 1, 4, 2))).toMatchObject({ half: 'top', facing: 'north' });
    expect(propsOf(at(model, 1, 5, 2))).toMatchObject({ half: 'bottom', facing: 'south' });
    // Gable triangle filled at x = 2 between wall top and roof, interior free.
    expect(at(model, 2, 6, 5)).toBe('minecraft:oak_planks');
    expect(at(model, 6, 6, 5)).toBe(AIR);
  });

  it('Walmdach: Grat-Ecken werden zu outer_*, keine Lücken in der Dachfläche', () => {
    const { model, result } = build([section({ type: 'hip', x0: 2, z0: 2, x1: 12, z1: 8 })]);
    const corner = at(model, 1, 4, 1);
    expect(propsOf(corner).shape).toMatch(/^outer_/);
    // Every column of the footprint (incl. overhang) has roof blocks.
    for (let x = 1; x <= 13; x++) for (let z = 1; z <= 9; z++) expect(result.surface.has(`${x},${z}`), `${x},${z}`).toBe(true);
  });

  it('L-Form (Kreuzgiebel): in der Kehle entstehen inner_* Treppen', () => {
    const main = section({ id: 'main', x0: 2, z0: 2, x1: 12, z1: 8 });
    const wing = section({ id: 'wing', x0: 8, z0: 6, x1: 12, z1: 14, ridgeAxis: 'z' });
    const { model } = build([main, wing], { width: 16, height: 20, length: 18 });
    let inner = 0;
    for (let x = 0; x < 16; x++)
      for (let y = 0; y < 20; y++)
        for (let z = 0; z < 18; z++) {
          const s = at(model, x, y, z);
          if (blockIdOf(s).endsWith('_stairs') && propsOf(s).half === 'bottom' && /^inner_/.test(propsOf(s).shape ?? '')) inner++;
        }
    expect(inner).toBeGreaterThanOrEqual(2);
  });

  it('Anstieg je Abschnitt ≤ 7 Blöcke, auch bei breiten Häusern; planRoofs kennt die Höhe vorab', () => {
    const wide = section({ x0: 1, z0: 1, x1: 30, z1: 21, wallTop: 4, profile: 'steep' });
    const plan = planRoofs([wide]);
    expect(plan.topY - 4).toBeLessThanOrEqual(8);
    const { result } = build([wide], { width: 34, height: 24, length: 26 });
    expect(result.topY).toBe(plan.topY);
  });

  it('geschwungenes Glockenprofil: unten flach (Stufen), oben steil (Block + Treppe)', () => {
    const { model } = build([section({ profile: 'bell', x0: 1, z0: 1, x1: 14, z1: 13, overhang: 1 })], { width: 18, height: 24, length: 18 });
    // Eave columns are slabs, the upper slope contains full blocks below stairs.
    expect(at(model, 7, 5, 0)).toContain('_slab');
    expect(propsOf(at(model, 7, 4, 0))).toMatchObject({ half: 'top' }); // cornice below the flared eave
    const slope = Array.from({ length: 6 }, (_, i) => Array.from({ length: 20 }, (_, y) => at(model, 7, y, i + 1))).flat();
    expect(slope.some((s) => s === 'minecraft:spruce_planks')).toBe(true);
  });
});
