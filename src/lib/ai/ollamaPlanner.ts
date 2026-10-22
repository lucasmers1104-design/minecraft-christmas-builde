import { normalizePlan, planJsonSchema, planSchema, type BuildPlan } from '@/core/ai/planSchema';
import { plannerMessages, type ChatMessage } from '@/core/ai/prompt';

/**
 * Optional planning through a LOCAL language model served by Ollama (no API key, no cloud,
 * no costs). Server-side only; the endpoint is configured through environment variables and
 * never taken from the browser. The model fills the flat catalogue plan (planSchema.ts):
 * structured output with the plan's JSON schema, temperature 0, few-shot examples, Zod
 * validation after normalisation (clamping), one repair round with the validation errors.
 * If the model is off, unreachable, too slow or returns an invalid plan, the client falls
 * back to the rule-based parser and says so.
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
/** Context for system prompt + few-shot examples + answer (the prompt alone is ~4k tokens). */
export const PLANNER_NUM_CTX = 8192;

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
  plan: BuildPlan;
  model: string;
  durationMs: number;
  /** 1 = valid at once, 2 = valid after the repair round. */
  attempts: number;
  /** Few-shot examples sent with the prompt. */
  examples: string[];
  /** The answer was taken from the `thinking` field (known Ollama issue with format + think). */
  fromThinking: boolean;
  /** The request was repeated without "think" because the model does not support it. */
  thinkDropped: boolean;
}

interface OllamaChatBody {
  message?: { content?: string; thinking?: string };
}

/** The plan text of a reply: content, or – if that holds no JSON – the thinking field. */
function replyText(body: OllamaChatBody): { text: string; fromThinking: boolean } {
  const content = body.message?.content ?? '';
  const thinking = body.message?.thinking ?? '';
  if (!content.includes('{') && thinking.includes('{')) return { text: thinking, fromThinking: true };
  return { text: content, fromThinking: false };
}

/** Asks the local model for a plan; one repair round if the first answer is invalid. */
export async function requestAiPlan(config: AiConfig, description: string, fetchImpl: FetchLike = fetch): Promise<AiPlanResult> {
  if (!config.enabled) throw new AiPlanError('disabled', 'Lokale KI ist nicht aktiviert (MCB_AI_PROVIDER=ollama).');
  const started = Date.now();
  const deadline = started + config.timeoutMs;
  const prompt = plannerMessages(description);
  const messages: ChatMessage[] = [...prompt.messages];
  const format = planJsonSchema();
  let think = config.think;
  let thinkDropped = false;
  let lastIssues: string[] = [];
  const maxAttempts = 2;
  let attempts = 0;
  const timeoutError = () => new AiPlanError('timeout', `Die lokale KI hat nicht innerhalb von ${Math.round(config.timeoutMs / 1000)} s geantwortet.`);

  while (attempts < maxAttempts) {
    attempts++;
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw timeoutError();
    let res: Response;
    try {
      res = await fetchImpl(`${config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          messages,
          stream: false,
          format,
          options: { temperature: 0, seed: 7, num_ctx: PLANNER_NUM_CTX },
          keep_alive: '10m',
          ...(think === undefined ? {} : { think }),
        }),
        signal: AbortSignal.timeout(remaining),
      });
    } catch (error) {
      if (isAbort(error)) throw timeoutError();
      throw new AiPlanError('unreachable', `Ollama ist unter ${config.baseUrl} nicht erreichbar: ${(error as Error).message}`);
    }
    if (!res.ok) {
      const text = (await res.text().catch(() => '')).slice(0, 300);
      // Models without reasoning support reject the "think" flag – repeat once without it.
      if (think !== undefined && /think/i.test(text)) {
        think = undefined;
        thinkDropped = true;
        attempts--;
        continue;
      }
      if (res.status === 404) {
        throw new AiPlanError('http', `Das Modell ${config.model} ist nicht installiert. Im Terminal: ollama pull ${config.model}`, [text]);
      }
      throw new AiPlanError('http', `Ollama antwortete mit HTTP ${res.status}.`, [text]);
    }
    let body: OllamaChatBody;
    try {
      body = (await res.json()) as OllamaChatBody;
    } catch (error) {
      if (isAbort(error)) throw timeoutError();
      throw new AiPlanError('http', 'Ollama lieferte keine lesbare Antwort.', [(error as Error).message]);
    }
    const { text, fromThinking } = replyText(body);
    let parsed: unknown;
    try {
      parsed = normalizePlan(extractJson(text));
    } catch (error) {
      lastIssues = [(error as Error).message];
      messages.push({ role: 'assistant', content: text.slice(0, 2000) }, { role: 'user', content: `Ungültig: ${lastIssues.join('; ')}. Antworte nur mit gültigem JSON nach dem Schema.` });
      continue;
    }
    const result = planSchema.safeParse(parsed);
    if (result.success) {
      return { plan: result.data, model: config.model, durationMs: Date.now() - started, attempts, examples: prompt.exampleIds, fromThinking, thinkDropped };
    }
    lastIssues = result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`);
    messages.push(
      { role: 'assistant', content: text.slice(0, 4000) },
      { role: 'user', content: `Die Antwort passt nicht zum Schema: ${lastIssues.slice(0, 6).join('; ')}. Antworte nur mit korrigiertem JSON.` },
    );
  }
  throw new AiPlanError('invalid', 'Die lokale KI lieferte keinen gültigen Bauplan.', lastIssues);
}
