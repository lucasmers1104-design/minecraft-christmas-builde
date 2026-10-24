import { NextResponse } from 'next/server';
import { aiStatus } from '@/lib/ai/planner';
import { loadAiConfig } from '@/lib/ai/settingsStore';
import { jsonNoStore, rejectCrossOrigin } from '@/lib/http/apiResponses';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Reports whether the active AI provider is ready (costs nothing): OpenRouter = key accepted,
 * credit, model with structured output; Ollama = server reachable, model pulled; off = no
 * network access at all.
 */
export async function GET(request: Request): Promise<NextResponse> {
  // The status shows the remaining credit – only for the app's own page.
  const denied = rejectCrossOrigin(request);
  if (denied) return denied;
  return jsonNoStore(await aiStatus(await loadAiConfig()));
}
