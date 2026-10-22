import {
  clockwise,
  counterClockwise,
  HORIZONTAL,
  OPPOSITE,
  axisOf,
  oppositeHorizontal,
  VECTOR,
  type HorizontalDirection,
} from '@/core/blocks/directions';
import { faceCovers, isFaceFull } from '@/core/blocks/faces';
import { AIR, blockIdOf, definitionOf, formatBlockState, propsOf } from '@/core/blocks/registry';
import type { ShapeClass } from '@/core/blocks/shapes';
import type { Dimensions } from '@/core/schema/voxelModel';

/**
 * Central block-state resolver. Generators only express intent (stairs with facing + half,
 * fences without connections, a door's lower half); the resolver computes every property that
 * Minecraft derives from neighbours, exactly as the game would after a neighbour update:
 *
 * - stairs `shape` (vanilla StairBlock#getStairsShape),
 * - fence / pane / bars connections (vanilla FenceBlock / IronBarsBlock connection rules),
 * - wall sides none/low/tall and the post (vanilla WallBlock, block above decides "tall"),
 * - fence gate `in_wall`, door halves, leaves `distance` (+ `persistent=true`), grass `snowy`,
 *   campfire `signal_fire`, vine faces without support.
 *
 * WorldEdit runs neighbour updates after `//paste`, so storing anything else would be
 * rewritten in the world. The resolver is a fixpoint: running it twice changes nothing.
 */

export interface MutableGrid {
  readonly dimensions: Dimensions;
  get(x: number, y: number, z: number): string;
  set(x: number, y: number, z: number, state: string): void;
}

export interface Region {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

/** Palette + index grid that grows its palette on demand (used by builder, editor, tests). */
export class PaletteGrid implements MutableGrid {
  readonly dimensions: Dimensions;
  readonly palette: string[];
  readonly indices: Uint16Array;
  private readonly lookup: Map<string, number>;

  constructor(dimensions: Dimensions, palette: readonly string[], indices: Uint16Array) {
    this.dimensions = dimensions;
    this.palette = [...palette];
    this.indices = indices;
    this.lookup = new Map(this.palette.map((s, i) => [s, i]));
  }

  inside(x: number, y: number, z: number): boolean {
    const d = this.dimensions;
    return x >= 0 && y >= 0 && z >= 0 && x < d.width && y < d.height && z < d.length;
  }

  get(x: number, y: number, z: number): string {
    if (!this.inside(x, y, z)) return AIR;
    const d = this.dimensions;
    return this.palette[this.indices[x + d.width * (z + d.length * y)]!]!;
  }

  set(x: number, y: number, z: number, state: string): void {
    const d = this.dimensions;
    let index = this.lookup.get(state);
    if (index === undefined) {
      index = this.palette.length;
      this.palette.push(state);
      this.lookup.set(state, index);
    }
    this.indices[x + d.width * (z + d.length * y)] = index;
  }
}

const EXCEPTIONS_FOR_CONNECTION = new Set([
  'minecraft:barrier',
  'minecraft:carved_pumpkin',
  'minecraft:jack_o_lantern',
  'minecraft:melon',
  'minecraft:pumpkin',
]);

const LOG_SHAPES_IDS = /(_log|_wood|_stem|_hyphae|^minecraft:bamboo_block|^minecraft:stripped_bamboo_block)$/;
const SNOW_IDS = new Set(['minecraft:snow', 'minecraft:snow_block', 'minecraft:powder_snow']);

function shapeOfState(state: string): ShapeClass | null {
  if (state === AIR) return null;
  return definitionOf(state).shape;
}

/** Vanilla Block#isExceptionForConnection. */
function isExceptionForConnection(state: string): boolean {
  return shapeOfState(state) === 'leaves' || EXCEPTIONS_FOR_CONNECTION.has(blockIdOf(state));
}

function isLog(state: string): boolean {
  return state !== AIR && definitionOf(state).shape === 'pillar' && LOG_SHAPES_IDS.test(blockIdOf(state));
}

function gateConnectsTo(gate: string, dir: HorizontalDirection): boolean {
  const facing = propsOf(gate).facing as HorizontalDirection;
  return axisOf(facing) === axisOf(clockwise(dir));
}

function neighbour(grid: MutableGrid, x: number, y: number, z: number, dir: keyof typeof VECTOR): string {
  const [dx, dy, dz] = VECTOR[dir];
  return grid.get(x + dx, y + dy, z + dz);
}

// ---------------------------------------------------------------------------------------------
// Stairs

function stairsShape(grid: MutableGrid, x: number, y: number, z: number, state: string): string {
  const p = propsOf(state);
  const facing = p.facing as HorizontalDirection;
  const half = p.half;
  const isStairs = (s: string) => shapeOfState(s) === 'stairs';
  const same = (s: string) => isStairs(s) && propsOf(s).facing === facing && propsOf(s).half === half;
  const at = (dir: HorizontalDirection) => neighbour(grid, x, y, z, dir);
  const offset = (dir: HorizontalDirection) => {
    const [dx, , dz] = VECTOR[dir];
    return { x: x + dx, z: z + dz };
  };

  // Neighbour behind the high side.
  const front = at(facing);
  if (isStairs(front) && propsOf(front).half === half) {
    const other = propsOf(front).facing as HorizontalDirection;
    if (axisOf(other) !== axisOf(facing)) {
      const check = offset(oppositeHorizontal(other));
      if (!same(grid.get(check.x, y, check.z))) return other === counterClockwise(facing) ? 'outer_left' : 'outer_right';
    }
  }
  // Neighbour in front of the low side.
  const back = at(oppositeHorizontal(facing));
  if (isStairs(back) && propsOf(back).half === half) {
    const other = propsOf(back).facing as HorizontalDirection;
    if (axisOf(other) !== axisOf(facing)) {
      const check = offset(other);
      if (!same(grid.get(check.x, y, check.z))) return other === counterClockwise(facing) ? 'inner_left' : 'inner_right';
    }
  }
  return 'straight';
}

// ---------------------------------------------------------------------------------------------
// Connections

function sideSolid(neighbourState: string, dir: HorizontalDirection): boolean {
  return neighbourState !== AIR && isFaceFull(neighbourState, OPPOSITE[dir]);
}

function fenceConnects(neighbourState: string, dir: HorizontalDirection): boolean {
  const shape = shapeOfState(neighbourState);
  if (shape === 'fence') return true;
  if (shape === 'fence_gate') return gateConnectsTo(neighbourState, dir);
  return !isExceptionForConnection(neighbourState) && sideSolid(neighbourState, dir);
}

function paneConnects(neighbourState: string, dir: HorizontalDirection): boolean {
  const shape = shapeOfState(neighbourState);
  if (shape === 'pane' || shape === 'wall') return true;
  return !isExceptionForConnection(neighbourState) && sideSolid(neighbourState, dir);
}

function wallConnects(neighbourState: string, dir: HorizontalDirection): boolean {
  const shape = shapeOfState(neighbourState);
  if (shape === 'wall' || shape === 'pane') return true;
  if (shape === 'fence_gate') return gateConnectsTo(neighbourState, dir);
  return !isExceptionForConnection(neighbourState) && sideSolid(neighbourState, dir);
}

/** Vanilla WallBlock test shapes, as down-face pixel rectangles [i0, j0, i1, j1) in (x, z). */
const WALL_SIDE_TEST: Record<HorizontalDirection, [number, number, number, number]> = {
  north: [7, 0, 9, 9],
  south: [7, 7, 9, 16],
  west: [0, 7, 9, 9],
  east: [7, 7, 16, 9],
};
const WALL_POST_TEST: [number, number, number, number] = [7, 7, 9, 9];
const WALL_POST_OVERRIDE = /(_torch|_sign|_banner|_pressure_plate|^minecraft:tripwire|^minecraft:cactus_flower)$/;

function resolveWall(grid: MutableGrid, x: number, y: number, z: number, state: string): string {
  const above = grid.get(x, y + 1, z);
  const sides: Record<string, string> = {};
  for (const dir of HORIZONTAL) {
    if (!wallConnects(neighbour(grid, x, y, z, dir), dir)) sides[dir] = 'none';
    else sides[dir] = above !== AIR && faceCovers(above, 'down', WALL_SIDE_TEST[dir], 'collision') ? 'tall' : 'low';
  }
  const none = (d: HorizontalDirection) => sides[d] === 'none';
  let up: boolean;
  if (shapeOfState(above) === 'wall' && propsOf(above).up === 'true') up = true;
  else if (
    (none('north') && none('south') && none('east') && none('west')) ||
    none('north') !== none('south') ||
    none('east') !== none('west')
  ) {
    up = true;
  } else if ((sides.north === 'tall' && sides.south === 'tall') || (sides.east === 'tall' && sides.west === 'tall')) {
    up = false;
  } else {
    up = WALL_POST_OVERRIDE.test(blockIdOf(above)) || (above !== AIR && faceCovers(above, 'down', WALL_POST_TEST, 'collision'));
  }
  return formatBlockState(blockIdOf(state), { ...sides, up: String(up), waterlogged: 'false' });
}

// ---------------------------------------------------------------------------------------------
// Driver

function forEachCell(grid: MutableGrid, region: Region | undefined, topDown: boolean, fn: (x: number, y: number, z: number) => void) {
  const d = grid.dimensions;
  const min = region ? { x: Math.max(0, region.min.x), y: Math.max(0, region.min.y), z: Math.max(0, region.min.z) } : { x: 0, y: 0, z: 0 };
  const max = region
    ? { x: Math.min(d.width - 1, region.max.x), y: Math.min(d.height - 1, region.max.y), z: Math.min(d.length - 1, region.max.z) }
    : { x: d.width - 1, y: d.height - 1, z: d.length - 1 };
  if (topDown) {
    for (let y = max.y; y >= min.y; y--) for (let z = min.z; z <= max.z; z++) for (let x = min.x; x <= max.x; x++) fn(x, y, z);
  } else {
    for (let y = min.y; y <= max.y; y++) for (let z = min.z; z <= max.z; z++) for (let x = min.x; x <= max.x; x++) fn(x, y, z);
  }
}

function update(grid: MutableGrid, x: number, y: number, z: number, before: string, after: string): void {
  if (after !== before) grid.set(x, y, z, after);
}

function withChanges(state: string, changes: Record<string, string>): string {
  return formatBlockState(blockIdOf(state), { ...propsOf(state), ...changes });
}

/** Shapes the resolver has to look at; everything else is skipped quickly. */
const RELEVANT: ReadonlySet<ShapeClass> = new Set([
  'stairs',
  'fence',
  'pane',
  'wall',
  'fence_gate',
  'door',
  'leaves',
  'grass_block',
  'campfire',
  'vine',
  'slab',
  'trapdoor',
  'lantern',
  'chain',
  'candle',
  'lightning_rod',
  'grate',
]);

/**
 * Resolves all neighbour-dependent states in the grid (or only in `region`, e.g. around an
 * editor change). Mutates the grid. Pure function of the block data, deterministic.
 */
export function resolveStates(grid: MutableGrid, region?: Region): void {
  const relevant = (s: string) => {
    const shape = shapeOfState(s);
    return shape !== null && RELEVANT.has(shape);
  };

  // 1. Intent normalisation: nothing is ever waterlogged, leaves never decay.
  forEachCell(grid, region, false, (x, y, z) => {
    const s = grid.get(x, y, z);
    if (!relevant(s)) return;
    const p = propsOf(s);
    const changes: Record<string, string> = {};
    if (p.waterlogged === 'true') changes.waterlogged = 'false';
    if (shapeOfState(s) === 'leaves' && p.persistent !== 'true') changes.persistent = 'true';
    if (Object.keys(changes).length > 0) update(grid, x, y, z, s, withChanges(s, changes));
  });

  // 2. Doors: the upper half mirrors the lower half (facing, hinge, open, powered); a missing
  //    upper half is added when the cell above is free (generators place the lower half).
  forEachCell(grid, region, false, (x, y, z) => {
    const s = grid.get(x, y, z);
    if (shapeOfState(s) !== 'door' || propsOf(s).half !== 'lower') return;
    if (y + 1 >= grid.dimensions.height) return;
    const above = grid.get(x, y + 1, z);
    if (above !== AIR && blockIdOf(above) !== blockIdOf(s)) return;
    const p = propsOf(s);
    update(grid, x, y + 1, z, above, withChanges(s, { facing: p.facing!, hinge: p.hinge!, open: p.open!, powered: p.powered!, half: 'upper' }));
  });

  // 3. Stairs shapes (depend only on neighbours' facing/half, so one pass is enough).
  const stairUpdates: [number, number, number, string][] = [];
  forEachCell(grid, region, false, (x, y, z) => {
    const s = grid.get(x, y, z);
    if (shapeOfState(s) !== 'stairs') return;
    const shape = stairsShape(grid, x, y, z, s);
    if (propsOf(s).shape !== shape) stairUpdates.push([x, y, z, withChanges(s, { shape })]);
  });
  for (const [x, y, z, s] of stairUpdates) grid.set(x, y, z, s);

  // 4. Fences, panes and bars (faces of stairs are final now).
  const connectionUpdates: [number, number, number, string][] = [];
  forEachCell(grid, region, false, (x, y, z) => {
    const s = grid.get(x, y, z);
    const shape = shapeOfState(s);
    if (shape !== 'fence' && shape !== 'pane') return;
    const test = shape === 'fence' ? fenceConnects : paneConnects;
    const changes: Record<string, string> = {};
    for (const dir of HORIZONTAL) changes[dir] = String(test(neighbour(grid, x, y, z, dir), dir));
    const next = withChanges(s, changes);
    if (next !== s) connectionUpdates.push([x, y, z, next]);
  });
  for (const [x, y, z, s] of connectionUpdates) grid.set(x, y, z, s);

  // 5. Walls, top to bottom: a wall's sides depend on the (already final) block above.
  forEachCell(grid, region, true, (x, y, z) => {
    const s = grid.get(x, y, z);
    if (shapeOfState(s) !== 'wall') return;
    update(grid, x, y, z, s, resolveWall(grid, x, y, z, s));
  });

  // 6. Fence gates between walls sit lower (in_wall); campfires above hay send signal smoke;
  //    grass under snow is snowy; vines lose faces without support.
  forEachCell(grid, region, false, (x, y, z) => {
    const s = grid.get(x, y, z);
    const shape = shapeOfState(s);
    if (shape === 'fence_gate') {
      const facing = propsOf(s).facing as HorizontalDirection;
      const inWall =
        shapeOfState(neighbour(grid, x, y, z, clockwise(facing))) === 'wall' ||
        shapeOfState(neighbour(grid, x, y, z, counterClockwise(facing))) === 'wall';
      update(grid, x, y, z, s, withChanges(s, { in_wall: String(inWall) }));
    } else if (shape === 'campfire') {
      update(grid, x, y, z, s, withChanges(s, { signal_fire: String(blockIdOf(grid.get(x, y - 1, z)) === 'minecraft:hay_block') }));
    } else if (shape === 'grass_block') {
      update(grid, x, y, z, s, withChanges(s, { snowy: String(SNOW_IDS.has(blockIdOf(grid.get(x, y + 1, z)))) }));
    } else if (shape === 'vine') {
      update(grid, x, y, z, s, resolveVine(grid, x, y, z, s));
    }
  });

  // 7. Leaves distance: shortest path to a log through leaves, capped at 7 (vanilla).
  resolveLeafDistances(grid, region);
}

function resolveVine(grid: MutableGrid, x: number, y: number, z: number, state: string): string {
  const p = propsOf(state);
  const above = grid.get(x, y + 1, z);
  const changes: Record<string, string> = {};
  changes.up = String(above !== AIR && isFaceFull(above, 'down'));
  for (const dir of HORIZONTAL) {
    if (p[dir] !== 'true') continue;
    const n = neighbour(grid, x, y, z, dir);
    const supported = (n !== AIR && isFaceFull(n, OPPOSITE[dir])) || (shapeOfState(above) === 'vine' && propsOf(above)[dir] === 'true');
    changes[dir] = String(supported);
  }
  return withChanges(state, changes);
}

function grow(region: Region, by: number, d: Dimensions): Region {
  return {
    min: { x: Math.max(0, region.min.x - by), y: Math.max(0, region.min.y - by), z: Math.max(0, region.min.z - by) },
    max: { x: Math.min(d.width - 1, region.max.x + by), y: Math.min(d.height - 1, region.max.y + by), z: Math.min(d.length - 1, region.max.z + by) },
  };
}

function resolveLeafDistances(grid: MutableGrid, region: Region | undefined): void {
  // A local edit changes leaf distances up to 7 blocks away, and those depend on logs up to
  // 7 further: search a window grown by 14, write back only within 7 of the edit.
  const d = grid.dimensions;
  const all: Region = { min: { x: 0, y: 0, z: 0 }, max: { x: d.width - 1, y: d.height - 1, z: d.length - 1 } };
  const r = region ? grow(region, 14, d) : all;
  const writeBack = region ? grow(region, 7, d) : all;
  const sx = r.max.x - r.min.x + 1;
  const sy = r.max.y - r.min.y + 1;
  const sz = r.max.z - r.min.z + 1;
  const local = (x: number, y: number, z: number) => x - r.min.x + sx * (z - r.min.z + sz * (y - r.min.y));
  const dist = new Uint8Array(sx * sy * sz).fill(255);
  const queue: number[] = [];
  let hasLeaves = false;
  forEachCell(grid, r, false, (x, y, z) => {
    const s = grid.get(x, y, z);
    if (isLog(s)) {
      dist[local(x, y, z)] = 0;
      queue.push(x, y, z);
    } else if (shapeOfState(s) === 'leaves') hasLeaves = true;
  });
  if (!hasLeaves) return;
  // Leaves outside the window keep their stored distance as boundary values.
  for (let head = 0; head < queue.length; head += 3) {
    const x = queue[head]!;
    const y = queue[head + 1]!;
    const z = queue[head + 2]!;
    const next = dist[local(x, y, z)]! + 1;
    if (next > 7) continue;
    for (const [dx, dy, dz] of Object.values(VECTOR)) {
      const nx = x + dx;
      const ny = y + dy;
      const nz = z + dz;
      if (nx < r.min.x || ny < r.min.y || nz < r.min.z || nx > r.max.x || ny > r.max.y || nz > r.max.z) continue;
      const li = local(nx, ny, nz);
      if (dist[li]! <= next) continue;
      if (shapeOfState(grid.get(nx, ny, nz)) !== 'leaves') continue;
      dist[li] = next;
      queue.push(nx, ny, nz);
    }
  }
  forEachCell(grid, writeBack, false, (x, y, z) => {
    const s = grid.get(x, y, z);
    if (shapeOfState(s) !== 'leaves') return;
    const value = Math.min(7, dist[local(x, y, z)]!);
    update(grid, x, y, z, s, withChanges(s, { distance: String(value) }));
  });
}
