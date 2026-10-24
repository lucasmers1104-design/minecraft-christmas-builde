import type { ProfileName } from '@/core/generator/roof/profiles';
import type { StyleId, Theme } from '@/core/style/styles';

/**
 * Christmas market huts as data (research 17, B1–B3 and B5; 19, recommendation 12).
 *
 * A hut is a small wooden house with a gable roof whose gable faces the lane, a roof overhang
 * of 1–2 towards the lane, a solid parapet with the lower shutter folded down as a display
 * (closed top trapdoor at d = +1), a lintel log above the opening, a lantern inside under the
 * ridge, and – in the Christmas theme – fir green and warm lights along eave and verge.
 *
 * The data here is per style (posts, wall options, roof options, boards) and per ware theme
 * (what lies on the counter, on the back shelf and under it). The generator in
 * `src/core/generator/marketStall.ts` combines them so that neighbouring huts differ in wall,
 * roof and wares and vary in width and height.
 */

/** A wall option: the block and, for logs used as vertical boards, the axis. */
export interface StallWall {
  /** Stable id (used to tell neighbours apart). */
  id: string;
  block: string;
  axis?: 'x' | 'y' | 'z';
}

export interface StallStyle {
  /** Corner posts (pillar, axis y). */
  post: string;
  /** Lintel above the opening (pillar, axis along the front). */
  lintel: string;
  /** Wall options; neighbours get different ones. */
  walls: readonly StallWall[];
  /** Roof options as material catalogue ids (need stairs and slabs). */
  roofs: readonly string[];
  /** Trapdoor for the display flap, the upper shutter and the verge board. */
  board: string;
  /** Slab for the back shelf. */
  shelf: string;
  /** Floor block inside the hut. */
  floor: string;
  /** Fence for lamp posts and table legs. */
  fence: string;
  /** Door in the back wall. */
  door: string;
  /** Roof profile (the roof engine's Δ profiles). */
  profile: ProfileName;
}

const W = (id: string, block: string, axis?: 'y'): StallWall => ({ id, block, ...(axis ? { axis } : {}) });

/**
 * Wall pictures per style (research 17, table B2: the manufacturer designs "rustic",
 * "nordic" and "half-timbered" mapped onto our styles; the blocks are an estimate). Christmas
 * markets use wood or a red/green tarpaulin, never brick-red stone, so no red nether bricks.
 */
export const STALL_STYLES: Readonly<Record<StyleId, StallStyle>> = {
  medieval: {
    post: 'dark_oak_log',
    lintel: 'stripped_dark_oak_log',
    walls: [W('spruce_boards', 'stripped_spruce_log', 'y'), W('white_infill', 'white_terracotta'), W('spruce_planks', 'spruce_planks')],
    roofs: ['spruce_planks', 'dark_oak_planks', 'deepslate_tiles'],
    board: 'spruce_trapdoor',
    shelf: 'spruce_slab',
    floor: 'spruce_planks',
    fence: 'dark_oak_fence',
    door: 'spruce_door',
    profile: 'standard',
  },
  rustic: {
    post: 'spruce_log',
    lintel: 'stripped_spruce_log',
    walls: [W('spruce_boards', 'stripped_spruce_log', 'y'), W('spruce_planks', 'spruce_planks'), W('oak_boards', 'stripped_oak_log', 'y')],
    roofs: ['spruce_planks', 'dark_oak_planks', 'mangrove_planks'],
    board: 'dark_oak_trapdoor',
    shelf: 'spruce_slab',
    floor: 'spruce_planks',
    fence: 'spruce_fence',
    door: 'spruce_door',
    profile: 'standard',
  },
  nordic: {
    post: 'dark_oak_log',
    lintel: 'stripped_dark_oak_log',
    walls: [W('falu_red', 'red_terracotta'), W('mangrove_planks', 'mangrove_planks'), W('spruce_planks', 'spruce_planks')],
    roofs: ['dark_oak_planks', 'spruce_planks', 'deepslate_tiles'],
    board: 'birch_trapdoor',
    shelf: 'birch_slab',
    floor: 'spruce_planks',
    fence: 'dark_oak_fence',
    door: 'dark_oak_door',
    profile: 'standard',
  },
  fantasy: {
    post: 'stripped_dark_oak_log',
    lintel: 'stripped_dark_oak_log',
    walls: [W('spruce_planks', 'spruce_planks'), W('dark_oak_planks', 'dark_oak_planks'), W('spruce_boards', 'stripped_spruce_log', 'y')],
    roofs: ['warped_planks', 'crimson_planks', 'dark_prismarine'],
    board: 'dark_oak_trapdoor',
    shelf: 'dark_oak_slab',
    floor: 'dark_oak_planks',
    fence: 'dark_oak_fence',
    door: 'dark_oak_door',
    profile: 'standard',
  },
  japanese: {
    post: 'stripped_spruce_log',
    lintel: 'stripped_spruce_log',
    walls: [W('bamboo_planks', 'bamboo_planks'), W('spruce_planks', 'spruce_planks'), W('bamboo_boards', 'stripped_bamboo_block', 'y')],
    roofs: ['dark_oak_planks', 'spruce_planks', 'deepslate_tiles'],
    board: 'spruce_trapdoor',
    shelf: 'bamboo_slab',
    floor: 'bamboo_planks',
    fence: 'bamboo_fence',
    door: 'spruce_door',
    profile: 'shallow',
  },
  cherry: {
    post: 'stripped_cherry_log',
    lintel: 'stripped_cherry_log',
    walls: [W('cherry_planks', 'cherry_planks'), W('birch_planks', 'birch_planks'), W('birch_boards', 'stripped_birch_log', 'y')],
    roofs: ['cherry_planks', 'dark_oak_planks', 'spruce_planks'],
    board: 'cherry_trapdoor',
    shelf: 'cherry_slab',
    floor: 'cherry_planks',
    fence: 'cherry_fence',
    door: 'cherry_door',
    profile: 'standard',
  },
  modern: {
    post: 'stripped_birch_log',
    lintel: 'stripped_birch_log',
    walls: [W('quartz', 'smooth_quartz'), W('birch_planks', 'birch_planks'), W('white_concrete', 'white_concrete')],
    roofs: ['polished_deepslate', 'deepslate_tiles', 'dark_oak_planks'],
    board: 'birch_trapdoor',
    shelf: 'birch_slab',
    floor: 'birch_planks',
    fence: 'birch_fence',
    door: 'birch_door',
    profile: 'shallow',
  },
  mediterranean: {
    post: 'stripped_oak_log',
    lintel: 'stripped_oak_log',
    walls: [W('white_terracotta', 'white_terracotta'), W('smooth_sandstone', 'smooth_sandstone'), W('birch_planks', 'birch_planks')],
    roofs: ['bricks', 'granite', 'mangrove_planks'],
    board: 'oak_trapdoor',
    shelf: 'oak_slab',
    floor: 'oak_planks',
    fence: 'oak_fence',
    door: 'oak_door',
    profile: 'standard',
  },
};

/** One item for counter or shelf. `small` = lower than half a block (counter rule B3). */
export interface Ware {
  id: string;
  props?: Readonly<Record<string, string>>;
  small: boolean;
}

export interface WareTheme {
  id: string;
  label: string;
  /** Themes the stall type fits. */
  themes: readonly Theme[];
  /** On the parapet and the display flap (all small: candles, pots, lanterns, carpets). */
  counter: readonly Ware[];
  /** On the back shelf (d ≤ −2, full blocks allowed). */
  shelf: readonly Ware[];
  /** Under the shelf on the floor (full blocks, storage). */
  storage: readonly Ware[];
  /** Only for the big mulled wine hut. */
  bigHut?: boolean;
}

const candle = (color: string, n: number): Ware => ({ id: color ? `${color}_candle` : 'candle', props: { candles: String(n), lit: 'true' }, small: true });
const small = (id: string, props?: Record<string, string>): Ware => ({ id, ...(props ? { props } : {}), small: true });
const full = (id: string, props?: Record<string, string>): Ware => ({ id, ...(props ? { props } : {}), small: false });
const LANTERN = small('lantern', { hanging: 'false' });
const BARREL_UP = full('barrel', { facing: 'up' });

/**
 * Ware themes per stall (research 17, table B3). Counter wares are all below half a block
 * (candles, pots, potted spruce saplings as small Christmas trees, standing lanterns,
 * carpets as cloths); full blocks (barrels, bookshelves, leaves) only on the back shelf or
 * under it. Cake and candle cakes are not in the registry, so the gingerbread stall shows
 * brown and white cloths with candles.
 */
export const WARE_THEMES: readonly WareTheme[] = [
  {
    id: 'candles',
    label: 'Kerzenstand',
    themes: ['christmas', 'winter'],
    counter: [candle('red', 3), candle('white', 2), candle('red', 1), candle('white', 4), candle('green', 2)],
    shelf: [candle('white', 3), candle('red', 2), candle('', 4)],
    storage: [BARREL_UP],
  },
  {
    id: 'trees',
    label: 'Christbäume',
    themes: ['christmas', 'winter'],
    counter: [small('potted_spruce_sapling'), small('potted_spruce_sapling'), small('potted_fern')],
    shelf: [small('potted_spruce_sapling'), full('spruce_leaves', { persistent: 'true' })],
    storage: [full('spruce_log', { axis: 'x' })],
  },
  {
    id: 'gingerbread',
    label: 'Lebkuchen',
    themes: ['christmas', 'winter'],
    counter: [small('brown_carpet'), small('brown_carpet'), small('white_carpet'), candle('red', 1)],
    shelf: [full('bookshelf'), small('flower_pot')],
    storage: [BARREL_UP],
  },
  {
    id: 'toys',
    label: 'Holzspielzeug',
    themes: ['christmas', 'winter', 'none'],
    counter: [small('spruce_trapdoor', { facing: 'north', half: 'bottom', open: 'false' }), small('flower_pot'), small('birch_trapdoor', { facing: 'east', half: 'bottom', open: 'false' })],
    shelf: [full('barrel', { facing: 'north' }), small('flower_pot')],
    storage: [full('crafting_table')],
  },
  {
    id: 'wreaths',
    label: 'Gestecke',
    themes: ['christmas', 'winter'],
    counter: [small('potted_azalea_bush'), small('potted_fern'), candle('red', 2), small('potted_flowering_azalea_bush')],
    shelf: [full('azalea_leaves', { persistent: 'true' }), small('potted_azalea_bush')],
    storage: [BARREL_UP],
  },
  {
    id: 'lanterns',
    label: 'Laternen',
    themes: ['christmas', 'winter', 'none'],
    counter: [LANTERN, small('flower_pot'), LANTERN],
    shelf: [LANTERN, small('flower_pot')],
    storage: [BARREL_UP],
  },
  {
    id: 'flowers',
    label: 'Blumen',
    themes: ['none'],
    counter: [small('potted_red_tulip'), small('potted_dandelion'), small('potted_cornflower'), small('potted_white_tulip')],
    shelf: [small('flower_pot'), small('potted_fern')],
    storage: [BARREL_UP],
  },
  {
    id: 'produce',
    label: 'Obst und Gemüse',
    themes: ['none'],
    counter: [small('green_carpet'), small('orange_carpet'), small('flower_pot')],
    shelf: [full('pumpkin'), full('melon'), full('hay_block', { axis: 'y' })],
    storage: [BARREL_UP],
  },
  {
    id: 'pottery',
    label: 'Töpferei',
    themes: ['none'],
    counter: [small('flower_pot'), small('flower_pot'), small('potted_fern')],
    shelf: [full('terracotta'), small('flower_pot')],
    storage: [full('barrel', { facing: 'north' })],
  },
  {
    id: 'mulled_wine',
    label: 'Glühwein',
    themes: ['christmas', 'winter', 'none'],
    bigHut: true,
    counter: [LANTERN, candle('red', 1), candle('red', 1)],
    shelf: [full('barrel', { facing: 'north' }), full('barrel', { facing: 'south' })],
    storage: [full('barrel', { facing: 'east' })],
  },
];

/** Hut sizes: front width (odd) × depth × wall height (counter y1, lintel at the wall top). */
export interface HutSize {
  width: number;
  depth: number;
  wallHeight: number;
}

/** Regular huts (research B1: 5×4 small, 7×5 medium; wall height 4, a tall variant 5). */
export const HUT_SIZES: readonly HutSize[] = [
  { width: 5, depth: 4, wallHeight: 4 },
  { width: 7, depth: 5, wallHeight: 4 },
  { width: 5, depth: 5, wallHeight: 5 },
  { width: 7, depth: 4, wallHeight: 5 },
  { width: 5, depth: 4, wallHeight: 5 },
  { width: 7, depth: 5, wallHeight: 5 },
  { width: 5, depth: 5, wallHeight: 4 },
  { width: 7, depth: 4, wallHeight: 4 },
];

/** The mulled wine hut (research B1/B5: 7×3 m real, 9–11 × 5 in the game). */
export const BIG_HUT: HutSize = { width: 9, depth: 5, wallHeight: 4 };
