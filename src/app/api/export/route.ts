import { getProfileForVersion } from '@/core/compat/profile';
import { exportSchematic, schematicFileName } from '@/core/export/exportSchematic';
import { SchematicExportError } from '@/core/export/writeSpongeV3';
import { jsonError, readJsonBody, RequestBodyError } from '@/lib/http/apiResponses';
import { decodeVoxelTransport, MAX_TRANSPORT_REQUEST_BYTES, TransportError } from '@/lib/serialization/voxelTransport';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Exports exactly the posted canonical voxel model (never re-generates from a prompt).
 * The model is validated (limits, registry, hash), written as Sponge v3, re-read through
 * the independent validator and only then returned as a download. The body limit
 * (MAX_TRANSPORT_REQUEST_BYTES, ~37 MiB) covers the largest possible model in either index
 * encoding; it is enforced on the streamed bytes, not only on Content-Length.
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await readJsonBody(request, MAX_TRANSPORT_REQUEST_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyError) return jsonError(error.status, error.message);
    throw error;
  }

  let model;
  try {
    model = decodeVoxelTransport(body);
  } catch (error) {
    if (error instanceof TransportError) return jsonError(400, 'Voxelmodell abgelehnt', error.issues);
    throw error;
  }

  const profile = getProfileForVersion(model.spec.targetMinecraftVersion);
  if (!profile) return jsonError(400, `Minecraft-Version ${model.spec.targetMinecraftVersion} wird nicht unterstützt`);

  try {
    const { file, report } = exportSchematic(model, profile);
    const fileName = schematicFileName(model);
    return new Response(new Uint8Array(file), {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(file.length),
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-MCB-Voxel-Hash': model.hash,
        'X-MCB-Schematic-Version': String(report.decoded?.version ?? ''),
        'X-MCB-Data-Version': String(report.decoded?.dataVersion ?? ''),
      },
    });
  } catch (error) {
    if (error instanceof SchematicExportError) return jsonError(422, 'Export verweigert', error.issues);
    console.error('export failed', error);
    return jsonError(500, 'Export fehlgeschlagen', [(error as Error).message]);
  }
}
