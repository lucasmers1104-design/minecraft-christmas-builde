import { buildVoxelMesh, type MeshBuffers } from '@/components/preview/buildVoxelMesh';
import type { Dimensions } from '@/core/schema/voxelModel';
import { meshTexturedModel, type MeshRegion, type PreparedBlock, type TexturedBuffers } from '@/core/textures/texturedMesh';

/**
 * Chunked meshing for the preview (pure, no three.js, no DOM): the model is split into cubes of
 * CHUNK_SIZE³ cells that are meshed independently (in a web worker, or in slices on the main
 * thread). Every chunk mesh still reads its neighbours across the chunk border, so all chunks
 * together give exactly the mesh of the whole model, and an edit only invalidates the chunks
 * around the changed cells. The layer cut is part of a chunk's key: chunks far below the cut
 * keep their mesh when the layer slider moves.
 */

export const CHUNK_SIZE = 32;

export interface ChunkGrid {
  size: number;
  nx: number;
  ny: number;
  nz: number;
  count: number;
}

export function chunkGrid(d: Dimensions, size = CHUNK_SIZE): ChunkGrid {
  const nx = Math.ceil(d.width / size);
  const ny = Math.ceil(d.height / size);
  const nz = Math.ceil(d.length / size);
  return { size, nx, ny, nz, count: nx * ny * nz };
}

export function chunkIndex(grid: ChunkGrid, cx: number, cy: number, cz: number): number {
  return cx + grid.nx * (cz + grid.nz * cy);
}

export function chunkRegion(grid: ChunkGrid, index: number): MeshRegion {
  const cx = index % grid.nx;
  const cz = Math.floor(index / grid.nx) % grid.nz;
  const cy = Math.floor(index / (grid.nx * grid.nz));
  const s = grid.size;
  return { x0: cx * s, y0: cy * s, z0: cz * s, x1: (cx + 1) * s, y1: (cy + 1) * s, z1: (cz + 1) * s };
}

/**
 * What the layer cut means for each chunk: -1 = not affected (same mesh as without cut),
 * 0 = completely above the cut (empty), otherwise the cut height (y < cut stays visible).
 */
export function chunkCuts(grid: ChunkGrid, height: number, maxY: number | null): Int32Array {
  const cuts = new Int32Array(grid.count);
  const cut = maxY === null ? height : Math.max(0, Math.min(height, maxY + 1));
  for (let i = 0; i < grid.count; i++) {
    const { y0, y1 } = chunkRegion(grid, i);
    const top = Math.min(height, y1);
    // The top row of a chunk also depends on the row above it (culling).
    if (cut >= height || cut >= top + 1) cuts[i] = -1;
    else if (cut <= y0) cuts[i] = 0;
    else cuts[i] = cut;
  }
  return cuts;
}

export interface BlockData {
  palette: readonly string[];
  indices: Uint16Array;
}

/**
 * Flags the chunks whose mesh can differ between two models of the same size: chunks with a
 * changed cell, plus the face-adjacent chunk when the cell lies on a chunk border (culling of
 * the neighbour's faces). Compares block states, not palette indices, because a re-hashed
 * model may renumber its palette.
 */
export function changedChunks(before: BlockData, after: BlockData, dims: Dimensions, grid: ChunkGrid): Uint8Array {
  const dirty = new Uint8Array(grid.count);
  if (before.indices === after.indices && before.palette === after.palette) return dirty;
  const lookup = new Map(after.palette.map((s, i) => [s, i]));
  const map = new Int32Array(before.palette.length);
  before.palette.forEach((s, i) => (map[i] = lookup.get(s) ?? -1));
  const { width, length, height } = dims;
  const s = grid.size;
  const a = before.indices;
  const b = after.indices;
  const mark = (x: number, y: number, z: number) => {
    if (x < 0 || y < 0 || z < 0 || x >= width || y >= height || z >= length) return;
    dirty[chunkIndex(grid, Math.floor(x / s), Math.floor(y / s), Math.floor(z / s))] = 1;
  };
  for (let i = 0; i < b.length; i++) {
    if (map[a[i]!] === b[i]) continue;
    const x = i % width;
    const z = Math.floor(i / width) % length;
    const y = Math.floor(i / (width * length));
    mark(x, y, z);
    if (x % s === 0) mark(x - 1, y, z);
    if (x % s === s - 1) mark(x + 1, y, z);
    if (y % s === 0) mark(x, y - 1, z);
    if (y % s === s - 1) mark(x, y + 1, z);
    if (z % s === 0) mark(x, y, z - 1);
    if (z % s === s - 1) mark(x, y, z + 1);
  }
  return dirty;
}

/** Render buckets: colour preview (opaque, emissive, translucent) and textured preview. */
export type PartBucket = 'opaque' | 'emissive' | 'translucent' | 'tex-solid' | 'tex-cutout' | 'tex-translucent';

export interface ChunkPart {
  bucket: PartBucket;
  positions: Float32Array;
  /** Colour preview only. */
  normals: Float32Array | null;
  /** Textured preview only. */
  uvs: Float32Array | null;
  /** Linear vertex colours as normalised bytes. */
  colors: Uint8Array;
  colorSize: 3 | 4;
  indices: Uint16Array | Uint32Array;
  faceCount: number;
  /** Linear block index per quad, for picking. */
  faceCells: Int32Array;
}

export interface ChunkMesh {
  chunk: number;
  /** Layer cut this mesh was built for (see chunkCuts). */
  cut: number;
  faceCount: number;
  parts: ChunkPart[];
}

export interface MeshInput {
  dimensions: Dimensions;
  palette: readonly string[];
  indices: Uint16Array;
  maxY: number | null;
  /** Textured preview: prepared palette entries; null = colour preview. */
  prepared: readonly PreparedBlock[] | null;
}

function colorPart(bucket: PartBucket, b: MeshBuffers, colorSize: 3 | 4): ChunkPart {
  return { bucket, positions: b.positions, normals: b.normals, uvs: null, colors: b.colors, colorSize, indices: b.indices, faceCount: b.faceCount, faceCells: b.faceCells };
}

function texturedPart(bucket: PartBucket, b: TexturedBuffers): ChunkPart {
  return { bucket, positions: b.positions, normals: null, uvs: b.uvs, colors: b.colors, colorSize: 3, indices: b.indices, faceCount: b.faceCount, faceCells: b.faceCells };
}

/** Meshes one chunk (colour or textured, depending on the input). */
export function meshChunk(input: MeshInput, grid: ChunkGrid, chunk: number, cut: number): ChunkMesh {
  const options = { region: chunkRegion(grid, chunk), ...(input.maxY === null ? {} : { maxY: input.maxY }) };
  const parts: ChunkPart[] = [];
  if (input.prepared) {
    const mesh = meshTexturedModel(input, input.prepared, options);
    parts.push(texturedPart('tex-solid', mesh.solid), texturedPart('tex-cutout', mesh.cutout), texturedPart('tex-translucent', mesh.translucent));
  } else {
    const mesh = buildVoxelMesh(input, options);
    parts.push(colorPart('opaque', mesh.opaque, 3), colorPart('emissive', mesh.emissive, 3), colorPart('translucent', mesh.translucent, 4));
  }
  const nonEmpty = parts.filter((p) => p.faceCount > 0);
  return { chunk, cut, faceCount: nonEmpty.reduce((n, p) => n + p.faceCount, 0), parts: nonEmpty };
}

/** The buffers of chunk meshes, for a zero-copy postMessage. */
export function chunkTransferables(meshes: readonly ChunkMesh[]): ArrayBuffer[] {
  const out = new Set<ArrayBuffer>();
  for (const m of meshes)
    for (const p of m.parts) {
      for (const a of [p.positions, p.normals, p.uvs, p.colors, p.indices, p.faceCells]) {
        if (a && a.buffer instanceof ArrayBuffer && a.buffer.byteLength > 0) out.add(a.buffer);
      }
    }
  return [...out];
}

/** Meshes the whole model chunk by chunk (synchronously; used by tests and measurements). */
export function meshAllChunks(input: MeshInput, grid = chunkGrid(input.dimensions)): ChunkMesh[] {
  const cuts = chunkCuts(grid, input.dimensions.height, input.maxY);
  const out: ChunkMesh[] = [];
  for (let c = 0; c < grid.count; c++) if (cuts[c] !== 0) out.push(meshChunk(input, grid, c, cuts[c]!));
  return out;
}
