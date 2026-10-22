import { OPPOSITE, type HorizontalDirection } from '@/core/blocks/directions';
import { blockState } from '@/core/blocks/registry';
import { Priority } from '@/core/generator/geometry';
import type { RoofSectionSpec } from '@/core/generator/roof/roofEngine';
import { floorY, storeyRect, wallTopOf, type Mass } from '@/core/generator/house/plan';
import { facadeOf, facadePos, type Ctx } from '@/core/generator/house/walls';
import { rightOf } from '@/core/templates/place';

/**
 * Building parts on top of the masses: dormers and porch roofs are extra roof sections (the
 * roof engine merges them, so valleys come out right), chimneys are stone flues with a lit
 * campfire on top (nothing above it, so the smoke rises freely).
 */

export interface Dormer {
  x: number;
  /** Front plane (frame plane) z of the dormer and the y of its window row. */
  z: number;
  y: number;
  section: RoofSectionSpec;
}

/** Dormers on the front slope of a gable roof along x (1–3, evenly spaced). */
export function planDormers(ctx: Ctx, mass: Mass, section: RoofSectionSpec, count: number): Dormer[] {
  if (count <= 0 || section.ridgeAxis !== 'x' || !['gable', 'half_hip', 'gambrel', 'saltbox'].includes(section.type)) return [];
  const span = section.x1 - section.x0 + 1;
  if (span < 9) return [];
  const n = Math.min(count, Math.floor((span - 2) / 5));
  const wallTop = wallTopOf(ctx.plan, mass);
  const dormers: Dormer[] = [];
  for (let i = 0; i < n; i++) {
    const x = Math.round(section.x0 + ((i + 1) * span) / (n + 1));
    const z = section.z0;
    dormers.push({
      x,
      z,
      y: wallTop + 1,
      section: {
        ...section,
        id: `dormer${i}`,
        x0: x - 1,
        x1: x + 1,
        z0: z,
        z1: z + 2,
        wallTop: wallTop + 3,
        type: 'gable',
        ridgeAxis: 'z',
        profile: 'standard',
        overhang: 1,
        ridgeStyle: 'slab',
        gables: false,
        maxRise: 3,
      },
    });
  }
  return dormers;
}

/** Dormer walls (cheeks and front with a window); the roof comes from the roof engine. */
export function buildDormer(ctx: Ctx, d: Dormer): void {
  const { builder, blocks } = ctx;
  for (let y = d.y; y <= d.section.wallTop; y++) {
    for (let z = d.z; z <= d.z + 2; z++) {
      // Cheeks in the wall material, posts only at the front corners.
      const corner = z === d.z;
      builder.setBlock(d.x - 1, y, z, corner ? blocks.log('frame', 'y') : blocks.block('upperWall'), Priority.ANNEX);
      builder.setBlock(d.x + 1, y, z, corner ? blocks.log('frame', 'y') : blocks.block('upperWall'), Priority.ANNEX);
      builder.clear(d.x, y, z, Priority.ANNEX);
    }
  }
  // Front: a wall block as parapet, the window pane above, a beam across the top, a sill.
  builder.setBlock(d.x, d.y, d.z, blocks.block('upperWall'), Priority.OPENING);
  for (let y = d.y + 1; y < d.section.wallTop; y++) builder.setBlock(d.x, y, d.z, blocks.pane(), Priority.OPENING);
  builder.setBlock(d.x, d.section.wallTop, d.z, blocks.log('beam', 'x'), Priority.OPENING);
  if (builder.inside(d.x, d.y, d.z - 1)) builder.setBlock(d.x, d.y, d.z - 1, blocks.stairs('frame', 'south', 'top'), Priority.OPENING);
  // The back of the dormer stays open into the attic.
}

/** Porch roof over the entrance: a shallow shed roof on two posts. */
export function porchSection(ctx: Ctx, mass: Mass, doorX: number): RoofSectionSpec {
  const { plan } = ctx;
  const rect = mass.rect;
  const f = mass.frames ? 1 : 0;
  const z1 = rect.z0 - 1 - f;
  const doorTop = floorY(plan, 0) + 3;
  return {
    id: 'porch',
    x0: doorX - 2,
    x1: doorX + 2,
    z0: z1 - 2,
    z1,
    wallTop: doorTop,
    type: 'shed',
    shedHigh: 'south',
    ridgeAxis: 'x',
    profile: 'shallow',
    overhang: 0,
    materials: {
      roof: plan.input.materials.roof,
      trim: plan.input.materials.roofTrim,
      ridge: plan.input.materials.ridge,
      soffit: plan.input.materials.soffit,
      gable: plan.input.materials.upperWall,
    },
    ridgeStyle: 'none',
    soffit: false,
    maxRise: 2,
  };
}

/** Porch posts, floor and steps (after the roof). */
export function buildPorch(ctx: Ctx, section: RoofSectionSpec): void {
  const { builder, blocks, plan } = ctx;
  const yFloor = floorY(plan, 0);
  for (let x = section.x0; x <= section.x1; x++)
    for (let z = section.z0; z <= section.z1; z++) {
      builder.setBlock(x, yFloor, z, blocks.slab('floor', 'top'), Priority.STRUCTURE);
      for (let y = 1; y < yFloor; y++) builder.setBlock(x, y, z, blocks.block('plinth'), Priority.STRUCTURE);
    }
  for (const x of [section.x0, section.x1]) {
    for (let y = yFloor + 1; y <= section.wallTop; y++) builder.setBlock(x, y, section.z0, blocks.fence('frame'), Priority.STRUCTURE);
  }
  // Step down to the path in front of the porch.
  for (let x = section.x0 + 1; x <= section.x1 - 1; x++) {
    if (yFloor >= 1) builder.setBlock(x, yFloor, section.z0 - 1, blocks.stairs('plinth', 'south', 'bottom'), Priority.STRUCTURE);
  }
}

/** Chimney: exterior flue on a gable wall (or through the roof), lit campfire on top. */
export function buildChimney(ctx: Ctx, mass: Mass, ridgeY: number, side: HorizontalDirection): void {
  const { builder, blocks, plan } = ctx;
  const top = storeyRect(mass, mass.floors - 1);
  const f = facadeOf(side === 'east' || side === 'west' ? mass.rect : top, side);
  const u = Math.floor(f.length / 2) + (f.length > 7 ? 1 : 0);
  const p = facadePos(f, u, mass.frames ? 2 : 1);
  const yTop = Math.max(ridgeY + 2, wallTopOf(plan, mass) + 3);
  for (let y = 1; y < yTop; y++) builder.setBlock(p.x, y, p.z, blocks.weathered('chimney', p.x, y, p.z, { height: y - 1 }), Priority.CHIMNEY);
  // Wider base (two blocks along the wall) up to the first floor line.
  const q = facadePos(f, u + 1, mass.frames ? 2 : 1);
  for (let y = 1; y <= floorY(plan, 1) - 1; y++) builder.setBlock(q.x, y, q.z, blocks.weathered('chimney', q.x, y, q.z, { height: y - 1 }), Priority.CHIMNEY);
  // Shoulder: the stair's full side leans against the flue.
  builder.setBlock(q.x, floorY(plan, 1), q.z, blocks.stairs('chimney', OPPOSITE[rightOf(f.side)] as HorizontalDirection, 'bottom'), Priority.CHIMNEY);
  builder.setBlock(p.x, yTop, p.z, blockState('campfire', { facing: 'north', lit: 'true' }), Priority.CHIMNEY);
  for (let y = yTop + 1; y < Math.min(builder.dimensions.height, yTop + 4); y++) builder.clear(p.x, y, p.z, Priority.CHIMNEY);
}
