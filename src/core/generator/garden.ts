import { HORIZONTAL, VECTOR, type HorizontalDirection } from '@/core/blocks/directions';
import { blockState } from '@/core/blocks/registry';
import type { SeededRandom } from '@/core/generator/seededRandom';
import { valueNoise } from '@/core/generator/seededRandom';
import { cellHash, clusteredAssign, frontLine, pickBy, plantable, Use, type PlotFrame, type Site, type UseValue } from '@/core/generator/landscapeSite';
import { WINTER_BED, type LandscapeStyle } from '@/core/generator/landscapeStyles';
import type { LandscapeMaterials } from '@/core/generator/landscapeMaterials';
import type { Entrance } from '@/core/generator/paths';
import { barrels, bush, hayPile, rock, tree, woodpile, type NaturePiece, type TreeKind } from '@/core/templates/nature';

/**
 * Garden zones (research 15, T4/T10–T17 and recommendations 6 and 8): flower beds in drifts
 * along the house, small trees in the gaps (≥ 3 from the facade, never in front of a window),
 * bushes at house corners and gates, rocks in groups of one large and one or two small, props
 * where work happens (woodpile under the eaves, hay, barrels) and a frozen pond in winter.
 * Winter and christmas plant no flowers at all (research 14, recommendation 1).
 */

export interface GardenOptions {
  detailLevel: 1 | 2 | 3;
  minecraftVersion: string;
  /** Flowers allowed (theme none). */
  flowers: boolean;
}

export interface PlacedTree {
  x: number;
  z: number;
  kind: TreeKind;
  radius: number;
}

const DIRS4: readonly [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** Lawn the landscape can still use. */
function lawnCells(site: Site): [number, number][] {
  const out: [number, number][] = [];
  for (let z = 0; z < site.L; z++) for (let x = 0; x < site.W; x++) if (site.isLawn(x, z)) out.push([x, z]);
  return out;
}

export interface FitOptions {
  /** Keep tall parts out of the window views. */
  avoidWindows: boolean;
}

/** True if every cell of a piece at (x0, z0) is free and safe (see module notes). */
export function fits(site: Site, piece: NaturePiece, x0: number, z0: number, o: FitOptions): boolean {
  const b = site.b;
  for (const c of piece.cells) {
    const x = x0 + c.x;
    const z = z0 + c.z;
    if (!b.inside(x, c.y, z) || !site.inside(x, z)) return false;
    const i = site.i(x, z);
    const use = site.use[i]!;
    const r = site.edge(x, z);
    if (c.y === 0) {
      if (!site.owned[i] || use !== Use.FREE || r < 2) return false;
      continue;
    }
    if (!b.isAir(x, c.y, z) || use === Use.RESERVED || site.distBuilt[i]! < 1) return false;
    if (c.y === 1 && (r < 2 || !site.owned[i])) return false;
    if (r < 1) return false;
    // Low parts only on free lawn or beds; crowns may reach over paths and borders from y = 4.
    if (c.y <= 3 && use !== Use.FREE && use !== Use.BED) return false;
    // Nothing tall right in front of a window; crowns keep three blocks clear of the glass.
    if (o.avoidWindows && site.windowZone[i] && site.windowZone[i]! <= (c.y >= 4 ? 3 : 7) && c.y >= 2 && c.y <= site.windowTop + 1) return false;
  }
  return true;
}

export function place(site: Site, piece: NaturePiece, x0: number, z0: number, use: UseValue): void {
  for (const c of piece.cells) {
    site.set(x0 + c.x, c.y, z0 + c.z, c.state);
    if (c.y === 1 || c.y === 0) site.claim(x0 + c.x, z0 + c.z, use);
  }
  for (const d of piece.decor) {
    const x = x0 + d.x;
    const z = z0 + d.z;
    if (!site.isLawn(x, z) || site.edge(x, z) < 2 || !plantable(site.ground(x, z))) continue;
    site.set(x, 1, z, d.state);
  }
}

/**
 * Spot for the christmas tree that the caller plants on the first yard cell: in the front
 * garden, away from the door axis and the corners, two blocks clear of border and path
 * (research 15, recommendation 12). Reserves a 7 × 7 area so the garden keeps clear of it.
 */
export function reserveAnchor(site: Site, frame: PlotFrame, e: Entrance, rng: SeededRandom): [number, number] | null {
  const [eu, ev] = frame.toPlot(e.x, e.z);
  const jitter = rng.fork('anchor').int(0, 2 ** 31 - 1);
  const b = site.b;
  const soft = (x: number, y: number, z: number) => {
    const s = b.getBlock(x, y, z);
    return s.includes('_leaves') || s.includes('potted_');
  };
  // The tree generateBuilding plants (height 7) is 3 wide at y = 2 and 5 wide only at y = 3.
  // Strict: its outer ring may reach over a border up to two blocks high. Relaxed (shallow front
  // gardens): the inner ring may stand on a border too; the tree then replaces the border's top
  // there, but never a lamp, a path cell under its lowest layer or anything a lantern hangs on.
  const search = (relaxed: boolean): { x: number; z: number; score: number } | null => {
    let best: { x: number; z: number; score: number } | null = null;
    for (let z = 0; z < site.L; z++)
      for (let x = 0; x < site.W; x++) {
        const [u, v] = frame.toPlot(x, z);
        if (v > ev - 3 || Math.abs(u - eu) < 6 || site.edge(x, z) < (relaxed ? 2 : 3) || site.distBuilt[site.i(x, z)]! < 3 || !site.isLawn(x, z)) continue;
        let ok = true;
        let borders = 0;
        for (let dx = -2; dx <= 2 && ok; dx++)
          for (let dz = -2; dz <= 2 && ok; dz++) {
            const nx = x + dx;
            const nz = z + dz;
            const use = site.usage(nx, nz);
            const rim = Math.max(Math.abs(dx), Math.abs(dz)) === 2;
            if (use === Use.BORDER && (rim || relaxed)) borders++;
            else if (relaxed && rim && use === Use.PATH) ok = true;
            else if (!site.isFree(nx, nz)) ok = false;
            const from = rim ? 3 : use === Use.BORDER ? 3 : 1;
            for (let y = from; y <= 8 && ok; y++) {
              if (!b.inside(nx, y, nz)) ok = false;
              else if (!b.isAir(nx, y, nz) && !(y === 3 && (use === Use.BORDER || relaxed) && soft(nx, y, nz))) ok = false;
            }
          }
        if (!ok) continue;
        const side = Math.min(u, frame.Wu - 1 - u);
        const score = Math.min(side, 8) - borders * 0.5 - (site.windowZone[site.i(x, z)] ? 4 : 0) + cellHash(jitter, x, z);
        if (!best || score > best.score) best = { x, z, score };
      }
    return best;
  };
  const best = search(false) ?? search(true);
  if (!best) return null;
  for (let dx = -3; dx <= 3; dx++)
    for (let dz = -3; dz <= 3; dz++) {
      const x = best.x + dx;
      const z = best.z + dz;
      if (site.isFree(x, z)) site.claim(x, z, Use.RESERVED);
      // Trim hedge bumps and pots below the crown.
      if (Math.max(Math.abs(dx), Math.abs(dz)) <= 2 && site.inside(x, z) && soft(x, 3, z)) b.setBlock(x, 3, z, 'minecraft:air', 10);
    }
  return [best.x, best.z];
}

/** Facade normal of a ring cell: direction from the building to the cell. */
function facadeNormal(site: Site, x: number, z: number): HorizontalDirection | null {
  for (const d of HORIZONTAL) {
    const [dx, , dz] = VECTOR[d];
    for (const k of [1, 2]) {
      const fx = x - dx * k;
      const fz = z - dz * k;
      if (site.inside(fx, fz) && site.foot[site.i(fx, fz)]) return d;
    }
  }
  return null;
}

/** Flower beds along the house (T10): drifts of 3–7, 1–3 species, back row against the wall. */
export function plantBeds(site: Site, ls: LandscapeStyle, o: GardenOptions, rng: SeededRandom): number {
  const g = ls.garden;
  const ring = new Map<string, HorizontalDirection>();
  for (let z = 0; z < site.L; z++)
    for (let x = 0; x < site.W; x++) {
      const d = site.distFoot[site.i(x, z)]!;
      if ((d !== 1 && d !== 2) || !site.isLawn(x, z) || site.edge(x, z) < 2 || site.covered[site.i(x, z)]) continue;
      const n = facadeNormal(site, x, z);
      if (n) ring.set(`${x},${z}`, n);
    }
  // Components of equal facade normal (4-connected).
  const seen = new Set<string>();
  const beds: { normal: HorizontalDirection; cells: [number, number][] }[] = [];
  for (const [k, normal] of [...ring.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    if (seen.has(k)) continue;
    const cells: [number, number][] = [];
    const stack = [k];
    seen.add(k);
    while (stack.length > 0) {
      const cur = stack.pop()!;
      const [x, z] = cur.split(',').map(Number) as [number, number];
      cells.push([x, z]);
      for (const [dx, dz] of DIRS4) {
        const nk = `${x + dx},${z + dz}`;
        if (!seen.has(nk) && ring.get(nk) === normal) {
          seen.add(nk);
          stack.push(nk);
        }
      }
    }
    if (cells.length >= 4) beds.push({ normal, cells });
  }
  const chance = o.detailLevel >= 3 ? 0.8 : o.detailLevel === 2 ? 0.6 : 0.3;
  const soilSeed = rng.fork('soil').int(0, 2 ** 31 - 1);
  let planted = 0;
  beds.forEach((bed, index) => {
    const r = rng.fork(`bed${index}`);
    if (!r.chance(chance)) return;
    const along = bed.normal === 'north' || bed.normal === 'south' ? 0 : 1;
    const positions = [...new Set(bed.cells.map((c) => c[along]))].sort((a, b) => a - b);
    // Drifts along the facade.
    const species = o.flowers && !g.formal && g.flowers.length > 0 ? r.shuffle(g.flowers).slice(0, r.int(1, Math.min(3, g.flowers.length))) : [];
    const drift = new Map<number, string>();
    let p = 0;
    let s = 0;
    while (p < positions.length) {
      const len = r.int(3, 7);
      const id = species.length > 0 ? species[s % species.length]! : pickBy(WINTER_BED, r.next());
      for (let q = p; q < p + len && q < positions.length; q++) drift.set(positions[q]!, id);
      p += len;
      s++;
    }
    const soil = clusteredAssign(bed.cells, ls.ground.bedSoil, (x, z) => valueNoise(soilSeed, x, 0, z, 2));
    for (const [x, z] of bed.cells) {
      const back = site.distFoot[site.i(x, z)] === 1;
      site.set(x, 0, z, blockState(soil.get(`${x},${z}`) ?? ls.ground.bedSoil[0]![0]));
      site.claim(x, z, Use.BED);
      const u = cellHash(soilSeed, x, z, 2);
      const green = () => pickBy(g.green.map((v) => [v, 1] as const), u);
      let id: string | null;
      if (g.formal) {
        // Formal gardens: modern keeps one strict row of its flower (ferns in winter) in front of
        // grass; japanese plants clipped azaleas against the wall and moss and ferns in front.
        const pair = Math.floor((along === 0 ? x : z) / 3);
        if (back) id = cellHash(soilSeed, pair, index, 4) < 0.6 ? g.backRow[0]! : u < 0.4 ? green() : null;
        else if (g.flowers[0] === 'white_tulip' || g.flowers.length === 0) id = g.flowers[0] ?? (u < 0.5 ? 'fern' : null);
        else id = u < 0.12 ? g.flowers[0]! : u < 0.55 ? green() : null;
      } else if (back) {
        // Back row: azaleas / ferns in pairs, some green, some open soil.
        const pair = Math.floor((along === 0 ? x : z) / 2);
        const backId = pickBy(g.backRow.map((v) => [v, 1] as const), cellHash(soilSeed, pair, index, 4));
        id = u < 0.55 ? backId : u < 0.75 ? green() : null;
      } else {
        const main = drift.get(along === 0 ? x : z) ?? g.green[0]!;
        id = u < 0.08 && o.flowers ? g.accent : u < 0.68 ? main : u < 0.85 ? green() : null;
      }
      if (!id) continue;
      if (!o.flowers && (id === g.accent || g.flowers.includes(id))) id = 'fern';
      if (!id.startsWith('potted_') && !plantable(site.ground(x, z))) continue;
      site.set(x, 1, z, plantState(id, r));
      planted++;
    }
  });
  return planted;
}

/** Plant state with the properties a plant needs (petals count, sapling stage). */
export function plantState(id: string, rng: SeededRandom): string {
  if (id === 'pink_petals') return blockState(id, { flower_amount: String(rng.int(2, 4)), facing: rng.pick(['north', 'east', 'south', 'west'] as const) });
  return blockState(id);
}

/** Small trees in the gaps (T13): signature tree first, ≥ 3 from the facade, not in front of windows. */
export function plantTrees(site: Site, frame: PlotFrame, ls: LandscapeStyle, o: GardenOptions, rng: SeededRandom): PlacedTree[] {
  const g = ls.garden;
  const lawn = lawnCells(site).length;
  let count = Math.max(o.detailLevel >= 2 ? 1 : 0, Math.min(3, Math.round(lawn / 80)));
  if (o.detailLevel >= 2) count = Math.max(count, g.signatureMin);
  if (count === 0) return [];
  const kinds: TreeKind[] = [];
  for (let k = 0; k < count; k++) kinds.push(k < Math.max(1, g.signatureMin) ? g.trees[0]![0] : rng.fork(`kind${k}`).weighted(g.trees));
  const placed: PlacedTree[] = [];
  const jitter = rng.fork('treeJitter').int(0, 2 ** 31 - 1);
  // Front line of the building: trees prefer the sides and the back.
  const vh = frontLine(site, frame);
  // Each tree tries a few variants (the compact one last) before the slot is given up.
  const tryPlant = (kind: TreeKind, k: number, attempt: number): boolean => {
    const r = rng.fork(`tree${k}v${attempt}`);
    const piece = tree(kind, r, { maxTop: site.H - 2, minecraftVersion: o.minecraftVersion, blossoms: o.flowers, compact: attempt >= 3 });
    const spacing = kind === 'cypress' ? 3 : 2;
    const candidates: { x: number; z: number; score: number }[] = [];
    for (let z = 0; z < site.L; z++)
      for (let x = 0; x < site.W; x++) {
        const i = site.i(x, z);
        if (!site.isLawn(x, z) || site.distFoot[i]! < 3 || site.windowZone[i] || site.edge(x, z) < Math.max(2, piece.radius)) continue;
        let nearPath = false;
        for (const [dx, dz] of [...DIRS4, [1, 1], [-1, -1], [1, -1], [-1, 1]] as const) if (site.usage(x + dx, z + dz) === Use.PATH) nearPath = true;
        if (nearPath) continue;
        const tooClose = placed.some((t) => {
          const d = Math.max(Math.abs(t.x - x), Math.abs(t.z - z));
          return kind === 'cypress' && t.kind === 'cypress' ? d < spacing : d < t.radius + piece.radius + 1;
        });
        if (tooClose) continue;
        const [, v] = frame.toPlot(x, z);
        const behind = v >= vh ? 2 : 0;
        const df = site.distFoot[i]!;
        // Cypresses line up along borders (research 12/M12), others fill gaps near the house.
        const nearBorder = DIRS4.some(([dx, dz]) => site.usage(x + dx * 2, z + dz * 2) === Use.BORDER || site.usage(x + dx, z + dz) === Use.BORDER) ? 1.5 : 0;
        const score = behind + (kind === 'cypress' ? nearBorder : -Math.abs(df - (piece.radius + 2)) * 0.5) + cellHash(jitter, x, z, k) * 2;
        candidates.push({ x, z, score });
      }
    candidates.sort((a, b) => b.score - a.score || a.x - b.x || a.z - b.z);
    for (const c of candidates) {
      if (!fits(site, piece, c.x, c.z, { avoidWindows: true })) continue;
      place(site, piece, c.x, c.z, Use.TREE);
      placed.push({ x: c.x, z: c.z, kind, radius: piece.radius });
      return true;
    }
    return false;
  };
  kinds.forEach((kind, k) => {
    // Variants differ in branch directions; the compact ones (from the 4th) fit tight plots.
    for (let attempt = 0; attempt < 6; attempt++) if (tryPlant(kind, k, attempt)) return;
  });
  return placed;
}

/** Bushes at house corners and beside the gate (T12), in groups of one to three. */
export function plantBushes(site: Site, ls: LandscapeStyle, o: GardenOptions, gatePosts: readonly [number, number][], rng: SeededRandom): number {
  const want = o.detailLevel >= 3 ? rng.int(3, 5) : o.detailLevel === 2 ? rng.int(2, 3) : 1;
  const spots: { x: number; z: number; score: number }[] = [];
  const jitter = rng.fork('bushJitter').int(0, 2 ** 31 - 1);
  for (let z = 0; z < site.L; z++)
    for (let x = 0; x < site.W; x++) {
      if (!site.isLawn(x, z) || site.edge(x, z) < 2) continue;
      const i = site.i(x, z);
      const df = site.distFoot[i]!;
      // House corners: two foot-free axes (diagonal to a corner of the building).
      const corner = df >= 1 && df <= 2 && DIRS4.filter(([dx, dz]) => site.inside(x - dx * df, z - dz * df) && site.foot[site.i(x - dx * df, z - dz * df)]).length === 0;
      const gate = gatePosts.some(([gx, gz]) => Math.max(Math.abs(gx - x), Math.abs(gz - z)) === 1);
      if (!corner && !gate) continue;
      spots.push({ x, z, score: (gate ? 1 : 0) + cellHash(jitter, x, z) });
    }
  spots.sort((a, b) => b.score - a.score || a.x - b.x || a.z - b.z);
  let placed = 0;
  for (const s of spots) {
    if (placed >= want) break;
    const r = rng.fork(`bush${s.x},${s.z}`);
    const size = r.weighted([
      ['S', 2],
      ['M', 3],
      ['L', 1],
    ] as const);
    const piece = bush(size, r, ls.garden.bush);
    if (!fits(site, piece, s.x, s.z, { avoidWindows: true })) continue;
    place(site, piece, s.x, s.z, Use.BUSH);
    placed++;
  }
  return placed;
}

/** One large and one or two small rocks near the edge of the lawn (T14); never in a grid. */
export function placeRocks(site: Site, frame: PlotFrame, ls: LandscapeStyle, rng: SeededRandom): number {
  const mix = ls.garden.rocks;
  if (!mix) return 0;
  const vh = frontLine(site, frame);
  const cells = lawnCells(site).filter(([x, z]) => site.edge(x, z) >= 3 && site.edge(x, z) <= 5 && site.distFoot[site.i(x, z)]! >= 3);
  if (cells.length === 0) return 0;
  // Rocks belong to the quieter sides and back, near borders and corners (never mid-lawn).
  const score = ([x, z]: [number, number]) => {
    let s = frame.toPlot(x, z)[1] >= vh - 1 ? 2 : 0;
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) if (site.usage(x + dx, z + dz) === Use.BORDER) s += 0.1;
    return s;
  };
  const order = rng.shuffle(cells).sort((a, b) => score(b) - score(a));
  let placed = 0;
  let anchor: [number, number] | null = null;
  const sizes: ('big' | 'small')[] = ['big', 'small', ...(rng.chance(0.5) ? (['small'] as const) : [])];
  for (const size of sizes) {
    const r = rng.fork(`rock${placed}`);
    const piece = rock(size, r, mix, true);
    const near: [number, number] | null = anchor;
    const candidates: [number, number][] = near
      ? order.filter(([x, z]) => {
          const d = Math.max(Math.abs(x - near[0]), Math.abs(z - near[1]));
          return d >= 3 && d <= 4;
        })
      : order;
    for (const [x, z] of candidates) {
      if (!fits(site, piece, x, z, { avoidWindows: false })) continue;
      place(site, piece, x, z, Use.ROCK);
      anchor ??= [x, z];
      placed++;
      break;
    }
  }
  return placed;
}

/** Wood of the house frame for woodpiles (logs only; spruce otherwise). */
function pileWood(m: LandscapeMaterials): string {
  const id = m.postId().replace(/^stripped_/, '').replace(/_(log|wood)$/, '');
  return ['oak', 'spruce', 'birch', 'dark_oak', 'jungle', 'acacia', 'mangrove', 'cherry'].includes(id) ? id : 'spruce';
}

/** Props where work happens (T17): woodpile under the eaves, hay at the back, barrels by the wall. */
export function placeProps(site: Site, frame: PlotFrame, ls: LandscapeStyle, m: LandscapeMaterials, o: GardenOptions, rng: SeededRandom): number {
  const front = frame.front;
  const vh = frontLine(site, frame);
  let placed = 0;
  const chance = o.detailLevel >= 3 ? 0.85 : 0.6;
  for (const kind of ls.garden.props) {
    const r = rng.fork(kind);
    if (!r.chance(chance)) continue;
    if (kind === 'woodpile') {
      const len = r.int(3, 5);
      const runs: { x: number; z: number; along: 'x' | 'z'; score: number }[] = [];
      for (let z = 0; z < site.L; z++)
        for (let x = 0; x < site.W; x++) {
          if (site.distFoot[site.i(x, z)] !== 1) continue;
          const normal = facadeNormal(site, x, z);
          if (!normal || normal === front) continue;
          const along: 'x' | 'z' = normal === 'north' || normal === 'south' ? 'x' : 'z';
          const ok = Array.from({ length: len }, (_, k) => (along === 'x' ? [x + k, z] : [x, z + k]) as [number, number]).every(
            ([cx, cz]) => site.isLawn(cx, cz) && site.distFoot[site.i(cx, cz)] === 1 && !site.windowZone[site.i(cx, cz)] && site.edge(cx, cz) >= 2,
          );
          if (ok) runs.push({ x, z, along, score: (site.covered[site.i(x, z)] ? 1 : 0) + cellHash(r.seed, x, z) });
        }
      runs.sort((a, b) => b.score - a.score || a.x - b.x || a.z - b.z);
      for (const run of runs) {
        const piece = woodpile(len, run.along, r, pileWood(m));
        if (!fits(site, piece, run.x, run.z, { avoidWindows: true })) continue;
        place(site, piece, run.x, run.z, Use.PROP);
        placed++;
        break;
      }
      continue;
    }
    const piece = kind === 'hay' ? hayPile(r) : barrels(r);
    const cells = lawnCells(site).filter(([x, z]) => {
      const df = site.distFoot[site.i(x, z)]!;
      // Hay beside or behind the house, barrels against a side or back wall.
      return kind === 'hay' ? df >= 3 && site.edge(x, z) >= 3 && frame.toPlot(x, z)[1] >= vh : df === 1 && facadeNormal(site, x, z) !== front;
    });
    for (const [x, z] of r.shuffle(cells)) {
      if (!fits(site, piece, x, z, { avoidWindows: true })) continue;
      place(site, piece, x, z, Use.PROP);
      placed++;
      break;
    }
  }
  return placed;
}

/** Frozen pond for winter and christmas (research 14/U1, 15/T15): packed and blue ice, stony shore. */
export function placePond(site: Site, frame: PlotFrame, rng: SeededRandom): boolean {
  let vh = 0;
  for (let x = 0; x < site.W; x++) for (let z = 0; z < site.L; z++) if (site.foot[site.i(x, z)]) vh = Math.max(vh, frame.toPlot(x, z)[1]);
  const cells = lawnCells(site).filter(([x, z]) => site.edge(x, z) >= 3 && site.distFoot[site.i(x, z)]! >= 3);
  const shape = (cx: number, cz: number, ax: number, az: number) => {
    const out: [number, number][] = [];
    for (let dx = -ax; dx <= ax; dx++)
      for (let dz = -az; dz <= az; dz++) if ((dx * dx) / (ax * ax + 0.5) + (dz * dz) / (az * az + 0.5) <= 1) out.push([cx + dx, cz + dz]);
    return out;
  };
  const ax = rng.int(1, 2);
  const az = ax === 2 ? 1 : 2;
  const second: [number, number] = rng.pick(DIRS4);
  for (const [cx, cz] of rng.shuffle(cells).sort((a, b) => (frame.toPlot(b[0], b[1])[1] >= vh ? 1 : 0) - (frame.toPlot(a[0], a[1])[1] >= vh ? 1 : 0))) {
    const ice = [...shape(cx, cz, ax, az), ...shape(cx + second[0], cz + second[1], 1, 1)];
    const keys = new Set(ice.map(([x, z]) => `${x},${z}`));
    const shore: [number, number][] = [];
    for (const [x, z] of ice)
      for (const [dx, dz] of DIRS4) {
        const k = `${x + dx},${z + dz}`;
        if (!keys.has(k)) {
          keys.add(k);
          shore.push([x + dx, z + dz]);
        }
      }
    const all = [...ice, ...shore];
    if (!all.every(([x, z]) => site.isLawn(x, z) && site.edge(x, z) >= 2 && site.distFoot[site.i(x, z)]! >= 2)) continue;
    for (const [x, z] of ice) {
      site.set(x, 0, z, blockState(cellHash(rng.seed, x, z, 1) < 0.25 ? 'blue_ice' : 'packed_ice'));
      site.claim(x, z, Use.POND);
    }
    for (const [x, z] of shore) {
      const u = cellHash(rng.seed, x, z, 2);
      if (u < 0.45) site.set(x, 0, z, blockState(u < 0.25 ? 'andesite' : 'stone'));
      else if (u < 0.7) site.set(x, 0, z, blockState('coarse_dirt'));
      site.claim(x, z, Use.POND);
    }
    return true;
  }
  return false;
}
