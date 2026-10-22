import type { ShapeClass } from '@/core/blocks/shapes';

/**
 * Block families of Minecraft Java 1.21.11 (vanilla). Every id and property set is checked in
 * tests/unit/registry.test.ts against minecraft-data for each supported profile, so a typo or a
 * form that does not exist (e.g. calcite stairs) fails the test instead of the game.
 */

export type BlockCategory = 'wood' | 'stone' | 'metal' | 'glass' | 'color' | 'light' | 'nature' | 'winter' | 'deco' | 'technic';

export type RenderKind = 'none' | 'opaque' | 'cutout' | 'translucent' | 'emissive';

export interface BlockSeed {
  /** Id without namespace. */
  id: string;
  label: string;
  shape: ShapeClass;
  category: BlockCategory;
  /** Approximate texture colour (sRGB hex) for the colour preview. */
  color: string;
  kind?: RenderKind;
  opacity?: number;
  /** Only present in these Minecraft versions (default: all supported). */
  profiles?: readonly string[];
  /** Block light level when lit/standing (for snow-melt and lighting rules). */
  light?: number;
}

const ONLY_1_21_11 = ['1.21.11'] as const;
const ONLY_1_21_1 = ['1.21.1'] as const;

// ----------------------------------------------------------------------------------------------
// Wood: 12 kinds with planks, logs, stairs, slab, fence, gate, door, trapdoor, button, leaves.

interface WoodKind {
  id: string;
  label: string;
  planks: string;
  log: string;
  stripped: string;
  leaves?: string;
  /** Stem/hyphae instead of log/wood (nether), bamboo block instead of log. */
  logWord?: 'stem' | 'bamboo';
  profiles?: readonly string[];
}

const WOODS: readonly WoodKind[] = [
  { id: 'oak', label: 'Eiche', planks: '#a2834f', log: '#6d5532', stripped: '#b29157', leaves: '#4f7a2a' },
  { id: 'spruce', label: 'Fichte', planks: '#6b4f2f', log: '#3d2a17', stripped: '#755a36', leaves: '#3a5e3a' },
  { id: 'birch', label: 'Birke', planks: '#c0af79', log: '#d8d7d2', stripped: '#c5b077', leaves: '#5d7e3a' },
  { id: 'jungle', label: 'Tropenbaum', planks: '#a07351', log: '#554719', stripped: '#ab8454', leaves: '#3d7a1c' },
  { id: 'acacia', label: 'Akazie', planks: '#a85a32', log: '#676157', stripped: '#ae5d3b', leaves: '#567a26' },
  { id: 'dark_oak', label: 'Schwarzeiche', planks: '#432b14', log: '#3c2e1a', stripped: '#493924', leaves: '#3b5a1c' },
  { id: 'mangrove', label: 'Mangrove', planks: '#763631', log: '#544429', stripped: '#77363a', leaves: '#5a7a20' },
  { id: 'cherry', label: 'Kirsche', planks: '#e3b3ad', log: '#371c24', stripped: '#d79890', leaves: '#e5a9c3' },
  { id: 'pale_oak', label: 'Blasseiche', planks: '#e3d9d7', log: '#574d4a', stripped: '#f6eeed', leaves: '#a1a59a', profiles: ONLY_1_21_11 },
  { id: 'bamboo', label: 'Bambus', planks: '#c3ad51', log: '#7f8f2d', stripped: '#c0ad4f', logWord: 'bamboo' },
  { id: 'crimson', label: 'Karmesin', planks: '#653046', log: '#5c1a1e', stripped: '#89394e', logWord: 'stem' },
  { id: 'warped', label: 'Wirr', planks: '#2b6963', log: '#3a2e3c', stripped: '#3a9b8d', logWord: 'stem' },
];

function woodFamily(w: WoodKind): BlockSeed[] {
  const p = w.profiles;
  const s = (id: string, label: string, shape: ShapeClass, color: string, extra: Partial<BlockSeed> = {}): BlockSeed => ({
    id,
    label,
    shape,
    category: 'wood',
    color,
    ...(p ? { profiles: p } : {}),
    ...extra,
  });
  const out: BlockSeed[] = [s(`${w.id}_planks`, `Bretter (${w.label})`, 'cube', w.planks)];
  if (w.logWord === 'bamboo') {
    out.push(
      s('bamboo_block', 'Bambusblock', 'pillar', w.log),
      s('stripped_bamboo_block', 'Entrindeter Bambusblock', 'pillar', w.stripped),
      s('bamboo_mosaic', 'Bambusmosaik', 'cube', w.planks),
      s('bamboo_mosaic_stairs', 'Treppe (Bambusmosaik)', 'stairs', w.planks),
      s('bamboo_mosaic_slab', 'Stufe (Bambusmosaik)', 'slab', w.planks),
    );
  } else if (w.logWord === 'stem') {
    out.push(
      s(`${w.id}_stem`, `Stiel (${w.label})`, 'pillar', w.log),
      s(`stripped_${w.id}_stem`, `Entrindeter Stiel (${w.label})`, 'pillar', w.stripped),
      s(`${w.id}_hyphae`, `Hyphen (${w.label})`, 'pillar', w.log),
      s(`stripped_${w.id}_hyphae`, `Entrindete Hyphen (${w.label})`, 'pillar', w.stripped),
    );
  } else {
    out.push(
      s(`${w.id}_log`, `Stamm (${w.label})`, 'pillar', w.log),
      s(`stripped_${w.id}_log`, `Entrindeter Stamm (${w.label})`, 'pillar', w.stripped),
      s(`${w.id}_wood`, `Holz (${w.label})`, 'pillar', w.log),
      s(`stripped_${w.id}_wood`, `Entrindetes Holz (${w.label})`, 'pillar', w.stripped),
    );
  }
  out.push(
    s(`${w.id}_stairs`, `Treppe (${w.label})`, 'stairs', w.planks),
    s(`${w.id}_slab`, `Stufe (${w.label})`, 'slab', w.planks),
    s(`${w.id}_fence`, `Zaun (${w.label})`, 'fence', w.planks),
    s(`${w.id}_fence_gate`, `Zauntor (${w.label})`, 'fence_gate', w.planks),
    s(`${w.id}_door`, `Tür (${w.label})`, 'door', w.planks),
    s(`${w.id}_trapdoor`, `Falltür (${w.label})`, 'trapdoor', w.planks),
    s(`${w.id}_button`, `Knopf (${w.label})`, 'button', w.planks, { category: 'deco' }),
  );
  if (w.leaves) {
    out.push(s(`${w.id}_leaves`, `Laub (${w.label})`, 'leaves', w.leaves, { category: 'nature', kind: 'cutout' }));
  }
  return out;
}

// ----------------------------------------------------------------------------------------------
// Stone and other masonry: base block plus the forms that exist in 1.21.11.

interface StoneKind {
  /** Base block id. */
  block: string;
  label: string;
  color: string;
  /** Id prefix of the shaped forms, e.g. "stone_brick" for stone_bricks. */
  formPrefix?: string;
  stairs?: boolean;
  slab?: boolean;
  wall?: boolean;
  shape?: ShapeClass;
  category?: BlockCategory;
  profiles?: readonly string[];
}

const STONES: readonly StoneKind[] = [
  { block: 'stone', label: 'Stein', color: '#7e7e7e', stairs: true, slab: true },
  { block: 'cobblestone', label: 'Bruchstein', color: '#7a7a7a', stairs: true, slab: true, wall: true },
  { block: 'mossy_cobblestone', label: 'Bemooster Bruchstein', color: '#6e775f', stairs: true, slab: true, wall: true },
  { block: 'stone_bricks', label: 'Steinziegel', color: '#7b7b7b', formPrefix: 'stone_brick', stairs: true, slab: true, wall: true },
  { block: 'mossy_stone_bricks', label: 'Bemooste Steinziegel', color: '#737969', formPrefix: 'mossy_stone_brick', stairs: true, slab: true, wall: true },
  { block: 'cracked_stone_bricks', label: 'Rissige Steinziegel', color: '#767676' },
  { block: 'chiseled_stone_bricks', label: 'Gemeißelte Steinziegel', color: '#777777' },
  { block: 'smooth_stone', label: 'Glatter Stein', color: '#9e9e9e', slab: true },
  { block: 'granite', label: 'Granit', color: '#956756', stairs: true, slab: true, wall: true },
  { block: 'polished_granite', label: 'Polierter Granit', color: '#9a6a59', stairs: true, slab: true },
  { block: 'diorite', label: 'Diorit', color: '#bcbcbc', stairs: true, slab: true, wall: true },
  { block: 'polished_diorite', label: 'Polierter Diorit', color: '#c0c1c2', stairs: true, slab: true },
  { block: 'andesite', label: 'Andesit', color: '#888889', stairs: true, slab: true, wall: true },
  { block: 'polished_andesite', label: 'Polierter Andesit', color: '#848685', stairs: true, slab: true },
  { block: 'deepslate', label: 'Tiefenschiefer', color: '#505053', shape: 'pillar' },
  { block: 'cobbled_deepslate', label: 'Tiefenschiefer-Bruchstein', color: '#4d4d50', stairs: true, slab: true, wall: true },
  { block: 'polished_deepslate', label: 'Polierter Tiefenschiefer', color: '#484849', stairs: true, slab: true, wall: true },
  { block: 'deepslate_bricks', label: 'Tiefenschieferziegel', color: '#464646', formPrefix: 'deepslate_brick', stairs: true, slab: true, wall: true },
  { block: 'cracked_deepslate_bricks', label: 'Rissige Tiefenschieferziegel', color: '#414141' },
  { block: 'deepslate_tiles', label: 'Tiefenschieferfliesen', color: '#373737', formPrefix: 'deepslate_tile', stairs: true, slab: true, wall: true },
  { block: 'cracked_deepslate_tiles', label: 'Rissige Tiefenschieferfliesen', color: '#353535' },
  { block: 'chiseled_deepslate', label: 'Gemeißelter Tiefenschiefer', color: '#363636' },
  { block: 'bricks', label: 'Ziegelsteine', color: '#966153', formPrefix: 'brick', stairs: true, slab: true, wall: true },
  { block: 'mud_bricks', label: 'Lehmziegel', color: '#89684f', formPrefix: 'mud_brick', stairs: true, slab: true, wall: true },
  { block: 'packed_mud', label: 'Festgestampfter Lehm', color: '#8e6b50' },
  { block: 'tuff', label: 'Tuffstein', color: '#6c6d66', stairs: true, slab: true, wall: true },
  { block: 'polished_tuff', label: 'Polierter Tuffstein', color: '#626865', stairs: true, slab: true, wall: true },
  { block: 'tuff_bricks', label: 'Tuffsteinziegel', color: '#636660', formPrefix: 'tuff_brick', stairs: true, slab: true, wall: true },
  { block: 'chiseled_tuff_bricks', label: 'Gemeißelte Tuffsteinziegel', color: '#646862' },
  { block: 'sandstone', label: 'Sandstein', color: '#d8cb9b', stairs: true, slab: true, wall: true },
  { block: 'smooth_sandstone', label: 'Glatter Sandstein', color: '#e0d6a9', stairs: true, slab: true },
  { block: 'cut_sandstone', label: 'Geschnittener Sandstein', color: '#d9cd9e', slab: true },
  { block: 'chiseled_sandstone', label: 'Gemeißelter Sandstein', color: '#d8cb9a' },
  { block: 'red_sandstone', label: 'Roter Sandstein', color: '#b5621f', stairs: true, slab: true, wall: true },
  { block: 'smooth_red_sandstone', label: 'Glatter roter Sandstein', color: '#b5631f', stairs: true, slab: true },
  { block: 'cut_red_sandstone', label: 'Geschnittener roter Sandstein', color: '#bc6522', slab: true },
  { block: 'quartz_block', label: 'Quarzblock', color: '#ece6df', formPrefix: 'quartz', stairs: true, slab: true },
  { block: 'smooth_quartz', label: 'Glatter Quarz', color: '#ede6e0', stairs: true, slab: true },
  { block: 'quartz_bricks', label: 'Quarzziegel', color: '#eae5dd' },
  { block: 'quartz_pillar', label: 'Quarzsäule', color: '#ebe6e0', shape: 'pillar' },
  { block: 'chiseled_quartz_block', label: 'Gemeißelter Quarzblock', color: '#e7e2d9' },
  { block: 'calcite', label: 'Calcit', color: '#dfe0dc' },
  { block: 'prismarine', label: 'Prismarin', color: '#639c97', stairs: true, slab: true, wall: true },
  { block: 'prismarine_bricks', label: 'Prismarinziegel', color: '#63ab9e', formPrefix: 'prismarine_brick', stairs: true, slab: true },
  { block: 'dark_prismarine', label: 'Dunkler Prismarin', color: '#335b4b', stairs: true, slab: true },
  { block: 'blackstone', label: 'Schwarzstein', color: '#2a2328', stairs: true, slab: true, wall: true },
  { block: 'polished_blackstone', label: 'Polierter Schwarzstein', color: '#35303a', stairs: true, slab: true, wall: true },
  { block: 'polished_blackstone_bricks', label: 'Polierte Schwarzsteinziegel', color: '#302a30', formPrefix: 'polished_blackstone_brick', stairs: true, slab: true, wall: true },
  { block: 'chiseled_polished_blackstone', label: 'Gemeißelter polierter Schwarzstein', color: '#35303a' },
  { block: 'end_stone_bricks', label: 'Endsteinziegel', color: '#dadd9e', formPrefix: 'end_stone_brick', stairs: true, slab: true, wall: true },
  { block: 'purpur_block', label: 'Purpurblock', color: '#a97ea9', formPrefix: 'purpur', stairs: true, slab: true },
  { block: 'purpur_pillar', label: 'Purpursäule', color: '#ab81ab', shape: 'pillar' },
  { block: 'nether_bricks', label: 'Netherziegel', color: '#2c161a', formPrefix: 'nether_brick', stairs: true, slab: true, wall: true },
  { block: 'red_nether_bricks', label: 'Rote Netherziegel', color: '#450709', formPrefix: 'red_nether_brick', stairs: true, slab: true, wall: true },
  { block: 'resin_bricks', label: 'Harzziegel', color: '#ce5a1a', formPrefix: 'resin_brick', stairs: true, slab: true, wall: true, profiles: ONLY_1_21_11 },
  { block: 'terracotta', label: 'Keramik', color: '#985e43', category: 'color' },
];

function stoneFamily(k: StoneKind): BlockSeed[] {
  const prefix = k.formPrefix ?? k.block;
  const base: Partial<BlockSeed> = { category: k.category ?? 'stone', ...(k.profiles ? { profiles: k.profiles } : {}) };
  const out: BlockSeed[] = [{ id: k.block, label: k.label, shape: k.shape ?? 'cube', color: k.color, category: 'stone', ...base }];
  if (k.stairs) out.push({ id: `${prefix}_stairs`, label: `Treppe (${k.label})`, shape: 'stairs', color: k.color, category: 'stone', ...base });
  if (k.slab) out.push({ id: `${prefix}_slab`, label: `Stufe (${k.label})`, shape: 'slab', color: k.color, category: 'stone', ...base });
  if (k.wall) out.push({ id: `${prefix}_wall`, label: `Mauer (${k.label})`, shape: 'wall', color: k.color, category: 'stone', ...base });
  return out;
}

// ----------------------------------------------------------------------------------------------
// Copper (always waxed, so it never oxidises in the world).

const COPPER_STAGES = [
  { id: '', label: '', color: '#c06c50' },
  { id: 'exposed_', label: 'angelaufen', color: '#a17e68' },
  { id: 'weathered_', label: 'verwittert', color: '#6c9c6b' },
  { id: 'oxidized_', label: 'oxidiert', color: '#53a387' },
] as const;

function copperFamily(): BlockSeed[] {
  return COPPER_STAGES.flatMap((st) => {
    const suffix = st.label ? `, ${st.label}` : '';
    const block = st.id === '' ? 'waxed_copper_block' : `waxed_${st.id}copper`;
    const m = (id: string, label: string, shape: ShapeClass, extra: Partial<BlockSeed> = {}): BlockSeed => ({
      id,
      label: `${label} (gewachst${suffix})`,
      shape,
      category: 'metal',
      color: st.color,
      ...extra,
    });
    return [
      m(block, 'Kupferblock', 'cube'),
      m(`waxed_${st.id}cut_copper`, 'Geschnittenes Kupfer', 'cube'),
      m(`waxed_${st.id}cut_copper_stairs`, 'Treppe aus geschnittenem Kupfer', 'stairs'),
      m(`waxed_${st.id}cut_copper_slab`, 'Stufe aus geschnittenem Kupfer', 'slab'),
      m(`waxed_${st.id}copper_door`, 'Kupfertür', 'door'),
      m(`waxed_${st.id}copper_trapdoor`, 'Kupferfalltür', 'trapdoor'),
      m(`waxed_${st.id}copper_grate`, 'Kupfergitter', 'grate', { kind: 'cutout' }),
      m(`waxed_${st.id}copper_bulb`, 'Kupferleuchte', 'bulb', { category: 'light', light: 15 }),
    ];
  });
}

// ----------------------------------------------------------------------------------------------
// Dye colours: wool, concrete, terracotta, stained glass (+ panes), carpets, candles.

interface DyeColor {
  id: string;
  label: string;
  wool: string;
  concrete: string;
  terracotta: string;
  glass: string;
}

export const DYE_COLORS: readonly DyeColor[] = [
  { id: 'white', label: 'weiß', wool: '#e9ecec', concrete: '#cfd5d6', terracotta: '#d1b2a1', glass: '#f4f4f4' },
  { id: 'orange', label: 'orange', wool: '#f07613', concrete: '#e06100', terracotta: '#a15325', glass: '#d87f33' },
  { id: 'magenta', label: 'magenta', wool: '#bd44b3', concrete: '#a9309f', terracotta: '#95576c', glass: '#b24cd8' },
  { id: 'light_blue', label: 'hellblau', wool: '#3aafd9', concrete: '#2389c6', terracotta: '#706c8a', glass: '#8fc3e6' },
  { id: 'yellow', label: 'gelb', wool: '#f8c527', concrete: '#f0af15', terracotta: '#ba8523', glass: '#e5d24a' },
  { id: 'lime', label: 'hellgrün', wool: '#70b919', concrete: '#5ea818', terracotta: '#677534', glass: '#7fcc19' },
  { id: 'pink', label: 'rosa', wool: '#ed8dac', concrete: '#d5658e', terracotta: '#a14e4e', glass: '#f27fa5' },
  { id: 'gray', label: 'grau', wool: '#3e4447', concrete: '#36393d', terracotta: '#392a23', glass: '#4c4c4c' },
  { id: 'light_gray', label: 'hellgrau', wool: '#8e8e86', concrete: '#7d7d73', terracotta: '#876a61', glass: '#999999' },
  { id: 'cyan', label: 'türkis', wool: '#158991', concrete: '#157788', terracotta: '#565b5b', glass: '#4c7f99' },
  { id: 'purple', label: 'violett', wool: '#792aac', concrete: '#64209c', terracotta: '#764656', glass: '#7f3fb2' },
  { id: 'blue', label: 'blau', wool: '#35399d', concrete: '#2c2e8f', terracotta: '#4a3b5b', glass: '#334cb2' },
  { id: 'brown', label: 'braun', wool: '#724728', concrete: '#603b1f', terracotta: '#4d3323', glass: '#664c33' },
  { id: 'green', label: 'grün', wool: '#546d1b', concrete: '#495b24', terracotta: '#4c532a', glass: '#667f33' },
  { id: 'red', label: 'rot', wool: '#a12722', concrete: '#8e2020', terracotta: '#8f3d2e', glass: '#993333' },
  { id: 'black', label: 'schwarz', wool: '#141519', concrete: '#080a0f', terracotta: '#251610', glass: '#191919' },
];

function dyeFamily(c: DyeColor): BlockSeed[] {
  return [
    { id: `${c.id}_wool`, label: `Wolle (${c.label})`, shape: 'cube', category: 'color', color: c.wool },
    { id: `${c.id}_concrete`, label: `Beton (${c.label})`, shape: 'cube', category: 'color', color: c.concrete },
    { id: `${c.id}_terracotta`, label: `Keramik (${c.label})`, shape: 'cube', category: 'color', color: c.terracotta },
    { id: `${c.id}_stained_glass`, label: `Buntglas (${c.label})`, shape: 'cube', category: 'glass', color: c.glass, kind: 'translucent', opacity: 0.5 },
    { id: `${c.id}_stained_glass_pane`, label: `Buntglasscheibe (${c.label})`, shape: 'pane', category: 'glass', color: c.glass, kind: 'translucent', opacity: 0.5 },
    { id: `${c.id}_carpet`, label: `Teppich (${c.label})`, shape: 'carpet', category: 'deco', color: c.wool },
    { id: `${c.id}_candle`, label: `Kerze (${c.label})`, shape: 'candle', category: 'light', color: c.wool, light: 12 },
  ];
}

// ----------------------------------------------------------------------------------------------
// Everything else.

const MISC: readonly BlockSeed[] = [
  { id: 'air', label: 'Luft', shape: 'cube', category: 'technic', color: '#000000', kind: 'none' },

  // Glass and bars
  { id: 'glass', label: 'Glas', shape: 'cube', category: 'glass', color: '#c6e2ec', kind: 'translucent', opacity: 0.35 },
  { id: 'tinted_glass', label: 'Getöntes Glas', shape: 'cube', category: 'glass', color: '#2c2630', kind: 'translucent', opacity: 0.8 },
  { id: 'glass_pane', label: 'Glasscheibe', shape: 'pane', category: 'glass', color: '#c6e2ec', kind: 'translucent', opacity: 0.35 },
  { id: 'iron_bars', label: 'Eisengitter', shape: 'pane', category: 'metal', color: '#6d6f6e', kind: 'cutout' },

  // Metal
  { id: 'iron_block', label: 'Eisenblock', shape: 'cube', category: 'metal', color: '#dcdcdc' },
  { id: 'gold_block', label: 'Goldblock', shape: 'cube', category: 'metal', color: '#f6d03e' },
  { id: 'iron_door', label: 'Eisentür', shape: 'door', category: 'metal', color: '#c4c4c4' },
  { id: 'iron_trapdoor', label: 'Eisenfalltür', shape: 'trapdoor', category: 'metal', color: '#c4c4c4' },
  { id: 'iron_chain', label: 'Eisenkette', shape: 'chain', category: 'metal', color: '#3b4148', kind: 'cutout', profiles: ONLY_1_21_11 },
  { id: 'chain', label: 'Kette', shape: 'chain', category: 'metal', color: '#3b4148', kind: 'cutout', profiles: ONLY_1_21_1 },
  { id: 'lightning_rod', label: 'Blitzableiter', shape: 'lightning_rod', category: 'metal', color: '#c06c50' },
  { id: 'waxed_lightning_rod', label: 'Blitzableiter (gewachst)', shape: 'lightning_rod', category: 'metal', color: '#c06c50', profiles: ONLY_1_21_11 },

  // Light
  { id: 'lantern', label: 'Laterne', shape: 'lantern', category: 'light', color: '#e6a14a', kind: 'cutout', light: 15 },
  { id: 'soul_lantern', label: 'Seelenlaterne', shape: 'lantern', category: 'light', color: '#5fd4dc', kind: 'cutout', light: 10 },
  { id: 'glowstone', label: 'Leuchtstein', shape: 'cube', category: 'light', color: '#f9d49c', kind: 'emissive', light: 15 },
  { id: 'sea_lantern', label: 'Seelaterne', shape: 'cube', category: 'light', color: '#c9e0d8', kind: 'emissive', light: 15 },
  { id: 'shroomlight', label: 'Pilzlicht', shape: 'cube', category: 'light', color: '#f19a49', kind: 'emissive', light: 15 },
  { id: 'ochre_froglight', label: 'Ockerfarbenes Froschlicht', shape: 'pillar', category: 'light', color: '#f6e8a8', kind: 'emissive', light: 15 },
  { id: 'pearlescent_froglight', label: 'Perlmuttfarbenes Froschlicht', shape: 'pillar', category: 'light', color: '#f2e6ec', kind: 'emissive', light: 15 },
  { id: 'verdant_froglight', label: 'Grünliches Froschlicht', shape: 'pillar', category: 'light', color: '#e5f4e1', kind: 'emissive', light: 15 },
  { id: 'jack_o_lantern', label: 'Kürbislaterne', shape: 'facing_cube', category: 'light', color: '#e3901d', kind: 'emissive', light: 15 },
  { id: 'candle', label: 'Kerze', shape: 'candle', category: 'light', color: '#e7d6ae', light: 12 },
  { id: 'campfire', label: 'Lagerfeuer', shape: 'campfire', category: 'light', color: '#6b5236', light: 15 },
  { id: 'soul_campfire', label: 'Seelenlagerfeuer', shape: 'campfire', category: 'light', color: '#4a4a52', light: 10 },
  { id: 'end_rod', label: 'Endstab', shape: 'end_rod', category: 'light', color: '#f0e8e2', kind: 'emissive', light: 14 },

  // Furnishing and goods
  { id: 'bookshelf', label: 'Bücherregal', shape: 'cube', category: 'deco', color: '#75603a' },
  { id: 'crafting_table', label: 'Werkbank', shape: 'cube', category: 'deco', color: '#7a5a36' },
  { id: 'hay_block', label: 'Heuballen', shape: 'pillar', category: 'deco', color: '#a68c18' },
  { id: 'barrel', label: 'Fass', shape: 'barrel', category: 'deco', color: '#86643a' },
  { id: 'pumpkin', label: 'Kürbis', shape: 'cube', category: 'deco', color: '#c6761c' },
  { id: 'carved_pumpkin', label: 'Geschnitzter Kürbis', shape: 'facing_cube', category: 'deco', color: '#c27318' },
  { id: 'melon', label: 'Melone', shape: 'cube', category: 'deco', color: '#6f912a' },
  { id: 'flower_pot', label: 'Blumentopf', shape: 'potted', category: 'deco', color: '#7b4535' },
  { id: 'stone_button', label: 'Knopf (Stein)', shape: 'button', category: 'deco', color: '#7e7e7e' },
  { id: 'ladder', label: 'Leiter', shape: 'ladder', category: 'deco', color: '#7c6136', kind: 'cutout' },

  // Nature and ground
  { id: 'grass_block', label: 'Grasblock', shape: 'grass_block', category: 'nature', color: '#6e9a44' },
  { id: 'dirt', label: 'Erde', shape: 'cube', category: 'nature', color: '#866043' },
  { id: 'coarse_dirt', label: 'Grobe Erde', shape: 'cube', category: 'nature', color: '#77553b' },
  { id: 'rooted_dirt', label: 'Wurzelerde', shape: 'cube', category: 'nature', color: '#90674c' },
  { id: 'dirt_path', label: 'Trampelpfad', shape: 'path', category: 'nature', color: '#94793f' },
  { id: 'moss_block', label: 'Moosblock', shape: 'cube', category: 'nature', color: '#596e2d' },
  { id: 'moss_carpet', label: 'Moosteppich', shape: 'carpet', category: 'nature', color: '#596e2d' },
  { id: 'azalea_leaves', label: 'Azaleenlaub', shape: 'leaves', category: 'nature', color: '#5a7527', kind: 'cutout' },
  { id: 'flowering_azalea_leaves', label: 'Blühendes Azaleenlaub', shape: 'leaves', category: 'nature', color: '#647a3a', kind: 'cutout' },
  { id: 'pink_petals', label: 'Rosa Blütenblätter', shape: 'petals', category: 'nature', color: '#f2a8c8', kind: 'cutout' },
  { id: 'vine', label: 'Ranken', shape: 'vine', category: 'nature', color: '#3f6b1e', kind: 'cutout' },
  { id: 'short_grass', label: 'Gras', shape: 'plant', category: 'nature', color: '#6e9a44', kind: 'cutout' },
  { id: 'fern', label: 'Farn', shape: 'plant', category: 'nature', color: '#5f8a3a', kind: 'cutout' },
  { id: 'azalea', label: 'Azalee', shape: 'plant', category: 'nature', color: '#5d7a2c', kind: 'cutout' },
  { id: 'flowering_azalea', label: 'Blühende Azalee', shape: 'plant', category: 'nature', color: '#6f7a3a', kind: 'cutout' },
  { id: 'poppy', label: 'Mohn', shape: 'plant', category: 'nature', color: '#c0251b', kind: 'cutout' },
  { id: 'dandelion', label: 'Löwenzahn', shape: 'plant', category: 'nature', color: '#e8d23b', kind: 'cutout' },
  { id: 'cornflower', label: 'Kornblume', shape: 'plant', category: 'nature', color: '#4d6bd0', kind: 'cutout' },
  { id: 'lily_of_the_valley', label: 'Maiglöckchen', shape: 'plant', category: 'nature', color: '#e6e6e6', kind: 'cutout' },
  { id: 'allium', label: 'Zierlauch', shape: 'plant', category: 'nature', color: '#b467d6', kind: 'cutout' },
  { id: 'oxeye_daisy', label: 'Margerite', shape: 'plant', category: 'nature', color: '#e9eccf', kind: 'cutout' },
  { id: 'red_tulip', label: 'Rote Tulpe', shape: 'plant', category: 'nature', color: '#c53620', kind: 'cutout' },
  { id: 'white_tulip', label: 'Weiße Tulpe', shape: 'plant', category: 'nature', color: '#e2e6e2', kind: 'cutout' },
  { id: 'pink_tulip', label: 'Rosa Tulpe', shape: 'plant', category: 'nature', color: '#e7a6c0', kind: 'cutout' },
  { id: 'oak_sapling', label: 'Setzling (Eiche)', shape: 'sapling', category: 'nature', color: '#4f7a2a', kind: 'cutout' },
  { id: 'spruce_sapling', label: 'Setzling (Fichte)', shape: 'sapling', category: 'nature', color: '#3a5e3a', kind: 'cutout' },
  { id: 'cherry_sapling', label: 'Setzling (Kirsche)', shape: 'sapling', category: 'nature', color: '#e5a9c3', kind: 'cutout' },
  { id: 'potted_spruce_sapling', label: 'Topf mit Fichtensetzling', shape: 'potted', category: 'deco', color: '#7b4535' },
  { id: 'potted_oak_sapling', label: 'Topf mit Eichensetzling', shape: 'potted', category: 'deco', color: '#7b4535' },
  { id: 'potted_cherry_sapling', label: 'Topf mit Kirschsetzling', shape: 'potted', category: 'deco', color: '#7b4535' },
  { id: 'potted_azalea_bush', label: 'Topf mit Azalee', shape: 'potted', category: 'deco', color: '#7b4535' },
  { id: 'potted_flowering_azalea_bush', label: 'Topf mit blühender Azalee', shape: 'potted', category: 'deco', color: '#7b4535' },
  { id: 'potted_fern', label: 'Topf mit Farn', shape: 'potted', category: 'deco', color: '#7b4535' },
  { id: 'potted_poppy', label: 'Topf mit Mohn', shape: 'potted', category: 'deco', color: '#7b4535' },
  { id: 'potted_red_tulip', label: 'Topf mit roter Tulpe', shape: 'potted', category: 'deco', color: '#7b4535' },
  { id: 'potted_white_tulip', label: 'Topf mit weißer Tulpe', shape: 'potted', category: 'deco', color: '#7b4535' },
  { id: 'potted_dandelion', label: 'Topf mit Löwenzahn', shape: 'potted', category: 'deco', color: '#7b4535' },
  { id: 'potted_cornflower', label: 'Topf mit Kornblume', shape: 'potted', category: 'deco', color: '#7b4535' },
  { id: 'potted_lily_of_the_valley', label: 'Topf mit Maiglöckchen', shape: 'potted', category: 'deco', color: '#7b4535' },
  { id: 'potted_bamboo', label: 'Topf mit Bambus', shape: 'potted', category: 'deco', color: '#7b4535' },

  // Winter
  { id: 'snow_block', label: 'Schneeblock', shape: 'cube', category: 'winter', color: '#f3fbfb' },
  { id: 'snow', label: 'Schneeschicht', shape: 'snow_layer', category: 'winter', color: '#f3fbfb' },
  { id: 'packed_ice', label: 'Packeis', shape: 'cube', category: 'winter', color: '#8db4f2' },
  { id: 'blue_ice', label: 'Blaueis', shape: 'cube', category: 'winter', color: '#74a8fd' },
  { id: 'ice', label: 'Eis', shape: 'cube', category: 'winter', color: '#91b7fd', kind: 'translucent', opacity: 0.6 },

  // Technic
  { id: 'rail', label: 'Schiene', shape: 'rail', category: 'technic', color: '#8d8a84', kind: 'cutout' },
];

export function allBlockSeeds(): BlockSeed[] {
  return [
    ...MISC,
    ...WOODS.flatMap(woodFamily),
    ...STONES.flatMap(stoneFamily),
    ...copperFamily(),
    ...DYE_COLORS.flatMap(dyeFamily),
  ];
}

/** Wood kinds in a fixed order (for UI and style data). */
export const WOOD_KIND_IDS = WOODS.map((w) => w.id);
