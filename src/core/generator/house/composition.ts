import type { SeededRandom } from '@/core/generator/seededRandom';
import { COMPOSITION_INFO, compositionsFor, type CompositionId, type CompositionOption } from '@/core/style/compositions';
import type { RoofProfile, RoofType, SizeClass, StyleDef, StyleId } from '@/core/style/styles';
import type { Symmetry, TowerPosition, Wings } from '@/core/generator/house/plan';

/**
 * Composition layer above the house plan (stage "Profi-Builds", phase 2): an archetype
 * (src/core/style/compositions.ts) is turned into concrete masses – main body size and storeys,
 * cross gables and cross wings in front, annex, porch kind, tower, pagoda setback, a stacked
 * upper cube – before `planHouse` builds them. Sizes follow research 19 T1/T2 (secondary masses
 * ⅓–½ of the main body, lower ridge and eave, never flush with the front) and the style reports
 * 08–13; parts are given relative to the main body so wished dimensions keep them in proportion.
 *
 * Wishes always win: every field here is only a default that `resolveHouseInput` uses where the
 * text, the AI plan or the UI said nothing.
 */

export type PorchKind = 'canopy' | 'veranda' | 'engawa';

/** A mass in front of the main body: cross gable (Zwerchhaus), cross wing (L) or entrance. */
export interface CrossPart {
  /** Where along the front: centred, flush with one end, or on a third of the length. */
  align: 'centre' | 'east' | 'west' | 'third_east' | 'third_west';
  /** Width relative to the front length (odd, at least `minWidth`). */
  widthRatio: number;
  minWidth: number;
  /** Blocks it stands in front of the main front wall. */
  protrude: number;
  /** Storeys relative to the main body (0 or −1). */
  floorsDelta: number;
  /** The entrance sits in its front. */
  door: boolean;
}

export interface CompositionPlan {
  id: CompositionId;
  main: { width: number; depth: number; floors: number };
  roofType?: RoofType;
  roofProfile?: RoofProfile;
  overhang?: number;
  plinth?: number;
  symmetry?: Symmetry;
  jetty?: boolean;
  balcony?: boolean;
  chimney?: boolean;
  dormers?: number;
  porch?: PorchKind | null;
  wings?: Wings;
  cross: CrossPart[];
  annex?: { side: 'left' | 'right' | 'back'; width: number; depthRatio: number } | null;
  tower?: { kind: 'square' | 'round'; position: TowerPosition; size?: number } | null;
  /** Upper storeys step in by this many blocks per side and storey (pagoda tiers). */
  setback?: number;
  /** Modern stacked cube: upper storeys get their own, shifted footprint. */
  upper?: { widthRatio: number; depthDelta: number; side: 'east' | 'west'; cantilever: number };
  /** Moss/azalea roof surface (fantasy and rustic cottages). */
  livingRoof?: boolean;
  /** Preferred palettes (used only if they belong to the style and none was wished). */
  palettes?: readonly string[];
  /** Entrance: in the front cross part, the inner corner of an L, centred or in a side panel. */
  door: 'cross' | 'inner_corner' | 'centre' | 'side';
}

interface Ctx {
  style: StyleId;
  def: StyleDef;
  size: SizeClass;
  rng: SeededRandom;
}

const odd = (n: number) => (n % 2 === 0 ? n + 1 : n);
const bySize = <T>(size: SizeClass, values: Readonly<Record<SizeClass, T>>): T => values[size];
const m = (width: number, depth: number, floors: number) => ({ width, depth, floors });

/** Main body sizes per size class (W along the front, D in depth, storeys). */
type Sizes = Readonly<Record<SizeClass, ReturnType<typeof m>>>;

function crossGable(c: Ctx): CompositionPlan {
  const sizes: Partial<Record<StyleId, Sizes>> = {
    medieval: { small: m(11, 7, 1), medium: m(13, 11, 2), large: m(15, 11, 2), huge: m(17, 13, 3) },
    fantasy: { small: m(11, 7, 1), medium: m(11, 9, 2), large: m(13, 11, 2), huge: m(15, 13, 3) },
    nordic: { small: m(11, 7, 1), medium: m(13, 9, 2), large: m(15, 9, 2), huge: m(17, 11, 2) },
    japanese: { small: m(11, 7, 1), medium: m(15, 9, 1), large: m(17, 11, 2), huge: m(21, 13, 2) },
    cherry: { small: m(11, 7, 1), medium: m(13, 9, 1), large: m(15, 11, 2), huge: m(19, 13, 2) },
    modern: { small: m(11, 9, 2), medium: m(13, 9, 2), large: m(15, 11, 2), huge: m(19, 13, 3) },
    mediterranean: { small: m(11, 7, 1), medium: m(13, 9, 2), large: m(15, 11, 2), huge: m(17, 13, 3) },
  };
  const formal = c.def.symmetric;
  const align: CrossPart['align'] = formal ? 'centre' : c.rng.fork('crossAlign').pick(['centre', 'east', 'west'] as const);
  return {
    id: 'cross_gable',
    main: bySize(c.size, sizes[c.style] ?? sizes.medieval!),
    ...(c.style === 'medieval' ? { roofProfile: 'steep' as const } : {}),
    cross: [
      {
        align,
        widthRatio: c.style === 'modern' ? 0.38 : 0.42,
        minWidth: 5,
        protrude: c.style === 'japanese' || c.style === 'cherry' || c.style === 'mediterranean' ? 2 : c.rng.fork('crossDepth').int(2, 3),
        // Modern: a one-storey entrance cube; elsewhere the Zwerchhaus rises with the facade.
        floorsDelta: c.style === 'modern' ? -1 : 0,
        door: true,
      },
    ],
    // The cross gable is the focal point: no dormers or porch roof competing with it.
    dormers: 0,
    porch: null,
    door: 'cross',
    symmetry: formal ? 'symmetric' : 'asymmetric',
  };
}

function crossWing(c: Ctx): CompositionPlan {
  const sizes: Partial<Record<StyleId, Sizes>> = {
    medieval: { small: m(11, 7, 1), medium: m(11, 7, 2), large: m(13, 9, 2), huge: m(15, 9, 3) },
    rustic: { small: m(11, 7, 1), medium: m(11, 7, 1), large: m(13, 9, 2), huge: m(15, 9, 2) },
    modern: { small: m(11, 7, 2), medium: m(13, 9, 2), large: m(15, 9, 2), huge: m(19, 11, 2) },
    mediterranean: { small: m(11, 7, 1), medium: m(13, 9, 2), large: m(15, 9, 2), huge: m(17, 11, 2) },
  };
  const main = bySize(c.size, sizes[c.style] ?? sizes.medieval!);
  return {
    id: 'cross_wing',
    main,
    ...(c.style === 'medieval' || c.style === 'rustic' ? { roofProfile: 'steep' as const } : {}),
    cross: [
      {
        align: c.rng.fork('wingSide').chance(0.5) ? 'east' : 'west',
        widthRatio: 0.45,
        minWidth: 5,
        protrude: c.size === 'huge' ? 5 : c.rng.fork('wingDepth').int(3, 4),
        floorsDelta: main.floors > 1 ? -1 : 0,
        door: false,
      },
    ],
    dormers: 0,
    door: 'inner_corner',
    symmetry: 'asymmetric',
  };
}

function townHouse(c: Ctx): CompositionPlan {
  const sizes: Partial<Record<StyleId, Sizes>> = {
    medieval: { small: m(7, 11, 2), medium: m(7, 13, 3), large: m(9, 13, 3), huge: m(9, 15, 3) },
    fantasy: { small: m(7, 9, 2), medium: m(7, 11, 2), large: m(9, 13, 3), huge: m(9, 15, 3) },
    mediterranean: { small: m(7, 11, 3), medium: m(9, 13, 3), large: m(9, 13, 3), huge: m(11, 15, 3) },
  };
  return {
    id: 'town_house',
    main: bySize(c.size, sizes[c.style] ?? sizes.medieval!),
    roofType: 'gable',
    ...(c.style === 'medieval' ? { roofProfile: 'steep' as const } : {}),
    ...(c.style !== 'mediterranean' ? { jetty: true } : {}),
    cross: [],
    annex: { side: c.rng.fork('annexSide').chance(0.5) ? 'left' : 'right', width: 4, depthRatio: 0.6 },
    door: 'centre',
    symmetry: 'symmetric',
  };
}

function stairTower(c: Ctx): CompositionPlan {
  const sizes: Partial<Record<StyleId, Sizes>> = {
    medieval: { small: m(9, 7, 1), medium: m(11, 9, 2), large: m(13, 9, 2), huge: m(15, 11, 3) },
    fantasy: { small: m(9, 7, 1), medium: m(11, 9, 2), large: m(11, 9, 2), huge: m(13, 11, 3) },
  };
  const r = c.rng.fork('tower');
  const round = c.style === 'fantasy' || r.chance(0.4);
  return {
    id: 'stair_tower',
    main: bySize(c.size, sizes[c.style] ?? sizes.medieval!),
    ...(c.style === 'medieval' ? { roofProfile: 'steep' as const } : {}),
    cross: [],
    tower: { kind: round ? 'round' : 'square', position: r.pick(['back_left', 'back_right', 'front_left', 'front_right'] as const), size: c.size === 'huge' ? 7 : 5 },
    door: 'side',
    symmetry: 'asymmetric',
  };
}

function chapel(c: Ctx): CompositionPlan {
  const sizes: Partial<Record<StyleId, Sizes>> = {
    medieval: { small: m(7, 11, 1), medium: m(9, 13, 1), large: m(11, 15, 1), huge: m(13, 17, 2) },
    rustic: { small: m(7, 11, 1), medium: m(9, 13, 1), large: m(11, 15, 1), huge: m(13, 17, 1) },
    nordic: { small: m(7, 11, 1), medium: m(9, 13, 1), large: m(9, 15, 1), huge: m(11, 17, 1) },
  };
  return {
    id: 'chapel',
    main: bySize(c.size, sizes[c.style] ?? sizes.rustic!),
    roofType: 'gable',
    cross: [],
    porch: 'canopy',
    tower: { kind: 'square', position: c.rng.fork('tower').chance(0.5) ? 'front_left' : 'front_right', size: c.size === 'huge' ? 7 : 5 },
    chimney: false,
    dormers: 0,
    door: 'centre',
    symmetry: 'symmetric',
  };
}

function chalet(c: Ctx): CompositionPlan {
  const sizes: Sizes = { small: m(9, 11, 1), medium: m(9, 11, 2), large: m(11, 13, 2), huge: m(13, 15, 2) };
  return {
    id: 'chalet',
    main: bySize(c.size, sizes),
    roofType: 'gable',
    roofProfile: 'shallow',
    overhang: 2,
    balcony: true,
    dormers: 0,
    cross: [],
    annex: { side: c.rng.fork('annexSide').chance(0.5) ? 'left' : 'right', width: 4, depthRatio: 0.55 },
    palettes: c.style === 'rustic' ? ['rustic_alpine', 'rustic_spruce'] : [],
    door: 'centre',
    symmetry: 'symmetric',
  };
}

function logCabin(c: Ctx): CompositionPlan {
  const sizes: Sizes = { small: m(9, 7, 1), medium: m(11, 7, 1), large: m(13, 9, 1), huge: m(15, 9, 2) };
  return {
    id: 'log_cabin',
    main: bySize(c.size, sizes),
    roofType: 'gable',
    cross: [],
    porch: 'veranda',
    chimney: true,
    dormers: 0,
    palettes: c.style === 'rustic' ? ['rustic_logs'] : [],
    door: 'centre',
    symmetry: 'asymmetric',
  };
}

function cottage(c: Ctx): CompositionPlan {
  const sizes: Partial<Record<StyleId, Sizes>> = {
    fantasy: { small: m(7, 9, 1), medium: m(9, 11, 1), large: m(11, 13, 2), huge: m(13, 15, 2) },
    rustic: { small: m(7, 9, 1), medium: m(9, 11, 1), large: m(11, 9, 1), huge: m(13, 11, 2) },
    cherry: { small: m(9, 7, 1), medium: m(11, 9, 1), large: m(13, 9, 1), huge: m(15, 11, 2) },
  };
  return {
    id: 'cottage',
    main: bySize(c.size, sizes[c.style] ?? sizes.fantasy!),
    ...(c.style === 'rustic' ? { roofProfile: 'steep' as const } : c.style === 'fantasy' ? { roofProfile: 'bell' as const } : {}),
    cross: [],
    dormers: c.size === 'small' ? 0 : 1,
    livingRoof: c.style !== 'cherry',
    palettes: c.style === 'rustic' ? ['rustic_thatch', 'rustic_oak'] : [],
    door: 'side',
    symmetry: 'asymmetric',
  };
}

function witchHouse(c: Ctx): CompositionPlan {
  const sizes: Sizes = { small: m(9, 11, 1), medium: m(9, 11, 2), large: m(11, 13, 2), huge: m(13, 15, 3) };
  return {
    id: 'witch_house',
    main: bySize(c.size, sizes),
    cross: [],
    tower: { kind: 'round', position: c.rng.fork('tower').chance(0.5) ? 'front_left' : 'front_right' },
    porch: null,
    door: 'side',
    symmetry: 'asymmetric',
  };
}

function longhouse(c: Ctx): CompositionPlan {
  const sizes: Sizes = { small: m(15, 7, 1), medium: m(19, 9, 1), large: m(23, 9, 1), huge: m(27, 11, 1) };
  const main = bySize(c.size, sizes);
  return {
    id: 'longhouse',
    main,
    roofType: 'gable',
    overhang: 2,
    cross: [{ align: c.rng.fork('porchSide').chance(0.5) ? 'third_east' : 'third_west', widthRatio: 0.2, minWidth: 5, protrude: 2, floorsDelta: 0, door: true }],
    annex: { side: 'back', width: Math.max(5, odd(Math.round(main.width / 3))), depthRatio: 0.5 },
    chimney: false,
    dormers: 0,
    door: 'cross',
    symmetry: 'asymmetric',
  };
}

function pagoda(c: Ctx): CompositionPlan {
  const sizes: Sizes = { small: m(9, 9, 2), medium: m(11, 11, 2), large: m(13, 13, 2), huge: m(15, 15, 3) };
  return {
    id: 'pagoda',
    main: bySize(c.size, sizes),
    roofType: 'pagoda',
    roofProfile: 'flared',
    overhang: 2,
    plinth: 2,
    cross: [],
    setback: 2,
    porch: null,
    chimney: false,
    dormers: 0,
    door: 'centre',
    symmetry: 'symmetric',
  };
}

function engawaHouse(c: Ctx): CompositionPlan {
  const sizes: Partial<Record<StyleId, Sizes>> = {
    japanese: { small: m(9, 7, 1), medium: m(13, 9, 1), large: m(15, 11, 2), huge: m(19, 13, 2) },
    cherry: { small: m(9, 7, 1), medium: m(11, 9, 1), large: m(13, 11, 2), huge: m(17, 13, 2) },
  };
  return {
    id: 'engawa_house',
    main: bySize(c.size, sizes[c.style] ?? sizes.japanese!),
    roofType: 'irimoya',
    overhang: 3,
    cross: [],
    porch: 'engawa',
    chimney: false,
    door: 'centre',
    symmetry: 'symmetric',
  };
}

function offsetCubes(c: Ctx): CompositionPlan {
  const sizes: Sizes = { small: m(11, 9, 2), medium: m(13, 9, 2), large: m(17, 11, 2), huge: m(21, 13, 3) };
  return {
    id: 'offset_cubes',
    main: bySize(c.size, sizes),
    roofType: 'flat',
    cross: [],
    annex: null,
    porch: null,
    upper: { widthRatio: 0.65, depthDelta: c.size === 'medium' || c.size === 'small' ? 0 : 2, side: c.rng.fork('upperSide').chance(0.5) ? 'east' : 'west', cantilever: c.size === 'medium' || c.size === 'small' ? 0 : 2 },
    door: 'side',
    symmetry: 'asymmetric',
  };
}

function villaTower(c: Ctx): CompositionPlan {
  const sizes: Sizes = { small: m(11, 9, 1), medium: m(13, 9, 2), large: m(15, 11, 2), huge: m(17, 13, 2) };
  const annexLeft = c.rng.fork('annexSide').chance(0.5);
  return {
    id: 'villa_tower',
    main: bySize(c.size, sizes),
    cross: [],
    annex: { side: annexLeft ? 'left' : 'right', width: c.size === 'huge' ? 6 : 4, depthRatio: 0.7 },
    // The tower stands at a back corner on the other side, so the front stays calm and symmetric.
    tower: { kind: 'square', position: annexLeft ? 'back_right' : 'back_left', size: 5 },
    dormers: 0,
    door: 'centre',
    symmetry: 'symmetric',
  };
}

function simple(c: Ctx): CompositionPlan {
  return { id: 'simple', main: c.def.proportions.size[c.size], cross: [], door: c.def.symmetric ? 'centre' : 'side' };
}

const BUILDERS: Readonly<Record<CompositionId, (c: Ctx) => CompositionPlan>> = {
  simple,
  cross_gable: crossGable,
  cross_wing: crossWing,
  town_house: townHouse,
  stair_tower: stairTower,
  chapel,
  chalet,
  log_cabin: logCabin,
  cottage,
  witch_house: witchHouse,
  longhouse,
  pagoda,
  engawa_house: engawaHouse,
  offset_cubes: offsetCubes,
  villa_tower: villaTower,
};

/** True if the archetype belongs to the style (at any size). */
export function compositionFitsStyle(id: CompositionId, style: StyleId): boolean {
  return Object.values(COMPOSITION_INFO[id].weights[style] ?? {}).some((v) => (v ?? 0) > 0);
}

/**
 * Picks and sizes the archetype. `wish` = 'auto' draws from the style's priors for the size;
 * an explicit archetype is used as wished (also outside its style – a wish always wins, the
 * caller adds a hint). `exclude` lets the variant search ask for a different archetype.
 */
export function resolveComposition(style: StyleId, def: StyleDef, size: SizeClass, wish: CompositionOption, rng: SeededRandom, exclude: readonly CompositionId[] = []): CompositionPlan {
  const r = rng.fork('composition');
  let id: CompositionId;
  if (wish !== 'auto') id = wish;
  else {
    const all = compositionsFor(style, size);
    const pool = all.filter(([c]) => !exclude.includes(c));
    id = (pool.length > 0 ? r.fork('pick').weighted(pool) : all.length > 0 ? r.fork('pick').weighted(all) : 'simple') as CompositionId;
  }
  return BUILDERS[id]({ style, def, size, rng: r.fork(id) });
}
