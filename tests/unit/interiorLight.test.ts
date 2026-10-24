import { describe, expect, it } from 'vitest';
import { AIR, blockIdOf, definitionOf } from '@/core/blocks/registry';
import { emittedLight } from '@/core/blocks/validator';
import { generateBuildingWithReport } from '@/core/generator/generateBuilding';
import { floorY, storeyRect } from '@/core/generator/house/plan';
import { DEFAULT_HOUSE_SPEC, STYLE_IDS, type BuildSpec } from '@/core/schema/buildSpec';
import { blockAt, type VoxelModel } from '@/core/schema/voxelModel';

/** Block light by flood fill through air, chains and lanterns (enough for closed rooms). */
function lightMap(m: VoxelModel): Uint8Array {
  const { width: W, height: H, length: L } = m.dimensions;
  const light = new Uint8Array(W * H * L);
  const idx = (x: number, y: number, z: number) => x + W * (z + L * y);
  const passes = (s: string) => s === AIR || ['chain', 'lantern'].includes(definitionOf(s).shape);
  const queue: number[] = [];
  for (let y = 0; y < H; y++)
    for (let z = 0; z < L; z++)
      for (let x = 0; x < W; x++) {
        const e = emittedLight(blockAt(m, x, y, z));
        if (e > 0) {
          light[idx(x, y, z)] = e;
          queue.push(x, y, z);
        }
      }
  for (let q = 0; q < queue.length; q += 3) {
    const [x, y, z] = [queue[q]!, queue[q + 1]!, queue[q + 2]!];
    const v = light[idx(x, y, z)]!;
    if (v <= 1) continue;
    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      const nz = z + dz;
      if (nx < 0 || ny < 0 || nz < 0 || nx >= W || ny >= H || nz >= L) continue;
      const i = idx(nx, ny, nz);
      if (light[i]! >= v - 1 || !passes(blockAt(m, nx, ny, nz))) continue;
      light[i] = v - 1;
      queue.push(nx, ny, nz);
    }
  }
  return light;
}

describe('Innenlicht', () => {
  it.each(STYLE_IDS.flatMap((style) => (['small', 'medium', 'large'] as const).map((size) => [style, size] as const)))(
    '%s / %s: kein dunkler Boden in den Räumen, Laternen hängen an Ketten unter der Decke',
    (style, size) => {
      const spec: BuildSpec = { ...DEFAULT_HOUSE_SPEC, style, size, seed: 5, theme: 'none' };
      const r = generateBuildingWithReport(spec);
      const m = r.model;
      const light = lightMap(m);
      const { width: W, length: L } = m.dimensions;
      const plan = r.house!.plan;
      let dark = 0;
      for (const mass of plan.masses.filter((ms) => !ms.round))
        for (let k = 0; k < mass.floors; k++) {
          const rect = storeyRect(mass, k);
          const y = floorY(plan, k) + 1;
          for (let x = rect.x0 + 1; x < rect.x1; x++)
            for (let z = rect.z0 + 1; z < rect.z1; z++) {
              if (blockAt(m, x, y, z) !== AIR || blockAt(m, x, y - 1, z) === AIR) continue;
              if (light[x + W * (z + L * y)] === 0) dark++;
            }
        }
      expect(dark).toBe(0);
      expect(m.palette.some((s) => blockIdOf(s) === 'minecraft:lantern' && s.includes('hanging=true'))).toBe(true);
      expect(r.repairs).toEqual([]);
    },
  );
});
