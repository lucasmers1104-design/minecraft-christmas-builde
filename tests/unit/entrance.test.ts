import { describe, expect, it } from 'vitest';
import { VECTOR } from '@/core/blocks/directions';
import { AIR, definitionOf, propsOf } from '@/core/blocks/registry';
import { generateBuildingWithReport } from '@/core/generator/generateBuilding';
import { DEFAULT_HOUSE_SPEC, STYLE_IDS, type BuildSpec } from '@/core/schema/buildSpec';
import { blockAt, type VoxelModel } from '@/core/schema/voxelModel';

/** Walking surface (in blocks) of the half cell nearer to (inner) or farther from the wall. */
function surface(m: VoxelModel, x: number, z: number, maxY: number, outward: readonly [number, number], inner: boolean): number {
  for (let y = maxY; y >= 0; y--) {
    const s = blockAt(m, x, y, z);
    if (s === AIR) continue;
    const def = definitionOf(s);
    const p = propsOf(s);
    if (def.shape === 'stairs' && p.half === 'bottom') {
      // The tall half lies on the facing side.
      const [fx, , fz] = VECTOR[p.facing as keyof typeof VECTOR];
      const tallTowardsWall = fx === -outward[0] && fz === -outward[1];
      return y + (tallTowardsWall === inner ? 1 : 0.5);
    }
    if (def.shape === 'slab') return y + (p.type === 'bottom' ? 0.5 : 1);
    if (['carpet', 'snow_layer', 'plant', 'lantern', 'chain', 'fence'].includes(def.shape)) continue;
    return y + 1;
  }
  return 0;
}

describe('Eingang', () => {
  it.each(STYLE_IDS.flatMap((style) => [1, 2, 3, 4].map((seed) => [style, seed] as const)))('%s seed %i: vom Gelände zur Tür ohne Sprung (jede Stufe ≤ ½ Block)', (style, seed) => {
    const spec: BuildSpec = { ...DEFAULT_HOUSE_SPEC, style, seed, size: 'medium', theme: 'none' };
    const r = generateBuildingWithReport(spec);
    const door = r.house!.openings.doors[0]!;
    const [ox, , oz] = VECTOR[door.outward];
    const out = [ox, oz] as const;
    const floor = door.y; // walking height inside the door
    let prev = surface(r.model, door.x + ox * 8, door.z + oz * 8, door.y, out, false);
    for (let d = 7; d >= 1; d--) {
      for (const inner of [false, true]) {
        const h = surface(r.model, door.x + ox * d, door.z + oz * d, door.y, out, inner);
        expect(h - prev, `d=${d} ${inner ? 'innen' : 'außen'}: ${prev} → ${h}`).toBeLessThanOrEqual(0.5);
        prev = h;
      }
    }
    // The last half step may be the threshold into the door.
    expect(floor - prev).toBeLessThanOrEqual(0.5);
    expect(floor - prev).toBeGreaterThanOrEqual(0);
  });
});
