import { isFaceFull } from '@/core/blocks/faces';
import { AIR, blockIdOf, definitionOf, parseBlockState, propsOf } from '@/core/blocks/registry';
import { linearIndex, type VoxelModel } from '@/core/schema/voxelModel';
import type { BakedBlock, Quad } from '@/core/textures/blockModel';
import type { Direction } from '@/core/textures/assetTypes';

/**
 * Builds textured face buffers for the preview from baked block models (pure, no three.js).
 *
 * Culling follows the game's `Block.shouldRenderFace`: a quad with a cullface is hidden when the
 * neighbour's touching face is full (collision shape) and drawn with opaque textures – slabs,
 * stairs and solid blocks hide faces, glass, leaves and textures with holes (trapdoors, grates)
 * never do. Glass-like full blocks hide faces toward the same block, and panes / iron bars skip
 * faces toward an identical connected pane (vanilla `IronBarsBlock#skipRendering`). Faces get
 * the game's directional shading and biome tints.
 *
 * The mesher works on regions (chunks), so a large model can be meshed piece by piece, in a
 * worker and incrementally after edits; neighbours outside the region still count for culling,
 * so the union of all chunk meshes equals the mesh of the whole model.
 */

export type AlphaClass = 'opaque' | 'cutout' | 'translucent';

export interface AtlasLookup {
  /** Atlas rectangle [u0, v0, u1, v1] (0..1, v measured from the top) or null if missing. */
  rect(texture: string): [number, number, number, number] | null;
  alpha(texture: string): AlphaClass;
}

export interface TexturedBuffers {
  positions: Float32Array;
  uvs: Float32Array;
  /** Linear RGB (face shade × tint), normalised bytes: 255 = 1.0. */
  colors: Uint8Array;
  indices: Uint16Array | Uint32Array;
  faceCount: number;
  /** Linear block index per quad (2 triangles), for click picking. */
  faceCells: Int32Array;
}

export interface TexturedMesh {
  solid: TexturedBuffers;
  cutout: TexturedBuffers;
  translucent: TexturedBuffers;
  faceCount: number;
}

/** Axis-aligned cell box [x0, x1) × [y0, y1) × [z0, z1) of a model. */
export interface MeshRegion {
  x0: number;
  y0: number;
  z0: number;
  x1: number;
  y1: number;
  z1: number;
}

export interface MeshOptions {
  /** Layer view: blocks above this y are hidden (treated like air for rendering only). */
  maxY?: number;
  /** Only mesh the cells in this region (neighbours outside it still count for culling). */
  region?: MeshRegion;
}

/** The game's per-direction brightness for shaded faces. */
export const FACE_SHADE: Record<Direction, number> = { down: 0.5, up: 1, north: 0.8, south: 0.8, west: 0.6, east: 0.6 };

/** Fixed direction order of the meshers' bit masks. */
export const MESH_DIRECTIONS: readonly Direction[] = ['down', 'up', 'north', 'south', 'west', 'east'];
export const OPPOSITE_DIRECTION_INDEX: readonly number[] = [1, 0, 3, 2, 5, 4];
const DIR_DELTA: readonly (readonly [number, number, number])[] = [
  [0, -1, 0],
  [0, 1, 0],
  [0, 0, -1],
  [0, 0, 1],
  [-1, 0, 0],
  [1, 0, 0],
];
/** Bits of north, south, west and east in MESH_DIRECTIONS order. */
export const HORIZONTAL_DIRECTION_BITS = (1 << 2) | (1 << 3) | (1 << 4) | (1 << 5);

export function directionIndex(d: Direction): number {
  return MESH_DIRECTIONS.indexOf(d);
}

const FOLIAGE_TINTS: Record<string, string> = {
  spruce_leaves: '#619961',
  birch_leaves: '#80a755',
  mangrove_leaves: '#8db127',
};
const DEFAULT_FOLIAGE = '#77ab2f'; // plains foliage
const GRASS_TINT = '#91bd59'; // plains grass
const GRASS_TINTED = new Set(['grass_block', 'short_grass', 'tall_grass', 'fern', 'large_fern', 'sugar_cane']);
const UNTINTED_LEAVES = new Set(['cherry_leaves', 'azalea_leaves', 'flowering_azalea_leaves', 'pale_oak_leaves']);

function hexRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** sRGB tint for a tinted face (tintindex ≥ 0) of a block; white when the block has none. */
export function tintColor(blockId: string, tintIndex: number): [number, number, number] {
  if (tintIndex < 0) return [1, 1, 1];
  const name = blockId.replace(/^minecraft:/, '');
  if (name.endsWith('_leaves') && !UNTINTED_LEAVES.has(name)) return hexRgb(FOLIAGE_TINTS[name] ?? DEFAULT_FOLIAGE);
  if (name === 'vine') return hexRgb(DEFAULT_FOLIAGE);
  if (GRASS_TINTED.has(name)) return hexRgb(GRASS_TINT);
  return [1, 1, 1];
}

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

// ---------------------------------------------------------------------------------------------
// Growable typed buffers (also used by the colour mesher)

/** Copy of `array` with room for `size` elements. */
export function resized<T extends Float32Array | Int32Array | Uint8Array>(array: T, size: number): T {
  const next = new (array.constructor as new (n: number) => T)(size);
  next.set(array.subarray(0, Math.min(array.length, size)));
  return next;
}

/** Two triangles per quad (0-1-2, 0-2-3); 16-bit indices when the vertices fit. */
export function quadIndices(quadCount: number): Uint16Array | Uint32Array {
  const out = quadCount * 4 <= 65536 ? new Uint16Array(quadCount * 6) : new Uint32Array(quadCount * 6);
  for (let q = 0, i = 0; q < quadCount; q++) {
    const base = q * 4;
    out[i++] = base;
    out[i++] = base + 1;
    out[i++] = base + 2;
    out[i++] = base;
    out[i++] = base + 2;
    out[i++] = base + 3;
  }
  return out;
}

class TexturedBuilder {
  private positions = new Float32Array(0);
  private uvs = new Float32Array(0);
  private colors = new Uint8Array(0);
  private cells = new Int32Array(0);
  private capacity = 0;
  private count = 0;

  private grow(): void {
    this.capacity = Math.max(256, this.capacity * 2);
    this.positions = resized(this.positions, this.capacity * 12);
    this.uvs = resized(this.uvs, this.capacity * 8);
    this.colors = resized(this.colors, this.capacity * 12);
    this.cells = resized(this.cells, this.capacity);
  }

  add(block: PreparedBlock, q: number, x: number, y: number, z: number, cell: number): void {
    if (this.count === this.capacity) this.grow();
    const n = this.count;
    const p = this.positions;
    const src = block.positions;
    const ps = q * 12;
    const pd = n * 12;
    for (let v = 0; v < 12; v += 3) {
      p[pd + v] = x + src[ps + v]!;
      p[pd + v + 1] = y + src[ps + v + 1]!;
      p[pd + v + 2] = z + src[ps + v + 2]!;
    }
    this.uvs.set(block.uvs.subarray(q * 8, q * 8 + 8), n * 8);
    const r = block.colors[q * 3]!;
    const g = block.colors[q * 3 + 1]!;
    const b = block.colors[q * 3 + 2]!;
    const c = this.colors;
    for (let v = pd; v < pd + 12; v += 3) {
      c[v] = r;
      c[v + 1] = g;
      c[v + 2] = b;
    }
    this.cells[n] = cell;
    this.count = n + 1;
  }

  build(): TexturedBuffers {
    const n = this.count;
    return {
      positions: this.positions.slice(0, n * 12),
      uvs: this.uvs.slice(0, n * 8),
      colors: this.colors.slice(0, n * 12),
      indices: quadIndices(n),
      faceCount: n,
      faceCells: this.cells.slice(0, n),
    };
  }
}

// ---------------------------------------------------------------------------------------------
// Per palette entry preparation

const BUCKETS: readonly AlphaClass[] = ['opaque', 'cutout', 'translucent'];

/**
 * Everything the mesher needs about one block state, as plain typed arrays (structured-clone
 * friendly, so it can be sent to a web worker): quads in block units with atlas UVs and baked
 * colour, cullface and render bucket per quad, plus the culling flags of the state.
 */
export interface PreparedBlock {
  blockId: string;
  quadCount: number;
  /** 4 corners × xyz per quad, block units. */
  positions: Float32Array;
  /** 4 corners × uv per quad, atlas coordinates. */
  uvs: Float32Array;
  /** Linear RGB per quad (shade × tint), normalised bytes. */
  colors: Uint8Array;
  /** Index into MESH_DIRECTIONS, or -1 without cullface. */
  cullfaces: Int8Array;
  /** 0 = opaque, 1 = cutout, 2 = translucent. */
  buckets: Uint8Array;
  /** Bit per direction: this block's face there is full and opaque, so it hides the neighbour's face. */
  occludes: number;
  /** Glass-like: faces toward the same block are skipped. */
  cullsSame: boolean;
  /** Panes and bars: bit per connected horizontal direction; -1 for other blocks. */
  paneConnections: number;
}

function emptyPrepared(blockId: string): PreparedBlock {
  return {
    blockId,
    quadCount: 0,
    positions: new Float32Array(0),
    uvs: new Float32Array(0),
    colors: new Uint8Array(0),
    cullfaces: new Int8Array(0),
    buckets: new Uint8Array(0),
    occludes: 0,
    cullsSame: false,
    paneConnections: -1,
  };
}

function shapeOrNull(state: string) {
  try {
    return definitionOf(state).shape;
  } catch {
    return null;
  }
}

function faceIsFull(state: string, dir: Direction): boolean {
  try {
    return isFaceFull(state, dir, 'collision');
  } catch {
    return false;
  }
}

/** Prepares one palette entry for meshing (bakes the model, maps UVs into the atlas). */
export function prepareTexturedBlock(state: string, bake: (state: string) => BakedBlock, atlas: AtlasLookup): PreparedBlock {
  if (state === AIR || !parseBlockState(state)) return emptyPrepared(AIR);
  const blockId = blockIdOf(state);
  const baked = bake(state);
  const quads: { quad: Quad; rect: [number, number, number, number]; alpha: AlphaClass }[] = [];
  for (const quad of baked.quads) {
    const rect = atlas.rect(quad.texture);
    if (rect) quads.push({ quad, rect, alpha: atlas.alpha(quad.texture) });
  }
  const n = quads.length;
  const positions = new Float32Array(n * 12);
  const uvs = new Float32Array(n * 8);
  const colors = new Uint8Array(n * 3);
  const cullfaces = new Int8Array(n);
  const buckets = new Uint8Array(n);
  quads.forEach(({ quad, rect, alpha }, i) => {
    const [u0, v0, u1, v1] = rect;
    for (let v = 0; v < 4; v++) {
      positions.set(quad.positions[v]!, i * 12 + v * 3);
      const uv = quad.uvs[v]!;
      uvs[i * 8 + v * 2] = u0 + (uv[0] / 16) * (u1 - u0);
      uvs[i * 8 + v * 2 + 1] = v0 + (uv[1] / 16) * (v1 - v0);
    }
    const shade = quad.shade ? FACE_SHADE[quad.direction] : 1;
    const tint = tintColor(blockId, quad.tintIndex);
    colors[i * 3] = Math.round(srgbToLinear(shade * tint[0]) * 255);
    colors[i * 3 + 1] = Math.round(srgbToLinear(shade * tint[1]) * 255);
    colors[i * 3 + 2] = Math.round(srgbToLinear(shade * tint[2]) * 255);
    cullfaces[i] = quad.cullface ? directionIndex(quad.cullface) : -1;
    buckets[i] = BUCKETS.indexOf(alpha);
  });

  const shape = shapeOrNull(state);
  let occludes = 0;
  if (shape !== null && shape !== 'leaves') {
    MESH_DIRECTIONS.forEach((dir, d) => {
      // A face hides its neighbour when it is full and drawn opaque. Textures with holes
      // (trapdoors, grates) or translucency (glass, ice) never hide anything; a cutout overlay
      // on an opaque base (grass block sides) does not matter.
      const onFace = quads.filter((q) => q.quad.cullface === dir);
      if (!onFace.some((q) => q.alpha === 'opaque') || onFace.some((q) => q.alpha === 'translucent')) return;
      if (faceIsFull(state, dir)) occludes |= 1 << d;
    });
  }
  const allOpaque = n > 0 && quads.every((q) => q.alpha === 'opaque');
  let paneConnections = -1;
  if (shape === 'pane') {
    const props = propsOf(state);
    paneConnections = 0;
    for (let d = 2; d < 6; d++) if (props[MESH_DIRECTIONS[d]!] === 'true') paneConnections |= 1 << d;
  }
  return {
    blockId,
    quadCount: n,
    positions,
    uvs,
    colors,
    cullfaces,
    buckets,
    occludes,
    cullsSame: baked.fullCube && !allOpaque && shape !== 'leaves',
    paneConnections,
  };
}

/** Prepares every palette entry. */
export function prepareTexturedPalette(palette: readonly string[], bake: (state: string) => BakedBlock, atlas: AtlasLookup): PreparedBlock[] {
  return palette.map((state) => prepareTexturedBlock(state, bake, atlas));
}

// ---------------------------------------------------------------------------------------------
// Meshing

/** Clamps the region to the model and the layer cut; null when nothing is left to mesh. */
export function clampRegion(dimensions: VoxelModel['dimensions'], options: MeshOptions): { region: MeshRegion; height: number } | null {
  const { width, length } = dimensions;
  const height = Math.min(dimensions.height, options.maxY === undefined ? Infinity : Math.max(0, options.maxY + 1));
  const r = options.region ?? { x0: 0, y0: 0, z0: 0, x1: width, y1: height, z1: length };
  const region = {
    x0: Math.max(0, r.x0),
    y0: Math.max(0, r.y0),
    z0: Math.max(0, r.z0),
    x1: Math.min(width, r.x1),
    y1: Math.min(height, r.y1),
    z1: Math.min(length, r.z1),
  };
  if (region.x1 <= region.x0 || region.y1 <= region.y0 || region.z1 <= region.z0) return null;
  return { region, height };
}

/** Linear-index offsets of the six neighbours, in MESH_DIRECTIONS order. */
export function neighbourStrides(width: number, length: number): number[] {
  return DIR_DELTA.map(([dx, dy, dz]) => dx + width * dz + width * length * dy);
}

/**
 * Palette indices of the six neighbours of a cell (MESH_DIRECTIONS order) into `out`; -1 outside
 * the model or above the layer cut.
 */
export function readNeighbours(
  out: Int32Array,
  indices: Uint16Array,
  cell: number,
  x: number,
  y: number,
  z: number,
  width: number,
  length: number,
  height: number,
  strides: readonly number[],
): void {
  out[0] = y > 0 ? indices[cell + strides[0]!]! : -1;
  out[1] = y + 1 < height ? indices[cell + strides[1]!]! : -1;
  out[2] = z > 0 ? indices[cell + strides[2]!]! : -1;
  out[3] = z + 1 < length ? indices[cell + strides[3]!]! : -1;
  out[4] = x > 0 ? indices[cell + strides[4]!]! : -1;
  out[5] = x + 1 < width ? indices[cell + strides[5]!]! : -1;
}

/** Meshes (a region of) a model from prepared palette entries. */
export function meshTexturedModel(
  model: Pick<VoxelModel, 'dimensions' | 'indices'>,
  prepared: readonly PreparedBlock[],
  options: MeshOptions = {},
): TexturedMesh {
  const builders = [new TexturedBuilder(), new TexturedBuilder(), new TexturedBuilder()] as const;
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
          const block = prepared[index];
          if (!block || block.quadCount === 0) continue;
          let read = false;
          for (let q = 0; q < block.quadCount; q++) {
            const d = block.cullfaces[q]!;
            if (d >= 0) {
              if (!read) {
                readNeighbours(neighbours, indices, cell, x, y, z, width, length, height, strides);
                read = true;
              }
              const n = neighbours[d]!;
              const other = n >= 0 ? prepared[n] : undefined;
              if (other) {
                if (other.occludes & (1 << OPPOSITE_DIRECTION_INDEX[d]!)) continue;
                if (block.cullsSame && n === index) continue;
                // Vanilla IronBarsBlock#skipRendering: same pane block above/below, or connected to each other.
                if (block.paneConnections >= 0 && other.blockId === block.blockId) {
                  if (((1 << d) & HORIZONTAL_DIRECTION_BITS) === 0) continue;
                  if (block.paneConnections & (1 << d) && other.paneConnections & (1 << OPPOSITE_DIRECTION_INDEX[d]!)) continue;
                }
              }
            }
            builders[block.buckets[q] as 0 | 1 | 2].add(block, q, x, y, z, cell);
          }
        }
      }
  }
  const solid = builders[0].build();
  const cutout = builders[1].build();
  const translucent = builders[2].build();
  return { solid, cutout, translucent, faceCount: solid.faceCount + cutout.faceCount + translucent.faceCount };
}

export function buildTexturedMesh(
  model: Pick<VoxelModel, 'dimensions' | 'palette' | 'indices'>,
  bake: (state: string) => BakedBlock,
  atlas: AtlasLookup,
  options: MeshOptions = {},
): TexturedMesh {
  return meshTexturedModel(model, prepareTexturedPalette(model.palette, bake, atlas), options);
}
