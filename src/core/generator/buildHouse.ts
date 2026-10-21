import { resolvePalettes, type ColorPalette, type MaterialPalette } from '@/core/blocks/palettes';
import type { AnnexSide, RoofShape, TowerPosition, WindowDensity } from '@/core/schema/buildOptions';
import type { BuildSize, BuildSpec } from '@/core/schema/buildSpec';
import { checkDimensions, type Dimensions } from '@/core/schema/voxelModel';
import { decorateHouse } from '@/core/generator/decorations';
import {
  hipRoofLayers,
  Priority,
  roofGable,
  roofHip,
  VoxelBuilder,
  type GableRoofResult,
  type Vec3,
} from '@/core/generator/geometry';
import {
  ANNEX_GEOMETRY,
  buildAnnex,
  buildHedge,
  buildPorch,
  buildTower,
  PORCH_DEPTH,
  TOWER_HALF,
  towerRoofTop,
  towerTopY,
  type ComponentBox,
} from '@/core/generator/houseComponents';
import { createSeededRandom, type SeededRandom } from '@/core/generator/seededRandom';

interface SizeDefaults {
  /** Footprint along X (odd, so the door can be centred). */
  width: number;
  /** Footprint along Z (odd, so the ridge is a single block). */
  depth: number;
  /** Wall height above the floor layer; interior clear height at the eaves. */
  wallHeight: number;
}

const SIZE_DEFAULTS: Record<BuildSize, SizeDefaults> = {
  small: { width: 9, depth: 7, wallHeight: 3 },
  medium: { width: 13, depth: 11, wallHeight: 4 },
  large: { width: 17, depth: 13, wallHeight: 5 },
};

export const DOOR_HEIGHT = 2;
/** Roof overhang on every side. */
export const OVERHANG = 1;
/** Extra free margin for the hedge ring around the plot. */
const HEDGE_MARGIN = 2;

/** Raised when the requested parameters do not fit into the MVP volume limits. */
export class BuildLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BuildLimitError';
  }
}

/** Every decision of the house generator, resolved from size/style/detail plus options. */
export interface HouseParameters {
  width: number;
  depth: number;
  wallHeight: number;
  roofShape: RoofShape;
  rise: 1 | 2;
  windows: WindowDensity;
  snow: boolean;
  chimney: boolean;
  lights: boolean;
  floorLights: boolean;
  garland: boolean;
  backGarland: boolean;
  christmasTree: boolean;
  presents: boolean;
  shutters: boolean;
  wreath: boolean;
  atticWindows: boolean;
  tower: TowerPosition;
  annex: AnnexSide;
  porch: boolean;
  hedge: boolean;
  materials: MaterialPalette;
  colors: ColorPalette;
  roof: string;
  /** Adjustments the generator had to make, shown to the user. */
  notes: string[];
}

/** The tree needs a 3x3 footprint plus room to walk around it. */
const MIN_TREE_FOOTPRINT = { width: 9, depth: 7 };

export function resolveHouseParameters(spec: BuildSpec): HouseParameters {
  const o = spec.options;
  const size = SIZE_DEFAULTS[spec.size];
  const detail = spec.detailLevel;
  const realistic = spec.style === 'realistic';
  const { materials, colors, roof } = resolvePalettes(spec.materialTheme, spec.colorTheme, spec.style, o);
  const lights = o.lights ?? true;
  const width = o.width ?? size.width;
  const depth = o.depth ?? size.depth;
  const notes: string[] = [];
  let christmasTree = o.christmasTree ?? detail >= 2;
  if (christmasTree && (width < MIN_TREE_FOOTPRINT.width || depth < MIN_TREE_FOOTPRINT.depth)) {
    christmasTree = false;
    if (o.christmasTree) {
      notes.push(
        `Der Weihnachtsbaum braucht mindestens ${MIN_TREE_FOOTPRINT.width}×${MIN_TREE_FOOTPRINT.depth} Grundfläche und wurde weggelassen.`,
      );
    }
  }
  const roofShape: RoofShape = o.roofShape ?? (spec.style === 'fairytale' ? 'steep' : 'gable');
  const tower = o.tower ?? 'none';
  let annex = o.annex ?? 'none';
  if (annex !== 'none' && annex === tower) {
    annex = tower === 'left' ? 'right' : 'left';
    notes.push(`Turm und Anbau können nicht auf derselben Seite stehen – der Anbau steht ${annex === 'left' ? 'links' : 'rechts'}.`);
  }
  if (annex !== 'none' && depth < ANNEX_GEOMETRY.minHouseDepth) {
    annex = 'none';
    notes.push(`Ein Anbau braucht mindestens ${ANNEX_GEOMETRY.minHouseDepth} Blöcke Haustiefe und wurde weggelassen.`);
  }
  return {
    width,
    depth,
    wallHeight: o.wallHeight ?? size.wallHeight,
    roofShape,
    rise: roofShape === 'steep' ? 2 : 1,
    windows: o.windows ?? 'normal',
    snow: o.snow ?? true,
    chimney: o.chimney ?? true,
    lights,
    floorLights: lights && detail >= 3,
    garland: o.garland ?? detail >= 2,
    backGarland: (o.garland ?? detail >= 2) && detail >= 3,
    christmasTree,
    presents: christmasTree && (o.presents ?? (detail >= 3 && !realistic)),
    shutters: detail >= 2,
    wreath: !realistic,
    atticWindows: (o.windows ?? 'normal') !== 'few' && detail >= 2 && roofShape !== 'hip',
    tower,
    annex,
    porch: o.porch ?? false,
    hedge: o.hedge ?? false,
    materials,
    colors,
    roof,
    notes,
  };
}

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
  roof: GableRoofResult & { baseY: number; rise: 1 | 2; shape: RoofShape };
  chimney: { xs: number[]; z: number; yFrom: number; yTo: number } | null;
  /** House-wall cells intentionally opened to attached parts (tower, annex). */
  passages: Vec3[];
  /** Attached parts (tower, annex, porch, hedge) – excluded from the main-house symmetry check. */
  components: ComponentBox[];
  style: BuildSpec['style'];
}

export interface HouseContext {
  spec: BuildSpec;
  params: HouseParameters;
  builder: VoxelBuilder;
  layout: HouseLayout;
  materials: MaterialPalette;
  colors: ColorPalette;
  random: SeededRandom;
}

interface Margins {
  left: number;
  right: number;
  front: number;
  back: number;
}

/** Free space needed around the footprint for overhang and attached parts. */
export function planMargins(p: Pick<HouseParameters, 'tower' | 'annex' | 'porch' | 'hedge' | 'width'>): Margins {
  const m: Margins = { left: OVERHANG, right: OVERHANG, front: OVERHANG, back: OVERHANG };
  if (p.tower !== 'none') {
    m[p.tower] = Math.max(m[p.tower], TOWER_HALF + OVERHANG);
    m.front = Math.max(m.front, TOWER_HALF + OVERHANG);
  }
  if (p.annex !== 'none') m[p.annex] = ANNEX_GEOMETRY.length + OVERHANG;
  if (p.porch) m.front = Math.max(m.front, PORCH_DEPTH + 1);
  if (p.hedge) {
    m.left += HEDGE_MARGIN;
    m.right += HEDGE_MARGIN;
    m.front += HEDGE_MARGIN;
    m.back += HEDGE_MARGIN;
  }
  return m;
}

function roofTopY(p: Pick<HouseParameters, 'width' | 'depth' | 'wallHeight' | 'rise' | 'roofShape'>): number {
  const spanZ = p.depth + 2 * OVERHANG;
  const spanX = p.width + 2 * OVERHANG;
  const layers = p.roofShape === 'hip' ? hipRoofLayers(spanX, spanZ) : Math.floor((spanZ - 1) / 2) + 1;
  return p.wallHeight + 1 + layers * p.rise - 1;
}

/** Volume needed for the parameters (roof layers, snow cover, chimney / tower spire). */
export function planHouseDimensions(
  p: Pick<HouseParameters, 'width' | 'depth' | 'wallHeight' | 'rise' | 'roofShape' | 'tower' | 'annex' | 'porch' | 'hedge'>,
): Dimensions {
  const m = planMargins(p);
  const ridge = roofTopY(p);
  // + snow cover on the ridge, + chimney cap one block above that.
  let height = ridge + 3;
  if (p.tower !== 'none') height = Math.max(height, towerRoofTop(towerTopY(p.wallHeight, ridge)) + 3);
  return {
    width: p.width + m.left + m.right,
    height,
    length: p.depth + m.front + m.back,
  };
}

/**
 * Window segments inside the wall run [from, to]: `few` = one narrow window, `normal` =
 * 2-wide windows with 3-block piers, `many` = 2-wide windows with 1-block piers.
 */
export function windowSegments(from: number, to: number, density: WindowDensity, normalWidth: number): [number, number][] {
  const length = to - from + 1;
  if (length <= 0) return [];
  const width = density === 'few' ? 1 : Math.min(normalWidth, length);
  const gap = density === 'many' ? 1 : 3;
  const count = density === 'few' ? 1 : Math.max(1, Math.floor((length + gap) / (width + gap)));
  const total = count * width + (count - 1) * gap;
  let start = from + Math.floor((length - total) / 2);
  const segments: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    segments.push([start, start + width - 1]);
    start += width + gap;
  }
  return segments;
}

const inFootprint = (b: ComponentBox, x: number, z: number) =>
  x >= b.footprint.x0 && x <= b.footprint.x1 && z >= b.footprint.z0 && z <= b.footprint.z1;

export function buildHouse(spec: BuildSpec): { builder: VoxelBuilder; layout: HouseLayout; params: HouseParameters } {
  const params = resolveHouseParameters(spec);
  const { rise, materials, colors } = params;
  const dimensions = planHouseDimensions(params);
  const limitIssues = checkDimensions(dimensions);
  if (limitIssues.length > 0) {
    throw new BuildLimitError(
      `Das Haus wäre ${dimensions.width}×${dimensions.height}×${dimensions.length} Blöcke groß und passt nicht in die Grenzen (${limitIssues.join('; ')}). Bitte Maße, Dachneigung oder Anbauten verringern.`,
    );
  }
  const builder = new VoxelBuilder(dimensions);
  const random = createSeededRandom(spec.seed);
  const margins = planMargins(params);

  const x0 = margins.left;
  const x1 = x0 + params.width - 1;
  const z0 = margins.front;
  const z1 = z0 + params.depth - 1;
  const xc = x0 + (params.width - 1) / 2;
  const zc = z0 + (params.depth - 1) / 2;
  const wallTop = params.wallHeight;
  const windowTop = Math.max(2, wallTop - 1);
  const ridgeTop = roofTopY(params);
  const passages: Vec3[] = [];
  const components: ComponentBox[] = [];

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

  // 4. Attached parts. Built before windows and roof so they win where they meet the house.
  const ctxBase = { builder, params, materials, colors, x0, x1, z0, z1, xc, zc, wallTop, ridgeTop, random };
  if (params.tower !== 'none') {
    const tower = buildTower(ctxBase, params.tower);
    passages.push(...tower.passages);
    components.push(tower.box);
  }
  if (params.annex !== 'none') {
    const annex = buildAnnex(ctxBase, params.annex);
    passages.push(...annex.passages);
    components.push(annex.box);
  }
  if (params.porch) components.push(buildPorch(ctxBase));
  if (params.hedge) components.push(buildHedge(ctxBase));
  const blocked = (x: number, z: number) => components.some((b) => b.blocksHouseWall && inFootprint(b, x, z));

  // 5. Windows with real glass blocks (skipped where an attached part covers the wall).
  const windows: WindowOpening[] = [];
  const shutterState = spec.style === 'realistic' ? materials.frame : colors.primaryAccent;
  const addWindow = (wall: WindowOpening['wall'], cells: WindowOpening['cells']): boolean => {
    if (cells.some((c) => blocked(c.x, c.z))) return false;
    for (const c of cells) builder.setBlock(c.x, c.y, c.z, colors.windowGlass, Priority.OPENING);
    windows.push({ wall, cells });
    return true;
  };

  // Front/back: windows on each side of the door, mirrored around xc.
  const frontSegments = windowSegments(x0 + 1, xc - 2, params.windows, 2);
  for (const z of [z0, z1]) {
    const wall = z === z0 ? 'front' : 'back';
    const placed: boolean[] = [];
    for (const [start, end] of frontSegments) {
      for (const mirrored of [false, true]) {
        const cells: WindowOpening['cells'] = [];
        for (let x = start; x <= end; x++) {
          for (let y = 2; y <= windowTop; y++) cells.push({ x: mirrored ? 2 * xc - x : x, y, z });
        }
        placed.push(addWindow(wall, cells));
      }
    }
    const single = frontSegments.length === 1 ? frontSegments[0] : undefined;
    if (params.shutters && single && placed.every(Boolean) && single[0] - 1 > x0 && single[1] + 1 < xc - 1) {
      for (let y = 2; y <= windowTop; y++) {
        builder.placeSymmetric(single[0] - 1, y, z, xc, shutterState, Priority.STRUCTURE);
        builder.placeSymmetric(single[1] + 1, y, z, xc, shutterState, Priority.STRUCTURE);
      }
    }
  }
  // Side walls: centred window(s).
  const sideNormalWidth = params.depth >= 9 ? 3 : 1;
  const sideSegments =
    params.windows === 'normal'
      ? windowSegments(z0 + 1, z1 - 1, 'few', 1).map(([s]): [number, number] => {
          const half = Math.floor(sideNormalWidth / 2);
          return [s - half, s + half];
        })
      : windowSegments(z0 + 1, z1 - 1, params.windows, 2);
  for (const x of [x0, x1]) {
    let placedAll = true;
    for (const [start, end] of sideSegments) {
      const cells: WindowOpening['cells'] = [];
      for (let z = start; z <= end; z++) for (let y = 2; y <= windowTop; y++) cells.push({ x, y, z });
      placedAll = addWindow(x === x0 ? 'left' : 'right', cells) && placedAll;
    }
    const single = sideSegments.length === 1 ? sideSegments[0] : undefined;
    if (params.shutters && single && placedAll && single[0] - 1 > z0 && single[1] + 1 < z1) {
      for (let y = 2; y <= windowTop; y++) {
        builder.setBlock(x, y, single[0] - 1, shutterState, Priority.STRUCTURE);
        builder.setBlock(x, y, single[1] + 1, shutterState, Priority.STRUCTURE);
      }
    }
  }

  // 6. Roof: symmetric stepped gable (or hip) roof from full blocks, optional snow cover.
  const roofBaseY = wallTop + 1;
  const roofResult =
    params.roofShape === 'hip'
      ? roofHip(builder, {
          xFrom: x0 - OVERHANG,
          xTo: x1 + OVERHANG,
          zFrom: z0 - OVERHANG,
          zTo: z1 + OVERHANG,
          baseY: roofBaseY,
          rise,
          roof: params.roof,
          cover: params.snow ? colors.roofCover : undefined,
        })
      : roofGable(builder, {
          xFrom: x0 - OVERHANG,
          xTo: x1 + OVERHANG,
          zBack: z1 + OVERHANG,
          zFront: z0 - OVERHANG,
          baseY: roofBaseY,
          rise,
          roof: params.roof,
          cover: params.snow ? colors.roofCover : undefined,
          gable: { state: materials.wall, xs: [x0, x1] },
        });

  // 7. Chimney beside the ridge on the back slope, near one gable end (side chosen by seed).
  const chimneyOnRight = random.chance(0.5);
  let chimney: HouseLayout['chimney'] = null;
  if (params.chimney) {
    const chimneyWidth = params.width <= 9 ? 1 : 2;
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
    chimney = { xs: chimneyXs, z: chimneyZ, yFrom: chimneyBottom, yTo: chimneyTop };
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
    roof: { ...roofResult, baseY: roofBaseY, rise, shape: params.roofShape },
    chimney,
    passages,
    components,
    style: spec.style,
  };

  // 8./9. Christmas decoration, lights, tree – never inside reserved clearances.
  decorateHouse({ spec, params, builder, layout, materials, colors, random });

  return { builder, layout, params };
}
