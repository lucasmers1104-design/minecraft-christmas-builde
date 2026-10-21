import { NextResponse } from 'next/server';
import { z } from 'zod';
import { aiPlanToPatch, type AiPlan } from '@/core/ai/planSchema';
import { MAX_DESCRIPTION_LENGTH } from '@/core/schema/buildSpec';
import { specPatchSchema } from '@/core/schema/resolveSpec';
import { AiPlanError, readAiConfig, requestAiPlan } from '@/lib/ai/ollamaPlanner';
import { jsonError, readJsonBody, RequestBodyError } from '@/lib/http/apiResponses';
import type { SpecPatch } from '@/core/generator/parseDescription';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const requestSchema = z.object({ description: z.string().trim().min(1).max(MAX_DESCRIPTION_LENGTH) }).strict();

export interface AiPlanResponse {
  source: 'ollama';
  model: string;
  durationMs: number;
  attempts: number;
  plan: AiPlan;
  patch: SpecPatch;
}

const STATUS: Record<AiPlanError['code'], number> = {
  disabled: 503,
  unreachable: 503,
  timeout: 504,
  invalid: 502,
  http: 502,
};

/** Turns a free-text idea into a validated building plan using the LOCAL model. */
export async function POST(request: Request): Promise<NextResponse> {
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
    const result = await requestAiPlan(readAiConfig(), parsed.data.description);
    const patch = specPatchSchema.parse(aiPlanToPatch(result.plan));
    const response: AiPlanResponse = { source: 'ollama', ...result, patch };
    return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof AiPlanError) {
      return NextResponse.json(
        { error: error.message, code: error.code, issues: error.details },
        { status: STATUS[error.code], headers: { 'Cache-Control': 'no-store' } },
      );
    }
    console.error('ai plan failed', error);
    return jsonError(500, 'KI-Planung fehlgeschlagen', [(error as Error).message]);
  }
}
