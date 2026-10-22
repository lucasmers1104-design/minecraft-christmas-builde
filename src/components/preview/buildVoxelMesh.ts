import { isFaceFull } from '@/core/blocks/faces';
import { AIR, definitionOf, propsOf, type RenderKind } from '@/core/blocks/registry';
import { SHAPES, type Box, type Tone } from '@/core/blocks/shapes';
import { linearIndex, type VoxelModel } from '@/core/schema/voxelModel';
import type { Direction } from '@/core/blocks/directions';
import {
  clampRegion,
  HORIZONTAL_DIRECTION_BITS,
  MESH_DIRECTIONS,
  neighbourStrides,
  OPPOSITE_DIRECTION_INDEX,
  quadIndices,
  readNeighbours,
  resized,
  type MeshOptions,
} from '@/core/textures/texturedMesh';

export type { MeshOptions, MeshRegion } from '@/core/textures/texturedMesh';

/**
 * Colour preview without Minecraft textures. Pure function (no three.js), so culling is
 * unit-testable. Every block is drawn from its shape geometry (src/core/blocks/shapes.ts):
 * stairs as two boxes, slabs as half blocks, fences as posts with rails, panes as thin plates,
 * lanterns small and glowing, … A box face on the block boundary is hidden when the
 * neighbour's touching face is full and opaque; air blocks never produce geometry. Like the
 * textured mesher it works on regions, so models can be meshed chunk by chunk.
 */
export interface MeshBuffers {
  positions: Float32Array;
  normals: Float32Array;
  /** RGB (opaque/emissive) or RGBA (translucent), linear colour space, normalised bytes (255 = 1.0). */
  colors: Uint8Array;
  indices: Uint16Array | Uint32Array;
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

/** Baked directional shade so faces stay readable even with flat lighting (MESH_DIRECTIONS order). */
const SHADE = [0.6, 1, 0.93, 0.93, 0.86, 0.86];
const NORMALS: readonly (readonly [number, number, number])[] = [
  [0, -1, 0],
  [0, 1, 0],
  [0, 0, -1],
  [0, 0, 1],
  [-1, 0, 0],
  [1, 0, 0],
];

/** Four corners (counter-clockwise seen from outside) of a box face, in block units. */
function corners(b: Box, dir: Direction): number[] {
  const [x0, y0, z0, x1, y1, z1] = b.map((v) => v / 16) as [number, number, number, number, number, number];
  switch (dir) {
    case 'east':
      return [x1, y0, z1, x1, y0, z0, x1, y1, z0, x1, y1, z1];
    case 'west':
      return [x0, y0, z0, x0, y0, z1, x0, y1, z1, x0, y1, z0];
    case 'up':
      return [x0, y1, z1, x1, y1, z1, x1, y1, z0, x0, y1, z0];
    case 'down':
      return [x0, y0, z0, x1, y0, z0, x1, y0, z1, x0, y0, z1];
    case 'south':
      return [x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1];
    case 'north':
      return [x1, y0, z0, x0, y0, z0, x0, y1, z0, x1, y1, z0];
  }
}

/** True if the box face lies on the block boundary in direction `dir`. */
function onBoundary(b: Box, dir: Direction): boolean {
  switch (dir) {
    case 'east':
      return b[3] >= 16;
    case 'west':
      return b[0] <= 0;
    case 'up':
      return b[4] >= 16;
    case 'down':
      return b[1] <= 0;
    case 'south':
      return b[5] >= 16;
    case 'north':
      return b[2] <= 0;
  }
}

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function hexToLinear(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [srgbToLinear(((n >> 16) & 255) / 255), srgbToLinear(((n >> 8) & 255) / 255), srgbToLinear((n & 255) / 255)];
}

const TONE_COLORS: Partial<Record<Tone, [number, number, number]>> = {
  glow: hexToLinear('#ffd27a'),
  fire: hexToLinear('#ff9a3c'),
  metal: hexToLinear('#3b4148'),
  dark: hexToLinear('#4a3426'),
};

/** Height of flat blocks (rails, carpets) in the preview, in block units. */
export const FLAT_HEIGHT = 1 / 16;

/** Buckets of the colour mesh: 0 = opaque (lit), 1 = emissive (unlit), 2 = translucent. */
type Bucket = 0 | 1 | 2;

/** One palette entry, prepared for meshing: all box faces with corners, colour and bucket. */
interface ColorBlock {
  blockId: string;
  faceCount: number;
  /** 12 floats per face (block units). */
  corners: Float32Array;
  /** MESH_DIRECTIONS index per face. */
  dirs: Int8Array;
  /** 1 if the face lies on the block boundary (it can be hidden by the neighbour). */
  boundary: Uint8Array;
  /** Shaded linear RGB + alpha per face, normalised bytes. */
  colors: Uint8Array;
  buckets: Uint8Array;
  /** Bit per direction: full opaque face there, hides the neighbour's touching face. */
  occludes: number;
  /** Identical glass blocks merge into one pane of glass. */
  cullsSame: boolean;
  /** Panes and bars: bit per connected horizontal direction; -1 otherwise. */
  paneConnections: number;
}

const EMPTY_BLOCK: ColorBlock = {
  blockId: AIR,
  faceCount: 0,
  corners: new Float32Array(0),
  dirs: new Int8Array(0),
  boundary: new Uint8Array(0),
  colors: new Uint8Array(0),
  buckets: new Uint8Array(0),
  occludes: 0,
  cullsSame: false,
  paneConnections: -1,
};

function prepareColorBlock(state: string): ColorBlock {
  if (state === AIR) return EMPTY_BLOCK;
  const def = definitionOf(state);
  const spec = SHAPES[def.shape];
  const kind: RenderKind = def.render.kind;
  if (kind === 'none') return EMPTY_BLOCK;
  const props = propsOf(state);
  const rgb = hexToLinear(def.render.color);
  const alpha = def.render.opacity ?? 1;
  const faces: { corners: number[]; dir: number; boundary: boolean; color: [number, number, number, number]; bucket: Bucket }[] = [];
  for (const { box, tone } of spec.boxes(props)) {
    const toneRgb = tone ? TONE_COLORS[tone] : undefined;
    const glowing = kind === 'emissive' || tone === 'glow' || tone === 'fire';
    const bucket: Bucket = kind === 'translucent' ? 2 : glowing ? 1 : 0;
    const base = toneRgb ?? rgb;
    MESH_DIRECTIONS.forEach((dir, d) => {
      const shade = SHADE[d]!;
      faces.push({
        corners: corners(box, dir),
        dir: d,
        boundary: onBoundary(box, dir),
        color: [base[0] * shade, base[1] * shade, base[2] * shade, alpha].map((c) => Math.round(Math.min(1, c) * 255)) as [number, number, number, number],
        bucket,
      });
    });
  }
  const solid = kind === 'opaque' || kind === 'emissive' || kind === 'cutout';
  let occludes = 0;
  // Leaves and glass never hide neighbours (like the game's fancy leaves).
  if (solid && def.shape !== 'leaves') {
    MESH_DIRECTIONS.forEach((dir, d) => {
      if (isFaceFull(state, dir, 'collision')) occludes |= 1 << d;
    });
  }
  let paneConnections = -1;
  if (def.shape === 'pane') {
    paneConnections = 0;
    for (let d = 2; d < 6; d++) if (props[MESH_DIRECTIONS[d]!] === 'true') paneConnections |= 1 << d;
  }
  const n = faces.length;
  const block: ColorBlock = {
    blockId: def.id,
    faceCount: n,
    corners: new Float32Array(n * 12),
    dirs: new Int8Array(n),
    boundary: new Uint8Array(n),
    colors: new Uint8Array(n * 4),
    buckets: new Uint8Array(n),
    occludes,
    cullsSame: kind === 'translucent' && spec.fullCube === true,
    paneConnections,
  };
  faces.forEach((f, i) => {
    block.corners.set(f.corners, i * 12);
    block.dirs[i] = f.dir;
    block.boundary[i] = f.boundary ? 1 : 0;
    block.colors.set(f.color, i * 4);
    block.buckets[i] = f.bucket;
  });
  return block;
}

class ColorBuilder {
  private positions = new Float32Array(0);
  private normals = new Float32Array(0);
  private colors = new Uint8Array(0);
  private cells = new Int32Array(0);
  private capacity = 0;
  private count = 0;
  private readonly colorSize: 3 | 4;

  constructor(withAlpha: boolean) {
    this.colorSize = withAlpha ? 4 : 3;
  }

  private grow(): void {
    this.capacity = Math.max(256, this.capacity * 2);
    this.positions = resized(this.positions, this.capacity * 12);
    this.normals = resized(this.normals, this.capacity * 12);
    this.colors = resized(this.colors, this.capacity * 4 * this.colorSize);
    this.cells = resized(this.cells, this.capacity);
  }

  add(block: ColorBlock, f: number, x: number, y: number, z: number, cell: number): void {
    if (this.count === this.capacity) this.grow();
    const n = this.count;
    const pd = n * 12;
    const ps = f * 12;
    const src = block.corners;
    const p = this.positions;
    for (let v = 0; v < 12; v += 3) {
      p[pd + v] = x + src[ps + v]!;
      p[pd + v + 1] = y + src[ps + v + 1]!;
      p[pd + v + 2] = z + src[ps + v + 2]!;
    }
    const [nx, ny, nz] = NORMALS[block.dirs[f]!]!;
    const nn = this.normals;
    for (let v = pd; v < pd + 12; v += 3) {
      nn[v] = nx;
      nn[v + 1] = ny;
      nn[v + 2] = nz;
    }
    const size = this.colorSize;
    const c = this.colors;
    const cs = f * 4;
    for (let v = 0, cd = n * 4 * size; v < 4; v++, cd += size) {
      c[cd] = block.colors[cs]!;
      c[cd + 1] = block.colors[cs + 1]!;
      c[cd + 2] = block.colors[cs + 2]!;
      if (size === 4) c[cd + 3] = block.colors[cs + 3]!;
    }
    this.cells[n] = cell;
    this.count = n + 1;
  }

  build(): MeshBuffers {
    const n = this.count;
    return {
      positions: this.positions.slice(0, n * 12),
      normals: this.normals.slice(0, n * 12),
      colors: this.colors.slice(0, n * 4 * this.colorSize),
      indices: quadIndices(n),
      faceCount: n,
      faceCells: this.cells.slice(0, n),
    };
  }
}

const PREPARED = new Map<string, ColorBlock>();

function colorBlockFor(state: string): ColorBlock {
  let block = PREPARED.get(state);
  if (!block) {
    block = prepareColorBlock(state);
    PREPARED.set(state, block);
  }
  return block;
}

export function buildVoxelMesh(
  model: Pick<VoxelModel, 'dimensions' | 'indices'> & { palette: readonly string[] },
  options: MeshOptions = {},
): VoxelMesh {
  const info = model.palette.map(colorBlockFor);
  const builders = [new ColorBuilder(false), new ColorBuilder(false), new ColorBuilder(true)] as const;
  const clamped = clampRegion(model.dimensions, options);
  if (clamped) {
    const { region, height } = clamped;
    const { width, length } = model.dimensions;
    const indices = model.indices;
    const strides = neighbourStrides(width, length);
    const neighbours = new Int32Array(6);
    for (let y = region.y0; y < region.y1; y++)
      for (let z = region.z0; z < region.z1; z++) {
        let cell = linearIndex(model.dimensions, region.x0, y, z);
        for (let x = region.x0; x < region.x1; x++, cell++) {
          const index = indices[cell]!;
          const block = info[index];
          if (!block || block.faceCount === 0) continue;
          let read = false;
          for (let f = 0; f < block.faceCount; f++) {
            if (block.boundary[f]) {
              if (!read) {
                readNeighbours(neighbours, indices, cell, x, y, z, width, length, height, strides);
                read = true;
              }
              const d = block.dirs[f]!;
              const n = neighbours[d]!;
              const other = n >= 0 ? info[n] : undefined;
              if (other) {
                if (other.occludes & (1 << OPPOSITE_DIRECTION_INDEX[d]!)) continue;
                if (block.cullsSame && n === index) continue;
                // Same pane block above/below, or two panes connected to each other (vanilla IronBarsBlock).
                if (block.paneConnections >= 0 && other.blockId === block.blockId) {
                  if (((1 << d) & HORIZONTAL_DIRECTION_BITS) === 0) continue;
                  if (block.paneConnections & (1 << d) && other.paneConnections & (1 << OPPOSITE_DIRECTION_INDEX[d]!)) continue;
                }
              }
            }
            builders[block.buckets[f] as Bucket].add(block, f, x, y, z, cell);
          }
        }
      }
  }
  const opaque = builders[0].build();
  const emissive = builders[1].build();
  const translucent = builders[2].build();
  return { opaque, emissive, translucent, faceCount: opaque.faceCount + emissive.faceCount + translucent.faceCount };
}
