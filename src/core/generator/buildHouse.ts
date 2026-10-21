import { colorPalette, materialPalette, roofMaterial, type ColorPalette, type MaterialPalette } from '@/core/blocks/palettes';
import type { BuildSize, BuildSpec } from '@/core/schema/buildSpec';
import type { Dimensions } from '@/core/schema/voxelModel';
import { decorateHouse } from '@/core/generator/decorations';
import { Priority, roofGable, VoxelBuilder, type GableRoofResult } from '@/core/generator/geometry';
import { createSeededRandom, type SeededRandom } from '@/core/generator/seededRandom';

interface SizeParameters {
  /** Footprint along X (odd, so the door can be centred). */
  footprintWidth: number;
  /** Footprint along Z (odd, so the ridge is a single block). */
  footprintDepth: number;
  /** Wall height above the floor layer; interior clear height at the eaves. */
  wallHeight: number;
  frontWindowWidth: number;
  sideWindowWidth: number;
}

const SIZE_PARAMETERS: Record<BuildSize, SizeParameters> = {
  small: { footprintWidth: 9, footprintDepth: 7, wallHeight: 3, frontWindowWidth: 2, sideWindowWidth: 1 },
  medium: { footprintWidth: 13, footprintDepth: 11, wallHeight: 4, frontWindowWidth: 2, sideWindowWidth: 3 },
  large: { footprintWidth: 17, footprintDepth: 13, wallHeight: 5, frontWindowWidth: 2, sideWindowWidth: 3 },
};

export const DOOR_HEIGHT = 2;
/** Roof overhang on every side; also the free margin around the footprint. */
const OVERHANG = 1;

export interface WindowOpening {
  wall: 'front' | 'back' | 'left' | 'right';
  /** Cells of the glass pane. */
  cells: { x: number; y: number; z: number }[];
}

/** Everything later steps (decoration, tests) need to know about the generated house. */
export interface HouseLayout {
  dimensions: Dimensions;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  /** Door / symmetry axis. */
  xc: number;
  zc: number;
  /** y of the floor/foundation layer. */
  floorY: 0;
  /** y of the top wall beam. */
  wallTop: number;
  door: { x: number; z: number; yFrom: number; yTo: number };
  windows: WindowOpening[];
  roof: GableRoofResult & { baseY: number; rise: 1 | 2 };
  chimney: { xs: number[]; z: number; yFrom: number; yTo: number };
  style: BuildSpec['style'];
}

export interface HouseContext {
  spec: BuildSpec;
  builder: VoxelBuilder;
  layout: HouseLayout;
  materials: MaterialPalette;
  colors: ColorPalette;
  random: SeededRandom;
}

function planDimensions(size: SizeParameters, rise: 1 | 2): {
  dimensions: Dimensions;
  roofLayers: number;
} {
  const span = size.footprintDepth + 2 * OVERHANG - 1;
  const roofLayers = Math.floor(span / 2) + 1;
  const roofBaseY = size.wallHeight + 1;
  const roofTopY = roofBaseY + roofLayers * rise - 1;
  // + snow cover on the ridge, + chimney rising one block above that.
  const height = roofTopY + 3;
  return {
    dimensions: {
      width: size.footprintWidth + 2 * OVERHANG,
      height,
      length: size.footprintDepth + 2 * OVERHANG,
    },
    roofLayers,
  };
}

/** Segment [from, to] of a wall split into a centred window and optional shutter cells. */
function centredRun(from: number, to: number, width: number): { start: number; end: number } | null {
  const available = to - from + 1;
  if (available < width) return null;
  const start = from + Math.floor((available - width) / 2);
  return { start, end: start + width - 1 };
}

export function buildHouse(spec: BuildSpec): { builder: VoxelBuilder; layout: HouseLayout } {
  const size = SIZE_PARAMETERS[spec.size];
  const rise: 1 | 2 = spec.style === 'fairytale' ? 2 : 1;
  const { dimensions } = planDimensions(size, rise);
  const builder = new VoxelBuilder(dimensions);
  const random = createSeededRandom(spec.seed);
  const materials = materialPalette(spec.materialTheme);
  const colors = colorPalette(spec.colorTheme);

  const x0 = OVERHANG;
  const x1 = x0 + size.footprintWidth - 1;
  const z0 = OVERHANG;
  const z1 = z0 + size.footprintDepth - 1;
  const xc = x0 + (size.footprintWidth - 1) / 2;
  const zc = z0 + (size.footprintDepth - 1) / 2;
  const wallTop = size.wallHeight;
  const windowTop = Math.max(2, wallTop - 1);

  // 1. Foundation ring + floor on the footprint.
  builder.fillBox({ x: x0, y: 0, z: z0 }, { x: x1, y: 0, z: z1 }, materials.floor, Priority.STRUCTURE);
  builder.hollowBox({ x: x0, y: 0, z: z0 }, { x: x1, y: 0, z: z1 }, materials.foundation, Priority.STRUCTURE);

  // 2. Four closed walls, top beams, corner posts.
  builder.hollowBox({ x: x0, y: 1, z: z0 }, { x: x1, y: wallTop, z: z1 }, materials.wall, Priority.STRUCTURE);
  for (let x = x0; x <= x1; x++) {
    builder.setBlock(x, wallTop, z0, materials.beamX, Priority.STRUCTURE);
    builder.setBlock(x, wallTop, z1, materials.beamX, Priority.STRUCTURE);
  }
  for (let z = z0; z <= z1; z++) {
    builder.setBlock(x0, wallTop, z, materials.beamZ, Priority.STRUCTURE);
    builder.setBlock(x1, wallTop, z, materials.beamZ, Priority.STRUCTURE);
  }
  for (const [px, pz] of [
    [x0, z0],
    [x1, z0],
    [x0, z1],
    [x1, z1],
  ] as const) {
    builder.fillBox({ x: px, y: 1, z: pz }, { x: px, y: wallTop, z: pz }, materials.post, Priority.STRUCTURE);
  }

  // 3. Open, walkable two-block entrance in the front wall (real air), framed by posts.
  const door = { x: xc, z: z0, yFrom: 1, yTo: DOOR_HEIGHT };
  for (const dx of [-1, 1]) {
    for (let y = 1; y <= DOOR_HEIGHT; y++) builder.setBlock(xc + dx, y, z0, materials.frame, Priority.STRUCTURE);
  }
  for (let dx = -1; dx <= 1; dx++) builder.setBlock(xc + dx, DOOR_HEIGHT + 1, z0, materials.beamX, Priority.STRUCTURE);
  // Clearance: the doorway plus one cell outside and two cells inside stay air for good.
  for (let z = z0 - 1; z <= z0 + 2; z++) {
    for (let y = 1; y <= DOOR_HEIGHT; y++) builder.clear(xc, y, z);
  }
  builder.setBlock(xc, 0, z0 - 1, materials.path, Priority.STRUCTURE);

  // 4. Windows with real glass blocks.
  const windows: WindowOpening[] = [];
  const shutterState = spec.style === 'realistic' ? materials.frame : colors.primaryAccent;
  const withShutters = spec.detailLevel >= 2;
  const addWindow = (wall: WindowOpening['wall'], cells: WindowOpening['cells']): void => {
    for (const c of cells) builder.setBlock(c.x, c.y, c.z, colors.windowGlass, Priority.OPENING);
    windows.push({ wall, cells });
  };

  // Front/back: one window on each side of the door, mirrored around xc.
  const leftRun = centredRun(x0 + 1, xc - 2, size.frontWindowWidth);
  if (leftRun) {
    for (const z of [z0, z1]) {
      const wall = z === z0 ? 'front' : 'back';
      for (const mirrored of [false, true]) {
        const cells: WindowOpening['cells'] = [];
        for (let x = leftRun.start; x <= leftRun.end; x++) {
          for (let y = 2; y <= windowTop; y++) cells.push({ x: mirrored ? 2 * xc - x : x, y, z });
        }
        addWindow(wall, cells);
      }
      if (withShutters && leftRun.start - 1 > x0 && leftRun.end + 1 < xc - 1) {
        for (let y = 2; y <= windowTop; y++) {
          builder.placeSymmetric(leftRun.start - 1, y, z, xc, shutterState, Priority.STRUCTURE);
          builder.placeSymmetric(leftRun.end + 1, y, z, xc, shutterState, Priority.STRUCTURE);
        }
      }
    }
  }
  // Side walls: one centred window each.
  const sideRun = centredRun(z0 + 1, z1 - 1, size.sideWindowWidth);
  if (sideRun) {
    for (const x of [x0, x1]) {
      const cells: WindowOpening['cells'] = [];
      for (let z = sideRun.start; z <= sideRun.end; z++) for (let y = 2; y <= windowTop; y++) cells.push({ x, y, z });
      addWindow(x === x0 ? 'left' : 'right', cells);
      if (withShutters && sideRun.start - 1 > z0 && sideRun.end + 1 < z1) {
        for (let y = 2; y <= windowTop; y++) {
          builder.setBlock(x, y, sideRun.start - 1, shutterState, Priority.STRUCTURE);
          builder.setBlock(x, y, sideRun.end + 1, shutterState, Priority.STRUCTURE);
        }
      }
    }
  }

  // 5. Symmetric stepped gable roof (full blocks) with gable walls and snow cover.
  const roofBaseY = wallTop + 1;
  const roofResult = roofGable(builder, {
    xFrom: x0 - OVERHANG,
    xTo: x1 + OVERHANG,
    zFront: z0 - OVERHANG,
    zBack: z1 + OVERHANG,
    baseY: roofBaseY,
    rise,
    roof: roofMaterial(spec.style, materials, colors),
    cover: colors.roofCover,
    gable: { state: materials.wall, xs: [x0, x1] },
  });

  // 6. Chimney beside the ridge on the back slope, near one gable end (side chosen by seed).
  const chimneyOnRight = random.chance(0.5);
  const chimneyWidth = spec.size === 'small' ? 1 : 2;
  const chimneyZ = Math.min(zc + 2, z1 - 1);
  const chimneyXs: number[] = [];
  for (let i = 0; i < chimneyWidth; i++) chimneyXs.push(chimneyOnRight ? x1 - 2 - i : x0 + 2 + i);
  const chimneyTop = roofResult.ridgeY + 2;
  let chimneyBottom = chimneyTop;
  for (const x of chimneyXs) {
    const roofHit = builder.firstSolidAbove(x, roofBaseY, chimneyZ);
    if (roofHit === null) throw new Error('Schornstein findet keine Dachfläche');
    chimneyBottom = Math.min(chimneyBottom, roofHit);
  }
  for (const x of chimneyXs) {
    for (let y = chimneyBottom; y < chimneyTop; y++) builder.setBlock(x, y, chimneyZ, materials.chimney, Priority.CHIMNEY);
    builder.setBlock(x, chimneyTop, chimneyZ, materials.chimneyCap, Priority.CHIMNEY);
  }

  const layout: HouseLayout = {
    dimensions,
    x0,
    x1,
    z0,
    z1,
    xc,
    zc,
    floorY: 0,
    wallTop,
    door,
    windows,
    roof: { ...roofResult, baseY: roofBaseY, rise },
    chimney: { xs: chimneyXs, z: chimneyZ, yFrom: chimneyBottom, yTo: chimneyTop },
    style: spec.style,
  };

  // 7./8. Christmas decoration, lights, tree – never inside reserved clearances.
  decorateHouse({ spec, builder, layout, materials, colors, random });

  return { builder, layout };
}
