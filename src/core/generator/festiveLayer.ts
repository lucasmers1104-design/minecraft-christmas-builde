import type { HorizontalDirection } from '@/core/blocks/directions';
import { supportsCenter } from '@/core/blocks/faces';
import { blockIdOf, blockState, definitionOf, propsOf } from '@/core/blocks/registry';
import { Priority, type VoxelBuilder } from '@/core/generator/geometry';
import type { SeededRandom } from '@/core/generator/seededRandom';
import { buildChristmasTree, treeProfile, type TreeResult } from '@/core/generator/christmasTree';
import { decorateFestive } from '@/core/generator/festive';
import { festiveChoices, festiveKit } from '@/core/generator/festiveKits';
import { buildJulbock, buildWoodpile, julbockCells, type Cell } from '@/core/generator/festiveProps';
import { presentsAroundTree } from '@/core/generator/presents';
import type { HouseResult } from '@/core/generator/house/buildHouse';
import type { HouseInput } from '@/core/generator/house/plan';
import { floorY, storeyRect } from '@/core/generator/house/plan';
import { facadeOf, facadePos } from '@/core/generator/house/walls';
import type { BuildSpec } from '@/core/schema/buildSpec';

/**
 * Entry points of the festive layer for the building generator (`generateBuilding.ts` only
 * calls these): the stand-alone tree plot, and for houses and towers the garden tree with its
 * presents, garlands, wreaths, candles and the style extras (woodpile, julbock, parapet
 * lights). Which motifs appear by default comes from the style kits (`festiveKits.ts`); an
 * explicit wish always wins.
 */

export const TREE_PLOT_HEIGHT: Readonly<Record<BuildSpec['size'], number>> = { small: 12, medium: 18, large: 26, huge: 40 };

/** Garden tree height by house size (report 14 B1: grows with the house, 9–13, +2 at detail 3). */
/** Below this height a tree is only a green column: then no garden tree at all. */
const MIN_GARDEN_TREE = 9;
const GARDEN_TREE_HEIGHT: Readonly<Record<BuildSpec['size'], number>> = { small: 9, medium: 10, large: 11, huge: 12 };

/** Half width of the tree plot: crown radius plus room for lobes and presents in front. */
export function treePlotHalf(height: number): number {
  return Math.max(...treeProfile(height).radii) + 5;
}

function treeOptions(spec: BuildSpec, lantern: 'lantern' | 'soul_lantern') {
  return {
    theme: spec.theme,
    intensity: spec.detailLevel,
    lights: true,
    star: spec.theme !== 'none',
    style: spec.style,
    snow: spec.options.snow === true,
    lantern,
    minecraftVersion: spec.targetMinecraftVersion,
  } as const;
}

/**
 * Stand-alone tree (building type "tree") with its trunk at (half, 1, half), presents in
 * groups under and in front of it.
 */
export function decorateTreePlot(b: VoxelBuilder, rng: SeededRandom, spec: BuildSpec, half: number): TreeResult {
  const height = TREE_PLOT_HEIGHT[spec.size];
  const tree = buildChristmasTree(b, rng.fork('tree'), half, 1, half, height, treeOptions(spec, spec.options.soulLanterns ? 'soul_lantern' : 'lantern'));
  // The tree is the wish here: presents belong under it, except in the japanese kits.
  const byDefault = spec.theme === 'christmas' && spec.detailLevel >= 2 && spec.style !== 'japanese' && spec.style !== 'cherry';
  if (spec.theme !== 'none' && (spec.options.presents ?? byDefault)) {
    const count = Math.min(12, Math.max(2, Math.round(1.2 * tree.bottomRadius)) + (spec.detailLevel === 3 ? 1 : 0));
    presentsAroundTree(b, rng.fork('presents'), tree, half, 1, half, festiveKit(spec.style).present, { count, big: height >= 18, stack: height >= 26 });
  }
  return tree;
}


/**
 * True if a tree of height h with its trunk at (cx, 1, cz) fits: the trunk column is free
 * under the crown, every crown layer (with lobes, fringe and hanging tips) and the star find
 * air. Low garden things under the crown edge (hedge, flowers) may stay.
 */
function treeFits(b: VoxelBuilder, cx: number, cz: number, h: number): boolean {
  const shape = treeProfile(h);
  const C = shape.radii.length;
  const bottomY = 1 + shape.trunkBelow;
  const crownTop = bottomY + C - 1;
  const disc = (y: number, r: number) => {
    const reach = Math.ceil(r);
    for (let dx = -reach; dx <= reach; dx++)
      for (let dz = -reach; dz <= reach; dz++) {
        if (Math.hypot(dx, dz) > r) continue;
        if (!b.inside(cx + dx, y, cz + dz) || !b.isAir(cx + dx, y, cz + dz)) return false;
      }
    return true;
  };
  for (let y = 1; y < bottomY; y++) if (!disc(y, 1)) return false;
  const rims = new Set(shape.tiers.map((t) => t.to));
  for (let i = 0; i < C; i++) {
    const r = shape.radii[i]! * 1.15 + 1.2;
    if (!disc(crownTop - i, r)) return false;
    if (rims.has(i) && crownTop - i - 1 >= 1 && !disc(crownTop - i - 1, r)) return false;
  }
  const starR = shape.star === 'star7' ? 4 : shape.star === 'star5' ? 2 : 1;
  for (let y = crownTop + 1; y <= crownTop + shape.starHeight + 1; y++) if (!disc(y, starR)) return false;
  return true;
}

/**
 * Garden tree: the tallest tree from the wished height down to 9 (smaller ones read as a
 * green column, then there is none) that fits with its trunk on
 * a free yard cell: at a front corner beside the facade (not in front of it), else in a side
 * yard, else wherever it fits; always away from the path.
 */
function placeGardenTree(b: VoxelBuilder, rng: SeededRandom, spec: BuildSpec, input: HouseInput, house: HouseResult, yard: readonly Cell[]): (TreeResult & { cx: number; cz: number }) | null {
  const main = house.plan.masses[0]!;
  const doorX = house.plan.door.x;
  const wished = GARDEN_TREE_HEIGHT[spec.size] + (spec.detailLevel >= 3 ? 2 : 0);
  const { x0, x1, z0 } = main.rect;
  const rank = (c: Cell) => {
    const beside = c.x < x0 - 1 || c.x > x1 + 1;
    if (beside && c.z < z0 + 2) return 0;
    if (beside) return 1;
    return c.z < z0 ? 2 : 3;
  };
  const candidates = yard
    .filter((c) => b.isAir(c.x, 1, c.z))
    .sort((p, q) => rank(p) - rank(q) || p.x - q.x || Math.abs(q.x - doorX) - Math.abs(p.x - doorX) || p.z - q.z);
  // A good place beats a little height: each place group first tries the top two heights.
  const tries: { maxRank: number; h: number }[] = [];
  for (let r = 0; r <= 3; r++) for (let h = wished; h >= Math.max(MIN_GARDEN_TREE, wished - 2); h--) tries.push({ maxRank: r, h });
  for (let h = wished - 3; h >= MIN_GARDEN_TREE; h--) tries.push({ maxRank: 3, h });
  for (const { maxRank, h } of tries) {
    const R = Math.max(...treeProfile(h).radii);
    for (const c of candidates) {
      if (rank(c) > maxRank) break;
      if (Math.abs(c.x - doorX) <= R + 2 || !treeFits(b, c.x, c.z, h)) continue;
      const tree = buildChristmasTree(b, rng, c.x, 1, c.z, h, treeOptions(spec, input.lantern));
      return { ...tree, cx: c.x, cz: c.z };
    }
  }
  return null;
}

/**
 * Places for candles in front of windows: the cell in front of the lowest glass row of every
 * window column, if the block below it carries a candle (template sill, plinth or beam top).
 * Many window templates have no sill of their own; the plinth or the storey band then is one.
 */
function windowSills(b: VoxelBuilder, house: HouseResult): (Cell & { side: HorizontalDirection })[] {
  const out: (Cell & { side: HorizontalDirection })[] = [];
  const glass = (x: number, y: number, z: number) => b.inside(x, y, z) && blockIdOf(b.getBlock(x, y, z)).includes('glass');
  const { plan } = house;
  for (const mass of plan.masses) {
    if (mass.round) continue;
    for (let k = 0; k < mass.floors; k++) {
      const rect = storeyRect(mass, k);
      const y0 = floorY(plan, k) + 1;
      const y1 = floorY(plan, k + 1) - 1;
      for (const side of ['north', 'east', 'south', 'west'] as const) {
        if (mass.joins[side]) continue;
        const f = facadeOf(rect, side);
        for (let u = 0; u < f.length; u++) {
          const w = facadePos(f, u, 0);
          const front = facadePos(f, u, 1);
          for (let y = y0; y <= y1; y++) {
            if (!glass(w.x, y, w.z) || glass(w.x, y - 1, w.z)) continue;
            if (!b.inside(front.x, y, front.z) || !b.isAir(front.x, y, front.z)) continue;
            const below = b.getBlock(front.x, y - 1, front.z);
            if (below === 'minecraft:air' || !supportsCenter(below, 'up')) continue;
            out.push({ x: front.x, y: y - 1, z: front.z, side });
          }
        }
      }
    }
  }
  return out;
}

/**
 * Woodpile (14 F5, 10 T12) against a side wall: 3–5 logs long, two high with stepped ends,
 * on the apron row in front of the plinth, never in front of windows or doors.
 */
function placeWoodpile(b: VoxelBuilder, house: HouseResult, nordic: boolean): boolean {
  const reserved = house.openings.reserved;
  const blocked = (x: number, y: number, z: number) => {
    if (!b.inside(x, y, z)) return true;
    const s = b.getBlock(x, y, z);
    const def = definitionOf(s);
    return def.id.includes('glass') || def.id.includes('bars') || def.shape === 'door' || def.shape === 'trapdoor';
  };
  for (const side of ['east', 'west', 'south'] as const) {
    for (const mass of house.plan.masses) {
      if (mass.round || mass.joins[side]) continue;
      const f = facadeOf(storeyRect(mass, 0), side);
      const usable = (u: number): Cell | null => {
        const p = facadePos(f, u, 2);
        const y = 1;
        if (!b.inside(p.x, y + 1, p.z) || reserved.has(`${p.x},${y},${p.z}`)) return null;
        const s = b.getBlock(p.x, y, p.z);
        const apron = blockIdOf(s).endsWith('_stairs') && propsOf(s).half === 'bottom';
        if (!(b.isAir(p.x, y, p.z) || apron) || !b.isAir(p.x, y + 1, p.z) || b.isAir(p.x, 0, p.z)) return null;
        for (let d = 0; d <= 1; d++)
          for (let dy = 0; dy <= 1; dy++) {
            const q = facadePos(f, u, d);
            if (blocked(q.x, y + dy, q.z)) return null;
          }
        return { x: p.x, y, z: p.z };
      };
      for (const len of [5, 4, 3]) {
        const starts: number[] = [];
        for (let u0 = 1; u0 + len <= f.length - 1; u0++) starts.push(u0);
        // Centre of the wall first.
        starts.sort((p, q) => Math.abs(p + len / 2 - f.length / 2) - Math.abs(q + len / 2 - f.length / 2));
        for (const u0 of starts) {
          const cells: Cell[] = [];
          for (let u = u0; u < u0 + len; u++) {
            const c = usable(u);
            if (!c) break;
            cells.push(c);
          }
          if (cells.length < len) continue;
          buildWoodpile(b, cells, side === 'east' || side === 'west' ? 'x' : 'z', nordic ? 5 : 0);
          return true;
        }
      }
    }
  }
  return false;
}

/** Julbock in the yard: a free strip on grass with one cell of air around it. */
function placeJulbock(b: VoxelBuilder, yard: readonly Cell[]): boolean {
  const sorted = [...yard].sort((p, q) => p.z - q.z || p.x - q.x);
  for (const c of sorted)
    for (const [along, forward] of [['x', 1], ['x', -1], ['z', -1], ['z', 1]] as const) {
      const parts = julbockCells({ x: c.x, y: 1, z: c.z }, along, forward);
      const cells = parts.map((p) => p.cell);
      const ok = cells.every((p) => {
        if (!b.inside(p.x, p.y, p.z) || !b.isAir(p.x, p.y, p.z)) return false;
        for (let dx = -1; dx <= 1; dx++)
          for (let dz = -1; dz <= 1; dz++) {
            const nx = p.x + dx;
            const nz = p.z + dz;
            if (!b.inside(nx, p.y, nz)) return false;
            const n = b.getBlock(nx, p.y, nz);
            if (n !== 'minecraft:air' && !cells.some((q) => q.x === nx && q.y === p.y && q.z === nz)) return false;
          }
        return true;
      });
      const legs = parts.filter((p) => p.part === 'leg').every((p) => b.getBlock(p.cell.x, 0, p.cell.z) === blockState('grass_block'));
      if (!ok || !legs) continue;
      buildJulbock(b, { x: c.x, y: 1, z: c.z }, along, forward);
      return true;
    }
  return false;
}

/**
 * Light band on flat roofs (12 E9 "Lichtband im Wandkopf", 14 GA4): every second block of the
 * parapet body (the full trim block under the crown slab) becomes a light, corners stay; the
 * silhouette does not change. With snow an exposed copper bulb (light 12) keeps the snow.
 */
function placeParapetLights(b: VoxelBuilder, house: HouseResult, snow: boolean): number {
  const light = snow ? blockState('waxed_exposed_copper_bulb', { lit: 'true' }) : blockState('pearlescent_froglight', { axis: 'y' });
  let placed = 0;
  for (const s of house.sections) {
    if (s.type !== 'flat') continue;
    const X0 = s.x0 - s.overhang;
    const X1 = s.x1 + s.overhang;
    const Z0 = s.z0 - s.overhang;
    const Z1 = s.z1 + s.overhang;
    const y = s.wallTop + 1;
    const sides: [number, number][][] = [[], [], [], []];
    for (let x = X0 + 1; x < X1; x++) {
      sides[0]!.push([x, Z0]);
      sides[2]!.push([x, Z1]);
    }
    for (let z = Z0 + 1; z < Z1; z++) {
      sides[1]!.push([X1, z]);
      sides[3]!.push([X0, z]);
    }
    for (const side of sides)
      side.forEach(([x, z], i) => {
        // Symmetric on each side: lights on every second cell counted from both ends.
        if (i % 2 === 0 || side.length - 1 - i < 1 || !b.inside(x, y + 1, z)) return;
        const body = b.getBlock(x, y, z);
        const crown = b.getBlock(x, y + 1, z);
        if (definitionOf(body).shape !== 'cube' || !blockIdOf(crown).endsWith('_slab')) return;
        if (b.setBlock(x, y, z, light, Priority.ROOF)) placed++;
      });
  }
  return placed;
}

/**
 * Festive layer of a house or tower: garden tree with presents underneath, then garlands,
 * lanterns, wreaths, candles and entrance presents (`decorateFestive`), then the extras of the
 * style kit.
 */
export function decorateHouseFestive(builder: VoxelBuilder, rng: SeededRandom, spec: BuildSpec, input: HouseInput, house: HouseResult, yard: readonly Cell[]): void {
  if (spec.theme === 'none') return;
  const kit = festiveKit(spec.style);
  const choice = festiveChoices(spec.style, spec.theme, spec.detailLevel, spec.options);
  const christmas = spec.theme === 'christmas';

  let underTree = 0;
  const tree = choice.tree ? placeGardenTree(builder, rng.fork('gardenTree'), spec, input, house, yard) : null;
  if (tree && choice.presents && christmas) {
    const count = Math.min(kit.maxPresents, spec.detailLevel >= 3 ? 5 : 3);
    underTree = presentsAroundTree(builder, rng.fork('treePresents'), tree, tree.cx, 1, tree.cz, kit.present, { count, big: false, stack: false });
  }
  const atDoor = !choice.presents ? 0 : tree ? (spec.detailLevel >= 3 ? 2 : 0) : 3;
  decorateFestive(
    builder,
    rng.fork('festive'),
    { eaves: house.roof.eaveCells, doors: house.openings.doors, sills: [...house.openings.sills, ...windowSills(builder, house)], yard, gables: house.roof.gableCells, reserved: house.openings.reserved },
    {
      theme: spec.theme,
      intensity: spec.detailLevel,
      garland: choice.garland,
      presents: atDoor > 0,
      entrancePresents: Math.max(0, Math.min(atDoor, kit.maxPresents - underTree)),
      lantern: input.lantern,
      lanternDensity: input.lanternDensity,
      minecraftVersion: spec.targetMinecraftVersion,
      style: spec.style,
      snow: spec.options.snow === true,
      size: spec.size,
    },
  );
  const extras = kit.extras[christmas ? 'christmas' : 'winter'];
  if (extras.includes('woodpile') && spec.detailLevel >= 2) placeWoodpile(builder, house, spec.style === 'nordic');
  if (extras.includes('julbock') && spec.size !== 'small' && spec.detailLevel >= 2) placeJulbock(builder, yard);
  if (extras.includes('parapetLights') && spec.detailLevel >= 2) placeParapetLights(builder, house, spec.options.snow === true);
}

