import { OPPOSITE, VECTOR, type HorizontalDirection } from '@/core/blocks/directions';
import { isFaceFull } from '@/core/blocks/faces';
import { AIR } from '@/core/blocks/registry';
import { Priority, type VoxelBuilder } from '@/core/generator/geometry';
import type { SeededRandom } from '@/core/generator/seededRandom';
import type { Blocks } from '@/core/generator/house/materials';
import { floorY, storeyRect, wallTopOf, type HousePlan, type Mass, type Rect } from '@/core/generator/house/plan';
import { rightOf } from '@/core/templates/place';
import type { Role } from '@/core/style/palettes';
import { getMaterial } from '@/core/style/materials';

/**
 * Walls with depth (research report, "Wände wirken durch Rahmen eine Ebene vor der
 * Füllung"): the wall/infill lies in the wall plane, posts and beams stand one block in front
 * of it (frame plane), the plinth protrudes with a stair apron, upper storeys of timber houses
 * jetty out on upside-down stair consoles, every storey has a real floor, and stairs (or a
 * ladder in small houses) connect the storeys.
 */

export interface Ctx {
  builder: VoxelBuilder;
  plan: HousePlan;
  blocks: Blocks;
  rng: SeededRandom;
}

export const SIDES: readonly HorizontalDirection[] = ['north', 'east', 'south', 'west'];

/** One facade of a storey: positions along it, seen from outside, left to right. */
export interface Facade {
  side: HorizontalDirection;
  outward: [number, number];
  right: [number, number];
  /** World x/z of u = 0 (leftmost wall-plane column) in the wall plane. */
  origin: { x: number; z: number };
  /** Number of wall-plane columns. */
  length: number;
}

export function facadeOf(rect: Rect, side: HorizontalDirection): Facade {
  const [ox, , oz] = VECTOR[side];
  const r = rightOf(side);
  const [rx, , rz] = VECTOR[r];
  const length = side === 'north' || side === 'south' ? rect.x1 - rect.x0 + 1 : rect.z1 - rect.z0 + 1;
  // Leftmost column seen from outside.
  const origin =
    side === 'north'
      ? { x: rect.x1, z: rect.z0 }
      : side === 'south'
        ? { x: rect.x0, z: rect.z1 }
        : side === 'east'
          ? { x: rect.x1, z: rect.z1 }
          : { x: rect.x0, z: rect.z0 };
  return { side, outward: [ox, oz], right: [rx, rz], origin, length };
}

/** World position of facade coordinate (u along, d outwards). */
export function facadePos(f: Facade, u: number, d: number): { x: number; z: number } {
  return { x: f.origin.x + u * f.right[0] + d * f.outward[0], z: f.origin.z + u * f.right[1] + d * f.outward[1] };
}

export { studPositions } from '@/core/generator/house/studs';
import { studPositions } from '@/core/generator/house/studs';

export interface Panel {
  /** First and last wall-plane column (u) of the panel. */
  u0: number;
  u1: number;
}

/** Panels (between posts) on a facade; posts are at u = stud − 1 (corners at −1 and length). */
export function facadePanels(f: Facade, framed: boolean): { posts: number[]; panels: Panel[] } {
  if (!framed) return { posts: [-1, f.length], panels: [{ u0: 0, u1: f.length - 1 }] };
  const posts = studPositions(f.length + 2).map((s) => s - 1);
  const panels: Panel[] = [];
  for (let i = 0; i + 1 < posts.length; i++) {
    const u0 = posts[i]! + 1;
    const u1 = posts[i + 1]! - 1;
    if (u1 >= u0) panels.push({ u0, u1 });
  }
  return { posts, panels };
}

function wallRole(mass: Mass, storey: number, plan: HousePlan): Role {
  const timberStorey = mass.timber && (plan.input.timber === 'all' || storey > 0);
  if (timberStorey) return 'infill';
  return storey === 0 ? 'wall' : 'upperWall';
}

export function isTimberStorey(ctx: Ctx, mass: Mass, storey: number): boolean {
  return mass.timber && (ctx.plan.input.timber === 'all' || storey > 0);
}

function set(ctx: Ctx, x: number, y: number, z: number, state: string, priority: number = Priority.STRUCTURE): void {
  if (ctx.builder.inside(x, y, z)) ctx.builder.setBlock(x, y, z, state, priority as never);
}

/** Plinth (rows 1..P) in the wall and frame plane, stair apron in front, foundation below. */
export function buildPlinth(ctx: Ctx, mass: Mass): void {
  const { builder, plan, blocks } = ctx;
  const P = plan.plinth;
  const r = mass.rect;
  for (let x = r.x0 - 1; x <= r.x1 + 1; x++)
    for (let z = r.z0 - 1; z <= r.z1 + 1; z++) {
      const edge = x <= r.x0 || x >= r.x1 || z <= r.z0 || z >= r.z1;
      const corner = (x <= r.x0 || x >= r.x1) && (z <= r.z0 || z >= r.z1);
      set(ctx, x, 0, z, blocks.block('plinth'));
      for (let y = 1; y <= P; y++) {
        if (!edge && y < P) set(ctx, x, y, z, blocks.block('plinth'));
        if (edge) set(ctx, x, y, z, blocks.weathered('plinth', x, y, z, { height: y - 1, corner }));
      }
      if (!edge) set(ctx, x, P, z, blocks.block('floor'));
    }
  // Apron of stairs on the ground row, full side against the plinth – only at the corners and
  // around the entrance; a skirt all round makes small houses look heavy (research 15/20).
  const doorMass = plan.masses.find((m) => m.kind === 'cross') ?? plan.masses[0]!;
  for (const side of SIDES) {
    if (mass.joins[side]) continue;
    const f = facadeOf(r, side);
    const doorU = mass === doorMass && side === plan.door.side ? f.origin.x - plan.door.x : null;
    for (let u = -2; u <= f.length + 1; u++) {
      const corner = u <= 0 || u >= f.length - 1;
      if (!corner && (doorU === null || Math.abs(u - doorU) > 2)) continue;
      const p = facadePos(f, u, 2);
      if (!builder.inside(p.x, 1, p.z) || !builder.isAir(p.x, 1, p.z)) continue;
      set(ctx, p.x, 1, p.z, blocks.stairs('plinth', OPPOSITE[side] as HorizontalDirection, 'bottom'), Priority.DECOR);
    }
  }
}

/** One storey: wall plane, frame (posts, beams, braces), floor layer, jetty consoles. */
export function buildStorey(ctx: Ctx, mass: Mass, storey: number): { panels: Map<HorizontalDirection, Panel[]> } {
  const { plan, blocks } = ctx;
  const rect = storeyRect(mass, storey);
  const y0 = floorY(plan, storey);
  const y1 = floorY(plan, storey + 1); // beam/floor layer of the next storey
  const role = wallRole(mass, storey, plan);
  const timber = isTimberStorey(ctx, mass, storey);
  const framed = mass.frames;
  const panelsBySide = new Map<HorizontalDirection, Panel[]>();

  // Floor layer of this storey (storey 0: plinth top, set by buildPlinth).
  if (storey > 0) {
    for (let x = rect.x0; x <= rect.x1; x++)
      for (let z = rect.z0; z <= rect.z1; z++) {
        const edge = x === rect.x0 || x === rect.x1 || z === rect.z0 || z === rect.z1;
        set(ctx, x, y0, z, edge ? blocks.block(role) : blocks.block('floor'));
      }
  }

  // Wall plane. Log walls are laid as courses (research 10/13: 89 % of the spruce logs in
  // vanilla taiga houses lie): logs along the facade, crossing at the corners with the axis
  // alternating per course, the end of every course sticking out one block (saddle notch).
  const logWall = !timber && isLogMaterial(blocks.materials[role]);
  for (let y = y0 + 1; y < y1; y++)
    for (let x = rect.x0; x <= rect.x1; x++)
      for (let z = rect.z0; z <= rect.z1; z++) {
        const edge = x === rect.x0 || x === rect.x1 || z === rect.z0 || z === rect.z1;
        if (!edge) continue;
        const corner = (x === rect.x0 || x === rect.x1) && (z === rect.z0 || z === rect.z1);
        if (!logWall) {
          set(ctx, x, y, z, blocks.weathered(role, x, y, z, { height: y - y0 - 1 + storey * 4, corner }));
          continue;
        }
        const axis: 'x' | 'z' = corner ? (y % 2 === 0 ? 'x' : 'z') : z === rect.z0 || z === rect.z1 ? 'x' : 'z';
        set(ctx, x, y, z, blocks.log(role, axis));
        if (!corner) continue;
        const side: HorizontalDirection = axis === 'x' ? (x === rect.x0 ? 'west' : 'east') : z === rect.z0 ? 'north' : 'south';
        if (mass.joins[side]) continue;
        const [dx, , dz] = VECTOR[side];
        set(ctx, x + dx, y, z + dz, blocks.log(role, axis));
      }

  for (const side of SIDES) {
    const f = facadeOf(rect, side);
    if (mass.joins[side]) {
      panelsBySide.set(side, []);
      continue;
    }
    // The stud grid belongs to timber-framed masses only; plank, log and stone walls get corner
    // posts and plain window axes (research 13/10: a post grid on a plank wall reads as fake
    // framing). A stone ground floor under timber storeys keeps the grid for aligned axes.
    const { posts, panels } = facadePanels(f, framed && mass.timber);
    panelsBySide.set(side, panels);
    // Log courses carry themselves: no posts or beams in front of them.
    if (!framed || logWall) continue;
    const axis: 'x' | 'z' = side === 'north' || side === 'south' ? 'x' : 'z';
    const postSet = framePosts(posts, timber);
    for (const u of postSet) {
      const p = facadePos(f, u, 1);
      for (let y = y0 + 1; y < y1; y++) set(ctx, p.x, y, p.z, blocks.log('frame', 'y'), Priority.STRUCTURE + 1);
    }
    // Beams: the floor line of this storey (above the plinth for storey 0) and the top line.
    for (let u = -1; u <= f.length; u++) {
      const p = facadePos(f, u, 1);
      const isPost = postSet.includes(u);
      if (storey > 0 || plan.plinth === 0) set(ctx, p.x, y0, p.z, isPost ? blocks.wood('beam') : blocks.log('beam', axis), Priority.STRUCTURE + 1);
      set(ctx, p.x, y1, p.z, isPost ? blocks.wood('beam') : blocks.log('beam', axis), Priority.STRUCTURE + 1);
    }
  }

  // Jetty: the floor of an upper storey sticks out; a console (Knagge) sits under every post of
  // the storey above, so the load visibly runs down the frame (research 01/02/08).
  if (storey > 0) {
    for (const side of SIDES) {
      if (!mass.jetty[side] || mass.joins[side]) continue;
      const f = facadeOf(rect, side);
      for (const u of framePosts(facadePanels(f, framed && mass.timber).posts, timber)) {
        const p = facadePos(f, u, framed ? 1 : 0);
        set(ctx, p.x, y0 - 1, p.z, blocks.stairs('beam', OPPOSITE[side] as HorizontalDirection, 'top'), Priority.STRUCTURE);
      }
    }
  }
  return { panels: panelsBySide };
}

/** Posts that are actually built: the full stud grid on timber storeys, else the corners. */
function framePosts(posts: number[], timber: boolean): number[] {
  return timber ? posts : [posts[0]!, posts.at(-1)!];
}

/**
 * Braces (Kopf-/Fußbänder) in a timber panel without an opening: stairs in the frame plane at
 * the panel corners, full side against the post; the open quarter is closed by the infill.
 */
export function addBraces(ctx: Ctx, f: Facade, panel: Panel, y0: number, y1: number): void {
  if (panel.u1 - panel.u0 + 1 < 3 || y1 - y0 < 4) return;
  const left = facadePos(f, panel.u0, 1);
  const right = facadePos(f, panel.u1, 1);
  const leftward = OPPOSITE[rightOf(f.side)] as HorizontalDirection;
  const rightward = rightOf(f.side);
  const free = (p: { x: number; z: number }, y: number) => ctx.builder.inside(p.x, y, p.z) && ctx.builder.isAir(p.x, y, p.z);
  const put = (p: { x: number; z: number }, y: number, facing: HorizontalDirection, half: 'top' | 'bottom') => {
    if (free(p, y)) set(ctx, p.x, y, p.z, ctx.blocks.stairs('frame', facing, half), Priority.STRUCTURE + 1);
  };
  put(left, y1 - 1, leftward, 'top');
  put(right, y1 - 1, rightward, 'top');
  put(left, y0 + 1, leftward, 'bottom');
  put(right, y0 + 1, rightward, 'bottom');
}

/** Top beam layer (wallTop) and the ceiling of the top storey. */
export function buildTop(ctx: Ctx, mass: Mass): void {
  const { plan, blocks } = ctx;
  const top = storeyRect(mass, mass.floors - 1);
  const y = wallTopOf(plan, mass);
  for (let x = top.x0; x <= top.x1; x++)
    for (let z = top.z0; z <= top.z1; z++) {
      const edge = x === top.x0 || x === top.x1 || z === top.z0 || z === top.z1;
      set(ctx, x, y, z, edge ? blocks.log('beam', x === top.x0 || x === top.x1 ? 'z' : 'x') : blocks.block('floor'));
    }
}

/** Openings between masses that share a wall (wing, annex, cross gable). */
export function buildPassages(ctx: Ctx, mass: Mass, other: Mass): void {
  const { plan, builder } = ctx;
  const a = mass.rect;
  const b = other.rect;
  const x0 = Math.max(a.x0, b.x0);
  const x1 = Math.min(a.x1, b.x1);
  const z0 = Math.max(a.z0, b.z0);
  const z1 = Math.min(a.z1, b.z1);
  if (x0 > x1 || z0 > z1) return;
  const floors = Math.min(mass.floors, other.floors);
  for (let k = 0; k < floors; k++) {
    const y0 = floorY(plan, k) + 1;
    const y1 = floorY(plan, k + 1) - 1;
    // Clear the shared wall except its two end columns (they carry the corners).
    const alongX = x1 - x0 >= z1 - z0;
    for (let x = alongX ? x0 + 1 : x0; x <= (alongX ? x1 - 1 : x1); x++)
      for (let z = alongX ? z0 : z0 + 1; z <= (alongX ? z1 : z1 - 1); z++)
        for (let y = y0; y <= y1; y++) if (builder.inside(x, y, z)) builder.clear(x, y, z, Priority.OPENING);
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if (k > 0 || true) set(ctx, x, floorY(plan, k), z, ctx.blocks.block('floor'), Priority.OPENING);
  }
}

/** Stairs between storeys along an inside wall (ladder if the room is too small). */
export function buildStairs(ctx: Ctx, mass: Mass, avoid: (x: number, z: number) => boolean): void {
  const { plan, blocks, builder } = ctx;
  const FH = plan.floorHeight;
  for (let k = 0; k + 1 < mass.floors; k++) {
    const rect = storeyRect(mass, k);
    const upper = storeyRect(mass, k + 1);
    const yBase = floorY(plan, k);
    const yNext = floorY(plan, k + 1);
    const inner = { x0: Math.max(rect.x0, upper.x0) + 1, x1: Math.min(rect.x1, upper.x1) - 1, z0: Math.max(rect.z0, upper.z0) + 1, z1: Math.min(rect.z1, upper.z1) - 1 };
    const lenX = inner.x1 - inner.x0 + 1;
    // Straight run along the back wall (rising towards +x), from the corner away from the door.
    if (lenX >= FH + 2) {
      const z = inner.z1;
      const x0 = k % 2 === 0 ? inner.x0 + 1 : inner.x1 - FH;
      if (Array.from({ length: FH }, (_, i) => x0 + i).every((x) => !avoid(x, z))) {
        for (let i = 0; i < FH; i++) {
          const x = k % 2 === 0 ? x0 + i : x0 + FH - 1 - i;
          const facing: HorizontalDirection = k % 2 === 0 ? 'east' : 'west';
          set(ctx, x, yBase + 1 + i, z, blocks.stairs('floor', facing, 'bottom'), Priority.OPENING);
          // Headroom: open the floor above the lower steps.
          if (i < FH - 1) for (let y = yBase + 2 + i; y <= yNext; y++) if (builder.inside(x, y, z) && y > yBase + 1 + i) builder.clear(x, y, z, Priority.OPENING);
        }
        continue;
      }
    }
    // Ladder against an inside wall where the wall behind is solid over the whole height
    // (not in front of a window); back corner first.
    const spot = ladderSpot(ctx, inner, yBase + 1, yNext, avoid);
    if (!spot) continue;
    const { x, z, facing } = spot;
    for (let y = yBase + 1; y <= yNext; y++) set(ctx, x, y, z, blocks.fixed('ladder', { facing }), Priority.OPENING);
    if (builder.inside(x, yNext + 1, z) && builder.getBlock(x, yNext + 1, z) !== AIR) builder.clear(x, yNext + 1, z, Priority.OPENING);
  }
}

function ladderSpot(ctx: Ctx, inner: Rect, y0: number, y1: number, avoid: (x: number, z: number) => boolean): { x: number; z: number; facing: HorizontalDirection } | null {
  const { builder } = ctx;
  const candidates: { x: number; z: number; facing: HorizontalDirection }[] = [];
  for (let x = inner.x1; x >= inner.x0; x--) candidates.push({ x, z: inner.z1, facing: 'north' });
  for (let z = inner.z1 - 1; z > inner.z0; z--) candidates.push({ x: inner.x1, z, facing: 'west' }, { x: inner.x0, z, facing: 'east' });
  for (const c of candidates) {
    if (avoid(c.x, c.z)) continue;
    const [dx, , dz] = VECTOR[c.facing];
    let ok = true;
    for (let y = y0; y <= y1 && ok; y++) {
      const host = builder.inside(c.x - dx, y, c.z - dz) ? builder.getBlock(c.x - dx, y, c.z - dz) : AIR;
      ok = host !== AIR && isFaceFull(host, c.facing);
    }
    if (ok) return c;
  }
  return null;
}

/** Log and stem materials (laid as courses instead of upright blocks). */
export function isLogMaterial(materialId: string): boolean {
  return getMaterial(materialId).family === 'log';
}
