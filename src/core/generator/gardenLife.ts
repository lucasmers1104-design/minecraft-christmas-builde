import { VECTOR, clockwise, type HorizontalDirection } from '@/core/blocks/directions';
import { AIR, blockState } from '@/core/blocks/registry';
import type { SeededRandom } from '@/core/generator/seededRandom';
import { valueNoise } from '@/core/generator/seededRandom';
import { fits, place, plantState, type GardenOptions } from '@/core/generator/garden';
import { cellHash, clusteredAssign, frontLine, pickBy, plantable, Use, type PlotFrame, type Site } from '@/core/generator/landscapeSite';
import type { LandscapeStyle } from '@/core/generator/landscapeStyles';
import type { Entrance } from '@/core/generator/paths';
import { bush } from '@/core/templates/nature';
import type { SizeClass } from '@/core/style/styles';

/**
 * Life around the house (Profi-Builds phase 4, research 15 T10–T17, 19 T12): bushes along the
 * plinth in three sizes, curbs beside the paths, flower drifts in the lawn, tall grass and large
 * ferns at the edges and around trees, and a kitchen garden with a scarecrow behind the house.
 * Everything writes DECOR through the shared Site, so nothing blocks a door, a path or a view.
 */

const DIRS4: readonly [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** Bushes at the plinth per size on detail level 3 (×0.6 on level 2), research 15 T12. */
const PLINTH_BUSHES: Readonly<Record<SizeClass, readonly [number, number]>> = {
  small: [3, 4],
  medium: [4, 6],
  large: [6, 8],
  huge: [8, 10],
};

function nearUse(site: Site, x: number, z: number, use: number, reach: number): boolean {
  for (let dx = -reach; dx <= reach; dx++) for (let dz = -reach; dz <= reach; dz++) if (site.usage(x + dx, z + dz) === use) return true;
  return false;
}

/**
 * Bushes right at the plinth (before the beds take the ring): one every five to seven columns
 * along the facades, small ones in front of windows (they stay below the sill), never within two
 * of a path (the doors). Detail level 1 keeps only the corner bushes of plantBushes.
 */
export function plinthBushes(site: Site, ls: LandscapeStyle, o: GardenOptions, size: SizeClass, rng: SeededRandom): number {
  if (o.detailLevel < 2) return 0;
  const [lo, hi] = PLINTH_BUSHES[size];
  const want = Math.round(rng.int(lo, hi) * (o.detailLevel === 2 ? 0.6 : 1));
  const jitter = rng.fork('jitter').int(0, 2 ** 31 - 1);
  const spots: { x: number; z: number; score: number }[] = [];
  for (let z = 0; z < site.L; z++)
    for (let x = 0; x < site.W; x++) {
      const i = site.i(x, z);
      if (!site.isLawn(x, z) || site.edge(x, z) < 2 || site.distFoot[i] !== 1 || nearUse(site, x, z, Use.PATH, 2)) continue;
      spots.push({ x, z, score: cellHash(jitter, x, z) });
    }
  spots.sort((a, b) => b.score - a.score || a.x - b.x || a.z - b.z);
  const placed: [number, number][] = [];
  const spacing = rng.int(5, 7);
  for (const s of spots) {
    if (placed.length >= want) break;
    if (placed.some(([px, pz]) => Math.max(Math.abs(px - s.x), Math.abs(pz - s.z)) < spacing)) continue;
    const r = rng.fork(`plinth${s.x},${s.z}`);
    const view = site.windowZone[site.i(s.x, s.z)]! > 0;
    const sizes: ('S' | 'M' | 'L')[] = view ? ['S'] : [r.weighted([['S', 2], ['M', 3], ['L', 1]] as const), 'S'];
    for (const bs of sizes) {
      const piece = bush(bs, r.fork(bs), ls.garden.bush);
      if (!fits(site, piece, s.x, s.z, { avoidWindows: true })) continue;
      place(site, piece, s.x, s.z, Use.BUSH);
      placed.push([s.x, s.z]);
      break;
    }
  }
  return placed.length;
}

/**
 * Curbs (research 15 T5, "Wege mit Kanten"): the lawn cell beside a paved path cell becomes the
 * style's curb stone (never the path's own block), about 70 % of them so the edge stays a
 * little irregular. Stepping stones and styles without curb (Japanese) keep the lawn.
 */
export function placeCurbs(site: Site, ls: LandscapeStyle, path: string, rng: SeededRandom): number {
  // A curb only reads as an edge in another stone than the path itself.
  const mix = ls.path.curb?.filter(([id]) => blockState(id) !== path) ?? [];
  if (mix.length === 0 || ls.path.form === 'stepping') return 0;
  const seed = rng.int(0, 2 ** 31 - 1);
  const grass = blockState('grass_block');
  const paved = (x: number, z: number) => site.usage(x, z) === Use.PATH && site.ground(x, z) !== grass && site.ground(x, z) !== AIR;
  let n = 0;
  for (let z = 0; z < site.L; z++)
    for (let x = 0; x < site.W; x++) {
      if (!site.isLawn(x, z) || site.edge(x, z) < 2 || site.ground(x, z) !== grass) continue;
      if (!DIRS4.some(([dx, dz]) => paved(x + dx, z + dz))) continue;
      if (cellHash(seed, x, z, 1) >= 0.7) continue;
      site.set(x, 0, z, blockState(pickBy(mix, cellHash(seed, x, z, 2))));
      n++;
    }
  return n;
}

/**
 * Flower drifts in the open lawn (research 15 T10: drifts, not dots): two to four soft patches of
 * four to nine flowers of one species, away from the house and the paths. Only without a theme.
 */
export function flowerDrifts(site: Site, ls: LandscapeStyle, o: GardenOptions, rng: SeededRandom): number {
  const g = ls.garden;
  if (!o.flowers || g.formal || g.flowers.length === 0 || o.detailLevel < 2) return 0;
  const species = [...g.flowers, g.accent];
  const count = o.detailLevel >= 3 ? rng.int(3, 4) : 2;
  const centres = rng.shuffle(
    (() => {
      const out: [number, number][] = [];
      for (let z = 0; z < site.L; z++)
        for (let x = 0; x < site.W; x++) {
          if (!site.isLawn(x, z) || site.edge(x, z) < 3 || site.distFoot[site.i(x, z)]! < 3 || nearUse(site, x, z, Use.PATH, 1)) continue;
          out.push([x, z]);
        }
      return out;
    })(),
  );
  const seed = rng.int(0, 2 ** 31 - 1);
  const used: [number, number][] = [];
  let planted = 0;
  for (const [cx, cz] of centres) {
    if (used.length >= count) break;
    if (used.some(([ux, uz]) => Math.max(Math.abs(ux - cx), Math.abs(uz - cz)) < 6)) continue;
    const id = species[used.length % species.length]!;
    const r = rng.fork(`drift${used.length}`);
    const cells: [number, number, number][] = [];
    for (let dz = -2; dz <= 2; dz++)
      for (let dx = -2; dx <= 2; dx++) {
        const x = cx + dx;
        const z = cz + dz;
        // A soft blob: distance plus noise, so the drift has ragged edges.
        const d = Math.hypot(dx * 0.8, dz) + valueNoise(seed, x, used.length, z, 1.7) * 1.2;
        if (d > 2.2 || !site.isLawn(x, z) || site.edge(x, z) < 2 || !plantable(site.ground(x, z)) || nearUse(site, x, z, Use.PATH, 0)) continue;
        cells.push([x, z, d]);
      }
    if (cells.length < 4) continue;
    cells.sort((a, b) => a[2] - b[2]);
    for (const [x, z] of cells.slice(0, 9)) if (site.set(x, 1, z, plantState(id, r))) planted++;
    used.push([cx, cz]);
  }
  return planted;
}

/**
 * Tall grass and large ferns (research 15 T7: height at the edges): soft clusters at the plot
 * edge and around trees, rocks, bushes and borders, never in front of a window or beside a path.
 * Formal gardens (Japanese, modern) stay clipped.
 */
export function tallGrass(site: Site, ls: LandscapeStyle, o: GardenOptions, ferns: number, rng: SeededRandom): number {
  if (ls.garden.formal) return 0;
  const seed = rng.int(0, 2 ** 31 - 1);
  const cells: [number, number][] = [];
  for (let z = 0; z < site.L; z++)
    for (let x = 0; x < site.W; x++) {
      const i = site.i(x, z);
      if (!site.isLawn(x, z) || !plantable(site.ground(x, z)) || site.edge(x, z) < 2 || site.distFoot[i]! < 2) continue;
      if (site.H < 3 || !site.b.isAir(x, 2, z) || (site.windowZone[i]! > 0 && site.windowZone[i]! <= 4) || site.covered[i] || nearUse(site, x, z, Use.PATH, 1)) continue;
      const rim = site.edge(x, z) <= 4;
      const near = nearUse(site, x, z, Use.TREE, 2) || nearUse(site, x, z, Use.ROCK, 1) || nearUse(site, x, z, Use.BUSH, 1) || nearUse(site, x, z, Use.BORDER, 1);
      if (rim || near) cells.push([x, z]);
    }
  const share = (o.detailLevel === 1 ? 0.08 : 0.16) * (o.flowers ? 1 : 0.6);
  const chosen = clusteredAssign(cells, [
    ['none', 1 - share],
    ['tall', share],
  ] as const, (x, z) => valueNoise(seed, x, 0, z, 2.2) + cellHash(seed, x, z, 3) * 0.3);
  let n = 0;
  for (const [x, z] of cells) {
    if (chosen.get(`${x},${z}`) !== 'tall') continue;
    const id = cellHash(seed, x, z, 4) < ferns ? 'large_fern' : 'tall_grass';
    if (!site.set(x, 1, z, blockState(id, { half: 'lower' }))) continue;
    site.set(x, 2, z, blockState(id, { half: 'upper' }));
    n++;
  }
  return n;
}

/** Plants of a kitchen-garden row (cabbage = fern, beans = azalea, pumpkins as blocks). */
const CROPS: readonly (readonly [string, number])[] = [
  ['fern', 4],
  ['short_grass', 2],
  ['azalea', 2],
  ['pumpkin', 1],
];

/**
 * Kitchen garden behind or beside the house (research 19 T12: work happens at the back): a bed of
 * 5 × 7 (5 × 5 on small plots) framed by lying logs, two planted rows on rooted and coarse dirt,
 * a trodden aisle in the middle and a scarecrow (fence, hay bale, carved pumpkin) at its end.
 * Near the back door when there is one. Only without a theme and from detail level 2.
 */
export function kitchenGarden(site: Site, frame: PlotFrame, ls: LandscapeStyle, o: GardenOptions, size: SizeClass, wood: string, /** Fence state of the frame wood (version-safe). */ fence: string, back: Entrance | null, rng: SeededRandom): boolean {
  if (!o.flowers || ls.garden.formal || o.detailLevel < 2) return false;
  const along = size === 'small' ? 5 : 7;
  const across = 5;
  const vh = frontLine(site, frame);
  const jitter = rng.fork('jitter').int(0, 2 ** 31 - 1);
  let best: { x: number; z: number; ax: 'x' | 'z'; score: number } | null = null;
  for (const ax of ['x', 'z'] as const) {
    const [w, l] = ax === 'x' ? [along, across] : [across, along];
    for (let z0 = 0; z0 + l <= site.L; z0++)
      for (let x0 = 0; x0 + w <= site.W; x0++) {
        let ok = true;
        let behind = 0;
        for (let dz = 0; dz < l && ok; dz++)
          for (let dx = 0; dx < w && ok; dx++) {
            const x = x0 + dx;
            const z = z0 + dz;
            const i = site.i(x, z);
            // Never in the front garden: beside or behind the house only.
            if (!site.isLawn(x, z) || site.edge(x, z) < 2 || site.distFoot[i]! < 2 || nearUse(site, x, z, Use.PATH, 0) || frame.toPlot(x, z)[1] < vh) ok = false;
            else behind++;
          }
        if (!ok) continue;
        const cx = x0 + (w - 1) / 2;
        const cz = z0 + (l - 1) / 2;
        const toBack = back ? Math.max(Math.abs(cx - back.x), Math.abs(cz - back.z)) : 20;
        const score = (behind / (w * l)) * 4 - toBack * 0.15 + cellHash(jitter, x0, z0) * 0.5;
        if (!best || score > best.score) best = { x: x0, z: z0, ax, score };
      }
  }
  if (!best) return false;
  const { x: x0, z: z0, ax } = best;
  const seed = rng.int(0, 2 ** 31 - 1);
  // Local coordinates: a runs along the bed, b across it (0 and 4 are the frame).
  const world = (a: number, b: number): [number, number] => (ax === 'x' ? [x0 + a, z0 + b] : [x0 + b, z0 + a]);
  const logAlong = (axis: 'x' | 'z') => blockState(`stripped_${wood}_log`, { axis });
  const acrossAxis: 'x' | 'z' = ax === 'x' ? 'z' : 'x';
  for (let a = 0; a < along; a++)
    for (let b = 0; b < across; b++) {
      const [x, z] = world(a, b);
      site.claim(x, z, Use.BED);
      const rim = a === 0 || a === along - 1 || b === 0 || b === across - 1;
      if (rim) {
        site.set(x, 0, z, logAlong(b === 0 || b === across - 1 ? ax : acrossAxis));
        continue;
      }
      if (b === 2) {
        site.set(x, 0, z, blockState('dirt_path'));
        continue;
      }
      site.set(x, 0, z, blockState(b === 1 ? 'rooted_dirt' : 'coarse_dirt'));
      const u = cellHash(seed, x, z, 1);
      if (u < 0.15) continue;
      const crop = pickBy(CROPS, cellHash(seed, x, z, 2));
      site.set(x, 1, z, blockState(crop));
    }
  // Scarecrow at the end of the aisle, facing along the bed.
  const [sx, sz] = world(along - 2, 2);
  const facing: HorizontalDirection = ax === 'x' ? (rng.chance(0.5) ? 'north' : 'south') : rng.chance(0.5) ? 'east' : 'west';
  site.set(sx, 1, sz, fence);
  site.set(sx, 2, sz, blockState('hay_block', { axis: 'y' }));
  site.set(sx, 3, sz, blockState('carved_pumpkin', { facing }));
  const [ox, , oz] = VECTOR[clockwise(facing)];
  for (const s of [1, -1]) site.set(sx + ox * s, 2, sz + oz * s, fence);
  return true;
}
