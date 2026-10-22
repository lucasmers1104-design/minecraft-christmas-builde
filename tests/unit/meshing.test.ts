import { describe, expect, it } from 'vitest';
import { blockState } from '@/core/blocks/registry';
import type { Dimensions } from '@/core/schema/voxelModel';
import { bakeBlockState } from '@/core/textures/blockModel';
import { meshTexturedModel, prepareTexturedPalette, type AlphaClass, type AtlasLookup } from '@/core/textures/texturedMesh';
import { buildVoxelMesh } from '@/components/preview/buildVoxelMesh';
import { InlineMeshBackend } from '@/components/preview/meshBackend';
import {
  changedChunks,
  chunkCuts,
  chunkGrid,
  chunkIndex,
  meshAllChunks,
  meshChunk,
  type ChunkMesh,
  type ChunkPart,
  type MeshInput,
} from '@/components/preview/meshChunks';
import { readClientJar } from '@/lib/textures/minecraftJar';
import { fakeClientJar } from '../helpers/fakeMinecraftJar';

const PALETTE = [
  'minecraft:air',
  blockState('stone_bricks'),
  blockState('glass'),
  blockState('oak_slab', { type: 'bottom' }),
  blockState('oak_slab', { type: 'top' }),
  blockState('glass_pane', { east: 'true', west: 'true' }),
  blockState('lantern'),
  blockState('oak_stairs', { facing: 'east' }),
  blockState('spruce_leaves'),
  blockState('oak_fence', { north: 'true' }),
  blockState('glowstone'),
];

/** Random block soup: every kind of culling case at chunk borders. */
function randomModel(dims: Dimensions, fill = 0.45, seed = 7): { dimensions: Dimensions; palette: string[]; indices: Uint16Array } {
  // mulberry32, local so the test does not depend on generator internals.
  let s = seed >>> 0;
  const random = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const indices = new Uint16Array(dims.width * dims.height * dims.length);
  for (let i = 0; i < indices.length; i++) if (random() < fill) indices[i] = 1 + Math.floor(random() * (PALETTE.length - 1));
  return { dimensions: dims, palette: PALETTE, indices };
}

const pack = readClientJar(fakeClientJar());
const bake = (state: string) => {
  const [id, rest] = state.split('[');
  const props = Object.fromEntries((rest ? rest.slice(0, -1).split(',') : []).map((p) => p.split('=') as [string, string]));
  return bakeBlockState(id!, props, pack);
};
const atlas: AtlasLookup = {
  rect: (name) => (pack.textures[name] ? [0, 0, 1, 1] : null),
  alpha: (name): AlphaClass => (name.includes('glass') ? 'translucent' : name.includes('leaves') ? 'cutout' : 'opaque'),
};

/** Every quad as "bucket|cell|positions", sorted: order-independent mesh fingerprint. */
function fingerprint(parts: readonly Pick<ChunkPart, 'bucket' | 'positions' | 'faceCells' | 'faceCount'>[]): string[] {
  const out: string[] = [];
  for (const p of parts)
    for (let q = 0; q < p.faceCount; q++) out.push(`${p.bucket}|${p.faceCells[q]}|${Array.from(p.positions.subarray(q * 12, q * 12 + 12)).join(',')}`);
  return out.sort();
}

const chunkParts = (chunks: readonly ChunkMesh[]) => chunks.flatMap((c) => c.parts);

function wholeColour(input: MeshInput) {
  const m = buildVoxelMesh(input, input.maxY === null ? {} : { maxY: input.maxY });
  return fingerprint([
    { bucket: 'opaque', ...m.opaque },
    { bucket: 'emissive', ...m.emissive },
    { bucket: 'translucent', ...m.translucent },
  ]);
}

function wholeTextured(input: MeshInput) {
  const m = meshTexturedModel(input, input.prepared!, input.maxY === null ? {} : { maxY: input.maxY });
  return fingerprint([
    { bucket: 'tex-solid', ...m.solid },
    { bucket: 'tex-cutout', ...m.cutout },
    { bucket: 'tex-translucent', ...m.translucent },
  ]);
}

describe('Vorschau in Chunks', () => {
  const model = randomModel({ width: 21, height: 18, length: 19 });
  const grid = chunkGrid(model.dimensions, 8);

  it('alle Chunks zusammen ergeben genau das Mesh des ganzen Modells (Farbe und Texturen)', () => {
    const colour: MeshInput = { ...model, maxY: null, prepared: null };
    expect(fingerprint(chunkParts(meshAllChunks(colour, grid)))).toEqual(wholeColour(colour));
    const textured: MeshInput = { ...model, maxY: null, prepared: prepareTexturedPalette(model.palette, bake, atlas) };
    expect(fingerprint(chunkParts(meshAllChunks(textured, grid)))).toEqual(wholeTextured(textured));
  });

  it('Ebenenschnitt: gleiches Ergebnis in Chunks, Chunks unter dem Schnitt bleiben unberührt', () => {
    for (const maxY of [0, 7, 8, 12]) {
      const input: MeshInput = { ...model, maxY, prepared: null };
      expect(fingerprint(chunkParts(meshAllChunks(input, grid))), `maxY=${maxY}`).toEqual(wholeColour(input));
    }
    // Chunk rows: y 0..7, 8..15, 16..17. A cut at maxY=12 only concerns the middle row.
    const cuts = chunkCuts(grid, model.dimensions.height, 12);
    expect(cuts[chunkIndex(grid, 0, 0, 0)]).toBe(-1);
    expect(cuts[chunkIndex(grid, 0, 1, 0)]).toBe(13);
    expect(cuts[chunkIndex(grid, 0, 2, 0)]).toBe(0);
    // A cut right above a chunk still changes its top faces.
    expect(chunkCuts(grid, model.dimensions.height, 7)[chunkIndex(grid, 0, 0, 0)]).toBe(8);
    expect(chunkCuts(grid, model.dimensions.height, null).every((c) => c === -1)).toBe(true);
  });

  it('nach einer Änderung sind nur die Chunks um die Zelle betroffen, auch bei neu nummerierter Palette', () => {
    const at = (x: number, y: number, z: number) => x + model.dimensions.width * (z + model.dimensions.length * y);
    const edit = (cells: [number, number, number][]) => {
      const indices = model.indices.slice();
      for (const [x, y, z] of cells) indices[at(x, y, z)] = indices[at(x, y, z)] === 1 ? 2 : 1;
      return { palette: model.palette, indices };
    };
    const dirtyOf = (after: { palette: readonly string[]; indices: Uint16Array }) =>
      [...changedChunks(model, after, model.dimensions, grid).entries()].filter(([, d]) => d).map(([c]) => c);
    expect(dirtyOf(edit([[3, 3, 3]]))).toEqual([chunkIndex(grid, 0, 0, 0)]);
    // On a chunk border the neighbour chunk is affected too (its faces toward the cell).
    expect(dirtyOf(edit([[7, 3, 3]]))).toEqual([chunkIndex(grid, 0, 0, 0), chunkIndex(grid, 1, 0, 0)]);
    expect(dirtyOf(edit([[3, 8, 3]])).sort((a, b) => a - b)).toEqual([chunkIndex(grid, 0, 0, 0), chunkIndex(grid, 0, 1, 0)]);
    // Same blocks, different palette order: nothing to do.
    const order = [0, ...model.palette.slice(1).map((_, i) => model.palette.length - 1 - i)];
    const renumbered = { palette: order.map((i) => model.palette[i]!), indices: model.indices.map((i) => order.indexOf(i)) };
    expect(dirtyOf(renumbered)).toEqual([]);
  });

  it('nur die betroffenen Chunks neu berechnen ergibt dasselbe wie alles neu', () => {
    const before: MeshInput = { ...model, maxY: null, prepared: null };
    const chunks = new Map(meshAllChunks(before, grid).map((c) => [c.chunk, c]));
    const indices = model.indices.slice();
    for (const i of [0, 7, 8 * 21 + 5, 3000, 5000, indices.length - 1]) indices[i] = indices[i] === 0 ? 2 : 0;
    const after: MeshInput = { ...before, indices };
    const dirty = changedChunks(before, after, model.dimensions, grid);
    const cuts = chunkCuts(grid, model.dimensions.height, null);
    let remeshed = 0;
    dirty.forEach((d, c) => {
      if (!d) return;
      remeshed++;
      chunks.set(c, meshChunk(after, grid, c, cuts[c]!));
    });
    expect(remeshed).toBeLessThan(grid.count);
    expect(fingerprint(chunkParts([...chunks.values()]))).toEqual(wholeColour(after));
  });

  it('Hauptthread-Ersatz (ohne Worker) liefert dieselben Chunks', async () => {
    const input: MeshInput = { ...model, maxY: 9, prepared: null };
    const backend = new InlineMeshBackend();
    const all = chunkGrid(model.dimensions);
    const cuts = chunkCuts(all, model.dimensions.height, 9);
    const requests = Array.from({ length: all.count }, (_, c) => ({ chunk: c, cut: cuts[c]! })).filter((r) => r.cut !== 0);
    const meshes = await backend.mesh({ ...input, id: 1 }, requests);
    expect(fingerprint(chunkParts(meshes))).toEqual(wholeColour(input));
    backend.dispose();
    await expect(backend.mesh({ ...input, id: 2 }, requests)).rejects.toThrow();
  });
});

describe('Vorschau: große Modelle (Messung)', () => {
  /** Hollow shell with a floor every 6 layers and window rows (like a large building). */
  function shell(dims: Dimensions) {
    const { width: W, height: H, length: L } = dims;
    const palette = ['minecraft:air', blockState('stone_bricks'), blockState('spruce_planks'), blockState('glass'), blockState('lantern')];
    const indices = new Uint16Array(W * H * L);
    for (let y = 0; y < H; y++)
      for (let z = 0; z < L; z++)
        for (let x = 0; x < W; x++) {
          const i = x + W * (z + L * y);
          const edge = x === 0 || z === 0 || x === W - 1 || z === L - 1;
          if (y % 6 === 0) indices[i] = 2;
          else if (edge) indices[i] = y % 6 >= 2 && y % 6 <= 4 && (x + z) % 5 >= 2 && (x + z) % 5 <= 3 ? 3 : 1;
          else if (y % 6 === 1 && x % 8 === 4 && z % 8 === 4) indices[i] = 4;
        }
    return { dimensions: dims, palette, indices };
  }

  it('128 × 200 × 128 (3,3 Mio. Zellen): Farbe und Texturen in Chunks, Zeiten im Log', () => {
    const model = shell({ width: 128, height: 200, length: 128 });
    const time = <T>(fn: () => T): [T, number] => {
      const t = performance.now();
      const result = fn();
      return [result, performance.now() - t];
    };
    const [colour, colourMs] = time(() => meshAllChunks({ ...model, maxY: null, prepared: null }));
    const [prepared, prepareMs] = time(() => prepareTexturedPalette(model.palette, bake, atlas));
    const [textured, texturedMs] = time(() => meshAllChunks({ ...model, maxY: null, prepared }));
    const quads = (chunks: ChunkMesh[]) => chunks.reduce((n, c) => n + c.faceCount, 0);
    const bytes = (chunks: ChunkMesh[]) =>
      chunks.flatMap((c) => c.parts).reduce((n, p) => n + [p.positions, p.normals, p.uvs, p.colors, p.indices, p.faceCells].reduce((m, a) => m + (a?.byteLength ?? 0), 0), 0);
    // Edit one block: diff + re-mesh of the affected chunk only.
    const grid = chunkGrid(model.dimensions);
    const indices = model.indices.slice();
    indices[70 + 128 * (0 + 128 * 100)] = 0;
    const [dirty, diffMs] = time(() => changedChunks(model, { palette: model.palette, indices }, model.dimensions, grid));
    const cuts = chunkCuts(grid, model.dimensions.height, null);
    const [, remeshMs] = time(() => dirty.forEach((d, c) => d && meshChunk({ ...model, indices, maxY: null, prepared }, grid, c, cuts[c]!)));
    console.log(
      [
        `Farbe:    ${quads(colour).toLocaleString('de-DE')} Flächen in ${colour.length} Chunks, ${colourMs.toFixed(0)} ms, ${(bytes(colour) / 2 ** 20).toFixed(0)} MiB`,
        `Texturen: ${quads(textured).toLocaleString('de-DE')} Flächen, Palette ${prepareMs.toFixed(1)} ms, Mesh ${texturedMs.toFixed(0)} ms, ${(bytes(textured) / 2 ** 20).toFixed(0)} MiB`,
        `Änderung: Vergleich ${diffMs.toFixed(1)} ms, ${dirty.reduce((a, b) => a + b, 0)} Chunk(s) neu in ${remeshMs.toFixed(1)} ms`,
      ].join('\n'),
    );
    expect(quads(colour)).toBeGreaterThan(1_000_000);
    // The fake jar draws every block as a cube; colour mode draws lanterns as two boxes.
    expect(quads(textured)).toBeGreaterThan(1_000_000);
    expect(dirty.reduce((a, b) => a + b, 0)).toBe(1);
    // Generous bound against regressions to the old per-face number[] pushing (several seconds).
    expect(colourMs + texturedMs).toBeLessThan(20_000);
  });
});
