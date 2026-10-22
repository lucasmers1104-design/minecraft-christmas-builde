import { NextResponse } from 'next/server';
import { z } from 'zod';
import { countMaterials } from '@/core/analysis/materialCounts';
import { getProfileForVersion } from '@/core/compat/profile';
import { BuildLimitError, generateVariants, generationNotes, NotImplementedBuildingError, VARIANT_COUNT } from '@/core/generator/generateBuilding';
import { buildSpecSchema } from '@/core/schema/buildSpec';
import { jsonError, readJsonBody, RequestBodyError } from '@/lib/http/apiResponses';
import { encodeVoxelTransport, type VoxelTransport } from '@/lib/serialization/voxelTransport';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The request only carries a BuildSpec (no voxel data), so its limit stays small regardless
 * of the block limits. The response carries every variant as an RLE transport (typically
 * well below 1 MiB per variant, ~2.7 MiB for a realistic 192 x 384 x 192 building).
 */
const MAX_GENERATE_REQUEST_BYTES = 16 * 1024;

const generateRequestSchema = z
  .object({
    spec: buildSpecSchema,
    variants: z.number().int().min(1).max(VARIANT_COUNT).optional(),
  })
  .strict();

export interface GeneratedVariant {
  seed: number;
  hash: string;
  dimensions: VoxelTransport['dimensions'];
  totalBlocks: number;
  model: VoxelTransport;
}

export interface GenerateResponse {
  generator: 'rule-based';
  profile: { minecraftVersion: string; dataVersion: number; schematic: string };
  variants: GeneratedVariant[];
  warnings: string[];
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await readJsonBody(request, MAX_GENERATE_REQUEST_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyError) return jsonError(error.status, error.message);
    throw error;
  }

  const parsed = generateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      'Ungültige Bauwerks-Spezifikation',
      parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
    );
  }
  const { spec, variants = VARIANT_COUNT } = parsed.data;
  const profile = getProfileForVersion(spec.targetMinecraftVersion);
  if (!profile) return jsonError(400, `Minecraft-Version ${spec.targetMinecraftVersion} wird nicht unterstützt`);

  try {
    const models = generateVariants(spec, variants);
    const response: GenerateResponse = {
      generator: 'rule-based',
      profile: {
        minecraftVersion: profile.minecraftVersion,
        dataVersion: profile.dataVersion,
        schematic: `Sponge Schematic v${profile.schematicVersion}`,
      },
      variants: models.map((model) => ({
        seed: model.spec.seed,
        hash: model.hash,
        dimensions: model.dimensions,
        totalBlocks: countMaterials(model).totalBlocks,
        model: encodeVoxelTransport(model),
      })),
      warnings: generationNotes(spec),
    };
    return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof NotImplementedBuildingError || error instanceof BuildLimitError) return jsonError(422, error.message);
    console.error('generate failed', error);
    return jsonError(500, 'Generierung fehlgeschlagen', [(error as Error).message]);
  }
}
