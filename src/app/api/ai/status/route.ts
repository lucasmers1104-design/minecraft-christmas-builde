import { NextResponse } from 'next/server';
import { aiStatus } from '@/lib/ai/planner';
import { loadAiConfig } from '@/lib/ai/settingsStore';
import { jsonNoStore } from '@/lib/http/apiResponses';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Reports whether the active AI provider is ready (costs nothing): OpenRouter = key accepted,
 * credit, model with structured output; Ollama = server reachable, model pulled; off = no
 * network access at all.
 */
export async function GET(): Promise<NextResponse> {
  return jsonNoStore(await aiStatus(await loadAiConfig()));
}
