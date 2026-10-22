import type { HorizontalDirection } from '@/core/blocks/directions';
import { blockIdOf, blockState, propsOf } from '@/core/blocks/registry';
import { Priority, VoxelBuilder } from '@/core/generator/geometry';
import { Blocks } from '@/core/generator/house/materials';
import { buildRoofs, type RoofSectionSpec } from '@/core/generator/roof/roofEngine';
import type { SeededRandom } from '@/core/generator/seededRandom';
import { buildChristmasTree } from '@/core/generator/christmasTree';
import { decorateFestive } from '@/core/generator/festive';
import type { RoleMaterials } from '@/core/templates/place';
import type { SizeClass, StyleId, Theme } from '@/core/style/styles';

/**
 * Market stalls (phase 5, research report: 5×5 or 7×7, counter 1–2 high, roof 3–4 above the
 * counter, 1–2 lanterns above the counter): corner posts, a counter with goods, a back wall
 * with shelves, a red-and-white striped awning from stairs, and – for larger sizes – several
 * stalls facing each other across a lane with lamp posts and a tree at the end.
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
}

const STALL = { width: 7, depth: 5, height: 4 };
const GOODS = ['barrel', 'pumpkin', 'melon', 'hay_block', 'barrel'] as const;

interface StallSpot {
  x0: number;
  z0: number;
  /** Side the counter faces (towards the lane). */
  front: HorizontalDirection;
}

function stallCount(size: SizeClass): number {
  return size === 'small' ? 1 : size === 'medium' ? 2 : size === 'large' ? 4 : 6;
}

export function buildMarket(input: StallInput, rng: SeededRandom): { builder: VoxelBuilder; stalls: StallSpot[] } {
  const n = stallCount(input.size);
  const perRow = Math.ceil(n / 2);
  const lane = 5;
  const margin = 3;
  const twoRows = n > 1;
  const width = margin * 2 + perRow * STALL.width + (perRow - 1);
  const length = margin * 2 + (twoRows ? 2 * STALL.depth + lane : STALL.depth + 3) + (input.size === 'large' || input.size === 'huge' ? 9 : 0);
  const builder = new VoxelBuilder({ width, height: 14 + (input.size === 'large' || input.size === 'huge' ? 6 : 0), length });
  const blocks = new Blocks(input.materials, input.minecraftVersion, input.seed);

  // Ground: lane of mixed stone, grass elsewhere.
  const laneMix = ['cobblestone', 'stone_bricks', 'andesite', 'mossy_cobblestone'];
  const gr = rng.fork('ground');
  for (let x = 0; x < width; x++)
    for (let z = 0; z < length; z++) builder.setBlock(x, 0, z, blockState(z >= margin - 1 && z < length - margin + 1 ? gr.pick(laneMix) : 'grass_block'), Priority.DECOR);

  const stalls: StallSpot[] = [];
  for (let i = 0; i < n; i++) {
    const row = twoRows ? i % 2 : 0;
    const col = Math.floor(i / (twoRows ? 2 : 1));
    const x0 = margin + col * (STALL.width + 1);
    const z0 = row === 0 ? margin : margin + STALL.depth + lane;
    stalls.push({ x0, z0, front: row === 0 ? 'south' : 'north' });
  }

  const sections: RoofSectionSpec[] = [];
  for (const [i, s] of stalls.entries()) {
    const r = rng.fork(`stall${i}`);
    const x1 = s.x0 + STALL.width - 1;
    const z1 = s.z0 + STALL.depth - 1;
    const frontZ = s.front === 'south' ? z1 : s.z0;
    const backZ = s.front === 'south' ? s.z0 : z1;
    const inward = s.front === 'south' ? -1 : 1;
    // Floor and corner posts.
    for (let x = s.x0; x <= x1; x++) for (let z = s.z0; z <= z1; z++) builder.setBlock(x, 0, z, blocks.block('floor'), Priority.STRUCTURE);
    for (const x of [s.x0, x1])
      for (const z of [s.z0, z1]) for (let y = 1; y <= STALL.height; y++) builder.setBlock(x, y, z, blocks.log('frame', 'y'), Priority.STRUCTURE);
    // Back wall with shelves; side walls half high.
    for (let x = s.x0 + 1; x < x1; x++) {
      for (let y = 1; y <= STALL.height - 1; y++) builder.setBlock(x, y, backZ, blocks.block('wall'), Priority.STRUCTURE);
      builder.setBlock(x, 2, backZ + inward, blocks.slab('frame', 'top'), Priority.STRUCTURE);
      if (r.chance(0.5)) builder.setBlock(x, 3, backZ + inward, blockState(r.pick(['flower_pot', 'potted_spruce_sapling', 'potted_red_tulip'] as const)), Priority.DECOR);
    }
    for (const x of [s.x0, x1])
      for (let z = s.z0 + 1; z < z1; z++) builder.setBlock(x, 1, z, blocks.fence('frame'), Priority.STRUCTURE);
    // Counter at the front: block + top slab, a gap for the seller at one end.
    const gap = r.chance(0.5) ? s.x0 + 1 : x1 - 1;
    for (let x = s.x0 + 1; x < x1; x++) {
      if (x === gap) continue;
      builder.setBlock(x, 1, frontZ, x % 2 === 0 ? blockState('barrel', { facing: 'up' }) : blocks.block('frame'), Priority.STRUCTURE);
      builder.setBlock(x, 2, frontZ, blocks.slab('frame', 'top'), Priority.STRUCTURE);
      if (r.chance(0.6)) {
        const item = r.pick(GOODS);
        builder.setBlock(x, 3, frontZ, blockState(item, item === 'barrel' ? { facing: 'up' } : item === 'hay_block' ? { axis: 'y' } : {}), Priority.DECOR);
      } else if (input.theme !== 'none') {
        builder.setBlock(x, 3, frontZ, blockState(input.theme === 'christmas' ? 'red_candle' : 'white_candle', { candles: '3', lit: 'true' }), Priority.DECOR);
      }
    }
    // Awning roof: gable along x, red/white stripes are applied after the roof engine.
    sections.push({
      id: `stall${i}`,
      x0: s.x0,
      x1,
      z0: s.z0,
      z1,
      wallTop: STALL.height,
      type: 'gable',
      ridgeAxis: 'x',
      profile: 'standard',
      overhang: 1,
      materials: { roof: 'red_nether_bricks', trim: 'red_nether_bricks', ridge: 'smooth_quartz', soffit: 'smooth_quartz', gable: input.materials.wall },
      ridgeStyle: 'slab',
      soffit: false,
      gables: true,
    });
  }
  const roof = buildRoofs(builder, sections);

  // Stripes: every other column along x becomes white (smooth quartz), keeping the state.
  for (const s of sections)
    for (let x = s.x0 - 1; x <= s.x1 + 1; x++) {
      if (x % 2 === 0) continue;
      for (let z = s.z0 - 1; z <= s.z1 + 1; z++)
        for (let y = s.wallTop - 1; y <= s.wallTop + 6; y++) {
          if (!builder.inside(x, y, z)) continue;
          const st = builder.getBlock(x, y, z);
          const id = blockIdOf(st);
          if (id === 'minecraft:red_nether_brick_stairs') builder.setBlock(x, y, z, blockState('smooth_quartz_stairs', { ...propsOf(st) }), Priority.ROOF);
          else if (id === 'minecraft:red_nether_brick_slab') builder.setBlock(x, y, z, blockState('smooth_quartz_slab', { ...propsOf(st) }), Priority.ROOF);
        }
    }

  // Lanterns hanging under the front eave above each counter.
  const hanging = blockState(input.lantern, { hanging: 'true' });
  for (const s of stalls) {
    const z = s.front === 'south' ? s.z0 + STALL.depth : s.z0 - 1;
    for (const x of [s.x0 + 2, s.x0 + STALL.width - 3]) {
      const y = (roof.surface.get(`${x},${z}`) ?? STALL.height) - 1;
      if (builder.inside(x, y, z) && builder.isAir(x, y, z)) builder.setBlock(x, y, z, hanging, Priority.DECOR);
    }
  }

  // Festive layer (garlands under the awnings, presents in the lane) and a tree at the end.
  const yard: { x: number; y: number; z: number }[] = [];
  for (let x = margin; x < width - margin; x++) for (let z = 1; z < length - 1; z++) if (builder.isAir(x, 1, z) && builder.getBlock(x, 0, z) !== blockState('grass_block')) yard.push({ x, y: 1, z });
  decorateFestive(builder, rng.fork('festive'), { eaves: roof.eaveCells, doors: [], sills: [], yard: yard.filter((_, i) => i % 7 === 0) }, {
    theme: input.theme,
    intensity: input.detailLevel,
    garland: input.garland,
    presents: input.presents,
    lantern: input.lantern,
    lanternDensity: 'normal',
    minecraftVersion: input.minecraftVersion,
  });
  if ((input.size === 'large' || input.size === 'huge') && input.theme !== 'none') {
    buildChristmasTree(builder, rng.fork('tree'), Math.floor(width / 2), 1, length - margin - 4, 12, {
      theme: input.theme,
      intensity: input.detailLevel,
      lights: true,
      star: true,
    });
  }
  return { builder, stalls };
}
