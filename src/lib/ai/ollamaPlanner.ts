import { aiPlanJsonSchema, aiPlanSchema, normalizeAiPlan, type AiPlan } from '@/core/ai/planSchema';
import { plannerSystemPrompt } from '@/core/ai/prompt';

/**
 * Optional planning through a LOCAL language model served by Ollama (no API key, no cloud,
 * no costs). Server-side only; the endpoint is configured through environment variables and
 * never taken from the browser. If the model is off, unreachable, too slow or returns an
 * invalid plan, callers fall back to the rule-based parser and say so.
 */

export interface AiConfig {
  enabled: boolean;
  provider: 'ollama' | 'off';
  baseUrl: string;
  model: string;
  timeoutMs: number;
  /** Ollama "think" flag for reasoning models; undefined = do not send it. */
  think: boolean | undefined;
}

export const DEFAULT_OLLAMA_MODEL = 'qwen3:14b';

export function readAiConfig(env: Record<string, string | undefined> = process.env): AiConfig {
  const provider = (env.MCB_AI_PROVIDER ?? 'off').trim().toLowerCase() === 'ollama' ? 'ollama' : 'off';
  let baseUrl = (env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434').trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(baseUrl)) baseUrl = `http://${baseUrl}`;
  const timeout = Number.parseInt(env.MCB_AI_TIMEOUT_MS ?? '', 10);
  const think = env.OLLAMA_THINK?.trim().toLowerCase();
  return {
    enabled: provider === 'ollama',
    provider,
    baseUrl,
    model: (env.OLLAMA_MODEL ?? DEFAULT_OLLAMA_MODEL).trim() || DEFAULT_OLLAMA_MODEL,
    timeoutMs: Number.isFinite(timeout) ? Math.min(600_000, Math.max(5_000, timeout)) : 120_000,
    think: think === 'true' ? true : think === 'unset' ? undefined : false,
  };
}

export interface AiStatus {
  enabled: boolean;
  provider: 'ollama' | 'off';
  model: string;
  reachable: boolean;
  modelInstalled: boolean;
  installedModels: string[];
  message: string;
}

export type AiErrorCode = 'disabled' | 'unreachable' | 'timeout' | 'invalid' | 'http';

export class AiPlanError extends Error {
  constructor(
    readonly code: AiErrorCode,
    message: string,
    readonly details: string[] = [],
  ) {
    super(message);
    this.name = 'AiPlanError';
  }
}

type FetchLike = typeof fetch;

function isAbort(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
}

export async function getAiStatus(config: AiConfig, fetchImpl: FetchLike = fetch): Promise<AiStatus> {
  const base = { enabled: config.enabled, provider: config.provider, model: config.model, installedModels: [] as string[] };
  if (!config.enabled) {
    return {
      ...base,
      reachable: false,
      modelInstalled: false,
      message: 'Lokale KI ist nicht aktiviert. In .env.local MCB_AI_PROVIDER=ollama setzen und den Server neu starten.',
    };
  }
  try {
    const res = await fetchImpl(`${config.baseUrl}/api/tags`, { signal: AbortSignal.timeout(3_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { models?: { name?: string; model?: string }[] };
    const installedModels = (body.models ?? []).map((m) => m.name ?? m.model ?? '').filter(Boolean);
    const wanted = config.model.includes(':') ? config.model : `${config.model}:latest`;
    const modelInstalled = installedModels.some((n) => n === config.model || n === wanted);
    return {
      ...base,
      installedModels,
      reachable: true,
      modelInstalled,
      message: modelInstalled
        ? `Lokale KI bereit (Ollama, Modell ${config.model}).`
        : `Ollama läuft, aber das Modell ${config.model} ist nicht installiert. Im Terminal: ollama pull ${config.model}`,
    };
  } catch (error) {
    return {
      ...base,
      reachable: false,
      modelInstalled: false,
      message: `Ollama ist unter ${config.baseUrl} nicht erreichbar (${isAbort(error) ? 'Zeitüberschreitung' : (error as Error).message}). Läuft die Ollama-App?`,
    };
  }
}

/** Extracts the JSON object from a model reply (tolerates code fences and <think> blocks). */
export function extractJson(content: string): unknown {
  const cleaned = content
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^\s*```(?:json)?/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('Antwort enthält kein JSON-Objekt');
  return JSON.parse(cleaned.slice(start, end + 1));
}

export interface AiPlanResult {
  plan: AiPlan;
  model: string;
  durationMs: number;
  attempts: number;
}

/** Asks the local model for a plan; one repair round if the first answer is invalid. */
export async function requestAiPlan(config: AiConfig, description: string, fetchImpl: FetchLike = fetch): Promise<AiPlanResult> {
  if (!config.enabled) throw new AiPlanError('disabled', 'Lokale KI ist nicht aktiviert (MCB_AI_PROVIDER=ollama).');
  const started = Date.now();
  const deadline = started + config.timeoutMs;
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: plannerSystemPrompt() },
    { role: 'user', content: `Beschreibung des Bauwerks:\n"""${description}"""` },
  ];
  let think = config.think;
  let lastIssues: string[] = [];
  const maxAttempts = 2;
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new AiPlanError('timeout', `Die lokale KI hat nicht innerhalb von ${Math.round(config.timeoutMs / 1000)} s geantwortet.`);
    let res: Response;
    try {
      res = await fetchImpl(`${config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          messages,
          stream: false,
          format: aiPlanJsonSchema(),
          options: { temperature: 0.2, seed: 7 },
          keep_alive: '10m',
          ...(think === undefined ? {} : { think }),
        }),
        signal: AbortSignal.timeout(remaining),
      });
    } catch (error) {
      if (isAbort(error)) throw new AiPlanError('timeout', `Die lokale KI hat nicht innerhalb von ${Math.round(config.timeoutMs / 1000)} s geantwortet.`);
      throw new AiPlanError('unreachable', `Ollama ist unter ${config.baseUrl} nicht erreichbar: ${(error as Error).message}`);
    }
    if (!res.ok) {
      const text = (await res.text().catch(() => '')).slice(0, 300);
      // Models without reasoning support reject the "think" flag – retry once without it.
      if (think !== undefined && /think/i.test(text)) {
        think = undefined;
        attempts--;
        continue;
      }
      if (res.status === 404) {
        throw new AiPlanError('http', `Das Modell ${config.model} ist nicht installiert. Im Terminal: ollama pull ${config.model}`, [text]);
      }
      throw new AiPlanError('http', `Ollama antwortete mit HTTP ${res.status}.`, [text]);
    }
    const body = (await res.json()) as { message?: { content?: string } };
    const content = body.message?.content ?? '';
    let parsed: unknown;
    try {
      parsed = normalizeAiPlan(extractJson(content));
    } catch (error) {
      lastIssues = [(error as Error).message];
      messages.push({ role: 'assistant', content }, { role: 'user', content: `Ungültig: ${lastIssues.join('; ')}. Antworte nur mit gültigem JSON nach dem Schema.` });
      continue;
    }
    const result = aiPlanSchema.safeParse(parsed);
    if (result.success) return { plan: result.data, model: config.model, durationMs: Date.now() - started, attempts };
    lastIssues = result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`);
    messages.push(
      { role: 'assistant', content },
      { role: 'user', content: `Die Antwort passt nicht zum Schema: ${lastIssues.slice(0, 6).join('; ')}. Antworte nur mit korrigiertem JSON.` },
    );
  }
  throw new AiPlanError('invalid', 'Die lokale KI lieferte keinen gültigen Bauplan.', lastIssues);
}
