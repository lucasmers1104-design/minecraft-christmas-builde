import { planJsonSchema, type BuildPlan } from '@/core/ai/planSchema';
import { plannerMessages, type ChatMessage } from '@/core/ai/prompt';
import { AI_OFF_MESSAGE, DEFAULT_OLLAMA_BASE_URL, DEFAULT_OLLAMA_MODEL, type AiStatus } from '@/core/ai/providers';
import { AiPlanError, isAbortError, runPlanRounds, type PlanReply } from '@/lib/ai/planValidation';

/**
 * Optional planning through a LOCAL language model served by Ollama (no API key, no cloud,
 * no costs). Server-side only; the endpoint comes from the app's settings file or the
 * environment and is never taken from a plan request. The model fills the flat catalogue
 * plan (planSchema.ts): structured output with the plan's JSON schema, temperature 0,
 * few-shot examples, then the provider-neutral validation with one repair round
 * (planValidation.ts). If the model is off, unreachable, too slow or returns an invalid
 * plan, the client falls back to the rule-based parser and says so.
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

export { DEFAULT_OLLAMA_MODEL };
/** Context for system prompt + few-shot examples + answer (the prompt alone is ~4k tokens). */
export const PLANNER_NUM_CTX = 8192;

/** Normalises an Ollama address ("localhost:11434/" → "http://localhost:11434"). */
export function normalizeOllamaBaseUrl(raw: string): string {
  let baseUrl = raw.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(baseUrl)) baseUrl = `http://${baseUrl}`;
  return baseUrl;
}

/** Ollama settings from environment variables (.env.local); the app's settings file may override them. */
export function readAiConfig(env: Record<string, string | undefined> = process.env): AiConfig {
  const provider = (env.MCB_AI_PROVIDER ?? 'off').trim().toLowerCase() === 'ollama' ? 'ollama' : 'off';
  const timeout = Number.parseInt(env.MCB_AI_TIMEOUT_MS ?? '', 10);
  const think = env.OLLAMA_THINK?.trim().toLowerCase();
  return {
    enabled: provider === 'ollama',
    provider,
    baseUrl: normalizeOllamaBaseUrl(env.OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_BASE_URL),
    model: (env.OLLAMA_MODEL ?? DEFAULT_OLLAMA_MODEL).trim() || DEFAULT_OLLAMA_MODEL,
    timeoutMs: Number.isFinite(timeout) ? Math.min(600_000, Math.max(5_000, timeout)) : 120_000,
    think: think === 'true' ? true : think === 'unset' ? undefined : false,
  };
}

export type { AiStatus };
export { AiPlanError, extractJson, type AiErrorCode } from '@/lib/ai/planValidation';

type FetchLike = typeof fetch;

export async function getAiStatus(config: AiConfig, fetchImpl: FetchLike = fetch): Promise<AiStatus> {
  const base = { enabled: config.enabled, provider: config.provider, model: config.model, installedModels: [] as string[], label: `${config.model} (lokal)` };
  if (!config.enabled) {
    return { ...base, reachable: false, modelInstalled: false, message: AI_OFF_MESSAGE, problem: 'off' };
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
      problem: modelInstalled ? null : 'model',
    };
  } catch (error) {
    return {
      ...base,
      reachable: false,
      modelInstalled: false,
      message: `Ollama ist unter ${config.baseUrl} nicht erreichbar (${isAbortError(error) ? 'Zeitüberschreitung' : (error as Error).message}). Läuft die Ollama-App?`,
      problem: 'unreachable',
    };
  }
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

interface OllamaReply extends PlanReply {
  fromThinking: boolean;
}

/** The plan text of a reply: content, or – if that holds no JSON – the thinking field. */
function replyText(body: OllamaChatBody): OllamaReply {
  const content = body.message?.content ?? '';
  const thinking = body.message?.thinking ?? '';
  if (!content.includes('{') && thinking.includes('{')) return { text: thinking, fromThinking: true };
  return { text: content, fromThinking: false };
}

/** Asks the local model for a plan; one repair round if the first answer is invalid. */
export async function requestAiPlan(config: AiConfig, description: string, fetchImpl: FetchLike = fetch): Promise<AiPlanResult> {
  if (!config.enabled) throw new AiPlanError('disabled', 'Lokale KI ist nicht aktiviert (unter „KI einrichten“ Ollama wählen).');
  const started = Date.now();
  const deadline = started + config.timeoutMs;
  const prompt = plannerMessages(description);
  const format = planJsonSchema();
  let think = config.think;
  let thinkDropped = false;
  const timeoutError = () => new AiPlanError('timeout', `Die lokale KI hat nicht innerhalb von ${Math.round(config.timeoutMs / 1000)} s geantwortet.`);

  /** One round trip to /api/chat (repeated once without "think" if the model rejects it). */
  const ask = async (messages: ChatMessage[]): Promise<OllamaReply> => {
    for (;;) {
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
        if (isAbortError(error)) throw timeoutError();
        throw new AiPlanError('unreachable', `Ollama ist unter ${config.baseUrl} nicht erreichbar: ${(error as Error).message}`);
      }
      if (!res.ok) {
        const text = (await res.text().catch(() => '')).slice(0, 300);
        // Models without reasoning support reject the "think" flag – repeat once without it.
        if (think !== undefined && /think/i.test(text)) {
          think = undefined;
          thinkDropped = true;
          continue;
        }
        if (res.status === 404) {
          throw new AiPlanError('http', `Das Modell ${config.model} ist nicht installiert. Im Terminal: ollama pull ${config.model}`, [text]);
        }
        throw new AiPlanError('http', `Ollama antwortete mit HTTP ${res.status}.`, [text]);
      }
      try {
        return replyText((await res.json()) as OllamaChatBody);
      } catch (error) {
        if (isAbortError(error)) throw timeoutError();
        throw new AiPlanError('http', 'Ollama lieferte keine lesbare Antwort.', [(error as Error).message]);
      }
    }
  };

  const { plan, attempts, reply } = await runPlanRounds(prompt.messages, ask, 'Die lokale KI lieferte keinen gültigen Bauplan.');
  return { plan, model: config.model, durationMs: Date.now() - started, attempts, examples: prompt.exampleIds, fromThinking: reply.fromThinking, thinkDropped };
}
