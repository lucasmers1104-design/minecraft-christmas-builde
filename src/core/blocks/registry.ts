/**
 * Curated block-state registry (Minecraft Java 1.21.11 and 1.21.1, vanilla only).
 *
 * Only blocks listed here may appear in a VoxelModel palette. Every block belongs to a shape
 * class (src/core/blocks/shapes.ts) that defines its properties, defaults and geometry. Ids,
 * property names and allowed values are checked in tests/unit/registry.test.ts against
 * minecraft-data for every supported profile, so nothing in here is guessed. Blocks that only
 * exist in some versions (iron_chain since 1.21.9, chain before; pale oak and resin since
 * 1.21.4) carry `profiles` and are rejected for other target versions.
 */

import { allBlockSeeds, type BlockCategory, type RenderKind } from '@/core/blocks/families';
import { SHAPES, type ShapeClass } from '@/core/blocks/shapes';
import { TEXTURE_STATS } from '@/core/style/textureStats';

export type { BlockCategory, RenderKind } from '@/core/blocks/families';

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
  shape: ShapeClass;
  category: BlockCategory;
  properties: Readonly<Record<string, readonly string[]>>;
  defaults: Readonly<Record<string, string>>;
  render: BlockRender;
  /** Minecraft versions that have this block; undefined = all supported versions. */
  profiles?: readonly string[];
  /** Light level when lit (0 = no light). */
  light: number;
}

const DEFINITIONS: readonly BlockDefinition[] = allBlockSeeds().map((seed) => {
  const spec = SHAPES[seed.shape];
  return {
    id: `minecraft:${seed.id}`,
    label: seed.label,
    shape: seed.shape,
    category: seed.category,
    properties: spec.properties,
    defaults: spec.defaults,
    render: {
      kind: seed.kind ?? (seed.light && seed.light >= 14 && spec.fullCube ? 'emissive' : 'opaque'),
      // Mean texture colour measured from the client jar where available (numbers only).
      color: TEXTURE_STATS[seed.id]?.[0] ?? seed.color,
      ...(seed.opacity !== undefined ? { opacity: seed.opacity } : {}),
    },
    ...(seed.profiles ? { profiles: seed.profiles } : {}),
    light: seed.light ?? 0,
  };
});

const BY_ID = new Map<string, BlockDefinition>(DEFINITIONS.map((d) => [d.id, d]));
if (BY_ID.size !== DEFINITIONS.length) throw new Error('Doppelte Block-ID in der Registry');

export const AIR = 'minecraft:air';

export function listBlockDefinitions(): readonly BlockDefinition[] {
  return DEFINITIONS;
}

export function getBlockDefinition(id: string): BlockDefinition | undefined {
  return BY_ID.get(id);
}

/** True if the block exists in the given Minecraft version (or always when no version given). */
export function isAvailableIn(id: string, minecraftVersion?: string): boolean {
  const def = BY_ID.get(id);
  if (!def) return false;
  return !minecraftVersion || !def.profiles || def.profiles.includes(minecraftVersion);
}

/**
 * Version-specific spelling of a block: `iron_chain` (1.21.9+) is `chain` in 1.21.1. Generators
 * ask for the modern id and get the one valid in the target version.
 *
 * Blocks added in 1.21.4 (pale oak, resin bricks) get a look-alike stand-in of the same shape
 * class for 1.21.1, so palettes may use them (research 07, recommendation 6; ΔE00 of the
 * measured texture colours in brackets).
 */
const RENAMED: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  'minecraft:iron_chain': { '1.21.1': 'minecraft:chain' },
  'minecraft:waxed_lightning_rod': { '1.21.1': 'minecraft:lightning_rod' },
  // Stand-ins (1.21.4+ → 1.21.1).
  'minecraft:pale_oak_planks': { '1.21.1': 'minecraft:smooth_quartz' }, // 4.7
  'minecraft:pale_oak_stairs': { '1.21.1': 'minecraft:smooth_quartz_stairs' },
  'minecraft:pale_oak_slab': { '1.21.1': 'minecraft:smooth_quartz_slab' },
  'minecraft:pale_oak_log': { '1.21.1': 'minecraft:deepslate' }, // 5.8, grey bark
  'minecraft:pale_oak_wood': { '1.21.1': 'minecraft:deepslate' },
  'minecraft:stripped_pale_oak_log': { '1.21.1': 'minecraft:quartz_pillar' }, // 4.0
  'minecraft:stripped_pale_oak_wood': { '1.21.1': 'minecraft:quartz_pillar' },
  'minecraft:pale_oak_trapdoor': { '1.21.1': 'minecraft:iron_trapdoor' }, // 6.2
  'minecraft:pale_oak_door': { '1.21.1': 'minecraft:birch_door' }, // a door that opens by hand
  'minecraft:pale_oak_fence': { '1.21.1': 'minecraft:birch_fence' },
  'minecraft:pale_oak_fence_gate': { '1.21.1': 'minecraft:birch_fence_gate' },
  'minecraft:pale_oak_button': { '1.21.1': 'minecraft:birch_button' },
  'minecraft:resin_bricks': { '1.21.1': 'minecraft:cut_red_sandstone' }, // 6.2
  'minecraft:resin_brick_stairs': { '1.21.1': 'minecraft:red_sandstone_stairs' },
  'minecraft:resin_brick_slab': { '1.21.1': 'minecraft:cut_red_sandstone_slab' },
  'minecraft:resin_brick_wall': { '1.21.1': 'minecraft:red_sandstone_wall' },
};

export function profileBlockId(id: string, minecraftVersion: string): string {
  const full = id.includes(':') ? id : `minecraft:${id}`;
  return RENAMED[full]?.[minecraftVersion] ?? full;
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
export function formatBlockState(id: string, properties: Readonly<Record<string, string>>): string {
  const names = Object.keys(properties).sort();
  if (names.length === 0) return id;
  return `${id}[${names.map((n) => `${n}=${properties[n]}`).join(',')}]`;
}

export type BlockStateCheck = { ok: true; canonical: string } | { ok: false; reason: string };

/**
 * Strictly validates a full block state string: the block must be in the registry (and, with a
 * version, exist in that Minecraft version), every property must exist with an allowed value,
 * no property may be missing, and the string must already be in canonical (sorted) form.
 */
export function checkBlockState(state: string, minecraftVersion?: string): BlockStateCheck {
  const parsed = parseBlockState(state);
  if (!parsed) return { ok: false, reason: `Ungültige Blockstate-Syntax: "${state}"` };
  const def = BY_ID.get(parsed.id);
  if (!def) return { ok: false, reason: `Unbekannter oder nicht freigegebener Block: "${parsed.id}"` };
  if (minecraftVersion && def.profiles && !def.profiles.includes(minecraftVersion)) {
    return { ok: false, reason: `Block ${def.id} gibt es in Minecraft ${minecraftVersion} nicht` };
  }
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
 * produce an unregistered block. Unknown override keys are an error, too.
 */
/** Canonical states already built (pure function of id and overrides; invalid input is never cached). */
const STATE_CACHE = new Map<string, string>();

export function blockState(shortOrFullId: string, overrides: Readonly<Record<string, string>> = {}): string {
  let key = shortOrFullId;
  for (const name in overrides) key += `|${name}=${overrides[name]}`;
  const hit = STATE_CACHE.get(key);
  if (hit !== undefined) return hit;
  const id = shortOrFullId.includes(':') ? shortOrFullId : `minecraft:${shortOrFullId}`;
  const def = BY_ID.get(id);
  if (!def) throw new Error(`Block nicht in der Registry: ${id}`);
  const properties = { ...def.defaults, ...overrides };
  const state = formatBlockState(id, properties);
  const check = checkBlockState(state);
  if (!check.ok) throw new Error(check.reason);
  STATE_CACHE.set(key, check.canonical);
  return check.canonical;
}

export function blockIdOf(state: string): string {
  const bracket = state.indexOf('[');
  return bracket === -1 ? state : state.slice(0, bracket);
}

/** Registry definition for a full state string (throws for unknown blocks). */
export function definitionOf(state: string): BlockDefinition {
  const def = BY_ID.get(blockIdOf(state));
  if (!def) throw new Error(`Kein Registry-Eintrag für ${state}`);
  return def;
}

const PROPS_CACHE = new Map<string, Readonly<Record<string, string>>>();

/** Properties of a state string (cached; the returned object must not be mutated). */
export function propsOf(state: string): Readonly<Record<string, string>> {
  let props = PROPS_CACHE.get(state);
  if (!props) {
    props = parseBlockState(state)?.properties ?? {};
    PROPS_CACHE.set(state, props);
  }
  return props;
}

/** Same block with some properties changed; returns the canonical string. */
export function withProps(state: string, changes: Readonly<Record<string, string>>): string {
  return formatBlockState(blockIdOf(state), { ...propsOf(state), ...changes });
}

export function shapeOf(state: string): ShapeClass {
  return BY_ID.get(blockIdOf(state))?.shape ?? 'cube';
}

export function renderInfoFor(state: string): BlockRender {
  const def = BY_ID.get(blockIdOf(state));
  if (!def) throw new Error(`Kein Render-Eintrag für ${state}`);
  return def.render;
}

export function labelFor(state: string): string {
  return BY_ID.get(blockIdOf(state))?.label ?? blockIdOf(state);
}

export const CATEGORY_LABELS: Readonly<Record<BlockCategory, string>> = {
  wood: 'Holz',
  stone: 'Stein',
  metal: 'Metall',
  glass: 'Glas',
  color: 'Farbe',
  light: 'Licht',
  nature: 'Natur',
  winter: 'Winter',
  deco: 'Deko',
  technic: 'Technik',
};
