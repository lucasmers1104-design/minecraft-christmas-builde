import { NextResponse } from 'next/server';
import { z } from 'zod';
import { planToPatch, type BuildPlan } from '@/core/ai/planSchema';
import { MAX_DESCRIPTION_LENGTH } from '@/core/schema/buildSpec';
import { specPatchSchema } from '@/core/schema/resolveSpec';
import type { OpenRouterUsage } from '@/lib/ai/openRouterPlanner';
import { planWithProvider } from '@/lib/ai/planner';
import { AiPlanError, type AiErrorCode } from '@/lib/ai/planValidation';
import { loadAiConfig } from '@/lib/ai/settingsStore';
import { jsonError, jsonNoStore, readJsonBody, rejectCrossOrigin, RequestBodyError } from '@/lib/http/apiResponses';
import type { SpecPatch } from '@/core/generator/parseDescription';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const requestSchema = z.object({ description: z.string().trim().min(1).max(MAX_DESCRIPTION_LENGTH) }).strict();

export interface AiPlanResponse {
  /** Who planned: the cloud model on OpenRouter or the local model in Ollama. */
  source: 'ollama' | 'openrouter';
  model: string;
  durationMs: number;
  attempts: number;
  examples: string[];
  /** Ollama only (always false for OpenRouter). */
  fromThinking: boolean;
  /** Ollama only (always false for OpenRouter). */
  thinkDropped: boolean;
  /** OpenRouter: real cost of all rounds in US dollars (null = not reported). Ollama: null. */
  costUsd: number | null;
  /** OpenRouter only: tokens of all rounds. */
  usage?: OpenRouterUsage;
  /** OpenRouter only: repeated without temperature/reasoning (no provider accepted them). */
  paramsDropped?: boolean;
  /** OpenRouter only: provider that answered, e.g. "OpenAI". */
  provider?: string | null;
  /** The flat catalogue plan (same format as the parser's plan). */
  plan: BuildPlan;
  /** The plan as spec patch ("auto"/null dropped), validated. */
  patch: SpecPatch;
}

/** Error body: { error, code, issues, costUsd? } – costUsd if a failed request still cost money. */
const STATUS: Record<AiErrorCode, number> = {
  disabled: 503,
  no_key: 503,
  unreachable: 503,
  timeout: 504,
  invalid: 502,
  http: 502,
  auth: 502,
  credits: 402,
  model: 502,
  unsupported: 502,
  rate_limit: 429,
  upstream: 502,
};

/**
 * Turns a free-text idea into a validated building plan with the active AI provider
 * (settings: app file > .env.local). Only the app's own page may call it: with OpenRouter
 * every request costs money.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const denied = rejectCrossOrigin(request);
  if (denied) return denied;
  let body: unknown;
  try {
    body = await readJsonBody(request, 8 * 1024);
  } catch (error) {
    if (error instanceof RequestBodyError) return jsonError(error.status, error.message);
    throw error;
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, 'Beschreibung fehlt oder ist zu lang');

  try {
    const result = await planWithProvider(await loadAiConfig(), parsed.data.description);
    const patch = specPatchSchema.parse(planToPatch(result.plan));
    const response: AiPlanResponse = { ...result, patch };
    return jsonNoStore(response);
  } catch (error) {
    if (error instanceof AiPlanError) {
      return jsonNoStore(
        { error: error.message, code: error.code, issues: error.details, ...(error.costUsd !== undefined ? { costUsd: error.costUsd } : {}) },
        STATUS[error.code],
      );
    }
    // Unexpected errors: log only the message (never request headers or settings).
    console.error('ai plan failed:', (error as Error).message);
    return jsonError(500, 'KI-Planung fehlgeschlagen', [(error as Error).message]);
  }
}
