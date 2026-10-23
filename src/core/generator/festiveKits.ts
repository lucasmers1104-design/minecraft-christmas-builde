import { isAvailableIn } from '@/core/blocks/registry';
import type { StyleId, Theme } from '@/core/style/styles';

/**
 * Festive kits per style (research 2026-10: 14 "Winter und Weihnachten", 17 A5/A7, style
 * reports 08 E12, 09 E16, 10 E11, 11 E2, 12 E9, lighting 18 T8). The festive layer reads
 * everything style-specific from here: which motifs a style gets by default, colours of tree
 * ornaments, presents and candles, the garland greenery and the one warm light per tree.
 *
 * Rules behind the data:
 * - at most 3 ornament colours and one light type per tree, at most 3 paper and 2 ribbon
 *   colours per scene, no toy colours (lime, light blue, yellow concrete) as paper,
 * - japanese and cherry celebrate the turn of the year instead (kadomatsu, shimekazari,
 *   lanterns): no tree, presents or garland unless explicitly asked for,
 * - medieval has no wool presents and no red wool bows (woodpile and red candles instead),
 * - nordic gets a julenek and a julbock of straw, lanterns instead of glowing blocks in the
 *   garland and at most two presents,
 * - modern gets a light line on the parapet instead of a fir garland and no hanging lanterns,
 * - mediterranean gets farolitos (candles along the path) and an olive (pale oak) garland,
 * - fantasy gets a pair of candy canes beside the path (09 E16, the simple part).
 *
 * An explicit wish (tree, presents, garland) always wins over the kit default.
 */

export type FestiveExtra =
  /** Pair of bamboo and straw new-year decorations beside the entrance (japanese, cherry). */
  | 'kadomatsu'
  /** Straw rope (hay, axis along the wall) above the entrance (japanese, cherry). */
  | 'shimekazari'
  /** Lanterns on chains at every eave corner and every fourth eave cell (japanese, cherry). */
  | 'eaveLanterns'
  /** Oat sheaf on a pole near the entrance (nordic). */
  | 'julenek'
  /** Straw goat in the garden (nordic, from medium size). */
  | 'julbock'
  /** Firewood stacked against a side wall (medieval, rustic, nordic). */
  | 'woodpile'
  /** Candles along both sides of the main path (mediterranean). */
  | 'farolitos'
  /** End rods on every second parapet block of flat roofs (modern). */
  | 'parapetLights'
  /** Pair of candy canes beside the main path, hooks towards the path (fantasy). */
  | 'candyCanes';

export interface TreeKit {
  /** Ornament blocks (full blocks) with weights; at most three. */
  ornaments: readonly (readonly [string, number])[];
  /** The one light block of the tree (glows through the needles). */
  light: string;
  /** Star outline and core (only for stars from 15 blocks tree height). */
  starOutline: string;
  starCore: string;
}

export interface PresentKit {
  /** Paper: full blocks (wool, terracotta, concrete, barrel …). */
  papers: readonly string[];
  /** Ribbon colours (dye ids): carpet on small presents, wool band and candle bow on big ones. */
  ribbons: readonly string[];
}

export interface FestiveKit {
  /** Defaults when the user did not decide. */
  tree: boolean;
  presents: boolean;
  /** Upper limit of presents at the entrance (nordic: 2). */
  maxPresents: number;
  garland: boolean;
  /** Garland only on the entrance side (nordic). */
  garlandFrontOnly: boolean;
  /** Greenery of garland and wreath. */
  garlandLeaves: string;
  /** Bow at garland anchors (null: none, e.g. medieval). */
  bow: string | null;
  /** Door wreath (and gable wreath) from detail level 2. */
  wreath: boolean;
  /** Bow at the bottom of a wreath. */
  wreathBow: string | null;
  /** Light hidden behind the garland; 'lantern' hangs lanterns at the anchors instead. */
  garlandLight: string | 'lantern';
  /** Lanterns on chains under the eaves are allowed (modern: no). */
  hangingLanterns: boolean;
  /** Candle colours per facade (first one on the entrance facade). */
  candles: Readonly<Record<'christmas' | 'winter', readonly string[]>>;
  /** Candles on every sill instead of a symmetric selection (nordic). */
  candlesEverywhere: boolean;
  treeDecor: TreeKit;
  present: PresentKit;
  extras: Readonly<Record<'christmas' | 'winter', readonly FestiveExtra[]>>;
}

const GOLD_STAR = { starOutline: 'gold_block', starCore: 'ochre_froglight' } as const;

const RUSTIC: FestiveKit = {
  tree: true,
  presents: true,
  maxPresents: 3,
  garland: true,
  garlandFrontOnly: false,
  garlandLeaves: 'spruce_leaves',
  bow: 'red_wool',
  wreath: true,
  wreathBow: 'red_wool',
  garlandLight: 'shroomlight',
  hangingLanterns: true,
  candles: { christmas: ['candle', 'red_candle'], winter: ['white_candle'] },
  candlesEverywhere: false,
  treeDecor: { ornaments: [['red_wool', 6], ['white_wool', 4]], light: 'shroomlight', ...GOLD_STAR },
  present: { papers: ['brown_terracotta', 'red_wool', 'white_wool'], ribbons: ['white', 'red'] },
  extras: { christmas: ['woodpile'], winter: ['woodpile'] },
};

export const FESTIVE_KITS: Readonly<Record<StyleId, FestiveKit>> = {
  medieval: {
    ...RUSTIC,
    presents: false,
    bow: null,
    wreathBow: 'red_terracotta',
    candles: { christmas: ['red_candle', 'candle'], winter: ['white_candle'] },
    // Terracotta and gold instead of wool or concrete (no dyed cubes in the medieval kit).
    treeDecor: { ornaments: [['red_terracotta', 6], ['gold_block', 4]], light: 'glowstone', starOutline: 'gold_block', starCore: 'glowstone' },
    present: { papers: ['brown_terracotta', 'red_terracotta', 'white_terracotta'], ribbons: ['white', 'red'] },
  },
  fantasy: {
    ...RUSTIC,
    garlandLeaves: 'azalea_leaves',
    garlandLight: 'ochre_froglight',
    candles: { christmas: ['candle', 'white_candle'], winter: ['white_candle'] },
    treeDecor: { ornaments: [['purple_concrete', 4], ['gold_block', 3], ['light_blue_concrete', 3]], light: 'ochre_froglight', ...GOLD_STAR },
    present: { papers: ['purple_wool', 'cyan_terracotta', 'white_wool'], ribbons: ['yellow', 'white'] },
    extras: { christmas: ['candyCanes'], winter: [] },
  },
  rustic: RUSTIC,
  nordic: {
    ...RUSTIC,
    maxPresents: 2,
    garlandFrontOnly: true,
    garlandLight: 'lantern',
    candles: { christmas: ['white_candle'], winter: ['white_candle'] },
    candlesEverywhere: true,
    treeDecor: { ornaments: [['red_concrete', 6], ['white_concrete', 4]], light: 'ochre_froglight', ...GOLD_STAR },
    present: { papers: ['barrel', 'white_wool', 'red_wool'], ribbons: ['red', 'white'] },
    extras: { christmas: ['julenek', 'julbock', 'woodpile'], winter: ['woodpile'] },
  },
  japanese: {
    ...RUSTIC,
    tree: false,
    presents: false,
    garland: false,
    wreath: false,
    wreathBow: null,
    candles: { christmas: ['white_candle'], winter: ['white_candle'] },
    treeDecor: { ornaments: [['gold_block', 6], ['white_concrete', 4]], light: 'ochre_froglight', ...GOLD_STAR },
    present: { papers: ['red_wool', 'white_wool'], ribbons: ['white', 'red'] },
    extras: { christmas: ['kadomatsu', 'shimekazari', 'eaveLanterns'], winter: ['eaveLanterns'] },
  },
  cherry: {
    ...RUSTIC,
    tree: false,
    presents: false,
    garland: false,
    garlandLeaves: 'cherry_leaves',
    wreath: false,
    wreathBow: null,
    candles: { christmas: ['pink_candle'], winter: ['white_candle'] },
    treeDecor: { ornaments: [['pink_concrete', 5], ['white_concrete', 3], ['gold_block', 2]], light: 'pearlescent_froglight', ...GOLD_STAR },
    present: { papers: ['pink_wool', 'white_wool', 'magenta_terracotta'], ribbons: ['white'] },
    extras: { christmas: ['kadomatsu', 'shimekazari', 'eaveLanterns'], winter: ['eaveLanterns'] },
  },
  modern: {
    ...RUSTIC,
    garland: false,
    garlandLight: 'pearlescent_froglight',
    hangingLanterns: false,
    candles: { christmas: ['white_candle'], winter: ['white_candle'] },
    treeDecor: { ornaments: [['white_concrete', 5], ['iron_block', 3], ['gold_block', 2]], light: 'sea_lantern', ...GOLD_STAR },
    present: { papers: ['white_concrete', 'gray_wool', 'waxed_copper_block'], ribbons: ['red', 'white'] },
    extras: { christmas: ['parapetLights'], winter: [] },
  },
  mediterranean: {
    ...RUSTIC,
    garlandLeaves: 'pale_oak_leaves',
    garlandLight: 'ochre_froglight',
    candles: { christmas: ['white_candle'], winter: ['white_candle'] },
    treeDecor: { ornaments: [['orange_terracotta', 4], ['gold_block', 4], ['white_concrete', 2]], light: 'ochre_froglight', ...GOLD_STAR },
    present: { papers: ['blue_wool', 'white_wool', 'orange_terracotta'], ribbons: ['white', 'yellow'] },
    extras: { christmas: ['farolitos'], winter: [] },
  },
};

/** Kit for callers without a style (market, station): the rustic default. */
export const DEFAULT_KIT: FestiveKit = RUSTIC;

/** Winter theme: white, light blue and iron on the tree, pearlescent light, white star. */
export const WINTER_TREE_KIT: TreeKit = {
  ornaments: [['white_concrete', 5], ['light_blue_concrete', 3], ['iron_block', 2]],
  light: 'pearlescent_froglight',
  starOutline: 'quartz_block',
  starCore: 'pearlescent_froglight',
};

export function festiveKit(style: StyleId | undefined): FestiveKit {
  return style ? FESTIVE_KITS[style] : DEFAULT_KIT;
}

export function treeKitFor(style: StyleId | undefined, theme: Theme): TreeKit {
  return theme === 'winter' ? WINTER_TREE_KIT : festiveKit(style).treeDecor;
}

/** Leaves that exist in the target version (pale oak is 1.21.11 only; 1.21.1 falls back to azalea). */
export function leavesFor(id: string, minecraftVersion: string): string {
  return isAvailableIn(`minecraft:${id}`, minecraftVersion) ? id : 'azalea_leaves';
}

export interface FestiveWishes {
  christmasTree?: boolean;
  presents?: boolean;
  garland?: boolean;
}

/** Effective festive motifs: the explicit wish, else the kit default of the style and theme. */
export function festiveChoices(style: StyleId, theme: Theme, detailLevel: 1 | 2 | 3, wishes: FestiveWishes): { tree: boolean; presents: boolean; garland: boolean } {
  if (theme === 'none') return { tree: false, presents: false, garland: false };
  const kit = FESTIVE_KITS[style];
  const christmas = theme === 'christmas';
  return {
    tree: wishes.christmasTree ?? (christmas && detailLevel >= 2 && kit.tree),
    presents: wishes.presents ?? (christmas && detailLevel >= 2 && kit.presents),
    garland: wishes.garland ?? (christmas && detailLevel >= 2 && kit.garland),
  };
}
