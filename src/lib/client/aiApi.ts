import type { AiPlanResponse } from '@/app/api/ai/plan/route';
import type { AiProvider, AiSettingsUpdate, AiSettingsView, AiStatus, ModelCatalogResponse } from '@/core/ai/providers';
import { planSchema, type BuildPlan } from '@/core/ai/planSchema';

export type { AiStatus };

export interface AiPlanState {
  description: string;
  model: string;
  durationMs: number;
  explanation: string;
  unsupported: string[];
  patch: AiPlanResponse['patch'];
  /** The checked catalogue plan (shown field by field). */
  plan?: BuildPlan;
  /** 1 = valid at once, 2 = after the repair round. */
  attempts?: number;
  /** Who planned it; missing in projects saved before OpenRouter existed (= Ollama). */
  source?: Exclude<AiProvider, 'off'>;
  /** Real cost reported by OpenRouter in US dollars (null/absent = unknown or free). */
  costUsd?: number | null;
}

export async function fetchAiStatus(): Promise<AiStatus> {
  const res = await fetch('/api/ai/status', { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as AiStatus;
}

export class AiRequestError extends Error {
  /** Server error code of /api/ai/plan, e.g. "no_key", "auth", "credits", "timeout" (see planValidation.ts). */
  readonly code: string | undefined;
  /** What a failed plan request still cost on OpenRouter in US dollars (null = unknown, undefined = nothing reported). */
  readonly costUsd: number | null | undefined;

  constructor(
    readonly status: number,
    message: string,
    readonly issues: string[] = [],
    extra: { code?: string; costUsd?: number | null } = {},
  ) {
    super(message);
    this.name = 'AiRequestError';
    this.code = extra.code;
    this.costUsd = extra.costUsd;
  }
}

async function readError(res: Response): Promise<AiRequestError> {
  const body = (await res.json().catch(() => ({}))) as { error?: string; issues?: string[] };
  return new AiRequestError(res.status, body.error ?? `HTTP ${res.status}`, body.issues ?? []);
}

export async function fetchAiSettings(): Promise<AiSettingsView> {
  const res = await fetch('/api/ai/settings', { cache: 'no-store' });
  if (!res.ok) throw await readError(res);
  return (await res.json()) as AiSettingsView;
}

/** Saves the settings on the server (the key is stored there, never in the browser). */
export async function saveAiSettings(update: AiSettingsUpdate): Promise<AiSettingsView> {
  const res = await fetch('/api/ai/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  if (!res.ok) throw await readError(res);
  return (await res.json()) as AiSettingsView;
}

/** Live OpenRouter prices of the recommended models (plus `extraModel`, if given). */
export async function fetchModelCatalog(extraModel?: string, signal?: AbortSignal): Promise<ModelCatalogResponse> {
  const query = extraModel ? `?model=${encodeURIComponent(extraModel)}` : '';
  const res = await fetch(`/api/ai/models${query}`, { cache: 'no-store', signal });
  if (!res.ok) throw await readError(res);
  return (await res.json()) as ModelCatalogResponse;
}

export async function requestAiPlan(description: string, signal?: AbortSignal): Promise<AiPlanState> {
  const res = await fetch('/api/ai/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description }),
    signal,
  });
  const body = (await res.json().catch(() => ({}))) as Partial<AiPlanResponse> & { error?: string; issues?: string[]; code?: string };
  if (!res.ok || !body.plan || !body.patch) {
    const detail = body.issues && body.issues.length > 0 ? ` (${body.issues.slice(0, 3).join('; ')})` : '';
    throw new AiRequestError(res.status, `${body.error ?? `HTTP ${res.status}`}${detail}`, body.issues ?? [], { code: body.code, costUsd: body.costUsd });
  }
  const source: Exclude<AiProvider, 'off'> = body.source === 'openrouter' ? 'openrouter' : 'ollama';
  const costUsd = body.costUsd;
  return {
    description,
    model: body.model ?? '',
    durationMs: body.durationMs ?? 0,
    explanation: body.plan.explanation,
    unsupported: body.plan.unsupported,
    patch: body.patch,
    // Shown field by field only if it is a complete, valid plan.
    ...(planSchema.safeParse(body.plan).success ? { plan: body.plan } : {}),
    attempts: body.attempts ?? 1,
    source,
    ...(costUsd !== undefined ? { costUsd } : {}),
  };
}
