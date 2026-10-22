'use client';

import { useEffect, useRef, useState } from 'react';
import { createMeshBackend, InlineMeshBackend, type ChunkRequest, type MeshBackend, type MeshJob } from '@/components/preview/meshBackend';
import { changedChunks, chunkCuts, chunkGrid, type ChunkMesh } from '@/components/preview/meshChunks';
import type { ClientTexturePack } from '@/components/preview/textures/textureAtlas';
import type { Dimensions, VoxelModel } from '@/core/schema/voxelModel';
import { prepareTexturedBlock, type PreparedBlock } from '@/core/textures/texturedMesh';

/**
 * Keeps chunk meshes of the shown model up to date: meshes new models in the background (web
 * worker, else main thread in slices), re-meshes only the chunks touched by an edit or by a
 * layer change, and swaps the result in atomically once every chunk of that model is ready.
 */

export interface MeshSnapshot {
  model: VoxelModel;
  layerY: number | null;
  pack: ClientTexturePack | null;
  dimensions: Dimensions;
  /** Non-empty chunks, sorted by chunk index. */
  chunks: readonly ChunkMesh[];
  faceCount: number;
  /** Where the last chunks were meshed ('worker' or 'inline' on the main thread); null if nothing had to be meshed. */
  mesher: MeshBackend['kind'] | null;
}

export interface ChunkedMeshState {
  /** What is on screen (may still belong to the previous model while `pending`). */
  snapshot: MeshSnapshot | null;
  pending: boolean;
  /** 0..1 while meshing, null when unknown. */
  progress: number | null;
  error: string | null;
}

/** Chunks per worker round trip: small enough for progress and cancellation, large enough for throughput. */
const BATCH = 8;

interface Applied {
  pack: ClientTexturePack | null;
  dimensions: Dimensions;
  palette: readonly string[];
  indices: Uint16Array;
  cuts: Int32Array;
  chunks: Map<number, ChunkMesh>;
}

interface Progress {
  model: VoxelModel;
  layerY: number | null;
  pack: ClientTexturePack | null;
  done: number;
  total: number;
}

const PREPARED = new WeakMap<ClientTexturePack, Map<string, PreparedBlock>>();

/** Prepared palette entries for the textured mesher (cached per pack and block state). */
function preparePalette(pack: ClientTexturePack, palette: readonly string[]): PreparedBlock[] {
  let cache = PREPARED.get(pack);
  if (!cache) {
    cache = new Map();
    PREPARED.set(pack, cache);
  }
  return palette.map((state) => {
    let prepared = cache.get(state);
    if (!prepared) {
      prepared = prepareTexturedBlock(state, pack.bake, pack.lookup);
      cache.set(state, prepared);
    }
    return prepared;
  });
}

function sameDimensions(a: Dimensions, b: Dimensions): boolean {
  return a.width === b.width && a.height === b.height && a.length === b.length;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useChunkedMesh(model: VoxelModel, layerY: number | null, pack: ClientTexturePack | null): ChunkedMeshState {
  const [snapshot, setSnapshot] = useState<MeshSnapshot | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [failure, setFailure] = useState<{ model: VoxelModel; message: string } | null>(null);
  const backendRef = useRef<MeshBackend | null>(null);
  const appliedRef = useRef<Applied | null>(null);
  const jobIdRef = useRef(0);

  useEffect(
    () => () => {
      backendRef.current?.dispose();
      backendRef.current = null;
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    let mesher: MeshBackend['kind'] | null = null;
    const meshBatch = async (job: MeshJob, batch: ChunkRequest[]) => {
      const backend = (backendRef.current ??= createMeshBackend());
      try {
        const meshes = await backend.mesh(job, batch);
        mesher = backend.kind;
        return meshes;
      } catch (error) {
        if (cancelled || backend.kind !== 'worker') throw error;
        // Worker unusable (blocked, failed to load): continue on the main thread.
        backend.dispose();
        const inline = new InlineMeshBackend();
        backendRef.current = inline;
        mesher = inline.kind;
        return inline.mesh(job, batch);
      }
    };

    const run = async () => {
      const dims = model.dimensions;
      const grid = chunkGrid(dims);
      const cuts = chunkCuts(grid, dims.height, layerY);
      const applied = appliedRef.current;
      const base = applied && applied.pack === pack && sameDimensions(applied.dimensions, dims) ? applied : null;
      const changed = base ? changedChunks(base, model, dims, grid) : null;
      const dirty: number[] = [];
      for (let c = 0; c < grid.count; c++) {
        if (!base || !changed || changed[c] || base.cuts[c] !== cuts[c]) dirty.push(c);
      }
      const requests: ChunkRequest[] = dirty.filter((c) => cuts[c] !== 0).map((c) => ({ chunk: c, cut: cuts[c]! }));
      const results: ChunkMesh[] = [];
      if (requests.length > 0) {
        const job: MeshJob = {
          id: ++jobIdRef.current,
          dimensions: dims,
          palette: model.palette,
          indices: model.indices,
          maxY: layerY,
          prepared: pack ? preparePalette(pack, model.palette) : null,
        };
        for (let i = 0; i < requests.length; i += BATCH) {
          const meshes = await meshBatch(job, requests.slice(i, i + BATCH));
          if (cancelled) return;
          results.push(...meshes);
          setProgress({ model, layerY, pack, done: Math.min(requests.length, i + BATCH), total: requests.length });
        }
      } else {
        await Promise.resolve();
        if (cancelled) return;
      }

      const chunks = new Map(base?.chunks);
      for (const c of dirty) chunks.delete(c);
      for (const r of results) if (r.faceCount > 0) chunks.set(r.chunk, r);
      appliedRef.current = { pack, dimensions: dims, palette: model.palette, indices: model.indices, cuts, chunks };
      const list = [...chunks.values()].sort((a, b) => a.chunk - b.chunk);
      const faceCount = list.reduce((n, c) => n + c.faceCount, 0);
      setSnapshot((prev) => ({ model, layerY, pack, dimensions: dims, chunks: list, faceCount, mesher: mesher ?? prev?.mesher ?? null }));
      setFailure(null);
    };

    run().catch((error: unknown) => {
      if (!cancelled) setFailure({ model, message: describe(error) });
    });
    return () => {
      cancelled = true;
    };
  }, [model, layerY, pack]);

  const pending = !snapshot || snapshot.model !== model || snapshot.layerY !== layerY || snapshot.pack !== pack;
  const current = progress && progress.model === model && progress.layerY === layerY && progress.pack === pack ? progress : null;
  return {
    snapshot,
    pending,
    progress: pending && current ? current.done / Math.max(1, current.total) : null,
    error: failure && failure.model === model ? failure.message : null,
  };
}
