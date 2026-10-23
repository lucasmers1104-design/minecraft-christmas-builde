import { HORIZONTAL, OPPOSITE, VECTOR, type Direction } from '@/core/blocks/directions';
import { isFaceFull, supportsCenter } from '@/core/blocks/faces';
import {
  AIR,
  blockIdOf,
  blockState,
  definitionOf,
  isAvailableIn,
  labelFor,
  profileBlockId,
  propsOf,
  withProps,
} from '@/core/blocks/registry';
import type { MutableGrid, Region } from '@/core/blocks/stateResolver';

/**
 * Validator with deterministic repair. Runs after the resolver and checks what the game
 * would otherwise break or turn into an entity:
 *
 * - support rules (lanterns standing/hanging, candles, doors, carpets, snow, plants, rails,
 *   buttons, dirt paths under solid blocks),
 * - golem traps (carved pumpkin / jack o'lantern in line with two snow blocks, on copper or
 *   next to iron blocks),
 * - snow and ice that block light would melt,
 * - blocks that do not exist in the target Minecraft version.
 *
 * Every repair is logged. Generators are expected to produce no repairs at all (tested); the
 * log is mainly for editor input and as a safety net.
 */

export interface Repair {
  x: number;
  y: number;
  z: number;
  before: string;
  after: string;
  reason: string;
}

const DIRT_LIKE = new Set([
  'minecraft:grass_block',
  'minecraft:dirt',
  'minecraft:coarse_dirt',
  'minecraft:rooted_dirt',
  'minecraft:moss_block',
  'minecraft:podzol',
  'minecraft:mud',
  'minecraft:farmland',
]);
const SNOW_CANNOT_SURVIVE_ON = new Set(['minecraft:ice', 'minecraft:packed_ice', 'minecraft:barrier']);
const PUMPKIN_HEADS = new Set(['minecraft:carved_pumpkin', 'minecraft:jack_o_lantern']);

function at(grid: MutableGrid, x: number, y: number, z: number, dir: Direction): string {
  const [dx, dy, dz] = VECTOR[dir];
  return grid.get(x + dx, y + dy, z + dz);
}

function isCopperBody(state: string): boolean {
  if (state === AIR || !blockIdOf(state).includes('copper')) return false;
  const shape = definitionOf(state).shape;
  return shape === 'cube' || shape === 'bulb' || shape === 'grate';
}

/** Light level a block emits in its current state. */
export function emittedLight(state: string): number {
  if (state === AIR) return 0;
  const def = definitionOf(state);
  if (def.light === 0) return 0;
  const p = propsOf(state);
  if (def.shape === 'candle') return p.lit === 'true' ? 3 * Number(p.candles ?? '1') : 0;
  if (def.shape === 'campfire' || def.shape === 'bulb') return p.lit === 'true' ? def.light : 0;
  return def.light;
}

function supportProblem(grid: MutableGrid, x: number, y: number, z: number, state: string): { fix: string; reason: string } | null {
  const def = definitionOf(state);
  const p = propsOf(state);
  const below = grid.get(x, y - 1, z);
  const above = grid.get(x, y + 1, z);
  switch (def.shape) {
    case 'lantern': {
      const hanging = p.hanging === 'true';
      const ok = hanging ? above !== AIR && supportsCenter(above, 'down') : below !== AIR && supportsCenter(below, 'up');
      if (ok) return null;
      const other = !hanging ? above !== AIR && supportsCenter(above, 'down') : below !== AIR && supportsCenter(below, 'up');
      if (other) return { fix: withProps(state, { hanging: String(!hanging) }), reason: `${def.label} umgehängt (Stütze auf der anderen Seite)` };
      return { fix: AIR, reason: `${def.label} ohne Halt entfernt` };
    }
    case 'candle':
      return below !== AIR && supportsCenter(below, 'up') ? null : { fix: AIR, reason: `${def.label} ohne tragende Fläche entfernt` };
    case 'door': {
      if (p.half === 'lower') {
        const full = below !== AIR && isFaceFull(below, 'up');
        const pair = blockIdOf(above) === def.id && propsOf(above).half === 'upper';
        if (full && pair) return null;
        return { fix: AIR, reason: full ? `${def.label}: obere Hälfte fehlt` : `${def.label} ohne festen Block darunter entfernt` };
      }
      const pair = blockIdOf(below) === def.id && propsOf(below).half === 'lower';
      return pair ? null : { fix: AIR, reason: `${def.label}: einzelne obere Hälfte entfernt` };
    }
    case 'carpet':
      return below !== AIR ? null : { fix: AIR, reason: `${def.label} in der Luft entfernt` };
    case 'snow_layer': {
      if (blockIdOf(below) === 'minecraft:snow' && propsOf(below).layers === '8') return null;
      const ok = below !== AIR && !SNOW_CANNOT_SURVIVE_ON.has(blockIdOf(below)) && isFaceFull(below, 'up', 'collision');
      return ok ? null : { fix: AIR, reason: 'Schneeschicht ohne volle Oberseite darunter entfernt' };
    }
    case 'plant':
    case 'sapling':
    case 'petals':
      return DIRT_LIKE.has(blockIdOf(below)) ? null : { fix: AIR, reason: `${def.label} braucht Erde oder Gras darunter` };
    case 'rail':
      return below !== AIR && isFaceFull(below, 'up') ? null : { fix: AIR, reason: 'Schiene ohne festen Untergrund entfernt' };
    case 'button': {
      const facing = p.facing as (typeof HORIZONTAL)[number];
      const dir: Direction = p.face === 'floor' ? 'down' : p.face === 'ceiling' ? 'up' : OPPOSITE[facing];
      const host = at(grid, x, y, z, dir);
      return host !== AIR && isFaceFull(host, OPPOSITE[dir]) ? null : { fix: AIR, reason: `${def.label} ohne Halt entfernt` };
    }
    case 'ladder': {
      // Attached to the block behind it (opposite of facing), which needs a full face towards it.
      const facing = p.facing as (typeof HORIZONTAL)[number];
      const host = at(grid, x, y, z, OPPOSITE[facing]);
      return host !== AIR && isFaceFull(host, facing) ? null : { fix: AIR, reason: 'Leiter ohne Wand dahinter entfernt' };
    }
    case 'path':
      return above !== AIR && definitionOf(above).shape !== 'fence_gate' && isFaceFull(above, 'down', 'collision')
        ? { fix: blockState('dirt'), reason: 'Trampelpfad unter festem Block würde zu Erde – als Erde gespeichert' }
        : null;
    default:
      return null;
  }
}

// Landschaft (bq-landscape): falling blocks (vanilla FallingBlock.isFree: air or a replaceable
// block below). On the model's ground layer (y = 0) they rest on the world.
const FALLING_BLOCKS = new Set(['minecraft:gravel']);
const FALL_THROUGH = new Set(['minecraft:short_grass', 'minecraft:fern', 'minecraft:vine', 'minecraft:snow']);

function fallProblem(grid: MutableGrid, x: number, y: number, z: number, state: string): { fix: string; reason: string } | null {
  if (y === 0 || !FALLING_BLOCKS.has(blockIdOf(state))) return null;
  const below = grid.get(x, y - 1, z);
  if (below !== AIR && !FALL_THROUGH.has(blockIdOf(below))) return null;
  return { fix: AIR, reason: `${definitionOf(state).label} ohne festen Block darunter (würde fallen) entfernt` };
}

function golemProblem(grid: MutableGrid, x: number, y: number, z: number, state: string): string | null {
  if (!PUMPKIN_HEADS.has(blockIdOf(state))) return null;
  for (const dir of Object.keys(VECTOR) as Direction[]) {
    const [dx, dy, dz] = VECTOR[dir];
    const n1 = grid.get(x + dx, y + dy, z + dz);
    const n2 = grid.get(x + 2 * dx, y + 2 * dy, z + 2 * dz);
    if (blockIdOf(n1) === 'minecraft:snow_block' && blockIdOf(n2) === 'minecraft:snow_block') return 'Schneegolem-Muster';
    if (isCopperBody(n1)) return 'Kupfergolem-Muster';
    if (blockIdOf(n1) === 'minecraft:iron_block') return 'Eisengolem-Gefahr';
  }
  return null;
}

/** Cells within taxicab distance r of (x, y, z). */
function* around(x: number, y: number, z: number, r: number): Generator<[number, number, number]> {
  for (let dy = -r; dy <= r; dy++)
    for (let dz = -r + Math.abs(dy); dz <= r - Math.abs(dy); dz++) {
      const rest = r - Math.abs(dy) - Math.abs(dz);
      for (let dx = -rest; dx <= rest; dx++) yield [x + dx, y + dy, z + dz];
    }
}

/**
 * Highest block light any source within taxicab `reach` gives at (x, y, z) (light − Manhattan
 * distance). Reach 3 covers everything ≥ 12 (snow), reach 4 everything ≥ 11 (ice).
 */
export function strongLightAt(get: (x: number, y: number, z: number) => string, x: number, y: number, z: number, reach = 3): number {
  let best = 0;
  for (const [nx, ny, nz] of around(x, y, z, reach)) {
    const light = emittedLight(get(nx, ny, nz));
    if (light === 0) continue;
    best = Math.max(best, light - (Math.abs(nx - x) + Math.abs(ny - y) + Math.abs(nz - z)));
  }
  return best;
}

/** True if a snow layer can stay on `below` (full top face, not ice). */
export function snowCanRestOn(below: string): boolean {
  return below !== AIR && !SNOW_CANNOT_SURVIVE_ON.has(blockIdOf(below)) && isFaceFull(below, 'up', 'collision');
}

function meltProblem(grid: MutableGrid, x: number, y: number, z: number, state: string): { fix: string; reason: string } | null {
  const id = blockIdOf(state);
  // Snow layers melt at block light >= 12 in their own cell. Ice melts when the light in its
  // cell exceeds 11 minus its own light dampening (1), i.e. >= 11: a level-15 source melts ice
  // up to taxicab distance 4, snow only up to 3 (vanilla SnowLayerBlock / IceBlock random ticks).
  if (id !== 'minecraft:snow' && id !== 'minecraft:ice') return null;
  const get = (a: number, b: number, c: number) => grid.get(a, b, c);
  if (id === 'minecraft:snow' ? strongLightAt(get, x, y, z) < 12 : strongLightAt(get, x, y, z, 4) < 11) return null;
  return id === 'minecraft:snow'
    ? { fix: AIR, reason: 'Schneeschicht zu nah an einer Lichtquelle (würde schmelzen) entfernt' }
    : { fix: blockState('packed_ice'), reason: 'Eis neben einer Lichtquelle (würde schmelzen) durch Packeis ersetzt' };
}

/**
 * Checks and repairs the grid in place (optionally only inside `region`). Repairs are
 * applied in a fixed scan order (y, z, x), so the result is deterministic.
 */
export function validateAndRepair(grid: MutableGrid, minecraftVersion: string, region?: Region): Repair[] {
  const repairs: Repair[] = [];
  const d = grid.dimensions;
  const min = region?.min ?? { x: 0, y: 0, z: 0 };
  const max = region?.max ?? { x: d.width - 1, y: d.height - 1, z: d.length - 1 };
  const fix = (x: number, y: number, z: number, before: string, after: string, reason: string) => {
    grid.set(x, y, z, after);
    repairs.push({ x, y, z, before, after, reason });
  };
  // Several rounds: removing a block can take away the support of another (door halves,
  // lantern under a removed block). Bounded, because every repair removes or simplifies.
  for (let round = 0; round < 4; round++) {
    const before = repairs.length;
    for (let y = Math.max(0, min.y); y <= Math.min(d.height - 1, max.y); y++)
      for (let z = Math.max(0, min.z); z <= Math.min(d.length - 1, max.z); z++)
        for (let x = Math.max(0, min.x); x <= Math.min(d.width - 1, max.x); x++) {
          const state = grid.get(x, y, z);
          if (state === AIR) continue;
          const id = blockIdOf(state);
          if (!isAvailableIn(id, minecraftVersion)) {
            const renamed = profileBlockId(id, minecraftVersion);
            const after = renamed !== id && isAvailableIn(renamed, minecraftVersion) ? `${renamed}${state.slice(id.length)}` : AIR;
            fix(x, y, z, state, after, `${labelFor(state)} gibt es in Minecraft ${minecraftVersion} nicht`);
            continue;
          }
          const golem = golemProblem(grid, x, y, z, state);
          if (golem) {
            fix(x, y, z, state, blockState('pumpkin'), `${golem}: Kopf durch ungeschnitzten Kürbis ersetzt`);
            continue;
          }
          const support = supportProblem(grid, x, y, z, state) ?? meltProblem(grid, x, y, z, state) ?? fallProblem(grid, x, y, z, state);
          if (support) fix(x, y, z, state, support.fix, support.reason);
        }
    if (repairs.length === before) break;
  }
  return repairs;
}
