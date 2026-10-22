import { chunkGrid, chunkTransferables, meshChunk, type ChunkMesh } from '@/components/preview/meshChunks';
import type { MeshJob, WorkerRequest, WorkerResponse } from '@/components/preview/meshBackend';

/**
 * Web worker for the 3D preview: meshes chunks of the current model. The main thread sends the
 * model once per job and then asks for batches of chunks; mesh buffers come back transferred
 * (zero copy). Requests are answered in order.
 */

interface WorkerScope {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage(message: WorkerResponse, transfer: Transferable[]): void;
}

const scope = globalThis as unknown as WorkerScope;
let current: MeshJob | null = null;

scope.onmessage = (event) => {
  const data = event.data;
  if (data.type === 'job') {
    current = data.job;
    return;
  }
  try {
    if (!current || current.id !== data.jobId) throw new Error('Kein passender Auftrag im Worker');
    const job = current;
    const grid = chunkGrid(job.dimensions);
    const meshes: ChunkMesh[] = data.chunks.map((c) => meshChunk(job, grid, c.chunk, c.cut));
    scope.postMessage({ type: 'result', request: data.request, meshes }, chunkTransferables(meshes));
  } catch (error) {
    scope.postMessage({ type: 'error', request: data.request, message: error instanceof Error ? error.message : String(error) }, []);
  }
};
