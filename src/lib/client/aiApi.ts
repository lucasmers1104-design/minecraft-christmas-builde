import type { AiPlanResponse } from '@/app/api/ai/plan/route';
import type { AiStatus } from '@/lib/ai/ollamaPlanner';

export type { AiStatus };

export interface AiPlanState {
  description: string;
  model: string;
  durationMs: number;
  explanation: string;
  unsupported: string[];
  patch: AiPlanResponse['patch'];
}

export async function fetchAiStatus(): Promise<AiStatus> {
  const res = await fetch('/api/ai/status', { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as AiStatus;
}

export class AiRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AiRequestError';
  }
}

export async function requestAiPlan(description: string, signal?: AbortSignal): Promise<AiPlanState> {
  const res = await fetch('/api/ai/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description }),
    signal,
  });
  const body = (await res.json().catch(() => ({}))) as Partial<AiPlanResponse> & { error?: string; issues?: string[] };
  if (!res.ok || !body.plan || !body.patch) {
    const detail = body.issues && body.issues.length > 0 ? ` (${body.issues.slice(0, 3).join('; ')})` : '';
    throw new AiRequestError(res.status, `${body.error ?? `HTTP ${res.status}`}${detail}`);
  }
  return {
    description,
    model: body.model ?? '',
    durationMs: body.durationMs ?? 0,
    explanation: body.plan.explanation,
    unsupported: body.plan.unsupported,
    patch: body.patch,
  };
}
