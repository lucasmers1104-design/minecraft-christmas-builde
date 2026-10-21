import { renderInfoFor, type RenderKind } from '@/core/blocks/registry';
import { linearIndex, type VoxelModel } from '@/core/schema/voxelModel';

/**
 * Turns the canonical VoxelModel into face buffers for the preview. Pure function (no
 * three.js), so face culling is unit-testable. Only faces between a block and a
 * non-occluding neighbour are emitted; air blocks never produce geometry.
 */
export interface MeshBuffers {
  positions: Float32Array;
  normals: Float32Array;
  /** RGB (opaque/emissive) or RGBA (translucent), linear colour space. */
  colors: Float32Array;
  indices: Uint32Array;
  faceCount: number;
  /** Linear block index for every face (2 triangles each), used for click picking. */
  faceCells: Int32Array;
}

export interface VoxelMesh {
  opaque: MeshBuffers;
  emissive: MeshBuffers;
  translucent: MeshBuffers;
  faceCount: number;
}

interface FaceDef {
  dir: [number, number, number];
  corners: [number, number, number][];
  /** Baked directional shade so faces stay readable even with flat lighting. */
  shade: number;
}

const FACES: FaceDef[] = [
  { dir: [1, 0, 0], corners: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], shade: 0.86 },
  { dir: [-1, 0, 0], corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], shade: 0.86 },
  { dir: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], shade: 1 },
  { dir: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], shade: 0.6 },
  { dir: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], shade: 0.93 },
  { dir: [0, 0, -1], corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], shade: 0.93 },
];

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function hexToLinear(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [srgbToLinear(((n >> 16) & 255) / 255), srgbToLinear(((n >> 8) & 255) / 255), srgbToLinear((n & 255) / 255)];
}

/** Height of flat blocks (rails) in the preview. */
export const FLAT_HEIGHT = 1 / 16;

class BufferBuilder {
  positions: number[] = [];
  normals: number[] = [];
  colors: number[] = [];
  indices: number[] = [];
  faceCells: number[] = [];
  faceCount = 0;
  constructor(private readonly withAlpha: boolean) {}

  addFace(
    x: number,
    y: number,
    z: number,
    face: FaceDef,
    rgb: [number, number, number],
    alpha: number,
    cell: number,
    yScale = 1,
  ): void {
    const base = this.positions.length / 3;
    for (const [cx, cy, cz] of face.corners) {
      this.positions.push(x + cx, y + cy * yScale, z + cz);
      this.normals.push(...face.dir);
      this.colors.push(rgb[0] * face.shade, rgb[1] * face.shade, rgb[2] * face.shade);
      if (this.withAlpha) this.colors.push(alpha);
    }
    this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    this.faceCells.push(cell);
    this.faceCount++;
  }

  build(): MeshBuffers {
    return {
      positions: Float32Array.from(this.positions),
      normals: Float32Array.from(this.normals),
      colors: Float32Array.from(this.colors),
      indices: Uint32Array.from(this.indices),
      faceCount: this.faceCount,
      faceCells: Int32Array.from(this.faceCells),
    };
  }
}

function occludes(kind: RenderKind, flat: boolean): boolean {
  return !flat && (kind === 'opaque' || kind === 'emissive');
}

export interface MeshOptions {
  /** Layer view: blocks above this y are hidden (treated like air for rendering only). */
  maxY?: number;
}

export function buildVoxelMesh(model: Pick<VoxelModel, 'dimensions' | 'palette' | 'indices'>, options: MeshOptions = {}): VoxelMesh {
  const { width, length } = model.dimensions;
  const height = Math.min(model.dimensions.height, options.maxY === undefined ? Infinity : options.maxY + 1);
  const info = model.palette.map((state) => {
    const render = renderInfoFor(state);
    return { kind: render.kind, rgb: hexToLinear(render.color), alpha: render.opacity ?? 1, flat: render.shape === 'flat' };
  });
  const kindAt = (x: number, y: number, z: number): RenderKind => {
    if (x < 0 || y < 0 || z < 0 || x >= width || y >= height || z >= length) return 'none';
    return info[model.indices[linearIndex(model.dimensions, x, y, z)]!]!.kind;
  };
  const occluderAt = (x: number, y: number, z: number): boolean => {
    if (x < 0 || y < 0 || z < 0 || x >= width || y >= height || z >= length) return false;
    const b = info[model.indices[linearIndex(model.dimensions, x, y, z)]!]!;
    return occludes(b.kind, b.flat);
  };
  const stateAt = (x: number, y: number, z: number): number =>
    model.indices[linearIndex(model.dimensions, x, y, z)]!;

  const opaque = new BufferBuilder(false);
  const emissive = new BufferBuilder(false);
  const translucent = new BufferBuilder(true);

  for (let y = 0; y < height; y++)
    for (let z = 0; z < length; z++)
      for (let x = 0; x < width; x++) {
        const index = stateAt(x, y, z);
        const block = info[index]!;
        if (block.kind === 'none') continue;
        const cell = linearIndex(model.dimensions, x, y, z);
        for (const face of FACES) {
          const nx = x + face.dir[0];
          const ny = y + face.dir[1];
          const nz = z + face.dir[2];
          if (block.flat) {
            // Thin plate: only the bottom can be hidden by a solid block below.
            if (face.dir[1] === -1 && occluderAt(nx, ny, nz)) continue;
            opaque.addFace(x, y, z, face, block.rgb, 1, cell, FLAT_HEIGHT);
            continue;
          }
          if (block.kind === 'translucent') {
            // Hide faces against solid blocks and between identical glass blocks.
            if (occluderAt(nx, ny, nz)) continue;
            if (kindAt(nx, ny, nz) === 'translucent' && stateAt(nx, ny, nz) === index) continue;
            translucent.addFace(x, y, z, face, block.rgb, block.alpha, cell);
          } else {
            if (occluderAt(nx, ny, nz)) continue;
            (block.kind === 'emissive' ? emissive : opaque).addFace(x, y, z, face, block.rgb, 1, cell);
          }
        }
      }

  const result = { opaque: opaque.build(), emissive: emissive.build(), translucent: translucent.build() };
  return { ...result, faceCount: result.opaque.faceCount + result.emissive.faceCount + result.translucent.faceCount };
}
