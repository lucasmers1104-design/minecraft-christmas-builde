import { blockState } from '@/core/blocks/registry';
import { resolvePalettes } from '@/core/blocks/palettes';
import type { BuildSize, BuildSpec } from '@/core/schema/buildSpec';
import type { Dimensions } from '@/core/schema/voxelModel';
import { Priority, roofGable, VoxelBuilder } from '@/core/generator/geometry';
import { createSeededRandom } from '@/core/generator/seededRandom';

/**
 * Christmas-market stall(s): a row of booths sharing posts, each with a counter and goods,
 * a back wall, side half-walls with a vendor entrance, a striped gable roof, garland and
 * lights. Customers stand on the paved strip in front.
 */

const BOOTHS: Record<BuildSize, number> = { small: 1, medium: 2, large: 3 };
const BOOTH_WIDTH = 7; // including both posts
const BOOTH_DEPTH = 5;
const POST_HEIGHT = 4;
const MARGIN_SIDE = 1;
const MARGIN_FRONT = 3;
const MARGIN_BACK = 1;

export interface MarketStallLayout {
  dimensions: Dimensions;
  booths: { x0: number; x1: number }[];
  front: number;
  back: number;
  counterY: number;
  roofBaseY: number;
}

export function buildMarketStall(spec: BuildSpec): { builder: VoxelBuilder; layout: MarketStallLayout } {
  const o = spec.options;
  const random = createSeededRandom(spec.seed);
  const { materials, colors, roof } = resolvePalettes(spec.materialTheme, spec.colorTheme, spec.style, o);
  const count = BOOTHS[spec.size];
  const snow = o.snow ?? true;
  const lights = o.lights ?? true;
  const garland = o.garland ?? spec.detailLevel >= 2;
  const withPresents = o.presents ?? spec.style !== 'realistic';

  const innerWidth = count * (BOOTH_WIDTH - 1) + 1;
  const dimensions = {
    width: innerWidth + 2 * MARGIN_SIDE,
    height: POST_HEIGHT + 1 + 5 + 1,
    length: BOOTH_DEPTH + MARGIN_FRONT + MARGIN_BACK,
  };
  const builder = new VoxelBuilder(dimensions);
  const xs = MARGIN_SIDE;
  const xe = xs + innerWidth - 1;
  const zf = MARGIN_FRONT;
  const zb = zf + BOOTH_DEPTH - 1;
  const counterY = 1;
  const roofBaseY = POST_HEIGHT + 1;

  // Paved customer strip and booth floors.
  builder.fillBox({ x: xs, y: 0, z: 0 }, { x: xe, y: 0, z: zf - 1 }, materials.path, Priority.STRUCTURE);
  builder.fillBox({ x: xs, y: 0, z: zf }, { x: xe, y: 0, z: zb }, materials.floor, Priority.STRUCTURE);

  // Back wall, outer side half-walls with a vendor gap at the back.
  builder.fillBox({ x: xs, y: 1, z: zb }, { x: xe, y: POST_HEIGHT, z: zb }, materials.wall, Priority.STRUCTURE);
  for (const x of [xs, xe]) {
    for (let z = zf + 1; z <= zb - 1; z++) {
      if (z === zb - 1) continue; // vendor entrance
      builder.setBlock(x, 1, z, materials.wall, Priority.STRUCTURE);
    }
  }

  const booths: MarketStallLayout['booths'] = [];
  const goods = [
    blockState('pumpkin'),
    blockState('carved_pumpkin', { facing: 'north' }),
    blockState('melon'),
    blockState('hay_block', { axis: 'x' }),
    blockState('barrel', { facing: 'up', open: 'false' }),
    ...(withPresents ? colors.presents : []),
  ];
  for (let b = 0; b < count; b++) {
    const bx0 = xs + b * (BOOTH_WIDTH - 1);
    const bx1 = bx0 + BOOTH_WIDTH - 1;
    booths.push({ x0: bx0, x1: bx1 });
    // Posts at all four corners (shared between neighbouring booths).
    for (const [px, pz] of [
      [bx0, zf],
      [bx1, zf],
      [bx0, zb],
      [bx1, zb],
    ] as const) {
      builder.fillBox({ x: px, y: 1, z: pz }, { x: px, y: POST_HEIGHT, z: pz }, materials.post, Priority.STRUCTURE);
    }
    // Counter along the front with goods on top; the middle stays free as serving hatch.
    const mid = Math.round((bx0 + bx1) / 2);
    for (let x = bx0 + 1; x <= bx1 - 1; x++) {
      builder.setBlock(x, counterY, zf, materials.beamX, Priority.STRUCTURE);
      if (x !== mid && random.chance(spec.detailLevel === 1 ? 0.35 : 0.7)) {
        builder.setBlock(x, counterY + 1, zf, random.pick(goods), Priority.DECOR);
      }
    }
    // Shelf at the back wall with more goods.
    if (spec.detailLevel >= 2) {
      for (let x = bx0 + 1; x <= bx1 - 1; x += 2) builder.setBlock(x, 1, zb - 1, random.pick(goods), Priority.DECOR);
    }
    if (lights) {
      // Lamp on the back wall and a lantern at the front post (both attached to structure).
      builder.setBlock(mid, POST_HEIGHT, zb - 1, colors.light, Priority.STRUCTURE);
      builder.setBlock(bx0, POST_HEIGHT, zf - 1, colors.light, Priority.STRUCTURE);
    }
  }
  // Keep the walking space behind the counters free.
  for (let x = xs + 1; x <= xe - 1; x++) {
    for (let y = 1; y <= 2; y++) {
      if (!builder.isAir(x, y, zf + 1)) continue;
      builder.clear(x, y, zf + 1);
    }
  }

  // Striped gable roof along the row, closed gable ends.
  const stripe = spec.colorTheme === 'natural' ? roof : colors.primaryAccent;
  const stripeAlt = spec.colorTheme === 'natural' ? blockState('stripped_spruce_log', { axis: 'x' }) : blockState('white_wool');
  const roofResult = roofGable(builder, {
    xFrom: xs - 1,
    xTo: xe + 1,
    zFront: zf - 1,
    zBack: zb + 1,
    baseY: roofBaseY,
    rise: 1,
    roof: stripe,
    cover: snow ? colors.roofCover : undefined,
    gable: { state: materials.wall, xs: [xs, xe] },
  });
  for (let y = roofBaseY; y <= roofResult.ridgeY; y++)
    for (let x = 0; x < dimensions.width; x++)
      for (let z = 0; z < dimensions.length; z++) {
        if (x % 2 === 0 && builder.getBlock(x, y, z) === stripe) builder.setBlock(x, y, z, stripeAlt, Priority.ROOF);
      }

  // Garland under the front eave, with bows.
  if (garland) {
    for (let x = xs; x <= xe; x++) {
      const isBow = colors.garlandBow !== null && x % 3 === 0;
      builder.setBlock(x, POST_HEIGHT, zf - 1, isBow ? (colors.garlandBow as string) : colors.garland, Priority.DECOR);
    }
  }

  return { builder, layout: { dimensions, booths, front: zf, back: zb, counterY, roofBaseY } };
}
