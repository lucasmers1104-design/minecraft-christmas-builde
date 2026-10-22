import { gunzipSync } from 'node:zlib';
import { checkBlockState } from '@/core/blocks/registry';
import { getProfileForVersion, PROFILES, type CompatibilityProfile } from '@/core/compat/profile';
import { decodeVarIntArray, VarIntDecodeError } from '@/core/export/encodeVarInt';
import { NbtReadError, readNbt, TAG, type NbtTag } from '@/core/export/nbtReader';
import {
  checkDimensions,
  computeVoxelHash,
  MAX_PALETTE_SIZE,
  MAX_VOLUME,
  type Dimensions,
  type VoxelModel,
} from '@/core/schema/voxelModel';

export interface DecodedSchematic {
  version: number;
  dataVersion: number;
  /** Profile matching the file's DataVersion. */
  minecraftVersion: string;
  dimensions: Dimensions;
  offset: [number, number, number];
  /** Palette ordered by palette id. */
  palette: string[];
  indices: Uint16Array;
  metadata: Record<string, string>;
  hash: string;
}

export interface SchematicValidationReport {
  ok: boolean;
  issues: string[];
  compressedBytes: number;
  uncompressedBytes: number;
  decoded?: DecodedSchematic;
}

/** Longest palette key we budget for (real block states are well below 200 characters). */
const MAX_PALETTE_KEY_BYTES = 256;
/** Bytes of the VarInt for the largest palette id (2 for MAX_PALETTE_SIZE = 4096 < 2^14). */
const MAX_INDEX_VARINT_BYTES = Math.max(1, Math.ceil(Math.log2(MAX_PALETTE_SIZE) / 7));
/**
 * Upper bound for the decompressed NBT (zip-bomb guard): the largest legal file, i.e.
 * MAX_VOLUME VarInts of MAX_INDEX_VARINT_BYTES each, a full palette (tag type, name length,
 * name, int per entry) and 64 KiB for the remaining structure. About 28 MiB for
 * 192 x 384 x 192 blocks; gunzip stops with an error as soon as the output gets larger.
 */
export const MAX_UNCOMPRESSED_BYTES =
  MAX_VOLUME * MAX_INDEX_VARINT_BYTES + MAX_PALETTE_SIZE * (1 + 2 + MAX_PALETTE_KEY_BYTES + 4) + 64 * 1024;

function child(compound: NbtTag | undefined, name: string): NbtTag | undefined {
  return compound?.type === TAG.Compound ? compound.value.get(name) : undefined;
}

function expectType<T extends NbtTag['type']>(
  tag: NbtTag | undefined,
  type: T,
  path: string,
  issues: string[],
): (NbtTag & { type: T }) | undefined {
  if (!tag) {
    issues.push(`${path} fehlt`);
    return undefined;
  }
  if (tag.type !== type) {
    issues.push(`${path} hat Tag-Typ ${tag.type}, erwartet ${type}`);
    return undefined;
  }
  return tag as NbtTag & { type: T };
}

/**
 * Independent read path for a written .schem: gunzip, parse with our own NBT reader,
 * check the Sponge v3 layout and tag types, decode every VarInt and – if an expected model
 * is given – compare every single block and the hash.
 */
export function validateSchematic(
  file: Uint8Array,
  options: { expected?: VoxelModel; profile?: CompatibilityProfile } = {},
): SchematicValidationReport {
  // Expected profile: explicit, else the expected model's target, else any supported profile.
  const expectedProfile =
    options.profile ?? (options.expected ? getProfileForVersion(options.expected.spec.targetMinecraftVersion) : undefined);
  const issues: string[] = [];
  const report: SchematicValidationReport = { ok: false, issues, compressedBytes: file.length, uncompressedBytes: 0 };

  let raw: Uint8Array;
  try {
    raw = gunzipSync(file, { maxOutputLength: MAX_UNCOMPRESSED_BYTES });
  } catch (error) {
    issues.push(`GZip-Dekompression fehlgeschlagen: ${(error as Error).message}`);
    return report;
  }
  report.uncompressedBytes = raw.length;

  let root;
  try {
    root = readNbt(raw);
  } catch (error) {
    issues.push(error instanceof NbtReadError ? error.message : `NBT nicht lesbar: ${(error as Error).message}`);
    return report;
  }
  if (root.name !== '') issues.push(`Root-Compound hat Namen "${root.name}", erwartet leeren Namen`);

  const schematic = expectType(root.tag.value.get('Schematic'), TAG.Compound, 'Schematic', issues);
  if (!schematic) return report;
  if (root.tag.value.size !== 1) issues.push(`Root enthält ${root.tag.value.size} Einträge, erwartet nur "Schematic"`);

  const version = expectType(child(schematic, 'Version'), TAG.Int, 'Schematic.Version', issues);
  if (version && version.value !== 3) issues.push(`Schematic.Version ist ${version.value}, erwartet 3`);
  const dataVersion = expectType(child(schematic, 'DataVersion'), TAG.Int, 'Schematic.DataVersion', issues);
  let profile: CompatibilityProfile | undefined;
  if (dataVersion) {
    profile = expectedProfile ?? PROFILES.find((p) => p.dataVersion === dataVersion.value);
    if (!profile) {
      issues.push(`DataVersion ${dataVersion.value} gehört zu keinem unterstützten Profil (${PROFILES.map((p) => `${p.minecraftVersion}=${p.dataVersion}`).join(', ')})`);
    } else if (dataVersion.value !== profile.dataVersion) {
      issues.push(`DataVersion ist ${dataVersion.value}, erwartet ${profile.dataVersion} (Minecraft ${profile.minecraftVersion})`);
    }
  }
  if (schematic.value.has('BlockData') || schematic.value.has('Palette')) {
    issues.push('Sponge-v2-Felder (BlockData/Palette direkt im Schematic) gefunden – v3 erwartet sie unter Blocks');
  }

  const w = expectType(child(schematic, 'Width'), TAG.Short, 'Schematic.Width', issues);
  const h = expectType(child(schematic, 'Height'), TAG.Short, 'Schematic.Height', issues);
  const l = expectType(child(schematic, 'Length'), TAG.Short, 'Schematic.Length', issues);
  if (!w || !h || !l || !version || !dataVersion || !profile) return report;
  const dimensions: Dimensions = { width: w.value & 0xffff, height: h.value & 0xffff, length: l.value & 0xffff };
  issues.push(...checkDimensions(dimensions));

  let offset: [number, number, number] = [0, 0, 0];
  const offsetTag = child(schematic, 'Offset');
  if (offsetTag) {
    const arr = expectType(offsetTag, TAG.IntArray, 'Schematic.Offset', issues);
    if (arr && arr.value.length !== 3) issues.push(`Schematic.Offset hat ${arr.value.length} Einträge, erwartet 3`);
    else if (arr) offset = [arr.value[0]!, arr.value[1]!, arr.value[2]!];
  }

  const metadata: Record<string, string> = {};
  const metaTag = child(schematic, 'Metadata');
  if (metaTag) {
    const meta = expectType(metaTag, TAG.Compound, 'Schematic.Metadata', issues);
    meta?.value.forEach((tag, key) => {
      if (tag.type === TAG.String) metadata[key] = tag.value;
    });
  }

  const blocks = expectType(child(schematic, 'Blocks'), TAG.Compound, 'Schematic.Blocks', issues);
  const paletteTag = expectType(child(blocks, 'Palette'), TAG.Compound, 'Schematic.Blocks.Palette', issues);
  const dataTag = expectType(child(blocks, 'Data'), TAG.ByteArray, 'Schematic.Blocks.Data', issues);
  const blockEntities = child(blocks, 'BlockEntities');
  if (blockEntities) {
    const list = expectType(blockEntities, TAG.List, 'Schematic.Blocks.BlockEntities', issues);
    if (list && list.value.length > 0 && list.elementType !== TAG.Compound) {
      issues.push('Schematic.Blocks.BlockEntities ist keine Liste von Compounds');
    }
  }
  if (!paletteTag || !dataTag || issues.length > 0) return report;

  // Palette: ids must be exactly 0..n-1, every key a valid registry block state.
  const paletteSize = paletteTag.value.size;
  if (paletteSize > MAX_PALETTE_SIZE) {
    issues.push(`Palette zu groß (${paletteSize} > ${MAX_PALETTE_SIZE})`);
    return report;
  }
  const palette = new Array<string | undefined>(paletteSize).fill(undefined);
  paletteTag.value.forEach((tag, state) => {
    if (tag.type !== TAG.Int) {
      issues.push(`Palette-Eintrag "${state}" ist kein TAG_Int`);
      return;
    }
    if (tag.value < 0 || tag.value >= paletteSize) {
      issues.push(`Palette-Id ${tag.value} für "${state}" außerhalb 0..${paletteSize - 1}`);
      return;
    }
    if (palette[tag.value] !== undefined) {
      issues.push(`Palette-Id ${tag.value} doppelt vergeben ("${palette[tag.value]}" und "${state}")`);
      return;
    }
    palette[tag.value] = state;
    const check = checkBlockState(state, profile.minecraftVersion);
    if (!check.ok) issues.push(`Palette: ${check.reason}`);
  });
  if (issues.length > 0) return report;
  const orderedPalette = palette as string[];

  const volume = dimensions.width * dimensions.height * dimensions.length;
  let values: Uint32Array;
  try {
    values = decodeVarIntArray(new Uint8Array(dataTag.value.buffer, dataTag.value.byteOffset, dataTag.value.byteLength), volume);
  } catch (error) {
    issues.push(error instanceof VarIntDecodeError ? error.message : String(error));
    return report;
  }
  const indices = new Uint16Array(volume);
  for (let i = 0; i < volume; i++) {
    const v = values[i]!;
    if (v >= paletteSize) {
      issues.push(`Blockdaten-Index ${v} an Position ${i} verweist auf keinen Paletteneintrag`);
      return report;
    }
    indices[i] = v;
  }

  const decoded: DecodedSchematic = {
    version: version.value,
    dataVersion: dataVersion.value,
    minecraftVersion: profile.minecraftVersion,
    dimensions,
    offset,
    palette: orderedPalette,
    indices,
    metadata,
    hash: computeVoxelHash(dimensions, orderedPalette, indices),
  };
  report.decoded = decoded;

  if (options.expected) compareWithModel(decoded, options.expected, issues);

  report.ok = issues.length === 0;
  return report;
}

function compareWithModel(decoded: DecodedSchematic, expected: VoxelModel, issues: string[]): void {
  const d = expected.dimensions;
  if (
    decoded.dimensions.width !== d.width ||
    decoded.dimensions.height !== d.height ||
    decoded.dimensions.length !== d.length
  ) {
    issues.push(
      `Maße ${decoded.dimensions.width}x${decoded.dimensions.height}x${decoded.dimensions.length} ≠ Modell ${d.width}x${d.height}x${d.length}`,
    );
    return;
  }
  // Map decoded palette ids to expected ids once and compare integers per block; whenever
  // the ids differ, fall back to comparing the block-state strings (the actual criterion).
  const expectedIds = new Map<string, number>();
  expected.palette.forEach((state, id) => {
    if (!expectedIds.has(state)) expectedIds.set(state, id);
  });
  const remap = Int32Array.from(decoded.palette, (state) => expectedIds.get(state) ?? -1);
  const volume = d.width * d.height * d.length;
  let mismatches = 0;
  let first = '';
  // Linear order x + width * (z + length * y) = y-, z-, x-loops, so "first" is unchanged.
  for (let i = 0; i < volume; i++) {
    const wantId = expected.indices[i];
    const gotId = decoded.indices[i]!;
    if (remap[gotId] === wantId) continue;
    const want = wantId === undefined ? undefined : expected.palette[wantId];
    const got = decoded.palette[gotId];
    if (want !== got) {
      if (mismatches === 0) {
        const x = i % d.width;
        const z = Math.floor(i / d.width) % d.length;
        const y = Math.floor(i / (d.width * d.length));
        first = `(${x}, ${y}, ${z}): erwartet ${want}, gelesen ${got}`;
      }
      mismatches++;
    }
  }
  if (mismatches > 0) issues.push(`${mismatches} Blöcke weichen ab, erster bei ${first}`);
  if (decoded.hash !== expected.hash) issues.push(`Hash ${decoded.hash} ≠ Modell-Hash ${expected.hash}`);
}
