import { getBlockDefinition } from '@/core/blocks/registry';
import { TEXTURE_STATS } from '@/core/style/textureStats';

/**
 * Materials: one building material and the block it uses for every form (the "mapping
 * problem" of Grimoire/Tome). A palette refers to materials, the geometry asks for a form
 * (block, stairs, slab, wall, …); missing forms come from substitute materials that look
 * alike (same brightness and hue), e.g. calcite has no stairs → smooth quartz stairs.
 *
 * `weathering` lists texture variants from clean to weathered/mossy; the texturing step
 * (texturing.ts) mixes them in clusters where weathering is strongest.
 *
 * Blocks added in 1.21.4 (pale oak, resin bricks) are allowed: the registry maps each of them
 * to a look-alike stand-in of the same shape for 1.21.1 (`profileBlockId`), and the generator
 * asks for the block of the target version. The palette lints check that every block of such
 * a material has a stand-in and keep these materials out of the roles the roof engine builds
 * directly (research 07, recommendation 6).
 */

export type Form = 'block' | 'stairs' | 'slab' | 'wall' | 'fence' | 'gate' | 'door' | 'trapdoor' | 'pillar' | 'stripped' | 'wood' | 'pane' | 'button';

export type MaterialFamily = 'wood' | 'log' | 'stone' | 'brick' | 'plaster' | 'metal' | 'glass' | 'nature' | 'cloth';

export interface Material {
  id: string;
  label: string;
  family: MaterialFamily;
  forms: Readonly<Partial<Record<Form, string>>>;
  /** Texture variants, clean → weathered (all full blocks of the same family). */
  weathering?: readonly string[];
  /** Material ids to borrow missing forms from, in order of preference. */
  substitutes?: readonly string[];
}

const MATERIALS = new Map<string, Material>();

function add(m: Material): void {
  for (const id of Object.values(m.forms)) {
    if (!getBlockDefinition(`minecraft:${id}`)) throw new Error(`Material ${m.id}: Block ${id} fehlt in der Registry`);
  }
  for (const id of m.weathering ?? []) {
    if (!getBlockDefinition(`minecraft:${id}`)) throw new Error(`Material ${m.id}: Block ${id} fehlt in der Registry`);
  }
  MATERIALS.set(m.id, m);
}

// Wood: planks material (with stairs, slab, fence, gate, door, trapdoor) and log material.
const WOODS: readonly [string, string, string, string][] = [
  ['oak', 'Eiche', 'oak_log', 'stripped_oak_log'],
  ['spruce', 'Fichte', 'spruce_log', 'stripped_spruce_log'],
  ['birch', 'Birke', 'birch_log', 'stripped_birch_log'],
  ['jungle', 'Tropenbaum', 'jungle_log', 'stripped_jungle_log'],
  ['acacia', 'Akazie', 'acacia_log', 'stripped_acacia_log'],
  ['dark_oak', 'Schwarzeiche', 'dark_oak_log', 'stripped_dark_oak_log'],
  ['mangrove', 'Mangrove', 'mangrove_log', 'stripped_mangrove_log'],
  ['cherry', 'Kirsche', 'cherry_log', 'stripped_cherry_log'],
  ['pale_oak', 'Blasseiche', 'pale_oak_log', 'stripped_pale_oak_log'],
  ['bamboo', 'Bambus', 'bamboo_block', 'stripped_bamboo_block'],
  ['crimson', 'Karmesin', 'crimson_stem', 'stripped_crimson_stem'],
  ['warped', 'Wirr', 'warped_stem', 'stripped_warped_stem'],
];
/**
 * Bark logs whose planks are much lighter than the bark take their shaped forms (braces, sills,
 * consoles, fences) from the wood whose planks match the bark (research 08 T3: |ΔL*| ≤ 8
 * between post and brace): spruce bark 17 → dark oak 20, oak bark 38 → spruce 38, cherry bark
 * 16 → dark oak 20.
 */
const BARK_SHAPES: Readonly<Record<string, string>> = { spruce: 'dark_oak', oak: 'spruce', cherry: 'dark_oak' };

const shapedForms = (w: string) => ({
  stairs: `${w}_stairs`,
  slab: `${w}_slab`,
  fence: `${w}_fence`,
  gate: `${w}_fence_gate`,
  door: `${w}_door`,
  trapdoor: `${w}_trapdoor`,
  button: `${w}_button`,
});

for (const [w, label, log, stripped] of WOODS) {
  const shaped = shapedForms(w);
  const wood = w === 'bamboo' ? 'bamboo_block' : w === 'crimson' || w === 'warped' ? `${w}_hyphae` : `${w}_wood`;
  add({ id: `${w}_planks`, label: `Bretter (${label})`, family: 'wood', forms: { block: `${w}_planks`, ...shaped, pillar: log, stripped, wood } });
  add({ id: log, label: `Stamm (${label})`, family: 'log', forms: { block: log, pillar: log, stripped, wood, ...shapedForms(BARK_SHAPES[w] ?? w) }, substitutes: [`${w}_planks`] });
  // Stripped posts meet in stripped wood (the bark block would show as a dark node).
  const strippedWood = w === 'bamboo' ? stripped : w === 'crimson' || w === 'warped' ? `stripped_${w}_hyphae` : `stripped_${w}_wood`;
  add({ id: stripped, label: `Entrindeter Stamm (${label})`, family: 'log', forms: { block: stripped, pillar: stripped, stripped, wood: strippedWood, ...shaped }, substitutes: [`${w}_planks`] });
}

// Stone and brick families (forms exactly as in 1.21.11).
interface StoneDef {
  id: string;
  label: string;
  prefix?: string;
  forms: ('stairs' | 'slab' | 'wall')[];
  family?: MaterialFamily;
  weathering?: string[];
  substitutes?: string[];
}
const SSW: ('stairs' | 'slab' | 'wall')[] = ['stairs', 'slab', 'wall'];
const SS: ('stairs' | 'slab' | 'wall')[] = ['stairs', 'slab'];
const STONES: readonly StoneDef[] = [
  { id: 'stone', label: 'Stein', forms: SS, substitutes: ['cobblestone'] },
  { id: 'cobblestone', label: 'Bruchstein', forms: SSW, weathering: ['cobblestone', 'mossy_cobblestone'] },
  { id: 'mossy_cobblestone', label: 'Bemooster Bruchstein', forms: SSW, weathering: ['mossy_cobblestone', 'moss_block'] },
  { id: 'stone_bricks', label: 'Steinziegel', prefix: 'stone_brick', forms: SSW, weathering: ['stone_bricks', 'cracked_stone_bricks', 'mossy_stone_bricks'] },
  { id: 'mossy_stone_bricks', label: 'Bemooste Steinziegel', prefix: 'mossy_stone_brick', forms: SSW },
  { id: 'smooth_stone', label: 'Glatter Stein', forms: ['slab'], substitutes: ['stone', 'andesite'] },
  { id: 'andesite', label: 'Andesit', forms: SSW, weathering: ['polished_andesite', 'andesite', 'cobblestone'] },
  { id: 'polished_andesite', label: 'Polierter Andesit', forms: SS, substitutes: ['andesite'] },
  { id: 'diorite', label: 'Diorit', forms: SSW },
  { id: 'polished_diorite', label: 'Polierter Diorit', forms: SS, substitutes: ['diorite'] },
  { id: 'granite', label: 'Granit', forms: SSW },
  { id: 'polished_granite', label: 'Polierter Granit', forms: SS, substitutes: ['granite'] },
  { id: 'cobbled_deepslate', label: 'Tiefenschiefer-Bruchstein', forms: SSW, weathering: ['cobbled_deepslate', 'polished_deepslate', 'deepslate_bricks'] },
  { id: 'polished_deepslate', label: 'Polierter Tiefenschiefer', forms: SSW },
  { id: 'deepslate_bricks', label: 'Tiefenschieferziegel', prefix: 'deepslate_brick', forms: SSW, weathering: ['deepslate_bricks', 'cracked_deepslate_bricks'] },
  { id: 'deepslate_tiles', label: 'Tiefenschieferfliesen', prefix: 'deepslate_tile', forms: SSW, weathering: ['deepslate_tiles', 'cracked_deepslate_tiles'] },
  { id: 'blackstone', label: 'Schwarzstein', forms: SSW },
  { id: 'polished_blackstone', label: 'Polierter Schwarzstein', forms: SSW },
  { id: 'polished_blackstone_bricks', label: 'Polierte Schwarzsteinziegel', prefix: 'polished_blackstone_brick', forms: SSW },
  { id: 'tuff', label: 'Tuffstein', forms: SSW },
  { id: 'tuff_bricks', label: 'Tuffsteinziegel', prefix: 'tuff_brick', forms: SSW, weathering: ['tuff_bricks', 'polished_tuff'] },
  { id: 'polished_tuff', label: 'Polierter Tuffstein', forms: SSW },
  { id: 'bricks', label: 'Ziegelsteine', prefix: 'brick', forms: SSW, family: 'brick' },
  { id: 'mud_bricks', label: 'Lehmziegel', prefix: 'mud_brick', forms: SSW, family: 'brick', weathering: ['mud_bricks', 'packed_mud'] },
  { id: 'sandstone', label: 'Sandstein', forms: SSW, weathering: ['smooth_sandstone', 'sandstone', 'cut_sandstone'] },
  { id: 'smooth_sandstone', label: 'Glatter Sandstein', forms: SS, weathering: ['smooth_sandstone', 'cut_sandstone', 'sandstone'], substitutes: ['sandstone'] },
  { id: 'cut_sandstone', label: 'Geschnittener Sandstein', forms: ['slab'], substitutes: ['sandstone'] },
  { id: 'red_sandstone', label: 'Roter Sandstein', forms: SSW },
  { id: 'smooth_red_sandstone', label: 'Glatter roter Sandstein', forms: SS, substitutes: ['red_sandstone'] },
  { id: 'cut_red_sandstone', label: 'Geschnittener roter Sandstein', forms: ['slab'], substitutes: ['red_sandstone'] },
  { id: 'quartz_block', label: 'Quarz', prefix: 'quartz', forms: SS, substitutes: ['smooth_quartz'] },
  { id: 'smooth_quartz', label: 'Glatter Quarz', forms: SS, substitutes: ['diorite'] },
  { id: 'prismarine', label: 'Prismarin', forms: SSW },
  { id: 'dark_prismarine', label: 'Dunkler Prismarin', forms: SS, substitutes: ['prismarine'] },
  { id: 'nether_bricks', label: 'Netherziegel', prefix: 'nether_brick', forms: SSW, family: 'brick' },
  { id: 'red_nether_bricks', label: 'Rote Netherziegel', prefix: 'red_nether_brick', forms: SSW, family: 'brick' },
  // 1.21.4+: stand-in cut red sandstone in 1.21.1 (registry).
  { id: 'resin_bricks', label: 'Harzziegel', prefix: 'resin_brick', forms: SSW, family: 'brick' },
  { id: 'end_stone_bricks', label: 'Endsteinziegel', prefix: 'end_stone_brick', forms: SSW },
];
for (const s of STONES) {
  const prefix = s.prefix ?? s.id;
  const forms: Partial<Record<Form, string>> = { block: s.id };
  for (const f of s.forms) forms[f] = `${prefix}_${f}`;
  add({
    id: s.id,
    label: s.label,
    family: s.family ?? 'stone',
    forms,
    ...(s.weathering ? { weathering: s.weathering } : {}),
    ...(s.substitutes ? { substitutes: s.substitutes } : {}),
  });
}

// Full blocks without shaped forms: substitutes chosen by brightness and hue (L* in brackets).
const PLAIN: readonly [id: string, label: string, family: MaterialFamily, substitutes: string[]][] = [
  ['calcite', 'Calcit', 'plaster', ['smooth_quartz', 'diorite']], // 89 → 92 / 76
  ['white_concrete', 'Weißer Beton', 'plaster', ['smooth_quartz', 'diorite']], // 85
  ['light_gray_concrete', 'Hellgrauer Beton', 'plaster', ['andesite', 'stone']], // 52
  ['gray_concrete', 'Grauer Beton', 'plaster', ['polished_deepslate']], // 24
  ['black_concrete', 'Schwarzer Beton', 'plaster', ['polished_blackstone']], // 3
  ['white_terracotta', 'Weiße Keramik', 'plaster', ['smooth_sandstone', 'birch_planks']], // 75
  ['terracotta', 'Keramik', 'brick', ['granite', 'bricks']], // 46
  ['red_terracotta', 'Rote Keramik', 'brick', ['bricks', 'red_nether_bricks']],
  ['orange_terracotta', 'Orange Keramik', 'brick', ['red_sandstone', 'granite']],
  ['yellow_terracotta', 'Ockerputz (gelbe Keramik)', 'plaster', ['oak_planks']], // 59 → 56
  ['pink_terracotta', 'Rosé Putz (rosa Keramik)', 'plaster', ['bricks']], // 44 → 47
  ['quartz_bricks', 'Quarzziegel', 'stone', ['smooth_quartz']],
  ['packed_mud', 'Festgestampfter Lehm', 'brick', ['mud_bricks']],
  ['cracked_stone_bricks', 'Rissige Steinziegel', 'stone', ['stone_bricks']],
  ['chiseled_stone_bricks', 'Gemeißelte Steinziegel', 'stone', ['stone_bricks']],
  ['chiseled_tuff_bricks', 'Gemeißelte Tuffsteinziegel', 'stone', ['tuff_bricks']],
  ['chiseled_sandstone', 'Gemeißelter Sandstein', 'stone', ['sandstone']],
  ['moss_block', 'Moos', 'nature', ['mossy_cobblestone']],
  ['snow_block', 'Schnee', 'plaster', ['smooth_quartz', 'diorite']],
  ['packed_ice', 'Packeis', 'glass', ['prismarine']],
  ['white_wool', 'Weiße Wolle', 'cloth', ['smooth_quartz']],
  ['red_wool', 'Rote Wolle', 'cloth', ['red_nether_bricks']],
  ['gold_block', 'Gold', 'metal', ['smooth_sandstone']],
];
for (const [id, label, family, substitutes] of PLAIN) add({ id, label, family, forms: { block: id }, substitutes });

// Pillar blocks (white posts and quoins) and the bamboo mosaic floor.
add({ id: 'quartz_pillar', label: 'Quarzsäule', family: 'stone', forms: { block: 'quartz_pillar', pillar: 'quartz_pillar' }, substitutes: ['smooth_quartz'] });
add({ id: 'bamboo_mosaic', label: 'Bambusmosaik', family: 'wood', forms: { block: 'bamboo_mosaic', stairs: 'bamboo_mosaic_stairs', slab: 'bamboo_mosaic_slab' }, substitutes: ['bamboo_planks'] });

// Glass: block and pane of the same colour.
add({ id: 'glass', label: 'Glas', family: 'glass', forms: { block: 'glass', pane: 'glass_pane' } });
add({ id: 'tinted_glass', label: 'Getöntes Glas', family: 'glass', forms: { block: 'tinted_glass' }, substitutes: ['gray_stained_glass'] });
for (const color of ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black']) {
  add({ id: `${color}_stained_glass`, label: `Buntglas (${color})`, family: 'glass', forms: { block: `${color}_stained_glass`, pane: `${color}_stained_glass_pane` } });
}
add({ id: 'iron', label: 'Eisen', family: 'metal', forms: { block: 'iron_block', door: 'iron_door', trapdoor: 'iron_trapdoor', pane: 'iron_bars' } });

// Waxed copper (never oxidises further).
for (const [stage, label] of [['', ''], ['exposed_', ' (angelaufen)'], ['weathered_', ' (verwittert)'], ['oxidized_', ' (oxidiert)']] as const) {
  add({
    id: `waxed_${stage}cut_copper`,
    label: `Kupfer${label}`,
    family: 'metal',
    forms: {
      block: `waxed_${stage}cut_copper`,
      stairs: `waxed_${stage}cut_copper_stairs`,
      slab: `waxed_${stage}cut_copper_slab`,
      door: `waxed_${stage}copper_door`,
      trapdoor: `waxed_${stage}copper_trapdoor`,
    },
  });
}

export function getMaterial(id: string): Material {
  const m = MATERIALS.get(id);
  if (!m) throw new Error(`Unbekanntes Material: ${id}`);
  return m;
}

export function hasMaterial(id: string): boolean {
  return MATERIALS.has(id);
}

export function listMaterials(): readonly Material[] {
  return [...MATERIALS.values()];
}

/**
 * Block id (short) for a form of a material, borrowing from substitutes when the material
 * has no such form. Returns null only if no substitute has it either.
 */
export function formOf(materialId: string, form: Form, seen: Set<string> = new Set()): string | null {
  const m = getMaterial(materialId);
  const own = m.forms[form];
  if (own) return own;
  seen.add(materialId);
  for (const sub of m.substitutes ?? []) {
    if (seen.has(sub) || !MATERIALS.has(sub)) continue;
    const found = formOf(sub, form, seen);
    if (found) return found;
  }
  return null;
}

/** Like formOf, but throws: generator code asks only for forms the lints guarantee. */
export function requireForm(materialId: string, form: Form): string {
  const id = formOf(materialId, form);
  if (!id) throw new Error(`Material ${materialId} hat keine Form „${form}“ (auch kein Ersatz)`);
  return id;
}

/** True if the material itself (not a substitute) has the form. */
export function hasOwnForm(materialId: string, form: Form): boolean {
  return !!getMaterial(materialId).forms[form];
}

/** CIELAB L* of a material's main block (measured from the client jar). */
export function brightnessOf(materialId: string): number {
  const block = getMaterial(materialId).forms.block ?? materialId;
  const stats = TEXTURE_STATS[block];
  if (!stats) throw new Error(`Keine Helligkeit für ${block}`);
  return stats[1];
}

export function chromaOf(materialId: string): number {
  const block = getMaterial(materialId).forms.block ?? materialId;
  return TEXTURE_STATS[block]?.[2] ?? 0;
}

/** Every block a material can place: its forms and its weathering variants. */
export function blocksOf(materialId: string): string[] {
  const m = getMaterial(materialId);
  return [...new Set([...Object.values(m.forms), ...(m.weathering ?? [])])];
}

/** CIELAB (L*, a*, b*) of a material's main block, from the measured L*, chroma and hue. */
export function labOf(materialId: string): readonly [number, number, number] {
  const block = getMaterial(materialId).forms.block ?? materialId;
  const stats = TEXTURE_STATS[block];
  if (!stats) throw new Error(`Keine Farbwerte für ${block}`);
  const [, l, c, h] = stats;
  const rad = (h * Math.PI) / 180;
  return [l, c * Math.cos(rad), c * Math.sin(rad)];
}

/**
 * Colour difference ΔE00 (CIEDE2000, Sharma, Wu and Dalal 2005) between two CIELAB colours.
 * About 1 is just visible; research 07 calibrates its contrast rules in this unit.
 */
export function deltaE00(lab1: readonly [number, number, number], lab2: readonly [number, number, number]): number {
  const [l1, a1, b1] = lab1;
  const [l2, a2, b2] = lab2;
  const deg = (r: number) => (r * 180) / Math.PI;
  const rad = (d: number) => (d * Math.PI) / 180;
  const pow7 = (x: number) => x ** 7;
  const cMean = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2;
  const g = 0.5 * (1 - Math.sqrt(pow7(cMean) / (pow7(cMean) + pow7(25))));
  const a1p = (1 + g) * a1;
  const a2p = (1 + g) * a2;
  const c1 = Math.hypot(a1p, b1);
  const c2 = Math.hypot(a2p, b2);
  const hue = (x: number, y: number) => (x === 0 && y === 0 ? 0 : (deg(Math.atan2(y, x)) + 360) % 360);
  const h1 = hue(a1p, b1);
  const h2 = hue(a2p, b2);
  let dh = 0;
  if (c1 * c2 !== 0) {
    dh = h2 - h1;
    if (dh > 180) dh -= 360;
    else if (dh < -180) dh += 360;
  }
  const dL = l2 - l1;
  const dC = c2 - c1;
  const dH = 2 * Math.sqrt(c1 * c2) * Math.sin(rad(dh / 2));
  const lMean = (l1 + l2) / 2;
  const cpMean = (c1 + c2) / 2;
  let hMean = h1 + h2;
  if (c1 * c2 !== 0) hMean = Math.abs(h1 - h2) > 180 ? (h1 + h2 + (h1 + h2 < 360 ? 360 : -360)) / 2 : (h1 + h2) / 2;
  const t = 1 - 0.17 * Math.cos(rad(hMean - 30)) + 0.24 * Math.cos(rad(2 * hMean)) + 0.32 * Math.cos(rad(3 * hMean + 6)) - 0.2 * Math.cos(rad(4 * hMean - 63));
  const dTheta = 30 * Math.exp(-(((hMean - 275) / 25) ** 2));
  const rc = 2 * Math.sqrt(pow7(cpMean) / (pow7(cpMean) + pow7(25)));
  const sl = 1 + (0.015 * (lMean - 50) ** 2) / Math.sqrt(20 + (lMean - 50) ** 2);
  const sc = 1 + 0.045 * cpMean;
  const sh = 1 + 0.015 * cpMean * t;
  const rt = -Math.sin(rad(2 * dTheta)) * rc;
  return Math.sqrt((dL / sl) ** 2 + (dC / sc) ** 2 + (dH / sh) ** 2 + rt * (dC / sc) * (dH / sh));
}

/** ΔE00 between the main blocks of two materials (measured texture colours). */
export function colorDistance(a: string, b: string): number {
  return deltaE00(labOf(a), labOf(b));
}
