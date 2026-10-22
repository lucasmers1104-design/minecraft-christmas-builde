import { VECTOR, clockwise, type HorizontalDirection } from '@/core/blocks/directions';
import { blockState } from '@/core/blocks/registry';
import { Priority, type VoxelBuilder } from '@/core/generator/geometry';
import type { SeededRandom } from '@/core/generator/seededRandom';
import type { StyleId, Theme } from '@/core/style/styles';

/**
 * Landscape around a building (phase 5, research report "Landschaft und Wege"): a grass plot,
 * a mixed path from the door to the plot edge (no two equal blocks side by side, organic
 * edges, never more than 7 blocks dead straight), a hedge of persistent leaves with a gap,
 * vanilla-style lamp posts (fence posts with an arm and a hanging lantern), flower beds in
 * the style's colours, and a frozen pond (packed ice) in winter.
 */

export interface LandscapeOptions {
  style: StyleId;
  theme: Theme;
  garden: boolean;
  lantern: 'lantern' | 'soul_lantern';
  lanternDensity: 'none' | 'few' | 'normal' | 'many';
  snowGround: boolean;
  fenceWood: string;
}

export interface Entrance {
  x: number;
  z: number;
  /** Direction from the door towards the plot edge. */
  outward: HorizontalDirection;
}

const PATH_MIX: Readonly<Record<StyleId, readonly string[]>> = {
  medieval: ['cobblestone', 'mossy_cobblestone', 'coarse_dirt', 'andesite'],
  fantasy: ['mossy_cobblestone', 'moss_block', 'cobblestone', 'coarse_dirt'],
  rustic: ['coarse_dirt', 'dirt_path', 'cobblestone', 'rooted_dirt'],
  nordic: ['cobbled_deepslate', 'coarse_dirt', 'cobblestone', 'dirt_path'],
  japanese: ['smooth_stone', 'andesite', 'polished_andesite', 'stone'],
  cherry: ['stone_bricks', 'mossy_stone_bricks', 'andesite', 'moss_block'],
  modern: ['smooth_stone', 'polished_andesite', 'smooth_stone', 'polished_andesite'],
  mediterranean: ['sandstone', 'smooth_sandstone', 'cut_sandstone', 'granite'],
};

const FLOWERS: Readonly<Record<StyleId, readonly string[]>> = {
  medieval: ['poppy', 'dandelion', 'oxeye_daisy', 'short_grass'],
  fantasy: ['allium', 'azalea', 'flowering_azalea', 'lily_of_the_valley', 'fern'],
  rustic: ['poppy', 'cornflower', 'dandelion', 'short_grass', 'fern'],
  nordic: ['fern', 'short_grass', 'lily_of_the_valley'],
  japanese: ['fern', 'azalea', 'short_grass'],
  cherry: ['pink_tulip', 'white_tulip', 'azalea'],
  modern: ['short_grass', 'fern'],
  mediterranean: ['red_tulip', 'oxeye_daisy', 'allium'],
};

export function buildLandscape(b: VoxelBuilder, rng: SeededRandom, entrances: readonly Entrance[], o: LandscapeOptions): { yard: { x: number; y: number; z: number }[] } {
  const { width: W, length: L } = b.dimensions;
  const grass = blockState('grass_block');
  const snow = blockState('snow_block');
  // Ground layer wherever the building left y = 0 empty.
  for (let x = 0; x < W; x++) for (let z = 0; z < L; z++) if (b.isAir(x, 0, z)) b.setBlock(x, 0, z, o.snowGround ? snow : grass, Priority.DECOR);

  const yard: { x: number; y: number; z: number }[] = [];
  if (!o.garden) return { yard };
  const r = rng.fork('landscape');
  const mix = PATH_MIX[o.style];

  // Paths: from each entrance straight out to the plot edge, 3 wide with ragged edges and a
  // sideways step every few blocks so no edge runs straight for more than 7 blocks.
  const pathCells = new Set<string>();
  for (const e of entrances) {
    const [ox, , oz] = VECTOR[e.outward];
    const side = VECTOR[clockwise(e.outward, 1)];
    let cx = e.x;
    let cz = e.z;
    let step = 0;
    while (cx >= 0 && cz >= 0 && cx < W && cz < L) {
      for (let w = -1; w <= 1; w++) {
        if (w !== 0 && r.chance(0.25)) continue;
        const x = cx + side[0] * w;
        const z = cz + side[2] * w;
        if (x < 0 || z < 0 || x >= W || z >= L) continue;
        if (b.getBlock(x, 0, z) !== grass && b.getBlock(x, 0, z) !== snow) continue;
        pathCells.add(`${x},${z}`);
      }
      cx += ox;
      cz += oz;
      step++;
      if (step % 5 === 0 && r.chance(0.5)) {
        const jog = r.chance(0.5) ? 1 : -1;
        cx += side[0] * jog;
        cz += side[2] * jog;
      }
    }
  }
  // No two equal path blocks side by side: pick per cell avoiding the west and north neighbour.
  const chosen = new Map<string, string>();
  for (const key of [...pathCells].sort()) {
    const [x, z] = key.split(',').map(Number) as [number, number];
    const avoid = new Set([chosen.get(`${x - 1},${z}`), chosen.get(`${x},${z - 1}`), chosen.get(`${x + 1},${z}`), chosen.get(`${x},${z + 1}`)]);
    // dirt_path turns into dirt under a solid block: never under steps or posts.
    const covered = !b.isAir(x, 1, z);
    const options = mix.filter((m) => !avoid.has(m) && !(covered && m === 'dirt_path'));
    const id = r.pick(options.length > 0 ? options : mix.filter((m) => m !== 'dirt_path'));
    chosen.set(key, id);
    b.setBlock(x, 0, z, blockState(id), Priority.DECOR);
  }

  // Hedge around the plot edge with gaps at the paths.
  const hedgeLeaves = blockState(o.style === 'cherry' ? 'cherry_leaves' : o.style === 'fantasy' ? 'azalea_leaves' : o.style === 'nordic' ? 'spruce_leaves' : 'oak_leaves', { persistent: 'true' });
  for (let x = 0; x < W; x++)
    for (let z = 0; z < L; z++) {
      const edge = x === 0 || z === 0 || x === W - 1 || z === L - 1;
      if (!edge || pathCells.has(`${x},${z}`)) continue;
      // Keep a 3-wide gap around the path.
      const nearPath = [-1, 1].some((d) => pathCells.has(`${x + d},${z}`) || pathCells.has(`${x},${z + d}`));
      if (nearPath || !b.isAir(x, 1, z)) continue;
      b.setBlock(x, 1, z, hedgeLeaves, Priority.DECOR);
    }

  // Lamp posts beside the paths, inside the hedge: fence ×3, arm towards the path, lantern below.
  if (o.lanternDensity !== 'none') {
    const fence = blockState(`${o.fenceWood}_fence`);
    const hanging = blockState(o.lantern, { hanging: 'true' });
    for (const e of entrances) {
      const [ox, , oz] = VECTOR[e.outward];
      const side = VECTOR[clockwise(e.outward, 1)];
      const reach = e.outward === 'north' ? e.z - 1 : e.outward === 'south' ? L - 2 - e.z : e.outward === 'west' ? e.x - 1 : W - 2 - e.x;
      const distances = o.lanternDensity === 'many' ? [3, 6, 9] : [Math.min(4, reach - 1)];
      for (const dist of distances) {
        if (dist < 2 || dist >= reach) continue;
        for (const s of o.lanternDensity === 'few' ? [1] : [1, -1]) {
          const px = e.x + ox * dist + side[0] * 3 * s;
          const pz = e.z + oz * dist + side[2] * 3 * s;
          if (!b.inside(px, 4, pz) || pathCells.has(`${px},${pz}`) || ![1, 2, 3, 4].every((y) => b.isAir(px, y, pz))) continue;
          for (let y = 1; y <= 3; y++) b.setBlock(px, y, pz, fence, Priority.DECOR);
          const ax = px - side[0] * s;
          const az = pz - side[2] * s;
          if (!b.isAir(ax, 3, az) || !b.isAir(ax, 2, az)) continue;
          b.setBlock(ax, 3, az, fence, Priority.DECOR);
          b.setBlock(ax, 2, az, hanging, Priority.DECOR);
        }
      }
    }
  }

  // Flower beds along the house: on grass next to the plinth apron, in clusters.
  const flowers = FLOWERS[o.style];
  const fr = r.fork('flowers');
  for (let x = 1; x < W - 1; x++)
    for (let z = 1; z < L - 1; z++) {
      if (b.getBlock(x, 0, z) !== grass || !b.isAir(x, 1, z) || pathCells.has(`${x},${z}`)) continue;
      const nearHouse = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dz]) => !b.isAir(x + dx!, 1, z + dz!) && !b.getBlock(x + dx!, 1, z + dz!).includes('_leaves') && !b.getBlock(x + dx!, 1, z + dz!).includes('fence'));
      if (nearHouse) {
        if (fr.chance(0.35)) b.setBlock(x, 1, z, blockState(fr.pick(flowers)), Priority.DECOR);
        continue;
      }
      if (x > 1 && z > 1 && x < W - 2 && z < L - 2) yard.push({ x, y: 1, z });
    }

  // Winter: a small frozen pond in the yard.
  if (o.theme === 'winter' && yard.length > 40) {
    const pr = r.fork('pond');
    const c = pr.pick(yard);
    for (let dx = -2; dx <= 2; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        if (Math.abs(dx) === 2 && Math.abs(dz) === 1) continue;
        const x = c.x + dx;
        const z = c.z + dz;
        if (b.inside(x, 0, z) && b.getBlock(x, 0, z) === grass && b.isAir(x, 1, z)) b.setBlock(x, 0, z, blockState('packed_ice'), Priority.DECOR);
      }
  }
  return { yard: yard.filter((c) => b.isAir(c.x, 1, c.z) && b.getBlock(c.x, 0, c.z) === grass) };
}
