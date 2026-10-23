import { planJsonSchema, type BuildPlan } from '@/core/ai/planSchema';
import { plannerMessages, type ChatMessage } from '@/core/ai/prompt';
import { AI_NO_KEY_MESSAGE, DEFAULT_OPENROUTER_MODEL, modelDisplayName, type ReasoningEffort } from '@/core/ai/providers';
import { AiPlanError, isAbortError, runPlanRounds, type PlanReply } from '@/lib/ai/planValidation';

/**
 * Planning through a CLOUD model on OpenRouter (https://openrouter.ai, OpenAI-compatible
 * chat API). Server-side only: the API key comes from the app's settings file or
 * OPENROUTER_API_KEY and is never logged, never put into an error message and never sent to
 * the browser.
 *
 * Request (checked against the OpenRouter docs on 23.10.2026):
 * - POST {base}/chat/completions with the same prompt as Ollama (plannerMessages),
 *   temperature 0, `max_tokens` cap per reasoning effort;
 * - `response_format: { type: 'json_schema', json_schema: { name, strict: true, schema } }`
 *   with a strict-mode compatible derivation of the plan's JSON schema (see
 *   toStrictJsonSchema – the Zod check afterwards is the same as for Ollama);
 * - `provider: { require_parameters: true }`: only providers that support every parameter
 *   (above all the JSON schema) are used;
 * - `reasoning: { effort, exclude: true }` (effort "none" switches reasoning off; the reasoning
 *   text is not needed). If no provider accepts temperature/reasoning, the request is repeated
 *   once without them (some reasoning models reject temperature) – the JSON schema stays.
 * The cost of every round comes back in `usage.cost` (US dollars) and is summed up.
 */

export const DEFAULT_OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
/** Cloud models answer within seconds; 60 s also covers a slow repair round. */
export const DEFAULT_OPENROUTER_TIMEOUT_MS = 60_000;
export const OPENROUTER_APP_TITLE = 'Minecraft Christmas Builder';
/** Identifies the app on openrouter.ai; it runs locally and has no public address. */
export const OPENROUTER_APP_REFERER = 'http://localhost';
export const PLAN_SCHEMA_NAME = 'bauplan';

/**
 * Output token cap per round. Reasoning tokens count against it on most providers, so the cap
 * grows with the effort (a plan itself is ~500 tokens). It only limits runaway answers.
 */
export const OPENROUTER_MAX_TOKENS: Readonly<Record<ReasoningEffort, number>> = { none: 2_000, low: 6_000, medium: 12_000 };

export interface OpenRouterConfig {
  /** Null = no key stored. */
  apiKey: string | null;
  model: string;
  reasoning: ReasoningEffort;
  baseUrl: string;
  timeoutMs: number;
}

type FetchLike = typeof fetch;
type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

// ---------------------------------------------------------------------------------------------
// Messages (German, always with what to do)

export const KEY_REJECTED_MESSAGE =
  'Der API-Schlüssel wurde von OpenRouter abgelehnt (ungültig, gelöscht oder deaktiviert). Erstelle unter openrouter.ai/settings/keys einen neuen Schlüssel und trage ihn unter „KI einrichten“ ein.';
export const KEY_UNUSABLE_MESSAGE = 'Der hinterlegte API-Schlüssel enthält unerlaubte Zeichen. Trage ihn unter „KI einrichten“ noch einmal ein.';
export const NO_CREDITS_MESSAGE =
  'Kein Guthaben mehr auf OpenRouter (oder das Ausgabelimit dieses Schlüssels ist erreicht). Lade unter openrouter.ai/settings/credits Guthaben auf oder erhöhe das Limit des Schlüssels.';
export const RATE_LIMIT_MESSAGE = 'Zu viele Anfragen: OpenRouter oder der Modellanbieter bremst gerade (Limit erreicht). Warte etwa eine Minute und versuche es dann noch einmal.';
export const UNREACHABLE_MESSAGE = 'OpenRouter ist nicht erreichbar. Prüfe deine Internetverbindung (oder ob Firewall bzw. Virenschutz die App blockieren) und versuche es noch einmal.';

export function unknownModelMessage(model: string): string {
  return `Das Modell „${model}“ ist bei OpenRouter unbekannt. Wähle unter „KI einrichten“ ein anderes Modell, z. B. ${modelDisplayName(DEFAULT_OPENROUTER_MODEL)}.`;
}

export function unsupportedModelMessage(model: string): string {
  return `Kein Anbieter des Modells „${modelDisplayName(model)}“ unterstützt das Bauplan-Format (strukturierte Ausgabe). Wähle unter „KI einrichten“ eines der empfohlenen Modelle.`;
}

// ---------------------------------------------------------------------------------------------
// Key handling

/** Only printable ASCII may go into the Authorization header (and fetch would echo the value). */
export function isUsableKey(key: string): boolean {
  return /^[\x21-\x7E]+$/.test(key);
}

/** Removes the key – and anything that looks like an OpenRouter key – from a text. */
export function redactKey(text: string, key?: string | null): string {
  let out = key ? text.split(key).join('sk-or-…') : text;
  out = out.replace(/sk-or-[A-Za-z0-9_-]{6,}/g, 'sk-or-…');
  return out;
}

export function openRouterHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': OPENROUTER_APP_REFERER,
    'X-Title': OPENROUTER_APP_TITLE,
  };
}

// ---------------------------------------------------------------------------------------------
// Strict JSON schema

/**
 * Keeps only the JSON-schema keywords every strict structured-output implementation accepts
 * (OpenAI, Anthropic, vLLM/xgrammar …): type, properties, required, additionalProperties,
 * items, enum, const, anyOf, description. Numeric and length limits (minimum, maximum,
 * maxLength, maxItems …) are moved into the description; normalizePlan clamps and the Zod
 * schema enforces them afterwards. Every object gets `additionalProperties: false` and lists
 * all its properties as required.
 */
export function toStrictJsonSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toStrictJsonSchema);
  if (!isObj(node)) return node;
  const out: Obj = {};
  const limits: string[] = [];
  for (const [key, value] of Object.entries(node)) {
    switch (key) {
      case 'properties':
        if (isObj(value)) out.properties = Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toStrictJsonSchema(v)]));
        break;
      case 'items':
      case 'anyOf':
        out[key] = toStrictJsonSchema(value);
        break;
      case 'type':
      case 'enum':
      case 'const':
      case 'description':
        out[key] = value;
        break;
      case 'minimum':
      case 'exclusiveMinimum':
        if (typeof value === 'number' && Math.abs(value) < 1e9) limits.push(`mindestens ${value}`);
        break;
      case 'maximum':
      case 'exclusiveMaximum':
        if (typeof value === 'number' && Math.abs(value) < 1e9) limits.push(`höchstens ${value}`);
        break;
      case 'maxLength':
        limits.push(`höchstens ${String(value)} Zeichen`);
        break;
      case 'maxItems':
        limits.push(`höchstens ${String(value)} Einträge`);
        break;
      default:
        // $schema, minLength, minItems, pattern, format, default … are dropped.
        break;
    }
  }
  if (out.type === 'object') {
    out.additionalProperties = false;
    out.required = Object.keys(isObj(out.properties) ? out.properties : {});
  }
  if (limits.length > 0) out.description = [typeof out.description === 'string' ? out.description : '', limits.join(', ')].filter(Boolean).join(' – ');
  return out;
}

/** The plan schema for `response_format` (strict mode). */
export function strictPlanJsonSchema(): Record<string, unknown> {
  return toStrictJsonSchema(planJsonSchema()) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------------------------
// Errors

/** "No provider can serve these parameters" (require_parameters) or schema rejected. */
const NO_PROVIDER_RE = /no endpoints?|no (allowed |available )?(model )?providers?|requested parameters|routing requirements|structured.?outputs?|response_format|json.?schema/i;
const UNKNOWN_MODEL_RE = /not a valid model|model.{0,40}(not found|does not exist|not exist)|unknown model|invalid model|no such model/i;

/** Maps an OpenRouter HTTP error to an AiPlanError with a German message and a hint. */
export function openRouterError(status: number, upstream: string, config: Pick<OpenRouterConfig, 'model'>, details: string[] = []): AiPlanError {
  if (status === 401) return new AiPlanError('auth', KEY_REJECTED_MESSAGE, details);
  if (status === 402) return new AiPlanError('credits', NO_CREDITS_MESSAGE, details);
  if (status === 429) return new AiPlanError('rate_limit', RATE_LIMIT_MESSAGE, details);
  if (status === 408 || status === 504 || status === 524) {
    return new AiPlanError(
      'timeout',
      `Zeitüberschreitung bei OpenRouter (HTTP ${status}): Das Modell hat zu lange gebraucht. Versuche es noch einmal oder wähle ein schnelleres Modell bzw. eine kürzere Nachdenk-Stufe.`,
      details,
    );
  }
  if ([400, 404, 422, 503].includes(status) && NO_PROVIDER_RE.test(upstream)) {
    return new AiPlanError('unsupported', unsupportedModelMessage(config.model), details);
  }
  if (status === 404 || (status === 400 && UNKNOWN_MODEL_RE.test(upstream))) {
    return new AiPlanError('model', unknownModelMessage(config.model), details);
  }
  if (status === 403) {
    return new AiPlanError(
      'http',
      'OpenRouter hat die Anfrage abgelehnt (HTTP 403, z. B. durch die Moderation oder eine Einschränkung des Schlüssels). Formuliere die Beschreibung anders oder prüfe die Einstellungen des Schlüssels auf openrouter.ai.',
      details,
    );
  }
  if (status >= 500) {
    return new AiPlanError(
      'upstream',
      `OpenRouter oder der Modellanbieter hat gerade eine Störung (HTTP ${status}). Versuche es in ein paar Minuten noch einmal oder wähle ein anderes Modell.`,
      details,
    );
  }
  return new AiPlanError('http', `OpenRouter lehnte die Anfrage ab (HTTP ${status}). Versuche es noch einmal; bleibt der Fehler, wähle ein anderes Modell.`, details);
}

interface UpstreamError {
  message: string;
  details: string[];
}

/** The error text of an OpenRouter error body ({ error: { code, message, metadata } }), key removed. */
function upstreamError(body: unknown, apiKey: string): UpstreamError {
  const error = isObj(body) && isObj(body.error) ? body.error : null;
  const details: string[] = [];
  if (typeof error?.message === 'string' && error.message) details.push(redactKey(error.message, apiKey).slice(0, 300));
  const metadata = error && isObj(error.metadata) ? error.metadata : null;
  if (metadata) {
    const raw = typeof metadata.raw === 'string' ? metadata.raw : metadata.raw === undefined ? '' : JSON.stringify(metadata.raw);
    const provider = typeof metadata.provider_name === 'string' ? `${metadata.provider_name}: ` : '';
    if (raw) details.push(redactKey(`${provider}${raw}`, apiKey).slice(0, 300));
  }
  return { message: details.join(' '), details };
}

async function readUpstreamError(res: Response, apiKey: string): Promise<UpstreamError> {
  const text = await res.text().catch(() => '');
  try {
    return upstreamError(JSON.parse(text), apiKey);
  } catch {
    const message = redactKey(text, apiKey).slice(0, 300);
    return { message, details: message ? [message] : [] };
  }
}

// ---------------------------------------------------------------------------------------------
// Plan request

export interface OpenRouterUsage {
  promptTokens: number;
  completionTokens: number;
  /** Part of completionTokens (billed as output). */
  reasoningTokens: number;
}

export interface OpenRouterPlanResult {
  plan: BuildPlan;
  model: string;
  durationMs: number;
  /** 1 = valid at once, 2 = valid after the repair round. */
  attempts: number;
  examples: string[];
  /** Sum of `usage.cost` of all rounds in US dollars; null if a round did not report it. */
  costUsd: number | null;
  usage: OpenRouterUsage;
  /** Repeated without temperature/reasoning because no provider accepted them. */
  paramsDropped: boolean;
  /** Provider that answered the last round (e.g. "OpenAI"), if reported. */
  provider: string | null;
}

/** The JSON body of one chat completion request. */
export function chatRequestBody(config: Pick<OpenRouterConfig, 'model' | 'reasoning'>, messages: readonly ChatMessage[], options: { sampling: boolean } = { sampling: true }): Record<string, unknown> {
  return {
    model: config.model,
    messages,
    stream: false,
    max_tokens: OPENROUTER_MAX_TOKENS[config.reasoning],
    response_format: { type: 'json_schema', json_schema: { name: PLAN_SCHEMA_NAME, strict: true, schema: strictPlanJsonSchema() } },
    provider: { require_parameters: true },
    ...(options.sampling ? { temperature: 0, reasoning: { effort: config.reasoning, exclude: true } } : {}),
  };
}

interface OpenRouterReply extends PlanReply {
  provider: string | null;
}

const finite = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Text of `choices[0].message.content` (string or content parts); the refusal if there is no content. */
function messageText(message: unknown): string {
  if (!isObj(message)) return '';
  const content = message.content;
  if (typeof content === 'string' && content.trim()) return content;
  if (Array.isArray(content)) {
    const text = content.map((part) => (isObj(part) && typeof part.text === 'string' ? part.text : '')).join('');
    if (text.trim()) return text;
  }
  return typeof message.refusal === 'string' ? message.refusal : '';
}

/** Asks the cloud model for a plan; one repair round if the first answer is invalid. */
export async function requestOpenRouterPlan(config: OpenRouterConfig, description: string, fetchImpl: FetchLike = fetch): Promise<OpenRouterPlanResult> {
  if (!config.apiKey) throw new AiPlanError('no_key', AI_NO_KEY_MESSAGE);
  const apiKey = config.apiKey;
  if (!isUsableKey(apiKey)) throw new AiPlanError('auth', KEY_UNUSABLE_MESSAGE);
  const started = Date.now();
  const deadline = started + config.timeoutMs;
  const prompt = plannerMessages(description);
  let sampling = true;
  let paramsDropped = false;
  const costs: (number | null)[] = [];
  const usage: OpenRouterUsage = { promptTokens: 0, completionTokens: 0, reasoningTokens: 0 };
  const timeoutError = () =>
    new AiPlanError(
      'timeout',
      `OpenRouter hat nicht innerhalb von ${Math.round(config.timeoutMs / 1000)} s geantwortet. Versuche es noch einmal, stelle die Nachdenk-Stufe kürzer oder wähle ein schnelleres Modell.`,
    );

  /** Adds the usage of one answered round (missing usage = cost unknown). */
  const recordUsage = (body: Obj) => {
    const u = isObj(body.usage) ? body.usage : null;
    if (!u) {
      costs.push(null);
      return;
    }
    costs.push(finite(u.cost));
    usage.promptTokens += finite(u.prompt_tokens) ?? 0;
    usage.completionTokens += finite(u.completion_tokens) ?? 0;
    usage.reasoningTokens += (isObj(u.completion_tokens_details) ? finite(u.completion_tokens_details.reasoning_tokens) : null) ?? 0;
  };

  /** One chat completion (repeated once without temperature/reasoning if no provider takes them). */
  const ask = async (messages: ChatMessage[]): Promise<OpenRouterReply> => {
    for (;;) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw timeoutError();
      let res: Response;
      try {
        res = await fetchImpl(`${config.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: openRouterHeaders(apiKey),
          body: JSON.stringify(chatRequestBody(config, messages, { sampling })),
          signal: AbortSignal.timeout(remaining),
        });
      } catch (error) {
        if (isAbortError(error)) throw timeoutError();
        throw new AiPlanError('unreachable', UNREACHABLE_MESSAGE, [redactKey((error as Error).message, apiKey).slice(0, 300)]);
      }
      let failure: AiPlanError | null = null;
      let body: Obj | null = null;
      if (!res.ok) {
        const upstream = await readUpstreamError(res, apiKey);
        failure = openRouterError(res.status, upstream.message, config, upstream.details);
      } else {
        try {
          const parsed: unknown = await res.json();
          body = isObj(parsed) ? parsed : {};
        } catch (error) {
          if (isAbortError(error)) throw timeoutError();
          throw new AiPlanError('upstream', 'OpenRouter lieferte keine lesbare Antwort. Versuche es noch einmal.', [redactKey((error as Error).message, apiKey).slice(0, 300)]);
        }
        // Errors can also arrive with HTTP 200 (in the body or in the choice).
        const choice = Array.isArray(body.choices) && isObj(body.choices[0]) ? body.choices[0] : null;
        const bodyError = isObj(body.error) ? body : choice && isObj(choice.error) ? choice : null;
        if (!bodyError || isObj(body.usage)) recordUsage(body);
        if (bodyError) {
          const upstream = upstreamError(bodyError, apiKey);
          const code = Number((bodyError.error as Obj).code);
          failure = openRouterError(Number.isInteger(code) && code >= 400 ? code : 502, upstream.message, config, upstream.details);
        } else if (!choice) {
          failure = new AiPlanError('upstream', 'OpenRouter lieferte keine Antwort des Modells. Versuche es noch einmal oder wähle ein anderes Modell.');
        }
      }
      if (failure) {
        if (failure.code === 'unsupported' && sampling) {
          sampling = false;
          paramsDropped = true;
          continue;
        }
        throw failure;
      }
      const choice = (body!.choices as Obj[])[0]!;
      return { text: messageText(choice.message), provider: typeof body!.provider === 'string' ? body!.provider : null };
    }
  };

  const totalCost = (): number | null => (costs.some((c) => c === null) ? null : costs.reduce<number>((a, c) => a + (c ?? 0), 0));
  try {
    const { plan, attempts, reply } = await runPlanRounds(
      prompt.messages,
      ask,
      `${modelDisplayName(config.model)} lieferte auch nach einer Korrekturrunde keinen gültigen Bauplan. Formuliere die Beschreibung genauer oder wähle ein anderes Modell.`,
    );
    return {
      plan,
      model: config.model,
      durationMs: Date.now() - started,
      attempts,
      examples: prompt.exampleIds,
      costUsd: totalCost(),
      usage,
      paramsDropped,
      provider: reply.provider,
    };
  } catch (error) {
    // Failed requests can still have cost something (e.g. two invalid answers).
    if (error instanceof AiPlanError && costs.length > 0) error.costUsd = totalCost();
    throw error;
  }
}
