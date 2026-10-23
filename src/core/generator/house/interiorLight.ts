import { isFaceFull } from '@/core/blocks/faces';
import { AIR, definitionOf } from '@/core/blocks/registry';
import { Priority } from '@/core/generator/geometry';
import { floorY, storeyRect, wallTopOf, type Mass } from '@/core/generator/house/plan';
import type { Ctx } from '@/core/generator/house/walls';

/**
 * Interior light (creative-director decision 2026-10: light sources inside are allowed, rooms
 * otherwise stay empty). Without it every window is black at night and the rooms spawn mobs
 * (research 18 measured 20–54 % dark spawnable floor inside). Each storey gets pendant lanterns
 * on chains hanging from the ceiling, on a grid of at most seven blocks so every window gets
 * warm light; the chain length follows the room height (c = max(0, rows − 3)). The attic under
 * a pitched roof gets a standing lantern for the gable windows. Stair and ladder columns, door
 * clearances and anything that is not air are left alone.
 */

const SPACING = 7;

function axisPositions(from: number, to: number): number[] {
  const span = to - from + 1;
  if (span <= 0) return [];
  const n = Math.max(1, Math.ceil(span / SPACING));
  return Array.from({ length: n }, (_, i) => from + Math.floor(((i + 0.5) * span) / n));
}

export function buildInteriorLight(ctx: Ctx, masses: readonly Mass[], reserved: ReadonlySet<string>): number {
  const { builder, blocks, plan } = ctx;
  const lantern = plan.input.lantern;
  let placed = 0;
  const isAir = (x: number, y: number, z: number) => builder.inside(x, y, z) && builder.getBlock(x, y, z) === AIR;
  const blocked = (x: number, y0: number, y1: number, z: number) => {
    for (let y = y0; y <= y1; y++) if (!isAir(x, y, z) || reserved.has(`${x},${y},${z}`)) return true;
    return false;
  };

  for (const mass of masses) {
    if (mass.round) continue;
    for (let k = 0; k < mass.floors; k++) {
      const r = storeyRect(mass, k);
      const y0 = floorY(plan, k);
      const ceiling = k + 1 < mass.floors ? floorY(plan, k + 1) : wallTopOf(plan, mass);
      const rows = ceiling - y0 - 1;
      const chain = Math.max(0, rows - 3);
      const lanternY = ceiling - 1 - chain;
      for (const x of axisPositions(r.x0 + 2, r.x1 - 2))
        for (const z of axisPositions(r.z0 + 2, r.z1 - 2)) {
          // Try the grid point, then its neighbours (stairs, ladders or a column in the way).
          for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]] as const) {
            const px = x + dx;
            const pz = z + dz;
            if (px <= r.x0 || px >= r.x1 || pz <= r.z0 || pz >= r.z1) continue;
            const above = builder.inside(px, ceiling, pz) ? builder.getBlock(px, ceiling, pz) : AIR;
            if (above === AIR || !isFaceFull(above, 'down')) continue;
            // Free from the floor to the ceiling, and no stairs or ladder underneath.
            if (blocked(px, y0 + 1, ceiling - 1, pz)) continue;
            const floor = builder.getBlock(px, y0, pz);
            if (floor === AIR || definitionOf(floor).shape === 'stairs') continue;
            for (let y = lanternY + 1; y < ceiling; y++) builder.setBlock(px, y, pz, blocks.fixed('iron_chain', { axis: 'y' }), Priority.DECOR);
            builder.setBlock(px, lanternY, pz, blocks.fixed(lantern, { hanging: 'true' }), Priority.DECOR);
            placed++;
            break;
          }
        }
    }
    // Attic: a standing lantern on the ceiling of the top storey, under the ridge.
    if (mass.roofType === 'flat') continue;
    const top = storeyRect(mass, mass.floors - 1);
    const y = wallTopOf(plan, mass) + 1;
    const cx = Math.round((top.x0 + top.x1) / 2);
    const cz = Math.round((top.z0 + top.z1) / 2);
    const below = builder.inside(cx, y - 1, cz) ? builder.getBlock(cx, y - 1, cz) : AIR;
    if (below !== AIR && isFaceFull(below, 'up') && isAir(cx, y, cz) && isAir(cx, y + 1, cz) && isAir(cx, y + 2, cz)) {
      builder.setBlock(cx, y, cz, blocks.fixed(lantern, { hanging: 'false' }), Priority.DECOR);
      placed++;
    }
  }
  return placed;
}
