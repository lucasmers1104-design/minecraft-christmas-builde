import type { HorizontalDirection } from '@/core/blocks/directions';
import { blockState, definitionOf, profileBlockId, propsOf } from '@/core/blocks/registry';
import { Priority, VoxelBuilder, type PriorityValue } from '@/core/generator/geometry';
import { buildRoofs, type RoofResult } from '@/core/generator/roof/roofEngine';
import type { SeededRandom } from '@/core/generator/seededRandom';
import { buildChristmasTree, treeProfile } from '@/core/generator/christmasTree';
import { formOf, hasMaterial, requireForm } from '@/core/style/materials';
import type { RoleMaterials } from '@/core/templates/place';
import { BIG_HUT, HUT_SIZES, STALL_STYLES, WARE_THEMES, type HutSize, type StallStyle, type StallWall, type Ware, type WareTheme } from '@/core/templates/stalls';
import type { SizeClass, StyleId, Theme } from '@/core/style/styles';

/**
 * Christmas market (research 17, B1–B5; 18, recommendation 13; 19, recommendation 12).
 *
 * Every stall is a wooden hut with its gable towards the lane: corner posts, solid walls, a
 * parapet with the lower shutter folded down as a display (closed top trapdoor in front), a
 * lintel log, a gable roof from the roof engine with its ridge across the lane and an overhang
 * of 1–2 into the lane, a thin verge board of open trapdoors, a lantern on a chain under the
 * ridge and – in the Christmas theme – fir green with warm lights along eaves and verge.
 * Wares on counter and display are smaller than half a block; full blocks only on the back
 * shelf. Neighbouring huts differ in wall, roof and ware theme and in width or height.
 *
 * The lane: two rows facing each other, three blocks between neighbouring walls (one block of
 * air between the roofs), light chains across the lane from gable to gable (nothing hangs from
 * a horizontal chain), a multi-arm lamp post at the open end of the lane, and from size large a
 * square with a tree, benches facing it and presents under it (never in the lane). Every
 * fourth hut is a larger mulled wine hut with barrel tables in front.
 */

export interface StallInput {
  style: StyleId;
  theme: Theme;
  size: SizeClass;
  materials: RoleMaterials;
  seed: number;
  minecraftVersion: string;
  detailLevel: 1 | 2 | 3;
  lantern: 'lantern' | 'soul_lantern';
  garland: boolean;
  presents: boolean;
  /** Explicit material wishes (catalogue ids); they apply to every hut. */
  materialWishes?: Readonly<{ wall?: string; roof?: string; frame?: string }>;
  /** none: no lanterns; few: a two-armed lamp post, no lanterns over the counter; many: a second post. */
  lanternDensity?: 'none' | 'few' | 'normal' | 'many';
}

/** One hut as built (world coordinates). */
export interface HutPlan {
  index: number;
  /** West post (u = 0). */
  x0: number;
  width: number;
  depth: number;
  wallHeight: number;
  /** z of the front wall plane (parapet) and the side the counter faces. */
  zFront: number;
  front: 'north' | 'south';
  overhangFront: 1 | 2;
  wall: StallWall;
  roof: string;
  wares: WareTheme;
  big: boolean;
  shutter: boolean;
  /** Highest roof row (filled in when built). */
  ridgeY: number;
}

export interface MarketLayout {
  huts: HutPlan[];
  /** Lane rows (z, inclusive). */
  lane: { z0: number; z1: number };
  /** The square with the tree (sizes large and huge). */
  plaza: { x0: number; z0: number; x1: number; z1: number; treeX: number; treeZ: number } | null;
  /** Light chains across the lane: x, y and z range (inclusive). */
  chains: { x: number; y: number; z0: number; z1: number }[];
  /** Lamp posts (foot position) and number of arms. */
  lampPosts: { x: number; z: number; arms: number }[];
  /** Present cells (wool at y = 1). */
  presents: { x: number; z: number }[];
}

function stallCount(size: SizeClass): number {
  return size === 'small' ? 1 : size === 'medium' ? 2 : size === 'large' ? 4 : 6;
}

/** Sign of the front direction in z. */
const sgnOf = (h: Pick<HutPlan, 'front'>) => (h.front === 'south' ? 1 : -1);
/** World z at depth d (0 = front wall plane, negative inwards, positive towards the lane). */
export const hutZ = (h: Pick<HutPlan, 'front' | 'zFront'>, d: number) => h.zFront + sgnOf(h) * d;

const OPPOSITE_DIR: Readonly<Record<HorizontalDirection, HorizontalDirection>> = { north: 'south', south: 'north', east: 'west', west: 'east' };

interface Ctx {
  b: VoxelBuilder;
  style: StallStyle;
  input: StallInput;
  chain: string;
  light: string;
  /** Corner post state (style table or the frame wish). */
  post: string;
  density: 'none' | 'few' | 'normal' | 'many';
}

function set(b: VoxelBuilder, x: number, y: number, z: number, state: string, priority: PriorityValue): boolean {
  return b.inside(x, y, z) ? b.setBlock(x, y, z, state, priority) : false;
}

function free(b: VoxelBuilder, x: number, y: number, z: number): boolean {
  return b.inside(x, y, z) && b.isAir(x, y, z);
}

function wallState(w: StallWall): string {
  return blockState(w.block, w.axis ? { axis: w.axis } : {});
}

function wareState(w: Ware): string {
  return blockState(w.id, w.props ? { ...w.props } : {});
}

/** Lowest block of the roof column at (x, z) (scanning down from the surface), or null. */
function roofUnderside(b: VoxelBuilder, roof: RoofResult, x: number, z: number): number | null {
  const top = roof.surface.get(`${x},${z}`);
  if (top === undefined) return null;
  let y = top;
  while (y - 1 > 0 && !b.isAir(x, y - 1, z)) y--;
  return y;
}

type HutLook = Omit<HutPlan, 'x0' | 'zFront' | 'front' | 'ridgeY'>;

/** A pillar gets axis y (logs as vertical boards), any other block its plain state. */
function uprightState(id: string): string {
  return definitionOf(blockState(id)).shape === 'pillar' ? blockState(id, { axis: 'y' }) : blockState(id);
}

/** A wished wall material as hut wall (all huts), or null if it has no block. */
function wallWish(material: string | undefined): StallWall | null {
  if (!material || !hasMaterial(material)) return null;
  const block = formOf(material, 'block');
  if (!block) return null;
  return { id: `wish:${material}`, block, ...(definitionOf(blockState(block)).shape === 'pillar' ? { axis: 'y' as const } : {}) };
}

/** A wished roof material, if it has the stairs, slabs and block the roof needs. */
function roofWish(material: string | undefined): string | null {
  if (!material || !hasMaterial(material)) return null;
  return formOf(material, 'stairs') && formOf(material, 'slab') && formOf(material, 'block') ? material : null;
}

/**
 * Size and look per hut: no two huts share width, depth and wall height; neighbours differ in
 * width or wall height (19, rec. 12) and in wall, roof and ware theme (17, rec. 6).
 */
function planLooks(rng: SeededRandom, input: StallInput, n: number): HutLook[] {
  const style = STALL_STYLES[input.style];
  const r = rng.fork('looks');
  const sizes = r.shuffle(HUT_SIZES);
  const themes = r.shuffle(WARE_THEMES.filter((t) => !t.bigHut && t.themes.includes(input.theme)));
  const big = WARE_THEMES.find((t) => t.bigHut)!;
  const wall0 = r.int(0, style.walls.length - 1);
  const roof0 = r.int(0, style.roofs.length - 1);
  const wishedWall = wallWish(input.materialWishes?.wall);
  const wishedRoof = roofWish(input.materialWishes?.roof);
  const used = new Set<string>();
  const key = (s: HutSize) => `${s.width}x${s.depth}x${s.wallHeight}`;
  const out: HutLook[] = [];
  // Spatial neighbours of hut i: the one opposite (odd i) and the previous one in the same row.
  const neighbours = (i: number) => [i % 2 === 1 ? i - 1 : -1, i - 2].filter((j) => j >= 0 && j < out.length);
  for (let i = 0; i < n; i++) {
    const isBig = i % 4 === 3;
    let size: HutSize;
    if (isBig) size = { ...BIG_HUT, wallHeight: r.chance(0.5) ? 4 : 5 };
    else {
      const ok = (s: HutSize) => !used.has(key(s)) && neighbours(i).every((j) => out[j]!.width !== s.width || out[j]!.wallHeight !== s.wallHeight);
      size = sizes.find(ok) ?? sizes.find((s) => !used.has(key(s))) ?? sizes[i % sizes.length]!;
    }
    used.add(key(size));
    const hr = r.fork(`hut${i}`);
    out.push({
      index: i,
      width: size.width,
      depth: size.depth,
      wallHeight: size.wallHeight,
      overhangFront: size.width >= 7 || hr.chance(0.4) ? 2 : 1,
      // Consecutive huts step through the options (walls +1, roofs +2): huts opposite each
      // other and side by side in a row never share wall or roof.
      wall: wishedWall ?? style.walls[(wall0 + i) % style.walls.length]!,
      roof: wishedRoof ?? style.roofs[(roof0 + 2 * i) % style.roofs.length]!,
      wares: isBig ? big : themes[i % themes.length]!,
      big: isBig,
      shutter: !isBig && input.detailLevel >= 2 && hr.chance(0.3),
    });
  }
  return out;
}

/** Chain from the roof underside down to y + 1, lantern at y. */
function hangLantern(ctx: Ctx, roof: RoofResult, x: number, z: number, y: number): boolean {
  const { b } = ctx;
  const low = roofUnderside(b, roof, x, z);
  if (low === null || low - 1 < y) return false;
  for (let cy = low - 1; cy >= y; cy--) if (!free(b, x, cy, z)) return false;
  for (let cy = low - 1; cy > y; cy--) set(b, x, cy, z, ctx.chain, Priority.DECOR);
  set(b, x, y, z, blockState(ctx.input.lantern, { hanging: 'true' }), Priority.DECOR);
  return true;
}

/** Builds one hut; returns its roof (surface for garland, lanterns and boards). */
function buildHut(ctx: Ctx, h: HutPlan, rng: SeededRandom): RoofResult {
  const { b, style, input } = ctx;
  const W = h.width;
  const D = h.depth;
  const H = h.wallHeight;
  const outward: HorizontalDirection = h.front;
  const back = OPPOSITE_DIR[outward];
  const x1 = h.x0 + W - 1;
  const xc = h.x0 + (W - 1) / 2;
  const zBack = hutZ(h, -(D - 1));
  const wall = wallState(h.wall);
  const post = ctx.post;
  const S = Priority.STRUCTURE;

  // Floor, corner posts, side and back walls.
  for (let u = 0; u < W; u++) for (let d = 0; d < D; d++) set(b, h.x0 + u, 0, hutZ(h, -d), blockState(style.floor), S);
  for (const x of [h.x0, x1]) for (const z of [h.zFront, zBack]) for (let y = 1; y <= H; y++) set(b, x, y, z, post, S);
  for (let y = 1; y <= H; y++) {
    for (let d = 1; d < D - 1; d++) for (const x of [h.x0, x1]) set(b, x, y, hutZ(h, -d), wall, S);
    for (let u = 1; u < W - 1; u++) set(b, h.x0 + u, y, zBack, wall, S);
  }
  // Back door (the seller enters from behind): lower half, the resolver adds the upper one.
  const r = rng.fork('interior');
  const doorU = r.chance(0.5) ? 1 : W - 2;
  set(b, h.x0 + doorU, 1, zBack, blockState(style.door, { facing: back, half: 'lower', hinge: doorU === 1 ? 'left' : 'right' }), Priority.OPENING);
  b.clear(h.x0 + doorU, 2, zBack, Priority.OPENING);
  for (const d of [-(D - 2), -D]) for (const y of [1, 2]) if (b.inside(h.x0 + doorU, y, hutZ(h, d))) b.clear(h.x0 + doorU, y, hutZ(h, d), Priority.OPENING);

  // Front: parapet, opening, lintel; the lower shutter folded down as display in front.
  for (let u = 1; u < W - 1; u++) {
    const x = h.x0 + u;
    set(b, x, 1, h.zFront, wall, S);
    set(b, x, H, h.zFront, blockState(style.lintel, { axis: 'x' }), S);
    set(b, x, 1, hutZ(h, 1), blockState(style.board, { facing: outward, half: 'top', open: 'false' }), S);
    // Upper shutter propped up as a small canopy (research B1 variant, p = 0.3).
    if (h.shutter) set(b, x, H, hutZ(h, 1), blockState(style.board, { facing: outward, half: 'top', open: 'false' }), S);
  }

  // Roof: gable across the lane (ridge along z), overhang 1 at sides and back, 1–2 at the front.
  const zFrontRoof = hutZ(h, h.overhangFront - 1);
  const roof = buildRoofs(b, [
    {
      id: `hut${h.index}`,
      x0: h.x0,
      x1,
      z0: Math.min(zBack, zFrontRoof),
      z1: Math.max(zBack, zFrontRoof),
      wallTop: H,
      type: 'gable',
      ridgeAxis: 'z',
      profile: style.profile,
      overhang: 1,
      // One material for surface, verge and ridge: no contrast edge (research 06: a thin board instead).
      materials: { roof: h.roof, trim: h.roof, ridge: h.roof, soffit: h.roof, gable: h.roof },
      ridgeStyle: 'slab',
      soffit: false,
      gables: false,
    },
  ]);
  h.ridgeY = roof.topY;

  // Gable triangles in the front and back wall planes, up to the roof.
  for (const z of [h.zFront, zBack])
    for (let x = h.x0; x <= x1; x++) for (let y = H + 1; y <= roof.topY && free(b, x, y, z); y++) set(b, x, y, z, wall, S);

  // Barge boards at both verges (research 06, R01): an upside-down stair under every verge
  // stair and a block under the ridge, all in the roof wood – one diagonal board instead of
  // the stepped underside, and no contrast edge.
  for (const zVerge of [hutZ(h, h.overhangFront), hutZ(h, -D)]) {
    let boarded = 0;
    for (let x = h.x0; x <= x1; x++) {
      const low = roofUnderside(b, roof, x, zVerge);
      if (low === null || !free(b, x, low - 1, zVerge)) continue;
      const piece = b.getBlock(x, low, zVerge);
      const p = propsOf(piece);
      if (piece.includes('_stairs[') && p.half === 'bottom' && (p.facing === 'east' || p.facing === 'west')) {
        set(b, x, low - 1, zVerge, blockState(requireForm(h.roof, 'stairs'), { facing: p.facing === 'east' ? 'west' : 'east', half: 'top' }), Priority.ROOF);
        boarded++;
      } else if (x === xc && boarded > 0) set(b, x, low - 1, zVerge, blockState(requireForm(h.roof, 'block')), Priority.ROOF);
    }
  }

  // Interior: back shelf with wares, storage under it, a lantern on a chain under the ridge.
  const dShelf = -(D - 2);
  for (let u = 1; u < W - 1; u++) {
    if (u === doorU) continue;
    const x = h.x0 + u;
    const z = hutZ(h, dShelf);
    set(b, x, 2, z, blockState(style.shelf, { type: 'top' }), S);
    if (r.chance(0.7)) set(b, x, 3, z, wareState(r.pick(h.wares.shelf)), Priority.DECOR);
    if (r.chance(0.45)) set(b, x, 1, z, wareState(r.pick(h.wares.storage)), Priority.DECOR);
  }
  if (ctx.density !== 'none') for (const x of h.big ? [h.x0 + 2, x1 - 2] : [xc]) hangLantern(ctx, roof, x, hutZ(h, -1), H - 1);

  // Counter and display: wares smaller than half a block (B3), denser with more detail.
  const fill = input.detailLevel === 1 ? 0.5 : input.detailLevel === 2 ? 0.7 : 0.85;
  const wr = rng.fork('wares');
  for (let u = 1; u < W - 1; u++)
    for (const d of [0, 1]) if (wr.chance(fill)) set(b, h.x0 + u, 2, hutZ(h, d), wareState(wr.pick(h.wares.counter)), Priority.DECOR);

  // Mulled wine hut: two hanging lanterns over the counter and barrel tables in front.
  if (h.big) {
    if (ctx.density === 'normal' || ctx.density === 'many') for (const x of [h.x0 + 1, x1 - 1]) hangLantern(ctx, roof, x, hutZ(h, 1), H);
    for (const u of [1, W - 2]) {
      const x = h.x0 + u;
      const z = hutZ(h, 3);
      set(b, x, 1, z, blockState('barrel', { facing: 'up' }), Priority.DECOR);
      if (input.theme !== 'none') set(b, x, 2, z, blockState('red_candle', { candles: '1', lit: 'true' }), Priority.DECOR);
    }
  }
  return roof;
}

/** Fir green with warm lights along both eaves and the front verge (Christmas, B1). */
function dressHut(ctx: Ctx, h: HutPlan, roof: RoofResult): void {
  const { b } = ctx;
  const leaves = blockState('spruce_leaves', { persistent: 'true' });
  const x1 = h.x0 + h.width - 1;
  const zVerge = hutZ(h, h.overhangFront);
  const zBackVerge = hutZ(h, -h.depth);
  const step = sgnOf(h);
  const cells: { x: number; z: number }[] = [];
  // West eave back → front, verge west → east, east eave front → back: one continuous run.
  for (let z = zBackVerge; z !== zVerge; z += step) cells.push({ x: h.x0 - 1, z });
  for (let x = h.x0 - 1; x <= x1 + 1; x++) cells.push({ x, z: zVerge });
  for (let z = zVerge - step; z !== zBackVerge - step; z -= step) cells.push({ x: x1 + 1, z });
  let i = 0;
  for (const c of cells) {
    const low = roofUnderside(b, roof, c.x, c.z);
    if (low === null || !free(b, c.x, low - 1, c.z)) continue;
    set(b, c.x, low - 1, c.z, i % 3 === 1 ? ctx.light : leaves, Priority.DECOR);
    i++;
  }
}

/**
 * Lamp post after the vanilla snowy lamp posts (18, LP01–LP03): four fences, arms on top in
 * one to four directions, lanterns hanging under the arms in the third cell above the ground.
 */
function lampPost(ctx: Ctx, x: number, z: number, arms: readonly HorizontalDirection[]): void {
  const { b, style, input } = ctx;
  const fence = blockState(style.fence);
  for (let y = 1; y <= 4; y++) set(b, x, y, z, fence, Priority.STRUCTURE);
  for (const dir of arms) {
    const ax = x + (dir === 'east' ? 1 : dir === 'west' ? -1 : 0);
    const az = z + (dir === 'south' ? 1 : dir === 'north' ? -1 : 0);
    set(b, ax, 4, az, fence, Priority.STRUCTURE);
    set(b, ax, 3, az, blockState(input.lantern, { hanging: 'true' }), Priority.DECOR);
  }
}

export function buildMarket(input: StallInput, rng: SeededRandom): { builder: VoxelBuilder; stalls: HutPlan[]; layout: MarketLayout } {
  const style = STALL_STYLES[input.style];
  const n = stallCount(input.size);
  const looks = planLooks(rng, input, n);
  const twoRows = n > 1;
  const pairs = Math.ceil(n / 2);
  const lane = input.size === 'large' || input.size === 'huge' ? 9 : 7;
  const rowDepth = 5;
  const gap = 3;
  const marginW = 5;

  // Huts facing each other share their centre x (the light chain runs gable to gable).
  const centres: number[] = [];
  let cursor = marginW;
  for (let p = 0; p < pairs; p++) {
    const w = Math.max(...looks.filter((l) => Math.floor(l.index / 2) === p).map((l) => l.width));
    centres.push(cursor + (w - 1) / 2);
    cursor += w + gap;
  }
  const marketX1 = cursor - gap - 1;

  // Square with a tree from size large on (B5: 9×9 … 15×15 or more, tree height 14–18).
  const treeHeight = input.size === 'huge' ? 18 : input.size === 'large' ? 14 : 0;
  const treeR = treeHeight > 0 ? Math.max(...treeProfile(treeHeight).radii) : 0;
  const plazaSize = treeHeight > 0 ? Math.max(9, 2 * (treeR + 3) + 1) : 0;

  // z layout: north margin, north row, lane, south row, south margin (a single hut faces a
  // forecourt instead of a second row).
  const marginN = 2;
  const zFrontN = marginN + (twoRows ? rowDepth : 0) - 1;
  const laneZ0 = zFrontN + 1;
  const laneZ1 = zFrontN + lane;
  const zFrontS = laneZ1 + 1;
  const laneCz = Math.floor((laneZ0 + laneZ1) / 2);
  let zShift = 0;
  let length = zFrontS + rowDepth + 2;
  if (plazaSize > 0) {
    const half = (plazaSize - 1) / 2;
    zShift = Math.max(0, half + 1 - laneCz);
    length = Math.max(length + zShift, laneCz + zShift + half + 2);
  }
  const plazaX0 = marketX1 + 4;
  const width = plazaSize > 0 ? plazaX0 + plazaSize + 2 : marketX1 + 4;
  const maxRidge = Math.max(...looks.map((l) => l.wallHeight + (l.width + 1) / 2 + 2));
  const height = Math.max(maxRidge + 3, treeHeight + 3);
  const b = new VoxelBuilder({ width, height, length });
  const ctx: Ctx = {
    b,
    style,
    input,
    chain: blockState(profileBlockId('iron_chain', input.minecraftVersion), { axis: 'y' }),
    light: blockState(input.detailLevel >= 3 ? 'ochre_froglight' : 'glowstone', input.detailLevel >= 3 ? { axis: 'y' } : {}),
    post: postState(style, input.materialWishes?.frame),
    density: input.lanternDensity ?? 'normal',
  };

  const huts: HutPlan[] = looks.map((l) => {
    const row = twoRows ? l.index % 2 : 1;
    const p = Math.floor(l.index / 2);
    return { ...l, x0: centres[p]! - (l.width - 1) / 2, zFront: (row === 0 ? zFrontN : zFrontS) + zShift, front: row === 0 ? 'south' : 'north', ridgeY: 0 };
  });
  const layout: MarketLayout = { huts, lane: { z0: laneZ0 + zShift, z1: laneZ1 + zShift }, plaza: null, chains: [], lampPosts: [], presents: [] };

  // Ground: grass; the market paved with a calm stone mix (no two equal stones side by side).
  const gr = rng.fork('ground');
  const paving = ['cobblestone', 'stone_bricks', 'andesite', 'polished_andesite'] as const;
  const pavedZ0 = (twoRows ? marginN - 1 : laneZ0 - 1) + zShift;
  const pavedZ1 = zFrontS + rowDepth + zShift;
  const pave = (x: number, z: number, priority: PriorityValue) => {
    const near = new Set([x > 0 ? b.getBlock(x - 1, 0, z) : '', z > 0 ? b.getBlock(x, 0, z - 1) : '']);
    const options = paving.filter((p) => !near.has(blockState(p)));
    b.setBlock(x, 0, z, blockState(gr.pick(options.length > 0 ? options : paving)), priority);
  };
  for (let z = 0; z < length; z++)
    for (let x = 0; x < width; x++) {
      if (x >= marginW - 4 && x <= marketX1 + 2 && z >= pavedZ0 && z <= pavedZ1) pave(x, z, Priority.DECOR);
      else b.setBlock(x, 0, z, blockState('grass_block'), Priority.DECOR);
    }

  // Huts.
  const roofs = huts.map((h) => buildHut(ctx, h, rng.fork(`hut${h.index}`)));

  // Light chains across the lane, gable to gable, at the lowest common gable row (B5). Lights
  // only over the open lane; nothing ever hangs from these horizontal chains.
  if (twoRows && input.theme !== 'none') {
    const chainZ = blockState(profileBlockId('iron_chain', input.minecraftVersion), { axis: 'z' });
    for (let p = 0; p < pairs; p++) {
      const a = huts[2 * p];
      const c = huts[2 * p + 1];
      if (!a || !c) continue;
      const y = Math.max(a.wallHeight, c.wallHeight) + 1;
      const x = centres[p]!;
      const z0 = a.zFront + 1;
      const z1 = c.zFront - 1;
      const open0 = hutZ(a, a.overhangFront) + 1;
      const open1 = hutZ(c, c.overhangFront) - 1;
      for (let z = z0; z <= z1; z++) {
        const overLane = z >= open0 && z <= open1;
        set(b, x, y, z, overLane && (z - open0) % 3 === 1 ? ctx.light : chainZ, Priority.DECOR);
      }
      layout.chains.push({ x, y, z0, z1 });
    }
  }

  // Fir green after the chains, so a chain end keeps its cell under the verge.
  if (input.theme === 'christmas' && input.garland) huts.forEach((h, i) => dressHut(ctx, h, roofs[i]!));

  // Multi-arm lamp post at the open end of the lane (18, rec. 13); a single hut gets a
  // two-armed post beside its forecourt. Lantern density: none = no post, few = two arms
  // (one at a single hut), many = a second post at the other end of the lane.
  const postZ = laneCz + zShift;
  if (ctx.density !== 'none') {
    const full: HorizontalDirection[] = twoRows ? ['north', 'south', 'east', 'west'] : ['east', 'west'];
    const arms = ctx.density === 'few' ? full.slice(twoRows ? 2 : 1) : full;
    const spots = [twoRows ? marginW - 3 : huts[0]!.x0 - 3];
    if (ctx.density === 'many') spots.push(twoRows ? marketX1 + 2 : huts[0]!.x0 + huts[0]!.width + 1);
    for (const x of spots) {
      lampPost(ctx, x, postZ, arms);
      layout.lampPosts.push({ x, z: postZ, arms: arms.length });
    }
  }

  // The square: a tree in the middle, a ring of light stone, benches facing the tree, presents
  // under it.
  if (plazaSize > 0) {
    const half = (plazaSize - 1) / 2;
    const cx = plazaX0 + half;
    const cz = laneCz + zShift;
    const pr = rng.fork('plaza');
    for (let x = plazaX0; x < plazaX0 + plazaSize; x++)
      for (let z = cz - half; z <= cz + half; z++) {
        const dist = Math.round(Math.hypot(x - cx, z - cz));
        const id = dist <= 1 ? 'coarse_dirt' : dist === treeR + 1 ? 'polished_andesite' : pr.chance(0.15) ? 'cracked_stone_bricks' : 'stone_bricks';
        b.setBlock(x, 0, z, blockState(id), Priority.STRUCTURE);
      }
    // Paving between the lane and the square.
    for (let x = marketX1 + 3; x < plazaX0; x++) for (let z = laneZ0 + zShift; z <= laneZ1 + zShift; z++) pave(x, z, Priority.STRUCTURE);
    buildChristmasTree(b, rng.fork('tree'), cx, 1, cz, treeHeight, { theme: input.theme, intensity: input.detailLevel, lights: input.theme !== 'none', star: input.theme !== 'none' });
    layout.plaza = { x0: plazaX0, z0: cz - half, x1: plazaX0 + plazaSize - 1, z1: cz + half, treeX: cx, treeZ: cz };

    // Benches (stairs with trapdoor armrests) on three sides, facing the tree.
    const dist = treeR + 2;
    const seat = (facing: HorizontalDirection) => blockState(requireForm(style.floor, 'stairs'), { facing, half: 'bottom' });
    const arm = (dir: HorizontalDirection) => blockState(style.board, { facing: dir, half: 'bottom', open: 'true' });
    const benches: { x: number; z: number; facing: HorizontalDirection; along: 'x' | 'z' }[] = [
      { x: cx, z: cz - dist, facing: 'north', along: 'x' },
      { x: cx, z: cz + dist, facing: 'south', along: 'x' },
      { x: cx + dist, z: cz, facing: 'east', along: 'z' },
    ];
    for (const bench of benches) {
      for (const k of [-1, 0, 1]) {
        const x = bench.along === 'x' ? bench.x + k : bench.x;
        const z = bench.along === 'z' ? bench.z + k : bench.z;
        if (free(b, x, 1, z)) set(b, x, 1, z, seat(bench.facing), Priority.DECOR);
      }
      const ends: [number, number, HorizontalDirection][] =
        bench.along === 'x'
          ? [
              [bench.x - 2, bench.z, 'west'],
              [bench.x + 2, bench.z, 'east'],
            ]
          : [
              [bench.x, bench.z - 2, 'north'],
              [bench.x, bench.z + 2, 'south'],
            ];
      for (const [x, z, dir] of ends) if (free(b, x, 1, z)) set(b, x, 1, z, arm(dir), Priority.DECOR);
    }

    // Presents in one group of 3–5 at the foot of the tree (17, A7 and rec. 11).
    if (input.theme === 'christmas' && input.presents) {
      const colors = ['red', 'white', 'green', 'yellow'] as const;
      const angle = pr.next() * Math.PI * 2;
      const want = pr.int(3, 5);
      const placed: { x: number; z: number }[] = [];
      for (let ring = 1; ring <= treeR + 2 && placed.length < want; ring++)
        for (let k = -2; k <= 2 && placed.length < want; k++) {
          const a = angle + (k * 0.9) / ring;
          const x = Math.round(cx + Math.cos(a) * ring);
          const z = Math.round(cz + Math.sin(a) * ring);
          if (placed.some((p) => p.x === x && p.z === z) || !free(b, x, 1, z) || !free(b, x, 2, z)) continue;
          const color = colors[placed.length % colors.length]!;
          set(b, x, 1, z, blockState(`${color}_wool`), Priority.DECOR);
          set(b, x, 2, z, blockState(`${color === 'red' ? 'white' : 'red'}_carpet`), Priority.DECOR);
          placed.push({ x, z });
        }
      layout.presents.push(...placed);
    }
  }
  return { builder: b, stalls: huts, layout };
}

/** Corner posts: the frame wish (its log, else its block) or the style's post. */
function postState(style: StallStyle, frame: string | undefined): string {
  if (frame && hasMaterial(frame)) {
    const id = formOf(frame, 'pillar') ?? formOf(frame, 'block');
    if (id) return uprightState(id);
  }
  return blockState(style.post, { axis: 'y' });
}
