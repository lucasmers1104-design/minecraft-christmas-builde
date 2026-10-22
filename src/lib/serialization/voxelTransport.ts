import { z } from 'zod';
import { buildSpecSchema } from '@/core/schema/buildSpec';
import { migrateSpecLike } from '@/core/schema/migrateSpec';
import {
  collectVoxelIssues,
  MAX_DIMENSIONS,
  MAX_PALETTE_SIZE,
  MAX_VOLUME,
  volumeOf,
  type VoxelModel,
} from '@/core/schema/voxelModel';
import { base64LengthFor, base64ToBytes, bytesToBase64 } from '@/lib/serialization/base64';

/**
 * JSON transport of a VoxelModel between API and browser (and for persistence).
 *
 * `indices` carries the Uint16 palette indices in x + width * (z + length * y) order in one
 * of two encodings:
 *
 * - `rle-varint-base64` (default for writing): runs of equal indices as pairs
 *   (palette index, run length), each an unsigned LEB128 VarInt (7 bits per byte, low
 *   group first, high bit = more bytes follow), concatenated and base64 encoded. Buildings
 *   are mostly air and long uniform rows, so this is far smaller than the raw form.
 * - `u16le-base64` (legacy, still read; also chosen automatically when RLE would be larger,
 *   i.e. for noise-like data): every index as little-endian uint16, base64 encoded.
 *
 * Because the encoder never emits RLE that is longer than the raw form, both encodings are
 * bounded by 2 bytes per block: at most MAX_VOLUME * 2 = 27 MiB raw / 36 MiB base64
 * (192 x 384 x 192). A realistic building at that size needs about 2.7 MiB as RLE.
 * The hash is always computed over the decoded indices, so it does not depend on the
 * encoding.
 */
export const INDEX_ENCODINGS = ['rle-varint-base64', 'u16le-base64'] as const;
export type IndexEncoding = (typeof INDEX_ENCODINGS)[number];
export const DEFAULT_INDEX_ENCODING: IndexEncoding = 'rle-varint-base64';
export const LEGACY_INDEX_ENCODING: IndexEncoding = 'u16le-base64';

export const MAX_PALETTE_ENTRY_LENGTH = 256;
export const MAX_INDICES_BASE64_LENGTH = base64LengthFor(MAX_VOLUME * 2);
/**
 * Upper bound for an export request body: the largest index payload, a full palette of
 * maximal entries as JSON (quotes and comma per entry) and 64 KiB for spec and structure.
 * About 37 MiB for the current limits. (No Next.js proxy is configured; if one is added,
 * `experimental.proxyClientMaxBodySize` must be at least this value.)
 */
export const MAX_TRANSPORT_REQUEST_BYTES =
  MAX_INDICES_BASE64_LENGTH + MAX_PALETTE_SIZE * (MAX_PALETTE_ENTRY_LENGTH + 3) + 64 * 1024;

const dimensionSchema = (max: number) => z.number().int().min(1).max(max);

export const voxelTransportSchema = z
  .object({
    schemaVersion: z.literal(1),
    dimensions: z
      .object({
        width: dimensionSchema(MAX_DIMENSIONS.width),
        height: dimensionSchema(MAX_DIMENSIONS.height),
        length: dimensionSchema(MAX_DIMENSIONS.length),
      })
      .strict()
      .refine((d) => volumeOf(d) <= MAX_VOLUME, {
        message: `Volumen width*height*length überschreitet das Limit ${MAX_VOLUME}`,
      }),
    palette: z.array(z.string().min(1).max(MAX_PALETTE_ENTRY_LENGTH)).min(1).max(MAX_PALETTE_SIZE),
    indexEncoding: z.enum(INDEX_ENCODINGS),
    indices: z.string().max(MAX_INDICES_BASE64_LENGTH),
    origin: z.object({ x: z.literal(0), y: z.literal(0), z: z.literal(0) }).strict(),
    // Old transports (saved before BuildSpec v2) carry a v1 spec; it is migrated before validation.
    spec: z.preprocess(migrateSpecLike, buildSpecSchema),
    hash: z.string().regex(/^[0-9a-f]{64}$/),
  })
  .strict();

export type VoxelTransport = z.infer<typeof voxelTransportSchema>;

export class TransportError extends Error {
  readonly issues: string[];
  constructor(issues: string[]) {
    super(`Ungültige Voxeldaten: ${issues.join('; ')}`);
    this.name = 'TransportError';
    this.issues = issues;
  }
}

// ---------------------------------------------------------------------------------------
// u16le-base64 (legacy)

export function encodeIndicesU16le(indices: Uint16Array): string {
  const bytes = new Uint8Array(indices.length * 2);
  for (let i = 0, o = 0; i < indices.length; i++, o += 2) {
    const v = indices[i]!;
    bytes[o] = v & 0xff;
    bytes[o + 1] = v >>> 8;
  }
  return bytesToBase64(bytes);
}

export function decodeIndicesU16le(base64: string, expectedCount: number): Uint16Array {
  // Checked before decoding, so nothing is allocated for a payload of the wrong size.
  const expectedLength = base64LengthFor(expectedCount * 2);
  if (base64.length !== expectedLength) {
    throw new TransportError([
      `Indexdaten haben ${base64.length} Base64-Zeichen, erwartet ${expectedLength} (${expectedCount * 2} Bytes)`,
    ]);
  }
  const bytes = base64ToBytes(base64);
  if (bytes.length !== expectedCount * 2) {
    throw new TransportError([`Indexdaten haben ${bytes.length} Bytes, erwartet ${expectedCount * 2}`]);
  }
  const out = new Uint16Array(expectedCount);
  for (let i = 0, o = 0; i < expectedCount; i++, o += 2) out[i] = bytes[o]! | (bytes[o + 1]! << 8);
  return out;
}

// ---------------------------------------------------------------------------------------
// rle-varint-base64

function varIntLength(value: number): number {
  return value < 0x80 ? 1 : value < 0x4000 ? 2 : value < 0x200000 ? 3 : value < 0x10000000 ? 4 : 5;
}

function writeVarInt(out: Uint8Array, pos: number, value: number): number {
  let v = value >>> 0;
  while (v >= 0x80) {
    out[pos++] = (v & 0x7f) | 0x80;
    v >>>= 7;
  }
  out[pos++] = v;
  return pos;
}

/** Exact byte length of the RLE form (computed without allocating it). */
export function rleByteLength(indices: Uint16Array): number {
  let bytes = 0;
  let i = 0;
  while (i < indices.length) {
    const value = indices[i]!;
    let j = i + 1;
    while (j < indices.length && indices[j] === value) j++;
    bytes += varIntLength(value) + varIntLength(j - i);
    i = j;
  }
  return bytes;
}

/** Raw RLE bytes: (value, runLength) VarInt pairs with maximal runs. */
export function encodeRleBytes(indices: Uint16Array, byteLength = rleByteLength(indices)): Uint8Array {
  const out = new Uint8Array(byteLength);
  let pos = 0;
  let i = 0;
  while (i < indices.length) {
    const value = indices[i]!;
    let j = i + 1;
    while (j < indices.length && indices[j] === value) j++;
    pos = writeVarInt(out, pos, value);
    pos = writeVarInt(out, pos, j - i);
    i = j;
  }
  return out;
}

export function encodeIndicesRle(indices: Uint16Array): string {
  return bytesToBase64(encodeRleBytes(indices));
}

function rleError(message: string): TransportError {
  return new TransportError([`Indexdaten (RLE): ${message}`]);
}

/**
 * Strict RLE decoder. The output is allocated once with `expectedCount` entries (already
 * bounded by the dimension limits); every run is checked against the remaining space
 * before it is expanded, so a malicious payload cannot make it allocate or fill beyond the
 * declared volume. Rejects truncated, overlong (> 5 bytes) or non-minimal VarInts,
 * zero-length runs, palette indices outside 0..paletteSize-1 and any total other than
 * exactly `expectedCount`.
 */
export function decodeIndicesRle(base64: string, expectedCount: number, paletteSize: number): Uint16Array {
  const bytes = base64ToBytes(base64);
  const out = new Uint16Array(expectedCount);
  let pos = 0;
  let filled = 0;
  let pair = 0;

  const readVarInt = (what: string): number => {
    let value = 0;
    let factor = 1;
    for (let n = 0; n < 5; n++) {
      if (pos >= bytes.length) throw rleError(`${what} von Lauf ${pair} ist abgeschnitten (Byte ${pos})`);
      const byte = bytes[pos++]!;
      if (n > 0 && byte === 0) throw rleError(`${what} von Lauf ${pair} ist nicht minimal kodiert (Byte ${pos - 1})`);
      value += (byte & 0x7f) * factor;
      if ((byte & 0x80) === 0) {
        if (value > 0xffffffff) throw rleError(`${what} von Lauf ${pair} überschreitet 32 Bit`);
        return value;
      }
      factor *= 128;
    }
    throw rleError(`${what} von Lauf ${pair} ist länger als 5 Bytes`);
  };

  while (pos < bytes.length) {
    const value = readVarInt('Wert');
    const run = readVarInt('Lauflänge');
    if (value >= paletteSize) {
      throw rleError(`Index ${value} in Lauf ${pair} liegt außerhalb der Palette (${paletteSize})`);
    }
    if (run === 0) throw rleError(`Lauf ${pair} hat die Länge 0`);
    if (run > expectedCount - filled) {
      throw rleError(`Lauf ${pair} (Länge ${run}) geht über width*height*length = ${expectedCount} hinaus`);
    }
    out.fill(value, filled, filled + run);
    filled += run;
    pair++;
  }
  if (filled !== expectedCount) throw rleError(`${filled} Blöcke dekodiert, erwartet ${expectedCount}`);
  return out;
}

// ---------------------------------------------------------------------------------------

export function encodeIndices(indices: Uint16Array, encoding: IndexEncoding = DEFAULT_INDEX_ENCODING): string {
  return encoding === 'rle-varint-base64' ? encodeIndicesRle(indices) : encodeIndicesU16le(indices);
}

export function decodeIndices(
  encoding: IndexEncoding,
  base64: string,
  expectedCount: number,
  paletteSize: number = MAX_PALETTE_SIZE,
): Uint16Array {
  return encoding === 'rle-varint-base64'
    ? decodeIndicesRle(base64, expectedCount, paletteSize)
    : decodeIndicesU16le(base64, expectedCount);
}

/**
 * Encodes index data for a transport. Without `forced`: RLE, unless the RLE form would be
 * larger than the raw u16le form (noise-like data); that keeps every transport within
 * 2 bytes per block. With `forced`, exactly that encoding is used.
 */
export function encodeIndexPayload(
  indices: Uint16Array,
  forced?: IndexEncoding,
): { indexEncoding: IndexEncoding; indices: string } {
  if (forced === 'u16le-base64') return { indexEncoding: forced, indices: encodeIndicesU16le(indices) };
  const rleBytes = rleByteLength(indices);
  if (forced === undefined && rleBytes > indices.length * 2) {
    return { indexEncoding: 'u16le-base64', indices: encodeIndicesU16le(indices) };
  }
  return { indexEncoding: 'rle-varint-base64', indices: bytesToBase64(encodeRleBytes(indices, rleBytes)) };
}

export interface EncodeTransportOptions {
  /** Forces one encoding (tests, legacy data). Default: see `encodeIndexPayload`. */
  indexEncoding?: IndexEncoding;
}

export function encodeVoxelTransport(model: VoxelModel, options: EncodeTransportOptions = {}): VoxelTransport {
  const { indexEncoding, indices } = encodeIndexPayload(model.indices, options.indexEncoding);
  return {
    schemaVersion: 1,
    dimensions: { ...model.dimensions },
    palette: [...model.palette],
    indexEncoding,
    indices,
    origin: { x: 0, y: 0, z: 0 },
    spec: model.spec,
    hash: model.hash,
  };
}

/** Validates shape, limits, encoding, registry, index bounds and hash. Never trusts the client. */
export function decodeVoxelTransport(input: unknown): VoxelModel {
  const parsed = voxelTransportSchema.safeParse(input);
  if (!parsed.success) {
    throw new TransportError(parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`));
  }
  const t = parsed.data;
  let indices: Uint16Array;
  try {
    indices = decodeIndices(t.indexEncoding, t.indices, volumeOf(t.dimensions), t.palette.length);
  } catch (error) {
    if (error instanceof TransportError) throw error;
    throw new TransportError([(error as Error).message]);
  }
  const model: VoxelModel = {
    schemaVersion: 1,
    dimensions: t.dimensions,
    palette: t.palette,
    indices,
    origin: { x: 0, y: 0, z: 0 },
    spec: t.spec,
    hash: t.hash,
  };
  // Blocks must exist in the model's target version (same rule as createVoxelModel).
  const issues = collectVoxelIssues(model, { minecraftVersion: t.spec.targetMinecraftVersion });
  if (issues.length > 0) throw new TransportError(issues);
  return model;
}
