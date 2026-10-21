import { gzipSync } from 'node:zlib';
import * as nbt from 'prismarine-nbt';
import { getProfileForVersion, type CompatibilityProfile } from '@/core/compat/profile';
import { encodeVarIntArray } from '@/core/export/encodeVarInt';
import { collectVoxelIssues, type VoxelModel } from '@/core/schema/voxelModel';

export class SchematicExportError extends Error {
  readonly issues: string[];
  constructor(issues: string[]) {
    super(`Export verweigert: ${issues.join('; ')}`);
    this.name = 'SchematicExportError';
    this.issues = issues;
  }
}

export const SCHEMATIC_AUTHOR = 'Minecraft Christmas Builder';

const SCHEMATIC_NAMES: Record<VoxelModel['spec']['kind'], string> = {
  house: 'Weihnachtshaus',
  tree: 'Weihnachtsbaum',
  market_stall: 'Weihnachtsmarktstand',
  station: 'Winterbahnhof',
};

type Tag = nbt.Tags[nbt.TagType];

const int = (value: number): Tag => ({ type: 'int', value }) as Tag;
const short = (value: number): Tag => ({ type: 'short', value }) as Tag;

/**
 * prismarine-nbt writes standard UTF-8, Java reads "modified UTF-8". Both are identical for
 * BMP characters except U+0000, so anything else is rejected instead of producing a file
 * WorldEdit cannot open (verified with the WorldEdit harness: a 4-byte emoji breaks it).
 */
export function nbtString(value: string): Tag {
  for (const ch of value) {
    const code = ch.codePointAt(0)!;
    if (code === 0 || code > 0xffff) throw new SchematicExportError([`Zeichen U+${code.toString(16)} ist in NBT-Strings nicht erlaubt`]);
  }
  return { type: 'string', value } as Tag;
}
const compound = (value: Record<string, Tag>): Tag => ({ type: 'compound', value }) as Tag;

/** Builds the NBT tree exactly as laid out by the Sponge Schematic v3 specification. */
export function buildSpongeV3Nbt(model: VoxelModel, requestedProfile?: CompatibilityProfile): nbt.NBT {
  const issues = collectVoxelIssues(model);
  const profile = requestedProfile ?? getProfileForVersion(model.spec.targetMinecraftVersion);
  if (!profile) throw new SchematicExportError([`Kein Exportprofil für Minecraft ${model.spec.targetMinecraftVersion}`]);
  if (model.spec.targetMinecraftVersion !== profile.minecraftVersion) {
    issues.push(
      `Modell zielt auf Minecraft ${model.spec.targetMinecraftVersion}, Exportprofil ist ${profile.minecraftVersion}`,
    );
  }
  if (issues.length > 0) throw new SchematicExportError(issues);

  const palette: Record<string, Tag> = {};
  model.palette.forEach((state, index) => {
    palette[state] = int(index);
  });

  const varints = encodeVarIntArray(model.indices);
  // TAG_Byte_Array holds signed Java bytes.
  const data = Array.from(varints, (b) => (b > 127 ? b - 256 : b));

  const { width, height, length } = model.dimensions;
  const schematic = compound({
    Version: int(profile.schematicVersion),
    DataVersion: int(profile.dataVersion),
    Metadata: compound({
      Name: nbtString(`${SCHEMATIC_NAMES[model.spec.kind]} (Seed ${model.spec.seed})`),
      Author: nbtString(SCHEMATIC_AUTHOR),
      MCBVoxelHash: nbtString(model.hash),
      MCBMinecraftVersion: nbtString(profile.minecraftVersion),
    }),
    // unsigned short in the spec, stored in TAG_Short; our limits are far below 32767.
    Width: short(width),
    Height: short(height),
    Length: short(length),
    Offset: { type: 'intArray', value: [0, 0, 0] } as Tag,
    Blocks: compound({
      Palette: compound(palette),
      Data: { type: 'byteArray', value: data } as Tag,
      BlockEntities: { type: 'list', value: { type: 'compound', value: [] } } as Tag,
    }),
  });

  return { type: 'compound', name: '', value: { Schematic: schematic } } as nbt.NBT;
}

/** Serialises big-endian NBT and gzips it. Throws SchematicExportError for invalid models. */
export function writeSpongeV3(model: VoxelModel, profile?: CompatibilityProfile): Buffer {
  const root = buildSpongeV3Nbt(model, profile);
  const raw = nbt.writeUncompressed(root, 'big');
  return gzipSync(raw, { level: 9 });
}
