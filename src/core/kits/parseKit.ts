import { gunzipSync } from 'node:zlib';
import { z } from 'zod';
import {
  blockIdOf,
  blockState,
  checkBlockState,
  definitionOf,
  formatBlockState,
  getBlockDefinition,
  isAvailableIn,
  listBlockDefinitions,
  parseBlockState,
  profileBlockId,
  propsOf,
} from '@/core/blocks/registry';
import type { ShapeClass } from '@/core/blocks/shapes';
import { rotateState } from '@/core/blocks/transform';
import { DEFAULT_PROFILE, PROFILES, type CompatibilityProfile } from '@/core/compat/profile';
import { decodeVarIntArray, VarIntDecodeError } from '@/core/export/encodeVarInt';
import { NbtReadError, readNbt, TAG, type NamedRoot, type NbtTag } from '@/core/export/nbtReader';
import {
  isFacadeKitPart,
  KIT_LIMITS,
  KIT_PART_LABELS,
  KIT_PARTS,
  KIT_SCOPE_ALL,
  KIT_SIDES,
  KIT_STOREYS,
  type DetailKit,
  type KitAirCell,
  type KitCell,
  type KitScope,
  type KitVersionSupport,
} from '@/core/kits/types';
import { STYLE_IDS } from '@/core/style/styles';

/**
 * Parses one detail kit: the bytes of its `.schem` (gzip-compressed Sponge v3, as WorldEdit
 * writes it) plus the text of its `.json` description → a canonical `DetailKit` or a list of
 * German problems. Pure (no file system); the server loader is src/lib/kits/loadKits.ts.
 *
 * Decoding follows src/core/export/validateSchematic.ts (own NBT reader, VarInt block data),
 * but is lenient where Minecraft is lenient (property order, missing properties = defaults)
 * and strict where it matters: only DataVersions of the known profiles, only registry blocks
 * that exist in that version, size limits (KIT_LIMITS), a complete door, an anchor inside the
 * box. The kit is turned from its building orientation (outside = north) into the canonical
 * template frame (outside = south) by a 180° rotation of positions and states.
 *
 * Anchor (JSON `anchor`, else derived from the WorldEdit `Offset`): WorldEdit stores
 * `Offset = minimum corner − player position at //copy` (SpongeSchematicV3Writer), so the
 * player's block in schematic coordinates is `−Offset`. Convention (docs/DETAIL_KITS.md):
 * - facade parts: the player stands OUTSIDE, directly in front of the anchor cell (one block
 *   north of it, feet in the anchor row), because the anchor cell itself holds glass or a door;
 * - chimney head: the player stands IN the flue cell of the lowest kit row.
 */

/** Zip-bomb guard: a full 9 × 12 × 9 kit needs a few KiB; block entity data may add some. */
const MAX_KIT_NBT_BYTES = 1024 * 1024;

/** Ids that mean "nothing here" in a copied region. */
const AIR_LIKE = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air', 'minecraft:structure_void']);

const NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} ._-]{0,63}$/u;

const GERMAN_ERRORS = z.locales.de().localeError;

const int = (min: number, max: number) => z.number().int().min(min).max(max);

/** The `.json` description next to a kit's `.schem` (docs/DETAIL_KITS.md). */
export const kitDescriptionSchema = z.strictObject({
  part: z.enum(KIT_PARTS),
  label: z.string().trim().min(1).max(80).optional(),
  /** Anchor in schematic coordinates (0-based from the box's minimum corner). */
  anchor: z.tuple([int(0, 255), int(0, 255), int(0, 255)]).optional(),
  opening: z.strictObject({ width: int(1, KIT_LIMITS.openingWidth), height: int(1, KIT_LIMITS.openingHeight) }).optional(),
  facing: z.literal('north', {
    error: 'facing muss "north" sein: Baue jedes Kit mit der Außenseite nach Norden (siehe docs/DETAIL_KITS.md).',
  }),
  fits: z
    .strictObject({
      storeys: z.array(z.enum(KIT_STOREYS)).min(1).optional(),
      sides: z.array(z.enum(KIT_SIDES)).min(1).optional(),
      minFacadeLength: int(1, 192).optional(),
      weight: int(1, 100).optional(),
    })
    .optional(),
});
export type KitDescription = z.infer<typeof kitDescriptionSchema>;

export interface KitFileInput {
  /** Folder below kits/: a style id or "alle". */
  scope: string;
  /** Base name of the file pair (without extension). */
  name: string;
  /** Raw bytes of the `.schem` file. */
  schematic: Uint8Array;
  /** Text of the `.json` description. */
  description: string;
}

export type ParseKitResult = { ok: true; kit: DetailKit } | { ok: false; problems: string[] };

export function isKitScope(value: string): value is KitScope {
  return value === KIT_SCOPE_ALL || (STYLE_IDS as readonly string[]).includes(value);
}

export function parseKit(input: KitFileInput): ParseKitResult {
  const problems: string[] = [];
  if (!isKitScope(input.scope)) problems.push(`Unbekannter Ordner „${input.scope}“: erlaubt sind ${[...STYLE_IDS, KIT_SCOPE_ALL].join(', ')}.`);
  if (!NAME_PATTERN.test(input.name)) {
    problems.push(`Ungültiger Kit-Name „${input.name}“: erlaubt sind Buchstaben, Ziffern, Leerzeichen, Punkt, _ und - (höchstens 64 Zeichen, am Anfang ein Buchstabe oder eine Ziffer).`);
  }
  const description = parseDescription(input.description);
  const schematic = decodeSchematic(input.schematic);
  problems.push(...description.problems, ...schematic.problems);
  if (problems.length > 0 || !description.value || !schematic.value) return { ok: false, problems };
  return buildKit(input.scope as KitScope, input.name, description.value, schematic.value);
}

// ---------------------------------------------------------------------------------------------
// Description (.json)

function formatIssue(issue: z.core.$ZodIssue): string {
  const path = issue.path.map(String).join('.');
  return path ? `${path}: ${issue.message}` : issue.message;
}

export function parseDescription(text: string): { value?: KitDescription; problems: string[] } {
  let json: unknown;
  try {
    // Editors on Windows like to start files with a byte order mark.
    json = JSON.parse(text.replace(/^﻿/, ''));
  } catch (error) {
    return { problems: [`Die Beschreibung ist kein gültiges JSON (${(error as Error).message}). Vergleiche sie mit den Beispielen in docs/DETAIL_KITS.md.`] };
  }
  const parsed = kitDescriptionSchema.safeParse(json, { error: GERMAN_ERRORS });
  if (!parsed.success) return { problems: parsed.error.issues.map(formatIssue) };
  const d = parsed.data;
  const problems: string[] = [];
  if (isFacadeKitPart(d.part) && !d.opening) {
    problems.push(`opening fehlt: Gib für ${KIT_PART_LABELS[d.part]} die Größe der Öffnung an, z. B. "opening": { "width": 1, "height": 2 }.`);
  }
  if (d.part === 'chimney_head' && d.opening) problems.push('opening gibt es bei Kaminköpfen nicht – lass das Feld weg.');
  if ((d.part === 'door' || d.part === 'balcony') && d.opening && d.opening.height < 2) {
    problems.push('opening.height muss bei Türen und Balkonen mindestens 2 sein (eine Tür ist 2 Blöcke hoch).');
  }
  return problems.length > 0 ? { problems } : { value: d, problems };
}

// ---------------------------------------------------------------------------------------------
// Schematic (.schem)

interface DecodedKitSchematic {
  profile: CompatibilityProfile;
  size: { width: number; height: number; length: number };
  offset: [number, number, number];
  /** Palette as canonical 1.21.11 states (older files mapped); null = air. */
  palette: (string | null)[];
  /** Palette index per cell, x + width * (z + length * y). */
  values: Uint32Array;
  blockEntities: number;
  entities: number;
}

function child(compound: NbtTag | undefined, name: string): NbtTag | undefined {
  return compound?.type === TAG.Compound ? compound.value.get(name) : undefined;
}

function decodeSchematic(bytes: Uint8Array): { value?: DecodedKitSchematic; problems: string[] } {
  const problems: string[] = [];
  let raw: Uint8Array;
  try {
    raw = gunzipSync(bytes, { maxOutputLength: MAX_KIT_NBT_BYTES });
  } catch (error) {
    return { problems: [`Die .schem-Datei lässt sich nicht entpacken (keine gzip-Datei, beschädigt oder entpackt größer als 1 MiB): ${(error as Error).message}`] };
  }
  let root: NamedRoot;
  try {
    root = readNbt(raw);
  } catch (error) {
    return { problems: [`Die .schem-Datei ist kein lesbares NBT: ${error instanceof NbtReadError ? error.message : (error as Error).message}`] };
  }

  const schematic = root.tag.value.get('Schematic');
  if (schematic?.type !== TAG.Compound) {
    const version = root.tag.value.get('Version');
    if (version?.type === TAG.Int) problems.push(`Die Datei ist eine Sponge-Schematic Version ${version.value}. Erwartet wird Version 3 (WorldEdit 7.3 oder neuer, //schem save <name>).`);
    else if (root.tag.value.has('Materials')) problems.push('Die Datei ist im alten MCEdit-Format (.schematic). Speichere das Kit mit WorldEdit 7.3 oder neuer als .schem.');
    else problems.push('Die Datei enthält keinen Eintrag "Schematic" (Sponge v3).');
    return { problems };
  }

  const version = child(schematic, 'Version');
  if (version?.type !== TAG.Int || version.value !== 3) {
    problems.push(`Schematic-Version ist ${version?.type === TAG.Int ? version.value : 'unbekannt'}, erwartet 3 (WorldEdit 7.3 oder neuer).`);
    return { problems };
  }
  const dataVersion = child(schematic, 'DataVersion');
  let profile: CompatibilityProfile | undefined;
  if (dataVersion?.type !== TAG.Int) problems.push('Schematic.DataVersion fehlt.');
  else {
    profile = PROFILES.find((p) => p.dataVersion === dataVersion.value);
    if (!profile) {
      problems.push(
        `DataVersion ${dataVersion.value} wird nicht unterstützt. Speichere das Kit in Minecraft ${PROFILES.map((p) => `${p.minecraftVersion} (DataVersion ${p.dataVersion})`).join(' oder ')}.`,
      );
    }
  }

  const axis = (name: 'Width' | 'Height' | 'Length'): number => {
    const tag = child(schematic, name);
    if (tag?.type !== TAG.Short) {
      problems.push(`Schematic.${name} fehlt oder ist kein TAG_Short.`);
      return 0;
    }
    return tag.value & 0xffff;
  };
  const size = { width: axis('Width'), height: axis('Height'), length: axis('Length') };
  if (problems.length === 0) {
    if (size.width < 1 || size.height < 1 || size.length < 1) problems.push(`Die Schematic ist leer (${size.width} × ${size.height} × ${size.length}).`);
    else if (size.width > KIT_LIMITS.width || size.height > KIT_LIMITS.height || size.length > KIT_LIMITS.length) {
      problems.push(
        `Kit zu groß: ${size.width} × ${size.height} × ${size.length} Blöcke (X × Y × Z). Erlaubt sind höchstens ${KIT_LIMITS.width} × ${KIT_LIMITS.height} × ${KIT_LIMITS.length} – wähle nur das Detail aus.`,
      );
    }
  }

  let offset: [number, number, number] = [0, 0, 0];
  const offsetTag = child(schematic, 'Offset');
  if (offsetTag) {
    if (offsetTag.type !== TAG.IntArray || offsetTag.value.length !== 3) problems.push('Schematic.Offset ist kein Int-Array mit 3 Einträgen.');
    else offset = [offsetTag.value[0]!, offsetTag.value[1]!, offsetTag.value[2]!];
  }

  const blocks = child(schematic, 'Blocks');
  const paletteTag = child(blocks, 'Palette');
  const dataTag = child(blocks, 'Data');
  if (blocks?.type !== TAG.Compound || paletteTag?.type !== TAG.Compound || dataTag?.type !== TAG.ByteArray) {
    problems.push('Schematic.Blocks mit Palette und Data fehlt (Sponge v3).');
  }
  if (problems.length > 0 || !profile || paletteTag?.type !== TAG.Compound || dataTag?.type !== TAG.ByteArray) return { problems };
  const fileProfile = profile;

  // Palette: ids 0..n-1, every entry a registry block of the file's version.
  const paletteSize = paletteTag.value.size;
  const palette = new Array<string | null | undefined>(paletteSize).fill(undefined);
  paletteTag.value.forEach((tag, key) => {
    if (tag.type !== TAG.Int || tag.value < 0 || tag.value >= paletteSize || palette[tag.value] !== undefined) {
      problems.push(`Palette-Eintrag "${key}" hat keine gültige, eindeutige Nummer.`);
      return;
    }
    const entry = convertPaletteEntry(key, fileProfile);
    if ('problem' in entry) problems.push(entry.problem);
    palette[tag.value] = 'state' in entry ? entry.state : null;
  });
  if (problems.length > 0) return { problems };

  const volume = size.width * size.height * size.length;
  let values: Uint32Array;
  try {
    values = decodeVarIntArray(new Uint8Array(dataTag.value.buffer, dataTag.value.byteOffset, dataTag.value.byteLength), volume);
  } catch (error) {
    return { problems: [`Blockdaten nicht lesbar: ${error instanceof VarIntDecodeError ? error.message : (error as Error).message}`] };
  }
  for (const v of values) {
    if (v >= paletteSize) return { problems: [`Blockdaten verweisen auf Palette-Eintrag ${v}, den es nicht gibt.`] };
  }

  const blockEntities = child(blocks, 'BlockEntities');
  const entities = child(schematic, 'Entities');
  return {
    value: {
      profile: fileProfile,
      size,
      offset,
      palette: palette as (string | null)[],
      values,
      blockEntities: blockEntities?.type === TAG.List ? blockEntities.value.length : 0,
      entities: entities?.type === TAG.List ? entities.value.length : 0,
    },
    problems,
  };
}

/** Modern (1.21.11) id of a block written by an older profile, e.g. 1.21.1 `chain` → `iron_chain`. */
let legacyIds: Map<string, Map<string, string>> | null = null;
function modernBlockId(id: string, minecraftVersion: string): string {
  const modern = DEFAULT_PROFILE.minecraftVersion;
  if (minecraftVersion === modern || isAvailableIn(id, modern)) return id;
  if (!legacyIds) {
    legacyIds = new Map();
    for (const p of PROFILES) {
      const map = new Map<string, string>();
      for (const def of listBlockDefinitions()) {
        if (!isAvailableIn(def.id, modern) || isAvailableIn(def.id, p.minecraftVersion)) continue;
        const old = profileBlockId(def.id, p.minecraftVersion);
        // Only true renames: the old id exists in the old version and nowhere else.
        if (old !== def.id && isAvailableIn(old, p.minecraftVersion) && !isAvailableIn(old, modern)) map.set(old, def.id);
      }
      legacyIds.set(p.minecraftVersion, map);
    }
  }
  return legacyIds.get(minecraftVersion)?.get(id) ?? id;
}

function convertPaletteEntry(key: string, profile: CompatibilityProfile): { state: string | null } | { problem: string } {
  const parsed = parseBlockState(key);
  if (!parsed) return { problem: `Ungültiger Blockzustand in der Palette: "${key}".` };
  if (AIR_LIKE.has(parsed.id)) return { state: null };
  if (!getBlockDefinition(parsed.id)) {
    return { problem: `Block "${parsed.id}" ist nicht freigegeben (nicht in der geprüften Blockliste der App). Ersetze ihn im Kit durch einen anderen Block.` };
  }
  // Like Minecraft's own state parser: property order is free, missing properties take defaults.
  let source: string;
  try {
    source = blockState(parsed.id, parsed.properties);
  } catch (error) {
    return { problem: `Blockzustand "${key}": ${(error as Error).message}.` };
  }
  const check = checkBlockState(source, profile.minecraftVersion);
  if (!check.ok) return { problem: `${check.reason}.` };
  const modern = formatBlockState(modernBlockId(parsed.id, profile.minecraftVersion), propsOf(source));
  const modernCheck = checkBlockState(modern, DEFAULT_PROFILE.minecraftVersion);
  if (!modernCheck.ok) return { problem: `${modernCheck.reason}.` };
  return { state: modern };
}

// ---------------------------------------------------------------------------------------------
// Canonical kit

/** Properties Minecraft derives from the neighbours; the state resolver recomputes them. */
const COMPUTED_PROPS: Partial<Record<ShapeClass, readonly string[]>> = {
  stairs: ['shape'],
  fence: ['north', 'east', 'south', 'west'],
  pane: ['north', 'east', 'south', 'west'],
  wall: ['north', 'east', 'south', 'west', 'up'],
  fence_gate: ['in_wall'],
  leaves: ['distance'],
  grass_block: ['snowy'],
  campfire: ['signal_fire'],
  vine: ['up'],
};
/** Blocks that a lost redstone signal closes again (vanilla neighbour update). */
const CLOSES_WITHOUT_POWER: ReadonlySet<ShapeClass> = new Set(['door', 'trapdoor', 'fence_gate']);

interface Counters {
  waterlogged: number;
  powered: number;
}

/** Canonical full state → intent cell props (see KitCell.props). */
function intentProps(state: string, counters: Counters): Record<string, string> {
  const shape = definitionOf(state).shape;
  const props: Record<string, string> = { ...propsOf(state) };
  for (const name of COMPUTED_PROPS[shape] ?? []) delete props[name];
  if (props.waterlogged === 'true') counters.waterlogged++;
  delete props.waterlogged;
  if (shape === 'leaves') props.persistent = 'true';
  if (props.powered === 'true') {
    // No redstone in a building: the game would switch it off (and close doors) on the next update.
    counters.powered++;
    props.powered = 'false';
    if (CLOSES_WITHOUT_POWER.has(shape)) props.open = 'false';
  }
  return Object.fromEntries(Object.keys(props).sort().map((k) => [k, props[k]!]));
}

const byPosition = (a: { x: number; y: number; d: number }, b: { x: number; y: number; d: number }) => a.y - b.y || a.d - b.d || a.x - b.x;

function versionSupport(blockIds: ReadonlySet<string>): KitVersionSupport[] {
  return PROFILES.map((p) => {
    const replacements: string[] = [];
    const missing: string[] = [];
    for (const id of [...blockIds].sort()) {
      const target = profileBlockId(id, p.minecraftVersion);
      if (!isAvailableIn(target, p.minecraftVersion)) missing.push(id);
      else if (target !== id) replacements.push(`${id} → ${target}`);
    }
    return { minecraftVersion: p.minecraftVersion, placeable: missing.length === 0, replacements, missing };
  });
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}

function buildKit(scope: KitScope, name: string, description: KitDescription, schematic: DecodedKitSchematic): ParseKitResult {
  const problems: string[] = [];
  const notes: string[] = [];
  const { part } = description;
  const facade = isFacadeKitPart(part);
  const { width: W, height: H, length: L } = schematic.size;
  const box = `${W} × ${H} × ${L}`;

  // Anchor: JSON, else the player's block at //copy (−Offset), for facade parts one block south
  // of the player (the player stood outside in front of the anchor cell).
  // `0 − v` instead of `−v`: no −0 for a zero offset.
  const player: [number, number, number] = [0 - schematic.offset[0], 0 - schematic.offset[1], 0 - schematic.offset[2]];
  const anchor: [number, number, number] = description.anchor ? [...description.anchor] : facade ? [player[0], player[1], player[2] + 1] : player;
  const anchorFrom = description.anchor ? 'json' : 'offset';
  const [aX, aY, aZ] = anchor;
  if (aX < 0 || aY < 0 || aZ < 0 || aX >= W || aY >= H || aZ >= L) {
    const hint =
      anchorFrom === 'json'
        ? 'Prüfe "anchor" in der JSON (Zählung ab 0 von der Ecke mit den kleinsten Koordinaten).'
        : facade
          ? 'Stell dich beim //copy außen direkt vor die linke untere Zelle der Öffnung (Blick nach Süden) – oder gib "anchor" in der JSON an.'
          : 'Stell dich beim //copy in die Rauchzug-Zelle der untersten Kit-Reihe – oder gib "anchor" in der JSON an.';
    problems.push(`Der Anker [${anchor.join(', ')}] liegt außerhalb der Schematic (${box}). ${hint}`);
    return { ok: false, problems };
  }
  if (part === 'chimney_head' && aY !== 0) problems.push(`Der Anker eines Kaminkopfs liegt in der untersten Reihe der Schematic (y = 0), nicht bei y = ${aY}.`);

  // Schematic (X, Y, Z) ↔ canonical (x, y, d): 180° turn around the anchor.
  const toCanonical = (X: number, Y: number, Z: number) => ({ x: aX - X, y: Y - aY, d: aZ - Z });
  const stateAt = (X: number, Y: number, Z: number): string | null =>
    X < 0 || Y < 0 || Z < 0 || X >= W || Y >= H || Z >= L ? null : schematic.palette[schematic.values[X + W * (Z + L * Y)]!]!;

  const cells: KitCell[] = [];
  const air = new Map<string, KitAirCell>();
  const occupied = new Set<string>();
  const key = (x: number, y: number, d: number) => `${x},${y},${d}`;
  const blockIds = new Set<string>();
  const counters: Counters = { waterlogged: 0, powered: 0 };
  let nonAir = 0;
  let tooDeep = 0;
  let doors = 0;

  for (let Y = 0; Y < H; Y++)
    for (let Z = 0; Z < L; Z++)
      for (let X = 0; X < W; X++) {
        const state = stateAt(X, Y, Z);
        if (state === null) continue;
        nonAir++;
        const c = toCanonical(X, Y, Z);
        occupied.add(key(c.x, c.y, c.d));
        if (facade && c.d < -KIT_LIMITS.maxBehindWall) tooDeep++;
        const shape = definitionOf(state).shape;
        if (shape === 'door') {
          const half = propsOf(state).half;
          const other = stateAt(X, half === 'lower' ? Y + 1 : Y - 1, Z);
          const id = blockIdOf(state);
          if (other === null || blockIdOf(other) !== id || propsOf(other).half === half) {
            problems.push(`Tür ${id} an Position (${X}, ${Y}, ${Z}) der Schematic: ${half === 'lower' ? 'obere' : 'untere'} Hälfte fehlt. Kopiere immer die ganze Tür.`);
            continue;
          }
          // The upper half is left to the state resolver (it mirrors the lower half), like in
          // every door template: the cell is forced air.
          if (half === 'upper') {
            air.set(key(c.x, c.y, c.d), c);
            continue;
          }
          // Entrance door: bottom row of the opening, in the wall plane or recessed by one.
          if (c.y === 0 && (c.d === 0 || c.d === -1) && c.x >= 0 && c.x < (description.opening?.width ?? 0)) doors++;
        }
        const canonical = rotateState(state, 2);
        const props = intentProps(canonical, counters);
        const block = blockIdOf(canonical);
        blockIds.add(block);
        cells.push({ ...c, block, props });
      }

  if (nonAir === 0) problems.push('Das Kit enthält keine Blöcke.');
  if (nonAir > KIT_LIMITS.blocks) problems.push(`Das Kit enthält ${nonAir} Blöcke, erlaubt sind höchstens ${KIT_LIMITS.blocks}.`);
  if (tooDeep > 0) {
    problems.push(`${tooDeep} Blöcke liegen mehr als ${KIT_LIMITS.maxBehindWall} Block hinter der Wandebene (im Raum). Fassaden-Kits dürfen höchstens ${KIT_LIMITS.maxBehindWall} Block in den Raum reichen.`);
  }

  if (facade && description.opening) {
    const { width: w, height: h } = description.opening;
    // Opening columns x = 0..w−1 lie at X = aX − x, rows y = 0..h−1 at Y = aY + y.
    if (aX - (w - 1) < 0 || aY + h - 1 >= H) {
      problems.push(
        `Die Öffnung (${w} × ${h}) ragt aus der Schematic (${box}). Prüfe "opening" und den Anker: Er ist die linke untere Zelle der Öffnung, von außen (Norden) gesehen.`,
      );
    }
    // A window whose opening is empty (wall plane and the cell behind it) almost always means a
    // misplaced anchor, e.g. the player stood in the opening instead of in front of it.
    const glazed = cells.some((c) => c.x >= 0 && c.x < w && c.y >= 0 && c.y < h && (c.d === 0 || c.d === -1));
    if ((part === 'window' || part === 'dormer_front') && !glazed) {
      problems.push('In der Öffnung (Wandebene oder einen Block dahinter) steht kein Block. Liegt der Anker richtig? Er ist die linke untere Zelle der Öffnung, von außen gesehen.');
    }
    if ((part === 'door' || part === 'balcony') && doors === 0) {
      problems.push(
        `${KIT_PART_LABELS[part]}-Kit ohne Tür: In der untersten Reihe der Öffnung (Höhe des Ankers, in der Wandebene oder einen Block dahinter) muss eine ganze Tür stehen.`,
      );
    }
    // Forced air: the opening in the wall plane and the room cell behind it.
    for (let x = 0; x < w; x++)
      for (let y = 0; y < h; y++)
        for (const d of [0, -1]) if (!occupied.has(key(x, y, d))) air.set(key(x, y, d), { x, y, d });
    // Blocks in the wall plane well away from the opening replace the house wall.
    const wallBlocks = cells.filter((c) => c.d === 0 && (c.x < -1 || c.x > w || c.y < -1 || c.y > h)).length;
    if (wallBlocks > 0) {
      notes.push(`${wallBlocks} Blöcke in der Wandebene liegen mehr als einen Block neben der Öffnung. Sie ersetzen beim Einsetzen die Hauswand – baue Kits möglichst ohne die Wand drumherum.`);
    }
  }
  if (part === 'chimney_head') {
    // The flue above the fire stays open: air in the anchor column is forced.
    for (let Y = 0; Y < H; Y++) {
      const c = toCanonical(aX, Y, aZ);
      if (!occupied.has(key(c.x, c.y, c.d))) air.set(key(c.x, c.y, c.d), c);
    }
  }
  if (problems.length > 0) return { ok: false, problems };

  if (schematic.blockEntities > 0) notes.push(`Inhalte von ${schematic.blockEntities} Blockobjekten (z. B. Fässer, Kisten) werden nicht übernommen – nur die Blöcke selbst.`);
  if (schematic.entities > 0) notes.push(`${schematic.entities} Objekte (z. B. Rahmen, Rüstungsständer) werden nicht übernommen.`);
  if (counters.waterlogged > 0) notes.push(`Wasser in ${counters.waterlogged} Blöcken entfernt.`);
  if (counters.powered > 0) notes.push(`${counters.powered} Blöcke waren mit Redstone geschaltet; sie werden ungeschaltet (Türen, Falltüren und Tore geschlossen) eingesetzt.`);
  const versions = versionSupport(blockIds);
  for (const v of versions) {
    if (!v.placeable) notes.push(`In Minecraft ${v.minecraftVersion} nicht verwendbar (fehlende Blöcke: ${v.missing.join(', ')}).`);
    else if (v.replacements.length > 0) notes.push(`In Minecraft ${v.minecraftVersion} ersetzt: ${v.replacements.join(', ')}.`);
  }

  const kit: DetailKit = {
    id: `kit:${scope}/${name}`,
    scope,
    name,
    part,
    label: description.label ?? `${KIT_PART_LABELS[part]} „${name}“`,
    opening: facade && description.opening ? { width: description.opening.width, height: description.opening.height } : null,
    fits: {
      // Fixed order, duplicates dropped (copies: the kit is frozen, the constants are shared).
      storeys: KIT_STOREYS.filter((s) => description.fits?.storeys?.includes(s) ?? true),
      sides: KIT_SIDES.filter((s) => description.fits?.sides?.includes(s) ?? true),
      minFacadeLength: description.fits?.minFacadeLength ?? 1,
      weight: description.fits?.weight ?? 1,
    },
    cells: cells.sort(byPosition),
    air: [...air.values()].map((a) => ({ x: a.x, y: a.y, d: a.d })).sort(byPosition),
    versions,
    source: {
      dataVersion: schematic.profile.dataVersion,
      minecraftVersion: schematic.profile.minecraftVersion,
      size: { ...schematic.size },
      anchor,
      anchorFrom,
      offset: schematic.offset,
    },
    notes,
  };
  return { ok: true, kit: deepFreeze(kit) };
}
