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
  /** Slope the dormer sits on (its window looks this way). */
  side: HorizontalDirection;
  /** Position along the eave and the front plane (frame plane) across it. */
  along: number;
  front: number;
  /** y of the window row. */
  y: number;
  section: RoofSectionSpec;
}

/** World x/z of a dormer cell `t` blocks behind its front plane, at `a` along the eave. */
function dormerCell(d: Pick<Dormer, 'side' | 'front'>, a: number, t: number): { x: number; z: number } {
  switch (d.side) {
    case 'north':
      return { x: a, z: d.front + t };
    case 'south':
      return { x: a, z: d.front - t };
    case 'west':
      return { x: d.front + t, z: a };
    case 'east':
      return { x: d.front - t, z: a };
  }
}

/**
 * Dormers (1–3 per slope, evenly spaced): on the front slope of a roof whose ridge runs along x,
 * on both long slopes of a gable-fronted house (ridge along z, research 05/06: dormers belong on
 * the eave sides, not only on the street front).
 */
export function planDormers(ctx: Ctx, mass: Mass, section: RoofSectionSpec, count: number): Dormer[] {
  if (count <= 0 || !['gable', 'half_hip', 'gambrel', 'saltbox'].includes(section.type)) return [];
  const alongX = section.ridgeAxis === 'x';
  const span = alongX ? section.x1 - section.x0 + 1 : section.z1 - section.z0 + 1;
  if (span < 9) return [];
  const n = Math.min(count, Math.floor((span - 2) / 5));
  const wallTop = wallTopOf(ctx.plan, mass);
  const sides: { side: HorizontalDirection; front: number }[] = alongX
    ? [{ side: 'north', front: section.z0 }, ...(count >= 2 ? [{ side: 'south' as const, front: section.z1 }] : [])]
    : [
        { side: 'west', front: section.x0 },
        { side: 'east', front: section.x1 },
      ];
  const dormers: Dormer[] = [];
  for (const { side, front } of sides)
    for (let i = 0; i < n; i++) {
      const along = Math.round((alongX ? section.x0 : section.z0) + ((i + 1) * span) / (n + 1));
      const a = dormerCell({ side, front }, along - 1, 0);
      const b = dormerCell({ side, front }, along + 1, 2);
      dormers.push({
        side,
        along,
        front,
        y: wallTop + 1,
        section: {
          ...section,
          id: `dormer${dormers.length}`,
          x0: Math.min(a.x, b.x),
          x1: Math.max(a.x, b.x),
          z0: Math.min(a.z, b.z),
          z1: Math.max(a.z, b.z),
          wallTop: wallTop + 3,
          type: 'gable',
          ridgeAxis: alongX ? 'z' : 'x',
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
  const at = (a: number, t: number) => dormerCell(d, a, t);
  const beamAxis: 'x' | 'z' = d.side === 'north' || d.side === 'south' ? 'x' : 'z';
  for (let y = d.y; y <= d.section.wallTop; y++) {
    for (let t = 0; t <= 2; t++) {
      // Cheeks in the wall material, posts only at the front corners.
      const corner = t === 0;
      for (const a of [d.along - 1, d.along + 1]) {
        const p = at(a, t);
        builder.setBlock(p.x, y, p.z, corner ? blocks.log('frame', 'y') : blocks.block('upperWall'), Priority.ANNEX);
      }
      const c = at(d.along, t);
      builder.clear(c.x, y, c.z, Priority.ANNEX);
    }
  }
  // Front: a wall block as parapet, the window pane above, a beam across the top, a sill.
  const f = at(d.along, 0);
  builder.setBlock(f.x, d.y, f.z, blocks.block('upperWall'), Priority.OPENING);
  for (let y = d.y + 1; y < d.section.wallTop; y++) builder.setBlock(f.x, y, f.z, blocks.pane(), Priority.OPENING);
  builder.setBlock(f.x, d.section.wallTop, f.z, blocks.log('beam', beamAxis), Priority.OPENING);
  const s = at(d.along, -1);
  if (builder.inside(s.x, d.y, s.z)) builder.setBlock(s.x, d.y, s.z, blocks.stairs('frame', OPPOSITE[d.side] as HorizontalDirection, 'top'), Priority.OPENING);
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
  // Steps down to the path in front of the porch: one stair per plinth row, half a block rise
  // each, filled underneath, so a high plinth is walked up instead of jumped (research 04 R1).
  for (let k = 0; k < yFloor; k++) {
    const z = section.z0 - 1 - k;
    const y = yFloor - k;
    for (let x = section.x0 + 1; x <= section.x1 - 1; x++) {
      if (!builder.inside(x, y, z)) continue;
      builder.setBlock(x, y, z, blocks.stairs('plinth', 'south', 'bottom'), Priority.STRUCTURE);
      for (let yy = 1; yy < y; yy++) builder.setBlock(x, yy, z, blocks.block('plinth'), Priority.STRUCTURE);
    }
  }
}

/** Chimney: exterior flue on a gable wall (or through the roof), lit campfire on top. */
/**
 * Chimney through the roof slope, for roofs without a gable on that side (hip, pyramid,
 * mansard): a flue inside the house near the side wall, two blocks above the highest roof
 * surface around it, campfire on top. Returns its column.
 */
export function buildRoofChimney(ctx: Ctx, mass: Mass, surface: ReadonlyMap<string, number>, side: HorizontalDirection): { x: number; z: number } {
  const { builder, blocks } = ctx;
  const r = mass.rect;
  const x = side === 'east' ? r.x1 - 2 : r.x0 + 2;
  const z = Math.min(r.z1 - 2, Math.round((r.z0 + r.z1) / 2) + 1);
  let roofTop = 0;
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) roofTop = Math.max(roofTop, surface.get(`${x + dx},${z + dz}`) ?? 0);
  const yTop = Math.min(builder.dimensions.height - 4, roofTop + 2);
  for (let y = 1; y < yTop; y++) builder.setBlock(x, y, z, blocks.weathered('chimney', x, y, z, { height: y - 1 }), Priority.CHIMNEY);
  chimneyHead(ctx, [{ x, z }], yTop);
  return { x, z };
}

/**
 * Chimney head (research 06 R20–R22, 08/13): a corbel course of upside-down stairs one row below
 * the top, then a ring around the flue at fire level, so the campfire sits sunk into a crown
 * that is wider than the shaft and is not seen from the side; the smoke rises freely above.
 */
function chimneyHead(ctx: Ctx, flue: readonly { x: number; z: number }[], yTop: number): void {
  const { builder, blocks } = ctx;
  const inFlue = (x: number, z: number) => flue.some((c) => c.x === x && c.z === z);
  const ring = new Map<string, { x: number; z: number; toward: HorizontalDirection | null }>();
  for (const c of flue)
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        const x = c.x + dx;
        const z = c.z + dz;
        if (inFlue(x, z)) continue;
        // Edge cells lean on the flue with the stair's full side; corners stay crown-only.
        const toward: HorizontalDirection | null = dx === 0 ? (dz > 0 ? 'north' : 'south') : dz === 0 ? (dx > 0 ? 'west' : 'east') : null;
        const k = `${x},${z}`;
        if (!ring.has(k) || toward) ring.set(k, { x, z, toward: ring.get(k)?.toward ?? toward });
      }
  const crown = blocks.wallForm('chimney') ?? blocks.block('chimney');
  for (const { x, z, toward } of ring.values()) {
    if (!builder.inside(x, yTop, z)) continue;
    if (toward && blocks.has('chimney', 'stairs')) builder.setBlock(x, yTop - 1, z, blocks.stairs('chimney', toward, 'top'), Priority.CHIMNEY);
    else builder.setBlock(x, yTop - 1, z, blocks.block('chimney'), Priority.CHIMNEY);
    builder.setBlock(x, yTop, z, crown, Priority.CHIMNEY);
  }
  for (const { x, z } of flue) {
    builder.setBlock(x, yTop, z, blockState('campfire', { facing: 'north', lit: 'true' }), Priority.CHIMNEY);
    for (let y = yTop + 1; y < Math.min(builder.dimensions.height, yTop + 4); y++) builder.clear(x, y, z, Priority.CHIMNEY);
  }
}

/**
 * Exterior chimney on a gable wall: a two-wide shaft on larger houses, a stepped three-wide
 * base up to the first floor line with stair shoulders, and a corbelled head with the fire
 * sunk into the crown. Rustic cottages keep the classic centred stack; the other styles move
 * it off the gable axis so the centre stays free for gable windows and ornament (research 20).
 */
export function buildChimney(ctx: Ctx, mass: Mass, ridgeY: number, side: HorizontalDirection, surface?: ReadonlyMap<string, number>): void {
  const { builder, blocks, plan } = ctx;
  const top = storeyRect(mass, mass.floors - 1);
  const f = facadeOf(side === 'east' || side === 'west' ? mass.rect : top, side);
  const d = mass.frames ? 2 : 1;
  const wide = f.length >= 9;
  const centre = Math.floor(f.length / 2) - (wide ? 1 : 0);
  const offset = plan.input.styleId !== 'rustic' && f.length >= 9 ? 2 : 0;
  const u = centre + offset;
  const shaft = (wide ? [u, u + 1] : [u]).map((uu) => facadePos(f, uu, d));
  // Height: two above the roof right next to the stack, never below the ridge when centred.
  let local = ridgeY;
  if (surface && offset > 0) local = Math.max(...shaft.map((p) => surface.get(`${p.x},${p.z}`) ?? ridgeY));
  const yTop = Math.min(builder.dimensions.height - 4, Math.max(offset > 0 ? Math.max(local + 2, ridgeY) : ridgeY + 2, wallTopOf(plan, mass) + 3));
  for (const p of shaft) for (let y = 1; y < yTop; y++) builder.setBlock(p.x, y, p.z, blocks.weathered('chimney', p.x, y, p.z, { height: y - 1 }), Priority.CHIMNEY);
  // Base one wider on each side up to the first floor line, closed by stair shoulders.
  const baseTop = floorY(plan, 1) - 1;
  const leftward = OPPOSITE[rightOf(f.side)] as HorizontalDirection;
  for (const [uu, toward] of [
    [u - 1, rightOf(f.side)],
    [u + shaft.length, leftward],
  ] as const) {
    const q = facadePos(f, uu, d);
    for (let y = 1; y <= baseTop; y++) builder.setBlock(q.x, y, q.z, blocks.weathered('chimney', q.x, y, q.z, { height: y - 1 }), Priority.CHIMNEY);
    builder.setBlock(q.x, baseTop + 1, q.z, blocks.stairs('chimney', toward, 'bottom'), Priority.CHIMNEY);
  }
  chimneyHead(ctx, shaft, yTop);
}

/**
 * "Many lanterns": a lantern hanging under each end of the front eave (research 18: light at
 * the corners frames the house; one per corner, never in the door clearance). The eave cell is
 * the free cell right under the outermost roof row; a chain bridges to the lantern.
 */
export function buildEaveLanterns(ctx: Ctx, eaves: readonly { x: number; y: number; z: number; outward: HorizontalDirection }[], reserved: ReadonlySet<string>): void {
  const { builder, blocks, plan } = ctx;
  // Eave along the front: its two ends; gable-fronted houses: the front ends of both side eaves.
  const front = eaves.filter((c) => c.outward === 'north');
  const sides = (['west', 'east'] as const).map((o) => eaves.filter((c) => c.outward === o)).filter((run) => run.length >= 4);
  const ends =
    plan.masses[0]!.ridgeAxis === 'x' && front.length >= 4
      ? [front.reduce((a, c) => (c.x < a.x ? c : a)), front.reduce((a, c) => (c.x > a.x ? c : a))]
      : sides.map((run) => run.reduce((a, c) => (c.z < a.z ? c : a)));
  for (const c of ends) {
    const below = [c.y - 1, c.y - 2, c.y - 3];
    if (!builder.inside(c.x, c.y, c.z) || !builder.isAir(c.x, c.y, c.z) || below.some((y) => y < 1 || !builder.isAir(c.x, y, c.z))) continue;
    if ([c.y, ...below].some((y) => reserved.has(`${c.x},${y},${c.z}`))) continue;
    // A short chain under the eave (chains need no support), the lantern hanging from it.
    builder.setBlock(c.x, c.y, c.z, blocks.fixed('iron_chain', { axis: 'y' }), Priority.DECOR);
    builder.setBlock(c.x, c.y - 1, c.z, blocks.fixed(plan.input.lantern, { hanging: 'true' }), Priority.DECOR);
  }
}
