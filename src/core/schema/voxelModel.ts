import { AIR, checkBlockState } from '@/core/blocks/registry';
import type { BuildSpec } from '@/core/schema/buildSpec';
import { sha256Hex, utf8 } from '@/lib/utils/hash';

/**
 * Canonical voxel model. Renderer, material list, persistence and the .schem encoder all
 * read this exact structure; nothing downstream invents geometry of its own.
 *
 * Coordinates: X = width, Y = height, Z = length (depth).
 * Linear index: x + width * (z + length * y)  (X runs fastest) – identical to Sponge v3.
 */
export interface Dimensions {
  width: number;
  height: number;
  length: number;
}

export interface VoxelModel {
  schemaVersion: 1;
  dimensions: Dimensions;
  /** Unique, full, canonical block-state strings. */
  palette: string[];
  /** One palette index per block, including air, in x + width * (z + length * y) order. */
  indices: Uint16Array;
  origin: { x: 0; y: 0; z: 0 };
  spec: BuildSpec;
  hash: string;
}

export const MAX_DIMENSIONS: Readonly<Dimensions> = { width: 48, height: 32, length: 48 };
export const MAX_VOLUME = MAX_DIMENSIONS.width * MAX_DIMENSIONS.height * MAX_DIMENSIONS.length;
/** Uint16 indices; the MVP registry is far below this anyway. */
export const MAX_PALETTE_SIZE = 1024;

export class VoxelModelError extends Error {
  readonly issues: string[];
  constructor(issues: string[]) {
    super(`Ungültiges Voxelmodell: ${issues.join('; ')}`);
    this.name = 'VoxelModelError';
    this.issues = issues;
  }
}

export function volumeOf(d: Dimensions): number {
  return d.width * d.height * d.length;
}

export function linearIndex(d: Dimensions, x: number, y: number, z: number): number {
  return x + d.width * (z + d.length * y);
}

export function isInside(d: Dimensions, x: number, y: number, z: number): boolean {
  return x >= 0 && y >= 0 && z >= 0 && x < d.width && y < d.height && z < d.length;
}

export function checkDimensions(d: Dimensions): string[] {
  const issues: string[] = [];
  for (const axis of ['width', 'height', 'length'] as const) {
    const value = d[axis];
    if (!Number.isInteger(value) || value < 1) issues.push(`${axis} muss eine positive Ganzzahl sein (ist ${value})`);
    else if (value > MAX_DIMENSIONS[axis]) issues.push(`${axis}=${value} überschreitet das Limit ${MAX_DIMENSIONS[axis]}`);
  }
  return issues;
}

/**
 * Stable identity hash over dimensions, palette and raw index data. Indices are hashed as
 * little-endian uint16 so the value is platform independent.
 */
export function computeVoxelHash(dimensions: Dimensions, palette: readonly string[], indices: Uint16Array): string {
  const header = utf8(
    `mcb-voxel-v1\n${dimensions.width}x${dimensions.height}x${dimensions.length}\n${palette.join('\n')}\n`,
  );
  const body = new Uint8Array(indices.length * 2);
  const view = new DataView(body.buffer);
  for (let i = 0; i < indices.length; i++) view.setUint16(i * 2, indices[i]!, true);
  const all = new Uint8Array(header.length + body.length);
  all.set(header, 0);
  all.set(body, header.length);
  return sha256Hex(all);
}

/**
 * Validates everything except the spec: dimensions and limits, palette syntax/registry,
 * uniqueness, index count and bounds, and (optionally) the hash.
 */
export function collectVoxelIssues(
  model: Pick<VoxelModel, 'dimensions' | 'palette' | 'indices' | 'hash'>,
  options: { verifyHash?: boolean } = {},
): string[] {
  const issues = checkDimensions(model.dimensions);
  if (issues.length > 0) return issues;

  if (model.palette.length === 0) issues.push('Palette ist leer');
  if (model.palette.length > MAX_PALETTE_SIZE) issues.push(`Palette zu groß (${model.palette.length} > ${MAX_PALETTE_SIZE})`);
  const seen = new Set<string>();
  for (const entry of model.palette) {
    if (seen.has(entry)) issues.push(`Doppelter Paletteneintrag: ${entry}`);
    seen.add(entry);
    const check = checkBlockState(entry);
    if (!check.ok) issues.push(check.reason);
  }

  const expected = volumeOf(model.dimensions);
  if (model.indices.length !== expected) {
    issues.push(`Indexanzahl ${model.indices.length} passt nicht zu width*height*length = ${expected}`);
  } else {
    for (let i = 0; i < model.indices.length; i++) {
      if (model.indices[i]! >= model.palette.length) {
        issues.push(`Index ${model.indices[i]} an Position ${i} liegt außerhalb der Palette (${model.palette.length})`);
        break;
      }
    }
  }

  if (issues.length === 0 && options.verifyHash !== false) {
    const actual = computeVoxelHash(model.dimensions, model.palette, model.indices);
    if (actual !== model.hash) issues.push(`Hash stimmt nicht (erwartet ${model.hash}, berechnet ${actual})`);
  }
  return issues;
}

export function assertValidVoxelModel(model: VoxelModel): void {
  const issues = collectVoxelIssues(model);
  if (issues.length > 0) throw new VoxelModelError(issues);
}

/**
 * Re-orders the palette into canonical form (air first, then by first occurrence in index
 * order) and drops unused entries, so equal block data always yields equal palette + hash.
 */
export function canonicalizeVoxelData(
  palette: readonly string[],
  indices: Uint16Array,
): { palette: string[]; indices: Uint16Array } {
  const remap = new Int32Array(palette.length).fill(-1);
  const out: string[] = [AIR];
  const airIndex = palette.indexOf(AIR);
  if (airIndex !== -1) remap[airIndex] = 0;
  const result = new Uint16Array(indices.length);
  for (let i = 0; i < indices.length; i++) {
    const old = indices[i]!;
    let mapped = remap[old]!;
    if (mapped === -1) {
      mapped = out.length;
      out.push(palette[old]!);
      remap[old] = mapped;
    }
    result[i] = mapped;
  }
  return { palette: out, indices: result };
}

export function createVoxelModel(
  spec: BuildSpec,
  dimensions: Dimensions,
  palette: readonly string[],
  indices: Uint16Array,
): VoxelModel {
  const canonical = canonicalizeVoxelData(palette, indices);
  const model: VoxelModel = {
    schemaVersion: 1,
    dimensions: { ...dimensions },
    palette: canonical.palette,
    indices: canonical.indices,
    origin: { x: 0, y: 0, z: 0 },
    spec,
    hash: computeVoxelHash(dimensions, canonical.palette, canonical.indices),
  };
  assertValidVoxelModel(model);
  return model;
}

export function blockAt(model: Pick<VoxelModel, 'dimensions' | 'palette' | 'indices'>, x: number, y: number, z: number): string {
  if (!isInside(model.dimensions, x, y, z)) return AIR;
  return model.palette[model.indices[linearIndex(model.dimensions, x, y, z)]!]!;
}
