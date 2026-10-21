import { blockState } from '@/core/blocks/registry';
import { resolvePalettes } from '@/core/blocks/palettes';
import type { BuildSize, BuildSpec } from '@/core/schema/buildSpec';
import type { Dimensions } from '@/core/schema/voxelModel';
import { windowSegments } from '@/core/generator/buildHouse';
import { Priority, roofGable, VoxelBuilder } from '@/core/generator/geometry';
import { createSeededRandom } from '@/core/generator/seededRandom';

/**
 * Small winter railway station along the X axis: track bed with sleepers and real rails,
 * a raised platform with an edge line and a roofed canopy, and a station building whose
 * door opens onto the platform.
 */

const STATION_SIZES: Record<BuildSize, { length: number; tracks: 1 | 2; building: { width: number; depth: number; wall: number } }> = {
  small: { length: 25, tracks: 1, building: { width: 11, depth: 7, wall: 4 } },
  medium: { length: 33, tracks: 1, building: { width: 15, depth: 9, wall: 5 } },
  large: { length: 41, tracks: 2, building: { width: 19, depth: 11, wall: 5 } },
};

const PLATFORM_DEPTH = 4;
const PLATFORM_TOP = 1; // platform blocks fill y = 0..1, people walk at y = 2
const CANOPY_Y = 6;

export interface StationLayout {
  dimensions: Dimensions;
  tracks: { z: number }[];
  platform: { x0: number; x1: number; z0: number; z1: number };
  building: { x0: number; x1: number; z0: number; z1: number; wallTop: number };
  door: { x: number; z: number; yFrom: number; yTo: number };
  canopyPosts: number[];
}

export function buildStation(spec: BuildSpec): { builder: VoxelBuilder; layout: StationLayout } {
  const size = STATION_SIZES[spec.size];
  const o = spec.options;
  const random = createSeededRandom(spec.seed);
  const { materials, colors, roof } = resolvePalettes(spec.materialTheme, spec.colorTheme, spec.style, o);
  const snow = o.snow ?? true;
  const lights = o.lights ?? true;
  const garland = o.garland ?? spec.detailLevel >= 2;
  const tree = o.christmasTree ?? spec.detailLevel >= 2;
  const chimney = o.chimney ?? true;

  const bedRows = size.tracks * 3;
  const pz0 = 1 + bedRows;
  const pz1 = pz0 + PLATFORM_DEPTH - 1;
  const { width: bw, depth: bd, wall: bWall } = size.building;
  const bz0 = pz1 + 1;
  const bz1 = bz0 + bd - 1;
  const wallTop = PLATFORM_TOP + bWall; // walls stand on the floor at y = 1
  const roofLayers = Math.floor((bd + 1) / 2) + 1;
  const ridgeY = wallTop + roofLayers;
  const dimensions = { width: size.length, height: ridgeY + 3, length: bz1 + 2 };
  const builder = new VoxelBuilder(dimensions);
  const W = size.length;

  // 1. Track beds: stone with wooden sleepers, real rails on top (rails need solid ground).
  const sleeper = blockState(`${o.frameWood ?? 'spruce'}_log`, { axis: 'z' });
  const bed = blockState('cobblestone');
  const rail = blockState('rail', { shape: 'east_west' });
  const tracks: StationLayout['tracks'] = [];
  for (let t = 0; t < size.tracks; t++) {
    const tz = 2 + 3 * t;
    tracks.push({ z: tz });
    for (let x = 0; x < W; x++) {
      for (let z = tz - 1; z <= tz + 1; z++) builder.setBlock(x, 0, z, x % 2 === 0 ? sleeper : bed, Priority.STRUCTURE);
      builder.setBlock(x, 1, tz, rail, Priority.STRUCTURE);
    }
  }

  // 2. Platform (two blocks high) with a yellow safety edge.
  const px0 = 2;
  const px1 = W - 3;
  builder.fillBox({ x: px0, y: 0, z: pz0 }, { x: px1, y: 0, z: pz1 }, blockState('stone_bricks'), Priority.STRUCTURE);
  builder.fillBox({ x: px0, y: PLATFORM_TOP, z: pz0 }, { x: px1, y: PLATFORM_TOP, z: pz1 }, blockState('smooth_stone'), Priority.STRUCTURE);
  for (let x = px0; x <= px1; x++) builder.setBlock(x, PLATFORM_TOP, pz0, blockState('yellow_concrete'), Priority.STRUCTURE);

  // 3. Canopy: posts every 6 blocks, roof slab, snow, lights and garland.
  const canopyPosts: number[] = [];
  const postZ = pz0 + 2;
  for (let x = px0 + 1; x <= px1 - 1; x += 6) {
    canopyPosts.push(x);
    builder.fillBox({ x, y: PLATFORM_TOP + 1, z: postZ }, { x, y: CANOPY_Y - 1, z: postZ }, materials.post, Priority.STRUCTURE);
    if (lights) builder.setBlock(x, CANOPY_Y - 1, postZ - 1, colors.light, Priority.STRUCTURE);
  }
  builder.fillBox({ x: px0, y: CANOPY_Y, z: pz0 - 1 }, { x: px1, y: CANOPY_Y, z: pz1 }, roof, Priority.ROOF);
  if (snow) builder.fillBox({ x: px0, y: CANOPY_Y + 1, z: pz0 - 1 }, { x: px1, y: CANOPY_Y + 1, z: pz1 }, colors.roofCover, Priority.ROOF_COVER);
  if (garland) {
    for (let x = px0; x <= px1; x++) {
      const isBow = colors.garlandBow !== null && x % 4 === 0;
      builder.setBlock(x, CANOPY_Y - 1, pz0 - 1, isBow ? (colors.garlandBow as string) : colors.garland, Priority.DECOR);
    }
  }

  // 4. Station building behind the platform; floor at platform height.
  const bx0 = Math.floor((W - bw) / 2);
  const bx1 = bx0 + bw - 1;
  const xc = bx0 + (bw - 1) / 2;
  builder.fillBox({ x: bx0, y: 0, z: bz0 }, { x: bx1, y: 0, z: bz1 }, materials.foundation, Priority.STRUCTURE);
  builder.fillBox({ x: bx0, y: PLATFORM_TOP, z: bz0 }, { x: bx1, y: PLATFORM_TOP, z: bz1 }, materials.floor, Priority.STRUCTURE);
  builder.hollowBox({ x: bx0, y: PLATFORM_TOP + 1, z: bz0 }, { x: bx1, y: wallTop, z: bz1 }, materials.wall, Priority.STRUCTURE);
  for (const [px, pz] of [
    [bx0, bz0],
    [bx1, bz0],
    [bx0, bz1],
    [bx1, bz1],
  ] as const) {
    builder.fillBox({ x: px, y: PLATFORM_TOP + 1, z: pz }, { x: px, y: wallTop, z: pz }, materials.post, Priority.STRUCTURE);
  }
  for (let x = bx0; x <= bx1; x++) {
    builder.setBlock(x, wallTop, bz0, materials.beamX, Priority.STRUCTURE);
    builder.setBlock(x, wallTop, bz1, materials.beamX, Priority.STRUCTURE);
  }

  // Door onto the platform (2 high, open) with clearance on both sides.
  const door = { x: xc, z: bz0, yFrom: PLATFORM_TOP + 1, yTo: PLATFORM_TOP + 2 };
  for (let z = bz0 - 1; z <= bz0 + 1; z++) for (let y = door.yFrom; y <= door.yTo; y++) builder.clear(xc, y, z);

  // Windows.
  const windowFrom = PLATFORM_TOP + 2;
  const windowTo = wallTop - 1;
  for (const z of [bz0, bz1]) {
    for (const [s, e] of windowSegments(bx0 + 1, xc - 2, 'normal', 2)) {
      for (let x = s; x <= e; x++)
        for (let y = windowFrom; y <= windowTo; y++) {
          builder.setBlock(x, y, z, colors.windowGlass, Priority.OPENING);
          builder.setBlock(2 * xc - x, y, z, colors.windowGlass, Priority.OPENING);
        }
    }
  }
  for (const x of [bx0, bx1]) {
    const zm = bz0 + (bd - 1) / 2;
    for (let y = windowFrom; y <= windowTo; y++) builder.setBlock(x, y, zm, colors.windowGlass, Priority.OPENING);
  }
  // Station clock above the door.
  builder.setBlock(xc, wallTop, bz0, blockState('gold_block'), Priority.ANNEX);

  const roofResult = roofGable(builder, {
    xFrom: bx0 - 1,
    xTo: bx1 + 1,
    zFront: bz0 - 1,
    zBack: bz1 + 1,
    baseY: wallTop + 1,
    rise: 1,
    roof,
    cover: snow ? colors.roofCover : undefined,
    gable: { state: materials.wall, xs: [bx0, bx1] },
  });

  if (chimney) {
    const cx = random.chance(0.5) ? bx1 - 3 : bx0 + 3;
    const cz = Math.min(bz0 + (bd - 1) / 2 + 2, bz1 - 1);
    const bottom = builder.firstSolidAbove(cx, wallTop + 1, cz);
    if (bottom !== null) {
      for (let y = bottom; y <= roofResult.ridgeY + 1; y++) builder.setBlock(cx, y, cz, materials.chimney, Priority.CHIMNEY);
      builder.setBlock(cx, roofResult.ridgeY + 2, cz, materials.chimneyCap, Priority.CHIMNEY);
    }
  }
  if (lights) {
    const under = builder.firstSolidAbove(xc, wallTop + 1, bz0 + (bd - 1) / 2);
    if (under !== null) builder.setBlock(xc, under - 1, bz0 + (bd - 1) / 2, colors.light, Priority.DECOR);
  }

  // Small Christmas tree at the far end of the platform.
  if (tree) {
    const tx = canopyPosts.includes(px1 - 2) ? px1 - 3 : px1 - 2;
    const tz = pz0 + 2;
    const y0 = PLATFORM_TOP + 1;
    builder.fillBox({ x: tx, y: y0, z: tz }, { x: tx, y: y0 + 1, z: tz }, colors.treeTrunk, Priority.DECOR);
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dz === 0) continue;
        builder.setBlock(tx + dx, y0 + 1, tz + dz, random.chance(0.25) ? random.pick(colors.ornaments) : colors.treeLeaves, Priority.DECOR);
      }
    builder.setBlock(tx, y0 + 2, tz, colors.treeLeaves, Priority.DECOR);
    builder.setBlock(tx, y0 + 3, tz, colors.treeTop, Priority.DECOR);
  }

  return {
    builder,
    layout: {
      dimensions,
      tracks,
      platform: { x0: px0, x1: px1, z0: pz0, z1: pz1 },
      building: { x0: bx0, x1: bx1, z0: bz0, z1: bz1, wallTop },
      door,
      canopyPosts,
    },
  };
}
