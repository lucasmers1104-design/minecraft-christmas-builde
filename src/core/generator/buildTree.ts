import { blockState } from '@/core/blocks/registry';
import { resolvePalettes } from '@/core/blocks/palettes';
import type { BuildSize, BuildSpec } from '@/core/schema/buildSpec';
import type { Dimensions } from '@/core/schema/voxelModel';
import { Priority, VoxelBuilder } from '@/core/generator/geometry';
import { createSeededRandom } from '@/core/generator/seededRandom';

/**
 * Stand-alone Christmas tree: trunk, stacked conical tiers ("saw-tooth" silhouette),
 * ornaments and lights embedded in the outer rim, optional light spiral, a star on top,
 * snow on the tiers and presents underneath.
 */

const TREE_SIZES: Record<BuildSize, { height: number; radius: number; tiers: number }> = {
  small: { height: 13, radius: 4, tiers: 3 },
  medium: { height: 21, radius: 6, tiers: 4 },
  large: { height: 29, radius: 8, tiers: 5 },
};

/** Ground ring around the tree (presents, snow). */
const MARGIN = 2;

export interface TreeLayout {
  dimensions: Dimensions;
  center: number;
  trunkTop: number;
  /** y of the star's centre block. */
  starY: number;
  /** Leaf radius per y (index = y); 0 where there are no leaves. */
  radiusAt: number[];
  tierStarts: number[];
}

function disc(r: number): [number, number][] {
  const cells: [number, number][] = [];
  const limit = r * r + r * 0.8;
  for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) if (dx * dx + dz * dz <= limit) cells.push([dx, dz]);
  return cells;
}

export function buildTree(spec: BuildSpec): { builder: VoxelBuilder; layout: TreeLayout } {
  const size = TREE_SIZES[spec.size];
  const o = spec.options;
  const random = createSeededRandom(spec.seed);
  const { colors, materials } = resolvePalettes(spec.materialTheme, spec.colorTheme, spec.style, o);
  const realistic = spec.style === 'realistic';
  const fairytale = spec.style === 'fairytale';
  const snow = o.snow ?? true;
  const lights = o.lights ?? true;
  const spiral = o.garland ?? spec.detailLevel >= 2;
  const presents = o.presents ?? (spec.detailLevel >= 2 && !realistic);

  const width = 2 * (size.radius + MARGIN) + 1;
  const dimensions = { width, height: size.height + 1, length: width };
  const builder = new VoxelBuilder(dimensions);
  const c = size.radius + MARGIN;

  const leaves = spec.materialTheme === 'oak' ? blockState('oak_leaves') : blockState('spruce_leaves');
  const trunk = spec.materialTheme === 'oak' ? blockState('oak_log', { axis: 'y' }) : blockState('spruce_log', { axis: 'y' });
  const ground =
    spec.materialTheme === 'stone' ? materials.foundation : snow ? colors.roofCover : blockState('moss_block');

  // Ground disc (plaza) under the tree.
  for (const [dx, dz] of disc(size.radius + 1)) builder.setBlock(c + dx, 0, c + dz, ground, Priority.STRUCTURE);
  if (spec.materialTheme === 'stone') {
    for (const [dx, dz] of disc(size.radius + 1)) {
      if (dx * dx + dz * dz >= (size.radius + 1) ** 2 - size.radius) builder.setBlock(c + dx, 0, c + dz, materials.foundation, Priority.STRUCTURE);
    }
  }

  const leafStart = spec.size === 'small' ? 2 : 3;
  const crownTop = size.height - 3; // last full leaf layer
  const trunkTop = crownTop;
  builder.fillBox({ x: c, y: 1, z: c }, { x: c, y: trunkTop, z: c }, trunk, Priority.STRUCTURE);
  if (spec.size === 'large') {
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      builder.fillBox({ x: c + dx, y: 1, z: c + dz }, { x: c + dx, y: 2, z: c + dz }, trunk, Priority.STRUCTURE);
    }
  }

  // Tiers: each starts wide and narrows by one per layer; the next tier starts narrower.
  const radiusAt = new Array<number>(dimensions.height).fill(0);
  const tierStarts: number[] = [];
  const span = crownTop - leafStart + 1;
  const tierHeight = Math.ceil(span / size.tiers);
  for (let t = 0; t < size.tiers; t++) {
    const start = leafStart + t * tierHeight;
    if (start > crownTop) break;
    tierStarts.push(start);
    const outer = Math.max(1, Math.round(size.radius * (1 - t / (size.tiers + 0.5))));
    for (let i = 0; i < tierHeight && start + i <= crownTop; i++) {
      const y = start + i;
      const r = Math.max(1, outer - i);
      radiusAt[y] = r;
      for (const [dx, dz] of disc(r)) {
        if (dx === 0 && dz === 0) continue;
        builder.setBlock(c + dx, y, c + dz, leaves, Priority.STRUCTURE);
      }
    }
  }
  // Tip above the trunk.
  builder.setBlock(c, crownTop + 1, c, leaves, Priority.STRUCTURE);
  radiusAt[crownTop + 1] = 0;

  // Rim cells (leaves with open air beside them) carry ornaments and lights.
  const rim: { x: number; y: number; z: number }[] = [];
  for (let y = leafStart; y <= crownTop; y++)
    for (let x = 0; x < width; x++)
      for (let z = 0; z < width; z++) {
        if (builder.getBlock(x, y, z) !== leaves) continue;
        const open = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].some(([dx, dz]) => !builder.inside(x + dx!, y, z + dz!) || builder.isAir(x + dx!, y, z + dz!));
        if (open) rim.push({ x, y, z });
      }

  const ornamentChance = realistic ? 0 : spec.detailLevel === 1 ? 0.05 : spec.detailLevel === 2 ? 0.12 : 0.2;
  const ornamentPalette = fairytale
    ? [...colors.ornaments, blockState('magenta_wool'), blockState('lime_wool'), blockState('orange_wool')]
    : colors.ornaments;
  for (const cell of rim) {
    const roll = random.next();
    if (lights && roll < 0.07) builder.setBlock(cell.x, cell.y, cell.z, colors.light, Priority.STRUCTURE);
    else if (roll < 0.07 + ornamentChance) builder.setBlock(cell.x, cell.y, cell.z, random.pick(ornamentPalette), Priority.STRUCTURE);
  }

  // Light spiral (garland) winding around the crown.
  if (spiral) {
    const phase = random.next() * Math.PI * 2;
    for (let y = leafStart; y <= crownTop; y++) {
      const angle = phase + y * 0.85;
      const r = radiusAt[y]!;
      if (r < 1) continue;
      const x = c + Math.round(Math.cos(angle) * r);
      const z = c + Math.round(Math.sin(angle) * r);
      if (builder.getBlock(x, y, z) !== 'minecraft:air') {
        builder.setBlock(x, y, z, lights ? colors.light : colors.garlandBow ?? colors.primaryAccent, Priority.STRUCTURE);
      }
    }
  }

  // Snow on the upward-facing rim of every layer.
  if (snow) {
    for (let y = leafStart; y <= crownTop; y++)
      for (const cell of rim.filter((r) => r.y === y)) {
        const above = y + 1;
        if (above <= crownTop && builder.isAir(cell.x, above, cell.z) && random.chance(0.45)) {
          builder.setBlock(cell.x, above, cell.z, colors.roofCover, Priority.DECOR);
        }
      }
  }

  // Star: a plus shape with a top block, or a light for the realistic style.
  const starY = crownTop + 2;
  if (realistic) builder.setBlock(c, starY, c, colors.light, Priority.STRUCTURE);
  else {
    builder.setBlock(c, starY, c, colors.treeTop, Priority.STRUCTURE);
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      builder.setBlock(c + dx, starY, c + dz, colors.treeTop, Priority.STRUCTURE);
    }
    builder.setBlock(c, starY + 1, c, colors.treeTop, Priority.STRUCTURE);
  }

  // Presents on the ground ring under the lowest tier.
  if (presents) {
    const count = 4 + spec.detailLevel * 2;
    const ring = disc(size.radius).filter(([dx, dz]) => {
      const d2 = dx * dx + dz * dz;
      return d2 >= 4 && builder.isAir(c + dx, 1, c + dz);
    });
    for (const [dx, dz] of random.shuffle(ring).slice(0, count)) {
      builder.setBlock(c + dx, 1, c + dz, random.pick(colors.presents), Priority.DECOR);
    }
  }

  return { builder, layout: { dimensions, center: c, trunkTop, starY, radiusAt, tierStarts } };
}
