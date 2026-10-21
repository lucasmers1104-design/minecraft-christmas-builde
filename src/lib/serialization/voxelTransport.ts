import { z } from 'zod';
import { buildSpecSchema } from '@/core/schema/buildSpec';
import {
  collectVoxelIssues,
  MAX_DIMENSIONS,
  MAX_PALETTE_SIZE,
  MAX_VOLUME,
  volumeOf,
  type VoxelModel,
} from '@/core/schema/voxelModel';
import { base64ToBytes, bytesToBase64 } from '@/lib/serialization/base64';

/**
 * JSON transport of a VoxelModel between API and browser (and for persistence).
 *
 * indices: the Uint16 palette indices in x + width * (z + length * y) order, written as
 * **little-endian** uint16 (2 bytes per block) and base64 encoded. For the MVP limit of
 * 48x32x48 blocks that is at most 147,456 bytes raw / 196,608 base64 characters.
 */
export const INDEX_ENCODING = 'u16le-base64' as const;
export const MAX_INDICES_BASE64_LENGTH = Math.ceil((MAX_VOLUME * 2) / 3) * 4;
/** Upper bound for an export request body (one transport model + JSON overhead). */
export const MAX_TRANSPORT_REQUEST_BYTES = 512 * 1024;

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
      .strict(),
    palette: z.array(z.string().min(1).max(256)).min(1).max(MAX_PALETTE_SIZE),
    indexEncoding: z.literal(INDEX_ENCODING),
    indices: z.string().max(MAX_INDICES_BASE64_LENGTH),
    origin: z.object({ x: z.literal(0), y: z.literal(0), z: z.literal(0) }).strict(),
    spec: buildSpecSchema,
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

export function encodeIndices(indices: Uint16Array): string {
  const bytes = new Uint8Array(indices.length * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < indices.length; i++) view.setUint16(i * 2, indices[i]!, true);
  return bytesToBase64(bytes);
}

export function decodeIndices(base64: string, expectedCount: number): Uint16Array {
  const bytes = base64ToBytes(base64);
  if (bytes.length !== expectedCount * 2) {
    throw new TransportError([`Indexdaten haben ${bytes.length} Bytes, erwartet ${expectedCount * 2}`]);
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out = new Uint16Array(expectedCount);
  for (let i = 0; i < expectedCount; i++) out[i] = view.getUint16(i * 2, true);
  return out;
}

export function encodeVoxelTransport(model: VoxelModel): VoxelTransport {
  return {
    schemaVersion: 1,
    dimensions: { ...model.dimensions },
    palette: [...model.palette],
    indexEncoding: INDEX_ENCODING,
    indices: encodeIndices(model.indices),
    origin: { x: 0, y: 0, z: 0 },
    spec: model.spec,
    hash: model.hash,
  };
}

/** Validates shape, limits, registry, index bounds and hash. Never trusts the client. */
export function decodeVoxelTransport(input: unknown): VoxelModel {
  const parsed = voxelTransportSchema.safeParse(input);
  if (!parsed.success) {
    throw new TransportError(parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`));
  }
  const t = parsed.data;
  let indices: Uint16Array;
  try {
    indices = decodeIndices(t.indices, volumeOf(t.dimensions));
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
  const issues = collectVoxelIssues(model);
  if (issues.length > 0) throw new TransportError(issues);
  return model;
}
