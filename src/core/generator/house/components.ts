import { OPPOSITE, type HorizontalDirection } from '@/core/blocks/directions';
import { isFaceFull } from '@/core/blocks/faces';
import { blockState, definitionOf } from '@/core/blocks/registry';
import { Priority } from '@/core/generator/geometry';
import type { RoofSectionSpec } from '@/core/generator/roof/roofEngine';
import { floorY, nearRoundTower, occupiedByOther, storeyRect, wallTopOf, type Mass } from '@/core/generator/house/plan';
import { facadeOf, facadePos, isMasonry, type Ctx } from '@/core/generator/house/walls';
import { placeTemplate, rightOf } from '@/core/templates/place';
import { templateBounds } from '@/core/templates/catalog';
import { EMPTY_KIT_LIBRARY, kitsFor, kitTemplates } from '@/core/kits/library';
import { kitCells } from '@/core/kits/kitTemplate';

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
          edge: undefined,
          texture: undefined,
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
  // A dormer-front kit of the creative director (1 wide, fitting between the cheeks) wins.
  const f = at(d.along, 0);
  const { plan } = ctx;
  const kit = kitTemplates(ctx.kits ?? EMPTY_KIT_LIBRARY, 'dormer_front', plan.input.styleId, { storey: 'upper', minecraftVersion: plan.input.minecraftVersion }).find((t) => {
    const b = templateBounds(t);
    return t.width === 1 && b.minX >= -1 && b.maxX <= 1 && b.maxY <= d.section.wallTop - d.y - 1;
  });
  if (kit) {
    placeTemplate(builder, kit, { origin: { x: f.x, y: d.y + 1, z: f.z }, outward: d.side }, plan.input.materials, plan.input.minecraftVersion, Priority.OPENING);
    return;
  }
  // Front: a wall block as parapet, the window pane above, a beam across the top, a sill.
  builder.setBlock(f.x, d.y, f.z, blocks.block('upperWall'), Priority.OPENING);
  for (let y = d.y + 1; y < d.section.wallTop; y++) builder.setBlock(f.x, y, f.z, blocks.pane(), Priority.OPENING);
  builder.setBlock(f.x, d.section.wallTop, f.z, blocks.log('beam', beamAxis), Priority.OPENING);
  const s = at(d.along, -1);
  if (builder.inside(s.x, d.y, s.z)) builder.setBlock(s.x, d.y, s.z, blocks.stairs('frame', OPPOSITE[d.side] as HorizontalDirection, 'top'), Priority.OPENING);
  // The back of the dormer stays open into the attic.
}

/**
 * Porch roof in front of the entrance: a shallow shed roof. `canopy` spans the door (5 wide, 3
 * deep, on two posts); `veranda` runs along the whole front of the door mass on a row of posts
 * (log cabin, research 13 T09). Both are a lower roof layer, so they continue under the eave.
 */
export function porchSection(ctx: Ctx, mass: Mass, doorX: number, kind: 'canopy' | 'veranda' = 'canopy'): RoofSectionSpec {
  const { plan } = ctx;
  const rect = mass.rect;
  const f = mass.frames ? 1 : 0;
  const z1 = rect.z0 - 1 - f;
  const doorTop = floorY(plan, 0) + 3;
  const veranda = kind === 'veranda';
  return {
    id: 'porch',
    x0: veranda ? rect.x0 - f : doorX - 2,
    x1: veranda ? rect.x1 + f : doorX + 2,
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
    layer: 1,
  };
}

/**
 * Porch posts, floor and steps (after the roof). A canopy stands on two fence posts; a veranda
 * on log posts every three to four blocks with a fence railing between them, open at the steps.
 */
export function buildPorch(ctx: Ctx, section: RoofSectionSpec, doorX: number = Math.round((section.x0 + section.x1) / 2)): void {
  const { builder, blocks, plan } = ctx;
  const yFloor = floorY(plan, 0);
  const veranda = section.x1 - section.x0 + 1 > 5;
  for (let x = section.x0; x <= section.x1; x++)
    for (let z = section.z0; z <= section.z1; z++) {
      builder.setBlock(x, yFloor, z, blocks.slab('floor', 'top'), Priority.STRUCTURE);
      for (let y = 1; y < yFloor; y++) builder.setBlock(x, y, z, blocks.block('plinth'), Priority.STRUCTURE);
    }
  const stepX0 = veranda ? doorX - 1 : section.x0 + 1;
  const stepX1 = veranda ? doorX + 1 : section.x1 - 1;
  if (!veranda) {
    for (const x of [section.x0, section.x1]) for (let y = yFloor + 1; y <= section.wallTop; y++) builder.setBlock(x, y, section.z0, blocks.fence('frame'), Priority.STRUCTURE);
  } else {
    // Posts at both ends and evenly every 3–4 blocks, never in front of the steps.
    const span = section.x1 - section.x0;
    const n = Math.max(1, Math.round(span / 4));
    const posts = new Set<number>();
    for (let i = 0; i <= n; i++) posts.add(section.x0 + Math.round((i * span) / n));
    for (const x of [...posts]) if (x >= stepX0 - 1 && x <= stepX1 + 1 && x !== section.x0 && x !== section.x1) posts.delete(x);
    for (const x of posts) for (let y = yFloor + 1; y <= section.wallTop; y++) builder.setBlock(x, y, section.z0, blocks.log('frame', 'y'), Priority.STRUCTURE);
    for (let x = section.x0; x <= section.x1; x++) {
      if (posts.has(x) || (x >= stepX0 && x <= stepX1)) continue;
      builder.setBlock(x, yFloor + 1, section.z0, blocks.fence('frame'), Priority.STRUCTURE);
    }
  }
  // Steps down to the path in front of the porch: one stair per plinth row, half a block rise
  // each, filled underneath, so a high plinth is walked up instead of jumped (research 04 R1).
  for (let k = 0; k < yFloor; k++) {
    const z = section.z0 - 1 - k;
    const y = yFloor - k;
    for (let x = stepX0; x <= stepX1; x++) {
      if (!builder.inside(x, y, z)) continue;
      builder.setBlock(x, y, z, blocks.stairs('plinth', 'south', 'bottom'), Priority.STRUCTURE);
      for (let yy = 1; yy < y; yy++) builder.setBlock(x, yy, z, blocks.block('plinth'), Priority.STRUCTURE);
    }
  }
}

/**
 * Engawa (research 11 T09/T10, 20 T8): a wooden deck around the house at floor level, one block
 * wide on small houses and two otherwise, under the wide eave; posts at the deck edge carry the
 * overhang, steps lead down in front of the entrance. Parts covered by other masses and the
 * door clearance are left out.
 */
export function buildEngawa(ctx: Ctx, mass: Mass, doorX: number, reserved: ReadonlySet<string>): void {
  const { builder, blocks, plan } = ctx;
  const P = plan.plinth;
  const width = plan.input.width <= 9 ? 1 : 2;
  const f = mass.frames ? 1 : 0;
  const r = mass.rect;
  const outer = { x0: r.x0 - f - width, x1: r.x1 + f + width, z0: r.z0 - f - width, z1: r.z1 + f + width };
  const inside = (x: number, z: number) => x >= r.x0 - f && x <= r.x1 + f && z >= r.z0 - f && z <= r.z1 + f;
  const free = (x: number, y: number, z: number) => builder.inside(x, y, z) && builder.isAir(x, y, z) && !reserved.has(`${x},${y},${z}`);
  for (let x = outer.x0; x <= outer.x1; x++)
    for (let z = outer.z0; z <= outer.z1; z++) {
      if (inside(x, z) || occupiedByOther(plan, mass, x, z, 0) || !free(x, P, z)) continue;
      builder.setBlock(x, P, z, blocks.slab('floor', 'top'), Priority.STRUCTURE);
      // Posts on the outer corners and every three blocks along the edge, up to the roof.
      const edgeX = x === outer.x0 || x === outer.x1;
      const edgeZ = z === outer.z0 || z === outer.z1;
      const along = edgeZ ? x - outer.x0 : z - outer.z0;
      const corner = edgeX && edgeZ;
      if (!(corner || ((edgeX || edgeZ) && along % 3 === 0)) || (z < r.z0 && Math.abs(x - doorX) <= 2)) continue;
      let top = P + 1;
      while (top < builder.dimensions.height - 1 && free(x, top, z)) top++;
      // Only where the roof actually covers the post (never a free-standing pole).
      if (top >= builder.dimensions.height - 1 || builder.isAir(x, top, z) || top - P < 3) continue;
      for (let y = P - 1; y >= 1; y--) if (builder.isAir(x, y, z)) builder.setBlock(x, y, z, blocks.block('plinth'), Priority.STRUCTURE);
      for (let y = P + 1; y < top; y++) builder.setBlock(x, y, z, blocks.log('frame', 'y'), Priority.STRUCTURE);
    }
  // Steps in front of the entrance down to the ground.
  for (let k = 1; k <= P; k++) {
    const y = P + 1 - k;
    const z = outer.z0 - k;
    for (let x = doorX - 1; x <= doorX + 1; x++) {
      if (!builder.inside(x, y, z) || !builder.isAir(x, y, z)) continue;
      builder.setBlock(x, y, z, blocks.stairs('plinth', 'south', 'bottom'), Priority.STRUCTURE);
      for (let yy = 1; yy < y; yy++) builder.setBlock(x, yy, z, blocks.block('plinth'), Priority.STRUCTURE);
    }
  }
}

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
  chimneyHead(ctx, [{ x, z }], yTop, side);
  return { x, z };
}

/**
 * Chimney head (research 06 R20–R22, 08/13): a corbel course of upside-down stairs one row below
 * the top, then a ring around the flue at fire level, so the campfire sits sunk into a crown
 * that is wider than the shaft and is not seen from the side; the smoke rises freely above.
 */
function chimneyHead(ctx: Ctx, flue: readonly { x: number; z: number }[], yTop: number, outward: HorizontalDirection = 'north'): void {
  const { builder, blocks, plan } = ctx;
  // A chimney-head kit of the creative director (single flue): its lowest row replaces the
  // corbel row; the smoke column above stays free.
  const kit = flue.length === 1 ? kitsFor(ctx.kits ?? EMPTY_KIT_LIBRARY, 'chimney_head', plan.input.styleId, { minecraftVersion: plan.input.minecraftVersion })[0] : undefined;
  if (kit) {
    const base = { x: flue[0]!.x, y: yTop - 1, z: flue[0]!.z };
    let top = base.y;
    for (const c of kitCells(kit, outward, false, plan.input.minecraftVersion)) {
      const p = { x: base.x + c.x, y: base.y + c.y, z: base.z + c.z };
      if (builder.inside(p.x, p.y, p.z)) builder.setBlock(p.x, p.y, p.z, c.state, Priority.CHIMNEY);
      top = Math.max(top, p.y);
    }
    for (let y = top + 1; y < Math.min(builder.dimensions.height, top + 4); y++) builder.clear(base.x, y, base.z, Priority.CHIMNEY);
    return;
  }
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
 * Returns the footprint ("x,z" → top y): the openings keep away from it, so no window or
 * balcony ends up behind the stack.
 */
export function buildChimney(ctx: Ctx, mass: Mass, ridgeY: number, side: HorizontalDirection, surface?: ReadonlyMap<string, number>): Map<string, number> {
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
  const footprint = new Map<string, number>();
  for (const p of shaft) {
    for (let y = 1; y < yTop; y++) builder.setBlock(p.x, y, p.z, blocks.weathered('chimney', p.x, y, p.z, { height: y - 1 }), Priority.CHIMNEY);
    footprint.set(`${p.x},${p.z}`, yTop);
  }
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
    footprint.set(`${q.x},${q.z}`, baseTop + 1);
  }
  chimneyHead(ctx, shaft, yTop, f.side);
  return footprint;
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

/**
 * Lanterns at the eave corners (research 18, reference builds 19098029 and 19864998: light at
 * every corner frames the house at night). Each free outer corner of a roof section gets a
 * lantern on a chain under the corner piece; chains need no support, the lantern hangs at least
 * three blocks above the ground and keeps away from other lights, doors and windows.
 * Density: few = every free corner of the main body, normal = also the masses in front and the
 * tower, many = every mass (Japanese roofs: always every corner, also the pagoda rings).
 */
export function buildCornerLanterns(ctx: Ctx, sections: readonly RoofSectionSpec[], surface: ReadonlyMap<string, number>, reserved: ReadonlySet<string>, eaves: readonly { x: number; y: number; z: number; outward: HorizontalDirection }[] = []): number {
  const { builder, blocks, plan } = ctx;
  const density = plan.input.lanternDensity;
  if (density === 'none') return 0;
  const japanese = plan.input.styleId === 'japanese' || plan.input.styleId === 'cherry';
  const main = plan.masses[0]!;
  const massOf = (id: string) => plan.masses.find((m) => m.id === id.replace(/-(gable|tier\d+)$/, ''));
  const covered = (x: number, z: number, own: RoofSectionSpec) =>
    sections.some((s) => s !== own && massOf(s.id) !== massOf(own.id) && x >= s.x0 - s.overhang && x <= s.x1 + s.overhang && z >= s.z0 - s.overhang && z <= s.z1 + s.overhang);
  const lights: { x: number; y: number; z: number }[] = [];
  const nearLight = (x: number, y: number, z: number) => {
    for (const l of lights) if (Math.abs(l.x - x) + Math.abs(l.z - z) + Math.abs(l.y - y) < 4) return true;
    for (let dx = -2; dx <= 2; dx++)
      for (let dz = -2; dz <= 2; dz++)
        for (let dy = -2; dy <= 2; dy++) if (builder.inside(x + dx, y + dy, z + dz) && definitionOf(builder.getBlock(x + dx, y + dy, z + dz)).light >= 10) return true;
    return false;
  };
  let placed = 0;
  for (const s of sections) {
    const mass = massOf(s.id);
    if (!mass || mass.round || s.type === 'flat' || s.id.endsWith('-gable')) continue;
    const isMain = mass === main;
    const front = mass.kind === 'cross';
    if (!japanese && density === 'few' && !isMain) continue;
    if (!japanese && density === 'normal' && !isMain && !front && mass.kind !== 'tower') continue;
    for (const x of [s.x0 - s.overhang, s.x1 + s.overhang])
      for (const z of [s.z0 - s.overhang, s.z1 + s.overhang]) {
        // The helm of a round tower (brim up to two blocks beyond its wall) is built later, over it.
        if (covered(x, z, s) || nearRoundTower(plan, x, z, 4)) continue;
        const top = surface.get(`${x},${z}`);
        if (top === undefined) continue;
        // First free cell under the corner piece(s).
        let y = top;
        while (y > 0 && builder.inside(x, y, z) && !builder.isAir(x, y, z)) y--;
        if (y < 4 || ![y, y - 1].every((yy) => builder.inside(x, yy, z) && builder.isAir(x, yy, z) && !reserved.has(`${x},${yy},${z}`))) continue;
        if (nearLight(x, y - 1, z)) continue;
        builder.setBlock(x, y, z, blocks.fixed('iron_chain', { axis: 'y' }), Priority.DECOR);
        builder.setBlock(x, y - 1, z, blocks.fixed(plan.input.lantern, { hanging: 'true' }), Priority.DECOR);
        lights.push({ x, y: y - 1, z });
        placed++;
      }
  }
  // Many lanterns: also one in the middle of every long eave (runs of at least nine cells).
  if (density === 'many') {
    const runs = new Map<string, { x: number; y: number; z: number }[]>();
    for (const c of eaves) {
      const k = `${c.outward}|${c.y}|${c.outward === 'north' || c.outward === 'south' ? c.z : c.x}`;
      runs.set(k, [...(runs.get(k) ?? []), c]);
    }
    for (const [k, run] of runs) {
      if (run.length < 9) continue;
      const alongX = k.startsWith('north') || k.startsWith('south');
      run.sort((p, q) => (alongX ? p.x - q.x : p.z - q.z));
      const c = run[Math.floor(run.length / 2)]!;
      if (nearRoundTower(plan, c.x, c.z, 4)) continue;
      if (c.y < 4 || ![c.y, c.y - 1].every((yy) => builder.inside(c.x, yy, c.z) && builder.isAir(c.x, yy, c.z) && !reserved.has(`${c.x},${yy},${c.z}`))) continue;
      if (nearLight(c.x, c.y - 1, c.z)) continue;
      builder.setBlock(c.x, c.y, c.z, blocks.fixed('iron_chain', { axis: 'y' }), Priority.DECOR);
      builder.setBlock(c.x, c.y - 1, c.z, blocks.fixed(plan.input.lantern, { hanging: 'true' }), Priority.DECOR);
      lights.push({ x: c.x, y: c.y - 1, z: c.z });
      placed++;
    }
  }
  return placed;
}

/**
 * Drum of a stepped tower helm (towerCapSections): two rows of wall one block in from the tower
 * walls, standing on the tower's ceiling, with an open bay in the middle of every side (belfry)
 * and a lantern on a chain under the spire, so the tower is lit at night (research 18).
 */
export function buildTowerDrum(ctx: Ctx, mass: Mass): void {
  const { builder, blocks, plan } = ctx;
  if (mass.cap !== 'tiered') return;
  const r = mass.rect;
  const y0 = wallTopOf(plan, mass) + 1;
  const inner = { x0: r.x0 + 1, z0: r.z0 + 1, x1: r.x1 - 1, z1: r.z1 - 1 };
  const cx = Math.round((inner.x0 + inner.x1) / 2);
  const cz = Math.round((inner.z0 + inner.z1) / 2);
  const wall = isMasonry(plan.input.materials.wall) ? 'wall' : 'plinth';
  for (let x = inner.x0; x <= inner.x1; x++)
    for (let z = inner.z0; z <= inner.z1; z++) {
      const edgeX = x === inner.x0 || x === inner.x1;
      const edgeZ = z === inner.z0 || z === inner.z1;
      if (!edgeX && !edgeZ) continue;
      const corner = edgeX && edgeZ;
      const bay = (edgeX && z === cz) || (edgeZ && x === cx);
      for (let y = y0; y <= y0 + 1; y++) {
        if (!builder.inside(x, y, z)) continue;
        if (bay) builder.clear(x, y, z, Priority.STRUCTURE);
        else builder.setBlock(x, y, z, corner && mass.frames ? blocks.log('frame', 'y') : blocks.block(wall), Priority.STRUCTURE);
      }
    }
  if (builder.inside(cx, y0 + 1, cz) && builder.isAir(cx, y0, cz) && builder.isAir(cx, y0 + 1, cz)) {
    builder.setBlock(cx, y0 + 1, cz, blocks.fixed('iron_chain', { axis: 'y' }), Priority.DECOR);
    builder.setBlock(cx, y0, cz, blocks.fixed(plan.input.lantern, { hanging: 'true' }), Priority.DECOR);
  }
}

/**
 * Ivy (research 15 T12, 19 T12: green on the house): one or two strips climbing the outside
 * chimney (3–7 high) and up to two strips on full stretches of the ground-storey walls (2–4
 * high), always in front of a full face and two columns away from glass and doors. Only without
 * a theme, from detail level 2, never on modern and Japanese houses.
 */
export function buildVines(ctx: Ctx, masses: readonly Mass[], stack: ReadonlyMap<string, number>, chimneySide: HorizontalDirection | null, reserved: ReadonlySet<string>): number {
  const { builder, plan, rng } = ctx;
  const style = plan.input.styleId;
  if (plan.input.theme !== 'none' || plan.input.detailLevel < 2 || style === 'modern' || style === 'japanese' || style === 'cherry') return 0;
  const r = rng.fork('vines');
  const vine = (wallSide: HorizontalDirection) => blockState('vine', { [wallSide]: 'true' });
  const free = (x: number, y: number, z: number) => builder.inside(x, y, z) && builder.isAir(x, y, z) && !reserved.has(`${x},${y},${z}`);
  let placed = 0;
  // Chimney: the shaft columns (highest top) on the side facing away from the house.
  if (chimneySide && stack.size > 0) {
    const top = Math.max(...stack.values());
    const shaft = [...stack.entries()].filter(([, t]) => t === top).map(([k]) => k.split(',').map(Number) as [number, number]);
    const [ox, , oz] = [chimneySide === 'east' ? 1 : chimneySide === 'west' ? -1 : 0, 0, chimneySide === 'south' ? 1 : chimneySide === 'north' ? -1 : 0];
    const strips = r.shuffle(shaft).slice(0, r.chance(0.5) ? 2 : 1);
    for (const [x, z] of strips) {
      const len = r.int(3, 7);
      for (let y = 1; y <= len; y++) {
        const vx = x + ox;
        const vz = z + oz;
        if (!free(vx, y, vz) || !isFaceFull(builder.getBlock(x, y, z), chimneySide)) break;
        builder.setBlock(vx, y, vz, vine(OPPOSITE[chimneySide] as HorizontalDirection), Priority.DECOR);
        placed++;
      }
    }
  }
  // Walls: ground storey, full face over the strip, nothing in front, no opening nearby.
  const candidates: { f: ReturnType<typeof facadeOf>; u: number; y0: number; h: number }[] = [];
  for (const mass of masses) {
    if (mass.round || mass.kind === 'tower') continue;
    const y0 = floorY(plan, 0) + 1;
    const h = Math.min(4, floorY(plan, 1) - y0);
    for (const side of ['north', 'east', 'south', 'west'] as const) {
      if (mass.joins[side]) continue;
      const f = facadeOf(storeyRect(mass, 0), side);
      const opening = (u: number) => {
        for (let v = u - 2; v <= u + 2; v++)
          for (const d of [-1, 0, 1])
            for (let y = y0; y < y0 + plan.floorHeight; y++) {
              const p = facadePos(f, v, d);
              const s = builder.inside(p.x, y, p.z) ? builder.getBlock(p.x, y, p.z) : 'minecraft:air';
              if (s.includes('glass') || s.includes('_door') || s.includes('lantern')) return true;
            }
        return false;
      };
      for (let u = 1; u < f.length - 1; u++) {
        let ok = !opening(u);
        for (let y = y0; y < y0 + h && ok; y++) {
          const w = facadePos(f, u, 0);
          const p = facadePos(f, u, 1);
          const q = facadePos(f, u, 2);
          if (!builder.inside(p.x, y, p.z) || !isFaceFull(builder.getBlock(w.x, y, w.z), side) || !free(p.x, y, p.z) || (builder.inside(q.x, y, q.z) && !builder.isAir(q.x, y, q.z))) ok = false;
        }
        if (ok) candidates.push({ f, u, y0, h });
      }
    }
  }
  const wallStrips = r.int(0, 2);
  const chosen: typeof candidates = [];
  for (const c of r.shuffle(candidates)) {
    if (chosen.length >= wallStrips) break;
    if (chosen.some((o) => o.f.side === c.f.side && Math.abs(o.u - c.u) < 4)) continue;
    chosen.push(c);
  }
  for (const { f, u, y0, h } of chosen) {
    const len = r.int(2, h);
    for (let y = y0; y < y0 + len; y++) {
      const p = facadePos(f, u, 1);
      builder.setBlock(p.x, y, p.z, vine(OPPOSITE[f.side] as HorizontalDirection), Priority.DECOR);
      placed++;
    }
  }
  return placed;
}
