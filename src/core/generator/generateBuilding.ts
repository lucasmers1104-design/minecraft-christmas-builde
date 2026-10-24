import { buildSpecSchema, isImplementedBuildingType, MAX_SEED, type BuildingType, type BuildSpec } from '@/core/schema/buildSpec';
import type { BuildOptions } from '@/core/schema/buildOptions';
import { groundLevel, type VoxelModel } from '@/core/schema/voxelModel';
import { isFaceFull } from '@/core/blocks/faces';
import { AIR, blockState, definitionOf } from '@/core/blocks/registry';
import type { Repair } from '@/core/blocks/validator';
import { GeometryError, Priority, VoxelBuilder } from '@/core/generator/geometry';
import { createSeededRandom, type SeededRandom } from '@/core/generator/seededRandom';
import { buildHouseV2, type HouseResult } from '@/core/generator/house/buildHouse';
import { resolveHouseInput, type HouseWishes } from '@/core/generator/house/resolveInput';
import { doorMassOf, type HouseInput } from '@/core/generator/house/plan';
import { decorateHouseFestive, decorateTreePlot, gardenTreeFootprint, TREE_PLOT_HEIGHT, treePlotHalf } from '@/core/generator/festiveLayer';
import { festiveChoices } from '@/core/generator/festiveKits';
import { buildLandscape, type Entrance } from '@/core/generator/landscape';
import { VECTOR } from '@/core/blocks/directions';
import { Use } from '@/core/generator/landscapeSite';
import { addSnowCover } from '@/core/generator/festive';
import { extendFoundation } from '@/core/generator/foundation';
import { buildMarket } from '@/core/generator/marketStall';
import { buildStation } from '@/core/generator/station';
import { buildTower, towerDiameter } from '@/core/generator/tower';
import { getStyle, type SizeClass } from '@/core/style/styles';
import { measureHouse, qualityScore, qualityTargets } from '@/core/analysis/buildQuality';
import { COMPOSITION_LABELS } from '@/core/style/compositions';
import { compositionFitsStyle } from '@/core/generator/house/composition';
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
  'composition',
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
  'foundation',
  'palette',
  'materials',
];

/** Options each building type actually uses; everything else is reported as ignored. */
export const APPLICABLE_OPTIONS: Record<BuildingType, readonly (keyof BuildOptions)[]> = {
  house: HOUSE_OPTIONS,
  tree: ['presents', 'lanternDensity', 'soulLanterns', 'garden', 'snow', 'foundation'],
  // The market's huts use their own style tables (templates/stalls.ts); explicit materials apply.
  market_stall: ['materials', 'garland', 'presents', 'lanternDensity', 'soulLanterns', 'snow', 'foundation'],
  station: ['width', 'depth', 'floors', 'floorHeight', 'roofProfile', 'overhang', 'windows', 'windowFamily', 'doorFamily', 'chimney', 'garland', 'lanternDensity', 'soulLanterns', 'palette', 'materials', 'snow', 'foundation'],
  tower: ['floors', 'floorHeight', 'roofType', 'roofProfile', 'windows', 'doorFamily', 'garland', 'christmasTree', 'presents', 'lanternDensity', 'soulLanterns', 'palette', 'materials', 'garden', 'snow', 'foundation'],
};

const OPTION_LABELS: Partial<Record<keyof BuildOptions, string>> = {
  width: 'Breite',
  depth: 'Tiefe',
  composition: 'Bauform',
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
  foundation: 'Fundament nach unten',
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

/** Landscape and festive layer of a house; returns the builder and the path cells (kept free of snow). */
function finishHouse(spec: BuildSpec, input: HouseInput, house: HouseResult, rng: SeededRandom): { builder: VoxelBuilder; clear: Set<string> } {
  const { builder, plan } = house;
  const doorMass = doorMassOf(plan);
  const doorZ = doorMass.rect.z0 - (doorMass.frames ? 3 : 2);
  // The landscape keeps a spot of the right size free for the festive garden tree.
  const tree = festiveChoices(spec.style, spec.theme, spec.detailLevel, spec.options).tree;
  const footprint = gardenTreeFootprint(spec);
  // Entrances: the front door first, then a back or side door with its own small path.
  const entrances: Entrance[] = [{ x: plan.door.x, z: doorZ, outward: 'north' }];
  for (const d of house.openings.doors) {
    if (!d.back) continue;
    const mass = plan.masses.find((m) => m.id === d.mass);
    const [ox, , oz] = VECTOR[d.outward];
    const k = (d.niche ? 1 : 0) + (mass?.frames ? 3 : 2);
    entrances.push({ x: d.x + ox * k, z: d.z + oz * k, outward: d.outward });
  }
  const { yard, report } = buildLandscape(builder, rng.fork('landscape'), entrances, {
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
  decorateHouseFestive(builder, rng, spec, input, house, yard, report.anchor, report.props.includes('woodpile'));
  hardenCoveredPaths(builder);
  const { site } = report;
  const clear = new Set<string>();
  for (let z = 0; z < site.L; z++) for (let x = 0; x < site.W; x++) if (site.use[site.i(x, z)] === Use.PATH) clear.add(`${x},${z}`);
  return { builder, clear };
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
  for (let x = 0; x <= 2 * half; x++) for (let z = 0; z <= 2 * half; z++) b.setBlock(x, 0, z, blockState('grass_block'), Priority.DECOR);
  decorateTreePlot(b, rng, spec, half);
  return b;
}

/** A house planned and built up to its shell: the first stage of a house generation. */
interface HouseShell {
  rng: SeededRandom;
  input: HouseInput;
  house: HouseResult;
}

function houseShell(spec: BuildSpec): HouseShell {
  const rng = createSeededRandom(spec.seed);
  try {
    const input = houseInput(spec, rng);
    return { rng, input, house: buildHouseV2(input) };
  } catch (error) {
    if (error instanceof GeometryError) throw new BuildLimitError(error.message);
    throw error;
  }
}

/** Builds the building; a house may continue from a shell built before (variant selection). */
function generate(spec: BuildSpec, shell?: HouseShell): { builder: VoxelBuilder; house?: HouseResult; clear?: Set<string> } {
  const rng = createSeededRandom(spec.seed);
  try {
    switch (spec.kind) {
      case 'house': {
        const s = shell ?? houseShell(spec);
        return { ...finishHouse(spec, s.input, s.house, s.rng), house: s.house };
      }
      case 'tower': {
        // Round tower on its own plot; the roof follows the style (cone, dome, battlements).
        const floors = spec.options.floors ?? { small: 3, medium: 4, large: 6, huge: 10 }[spec.size];
        const d = towerDiameter(spec.size);
        const roofType = spec.options.roofType === 'flat' ? 'flat' : 'gable';
        const input = houseInput(spec, rng, { width: d, depth: d, floors, roofType, wings: 'none', annex: 'none', tower: 'none', porch: false, dormers: 0, chimney: false, jetty: false, composition: 'none' });
        const house = buildTower(input, d, rng.fork('tower'), spec.options.roofProfile !== undefined);
        return { ...finishHouse(spec, input, house, rng), house };
      }
      case 'tree':
        return { builder: buildTreePlot(spec, rng) };
      case 'market_stall': {
        const input = houseInput(spec, rng, { composition: 'none' });
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
        const input = houseInput(spec, rng, { width, depth, floorHeight, chimney, wings: 'none', annex: 'none', porch: false, dormers: 0, composition: 'none' });
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
  return complete(spec, generate(spec));
}

/** Last stage of every generation: foundation, snow, resolver and validator. */
function complete(spec: BuildSpec, generated: ReturnType<typeof generate>): GeneratedBuilding {
  const { house, clear } = generated;
  // Foundation below the ground (option, default none): lifts everything, the plan coordinates
  // stay valid relative to the ground layer (see aboveGround).
  const ground = groundLevel(spec);
  const builder = extendFoundation(generated.builder, ground, createSeededRandom(spec.seed).fork('foundation').int(0, 2 ** 31 - 1));
  // Snow only on explicit request, last, so every light that would melt it is known.
  if (spec.options.snow === true) addSnowCover(builder, clear, ground);
  const { model, repairs } = builder.finalize(spec);
  return { model, repairs, notes: [...generationNotes(spec), ...(house ? houseNotes(spec, house) : [])], ...(house ? { house } : {}) };
}

/** Deterministic: the same validated spec always yields bit-identical block data. */
export function generateBuilding(input: BuildSpec): VoxelModel {
  return generateBuildingWithReport(input).model;
}

export const VARIANT_COUNT = 3;

/**
 * Candidates per size class for houses (Profi-Builds phase 5). Fixed numbers, not a stopwatch:
 * the same input must always give the same three variants. Chosen from the measured cost of one
 * candidate (house shell plus quality metrics, ≈ 45–80 ms on the work laptop, see TEST_REPORT).
 */
export const CANDIDATES: Readonly<Record<SizeClass, number>> = { small: 16, medium: 16, large: 12, huge: 8 };

/** Consecutive seeds from the base seed (wrapping at MAX_SEED). */
export function variantSeeds(baseSeed: number, count = VARIANT_COUNT): number[] {
  return Array.from({ length: count }, (_, i) => (baseSeed + i) % (MAX_SEED + 1));
}

/** True if the building type picks its variants from scored candidates (houses). */
export function selectsVariants(kind: BuildingType): boolean {
  return kind === 'house';
}

export interface Candidate {
  seed: number;
  /** Quality score of the house shell (buildQuality.ts), 0–1. */
  score: number;
  /** Archetype of the masses ('simple' for the classic box). */
  composition: string;
  /** Roof type, tower, number of masses and storeys of the main body. */
  silhouette: string;
}

/**
 * Scores one candidate on its house shell: the same input and seed as the full generation, but
 * without landscape, festive layer, resolver and validator (they do not change the metrics of the
 * building itself) – about half the cost of a full generation.
 */
export function evaluateCandidate(spec: BuildSpec): Candidate {
  return scoreShell(buildSpecSchema.parse(spec), houseShell(buildSpecSchema.parse(spec)));
}

function scoreShell(spec: BuildSpec, shell: HouseShell): Candidate {
  const { input, house } = shell;
  // The shell has no foundation yet: measure it from its own ground layer.
  const model = house.builder.peek({ ...spec, options: { ...spec.options, foundation: 0 } });
  const composition = input.composition?.id ?? 'simple';
  const score = qualityScore(measureHouse(model, house), qualityTargets(spec.style, spec.size, input.composition?.id)).total;
  const main = house.plan.masses[0]!;
  const tower = house.plan.masses.find((m) => m.kind === 'tower');
  const silhouette = [main.roofType, tower ? (tower.round ? 'round' : 'square') : 'none', house.plan.masses.length, main.floors].join('|');
  return { seed: spec.seed, score, composition, silhouette };
}

/**
 * The best candidates that differ clearly: the best first, then the best with another archetype,
 * else with another silhouette, else simply the next best. Ties go to the lower seed.
 */
export function chooseVariants(candidates: readonly Candidate[], count = VARIANT_COUNT): Candidate[] {
  const order = [...candidates].sort((a, b) => b.score - a.score || a.seed - b.seed);
  const picks: Candidate[] = [];
  while (picks.length < count && picks.length < order.length) {
    const left = order.filter((c) => !picks.includes(c));
    const next =
      left.find((c) => picks.every((p) => p.composition !== c.composition && p.silhouette !== c.silhouette)) ??
      left.find((c) => picks.every((p) => p.composition !== c.composition)) ??
      left.find((c) => picks.every((p) => p.silhouette !== c.silhouette)) ??
      left[0]!;
    picks.push(next);
  }
  return picks;
}

export interface VariantSelection {
  /** Seeds of the shown variants, best first. */
  seeds: number[];
  /** How many candidates were scored (1 = no selection for this building type). */
  candidates: number;
  /** Scores of the shown variants (houses only). */
  scores: number[];
}

/**
 * Which seeds become the shown variants. Houses: CANDIDATES[size] consecutive seeds from the base
 * seed are scored, the best that differ clearly are shown. Other building types: consecutive seeds.
 */
export function selectVariantSeeds(input: BuildSpec, count = VARIANT_COUNT): VariantSelection {
  return select(buildSpecSchema.parse(input), count).selection;
}

/**
 * Scores of house candidates already seen (pure function of the spec): a seed step or a second
 * generation of the same input re-uses them. Bounded; the oldest entries go first.
 */
const CANDIDATE_CACHE = new Map<string, Candidate>();
const CANDIDATE_CACHE_SIZE = 512;

function select(spec: BuildSpec, count: number): { selection: VariantSelection; shells: Map<number, HouseShell> } {
  const shells = new Map<number, HouseShell>();
  if (!selectsVariants(spec.kind)) return { selection: { seeds: variantSeeds(spec.seed, count), candidates: count, scores: [] }, shells };
  const n = Math.max(count, CANDIDATES[spec.size]);
  const candidates = variantSeeds(spec.seed, n).map((seed) => {
    const s: BuildSpec = { ...spec, seed };
    const key = JSON.stringify(s);
    const hit = CANDIDATE_CACHE.get(key);
    if (hit) return hit;
    const shell = houseShell(s);
    const c = scoreShell(s, shell);
    shells.set(seed, shell);
    CANDIDATE_CACHE.set(key, c);
    if (CANDIDATE_CACHE.size > CANDIDATE_CACHE_SIZE) CANDIDATE_CACHE.delete(CANDIDATE_CACHE.keys().next().value!);
    return c;
  });
  const picks = chooseVariants(candidates, count);
  return { selection: { seeds: picks.map((c) => c.seed), candidates: n, scores: picks.map((c) => c.score) }, shells };
}

/**
 * Real, independently generated models of the selected seeds (best first). A chosen house goes
 * on from the shell its candidate was scored on – the same blocks as a fresh generation.
 */
export function generateVariants(input: BuildSpec, count = VARIANT_COUNT): VoxelModel[] {
  return generateSelectedVariants(input, count).models;
}

/** The variants and how they were chosen (for the API and the interface). */
export function generateSelectedVariants(input: BuildSpec, count = VARIANT_COUNT): { models: VoxelModel[]; selection: VariantSelection } {
  const spec = buildSpecSchema.parse(input);
  if (!isImplementedBuildingType(spec.kind)) throw new NotImplementedBuildingError(spec.kind);
  const { selection, shells } = select(spec, count);
  const models = selection.seeds.map((seed) => {
    const s: BuildSpec = { ...spec, seed };
    return complete(s, generate(s, shells.get(seed))).model;
  });
  return { models, selection };
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
  const comp = spec.options.composition;
  if (spec.kind === 'house' && comp && comp !== 'auto' && !compositionFitsStyle(comp, spec.style)) {
    notes.push(`Die Bauform „${COMPOSITION_LABELS[comp]}“ ist für den Stil „${getStyle(spec.style).label}“ ungewöhnlich – sie wird trotzdem gebaut.`);
  }
  if (spec.options.palette && !getStyle(spec.style).palettes.includes(spec.options.palette)) {
    notes.push(`Palette „${spec.options.palette}“ gehört nicht zum Stil – der Stil wählt selbst.`);
  }
  return notes;
}
