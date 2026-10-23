import { NextResponse } from 'next/server';
import { isOpenRouterModelId } from '@/core/ai/providers';
import { buildModelCatalog } from '@/lib/ai/openRouterModels';
import { loadAiConfig } from '@/lib/ai/settingsStore';
import { jsonError, jsonNoStore } from '@/lib/http/apiResponses';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/ai/models?model=<id>: live OpenRouter prices of the recommended models plus the
 * requested model (model list cached for an hour). If OpenRouter is not reachable, the price
 * snapshot from providers.ts is returned with `live: false`. Costs nothing.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const requested = new URL(request.url).searchParams.get('model')?.trim() || null;
  if (requested !== null && !isOpenRouterModelId(requested)) {
    return jsonError(400, 'Ungültige Modell-ID. Erwartet wird „anbieter/modell“ wie auf openrouter.ai/models, z. B. „openai/gpt-6-luna“.');
  }
  const config = await loadAiConfig();
  return jsonNoStore(await buildModelCatalog({ baseUrl: config.openrouter.baseUrl, apiKey: config.openrouter.apiKey, requested }));
}
