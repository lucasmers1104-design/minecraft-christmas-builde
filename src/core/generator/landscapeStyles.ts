import type { StyleId, Theme } from '@/core/style/styles';
import type { LampDesignId } from '@/core/templates/lampPosts';
import type { TreeKind } from '@/core/templates/nature';

/**
 * Landscape as style data (research note 15_gelaende_gaerten_wege.md, sections "Wege –
 * Paletten je Stil", "Gärten", "Zäune, Mauern, Grenzen", "Bodentextur-Mischungen"; style
 * bibles 10–13 for nordic, japanese/cherry, mediterranean/modern and rustic; lamp posts from
 * 18_beleuchtung.md, "Lichtpalette je Stil").
 *
 * Only natural and garden blocks are fixed here. Building materials come from the palette
 * roles of the house: the path centre is the role `path`, fence wood comes from `frame`/`beam`,
 * garden walls from `wall` and `plinth`. Block ids are short (no namespace).
 */

/** Weighted block list. */
export type Mix = readonly (readonly [string, number])[];

export type PathForm = 'curved' | 'stepping' | 'grid';

export interface PathStyle {
  /** curved: centre line with rough shoulders; stepping: stones every second step; grid: straight plates with grass joints. */
  form: PathForm;
  /** Shoulder mix (the path role takes the remaining share, research T5: 50/30/15/5). */
  shoulder: Mix;
  /** Rare accent inside the centre line (≈ 8 %). */
  accent: string;
  /** Stone in front of the door (Antritt); 'path' = the palette role. */
  landing: string;
  /** Lateral wobble of the centre line: 0 straight, 1 gentle, 2 strong. */
  curve: 0 | 1 | 2;
  /** Plants beside the path (cherry: petals), empty for none. */
  edgePlants: Mix;
  /** Curb stones on the lawn beside the paved path (≈ 70 % of the cells), null for none. */
  curb: Mix | null;
}

export interface GroundStyle {
  /** Trodden ground near door, gate and path (cause: wear). */
  wear: Mix;
  /** Shaded ground under eaves and trees (cause: shade). */
  shade: Mix;
  /** Soft patches in the open lawn (value noise clusters). */
  patch: Mix;
  /** Share of the open lawn covered by patches. */
  patchShare: number;
  /** Lawn plants on grass and their share of free grass cells. */
  plants: Mix;
  plantShare: number;
  /** Soil under flower beds. */
  bedSoil: Mix;
}

export type BorderKind =
  /** Mixed leaf hedge, 1–2 high with bumps. */
  | 'hedge'
  /** Hedge on an earth bank (grass block on y = 1, leaves above). */
  | 'hedgeBank'
  /** Wooden fence 1 high (frame wood), log posts every 4–6. */
  | 'fence'
  /** Nordic gärdsgård: fence 1 high, a 2-high post every 3. */
  | 'gardsgard'
  /** Dry stone wall: field stones on y = 1, slab cap. */
  | 'fieldWall'
  /** Masonry wall blocks (stone_brick_wall …) 1 high. */
  | 'stoneWall'
  /** Garden wall from the wall material with cap and piers carrying pots. */
  | 'gardenWall'
  /** Japanese yotsume-gaki: bamboo fence 2 high with dark posts. */
  | 'bambooFence'
  /** Modern: single box-hedge cubes, no enclosure. */
  | 'boxHedge'
  | 'none';

export interface BorderStyle {
  front: BorderKind;
  sides: BorderKind;
  /** Hedge leaves, main species ≥ 60 % (research T8). */
  hedge: Mix;
  /** Field stones / wall blocks for fieldWall and stoneWall. */
  stones: Mix;
  /** Cap slab of field and garden walls. */
  cap: string;
  /** Leaf arch over the gate (cottage "rose bower", fantasy). */
  arch: boolean;
  /** Pots on garden-wall piers. */
  pots: readonly string[];
  /** Fallback gate/fence wood when the frame role has no fence form. */
  wood: string;
  /** Formal styles keep hedges exact (no bumps). */
  exact: boolean;
}

export type PropKind = 'woodpile' | 'hay' | 'barrels';

export interface GardenStyle {
  /** Bed flowers: 1–3 species per bed are drawn from here (never in winter/christmas). */
  flowers: readonly string[];
  /** Accent flower (≤ 10 % of a bed). */
  accent: string;
  /** Back row against the house (azaleas, ferns). */
  backRow: readonly string[];
  /** Green filler in beds. */
  green: readonly string[];
  /** Bush leaves. */
  bush: Mix;
  /** Trees and their weights; the first entry is the signature tree of the style. */
  trees: readonly (readonly [TreeKind, number])[];
  /** Minimum number of signature trees from detail level 2 (cherry: 1, mediterranean: 2 cypresses). */
  signatureMin: number;
  props: readonly PropKind[];
  /** Rock mix (null: no rocks, e.g. modern). */
  rocks: Mix | null;
  /** Japanese/modern: formal planting (groups and rows instead of drifts). */
  formal: boolean;
}

export interface LandscapeStyle {
  path: PathStyle;
  ground: GroundStyle;
  border: BorderStyle;
  garden: GardenStyle;
  /** Lamp post designs (one per building, research 18: at most two light types). */
  lamps: readonly LampDesignId[];
}

/** Every flower block in the registry (incl. pots and blossoms): banned in winter and christmas. */
export const FLOWER_IDS: ReadonlySet<string> = new Set([
  'poppy',
  'dandelion',
  'cornflower',
  'lily_of_the_valley',
  'allium',
  'oxeye_daisy',
  'red_tulip',
  'white_tulip',
  'pink_tulip',
  'pink_petals',
  'flowering_azalea',
  'flowering_azalea_leaves',
  'potted_poppy',
  'potted_red_tulip',
  'potted_white_tulip',
  'potted_dandelion',
  'potted_cornflower',
  'potted_lily_of_the_valley',
  'potted_flowering_azalea_bush',
]);

/** Winter replacement for beds (research 14, recommendation 1): ferns and little spruces. */
export const WINTER_BED: Mix = [
  ['fern', 5],
  ['spruce_sapling', 2],
  ['potted_spruce_sapling', 1.5],
  ['azalea', 1],
];

/** Winter hedge: spruce keeps its colour in snow biomes (research 14, weakness 18). */
const WINTER_HEDGE: Mix = [
  ['spruce_leaves', 7],
  ['azalea_leaves', 3],
];

const GRASS_PLANTS: Mix = [
  ['short_grass', 5],
  ['fern', 1],
];

export const LANDSCAPE_STYLES: Readonly<Record<StyleId, LandscapeStyle>> = {
  medieval: {
    path: {
      form: 'curved',
      shoulder: [
        ['gravel', 30],
        ['coarse_dirt', 15],
        ['mossy_cobblestone', 5],
      ],
      accent: 'mossy_cobblestone',
      landing: 'stone_bricks',
      curve: 1,
      edgePlants: [],
      curb: [['stone_bricks', 3], ['mossy_stone_bricks', 1]],
    },
    ground: {
      wear: [['coarse_dirt', 3], ['dirt_path', 1]],
      shade: [['rooted_dirt', 2], ['moss_block', 1]],
      patch: [['coarse_dirt', 2], ['rooted_dirt', 1], ['moss_block', 1]],
      patchShare: 0.12,
      plants: GRASS_PLANTS,
      plantShare: 0.16,
      bedSoil: [['coarse_dirt', 2], ['rooted_dirt', 1]],
    },
    border: {
      front: 'fence',
      sides: 'hedge',
      hedge: [['oak_leaves', 60], ['dark_oak_leaves', 25], ['azalea_leaves', 15]],
      stones: [['cobblestone', 5], ['mossy_cobblestone', 3], ['andesite', 2]],
      cap: 'cobblestone_slab',
      arch: true,
      pots: [],
      wood: 'spruce',
      exact: false,
    },
    garden: {
      flowers: ['poppy', 'oxeye_daisy', 'cornflower'],
      accent: 'dandelion',
      backRow: ['azalea', 'fern'],
      green: ['short_grass', 'fern'],
      bush: [['oak_leaves', 3], ['azalea_leaves', 1]],
      trees: [['oak', 3], ['birch', 1]],
      signatureMin: 0,
      props: ['woodpile', 'hay', 'barrels'],
      rocks: [['stone', 40], ['andesite', 25], ['cobblestone', 20], ['tuff', 10], ['mossy_cobblestone', 5]],
      formal: false,
    },
    lamps: ['high_gallows', 'stone_foot', 'snowy_gallows'],
  },
  fantasy: {
    path: {
      form: 'curved',
      shoulder: [
        ['moss_block', 30],
        ['rooted_dirt', 15],
        ['mossy_stone_bricks', 5],
      ],
      accent: 'mossy_stone_bricks',
      landing: 'mossy_cobblestone',
      curve: 2,
      edgePlants: [],
      curb: [['mossy_stone_bricks', 1]],
    },
    ground: {
      wear: [['rooted_dirt', 2], ['coarse_dirt', 1]],
      shade: [['moss_block', 3], ['rooted_dirt', 1]],
      patch: [['moss_block', 3], ['rooted_dirt', 1]],
      patchShare: 0.16,
      plants: [['short_grass', 5], ['moss_carpet', 2], ['fern', 1]],
      plantShare: 0.2,
      bedSoil: [['moss_block', 1], ['rooted_dirt', 1]],
    },
    border: {
      front: 'hedge',
      sides: 'hedgeBank',
      hedge: [['azalea_leaves', 60], ['flowering_azalea_leaves', 25], ['oak_leaves', 15]],
      stones: [['mossy_cobblestone', 5], ['mossy_stone_bricks', 3], ['cobblestone', 2]],
      cap: 'mossy_cobblestone_slab',
      arch: true,
      pots: [],
      wood: 'dark_oak',
      exact: false,
    },
    garden: {
      flowers: ['allium', 'pink_tulip', 'lily_of_the_valley'],
      accent: 'flowering_azalea',
      backRow: ['flowering_azalea', 'azalea', 'fern'],
      green: ['fern', 'moss_carpet'],
      bush: [['azalea_leaves', 3], ['flowering_azalea_leaves', 1]],
      trees: [['azalea', 3], ['oak', 1]],
      signatureMin: 1,
      props: ['barrels'],
      rocks: [['mossy_cobblestone', 40], ['stone', 30], ['andesite', 20], ['tuff', 10]],
      formal: false,
    },
    lamps: ['shroom_post', 'leaf_lamp', 'stone_foot'],
  },
  rustic: {
    path: {
      form: 'curved',
      shoulder: [
        ['dirt_path', 25],
        ['coarse_dirt', 15],
        ['rooted_dirt', 7],
        ['packed_mud', 3],
      ],
      accent: 'mossy_cobblestone',
      landing: 'path',
      curve: 2,
      edgePlants: [],
      curb: [['cobblestone', 1]],
    },
    ground: {
      wear: [['coarse_dirt', 3], ['dirt_path', 1], ['packed_mud', 1]],
      shade: [['rooted_dirt', 2], ['moss_block', 1]],
      patch: [['coarse_dirt', 2], ['rooted_dirt', 2], ['podzol', 1]],
      patchShare: 0.14,
      plants: [['short_grass', 6], ['fern', 2]],
      plantShare: 0.2,
      bedSoil: [['coarse_dirt', 1], ['rooted_dirt', 1]],
    },
    border: {
      front: 'fence',
      sides: 'fieldWall',
      hedge: [['oak_leaves', 60], ['birch_leaves', 25], ['azalea_leaves', 15]],
      stones: [['cobblestone', 50], ['mossy_cobblestone', 30], ['andesite', 10], ['stone', 10]],
      cap: 'cobblestone_slab',
      arch: false,
      pots: [],
      wood: 'spruce',
      exact: false,
    },
    garden: {
      flowers: ['dandelion', 'poppy', 'cornflower'],
      accent: 'oxeye_daisy',
      backRow: ['azalea', 'fern'],
      green: ['short_grass', 'fern'],
      bush: [['oak_leaves', 2], ['birch_leaves', 1], ['azalea_leaves', 1]],
      trees: [['oak', 2], ['birch', 1], ['spruce', 1]],
      signatureMin: 0,
      props: ['woodpile', 'hay', 'barrels'],
      rocks: [['cobblestone', 40], ['stone', 30], ['mossy_cobblestone', 20], ['andesite', 10]],
      formal: false,
    },
    lamps: ['snowy_gallows', 'hat_post', 'lantern_house'],
  },
  nordic: {
    path: {
      form: 'curved',
      shoulder: [
        ['dirt_path', 25],
        ['coarse_dirt', 15],
        ['gravel', 7],
        ['tuff', 3],
      ],
      accent: 'tuff',
      landing: 'path',
      curve: 1,
      edgePlants: [],
      curb: [['cobbled_deepslate', 1]],
    },
    ground: {
      wear: [['coarse_dirt', 3], ['dirt_path', 1]],
      shade: [['podzol', 2], ['moss_block', 1]],
      patch: [['podzol', 2], ['coarse_dirt', 1], ['moss_block', 1]],
      patchShare: 0.14,
      // Vanilla patch_taiga_grass: grass to fern 1 : 4.
      plants: [['fern', 4], ['short_grass', 1]],
      plantShare: 0.18,
      bedSoil: [['podzol', 1], ['coarse_dirt', 1]],
    },
    border: {
      front: 'gardsgard',
      sides: 'hedgeBank',
      hedge: [['spruce_leaves', 60], ['dark_oak_leaves', 25], ['oak_leaves', 15]],
      stones: [['cobbled_deepslate', 5], ['cobblestone', 3], ['andesite', 2]],
      cap: 'cobbled_deepslate_slab',
      arch: false,
      pots: [],
      wood: 'spruce',
      exact: false,
    },
    garden: {
      flowers: ['lily_of_the_valley', 'white_tulip'],
      accent: 'cornflower',
      backRow: ['fern', 'azalea'],
      green: ['fern', 'fern', 'short_grass'],
      bush: [['spruce_leaves', 2], ['birch_leaves', 1]],
      trees: [['birch', 2], ['spruce', 2]],
      signatureMin: 1,
      props: ['woodpile', 'hay', 'barrels'],
      rocks: [['cobblestone', 30], ['mossy_cobblestone', 25], ['andesite', 25], ['stone', 20]],
      formal: false,
    },
    lamps: ['snowy_gallows', 'high_gallows'],
  },
  japanese: {
    path: {
      form: 'stepping',
      shoulder: [['moss_block', 1]],
      accent: 'polished_andesite',
      landing: 'polished_andesite',
      curve: 1,
      edgePlants: [],
      curb: null,
    },
    ground: {
      wear: [['gravel', 1]],
      shade: [['moss_block', 3], ['rooted_dirt', 1]],
      patch: [['moss_block', 4], ['gravel', 1]],
      patchShare: 0.2,
      plants: [['fern', 2], ['moss_carpet', 2], ['short_grass', 1]],
      plantShare: 0.12,
      bedSoil: [['moss_block', 1]],
    },
    border: {
      front: 'bambooFence',
      sides: 'hedge',
      hedge: [['dark_oak_leaves', 60], ['azalea_leaves', 40]],
      stones: [['andesite', 1]],
      cap: 'andesite_slab',
      arch: false,
      pots: [],
      wood: 'bamboo',
      exact: true,
    },
    garden: {
      // Japanese gardens: hardly any flowers – moss, ferns and clipped azaleas (research 11, i).
      flowers: ['lily_of_the_valley'],
      accent: 'lily_of_the_valley',
      backRow: ['azalea', 'fern'],
      green: ['fern', 'moss_carpet'],
      bush: [['azalea_leaves', 5], ['flowering_azalea_leaves', 1]],
      trees: [['pine', 3], ['cherry', 1]],
      signatureMin: 1,
      props: [],
      rocks: [['andesite', 40], ['stone', 30], ['tuff', 30]],
      formal: true,
    },
    lamps: ['kasuga', 'yukimi'],
  },
  cherry: {
    path: {
      form: 'curved',
      shoulder: [
        ['mossy_stone_bricks', 25],
        ['moss_block', 15],
        ['andesite', 5],
      ],
      accent: 'mossy_stone_bricks',
      landing: 'path',
      curve: 1,
      edgePlants: [['pink_petals', 1]],
      curb: [['stone_bricks', 1]],
    },
    ground: {
      wear: [['coarse_dirt', 1], ['rooted_dirt', 1]],
      shade: [['moss_block', 2], ['rooted_dirt', 1]],
      patch: [['moss_block', 2], ['rooted_dirt', 1]],
      patchShare: 0.12,
      plants: [['short_grass', 4], ['fern', 1]],
      plantShare: 0.14,
      bedSoil: [['rooted_dirt', 1], ['moss_block', 1]],
    },
    border: {
      front: 'stoneWall',
      sides: 'bambooFence',
      hedge: [['cherry_leaves', 60], ['azalea_leaves', 25], ['oak_leaves', 15]],
      stones: [['stone_brick_wall', 7], ['mossy_stone_brick_wall', 3]],
      cap: 'stone_brick_slab',
      arch: false,
      pots: [],
      wood: 'cherry',
      exact: false,
    },
    garden: {
      flowers: ['pink_tulip', 'white_tulip', 'pink_petals'],
      accent: 'allium',
      backRow: ['azalea', 'fern'],
      green: ['short_grass', 'fern'],
      bush: [['cherry_leaves', 2], ['azalea_leaves', 1]],
      trees: [['cherry', 4], ['pine', 1]],
      signatureMin: 1,
      props: [],
      rocks: [['andesite', 40], ['stone', 40], ['tuff', 20]],
      formal: false,
    },
    lamps: ['kasuga', 'yukimi', 'blossom_lamp'],
  },
  modern: {
    path: {
      form: 'grid',
      shoulder: [['polished_andesite', 1]],
      accent: 'polished_andesite',
      landing: 'path',
      curve: 0,
      edgePlants: [],
      curb: null,
    },
    ground: {
      wear: [['gravel', 1]],
      shade: [['gravel', 1]],
      patch: [['moss_block', 1]],
      patchShare: 0.02,
      plants: [['short_grass', 1]],
      plantShare: 0.05,
      bedSoil: [['coarse_dirt', 1]],
    },
    border: {
      front: 'boxHedge',
      sides: 'none',
      hedge: [['oak_leaves', 1]],
      stones: [['andesite_wall', 1]],
      cap: 'smooth_stone_slab',
      arch: false,
      pots: [],
      wood: 'spruce',
      exact: true,
    },
    garden: {
      flowers: ['white_tulip'],
      accent: 'white_tulip',
      backRow: ['short_grass'],
      green: ['short_grass', 'fern'],
      bush: [['oak_leaves', 1]],
      trees: [['cypress', 2], ['birch', 1]],
      signatureMin: 1,
      props: [],
      rocks: null,
      formal: true,
    },
    lamps: ['modern_mast', 'candelabra'],
  },
  mediterranean: {
    path: {
      form: 'curved',
      shoulder: [
        ['smooth_sandstone', 25],
        ['coarse_dirt', 10],
        ['terracotta', 5],
      ],
      accent: 'terracotta',
      landing: 'cut_sandstone',
      curve: 1,
      edgePlants: [],
      curb: [['cut_sandstone', 1]],
    },
    ground: {
      wear: [['coarse_dirt', 3], ['packed_mud', 1]],
      shade: [['rooted_dirt', 1], ['coarse_dirt', 1]],
      patch: [['coarse_dirt', 3], ['rooted_dirt', 1]],
      patchShare: 0.14,
      plants: [['short_grass', 1]],
      plantShare: 0.1,
      bedSoil: [['coarse_dirt', 2], ['rooted_dirt', 1]],
    },
    border: {
      front: 'gardenWall',
      sides: 'gardenWall',
      hedge: [['azalea_leaves', 60], ['oak_leaves', 40]],
      stones: [['sandstone', 1]],
      cap: 'smooth_sandstone_slab',
      arch: false,
      pots: ['potted_red_tulip', 'potted_azalea_bush', 'potted_flowering_azalea_bush', 'potted_poppy'],
      wood: 'spruce',
      exact: false,
    },
    garden: {
      flowers: ['red_tulip', 'allium', 'oxeye_daisy'],
      accent: 'poppy',
      backRow: ['flowering_azalea', 'azalea'],
      green: ['short_grass'],
      bush: [['azalea_leaves', 2], ['flowering_azalea_leaves', 1]],
      trees: [['cypress', 3], ['olive', 1]],
      signatureMin: 2,
      props: ['barrels'],
      rocks: [['granite', 50], ['sandstone', 30], ['andesite', 20]],
      formal: false,
    },
    lamps: ['sand_column', 'stone_arm'],
  },
};

/** Style data adjusted to the theme: no flowers and evergreen hedges in winter and christmas. */
export function landscapeStyle(style: StyleId, theme: Theme): LandscapeStyle {
  const s = LANDSCAPE_STYLES[style];
  if (theme === 'none') return s;
  const noFlowers = (m: Mix): Mix => m.filter(([id]) => !FLOWER_IDS.has(id));
  const leaves = (m: Mix): Mix => {
    // Flowering azalea leaves turn into plain azalea leaves; spruce dominates where oak would.
    const kept = m.map(([id, w]): readonly [string, number] => [id === 'flowering_azalea_leaves' ? 'azalea_leaves' : id, w]);
    return kept.some(([id]) => id === 'cherry_leaves') ? kept : WINTER_HEDGE;
  };
  return {
    ...s,
    path: { ...s.path, edgePlants: noFlowers(s.path.edgePlants) },
    border: { ...s.border, hedge: leaves(s.border.hedge), pots: ['potted_spruce_sapling', 'potted_fern', 'potted_azalea_bush'] },
    garden: {
      ...s.garden,
      flowers: [],
      accent: 'fern',
      backRow: s.garden.backRow.filter((id) => !FLOWER_IDS.has(id)).concat('spruce_sapling'),
      bush: leaves(s.garden.bush),
    },
  };
}
