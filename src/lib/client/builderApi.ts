import type { GenerateResponse } from '@/app/api/generate/route';
import type { ApiErrorBody } from '@/lib/http/apiResponses';
import type { BuildSpec } from '@/core/schema/buildSpec';
import type { VoxelModel } from '@/core/schema/voxelModel';
import { decodeVoxelTransport, encodeVoxelTransport } from '@/lib/serialization/voxelTransport';

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly issues: string[] = [],
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

async function errorFrom(response: Response): Promise<ApiRequestError> {
  let body: Partial<ApiErrorBody> = {};
  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    // Non-JSON error page; fall back to the status text.
  }
  return new ApiRequestError(response.status, body.error ?? `HTTP ${response.status} ${response.statusText}`, body.issues ?? []);
}

export interface GeneratedResult {
  variants: VoxelModel[];
  warnings: string[];
  generator: GenerateResponse['generator'];
}

export async function requestGeneration(spec: BuildSpec, signal?: AbortSignal): Promise<GeneratedResult> {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spec }),
    signal,
  });
  if (!response.ok) throw await errorFrom(response);
  const body = (await response.json()) as GenerateResponse;
  // Decoding re-validates registry, bounds and hash on the client as well.
  const variants = body.variants.map((v) => decodeVoxelTransport(v.model));
  return { variants, warnings: body.warnings, generator: body.generator };
}

export interface ExportedFile {
  blob: Blob;
  fileName: string;
  hash: string;
}

export async function requestSchematic(model: VoxelModel): Promise<ExportedFile> {
  const response = await fetch('/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(encodeVoxelTransport(model)),
  });
  if (!response.ok) throw await errorFrom(response);
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const fileName = /filename="([^"]+)"/.exec(disposition)?.[1] ?? 'bauwerk.schem';
  const hash = response.headers.get('X-MCB-Voxel-Hash') ?? '';
  if (hash !== model.hash) throw new ApiRequestError(500, 'Server hat ein anderes Volumen exportiert als ausgewählt');
  const blob = await response.blob();
  if (blob.size === 0) throw new ApiRequestError(500, 'Leere Exportdatei erhalten');
  return { blob, fileName, hash };
}

export function triggerDownload(file: ExportedFile): void {
  const url = URL.createObjectURL(file.blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
