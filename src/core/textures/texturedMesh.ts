import { blockIdOf, parseBlockState } from '@/core/blocks/registry';
import { linearIndex, type VoxelModel } from '@/core/schema/voxelModel';
import { directionVector, type BakedBlock, type Quad } from '@/core/textures/blockModel';
import type { Direction } from '@/core/textures/assetTypes';

/**
 * Builds textured face buffers for the preview from baked block models (pure, no three.js):
 * neighbour culling like the game (solid full blocks hide faces, glass hides glass), the game's
 * directional face shading and biome tints for leaves.
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
  /** Linear RGB: face shade × tint. */
  colors: Float32Array;
  indices: Uint32Array;
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

/** The game's per-direction brightness for shaded faces. */
export const FACE_SHADE: Record<Direction, number> = { down: 0.5, up: 1, north: 0.8, south: 0.8, west: 0.6, east: 0.6 };

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

class Builder {
  positions: number[] = [];
  uvs: number[] = [];
  colors: number[] = [];
  indices: number[] = [];
  faceCells: number[] = [];

  add(quad: Quad, x: number, y: number, z: number, rect: [number, number, number, number], rgb: [number, number, number], cell: number): void {
    const base = this.positions.length / 3;
    const [u0, v0, u1, v1] = rect;
    const shade = quad.shade ? FACE_SHADE[quad.direction] : 1;
    const color = [srgbToLinear(shade * rgb[0]), srgbToLinear(shade * rgb[1]), srgbToLinear(shade * rgb[2])];
    for (let i = 0; i < 4; i++) {
      const p = quad.positions[i]!;
      const uv = quad.uvs[i]!;
      this.positions.push(x + p[0], y + p[1], z + p[2]);
      this.uvs.push(u0 + (uv[0] / 16) * (u1 - u0), v0 + (uv[1] / 16) * (v1 - v0));
      this.colors.push(color[0]!, color[1]!, color[2]!);
    }
    this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    this.faceCells.push(cell);
  }

  build(): TexturedBuffers {
    return {
      positions: Float32Array.from(this.positions),
      uvs: Float32Array.from(this.uvs),
      colors: Float32Array.from(this.colors),
      indices: Uint32Array.from(this.indices),
      faceCount: this.faceCells.length,
      faceCells: Int32Array.from(this.faceCells),
    };
  }
}

interface PaletteInfo {
  blockId: string;
  quads: Quad[];
  /** Solid full block: hides the neighbour's touching faces. */
  occludes: boolean;
  /** Glass-like full block: faces between two identical blocks are hidden. */
  cullsSame: boolean;
}

export function buildTexturedMesh(
  model: Pick<VoxelModel, 'dimensions' | 'palette' | 'indices'>,
  bake: (state: string) => BakedBlock,
  atlas: AtlasLookup,
  options: { maxY?: number } = {},
): TexturedMesh {
  const { width, length } = model.dimensions;
  const height = Math.min(model.dimensions.height, options.maxY === undefined ? Infinity : options.maxY + 1);
  const palette: PaletteInfo[] = model.palette.map((state) => {
    const blockId = blockIdOf(state);
    const baked = parseBlockState(state) ? bake(state) : { quads: [], fullCube: false, missing: [] };
    const allOpaque = baked.quads.length > 0 && baked.quads.every((q) => atlas.alpha(q.texture) === 'opaque');
    return {
      blockId,
      quads: baked.quads,
      occludes: baked.fullCube && allOpaque,
      cullsSame: baked.fullCube && !allOpaque && !blockId.endsWith('_leaves'),
    };
  });

  const paletteAt = (x: number, y: number, z: number): number => {
    if (x < 0 || y < 0 || z < 0 || x >= width || y >= height || z >= length) return -1;
    return model.indices[linearIndex(model.dimensions, x, y, z)]!;
  };

  const solid = new Builder();
  const cutout = new Builder();
  const translucent = new Builder();
  const buckets: Record<AlphaClass, Builder> = { opaque: solid, cutout, translucent };

  for (let y = 0; y < height; y++)
    for (let z = 0; z < length; z++)
      for (let x = 0; x < width; x++) {
        const index = paletteAt(x, y, z);
        const block = palette[index];
        if (!block || block.quads.length === 0) continue;
        const cell = linearIndex(model.dimensions, x, y, z);
        for (const quad of block.quads) {
          if (quad.cullface) {
            const [dx, dy, dz] = directionVector(quad.cullface);
            const neighbourIndex = paletteAt(x + dx, y + dy, z + dz);
            const neighbour = palette[neighbourIndex];
            if (neighbour?.occludes) continue;
            if (block.cullsSame && neighbourIndex === index) continue;
          }
          const rect = atlas.rect(quad.texture);
          if (!rect) continue;
          buckets[atlas.alpha(quad.texture)].add(quad, x, y, z, rect, tintColor(block.blockId, quad.tintIndex), cell);
        }
      }

  const result = { solid: solid.build(), cutout: cutout.build(), translucent: translucent.build() };
  return { ...result, faceCount: result.solid.faceCount + result.cutout.faceCount + result.translucent.faceCount };
}
