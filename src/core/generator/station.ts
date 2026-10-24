import type { HorizontalDirection } from '@/core/blocks/directions';
import { blockState, definitionOf, isAvailableIn, profileBlockId } from '@/core/blocks/registry';
import { isFaceFull } from '@/core/blocks/faces';
import { GeometryError, Priority, VoxelBuilder, type PriorityValue } from '@/core/generator/geometry';
import { buildHouseInto, planSections, prepareHouse, shiftPlan, type HouseResult } from '@/core/generator/house/buildHouse';
import { Blocks } from '@/core/generator/house/materials';
import { floorY, roofMaterials, wallTopOf, type HouseInput, type HousePlan, type Mass } from '@/core/generator/house/plan';
import { buildRoofs, planRoofs } from '@/core/generator/roof/roofEngine';
import type { SeededRandom } from '@/core/generator/seededRandom';
import { decorateFestive } from '@/core/generator/festive';
import { requireForm } from '@/core/style/materials';
import type { StyleId } from '@/core/style/styles';
import { MAX_DIMENSIONS } from '@/core/schema/voxelModel';

/**
 * Railway station (research 17, C1–C4 and C8; 18, recommendation 13). The station building is
 * made of the house building blocks (a two-storey hall and two one-storey wings with their own
 * roofs); around it this module builds what makes it a station:
 *
 * - a house platform directly at the building (no grass between wall and platform), with an
 *   edge of upside-down stairs (shadow groove towards the track) and a safety line one block
 *   behind it,
 * - a lean-to platform roof against the building on a row of columns two blocks behind the
 *   edge, each column with a capital and two consoles, a valance at the track side (detail ≥ 2),
 *   lanterns on chains between the columns, benches against the wall,
 * - a track bed with sleepers across all three bed rows, a mixed ballast, a shoulder, and the
 *   platform edge 1.5 blocks from the rail centre,
 * - a round station clock in the hall gable with chain hands in front of the dial,
 * - lamp posts: T-shaped posts at both platform ends and a pair at the entrance.
 *
 * Front (street) is north, the track runs along x on the south side.
 */

export interface StationLayout {
  plan: HousePlan;
  trackZ: number;
  /** Platform rows (z) and extent (x), the edge row and the safety line row. */
  platform: { z0: number; z1: number; x0: number; x1: number };
  edgeZ: number;
  lineZ: number;
  railY: number;
  /** Platform roof: x extent, rows (z), column positions (x) in the column row. */
  canopy: { x0: number; x1: number; z0: number; z1: number; columnZ: number; columns: number[]; capitalY: number };
  /** Centre of the clock dial, its plane and diameter (null if nothing fitted). */
  clock: { x: number; y: number; z: number; d: number } | null;
  /** Double-sided clock hanging under the platform roof (detail ≥ 2). */
  platformClock: { x: number; y: number; z: number } | null;
  /** Lamp posts: foot cell (y = first block of the post). */
  lampPosts: { x: number; y: number; z: number; kind: 'platform' | 'portal' }[];
  /** Railway furniture by size (C7, C8): water crane and entry signals. */
  extras: { kind: 'water_crane' | 'signal' | 'goods_shed'; x: number; z: number }[];
  /** Back door from the hall onto the platform (null if the hall had no free cell). */
  backDoor: { x: number; y: number; z: number } | null;
  house: HouseResult;
}

/** Platform rows from the building face to the edge (research C2: depth 4–6 plus edge). */
export const PLATFORM_DEPTH = 6;

/** Platform parts per style (research 17, table C1; blocks are an estimate there). */
interface StationStyle {
  /** Column shaft: a log (axis y) or a wall. */
  column: string;
  capital: string;
  /** Material (catalogue id) of the consoles (upside-down stairs). */
  console: string;
  /** Material (catalogue id) of the platform roof (stairs and slabs). */
  canopy: string;
  valance: 'boards' | 'lambrequin' | 'glass' | 'none';
  valanceBlocks: readonly string[];
  /** Material (catalogue id) of the platform edge (stairs). */
  edge: string;
  /** Fence or wall for the lamp posts. */
  lampPost: string;
  clockRing: string;
  button: string;
}

const STATION_STYLES: Readonly<Record<StyleId, StationStyle>> = {
  medieval: { column: 'spruce_log', capital: 'stripped_spruce_wood', console: 'spruce_planks', canopy: 'spruce_planks', valance: 'boards', valanceBlocks: ['dark_oak_trapdoor'], edge: 'stone_bricks', lampPost: 'spruce_fence', clockRing: 'stripped_dark_oak_wood', button: 'dark_oak_button' },
  rustic: { column: 'spruce_log', capital: 'stripped_spruce_wood', console: 'spruce_planks', canopy: 'dark_oak_planks', valance: 'boards', valanceBlocks: ['spruce_trapdoor'], edge: 'stone_bricks', lampPost: 'spruce_fence', clockRing: 'stripped_dark_oak_wood', button: 'dark_oak_button' },
  nordic: { column: 'dark_oak_log', capital: 'stripped_dark_oak_wood', console: 'dark_oak_planks', canopy: 'dark_oak_planks', valance: 'lambrequin', valanceBlocks: ['dark_oak_trapdoor', 'birch_trapdoor'], edge: 'polished_andesite', lampPost: 'dark_oak_fence', clockRing: 'stripped_dark_oak_wood', button: 'birch_button' },
  fantasy: { column: 'polished_blackstone_wall', capital: 'polished_blackstone', console: 'polished_blackstone_bricks', canopy: 'deepslate_tiles', valance: 'glass', valanceBlocks: ['glass_pane'], edge: 'stone_bricks', lampPost: 'polished_blackstone_wall', clockRing: 'polished_blackstone', button: 'stone_button' },
  modern: { column: 'polished_deepslate_wall', capital: 'polished_deepslate', console: 'polished_deepslate', canopy: 'polished_deepslate', valance: 'none', valanceBlocks: [], edge: 'smooth_quartz', lampPost: 'polished_deepslate_wall', clockRing: 'polished_blackstone', button: 'stone_button' },
  mediterranean: { column: 'sandstone_wall', capital: 'cut_sandstone', console: 'sandstone', canopy: 'bricks', valance: 'none', valanceBlocks: [], edge: 'smooth_sandstone', lampPost: 'sandstone_wall', clockRing: 'stripped_dark_oak_wood', button: 'dark_oak_button' },
  japanese: { column: 'stripped_dark_oak_log', capital: 'dark_oak_planks', console: 'dark_oak_planks', canopy: 'dark_oak_planks', valance: 'none', valanceBlocks: [], edge: 'polished_andesite', lampPost: 'dark_oak_fence', clockRing: 'stripped_dark_oak_wood', button: 'dark_oak_button' },
  cherry: { column: 'stripped_cherry_log', capital: 'cherry_planks', console: 'cherry_planks', canopy: 'cherry_planks', valance: 'none', valanceBlocks: [], edge: 'polished_andesite', lampPost: 'cherry_fence', clockRing: 'stripped_dark_oak_wood', button: 'dark_oak_button' },
};

/** Round dials (research C4): R = frame, W = face; the diagonal corners stay wall. */
const DIALS: Readonly<Record<3 | 5 | 7, readonly string[]>> = {
  3: ['.R.', 'RWR', '.R.'],
  5: ['.RRR.', 'RWWWR', 'RWWWR', 'RWWWR', '.RRR.'],
  7: ['..RRR..', '.RWWWR.', 'RWWWWWR', 'RWWWWWR', 'RWWWWWR', '.RWWWR.', '..RRR..'],
};

/** Ballast mix (research C3; gravel is not in the registry, smooth stone takes its share). */
const BALLAST: readonly (readonly [string, number])[] = [
  ['andesite', 40],
  ['tuff', 25],
  ['cobblestone', 20],
  ['stone', 15],
];
const SHOULDER: readonly (readonly [string, number])[] = [
  ['coarse_dirt', 50],
  ['andesite', 30],
  ['grass_block', 20],
];

/** Hall + two wings, all facing the street. */
function stationPlan(input: HouseInput): HousePlan {
  const W = input.width;
  const D = input.depth;
  const wingW = 7;
  const wingD = Math.max(5, D - 2);
  const zw = Math.floor((D - wingD) / 2);
  const mass = (id: string, x0: number, x1: number, z0: number, z1: number, floors: number, ridgeAxis: 'x' | 'z'): Mass => ({
    id,
    kind: id === 'main' ? 'main' : 'wing',
    rect: { x0, x1, z0, z1 },
    floors,
    jetty: {},
    joins: {},
    ridgeAxis,
    // Wings: gable ends facing outwards (a hip on the near-square wing reads as a stepped pyramid).
    roofType: input.roofType === 'flat' ? 'flat' : 'gable',
    // The hall carries the style's profile; the short wings stay calm (straight, small overhang).
    profile: id === 'main' ? input.roofProfile : 'standard',
    overhang: id === 'main' ? input.overhang : Math.min(input.overhang, 1),
    ridgeStyle: 'block_slab',
    frames: input.styleId !== 'modern' && input.styleId !== 'mediterranean',
    timber: input.timber === 'all',
  });
  const main = mass('main', 0, W - 1, 0, D - 1, Math.max(2, input.floors), 'z');
  const left = mass('wing_left', -wingW + 1, 0, zw, zw + wingD - 1, 1, 'x');
  const right = mass('wing_right', W - 1, W - 1 + wingW - 1, zw, zw + wingD - 1, 1, 'x');
  main.joins = { west: true, east: true };
  left.joins = { east: true };
  right.joins = { west: true };
  return { input, plinth: 1, floorHeight: input.floorHeight, masses: [main, left, right], door: { x: (W - 1) / 2, side: 'north' }, notes: [] };
}

function set(b: VoxelBuilder, x: number, y: number, z: number, state: string, priority: PriorityValue): boolean {
  return b.inside(x, y, z) ? b.setBlock(x, y, z, state, priority) : false;
}

function free(b: VoxelBuilder, x: number, y: number, z: number): boolean {
  return b.inside(x, y, z) && b.isAir(x, y, z);
}

/** A pillar gets its axis, everything else its plain state. */
function pillarOr(id: string, axis: 'x' | 'y' | 'z'): string {
  return definitionOf(blockState(id)).shape === 'pillar' ? blockState(id, { axis }) : blockState(id);
}

/** Picks from weighted entries, avoiding the given neighbour states where possible. */
function pickMix(rng: SeededRandom, mix: readonly (readonly [string, number])[], avoid: ReadonlySet<string>): string {
  const allowed = mix.filter(([id]) => !avoid.has(blockState(id)));
  return rng.weighted(allowed.length > 0 ? allowed : mix);
}

/**
 * Column positions along the canopy: symmetric about the hall axis, an odd number of fields
 * (so no column stands in front of the back door), spacing 4–6 (research C2).
 */
export function columnPositions(x0: number, x1: number, axis: number): number[] {
  const length = x1 - x0;
  let best = 1;
  for (let n = 1; n <= Math.max(1, Math.floor(length / 4)); n += 2) if (Math.abs(length / n - 5) < Math.abs(length / best - 5)) best = n;
  const left: number[] = [];
  for (let i = 0; i <= (best - 1) / 2; i++) left.push(x0 + Math.round((i * length) / best));
  return [...left, ...left.map((x) => 2 * axis - x).reverse()];
}

export function buildStation(input: HouseInput, rng: SeededRandom): { builder: VoxelBuilder; layout: StationLayout } {
  const r = rng.fork('station');
  const st = STATION_STYLES[input.styleId];
  const prepared = prepareHouse(input, r, stationPlan(input));
  const b = prepared.bounds;
  // Room for the platform ends (4–6 blocks beyond the building) and the entrance lamps; from a
  // hall width of 15 also for an entry signal beyond each platform end (C8).
  const signals = input.width >= 15;
  const marginX = 6 + (signals ? 8 : 0);
  const marginN = 5;
  const plan = shiftPlan(prepared.plan, marginX - b.minX, marginN - b.minZ);
  const main = plan.masses[0]!;
  const wingL = plan.masses[1]!;
  const wingR = plan.masses[2]!;
  const f = main.frames ? 1 : 0;
  const edgeZ = main.rect.z1 + 1 + PLATFORM_DEPTH;
  const lineZ = edgeZ - 1;
  const trackZ = edgeZ + 2;
  // Platform 5 blocks beyond the building on each side; from a hall width of 11 a goods shed
  // beyond the east end (C6), the east signal beyond the shed.
  const bx0 = Math.min(...plan.masses.map((m) => m.rect.x0)) - f;
  const bx1 = Math.max(...plan.masses.map((m) => m.rect.x1)) + f;
  const px0 = bx0 - 5;
  const px1 = bx1 + 5;
  const shed = input.width >= 11 ? { x0: px1 + 5, length: input.width >= 15 ? 11 : 9, depth: input.width >= 15 ? 7 : 5 } : null;
  const eastEnd = shed ? shed.x0 + shed.length : px1 + 1;
  const width = eastEnd + (signals ? 8 : 0) + 3;
  const length = trackZ + 4;
  const height = planRoofs(planSections(plan, input, r.fork('probe')).sections).topY + 6;
  if (width > MAX_DIMENSIONS.width || length > MAX_DIMENSIONS.length) throw new GeometryError('Bahnhof passt nicht in die Grenzen');
  const builder = new VoxelBuilder({ width, height, length });
  const blocks = new Blocks(input.materials, input.minecraftVersion, input.seed);
  const chainY = blockState(profileBlockId('iron_chain', input.minecraftVersion), { axis: 'y' });
  const chainX = blockState(profileBlockId('iron_chain', input.minecraftVersion), { axis: 'x' });
  const hanging = blockState(input.lantern, { hanging: 'true' });

  // Ground.
  for (let x = 0; x < width; x++) for (let z = 0; z < length; z++) builder.setBlock(x, 0, z, blockState('grass_block'), Priority.DECOR);

  // The hall gable stays plain: the station clock goes there.
  const house = buildHouseInto(builder, plan, input, r, { plainGables: ['main:north'], cornerLanterns: false, backDoor: false });

  // --- House platform: directly at the building, edge and safety line (C2, rec. 7 and 10).
  const pz0 = main.rect.z1 + 1;
  const edgeStair = blockState(requireForm(st.edge, 'stairs'), { facing: 'north', half: 'top' });
  for (let x = px0; x <= px1; x++)
    for (let z = pz0; z <= edgeZ; z++) {
      const top = builder.getBlock(x, 1, z);
      // In the first row the hall's plinth stays; the wings' stair apron becomes platform.
      if (z === pz0 && top !== 'minecraft:air' && !top.includes('_stairs[')) continue;
      builder.setBlock(x, 0, z, blocks.block('plinth'), Priority.STRUCTURE);
      const surface = z === edgeZ ? edgeStair : z === lineZ ? blockState('white_concrete') : blocks.block('path');
      builder.setBlock(x, 1, z, surface, Priority.STRUCTURE);
    }
  // Steps at both platform ends.
  for (let z = pz0; z <= edgeZ; z++) {
    set(builder, px0 - 1, 1, z, blockState(requireForm(st.edge, 'stairs'), { facing: 'east', half: 'bottom' }), Priority.STRUCTURE);
    set(builder, px1 + 1, 1, z, blockState(requireForm(st.edge, 'stairs'), { facing: 'west', half: 'bottom' }), Priority.STRUCTURE);
  }

  // --- Track bed (C3, rec. 8): sleepers across all three rows every second block, mixed
  // ballast between them (no equal neighbours), a shoulder; rails on top.
  const tr = r.fork('track');
  for (let x = 0; x < width; x++) {
    const sleeper = x % 2 === 0 ? blockState(tr.chance(0.3) ? 'stripped_dark_oak_log' : 'stripped_spruce_log', { axis: 'z' }) : null;
    for (let z = trackZ - 1; z <= trackZ + 1; z++) {
      const state = sleeper ?? blockState(pickMix(tr, BALLAST, new Set([x >= 2 ? builder.getBlock(x - 2, 0, z) : '', builder.getBlock(x, 0, z - 1)])));
      builder.setBlock(x, 0, z, state, Priority.STRUCTURE);
    }
    builder.setBlock(x, 0, trackZ + 2, blockState(pickMix(tr, SHOULDER, new Set([x > 0 ? builder.getBlock(x - 1, 0, trackZ + 2) : '']))), Priority.STRUCTURE);
    builder.setBlock(x, 1, trackZ, blockState('rail', { shape: 'east_west' }), Priority.STRUCTURE);
  }

  // --- Platform roof (C2, rec. 7): a lean-to against the building from the wall face to the
  // edge, 1:2 pitch (half a block per row, eave slab at y 5 → clear height 3 above the
  // platform). In front of the wings it ends at their eaves; in front of the hall it rises on
  // to the hall's upper floor band, so the hall keeps its own, higher roof section.
  const wallFaceZ = main.rect.z1 + f;
  const cx0 = wingL.rect.x0 - f - wingL.overhang;
  const cx1 = wingR.rect.x1 + f + wingR.overhang;
  const rows = edgeZ - wallFaceZ;
  const profile = (cap: number) => Array.from({ length: rows }, (_, k) => Math.max(11, Math.min(11 + k, cap)));
  const wingHeights = profile(2 * wallTopOf(plan, wingL));
  const hallHeights = profile(2 * (floorY(plan, 1) + 1));
  const halfY = (t: number) => Math.floor((t - 1) / 2);
  const pieceY = (k: number) => halfY(Math.min(wingHeights[k]!, hallHeights[k]!));
  const canopySlab = (type: 'top' | 'bottom') => blockState(requireForm(st.canopy, 'slab'), { type });
  const canopyStair = blockState(requireForm(st.canopy, 'stairs'), { facing: 'north', half: 'bottom' });
  for (let x = cx0; x <= cx1; x++) {
    const heights = x >= main.rect.x0 - f && x <= main.rect.x1 + f ? hallHeights : wingHeights;
    for (let k = 0; k < rows; k++) {
      const t = heights[k]!;
      const state = t % 2 === 1 ? canopySlab('bottom') : k > 0 && heights[k - 1]! < t ? canopyStair : canopySlab('top');
      set(builder, x, halfY(t), edgeZ - k, state, Priority.ROOF);
    }
  }
  // Columns two blocks behind the edge, each with a capital and two consoles.
  const columnZ = edgeZ - 2;
  const hallAxis = (main.rect.x0 + main.rect.x1) / 2;
  const columns = columnPositions(cx0 + 1, cx1 - 1, hallAxis);
  // Capital and consoles directly under the roof piece of the column row.
  const capitalY = pieceY(2) - 1;
  for (const x of columns) {
    for (let y = 2; y < capitalY; y++) set(builder, x, y, columnZ, pillarOr(st.column, 'y'), Priority.STRUCTURE);
    set(builder, x, capitalY, columnZ, pillarOr(st.capital, 'y'), Priority.STRUCTURE);
    set(builder, x - 1, capitalY, columnZ, blockState(requireForm(st.console, 'stairs'), { facing: 'east', half: 'top' }), Priority.STRUCTURE);
    set(builder, x + 1, capitalY, columnZ, blockState(requireForm(st.console, 'stairs'), { facing: 'west', half: 'top' }), Priority.STRUCTURE);
  }
  // Valance under the eave at the track side (detail ≥ 2).
  if (input.detailLevel >= 2 && st.valance !== 'none') {
    const y = pieceY(0) - 1;
    for (let x = cx0; x <= cx1; x++) {
      const id = st.valanceBlocks[st.valance === 'lambrequin' ? x % st.valanceBlocks.length : 0]!;
      const state = st.valance === 'glass' ? blockState(id) : blockState(id, { facing: 'north', half: 'top', open: 'true' });
      if (free(builder, x, y, edgeZ)) set(builder, x, y, edgeZ, state, Priority.DECOR);
    }
  }
  // Lanterns on chains in the middle of each field, hanging from the roof above the columns; in
  // the middle field (in front of the back door) the double-sided platform clock (C4) from
  // detail 2: a white block on a chain with a button as hub on both faces.
  let platformClock: StationLayout['platformClock'] = null;
  for (let i = 0; i + 1 < columns.length; i++) {
    const x = Math.floor((columns[i]! + columns[i + 1]!) / 2);
    const y = capitalY - 1;
    if (y < 4 || !free(builder, x, capitalY, columnZ) || !free(builder, x, y, columnZ)) continue;
    set(builder, x, capitalY, columnZ, chainY, Priority.DECOR);
    const middle = columns[i]! < hallAxis && columns[i + 1]! > hallAxis;
    if (middle && input.detailLevel >= 2 && free(builder, x, y, columnZ - 1) && free(builder, x, y, columnZ + 1)) {
      set(builder, x, y, columnZ, blockState('white_concrete'), Priority.DECOR);
      set(builder, x, y, columnZ - 1, blockState('stone_button', { face: 'wall', facing: 'north' }), Priority.DECOR);
      set(builder, x, y, columnZ + 1, blockState('stone_button', { face: 'wall', facing: 'south' }), Priority.DECOR);
      platformClock = { x, y, z: columnZ };
    } else set(builder, x, y, columnZ, hanging, Priority.DECOR);
  }

  // --- Back door from the hall onto the platform (a real door where the hall inside is free).
  let backDoor: StationLayout['backDoor'] = null;
  for (const dx of [0, -1, 1, -2, 2]) {
    const x = hallAxis + dx;
    const z = main.rect.z1;
    const inside = [2, 3].every((y) => free(builder, x, y, z - 1));
    // Outside the wall face (a chimney standing there blocks the door).
    const outside = [2, 3].every((y) => free(builder, x, y, z + 1 + f));
    if (!inside || !outside) continue;
    set(builder, x, 2, z, blocks.door('door', 'south', 'left'), Priority.OPENING);
    builder.clear(x, 3, z, Priority.OPENING);
    for (const y of [2, 3]) if (f) builder.clear(x, y, z + 1, Priority.OPENING);
    backDoor = { x, y: 2, z };
    break;
  }

  // Benches against the wall between the columns, facing the track (C8).
  const benchZ = wallFaceZ + 1;
  for (let i = 0; i + 1 < columns.length; i++) {
    const x = Math.floor((columns[i]! + columns[i + 1]!) / 2) - 1;
    const cells = [x - 1, x, x + 1, x + 2];
    if (backDoor && cells.some((c) => Math.abs(c - backDoor.x) <= 1)) continue;
    if (!cells.every((c) => free(builder, c, 2, benchZ) && free(builder, c, 3, benchZ))) continue;
    for (const c of [x, x + 1]) set(builder, c, 2, benchZ, blocks.stairs('floor', 'north', 'bottom'), Priority.DECOR);
    set(builder, x - 1, 2, benchZ, blocks.trapdoor('shutter', 'west', 'bottom', true), Priority.DECOR);
    set(builder, x + 2, 2, benchZ, blocks.trapdoor('shutter', 'east', 'bottom', true), Priority.DECOR);
  }

  // --- Station clock in the hall gable (C4, rec. 9): round frame, white face, hands of chains in
  // front of the face. The largest dial that fits on plain wall wins.
  const clock = buildClock(builder, house, plan, st, blocks, chainY, chainX, input.detailLevel);

  // --- Lamp posts (18, rec. 13): T-posts at both platform ends, a pair at the entrance.
  const lampPosts: StationLayout['lampPosts'] = [];
  const lampBlock = blockState(st.lampPost);
  for (const x of [px0 + 1, px1 - 1]) {
    for (let y = 2; y <= 6; y++) set(builder, x, y, columnZ, lampBlock, Priority.STRUCTURE);
    for (const ax of [x - 1, x + 1]) {
      set(builder, ax, 6, columnZ, lampBlock, Priority.STRUCTURE);
      set(builder, ax, 5, columnZ, chainY, Priority.DECOR);
      set(builder, ax, 4, columnZ, hanging, Priority.DECOR);
    }
    lampPosts.push({ x, y: 2, z: columnZ, kind: 'platform' });
  }
  const front = house.openings.doors.find((d) => d.outward === 'north');
  if (front) {
    const centre = front.x - (front.width - 1) / 2;
    const z = front.z - 4;
    for (const [x, toward] of [
      [Math.floor(centre - 3), 1],
      [Math.ceil(centre + 3), -1],
    ] as const) {
      for (let y = 1; y <= 4; y++) set(builder, x, y, z, lampBlock, Priority.STRUCTURE);
      set(builder, x + toward, 4, z, lampBlock, Priority.STRUCTURE);
      set(builder, x + toward, 3, z, hanging, Priority.DECOR);
      lampPosts.push({ x, y: 1, z, kind: 'portal' });
    }
    // Path from the entrance to the street.
    for (let zz = 0; zz < front.z - 1 - f; zz++) for (let x = Math.floor(centre) - 1; x <= Math.ceil(centre) + 1; x++) set(builder, x, 0, zz, blocks.block('path'), Priority.DECOR);
  }

  // --- Railway furniture by size (C7, C8; research rec. 14), on the shoulder two blocks beside
  // the rail centre: from a hall width of 11 a water crane at the west platform end (column,
  // arm of iron bars parallel to the track, chain as hose, lantern on top), from 15 an entry
  // signal 8 blocks beyond each platform end (white mast with ladder, red-and-white arm across
  // the track, lightning rod as finial).
  const extras: StationLayout['extras'] = [];
  const shoulderZ = trackZ + 2;
  if (input.width >= 11) {
    const x = px0 + 1;
    set(builder, x, 1, shoulderZ, blockState('polished_blackstone'), Priority.STRUCTURE);
    for (let y = 2; y <= 4; y++) set(builder, x, y, shoulderZ, blockState('polished_blackstone_wall'), Priority.STRUCTURE);
    set(builder, x, 5, shoulderZ, blockState(input.lantern, { hanging: 'false' }), Priority.DECOR);
    for (const ax of [x + 1, x + 2]) set(builder, ax, 4, shoulderZ, blockState('iron_bars'), Priority.STRUCTURE);
    set(builder, x + 2, 3, shoulderZ, chainY, Priority.DECOR);
    extras.push({ kind: 'water_crane', x, z: shoulderZ });
  }
  if (signals) {
    const rod = isAvailableIn('minecraft:waxed_lightning_rod', input.minecraftVersion) ? 'waxed_lightning_rod' : 'lightning_rod';
    for (const x of [px0 - 8, eastEnd + 7]) {
      set(builder, x, 1, shoulderZ, blockState('stone_bricks'), Priority.STRUCTURE);
      for (let y = 2; y <= 6; y++) set(builder, x, y, shoulderZ, blockState('stripped_birch_log', { axis: 'y' }), Priority.STRUCTURE);
      for (let y = 2; y <= 4; y++) set(builder, x, y, shoulderZ + 1, blockState('ladder', { facing: 'south' }), Priority.DECOR);
      // Arm at "stop" (horizontal): panels facing along the track, red next to the mast, white tip.
      set(builder, x, 6, shoulderZ - 1, blockState('mangrove_trapdoor', { facing: 'east', half: 'top', open: 'true' }), Priority.DECOR);
      set(builder, x, 6, shoulderZ - 2, blockState('birch_trapdoor', { facing: 'east', half: 'top', open: 'true' }), Priority.DECOR);
      set(builder, x, 7, shoulderZ, blockState(rod, { facing: 'up' }), Priority.DECOR);
      extras.push({ kind: 'signal', x, z: shoulderZ });
    }
  }

  if (shed) {
    buildGoodsShed(builder, shed, edgeZ, input, blocks, r.fork('shed'), hanging);
    extras.push({ kind: 'goods_shed', x: shed.x0, z: edgeZ - 2 });
  }

  // --- Festive layer: garlands and lanterns under the house eaves, wreaths above both doors,
  // candles on the sills; under the platform roof fir green with lights behind the valance.
  if (input.theme !== 'none') {
    if (input.theme === 'christmas' && input.festive.garland) {
      const leaves = blockState('spruce_leaves', { persistent: 'true' });
      const light = blockState(input.detailLevel >= 3 ? 'ochre_froglight' : 'glowstone', input.detailLevel >= 3 ? { axis: 'y' } : {});
      const y = pieceY(1) - 1;
      let i = 0;
      for (let x = cx0; x <= cx1; x++) {
        if (!free(builder, x, y, edgeZ - 1)) continue;
        set(builder, x, y, edgeZ - 1, i % 3 === 1 ? light : leaves, Priority.DECOR);
        i++;
      }
    }
    const doors = [...house.openings.doors, ...(backDoor ? [{ ...backDoor, outward: 'south' as HorizontalDirection, width: 1 }] : [])];
    decorateFestive(builder, r.fork('festive'), { eaves: house.roof.eaveCells, doors, sills: house.openings.sills, yard: [] }, {
      theme: input.theme,
      intensity: input.detailLevel,
      garland: input.festive.garland,
      presents: false,
      lantern: input.lantern,
      lanternDensity: input.lanternDensity,
      minecraftVersion: input.minecraftVersion,
    });
  }

  return {
    builder,
    layout: {
      plan,
      trackZ,
      platform: { z0: pz0, z1: edgeZ, x0: px0, x1: px1 },
      edgeZ,
      lineZ,
      railY: 1,
      canopy: { x0: cx0, x1: cx1, z0: wallFaceZ + 1, z1: edgeZ, columnZ, columns, capitalY },
      clock,
      platformClock,
      lampPosts,
      backDoor,
      extras,
      house,
    },
  };
}

/** True if the block is plain wall: a full, non-glass cube (no window, no door, no detail). */
function plainWall(state: string): boolean {
  if (state === 'minecraft:air') return false;
  const def = definitionOf(state);
  return (def.shape === 'cube' || def.shape === 'pillar') && def.category !== 'glass' && isFaceFull(state, 'north');
}

function dialCells(d: 3 | 5 | 7, cx: number): { x: number; dy: number; ring: boolean }[] {
  const rad = (d - 1) / 2;
  const cells: { x: number; dy: number; ring: boolean }[] = [];
  DIALS[d].forEach((line, row) => {
    [...line].forEach((ch, col) => {
      if (ch !== '.') cells.push({ x: cx - rad + col, dy: rad - row, ring: ch === 'R' });
    });
  });
  return cells;
}

/**
 * Station clock (C4): in the hall's street gable, on plain wall only (the beam row under the
 * gable counts as wall), the lowest position that fits, the largest dial first. A flat roof
 * gets a small clock panel on the roof edge above the entrance instead.
 */
function buildClock(builder: VoxelBuilder, house: HouseResult, plan: HousePlan, st: StationStyle, blocks: Blocks, chainY: string, chainX: string, detail: 1 | 2 | 3): StationLayout['clock'] {
  const main = plan.masses[0]!;
  const wallTop = wallTopOf(plan, main);
  const cx = (main.rect.x0 + main.rect.x1) / 2;
  const gable = house.roof.gableCells.filter((c) => c.section === 'main' && c.side === 'north');
  const gableSet = new Set(gable.map((c) => `${c.x},${c.y}`));
  const hallWidth = main.rect.x1 - main.rect.x0 + 1;
  const sizes = hallWidth >= 15 ? ([7, 5, 3] as const) : ([5, 3] as const);
  const ring = pillarOr(st.clockRing, 'z');

  const place = (d: 3 | 5 | 7, cy: number, z: number) => {
    const rad = (d - 1) / 2;
    for (const c of dialCells(d, cx)) builder.setBlock(c.x, cy + c.dy, z, c.ring ? ring : blockState('white_concrete'), Priority.OPENING);
    for (const h of hands(d)) builder.setBlock(cx + h.dx, cy + h.dy, z - 1, h.state, Priority.OPENING);
    // Hour marks at 12, 3, 6 and 9 on the frame of the large dial.
    if (d === 7 && detail >= 2)
      for (const [mx, my] of [
        [0, rad],
        [rad, 0],
        [0, -rad],
        [-rad, 0],
      ] as const)
        if (free(builder, cx + mx, cy + my, z - 1)) builder.setBlock(cx + mx, cy + my, z - 1, blockState(st.button, { face: 'wall', facing: 'north' }), Priority.DECOR);
    return { x: cx, y: cy, z, d };
  };
  // Minute hand up (12 o'clock), hour hand to the right (3 o'clock), chains in front of the face.
  const hands = (d: 3 | 5 | 7) => [
    ...Array.from({ length: Math.max(1, (d - 1) / 2) }, (_, i) => ({ dx: 0, dy: i, state: chainY })),
    ...(d >= 5 ? [{ dx: 1, dy: 0, state: chainX }] : []),
  ];
  const handsFree = (d: 3 | 5 | 7, cy: number, z: number) => hands(d).every((h) => free(builder, cx + h.dx, cy + h.dy, z - 1));

  if (gable.length > 0) {
    const z = gable[0]!.z;
    const ok = (x: number, y: number) => plainWall(builder.getBlock(x, y, z)) && (gableSet.has(`${x},${y}`) || y === wallTop);
    const yTop = Math.max(...gable.map((c) => c.y));
    for (const d of sizes) {
      const rad = (d - 1) / 2;
      for (let cy = wallTop + rad; cy + rad <= yTop; cy++) {
        if (dialCells(d, cx).every((c) => ok(c.x, cy + c.dy)) && handsFree(d, cy, z)) return place(d, cy, z);
      }
    }
    return null;
  }

  // Flat roof: a panel of the roof trim on the front roof edge, the dial in it.
  const z = main.rect.z0 - (main.frames ? 1 : 0);
  let edge = builder.dimensions.height - 1;
  while (edge > wallTop && builder.isAir(cx, edge, z)) edge--;
  const slabTop = builder.getBlock(cx, edge, z).includes('type=bottom');
  const y0 = slabTop ? edge : edge + 1;
  for (const d of sizes) {
    const rad = (d - 1) / 2;
    const cy = y0 + rad;
    if (y0 + d >= builder.dimensions.height || !handsFree(d, cy, z)) continue;
    for (let x = cx - rad - 1; x <= cx + rad + 1; x++) {
      for (let y = y0; y < y0 + d; y++) builder.setBlock(x, y, z, blocks.block('roofTrim'), Priority.OPENING);
      builder.setBlock(x, y0 + d, z, blocks.slab('roofTrim', 'bottom'), Priority.OPENING);
    }
    return place(d, cy, z);
  }
  return null;
}

/** Styles that build in wood (vertical boards for the goods shed). */
const WOOD_STYLES: ReadonlySet<StyleId> = new Set(['medieval', 'rustic', 'nordic', 'fantasy', 'japanese', 'cherry']);

/**
 * Goods shed (C6): one storey with its floor at wagon-floor height (like the platform), boarded
 * walls between frame posts, a gate on the track side and one on the street side with the
 * sliding panel pushed aside, loading ramps along both sides with steps at their ends, a
 * gable roof from the roof engine, a loading roof one row deeper on consoles over the track
 * ramp, a lantern at the gate and barrels and hay as goods on the ramp.
 */
function buildGoodsShed(builder: VoxelBuilder, s: { x0: number; length: number; depth: number }, edgeZ: number, input: HouseInput, blocks: Blocks, rng: SeededRandom, hanging: string): void {
  const S = Priority.STRUCTURE;
  const x0 = s.x0;
  const x1 = s.x0 + s.length - 1;
  const z1 = edgeZ - 2;
  const z0 = z1 - (s.depth - 1);
  const wallTop = 5;
  const wood = WOOD_STYLES.has(input.styleId);
  const flat = input.roofType === 'flat';
  const boardMaterial = wood ? 'stripped_spruce_log' : input.materials.wall;
  const board = wood ? blockState('stripped_spruce_log', { axis: 'y' }) : blocks.block('wall');
  const post = blocks.log('frame', 'y');
  // Plinth, floor and walls.
  for (let x = x0; x <= x1; x++)
    for (let z = z0; z <= z1; z++) {
      const edge = x === x0 || x === x1 || z === z0 || z === z1;
      set(builder, x, 0, z, blocks.block('plinth'), S);
      set(builder, x, 1, z, edge ? blocks.block('plinth') : blocks.block('floor'), S);
      if (!edge) continue;
      const corner = (x === x0 || x === x1) && (z === z0 || z === z1);
      const isPost = corner || ((z === z0 || z === z1) && (x - x0) % 4 === 0 && x1 - x >= 2) || ((x === x0 || x === x1) && (z - z0) % 4 === 0 && z1 - z >= 2);
      for (let y = 2; y <= wallTop; y++) set(builder, x, y, z, isPost ? post : board, S);
    }
  // Loading ramps (track and street side) at floor height, edge of top slabs, steps at the ends.
  const ramp = blockState('stone_bricks');
  const rampEdge = blockState('stone_brick_slab', { type: 'top' });
  for (const [inner, outer] of [
    [z1 + 1, z1 + 2],
    [z0 - 1, z0 - 2],
  ] as const) {
    for (let x = x0 - 1; x <= x1 + 1; x++) {
      for (const z of [inner, outer]) set(builder, x, 0, z, blocks.block('plinth'), S);
      set(builder, x, 1, inner, ramp, S);
      set(builder, x, 1, outer, rampEdge, S);
    }
    for (const z of [inner, outer]) {
      set(builder, x0 - 2, 1, z, blockState('stone_brick_stairs', { facing: 'east', half: 'bottom' }), S);
      set(builder, x1 + 2, 1, z, blockState('stone_brick_stairs', { facing: 'west', half: 'bottom' }), S);
    }
  }
  // Gates 2 × 3 in the middle of both long sides; the sliding panel stands beside the opening.
  const gx = x0 + Math.floor(s.length / 2) - 1;
  for (const [z, out] of [
    [z1, 'south'],
    [z0, 'north'],
  ] as const) {
    const front = z + (out === 'south' ? 1 : -1);
    for (let y = 2; y <= 4; y++) {
      for (const x of [gx, gx + 1]) builder.clear(x, y, z, Priority.OPENING);
      for (const x of [gx + 2, gx + 3]) set(builder, x, y, front, blocks.trapdoor('shutter', out, 'bottom', true), Priority.DECOR);
    }
  }
  // Roof (gable along the shed) and a loading roof one row deeper over the track ramp.
  buildRoofs(builder, [
    {
      id: 'goods_shed',
      x0,
      x1,
      z0,
      z1,
      wallTop,
      // The shed follows the hall: a flat roof next to a flat-roofed hall, else a gable.
      type: flat ? 'flat' : 'gable',
      ridgeAxis: 'x',
      profile: 'standard',
      overhang: 1,
      materials: { ...roofMaterials(input.materials), gable: boardMaterial },
      ridgeStyle: 'slab',
      soffit: true,
      gables: true,
    },
  ]);
  const roofSlab = blockState(profileBlockId(requireForm(input.materials.roof, 'slab'), input.minecraftVersion), { type: 'bottom' });
  const loadingY = flat ? wallTop + 1 : wallTop;
  for (let x = x0 - 1; x <= x1 + 1; x++) set(builder, x, loadingY, z1 + 2, roofSlab, Priority.ROOF);
  for (let x = x0; x <= x1; x += 4) set(builder, x, loadingY - 1, z1 + 2, blockState(profileBlockId(requireForm(input.materials.frame, 'stairs'), input.minecraftVersion), { facing: 'north', half: 'top' }), S);
  if (free(builder, gx, loadingY - 1, z1 + 2)) set(builder, gx, loadingY - 1, z1 + 2, hanging, Priority.DECOR);
  // Goods on the track ramp, away from the gate: barrels in twos and threes, a hay bale.
  for (const x of [x0, x0 + 1, x1 - 1, x1]) {
    if (x >= gx - 1 && x <= gx + 3) continue;
    if (!rng.chance(0.75) || !free(builder, x, 2, z1 + 1)) continue;
    const hay = x === x1 && rng.chance(0.5);
    set(builder, x, 2, z1 + 1, hay ? blockState('hay_block', { axis: 'x' }) : blockState('barrel', { facing: rng.chance(0.5) ? 'up' : 'south' }), Priority.DECOR);
  }
}
