import type { ColorPalette, MaterialPalette } from '@/core/blocks/palettes';
import type { AnnexSide } from '@/core/schema/buildOptions';
import type { HouseParameters } from '@/core/generator/buildHouse';
import { hipRoofLayers, Priority, roofGable, roofHip, type Vec3, type VoxelBuilder } from '@/core/generator/geometry';
import type { SeededRandom } from '@/core/generator/seededRandom';

/**
 * Attachable building parts for the house generator. Each part is real geometry with its own
 * foundation, walls, roof and openings, joined to the house through explicit passages.
 */

export interface ComponentContext {
  builder: VoxelBuilder;
  params: HouseParameters;
  materials: MaterialPalette;
  colors: ColorPalette;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  xc: number;
  zc: number;
  wallTop: number;
  /** y of the topmost block of the main roof. */
  ridgeTop: number;
  random: SeededRandom;
}

export interface ComponentBox {
  kind: 'tower' | 'annex' | 'porch' | 'hedge';
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  /** House windows inside this box are not placed (the part covers that wall). */
  blocksHouseWall: boolean;
  /** Ground footprint of the walls (without roof overhang); used for blocking house windows. */
  footprint: { x0: number; x1: number; z0: number; z1: number };
}

/** Tower: 5x5 footprint centred on a front corner of the house. */
export const TOWER_HALF = 2;
const TOWER_ROOF_SPAN = 2 * TOWER_HALF + 1 + 2;

export function towerTopY(wallTop: number, ridgeTop: number): number {
  return Math.max(wallTop + 4, ridgeTop - 1);
}

export function towerRoofTop(towerTop: number): number {
  return towerTop + hipRoofLayers(TOWER_ROOF_SPAN, TOWER_ROOF_SPAN);
}

export function buildTower(ctx: ComponentContext, side: 'left' | 'right'): { box: ComponentBox; passages: Vec3[] } {
  const { builder, materials, colors, params, x0, x1, z0, z1 } = ctx;
  const cx = side === 'left' ? x0 : x1;
  const cz = z0;
  const tx0 = cx - TOWER_HALF;
  const tx1 = cx + TOWER_HALF;
  const tz0 = cz - TOWER_HALF;
  const tz1 = cz + TOWER_HALF;
  const top = towerTopY(ctx.wallTop, ctx.ridgeTop);

  builder.fillBox({ x: tx0, y: 0, z: tz0 }, { x: tx1, y: 0, z: tz1 }, materials.floor, Priority.ANNEX);
  builder.hollowBox({ x: tx0, y: 0, z: tz0 }, { x: tx1, y: 0, z: tz1 }, materials.foundation, Priority.ANNEX);
  builder.hollowBox({ x: tx0, y: 1, z: tz0 }, { x: tx1, y: top, z: tz1 }, materials.wall, Priority.ANNEX);
  for (const [px, pz] of [
    [tx0, tz0],
    [tx1, tz0],
    [tx0, tz1],
    [tx1, tz1],
  ] as const) {
    builder.fillBox({ x: px, y: 1, z: pz }, { x: px, y: top, z: pz }, materials.post, Priority.ANNEX);
  }

  // Open shaft inside the tower; it swallows the house corner, which joins both rooms.
  const passages: Vec3[] = [];
  for (let y = 1; y <= top; y++)
    for (let x = tx0 + 1; x <= tx1 - 1; x++)
      for (let z = tz0 + 1; z <= tz1 - 1; z++) {
        builder.clear(x, y, z);
        const onHouseWall = x >= x0 && x <= x1 && z >= z0 && z <= z1 && (x === x0 || x === x1 || z === z0 || z === z1);
        if (onHouseWall && y <= ctx.wallTop) passages.push({ x, y, z });
      }
  // Doorway from the tower into the main room.
  const doorX = side === 'left' ? tx1 : tx0;
  for (let y = 1; y <= 2; y++) {
    builder.clear(doorX, y, cz + 1);
    builder.clear(doorX + (side === 'left' ? 1 : -1), y, cz + 1);
  }

  // Windows on the two outward faces, low and high.
  const outwardX = side === 'left' ? tx0 : tx1;
  const rows = [2, 3, top - 2, top - 1].filter((y, i, all) => y >= 2 && y < top && all.indexOf(y) === i);
  for (const y of rows) {
    builder.setBlock(outwardX, y, cz, colors.windowGlass, Priority.OPENING);
    builder.setBlock(cx, y, tz0, colors.windowGlass, Priority.OPENING);
  }
  const roof = roofHip(builder, {
    xFrom: tx0 - 1,
    xTo: tx1 + 1,
    zFrom: tz0 - 1,
    zTo: tz1 + 1,
    baseY: top + 1,
    rise: 1,
    roof: params.roof,
    cover: params.snow ? colors.roofCover : undefined,
    priority: Priority.ANNEX,
  });
  if (params.wreath) builder.setBlock(cx, roof.ridgeY + (params.snow ? 2 : 1), cz, colors.treeTop, Priority.ANNEX);
  // Lantern hanging directly below the pyramid roof inside the shaft.
  if (params.lights) {
    const under = builder.firstSolidAbove(cx, top + 1, cz);
    if (under !== null) builder.setBlock(cx, under - 1, cz, colors.light, Priority.ANNEX);
  }
  return {
    box: {
      kind: 'tower',
      x0: tx0 - 1,
      x1: tx1 + 1,
      z0: tz0 - 1,
      z1: tz1 + 1,
      blocksHouseWall: true,
      footprint: { x0: tx0, x1: tx1, z0: tz0, z1: tz1 },
    },
    passages,
  };
}

/** Annex: gabled wing on a side wall, joined by an open doorway. */
export const ANNEX_GEOMETRY = { length: 7, minHouseDepth: 9 } as const;

export function buildAnnex(ctx: ComponentContext, side: Exclude<AnnexSide, 'none'>): { box: ComponentBox; passages: Vec3[] } {
  const { builder, materials, colors, params, x0, x1, zc } = ctx;
  const dir = side === 'right' ? 1 : -1;
  const wallX = side === 'right' ? x1 : x0;
  const farX = wallX + dir * (ANNEX_GEOMETRY.length - 1);
  const depth = Math.max(5, params.depth - 4 - ((params.depth - 4) % 2 === 0 ? 1 : 0));
  const az0 = zc - (depth - 1) / 2;
  const az1 = zc + (depth - 1) / 2;
  const aWall = Math.max(3, ctx.wallTop - 1);
  const ax0 = Math.min(wallX, farX);
  const ax1 = Math.max(wallX, farX);

  builder.fillBox({ x: ax0, y: 0, z: az0 }, { x: ax1, y: 0, z: az1 }, materials.floor, Priority.ANNEX);
  builder.hollowBox({ x: ax0, y: 0, z: az0 }, { x: ax1, y: 0, z: az1 }, materials.foundation, Priority.ANNEX);
  builder.hollowBox({ x: ax0, y: 1, z: az0 }, { x: ax1, y: aWall, z: az1 }, materials.wall, Priority.ANNEX);
  for (const pz of [az0, az1]) builder.fillBox({ x: farX, y: 1, z: pz }, { x: farX, y: aWall, z: pz }, materials.post, Priority.ANNEX);

  // Doorway through the house wall.
  const passages: Vec3[] = [];
  for (let y = 1; y <= 2; y++) {
    for (const x of [wallX - dir, wallX, wallX + dir]) builder.clear(x, y, zc);
    passages.push({ x: wallX, y, z: zc });
  }

  // Windows: far wall and both long sides.
  const midX = Math.round((wallX + farX) / 2);
  const windowTop = Math.max(2, aWall - 1);
  for (let y = 2; y <= windowTop; y++) {
    builder.setBlock(farX, y, zc, colors.windowGlass, Priority.OPENING);
    builder.setBlock(midX, y, az0, colors.windowGlass, Priority.OPENING);
    builder.setBlock(midX, y, az1, colors.windowGlass, Priority.OPENING);
  }

  roofGable(builder, {
    xFrom: side === 'right' ? wallX + 1 : farX - 1,
    xTo: side === 'right' ? farX + 1 : wallX - 1,
    zFront: az0 - 1,
    zBack: az1 + 1,
    baseY: aWall + 1,
    rise: 1,
    roof: params.roof,
    cover: params.snow ? colors.roofCover : undefined,
    gable: { state: materials.wall, xs: [farX] },
  });
  if (params.lights) {
    const under = builder.firstSolidAbove(midX, aWall + 1, zc);
    if (under !== null) builder.setBlock(midX, under - 1, zc, colors.light, Priority.DECOR);
  }
  return {
    box: {
      kind: 'annex',
      x0: Math.min(ax0, farX - 1),
      x1: Math.max(ax1, farX + 1),
      z0: az0 - 1,
      z1: az1 + 1,
      blocksHouseWall: true,
      footprint: { x0: ax0, x1: ax1, z0: az0, z1: az1 },
    },
    passages,
  };
}

/** Porch: roofed area in front of the door, open to the front. */
export const PORCH_DEPTH = 3;

export function buildPorch(ctx: ComponentContext): ComponentBox {
  const { builder, materials, colors, params, xc, z0 } = ctx;
  const front = z0 - PORCH_DEPTH;
  const roofY = 4;
  builder.fillBox({ x: xc - 2, y: 0, z: front }, { x: xc + 2, y: 0, z: z0 - 1 }, materials.floor, Priority.ANNEX);
  for (const px of [xc - 2, xc + 2]) builder.fillBox({ x: px, y: 1, z: front }, { x: px, y: roofY - 1, z: front }, materials.post, Priority.ANNEX);
  builder.fillBox({ x: xc - 2, y: roofY, z: front - 1 }, { x: xc + 2, y: roofY, z: z0 - 1 }, params.roof, Priority.ANNEX);
  if (params.snow) builder.fillBox({ x: xc - 2, y: roofY + 1, z: front - 1 }, { x: xc + 2, y: roofY + 1, z: z0 - 1 }, colors.roofCover, Priority.ANNEX);
  for (let z = front; z <= z0 - 1; z++) for (let y = 1; y <= 2; y++) builder.clear(xc, y, z);
  if (params.lights) builder.setBlock(xc, roofY - 1, z0 - 2, colors.light, Priority.ANNEX);
  builder.setBlock(xc, 0, front - 1, materials.path, Priority.ANNEX);
  return {
    kind: 'porch',
    x0: xc - 2,
    x1: xc + 2,
    z0: front - 1,
    z1: z0 - 1,
    blocksHouseWall: false,
    footprint: { x0: xc - 2, x1: xc + 2, z0: front, z1: z0 - 1 },
  };
}

/** Hedge around the plot (ground level) with an entrance gap, a path and corner lamps. */
export function buildHedge(ctx: ComponentContext): ComponentBox {
  const { builder, materials, colors, params, xc, z0 } = ctx;
  const { width, length } = builder.dimensions;
  for (let x = 0; x < width; x++)
    for (let z = 0; z < length; z++) {
      const edge = x === 0 || z === 0 || x === width - 1 || z === length - 1;
      if (!edge || (z === 0 && x === xc)) continue;
      builder.setBlock(x, 0, z, colors.garland, Priority.DECOR);
      if (params.snow) builder.setBlock(x, 1, z, colors.roofCover, Priority.DECOR);
    }
  for (let z = 0; z < z0; z++) if (builder.isAir(xc, 0, z)) builder.setBlock(xc, 0, z, materials.path, Priority.DECOR);
  if (params.lights) {
    for (const [x, z] of [
      [0, 0],
      [width - 1, 0],
      [0, length - 1],
      [width - 1, length - 1],
    ] as const) {
      builder.setBlock(x, 0, z, materials.post, Priority.ANNEX);
      builder.setBlock(x, 1, z, materials.post, Priority.ANNEX);
      builder.setBlock(x, 2, z, colors.light, Priority.ANNEX);
    }
  }
  const all = { x0: 0, x1: width - 1, z0: 0, z1: length - 1 };
  return { kind: 'hedge', ...all, blocksHouseWall: false, footprint: all };
}
