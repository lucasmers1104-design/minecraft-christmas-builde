/**
 * Curated block-state registry (Minecraft Java 1.21.11 and 1.21.1, vanilla only).
 *
 * Only blocks listed here may appear in a VoxelModel palette. Property names and the
 * allowed values are checked in tests/unit/registry.test.ts against minecraft-data's
 * block lists for every supported profile, so nothing in here is guessed. All blocks render as full cubes
 * (or nothing, for air); non-cube shapes such as stairs, slabs, panes or snow layers are
 * deliberately not in the registry until renderer and exporter both support them.
 */

export type RenderKind = 'none' | 'opaque' | 'translucent' | 'emissive';

export interface BlockRender {
  kind: RenderKind;
  /** sRGB hex colour used by the voxel preview (approximate texture average). */
  color: string;
  /** Only for translucent blocks. */
  opacity?: number;
}

export interface BlockDefinition {
  id: string;
  label: string;
  properties: Readonly<Record<string, readonly string[]>>;
  defaults: Readonly<Record<string, string>>;
  render: BlockRender;
}

const AXIS = ['x', 'y', 'z'] as const;
const BOOL = ['true', 'false'] as const;
const FACING_HORIZONTAL = ['north', 'south', 'west', 'east'] as const;
const FACING_ALL = ['north', 'east', 'south', 'west', 'up', 'down'] as const;
const LEAF_DISTANCE = ['1', '2', '3', '4', '5', '6', '7'] as const;

function simple(id: string, label: string, render: BlockRender): BlockDefinition {
  return { id: `minecraft:${id}`, label, properties: {}, defaults: {}, render };
}

function log(id: string, label: string, color: string): BlockDefinition {
  return {
    id: `minecraft:${id}`,
    label,
    properties: { axis: AXIS },
    defaults: { axis: 'y' },
    render: { kind: 'opaque', color },
  };
}

function axisBlock(id: string, label: string, render: BlockRender): BlockDefinition {
  return { id: `minecraft:${id}`, label, properties: { axis: AXIS }, defaults: { axis: 'y' }, render };
}

/** Full cube whose texture depends on a horizontal facing (geometry is still a cube). */
function facing(id: string, label: string, render: BlockRender): BlockDefinition {
  return { id: `minecraft:${id}`, label, properties: { facing: FACING_HORIZONTAL }, defaults: { facing: 'north' }, render };
}

function leaves(id: string, label: string, color: string): BlockDefinition {
  return {
    id: `minecraft:${id}`,
    label,
    properties: { distance: LEAF_DISTANCE, persistent: BOOL, waterlogged: BOOL },
    // persistent=true keeps placed leaves from decaying in the world.
    defaults: { distance: '7', persistent: 'true', waterlogged: 'false' },
    render: { kind: 'opaque', color },
  };
}

const opaque = (color: string): BlockRender => ({ kind: 'opaque', color });
const glass = (color: string, opacity: number): BlockRender => ({ kind: 'translucent', color, opacity });
const light = (color: string): BlockRender => ({ kind: 'emissive', color });

interface DyeColor {
  id: string;
  label: string;
  wool: string;
  concrete: string;
  terracotta: string;
  glass: string;
}

const DYE_COLORS: readonly DyeColor[] = [
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

const DEFINITIONS: readonly BlockDefinition[] = [
  simple('air', 'Luft', { kind: 'none', color: '#000000' }),

  // Wood
  simple('spruce_planks', 'Fichtenholzbretter', opaque('#6b4f2f')),
  log('spruce_log', 'Fichtenstamm', '#3d2a17'),
  log('stripped_spruce_log', 'Entrindeter Fichtenstamm', '#755a36'),
  simple('oak_planks', 'Eichenholzbretter', opaque('#a2834f')),
  log('oak_log', 'Eichenstamm', '#6d5532'),
  log('stripped_oak_log', 'Entrindeter Eichenstamm', '#b29157'),
  simple('dark_oak_planks', 'Schwarzeichenholzbretter', opaque('#432b14')),
  log('dark_oak_log', 'Schwarzeichenstamm', '#3c2e1a'),
  log('stripped_dark_oak_log', 'Entrindeter Schwarzeichenstamm', '#493924'),
  simple('birch_planks', 'Birkenholzbretter', opaque('#c0af79')),
  log('birch_log', 'Birkenstamm', '#d8d7d2'),
  log('stripped_birch_log', 'Entrindeter Birkenstamm', '#c5b077'),
  log('spruce_wood', 'Fichtenholz', '#3a2a1a'),
  log('oak_wood', 'Eichenholz', '#6d5532'),
  log('dark_oak_wood', 'Schwarzeichenholz', '#3c2e1a'),

  // Stone
  simple('cobblestone', 'Bruchstein', opaque('#7a7a7a')),
  simple('stone_bricks', 'Steinziegel', opaque('#7b7b7b')),
  simple('smooth_stone', 'Glatter Stein', opaque('#9e9e9e')),
  simple('polished_andesite', 'Polierter Andesit', opaque('#848685')),
  simple('deepslate_tiles', 'Tiefenschieferfliesen', opaque('#373737')),
  simple('bricks', 'Ziegelsteine', opaque('#966153')),
  simple('stone', 'Stein', opaque('#7e7e7e')),
  simple('mossy_cobblestone', 'Bemooster Bruchstein', opaque('#6e775f')),
  simple('chiseled_stone_bricks', 'Gemeißelte Steinziegel', opaque('#777777')),
  simple('cracked_stone_bricks', 'Rissige Steinziegel', opaque('#767676')),
  simple('polished_deepslate', 'Polierter Tiefenschiefer', opaque('#484849')),
  simple('tuff_bricks', 'Tuffziegel', opaque('#636660')),
  simple('mud_bricks', 'Lehmziegel', opaque('#89684f')),
  simple('quartz_block', 'Quarzblock', opaque('#ece6df')),
  simple('smooth_quartz', 'Glatter Quarz', opaque('#ece6df')),
  simple('calcite', 'Calcit', opaque('#dfe0dc')),
  simple('sandstone', 'Sandstein', opaque('#d8cb9b')),
  simple('smooth_sandstone', 'Glatter Sandstein', opaque('#e0d6a9')),
  simple('red_sandstone', 'Roter Sandstein', opaque('#b5621f')),
  simple('iron_block', 'Eisenblock', opaque('#dcdcdc')),
  simple('waxed_copper_block', 'Gewachster Kupferblock', opaque('#c06c50')),
  simple('dirt', 'Erde', opaque('#866043')),
  simple('coarse_dirt', 'Grobe Erde', opaque('#77553b')),
  simple('moss_block', 'Moosblock', opaque('#596e2d')),
  simple('terracotta', 'Keramik', opaque('#985e43')),

  // Glass
  simple('glass', 'Glas', glass('#c6e2ec', 0.35)),

  // Colour families (wool, concrete, terracotta, stained glass) in all 16 dye colours
  ...DYE_COLORS.flatMap((c) => [
    simple(`${c.id}_wool`, `Wolle (${c.label})`, opaque(c.wool)),
    simple(`${c.id}_concrete`, `Beton (${c.label})`, opaque(c.concrete)),
    simple(`${c.id}_terracotta`, `Keramik (${c.label})`, opaque(c.terracotta)),
    simple(`${c.id}_stained_glass`, `Buntglas (${c.label})`, glass(c.glass, 0.5)),
  ]),

  // Winter
  simple('snow_block', 'Schneeblock', opaque('#f3fbfb')),
  simple('packed_ice', 'Packeis', opaque('#8db4f2')),
  simple('blue_ice', 'Blaueis', opaque('#74a8fd')),
  simple('ice', 'Eis', glass('#91b7fd', 0.6)),
  leaves('spruce_leaves', 'Fichtenlaub', '#3a5e3a'),
  leaves('oak_leaves', 'Eichenlaub', '#4f7a2a'),

  // Light & decoration
  simple('glowstone', 'Leuchtstein', light('#f9d49c')),
  simple('sea_lantern', 'Seelaterne', light('#c9e0d8')),
  simple('gold_block', 'Goldblock', opaque('#f6d03e')),
  simple('shroomlight', 'Pilzlicht', light('#f19a49')),
  axisBlock('ochre_froglight', 'Ockerfarbenes Froschlicht', light('#f6e8a8')),
  axisBlock('pearlescent_froglight', 'Perlmuttfarbenes Froschlicht', light('#f2e6ec')),
  axisBlock('verdant_froglight', 'Grünliches Froschlicht', light('#e5f4e1')),
  facing('jack_o_lantern', 'Kürbislaterne', light('#e3901d')),

  // Furnishing & goods (full cubes; facing only changes the texture)
  simple('bookshelf', 'Bücherregal', opaque('#75603a')),
  simple('crafting_table', 'Werkbank', opaque('#7a5a36')),
  axisBlock('hay_block', 'Heuballen', opaque('#a68c18')),
  {
    id: 'minecraft:barrel',
    label: 'Fass',
    properties: { facing: FACING_ALL, open: BOOL },
    defaults: { facing: 'up', open: 'false' },
    render: opaque('#86643a'),
  },
  simple('pumpkin', 'Kürbis', opaque('#c6761c')),
  facing('carved_pumpkin', 'Geschnitzter Kürbis', opaque('#c27318')),
  simple('melon', 'Melone', opaque('#6f912a')),
];

const BY_ID = new Map<string, BlockDefinition>(DEFINITIONS.map((d) => [d.id, d]));

export const AIR = 'minecraft:air';

export function listBlockDefinitions(): readonly BlockDefinition[] {
  return DEFINITIONS;
}

export function getBlockDefinition(id: string): BlockDefinition | undefined {
  return BY_ID.get(id);
}

export interface ParsedBlockState {
  id: string;
  properties: Record<string, string>;
}

const STATE_PATTERN = /^([a-z0-9_.-]+:[a-z0-9_./-]+)(?:\[([^\]]*)\])?$/;
const PROPERTY_PATTERN = /^([a-z0-9_]+)=([a-z0-9_]+)$/;

/** Splits `minecraft:oak_log[axis=y]` syntactically. Does not consult the registry. */
export function parseBlockState(state: string): ParsedBlockState | null {
  const match = STATE_PATTERN.exec(state);
  if (!match) return null;
  const id = match[1] as string;
  const properties: Record<string, string> = {};
  const rawProps = match[2];
  if (rawProps !== undefined) {
    if (rawProps.length === 0) return null;
    for (const part of rawProps.split(',')) {
      const prop = PROPERTY_PATTERN.exec(part);
      if (!prop) return null;
      const name = prop[1] as string;
      if (name in properties) return null;
      properties[name] = prop[2] as string;
    }
  }
  return { id, properties };
}

/** Canonical form: namespaced id, all properties present, sorted by name. */
export function formatBlockState(id: string, properties: Record<string, string>): string {
  const names = Object.keys(properties).sort();
  if (names.length === 0) return id;
  return `${id}[${names.map((n) => `${n}=${properties[n]}`).join(',')}]`;
}

export type BlockStateCheck = { ok: true; canonical: string } | { ok: false; reason: string };

/**
 * Strictly validates a full block state string: the block must be in the registry, every
 * property must exist with an allowed value, no property may be missing, and the string
 * must already be in canonical (sorted) form.
 */
export function checkBlockState(state: string): BlockStateCheck {
  const parsed = parseBlockState(state);
  if (!parsed) return { ok: false, reason: `Ungültige Blockstate-Syntax: "${state}"` };
  const def = BY_ID.get(parsed.id);
  if (!def) return { ok: false, reason: `Unbekannter oder nicht freigegebener Block: "${parsed.id}"` };
  for (const [name, value] of Object.entries(parsed.properties)) {
    const allowed = def.properties[name];
    if (!allowed) return { ok: false, reason: `Block ${def.id} hat keine Eigenschaft "${name}"` };
    if (!allowed.includes(value)) {
      return { ok: false, reason: `Ungültiger Wert ${name}=${value} für ${def.id} (erlaubt: ${allowed.join(', ')})` };
    }
  }
  for (const name of Object.keys(def.properties)) {
    if (!(name in parsed.properties)) {
      return { ok: false, reason: `Eigenschaft "${name}" fehlt in "${state}" (vollständiger Blockstate erforderlich)` };
    }
  }
  const canonical = formatBlockState(parsed.id, parsed.properties);
  if (canonical !== state) return { ok: false, reason: `Blockstate nicht kanonisch: "${state}" (erwartet "${canonical}")` };
  return { ok: true, canonical };
}

/**
 * Builds a canonical full block state from a short id and optional property overrides,
 * filling registry defaults. Throws on anything invalid – generator code must never
 * produce an unregistered block.
 */
export function blockState(shortOrFullId: string, overrides: Record<string, string> = {}): string {
  const id = shortOrFullId.includes(':') ? shortOrFullId : `minecraft:${shortOrFullId}`;
  const def = BY_ID.get(id);
  if (!def) throw new Error(`Block nicht in der Registry: ${id}`);
  const properties = { ...def.defaults, ...overrides };
  const state = formatBlockState(id, properties);
  const check = checkBlockState(state);
  if (!check.ok) throw new Error(check.reason);
  return check.canonical;
}

export function blockIdOf(state: string): string {
  const bracket = state.indexOf('[');
  return bracket === -1 ? state : state.slice(0, bracket);
}

export function renderInfoFor(state: string): BlockRender {
  const def = BY_ID.get(blockIdOf(state));
  if (!def) throw new Error(`Kein Render-Eintrag für ${state}`);
  return def.render;
}

export function labelFor(state: string): string {
  return BY_ID.get(blockIdOf(state))?.label ?? blockIdOf(state);
}
