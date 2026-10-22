import { OPPOSITE, VECTOR, clockwise, type HorizontalDirection } from '@/core/blocks/directions';
import { Priority, type PriorityValue } from '@/core/generator/geometry';
import { battlementPattern, circle, cone, dome, ringFacing, type LayeredShape, type Mask2D } from '@/core/geometry';
import { floorY, wallTopOf, type HousePlan, type Mass, type RoundSpec } from '@/core/generator/house/plan';
import type { Ctx } from '@/core/generator/house/walls';
import type { Role } from '@/core/style/palettes';

/**
 * Round tower (phase 7, research notes "Kreise, Bögen, Türme"): wall ring from the geometry
 * library ("block centre inside the circle", thick outline so the ring is closed), plinth with
 * a stair apron, storey bands of upside-down stairs, real floors with a ladder, windows cut
 * into the straight runs on the axes (sill and hood in front), a corbel ring under the roof and
 * a cone with overhang (D + 2), a dome, battlements (only on diameters whose merlon pattern is
 * symmetric) or a flat parapet. Attached to a house, the ring is left out inside the house's
 * rooms so tower and house form one interior.
 */


export interface RoundTowerResult {
  sills: { x: number; y: number; z: number }[];
  /** Ring cells just outside the wall under the roof edge (for garlands). */
  eaves: { x: number; y: number; z: number; outward: HorizontalDirection }[];
  windows: number;
}

export function towerCentre(mass: Mass): { cx: number; cz: number; r: number; spec: RoundSpec } {
  const spec = mass.round!;
  const r = (spec.d - 1) / 2;
  return { cx: mass.rect.x0 + r, cz: mass.rect.z0 + r, r, spec };
}

function roofShape(spec: RoundSpec): { solid: LayeredShape; shell: LayeredShape } | null {
  const D = spec.d + 2;
  if (spec.roof === 'cone') {
    const h = Math.max(3, Math.round(D * spec.slope));
    const options = { profile: spec.coneProfile };
    return { solid: cone(D, h, 'solid', options), shell: cone(D, h, 'shell', options) };
  }
  if (spec.roof === 'dome') return { solid: dome(D, Math.ceil(D / 2), 'solid'), shell: dome(D, Math.ceil(D / 2), 'shell') };
  return null;
}

/** Highest y the tower builds (finial, lantern on a dome, merlons, parapet). */
export function roundTowerTop(plan: Pick<HousePlan, 'plinth' | 'floorHeight'>, mass: Mass): number {
  const top = wallTopOf(plan, mass);
  const shape = roofShape(mass.round!);
  if (shape) return top + shape.solid.height + 1;
  return top + (mass.round!.roof === 'battlement' ? 2 : 1);
}

/**
 * Builds the tower. `inHouse(x, y, z)` marks cells inside the rooms of an attached house: the
 * ring is left open there (one interior), everything else of the tower is built over the house.
 */
export function buildRoundTower(
  ctx: Ctx,
  mass: Mass,
  inHouse: (x: number, y: number, z: number) => boolean = () => false,
  // Attached to a house the tower replaces whatever the house put into its cylinder; alone it
  // builds at wall priority so the entrance can be cut in afterwards.
  P: PriorityValue = Priority.CLEARANCE,
): RoundTowerResult {
  const { builder, plan, blocks } = ctx;
  const { cx, cz, r, spec } = towerCentre(mass);
  const d = spec.d;
  const centre = { x: cx, z: cz };
  const wall = circle(d, 'thick');
  const disk = circle(d, 'filled');
  const outer = circle(d + 2, 'filled');
  const has = (m: Mask2D, x: number, z: number) => {
    const o = (m.width - 1) / 2;
    return m.has(x - cx + o, z - cz + o);
  };
  const plinth = plan.plinth;
  const top = wallTopOf(plan, mass);
  const levels = new Set(Array.from({ length: mass.floors + 1 }, (_, k) => floorY(plan, k)));
  // Timber styles get a stone tower (a round frame does not exist), the others their wall.
  const wallRole: Role = plan.input.timber !== 'none' ? 'plinth' : 'wall';
  const trimRole: Role = blocks.has('plinth', 'stairs') ? 'plinth' : 'roofTrim';
  const set = (x: number, y: number, z: number, state: string, priority: PriorityValue = P) => {
    if (builder.inside(x, y, z)) builder.setBlock(x, y, z, state, priority);
  };
  const free = (x: number, y: number, z: number) => builder.inside(x, y, z) && builder.isAir(x, y, z);
  const result: RoundTowerResult = { sills: [], eaves: [], windows: 0 };

  // Ladder: inside the wall on the ladder side, one cell beside the axis (the axis keeps its
  // window), on the side away from the house.
  const [lx, , lz] = VECTOR[spec.ladder];
  const tangent = clockwise(spec.ladder, 1);
  const [tx, , tz] = VECTOR[tangent];
  const houseCells = (sign: number) => {
    let n = 0;
    for (let k = 1; k <= r; k++) if (inHouse(cx + tx * sign * k - lx, plinth + 1, cz + tz * sign * k - lz)) n++;
    return n;
  };
  const sign = houseCells(1) <= houseCells(-1) ? 1 : -1;
  const ladder = { x: cx + lx * (r - 1) + tx * sign, z: cz + lz * (r - 1) + tz * sign };
  const ladderFacing = OPPOSITE[spec.ladder] as HorizontalDirection;
  const ladderTop = spec.roof === 'battlement' ? top : floorY(plan, mass.floors - 1);

  // Body: foundation, wall ring, floors, air inside.
  for (let x = cx - r - 1; x <= cx + r + 1; x++)
    for (let z = cz - r - 1; z <= cz + r + 1; z++) {
      const isWall = has(wall, x, z);
      const isIn = has(disk, x, z) && !isWall;
      if (!isWall && !isIn) continue;
      set(x, 0, z, blocks.block('plinth'));
      for (let y = 1; y <= top; y++) {
        const isLadder = x === ladder.x && z === ladder.z && y > plinth && y <= ladderTop;
        if (isLadder) set(x, y, z, blocks.fixed('ladder', { facing: ladderFacing }));
        else if (isWall && !inHouse(x, y, z)) {
          const role: Role = y <= plinth ? 'plinth' : wallRole;
          set(x, y, z, blocks.weathered(role, x, y, z, { height: y - 1 }));
        } else if (levels.has(y) || y < plinth) set(x, y, z, blocks.block(y < plinth ? 'plinth' : 'floor'));
        else builder.clear(x, y, z, P);
      }
    }

  // Apron, storey bands and corbels: stairs on the ring just outside the wall, full side
  // against it; they stay out of the house and leave room above the entrance for its portal.
  const entrance = spec.door ? { x: cx + VECTOR[spec.door][0] * (r + 1), z: cz + VECTOR[spec.door][2] * (r + 1) } : null;
  const nearEntrance = (x: number, z: number) => !!entrance && (x - entrance.x) ** 2 + (z - entrance.z) ** 2 <= 6.25;
  for (let x = cx - r - 1; x <= cx + r + 1; x++)
    for (let z = cz - r - 1; z <= cz + r + 1; z++) {
      if (!has(outer, x, z) || has(disk, x, z)) continue;
      const facing = ringFacing(x, z, centre) as HorizontalDirection;
      if (!inHouse(x, 1, z) && free(x, 1, z)) set(x, 1, z, blocks.stairs(trimRole, facing, 'bottom'), Priority.DECOR);
      for (let k = 1; k < mass.floors; k++) {
        const y = floorY(plan, k);
        if (k === 1 && nearEntrance(x, z)) continue;
        if (!inHouse(x, y, z) && free(x, y, z)) set(x, y, z, blocks.stairs(trimRole, facing, 'top'), Priority.STRUCTURE);
      }
      if (free(x, top, z)) {
        set(x, top, z, blocks.stairs(trimRole, facing, 'top'), Priority.STRUCTURE);
        result.eaves.push({ x, y: top - 1, z, outward: OPPOSITE[facing] as HorizontalDirection });
      }
    }

  // Windows on the axes that face outwards: pane in the straight run, sill below and a hood
  // above in front of the wall.
  const rows = plan.floorHeight - 1;
  const h = 2;
  const sides: HorizontalDirection[] = ['north', 'east', 'south', 'west'];
  for (let k = 0; k < mass.floors; k++) {
    const y0 = floorY(plan, k);
    const yb = rows >= 4 ? y0 + 2 : y0 + 1;
    const outside = sides.filter((s) => {
      if (k === 0 && s === spec.door) return false;
      const [vx, , vz] = VECTOR[s];
      const ax = cx + vx * r;
      const az = cz + vz * r;
      return !inHouse(ax, yb, az) && !inHouse(ax + vx, yb, az + vz) && !inHouse(ax - vx, yb, az - vz);
    });
    const density = plan.input.windows;
    const chosen = density === 'many' ? outside : outside.filter((_, i) => (density === 'few' ? i === k % outside.length : (i + k) % 2 === 0 || outside.length <= 2));
    for (const s of chosen) {
      const [vx, , vz] = VECTOR[s];
      const ax = cx + vx * r;
      const az = cz + vz * r;
      for (let y = yb; y < yb + h; y++) set(ax, y, az, blocks.pane());
      const facing = OPPOSITE[s] as HorizontalDirection;
      if (free(ax + vx, yb - 1, az + vz)) {
        set(ax + vx, yb - 1, az + vz, blocks.stairs(trimRole, facing, 'top'), Priority.OPENING);
        result.sills.push({ x: ax + vx, y: yb - 1, z: az + vz });
      }
      if (free(ax + vx, yb + h, az + vz)) set(ax + vx, yb + h, az + vz, blocks.stairs(trimRole, facing, 'top'), Priority.OPENING);
      result.windows++;
    }
  }

  // Roof.
  const shape = roofShape(spec);
  if (shape) {
    const { solid, shell } = shape;
    const o = (solid.width - 1) / 2;
    for (let i = 0; i < solid.height; i++) {
      const layer = solid.layers[i]!;
      const above = solid.layers[i + 1];
      const y = top + 1 + i;
      for (const [mx, mz] of shell.layers[i]!.cells()) {
        const x = cx - o + mx;
        const z = cz - o + mz;
        const exposed = !above?.has(mx, mz);
        let state = blocks.block('roof');
        if (exposed && above) {
          const facing = ringFacing(x, z, centre) as HorizontalDirection;
          const [fx, , fz] = VECTOR[facing];
          // The step in front of the next layer is a stair, a wider brim a bottom slab.
          state = above.has(mx + fx, mz + fz) || !layer.has(mx + fx, mz + fz) ? blocks.stairs('roof', facing, 'bottom') : blocks.slab('roof', 'bottom');
        }
        set(x, y, z, state);
      }
    }
    const tipY = top + solid.height;
    if (spec.roof === 'cone') set(cx, tipY + 1, cz, blocks.fence('frame'));
    else set(cx, tipY + 1, cz, blocks.fixed(plan.input.lantern, { hanging: 'false' }));
  } else {
    // Parapet on the wall ring; merlons of the symmetric pattern on top (battlements).
    const merlons = spec.roof === 'battlement' ? battlementPattern(d) : null;
    for (let x = cx - r; x <= cx + r; x++)
      for (let z = cz - r; z <= cz + r; z++) {
        if (!has(wall, x, z)) continue;
        set(x, top + 1, z, blocks.block(wallRole));
        if (merlons && has(merlons, x, z)) set(x, top + 2, z, blocks.block(wallRole));
      }
  }
  return result;
}
