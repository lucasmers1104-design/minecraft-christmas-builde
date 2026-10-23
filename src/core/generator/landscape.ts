import { VECTOR, clockwise } from '@/core/blocks/directions';
import { isFaceFull } from '@/core/blocks/faces';
import { AIR, blockIdOf, blockState, definitionOf } from '@/core/blocks/registry';
import { Priority, type VoxelBuilder } from '@/core/generator/geometry';
import type { SeededRandom } from '@/core/generator/seededRandom';
import { valueNoise } from '@/core/generator/seededRandom';
import { BORDER_INSET, buildBorder, type BorderResult } from '@/core/generator/borders';
import { placePond, placeProps, placeRocks, plantBeds, plantBushes, plantState, plantTrees, reserveAnchor, type GardenOptions, type PlacedTree } from '@/core/generator/garden';
import { cellHash, clusteredAssign, pickBy, plantable, plotFrame, Site, Use, type PlotFrame } from '@/core/generator/landscapeSite';
import { LandscapeMaterials } from '@/core/generator/landscapeMaterials';
import { landscapeStyle, type LandscapeStyle } from '@/core/generator/landscapeStyles';
import { paintPath, planPath, rowCells, type Entrance, type PathPlan } from '@/core/generator/paths';
import { LAMP_DESIGNS, lampCells, rotateOffset } from '@/core/templates/lampPosts';
import type { RoleMaterials } from '@/core/templates/place';
import type { SizeClass, StyleId, Theme } from '@/core/style/styles';

export type { Entrance } from '@/core/generator/paths';

/**
 * Landscape around a building (research note 15_gelaende_gaerten_wege.md; lamp posts after
 * 18_beleuchtung.md; winter rules after 14_winter_weihnachten.md). Order of work:
 *
 * 1. ground layer wherever the building left y = 0 empty (snow block only on request, never
 *    under the eaves),
 * 2. the main path from the door to the plot edge (paths.ts),
 * 3. lamp posts from the style's catalogue at the gate and in a rhythm of 8–12 along the path,
 * 4. the border with its gate (borders.ts),
 * 5. room for a christmas tree, flower beds, trees, props, bushes, rocks, a frozen pond in
 *    winter (garden.ts),
 * 6. ground texture by cause (wear, shade, soft patches), a dissolved plot edge (outer rings
 *    only grass, ragged, never straight for more than 6) and lawn plants.
 *
 * All landscape writes use DECOR priority, so nothing here can block a door clearance or
 * replace a part of the building. Same seed ⇒ same landscape (every part has its own fork).
 */

export interface LandscapeOptions {
  style: StyleId;
  theme: Theme;
  garden: boolean;
  lantern: 'lantern' | 'soul_lantern';
  lanternDensity: 'none' | 'few' | 'normal' | 'many';
  snowGround: boolean;
  /** Palette materials of the building (path, frame, beam, wall, plinth, shutter …). */
  materials: RoleMaterials;
  minecraftVersion: string;
  size: SizeClass;
  detailLevel: 1 | 2 | 3;
  /** The caller plants a christmas tree on the first yard cell: keep a spot free for it. */
  christmasTree: boolean;
}

export interface LandscapeResult {
  /** Free ground cells (y = first free row) for the christmas tree (first entry) and presents. */
  yard: { x: number; y: number; z: number }[];
  /** What was planned (for tests and diagnostics). */
  report: LandscapeReport;
}

export interface LandscapeReport {
  /** Site analysis made before anything was built. */
  site: Site;
  path: PathPlan | null;
  lamps: LampPost[];
  border: BorderResult | null;
  trees: PlacedTree[];
  anchor: [number, number] | null;
}

export function buildLandscape(b: VoxelBuilder, rng: SeededRandom, entrances: readonly Entrance[], o: LandscapeOptions): LandscapeResult {
  const site = new Site(b);
  const ls = landscapeStyle(o.style, o.theme);
  const m = new LandscapeMaterials(o.materials, o.minecraftVersion, ls.border.wood);
  const main = entrances[0];
  const frame = plotFrame(site.W, site.L, main?.outward ?? 'north');
  const flowers = o.theme === 'none';

  // 1. Ground: snow only where it would lie in the game (not under the eaves).
  for (let x = 0; x < site.W; x++)
    for (let z = 0; z < site.L; z++) {
      if (!site.owned[site.i(x, z)]) continue;
      site.set(x, 0, z, blockState(o.snowGround && !site.covered[site.i(x, z)] ? 'snow_block' : 'grass_block'));
    }

  const r = rng.fork('landscape');
  if (!o.garden || !main) {
    const anchor = o.christmasTree && main ? reserveAnchor(site, frame, main, r) : null;
    dissolveEdge(site, r.fork('edge'), new Set());
    return { yard: yardCells(site, main, anchor), report: { site, path: null, lamps: [], border: null, trees: [], anchor } };
  }

  // 2. Paths: the main path crosses the front border line at the gate.
  const bordered = ls.border.front !== 'none' && ls.border.front !== 'boxHedge';
  const gateStep = bordered ? stepToFrontLine(site, frame, main, BORDER_INSET) : null;
  const plan = planPath(site, main, ls.path, o.size, gateStep, r.fork('path'));
  paintPath(site, plan, ls.path, { path: m.pathBlock(), seed: r.fork('pathPaint').int(0, 2 ** 31 - 1), snow: o.snowGround });
  for (const [k, e] of entrances.slice(1).entries()) {
    const extra = planPath(site, e, ls.path, 'small', null, r.fork(`path${k + 1}`));
    paintPath(site, extra, ls.path, { path: m.pathBlock(), seed: r.fork(`pathPaint${k + 1}`).int(0, 2 ** 31 - 1), snow: o.snowGround });
  }

  // 3. Lamp posts (before the border, so a lamp can stand beside the gate as its post).
  const gateCells = gateStep !== null ? rowCells(plan, gateStep).map((c): [number, number] => [c.x, c.z]) : [];
  const lampPosts = placeLamps(site, frame, plan, ls, o, gateStep, r.fork('lamps'));

  // 4. Border with gate.
  const gatePosts = lampPosts.filter((p) => p.gate).map((p): [number, number] => [p.x, p.z]);
  const border = buildBorder(site, frame, ls, m, { cells: gateCells, lampPosts: gatePosts }, { flowers }, r.fork('border'));

  // 5. Garden.
  const anchor = o.christmasTree ? reserveAnchor(site, frame, main, r) : null;
  const g: GardenOptions = { detailLevel: o.detailLevel, minecraftVersion: o.minecraftVersion, flowers };
  plantBeds(site, ls, g, r.fork('beds'));
  // Winter: the frozen pond is the second anchor, before trees take the space.
  if (o.theme !== 'none') placePond(site, frame, r.fork('pond'));
  const trees = plantTrees(site, frame, ls, g, r.fork('trees'));
  placeProps(site, frame, ls, m, g, r.fork('props'));
  plantBushes(site, ls, g, border.gatePosts, r.fork('bushes'));
  placeRocks(site, frame, ls, r.fork('rocks'));

  // 6. Ground texture, plot edge, lawn plants.
  textureGround(site, ls, r.fork('ground'));
  const borderEdges = new Set<number>();
  for (const [x, z] of border.cells) {
    if (z === BORDER_INSET) borderEdges.add(0);
    if (site.L - 1 - z === BORDER_INSET) borderEdges.add(1);
    if (x === BORDER_INSET) borderEdges.add(2);
    if (site.W - 1 - x === BORDER_INSET) borderEdges.add(3);
  }
  dissolveEdge(site, r.fork('edge'), borderEdges);
  plantLawn(site, ls, o, r.fork('lawn'));
  fixPathsUnderSolids(site);
  return { yard: yardCells(site, main, anchor), report: { site, path: plan, lamps: lampPosts, border, trees, anchor } };
}

/** Step of the entrance's axis that lies on the front border line (needs a path of ≥ 3 steps first). */
function stepToFrontLine(site: Site, frame: PlotFrame, e: Entrance, inset: number): number | null {
  const [ox, , oz] = VECTOR[e.outward];
  for (let s = 0; ; s++) {
    const x = e.x + ox * s;
    const z = e.z + oz * s;
    if (!site.inside(x, z)) return null;
    if (frame.toPlot(x, z)[1] === inset) return s >= 3 ? s : null;
  }
}

export interface LampPost {
  x: number;
  z: number;
  gate: boolean;
}

/** Spacing of lamp posts along the path (research 18, recommendation 4). */
const LAMP_SPACING = { none: 0, few: 0, normal: 11, many: 8 } as const;

/**
 * Lamp posts from the style's catalogue: one design per building, the last post at the gate
 * (a pair only as gate motif with "many"), further posts every 8–12 steps towards the door,
 * alternating sides, one block beside the path edge and never closer than 6 to each other.
 */
function placeLamps(site: Site, frame: PlotFrame, plan: PathPlan, ls: LandscapeStyle, o: LandscapeOptions, gateStep: number | null, rng: SeededRandom): LampPost[] {
  if (o.lanternDensity === 'none') return [];
  const designs = ls.lamps.map((id) => LAMP_DESIGNS[id]).filter((d) => Math.max(...d.cells.map((c) => c.y)) < site.H - 1);
  if (designs.length === 0) return [];
  const design = rng.pick(designs);
  const ctx = { materials: o.materials, minecraftVersion: o.minecraftVersion, lantern: o.lantern };
  const [sx, sz] = plan.side;
  const turnsFor = (sign: number) => {
    // The arm (+x in the design) points from the post towards the path: −sign · side.
    for (let t = 0; t < 4; t++) {
      const [dx, dz] = rotateOffset(1, 0, t);
      if (dx === -sign * sx && dz === -sign * sz) return t;
    }
    return 0;
  };
  const posts: LampPost[] = [];
  const tryAt = (s: number, sign: number, atGate: boolean): boolean => {
    if (s < 0 || s >= plan.rows.length) return false;
    // Rows without cells (stepping-stone gaps, plate joints) use the centre line.
    const ts = plan.rows[s]!.length > 0 ? plan.rows[s]! : [plan.centre[s] ?? 0];
    const edgeT = sign > 0 ? Math.max(...ts) : Math.min(...ts);
    const t = edgeT + sign * (1 + (atGate ? 0 : design.footprint));
    const [x, z] = plan.at(s, t);
    if (posts.some((p) => Math.max(Math.abs(p.x - x), Math.abs(p.z - z)) < (atGate && p.gate ? 2 : 6))) return false;
    const cells = lampCells(design, x, z, turnsFor(sign), ctx);
    if (!lampFits(site, cells)) return false;
    for (const c of cells) {
      site.set(c.x, c.y, c.z, c.state);
      if (c.y === 1) site.claim(c.x, c.z, Use.LAMP);
    }
    posts.push({ x, z, gate: atGate });
    return true;
  };

  // The gate: the lamp stands in the border line as one gate post (inside if the gate has an arch).
  const n = plan.rows.length;
  const gateRow = gateStep ?? n - 1 - BORDER_INSET;
  const inLine = gateStep !== null && !ls.border.arch && design.footprint === 0;
  const first = rng.chance(0.5) ? 1 : -1;
  // Without a border the "gate" lamp marks the plot entrance, two blocks inside the edge.
  const gateRows = gateStep === null ? [gateRow, gateRow - 1, gateRow - 2, gateRow - 3] : inLine ? [gateRow, gateRow - 1, gateRow - 2] : [gateRow - 1, gateRow - 2, gateRow - 3];
  let side = first;
  let placedGate = false;
  for (const s of gateRows) {
    if (s < 3) continue;
    for (const sign of [first, -first]) {
      if (tryAt(s, sign, inLine && s === gateStep)) {
        side = sign;
        placedGate = true;
        break;
      }
    }
    if (placedGate) break;
  }
  // "many": a pair as gate motif, on the same row.
  if (o.lanternDensity === 'many' && placedGate) {
    const p = posts[0]!;
    const [, pv] = frame.toPlot(p.x, p.z);
    for (let s = 0; s < n; s++) if (plan.rows[s]?.length && frame.toPlot(...plan.at(s, 0))[1] === pv) tryAt(s, -side, p.gate);
  }
  // Rhythm towards the door, alternating sides; the first post stays ≥ 4 steps from the door.
  const spacing = LAMP_SPACING[o.lanternDensity];
  if (spacing > 0) {
    for (let s = gateRow - spacing; s >= 4; s -= spacing) {
      side = -side;
      if (!tryAt(s, side, false)) tryAt(s, -side, false);
    }
  }
  return posts;
}

/** Every lamp cell inside, free, off the building; the post itself on free lawn, not at the edge. */
function lampFits(site: Site, cells: readonly { x: number; y: number; z: number }[]): boolean {
  for (const c of cells) {
    if (!site.b.inside(c.x, c.y, c.z) || !site.b.isAir(c.x, c.y, c.z)) return false;
    const use = site.usage(c.x, c.z);
    if (use === Use.RESERVED || site.distBuilt[site.i(c.x, c.z)]! < 1) return false;
    if (c.y <= 2 && (!site.isFree(c.x, c.z) || site.edge(c.x, c.z) < 2 || site.distBuilt[site.i(c.x, c.z)]! < 2)) return false;
    if (use === Use.PATH && c.y < 3) return false;
  }
  return true;
}

/**
 * Ground texture by cause (research 15, T7): trodden ground beside path, gate and lamps,
 * shade under eaves and crowns, and soft value-noise patches in the open lawn. The two outer
 * rings stay plain grass.
 */
function textureGround(site: Site, ls: LandscapeStyle, rng: SeededRandom): void {
  const seed = rng.int(0, 2 ** 31 - 1);
  const b = site.b;
  const grass = blockState('grass_block');
  const formal = ls.ground.patchShare < 0.05;
  const open: [number, number][] = [];
  for (let z = 0; z < site.L; z++)
    for (let x = 0; x < site.W; x++) {
      const i = site.i(x, z);
      if (!site.owned[i] || site.use[i] !== Use.FREE || b.getBlock(x, 0, z) !== grass || site.edge(x, z) < 2) continue;
      let nearUse = 9;
      for (let dx = -2; dx <= 2; dx++)
        for (let dz = -2; dz <= 2; dz++) {
          const u = site.usage(x + dx, z + dz);
          if (u === Use.PATH || u === Use.LAMP) nearUse = Math.min(nearUse, Math.max(Math.abs(dx), Math.abs(dz)));
        }
      let crown = false;
      for (let y = 2; y < site.H && !crown; y++) if (b.getBlock(x, y, z).includes('_leaves')) crown = true;
      const n = valueNoise(seed, x, 0, z, 2.2);
      const wear = (nearUse <= 1 ? 0.36 : nearUse <= 2 ? 0.12 : 0) * (formal ? 0.2 : 1);
      const shade = site.covered[i] ? 0.55 : crown ? 0.35 : 0;
      const h = cellHash(seed, x, z, 1);
      if (n < wear) site.set(x, 0, z, blockState(pickWear(ls, h, b.isAir(x, 1, z))));
      else if (1 - n < shade) site.set(x, 0, z, blockState(pickBy(ls.ground.shade, h)));
      else if (!site.covered[i] && !crown && nearUse > 2 && b.isAir(x, 1, z)) open.push([x, z]);
    }
  // Soft patches: the cells with the highest noise, so patches are clusters with ragged edges.
  const share = ls.ground.patchShare;
  const patches = clusteredAssign(open, [
    ['grass', 1 - share],
    ['patch', share],
  ] as const, (x, z) => valueNoise(seed + 1, x, 0, z, 3.5) + cellHash(seed, x, z, 2) * 0.15);
  for (const [x, z] of open) if (patches.get(`${x},${z}`) === 'patch') site.set(x, 0, z, blockState(pickBy(ls.ground.patch, cellHash(seed, x, z, 3))));
}

function pickWear(ls: LandscapeStyle, u: number, freeAbove: boolean): string {
  const id = pickBy(ls.ground.wear, u);
  return id === 'dirt_path' && !freeAbove ? 'coarse_dirt' : id;
}

/**
 * Dissolves the plot edge (research 15, T1): per model edge a depth profile of 0–2 removed
 * cells from smooth noise, never the same depth for more than six cells in a row, at most one
 * cell where a border runs two blocks inside. Only bare ground goes; paths stay.
 */
function dissolveEdge(site: Site, rng: SeededRandom, borderEdges: ReadonlySet<number>): void {
  const seed = rng.int(0, 2 ** 31 - 1);
  const profile = (length: number, edge: number): number[] => {
    const cap = borderEdges.has(edge) ? 1 : 2;
    const d: number[] = [];
    for (let t = 0; t < length; t++) {
      const n = valueNoise(seed, t, edge * 17, 0, 3) * 0.8 + cellHash(seed, t, edge, 4) * 0.2;
      d.push(Math.min(cap, n < 0.32 ? 0 : n < 0.62 ? 1 : 2));
    }
    let run = 1;
    for (let t = 1; t < length; t++) {
      run = d[t] === d[t - 1] ? run + 1 : 1;
      if (run >= 7) {
        d[t] = d[t] === 0 ? 1 : d[t]! - 1;
        run = 1;
      }
    }
    // Corners are rounded: the last two cells of every edge lose at least one ring.
    for (const t of [0, 1, length - 2, length - 1]) if (t >= 0 && t < length) d[t] = Math.max(d[t]!, 1);
    return d;
  };
  const north = profile(site.W, 0);
  const south = profile(site.W, 1);
  const west = profile(site.L, 2);
  const east = profile(site.L, 3);
  for (let z = 0; z < site.L; z++)
    for (let x = 0; x < site.W; x++) {
      const i = site.i(x, z);
      if (!site.owned[i] || site.use[i] === Use.PATH || !site.b.isAir(x, 1, z)) continue;
      const cut = z < north[x]! || site.L - 1 - z < south[x]! || x < west[z]! || site.W - 1 - x < east[z]!;
      if (cut) site.b.setBlock(x, 0, z, AIR, Priority.DECOR);
    }
}

/** Lawn plants in soft clusters (research 15, T7: short grass 10–25 %, nordic grass : fern 1 : 4). */
function plantLawn(site: Site, ls: LandscapeStyle, o: LandscapeOptions, rng: SeededRandom): void {
  const seed = rng.int(0, 2 ** 31 - 1);
  const b = site.b;
  const cells: [number, number][] = [];
  const edgeCells: [number, number][] = [];
  for (let z = 0; z < site.L; z++)
    for (let x = 0; x < site.W; x++) {
      const i = site.i(x, z);
      if (!site.owned[i] || site.use[i] !== Use.FREE || !b.isAir(x, 1, z) || !plantable(b.getBlock(x, 0, z))) continue;
      cells.push([x, z]);
      if (site.edge(x, z) >= 2 && [-1, 1].some((d) => site.usage(x + d, z) === Use.PATH || site.usage(x, z + d) === Use.PATH)) edgeCells.push([x, z]);
    }
  // Beside the path: the style's edge plants, else a quarter short grass (research 15, T5).
  const edgeMix = ls.path.edgePlants.length > 0 ? ls.path.edgePlants : ls.garden.formal ? [] : ([['short_grass', 1]] as const);
  if (edgeMix.length > 0) {
    for (const [x, z] of edgeCells) {
      if (cellHash(seed, x, z, 7) >= (ls.path.edgePlants.length > 0 ? 0.3 : 0.22)) continue;
      site.set(x, 1, z, plantState(pickBy(edgeMix, cellHash(seed, x, z, 8)), rng));
    }
  }
  const share = ls.ground.plantShare * (o.detailLevel === 1 ? 0.6 : 1);
  const chosen = clusteredAssign(cells, [
    ['none', 1 - share],
    ['plant', share],
  ] as const, (x, z) => valueNoise(seed + 3, x, 0, z, 2.5) + cellHash(seed, x, z, 9) * 0.35);
  for (const [x, z] of cells) {
    if (chosen.get(`${x},${z}`) !== 'plant' || !b.isAir(x, 1, z)) continue;
    site.set(x, 1, z, blockState(pickBy(ls.ground.plants, cellHash(seed, x, z, 10))));
  }
}

/** dirt_path turns into dirt under a solid block in the game: store coarse dirt there. */
function fixPathsUnderSolids(site: Site): void {
  const b = site.b;
  for (let z = 0; z < site.L; z++)
    for (let x = 0; x < site.W; x++) {
      if (!site.owned[site.i(x, z)] || blockIdOf(b.getBlock(x, 0, z)) !== 'minecraft:dirt_path') continue;
      const above = b.getBlock(x, 1, z);
      if (above !== AIR && definitionOf(above).shape !== 'fence_gate' && isFaceFull(above, 'down', 'collision')) site.set(x, 0, z, blockState('coarse_dirt'));
    }
}

/**
 * Yard cells for the caller: the reserved christmas-tree spot first (generateBuilding plants
 * the tree on the first matching cell), then the ring around it for presents (research 15,
 * recommendation 12: presents within 3 of the tree); without a tree the lawn beside the door.
 */
function yardCells(site: Site, e: Entrance | undefined, anchor: [number, number] | null): { x: number; y: number; z: number }[] {
  const b = site.b;
  const ok = (x: number, z: number) => {
    if (!site.inside(x, z) || site.edge(x, z) < 2) return false;
    const i = site.i(x, z);
    const use = site.use[i];
    const ground = b.getBlock(x, 0, z);
    return site.owned[i] === 1 && (use === Use.FREE || use === Use.RESERVED) && b.isAir(x, 1, z) && ground !== AIR && isFaceFull(ground, 'up', 'collision') && !blockIdOf(ground).endsWith('_ice');
  };
  const out: { x: number; y: number; z: number }[] = [];
  const push = (x: number, z: number) => {
    if (ok(x, z) && !out.some((c) => c.x === x && c.z === z)) out.push({ x, y: 1, z });
  };
  if (anchor) {
    push(anchor[0], anchor[1]);
    for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) if (Math.max(Math.abs(dx), Math.abs(dz)) === 3) push(anchor[0] + dx, anchor[1] + dz);
  }
  if (e && !anchor) {
    // No tree: presents beside the door (research 14, recommendation 3: ≤ 2 to the side).
    const [ox, , oz] = VECTOR[e.outward];
    const [sx, , sz] = VECTOR[clockwise(e.outward)];
    for (let s = 0; s <= 1; s++) for (const t of [-2, 2, -3, 3]) push(e.x + ox * s + sx * t, e.z + oz * s + sz * t);
  }
  return out;
}
