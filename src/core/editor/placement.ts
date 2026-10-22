import {
  axisOf,
  clockwise,
  counterClockwise,
  DIRECTIONS,
  isHorizontal,
  OPPOSITE,
  oppositeHorizontal,
  VECTOR,
  type Direction,
  type HorizontalDirection,
} from '@/core/blocks/directions';
import { isFaceFull, supportsCenter } from '@/core/blocks/faces';
import { AIR, blockIdOf, definitionOf, propsOf, withProps } from '@/core/blocks/registry';
import type { Dimensions } from '@/core/schema/voxelModel';

/**
 * Block placement like in the game (pure). A click in the 3D editor carries the clicked block,
 * the clicked face, the hit point and the view direction; from that the brush state is oriented
 * the way vanilla `getStateForPlacement` does it (StairBlock, SlabBlock, TrapDoorBlock, DoorBlock,
 * FenceGateBlock, RotatedPillarBlock, LanternBlock, ButtonBlock, RodBlock, CarvedPumpkinBlock,
 * BarrelBlock, CampfireBlock, …), including the "click into the same block" cases: a slab on a
 * matching slab becomes a double slab, candles, snow layers and petals stack up.
 *
 * Only orientation properties are set; everything the game derives from neighbours afterwards
 * (stairs corners, fence/pane/wall connections, the upper door half, leaf distance) is left to
 * the state resolver. Nothing is ever waterlogged.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Cell {
  x: number;
  y: number;
  z: number;
}

export interface PlacementRequest {
  /** Full block state selected in the editor. */
  brush: string;
  /** The clicked block, or null for the ground plane under the model. */
  hit: Cell | null;
  /** The cell in front of the clicked face (hit + face), or the ground cell. */
  place: Cell;
  /** Clicked face of the hit block (its outward normal); 'up' for the ground plane. */
  face: Direction;
  /** Hit point in model coordinates (block units). */
  point: Vec3;
  /** View direction of the click (x east, y up, z south); need not be normalised. */
  look: Vec3;
}

export interface PlacementWorld {
  dimensions: Dimensions;
  /** Block state of a cell inside the volume. */
  stateAt(cell: Cell): string;
}

export type PlacementResult = { ok: true; cell: Cell; state: string; merged: boolean } | { ok: false; reason: string };

/** What the per-block rules see (vanilla BlockPlaceContext). */
export interface PlacementContext {
  face: Direction;
  /** Hit point relative to the target cell's minimum corner (vanilla clickLocation − clickedPos). */
  click: Vec3;
  look: Vec3;
  /** The clicked block itself is replaced/merged (vanilla `replacingClickedOnBlock`). */
  replaceClicked: boolean;
  /** State currently in the target cell (air, or the block that is merged into). */
  existing: string;
  /** State at an offset from the target cell (air outside the volume). */
  stateAt(dx: number, dy: number, dz: number): string;
}

/** Vanilla Entity#getDirection: the horizontal direction the player looks to. */
export function horizontalLook(look: Vec3): HorizontalDirection {
  if (Math.abs(look.x) > Math.abs(look.z)) return look.x > 0 ? 'east' : 'west';
  return look.z > 0 ? 'south' : 'north';
}

/** Vanilla Direction.orderedByNearest: all six directions, closest to the view direction first. */
export function orderedByNearest(look: Vec3): Direction[] {
  const axes: { mag: number; dir: Direction }[] = [
    { mag: Math.abs(look.x), dir: look.x > 0 ? 'east' : 'west' },
    { mag: Math.abs(look.y), dir: look.y > 0 ? 'up' : 'down' },
    { mag: Math.abs(look.z), dir: look.z > 0 ? 'south' : 'north' },
  ];
  axes.sort((a, b) => b.mag - a.mag);
  const [a, b, c] = axes.map((x) => x.dir) as [Direction, Direction, Direction];
  return [a, b, c, OPPOSITE[c], OPPOSITE[b], OPPOSITE[a]];
}

/** Vanilla BlockPlaceContext#getNearestLookingDirections: the clicked block's side comes first. */
export function nearestLookingDirections(look: Vec3, face: Direction, replaceClicked: boolean): Direction[] {
  const dirs = orderedByNearest(look);
  if (replaceClicked) return dirs;
  const first = OPPOSITE[face];
  return [first, ...dirs.filter((d) => d !== first)];
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

function faceFull(state: string, dir: Direction, mode: 'support' | 'collision' = 'support'): boolean {
  return state !== AIR && safe(() => isFaceFull(state, dir, mode), false);
}

/** Vanilla BlockState#isCollisionShapeFullBlock. */
function fullBlock(state: string): boolean {
  return state !== AIR && DIRECTIONS.every((d) => faceFull(state, d, 'collision'));
}

function shapeOf(state: string) {
  return state === AIR ? null : safe(() => definitionOf(state).shape, null);
}

function stateIn(ctx: PlacementContext, dir: Direction, dy = 0): string {
  const [dx, vy, dz] = VECTOR[dir];
  return ctx.stateAt(dx, vy + dy, dz);
}

/** Vanilla DoorBlock#getHinge. */
function doorHinge(ctx: PlacementContext, facing: HorizontalDirection): 'left' | 'right' {
  const leftDir = counterClockwise(facing);
  const rightDir = clockwise(facing);
  const left = stateIn(ctx, leftDir);
  const right = stateIn(ctx, rightDir);
  const score =
    (fullBlock(left) ? -1 : 0) + (fullBlock(stateIn(ctx, leftDir, 1)) ? -1 : 0) + (fullBlock(right) ? 1 : 0) + (fullBlock(stateIn(ctx, rightDir, 1)) ? 1 : 0);
  const lowerDoor = (s: string) => shapeOf(s) === 'door' && propsOf(s).half === 'lower';
  const leftDoor = lowerDoor(left);
  const rightDoor = lowerDoor(right);
  if ((leftDoor && !rightDoor) || score > 0) return 'right';
  if ((rightDoor && !leftDoor) || score < 0) return 'left';
  const [j, , k] = VECTOR[facing];
  const d = ctx.click.x;
  const e = ctx.click.z;
  return (j >= 0 || e >= 0.5) && (j <= 0 || e <= 0.5) && (k >= 0 || d <= 0.5) && (k <= 0 || d >= 0.5) ? 'left' : 'right';
}

/** Vanilla LanternBlock: hanging when the first vertical looking direction is up; must be able to survive. */
function lanternHanging(ctx: PlacementContext): boolean {
  const supported = (hanging: boolean) =>
    hanging ? safe(() => supportsCenter(ctx.stateAt(0, 1, 0), 'down'), false) : safe(() => supportsCenter(ctx.stateAt(0, -1, 0), 'up'), false);
  let preferred: boolean | null = null;
  for (const d of nearestLookingDirections(ctx.look, ctx.face, ctx.replaceClicked)) {
    if (d !== 'up' && d !== 'down') continue;
    const hanging = d === 'up';
    preferred ??= hanging;
    if (supported(hanging)) return hanging;
  }
  // Nothing supports it: keep the preferred variant (the editor does not refuse the click).
  return preferred ?? false;
}

/** Vanilla FaceAttachedHorizontalDirectionalBlock (buttons): attach to the clicked face. */
function buttonAttachment(ctx: PlacementContext, horizontal: HorizontalDirection): Record<string, string> {
  let first: Record<string, string> | null = null;
  for (const d of nearestLookingDirections(ctx.look, ctx.face, ctx.replaceClicked)) {
    const candidate = isHorizontal(d) ? { face: 'wall', facing: oppositeHorizontal(d) } : { face: d === 'up' ? 'ceiling' : 'floor', facing: horizontal };
    first ??= candidate;
    if (faceFull(stateIn(ctx, d), OPPOSITE[d])) return candidate;
  }
  return first ?? {};
}

/** Vanilla VineBlock: the first looking direction (except down) with something to cling to. */
function vineFaces(ctx: PlacementContext): Record<string, string> | null {
  const faces: Record<string, string> = { north: 'false', east: 'false', south: 'false', west: 'false', up: 'false' };
  for (const d of nearestLookingDirections(ctx.look, ctx.face, ctx.replaceClicked)) {
    if (d === 'down') continue;
    const n = stateIn(ctx, d);
    if (faceFull(n, OPPOSITE[d]) || faceFull(n, OPPOSITE[d], 'collision')) return { ...faces, [d]: 'true' };
  }
  const toward = OPPOSITE[ctx.face];
  return toward === 'down' ? null : { ...faces, [toward]: 'true' };
}

/**
 * The state the game would place for this brush and click. Properties the block does not have
 * are never touched.
 */
export function placementState(brush: string, ctx: PlacementContext): string {
  if (brush === AIR) return AIR;
  const def = definitionOf(brush);
  const p = propsOf(brush);
  const horizontal = horizontalLook(ctx.look);
  const merging = ctx.existing !== AIR && blockIdOf(ctx.existing) === def.id;
  const existing = merging ? propsOf(ctx.existing) : {};
  const upper = ctx.click.y > 0.5;
  // Stairs and slabs: top half when clicking the underside or the upper half of a side face.
  const half = ctx.face === 'down' ? 'top' : ctx.face === 'up' ? 'bottom' : upper ? 'top' : 'bottom';
  const changes: Record<string, string> = {};
  if ('waterlogged' in def.properties) changes.waterlogged = 'false';

  switch (def.shape) {
    case 'stairs':
      Object.assign(changes, { facing: horizontal, half, shape: 'straight' });
      break;
    case 'slab':
      changes.type = merging ? 'double' : half;
      break;
    case 'trapdoor':
      if (!ctx.replaceClicked && isHorizontal(ctx.face)) Object.assign(changes, { facing: ctx.face, half: upper ? 'top' : 'bottom' });
      else Object.assign(changes, { facing: oppositeHorizontal(horizontal), half: ctx.face === 'up' ? 'bottom' : 'top' });
      break;
    case 'door':
      Object.assign(changes, { facing: horizontal, half: 'lower', hinge: doorHinge(ctx, horizontal) });
      break;
    case 'fence_gate':
      Object.assign(changes, { facing: horizontal, in_wall: 'false' });
      break;
    case 'pillar':
    case 'chain':
      changes.axis = axisOf(ctx.face);
      break;
    case 'facing_cube':
      changes.facing = oppositeHorizontal(horizontal);
      break;
    case 'barrel':
      changes.facing = OPPOSITE[orderedByNearest(ctx.look)[0]!];
      break;
    case 'campfire':
      changes.facing = horizontal;
      break;
    case 'petals':
      if (merging) return withProps(ctx.existing, { flower_amount: String(Math.min(4, Number(existing.flower_amount ?? '1') + 1)) });
      changes.facing = oppositeHorizontal(horizontal);
      break;
    case 'candle':
      if (merging) return withProps(ctx.existing, { candles: String(Math.min(4, Number(existing.candles ?? '1') + 1)), waterlogged: 'false' });
      break;
    case 'snow_layer':
      if (merging) return withProps(ctx.existing, { layers: String(Math.min(8, Number(existing.layers ?? '1') + 1)) });
      break;
    case 'lantern':
      changes.hanging = String(lanternHanging(ctx));
      break;
    case 'button':
      Object.assign(changes, buttonAttachment(ctx, horizontal));
      break;
    case 'end_rod': {
      const behind = stateIn(ctx, OPPOSITE[ctx.face]);
      changes.facing = shapeOf(behind) === 'end_rod' && propsOf(behind).facing === ctx.face ? OPPOSITE[ctx.face] : ctx.face;
      break;
    }
    case 'lightning_rod':
      changes.facing = ctx.face;
      break;
    case 'rail':
      // The game places straight rails along the view; curves and slopes come from neighbouring
      // rails, which the editor does not simulate – a chosen curve or slope is kept.
      if (p.shape === 'north_south' || p.shape === 'east_west') changes.shape = horizontal === 'east' || horizontal === 'west' ? 'east_west' : 'north_south';
      break;
    case 'vine':
      Object.assign(changes, vineFaces(ctx) ?? {});
      break;
    case 'leaves':
      changes.persistent = 'true';
      break;
    default:
      break;
  }
  return withProps(brush, changes);
}

/** Vanilla canBeReplaced for "the same block again": slabs, candles, snow layers, petals. */
export function canMergeInto(existing: string, brush: string, ctx: { replaceClicked: boolean; face: Direction; clickY: number }): boolean {
  if (existing === AIR || brush === AIR || blockIdOf(existing) !== blockIdOf(brush)) return false;
  const p = propsOf(existing);
  switch (shapeOf(existing)) {
    case 'slab': {
      if (p.type === 'double') return false;
      if (!ctx.replaceClicked) return true;
      const upper = ctx.clickY > 0.5;
      const side = isHorizontal(ctx.face);
      return p.type === 'bottom' ? ctx.face === 'up' || (upper && side) : ctx.face === 'down' || (!upper && side);
    }
    case 'candle':
      return Number(p.candles ?? '4') < 4;
    case 'petals':
      return Number(p.flower_amount ?? '4') < 4;
    case 'snow_layer': {
      if (Number(p.layers ?? '8') >= 8) return false;
      return ctx.replaceClicked ? ctx.face === 'up' : true;
    }
    default:
      return false;
  }
}

function inside(d: Dimensions, c: Cell): boolean {
  return c.x >= 0 && c.y >= 0 && c.z >= 0 && c.x < d.width && c.y < d.height && c.z < d.length;
}

/**
 * Decides where a click in "place" mode puts which state: into the clicked block when it can
 * take the brush (double slab, more candles …), otherwise into the free cell in front of the
 * clicked face.
 */
export function planPlacement(world: PlacementWorld, request: PlacementRequest): PlacementResult {
  const { brush, hit, face, point, look } = request;
  if (brush === AIR) return { ok: false, reason: 'Luft lässt sich nicht setzen – zum Löschen das Werkzeug „Entfernen“ verwenden.' };
  const at = (c: Cell) => (inside(world.dimensions, c) ? world.stateAt(c) : AIR);
  const context = (target: Cell, existing: string, replaceClicked: boolean): PlacementContext => ({
    face,
    look,
    replaceClicked,
    existing,
    click: { x: point.x - target.x, y: point.y - target.y, z: point.z - target.z },
    stateAt: (dx, dy, dz) => at({ x: target.x + dx, y: target.y + dy, z: target.z + dz }),
  });

  if (hit && inside(world.dimensions, hit)) {
    const hitState = at(hit);
    if (canMergeInto(hitState, brush, { replaceClicked: true, face, clickY: point.y - hit.y })) {
      return { ok: true, cell: hit, state: placementState(brush, context(hit, hitState, true)), merged: true };
    }
  }

  const target = request.place;
  if (!inside(world.dimensions, target)) return { ok: false, reason: 'Dort ist kein Platz mehr im Volumen (Grenze des Bauwerks erreicht).' };
  const existing = at(target);
  const merged = existing !== AIR && canMergeInto(existing, brush, { replaceClicked: false, face, clickY: point.y - target.y });
  if (existing !== AIR && !merged) return { ok: false, reason: 'Diese Zelle ist bereits belegt.' };
  if (!merged && shapeOf(brush) === 'door') {
    const above = { x: target.x, y: target.y + 1, z: target.z };
    if (!inside(world.dimensions, above) || at(above) !== AIR) {
      return { ok: false, reason: 'Für eine Tür müssen zwei Zellen übereinander frei sein.' };
    }
  }
  return { ok: true, cell: target, state: placementState(brush, context(target, merged ? existing : AIR, false)), merged };
}
