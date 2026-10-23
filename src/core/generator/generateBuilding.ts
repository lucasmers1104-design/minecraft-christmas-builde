import { buildSpecSchema, isImplementedBuildingType, MAX_SEED, type BuildingType, type BuildSpec } from '@/core/schema/buildSpec';
import type { BuildOptions } from '@/core/schema/buildOptions';
import type { VoxelModel } from '@/core/schema/voxelModel';
import { isFaceFull } from '@/core/blocks/faces';
import { AIR, blockState, definitionOf } from '@/core/blocks/registry';
import type { Repair } from '@/core/blocks/validator';
import { GeometryError, Priority, VoxelBuilder } from '@/core/generator/geometry';
import { createSeededRandom, type SeededRandom } from '@/core/generator/seededRandom';
import { buildHouseV2, type HouseResult } from '@/core/generator/house/buildHouse';
import { resolveHouseInput, type HouseWishes } from '@/core/generator/house/resolveInput';
import type { HouseInput } from '@/core/generator/house/plan';
import { decorateHouseFestive, decorateTreePlot, gardenTreeFootprint, TREE_PLOT_HEIGHT, treePlotHalf } from '@/core/generator/festiveLayer';
import { festiveChoices } from '@/core/generator/festiveKits';
import { buildLandscape } from '@/core/generator/landscape';
import { addSnowCover } from '@/core/generator/festive';
import { buildMarket } from '@/core/generator/marketStall';
import { buildStation } from '@/core/generator/station';
import { buildTower, towerDiameter } from '@/core/generator/tower';
import { getStyle } from '@/core/style/styles';
import type { Role } from '@/core/style/palettes';

export class NotImplementedBuildingError extends Error {
  constructor(kind: string) {
    super(`Bauwerkstyp "${kind}" ist noch nicht verfügbar.`);
    this.name = 'NotImplementedBuildingError';
  }
}

/** The requested building does not fit the model limits (HTTP 422). */
export class BuildLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BuildLimitError';
  }
}

const HOUSE_OPTIONS: readonly (keyof BuildOptions)[] = [
  'width',
  'depth',
  'floors',
  'floorHeight',
  'roofType',
  'roofProfile',
  'overhang',
  'dormers',
  'wings',
  'annex',
  'tower',
  'towerPosition',
  'symmetry',
  'windows',
  'windowFamily',
  'doorFamily',
  'jetty',
  'oriel',
  'porch',
  'balcony',
  'chimney',
  'lanternDensity',
  'soulLanterns',
  'garland',
  'christmasTree',
  'presents',
  'snow',
  'garden',
  'palette',
  'materials',
];

/** Options each building type actually uses; everything else is reported as ignored. */
export const APPLICABLE_OPTIONS: Record<BuildingType, readonly (keyof BuildOptions)[]> = {
  house: HOUSE_OPTIONS,
  tree: ['presents', 'lanternDensity', 'soulLanterns', 'garden', 'snow'],
  // The market's huts use their own style tables (templates/stalls.ts); explicit materials apply.
  market_stall: ['materials', 'garland', 'presents', 'lanternDensity', 'soulLanterns', 'snow'],
  station: ['width', 'depth', 'floors', 'floorHeight', 'roofProfile', 'overhang', 'windows', 'windowFamily', 'doorFamily', 'chimney', 'garland', 'lanternDensity', 'soulLanterns', 'palette', 'materials', 'snow'],
  tower: ['floors', 'floorHeight', 'roofType', 'roofProfile', 'windows', 'doorFamily', 'garland', 'christmasTree', 'presents', 'lanternDensity', 'soulLanterns', 'palette', 'materials', 'garden', 'snow'],
};

const OPTION_LABELS: Partial<Record<keyof BuildOptions, string>> = {
  width: 'Breite',
  depth: 'Tiefe',
  floors: 'Geschosse',
  roofType: 'Dachform',
  roofProfile: 'Dachprofil',
  wings: 'Flügel',
  annex: 'Anbau',
  tower: 'Turm',
  porch: 'Veranda/Vordach',
  oriel: 'Erker',
  balcony: 'Balkon',
  chimney: 'Schornstein',
  dormers: 'Gauben',
  christmasTree: 'Weihnachtsbaum',
  garden: 'Garten',
  materials: 'Materialien',
  palette: 'Palette',
};

/** UI material roles → palette roles. */
const MATERIAL_ROLES: Readonly<Record<string, readonly Role[]>> = {
  wall: ['wall', 'upperWall'],
  roof: ['roof'],
  frame: ['frame', 'beam'],
  plinth: ['plinth'],
  accent: ['accent'],
};

function houseWishes(spec: BuildSpec): HouseWishes {
  const o = spec.options;
  const materials: Partial<Record<Role, string>> = {};
  for (const [part, id] of Object.entries(o.materials ?? {})) {
    if (!id) continue;
    for (const role of MATERIAL_ROLES[part] ?? []) materials[role] = id;
  }
  const { materials: _m, ...rest } = o;
  void _m;
  return { ...rest, ...(Object.keys(materials).length > 0 ? { materials } : {}) };
}

export interface GeneratedBuilding {
  model: VoxelModel;
  repairs: Repair[];
  notes: string[];
  /** Plan, roof sections and openings of houses, towers and the station building (for lints). */
  house?: HouseResult;
}

function houseInput(spec: BuildSpec, rng: SeededRandom, overrides: HouseWishes = {}): HouseInput {
  return resolveHouseInput(spec.style, spec.theme, spec.size, spec.detailLevel, spec.seed, spec.targetMinecraftVersion, { ...houseWishes(spec), ...overrides }, rng);
}

function finishHouse(spec: BuildSpec, input: HouseInput, house: HouseResult, rng: SeededRandom): VoxelBuilder {
  const { builder, plan } = house;
  const main = plan.masses[0]!;
  const doorZ = main.rect.z0 - (main.frames ? 3 : 2);
  // The landscape keeps a spot of the right size free for the festive garden tree.
  const tree = festiveChoices(spec.style, spec.theme, spec.detailLevel, spec.options).tree;
  const footprint = gardenTreeFootprint(spec);
  const { yard, report } = buildLandscape(builder, rng.fork('landscape'), [{ x: plan.door.x, z: doorZ, outward: 'north' }], {
    style: input.styleId,
    theme: input.theme,
    garden: input.garden,
    lantern: input.lantern,
    lanternDensity: input.lanternDensity,
    snowGround: input.festive.snow,
    materials: input.materials,
    minecraftVersion: spec.targetMinecraftVersion,
    size: spec.size,
    detailLevel: spec.detailLevel,
    christmasTree: tree,
    treeRadius: footprint.radius,
    treeHeight: footprint.height,
  });
  decorateHouseFestive(builder, rng, spec, input, house, yard, report.anchor);
  hardenCoveredPaths(builder);
  return builder;
}

/**
 * A trodden path under a block (a present, a woodpile placed later) would turn into dirt in the
 * game; store it as coarse dirt right away instead of leaving it to the validator.
 */
function hardenCoveredPaths(b: VoxelBuilder): void {
  const path = blockState('dirt_path');
  // Same rule as the validator: a block whose bottom face is full and solid.
  const covers = (s: string) => s !== AIR && definitionOf(s).shape !== 'fence_gate' && isFaceFull(s, 'down', 'collision');
  for (let z = 0; z < b.dimensions.length; z++)
    for (let x = 0; x < b.dimensions.width; x++)
      if (b.dimensions.height > 1 && b.getBlock(x, 0, z) === path && covers(b.getBlock(x, 1, z))) b.setBlock(x, 0, z, blockState('coarse_dirt'), Priority.CLEARANCE);
}

function buildTreePlot(spec: BuildSpec, rng: SeededRandom): VoxelBuilder {
  const height = TREE_PLOT_HEIGHT[spec.size];
  const half = treePlotHalf(height);
  const b = new VoxelBuilder({ width: 2 * half + 1, height: height + 3, length: 2 * half + 1 });
  for (let x = 0; x <= 2 * half; x++) for (let z = 0; z <= 2 * half; z++) b.setBlock(x, 0, z, blockState(spec.options.snow ? 'snow_block' : 'grass_block'), Priority.DECOR);
  decorateTreePlot(b, rng, spec, half);
  return b;
}

function generate(spec: BuildSpec): { builder: VoxelBuilder; house?: HouseResult } {
  const rng = createSeededRandom(spec.seed);
  try {
    switch (spec.kind) {
      case 'house': {
        const input = houseInput(spec, rng);
        const house = buildHouseV2(input);
        return { builder: finishHouse(spec, input, house, rng), house };
      }
      case 'tower': {
        // Round tower on its own plot; the roof follows the style (cone, dome, battlements).
        const floors = spec.options.floors ?? { small: 3, medium: 4, large: 6, huge: 10 }[spec.size];
        const d = towerDiameter(spec.size);
        const roofType = spec.options.roofType === 'flat' ? 'flat' : 'gable';
        const input = houseInput(spec, rng, { width: d, depth: d, floors, roofType, wings: 'none', annex: 'none', tower: 'none', porch: false, dormers: 0, chimney: false, jetty: false });
        const house = buildTower(input, d, rng.fork('tower'), spec.options.roofProfile !== undefined);
        return { builder: finishHouse(spec, input, house, rng), house };
      }
      case 'tree':
        return { builder: buildTreePlot(spec, rng) };
      case 'market_stall': {
        const input = houseInput(spec, rng);
        const { builder } = buildMarket(
          {
            style: spec.style,
            theme: spec.theme,
            size: spec.size,
            materials: input.materials,
            seed: spec.seed,
            minecraftVersion: spec.targetMinecraftVersion,
            detailLevel: spec.detailLevel,
            lantern: input.lantern,
            garland: spec.options.garland ?? spec.theme === 'christmas',
            presents: spec.options.presents ?? spec.theme === 'christmas',
            materialWishes: spec.options.materials ?? {},
            lanternDensity: input.lanternDensity,
          },
          rng.fork('market'),
        );
        return { builder };
      }
      case 'station': {
        // The hall grows with the size; the wings follow the hall.
        const width = spec.options.width ?? { small: 9, medium: 11, large: 15, huge: 19 }[spec.size];
        const depth = spec.options.depth ?? { small: 7, medium: 9, large: 11, huge: 13 }[spec.size];
        // Tall storeys (6) unless wished otherwise: the platform roof fits under the wings' eaves.
        // No chimney unless wished: the hall's outside stack would stand on the platform.
        const floorHeight = spec.options.floorHeight ?? 6;
        const chimney = spec.options.chimney ?? false;
        const input = houseInput(spec, rng, { width, depth, floorHeight, chimney, wings: 'none', annex: 'none', porch: false, dormers: 0 });
        const { builder, layout } = buildStation(input, rng.fork('station'));
        return { builder, house: layout.house };
      }
    }
  } catch (error) {
    if (error instanceof GeometryError) throw new BuildLimitError(error.message);
    throw error;
  }
}

/** Model plus the validator's repair log (expected to be empty for generated buildings). */
export function generateBuildingWithReport(input: BuildSpec): GeneratedBuilding {
  const spec = buildSpecSchema.parse(input);
  if (!isImplementedBuildingType(spec.kind)) throw new NotImplementedBuildingError(spec.kind);
  const { builder, house } = generate(spec);
  // Snow only on explicit request, last, so every light that would melt it is known.
  if (spec.options.snow === true) addSnowCover(builder);
  const { model, repairs } = builder.finalize(spec);
  return { model, repairs, notes: [...generationNotes(spec), ...(house ? houseNotes(spec, house) : [])], ...(house ? { house } : {}) };
}

/** Deterministic: the same validated spec always yields bit-identical block data. */
export function generateBuilding(input: BuildSpec): VoxelModel {
  return generateBuildingWithReport(input).model;
}

export const VARIANT_COUNT = 3;

export function variantSeeds(baseSeed: number, count = VARIANT_COUNT): number[] {
  return Array.from({ length: count }, (_, i) => (baseSeed + i) % (MAX_SEED + 1));
}

/** One real, independently generated model per seed (seed, seed+1, seed+2). */
export function generateVariants(spec: BuildSpec, count = VARIANT_COUNT): VoxelModel[] {
  return variantSeeds(spec.seed, count).map((seed) => generateBuilding({ ...spec, seed }));
}

/** Roof types with a fixed cross-section: the chosen profile cannot change them. */
const FIXED_PROFILE_ROOFS = new Set(['gambrel', 'mansard', 'a_frame', 'saltbox', 'flat']);

/** Wishes the resolved house could not honour (known only after planning). */
function houseNotes(spec: BuildSpec, house: HouseResult): string[] {
  const notes: string[] = [];
  const main = house.plan.masses[0]!;
  notes.push(...house.plan.notes);
  if (main.round && spec.kind === 'tower' && spec.options.roofType && spec.options.roofType !== 'flat') notes.push('Rundturm: die gewählte Dachform wird als Kegel gebaut.');
  if (spec.options.roofProfile && !main.round && FIXED_PROFILE_ROOFS.has(main.roofType)) notes.push(`Dachprofil ohne Wirkung: die Dachform „${main.roofType}“ hat einen festen Querschnitt.`);
  return notes;
}

/** Adjustments the generator makes to the requested spec (ignored options). */
export function generationNotes(input: BuildSpec): string[] {
  const spec = buildSpecSchema.parse(input);
  const notes: string[] = [];
  const applicable = APPLICABLE_OPTIONS[spec.kind];
  const ignored = (Object.keys(spec.options) as (keyof BuildOptions)[]).filter((key) => spec.options[key] !== undefined && !applicable.includes(key));
  if (ignored.length > 0) notes.push(`Für diesen Bauwerkstyp ohne Wirkung: ${ignored.map((k) => OPTION_LABELS[k] ?? k).join(', ')}.`);
  if (spec.options.palette && !getStyle(spec.style).palettes.includes(spec.options.palette)) {
    notes.push(`Palette „${spec.options.palette}“ gehört nicht zum Stil – der Stil wählt selbst.`);
  }
  return notes;
}
