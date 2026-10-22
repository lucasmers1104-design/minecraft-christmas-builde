import { chunkGrid, meshChunk, type ChunkMesh, type MeshInput } from '@/components/preview/meshChunks';

/**
 * Runs chunk meshing off the main thread in a web worker (Next.js bundles
 * `new Worker(new URL('./mesh.worker.ts', import.meta.url))` with Turbopack). When workers are
 * not available or the worker fails to start, the same code runs on the main thread in small
 * batches with a yield between them, so the page stays responsive either way.
 */

export interface MeshJob extends MeshInput {
  /** Changes whenever the model, layer or palette preparation changes. */
  id: number;
}

export interface ChunkRequest {
  chunk: number;
  cut: number;
}

export type WorkerRequest = { type: 'job'; job: MeshJob } | { type: 'mesh'; request: number; jobId: number; chunks: ChunkRequest[] };

export type WorkerResponse =
  | { type: 'result'; request: number; meshes: ChunkMesh[] }
  | { type: 'error'; request: number; message: string };

export interface MeshBackend {
  readonly kind: 'worker' | 'inline';
  mesh(job: MeshJob, chunks: readonly ChunkRequest[]): Promise<ChunkMesh[]>;
  dispose(): void;
}

export class MeshBackendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MeshBackendError';
  }
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Meshes on the calling thread, yielding before every batch. */
export class InlineMeshBackend implements MeshBackend {
  readonly kind = 'inline' as const;
  private disposed = false;

  async mesh(job: MeshJob, chunks: readonly ChunkRequest[]): Promise<ChunkMesh[]> {
    await yieldToBrowser();
    if (this.disposed) throw new MeshBackendError('Vorschau-Berechnung wurde beendet');
    const grid = chunkGrid(job.dimensions);
    return chunks.map((c) => meshChunk(job, grid, c.chunk, c.cut));
  }

  dispose(): void {
    this.disposed = true;
  }
}

class WorkerMeshBackend implements MeshBackend {
  readonly kind = 'worker' as const;
  private sentJob = -1;
  private nextRequest = 1;
  private failure: Error | null = null;
  private readonly pending = new Map<number, { resolve: (m: ChunkMesh[]) => void; reject: (e: Error) => void }>();

  constructor(private readonly worker: Worker) {
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const data = event.data;
      const entry = this.pending.get(data.request);
      if (!entry) return;
      this.pending.delete(data.request);
      if (data.type === 'result') entry.resolve(data.meshes);
      else entry.reject(new MeshBackendError(data.message));
    };
    worker.onerror = (event) => {
      event.preventDefault();
      this.fail(new MeshBackendError(`Web Worker für die Vorschau fehlgeschlagen: ${event.message || 'unbekannter Fehler'}`));
    };
    worker.onmessageerror = () => this.fail(new MeshBackendError('Web Worker: Nachricht nicht lesbar'));
  }

  private fail(error: Error): void {
    this.failure = error;
    for (const entry of this.pending.values()) entry.reject(error);
    this.pending.clear();
  }

  mesh(job: MeshJob, chunks: readonly ChunkRequest[]): Promise<ChunkMesh[]> {
    if (this.failure) return Promise.reject(this.failure);
    if (this.sentJob !== job.id) {
      // Copied (not transferred): the model's indices stay usable on the main thread.
      this.worker.postMessage({ type: 'job', job } satisfies WorkerRequest);
      this.sentJob = job.id;
    }
    const request = this.nextRequest++;
    return new Promise((resolve, reject) => {
      this.pending.set(request, { resolve, reject });
      this.worker.postMessage({ type: 'mesh', request, jobId: job.id, chunks: [...chunks] } satisfies WorkerRequest);
    });
  }

  dispose(): void {
    this.fail(new MeshBackendError('Vorschau-Berechnung wurde beendet'));
    this.worker.terminate();
  }
}

/** Worker when possible, otherwise main-thread meshing. */
export function createMeshBackend(): MeshBackend {
  if (typeof Worker === 'undefined') return new InlineMeshBackend();
  try {
    const worker = new Worker(new URL('./mesh.worker.ts', import.meta.url), { type: 'module', name: 'voxel-mesh' });
    return new WorkerMeshBackend(worker);
  } catch {
    return new InlineMeshBackend();
  }
}
