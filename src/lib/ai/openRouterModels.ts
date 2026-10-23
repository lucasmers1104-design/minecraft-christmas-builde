import {
  AI_NO_KEY_MESSAGE,
  DEFAULT_OPENROUTER_MODEL,
  modelDisplayName,
  OPENROUTER_RECOMMENDED,
  PRICES_AS_OF,
  type AiStatus,
  type ModelCatalogResponse,
  type ModelInfo,
  type ModelPrice,
} from '@/core/ai/providers';
import { isAbortError } from '@/lib/ai/planValidation';
import {
  isUsableKey,
  KEY_REJECTED_MESSAGE,
  KEY_UNUSABLE_MESSAGE,
  NO_CREDITS_MESSAGE,
  OPENROUTER_APP_REFERER,
  OPENROUTER_APP_TITLE,
  openRouterHeaders,
  redactKey,
  type OpenRouterConfig,
} from '@/lib/ai/openRouterPlanner';

/**
 * OpenRouter's model list (prices, context, supported parameters) and the free status check
 * (key, credit, model). Nothing here costs money: GET /models, GET /key and GET /credits are
 * not billed. The model list is kept in memory for one hour.
 */

type FetchLike = typeof fetch;
type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const finite = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export const MODEL_LIST_TTL_MS = 60 * 60 * 1000;
const STATUS_TIMEOUT_MS = 5_000;
const CREDITS_TIMEOUT_MS = 3_000;

export interface OpenRouterModelEntry extends ModelInfo {
  supportedParameters: string[];
}

export interface OpenRouterModelList {
  /** Date.now() of the fetch. */
  fetchedAt: number;
  models: ReadonlyMap<string, OpenRouterModelEntry>;
}

const cache = new Map<string, OpenRouterModelList>();
const inflight = new Map<string, Promise<OpenRouterModelList>>();

/** For tests: forget the cached model lists. */
export function resetOpenRouterModelCache(): void {
  cache.clear();
  inflight.clear();
}

/** Price string in US dollars per token → dollars per million tokens (null if unknown/negative). */
function perMillion(raw: unknown): number | null {
  const n = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : finite(raw);
  if (n === null || !Number.isFinite(n) || n < 0) return null;
  return Number((n * 1_000_000).toPrecision(10));
}

function toEntry(raw: unknown): OpenRouterModelEntry | null {
  if (!isObj(raw) || typeof raw.id !== 'string' || raw.id === '') return null;
  const pricing = isObj(raw.pricing) ? raw.pricing : {};
  const input = perMillion(pricing.prompt);
  const output = perMillion(pricing.completion);
  const supportedParameters = Array.isArray(raw.supported_parameters) ? raw.supported_parameters.filter((p): p is string => typeof p === 'string') : [];
  return {
    id: raw.id,
    name: typeof raw.name === 'string' && raw.name ? raw.name : raw.id,
    price: input !== null && output !== null ? { inputPerM: input, outputPerM: output } : null,
    contextLength: finite(raw.context_length),
    structuredOutputs: supportedParameters.includes('structured_outputs'),
    available: true,
    supportedParameters,
  };
}

/**
 * GET {base}/models (all models in one response), cached for an hour per base URL; parallel
 * callers share one request. Throws if the list cannot be fetched.
 */
export async function getOpenRouterModels(options: { baseUrl: string; apiKey?: string | null; fetchImpl?: FetchLike; timeoutMs?: number }): Promise<OpenRouterModelList> {
  const { baseUrl, apiKey, fetchImpl = fetch, timeoutMs = STATUS_TIMEOUT_MS } = options;
  const hit = cache.get(baseUrl);
  if (hit && Date.now() - hit.fetchedAt < MODEL_LIST_TTL_MS) return hit;
  const pending = inflight.get(baseUrl);
  if (pending) return pending;
  const request = (async () => {
    // The list is public; the key is sent along when there is one.
    const headers = apiKey && isUsableKey(apiKey) ? openRouterHeaders(apiKey) : { 'HTTP-Referer': OPENROUTER_APP_REFERER, 'X-Title': OPENROUTER_APP_TITLE };
    const res = await fetchImpl(`${baseUrl}/models`, { headers, signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as unknown;
    const data = isObj(body) && Array.isArray(body.data) ? body.data : [];
    const models = new Map<string, OpenRouterModelEntry>();
    for (const raw of data) {
      const entry = toEntry(raw);
      if (entry) models.set(entry.id, entry);
    }
    if (models.size === 0) throw new Error('leere Modellliste');
    const list: OpenRouterModelList = { fetchedAt: Date.now(), models };
    cache.set(baseUrl, list);
    return list;
  })().finally(() => inflight.delete(baseUrl));
  inflight.set(baseUrl, request);
  return request;
}

/** "2026-10-23" → "23.10.2026". */
function germanDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function publicInfo(entry: OpenRouterModelEntry): ModelInfo {
  const recommended = OPENROUTER_RECOMMENDED.find((m) => m.id === entry.id);
  return {
    id: entry.id,
    name: recommended?.name ?? entry.name,
    price: entry.price,
    contextLength: entry.contextLength,
    structuredOutputs: entry.structuredOutputs,
    available: true,
  };
}

/** Snapshot info (PRICES_AS_OF) when the live list is not reachable; unknown models stay unchecked. */
function snapshotInfo(id: string): ModelInfo {
  const recommended = OPENROUTER_RECOMMENDED.find((m) => m.id === id);
  if (recommended) return { id, name: recommended.name, price: recommended.snapshot, contextLength: null, structuredOutputs: true };
  return { id, name: id, price: null, contextLength: null, structuredOutputs: false };
}

/** Recommended models (always) plus `requested`, with live prices or the snapshot as fallback. */
export async function buildModelCatalog(options: {
  baseUrl: string;
  apiKey?: string | null;
  requested?: string | null;
  fetchImpl?: FetchLike;
}): Promise<ModelCatalogResponse> {
  const ids = OPENROUTER_RECOMMENDED.map((m) => m.id);
  const requested = options.requested ?? null;
  if (requested && !ids.includes(requested)) ids.push(requested);
  try {
    const list = await getOpenRouterModels(options);
    const models = ids.map((id): ModelInfo => {
      const entry = list.models.get(id);
      return entry ? publicInfo(entry) : { id, name: modelDisplayName(id), price: null, contextLength: null, structuredOutputs: false, available: false };
    });
    const missing = requested !== null && !list.models.has(requested);
    return {
      live: true,
      fetchedAt: new Date(list.fetchedAt).toISOString(),
      models,
      ...(missing
        ? { message: `Das Modell „${requested}“ steht nicht in der aktuellen Modellliste von OpenRouter. Prüfe die Schreibweise (Beispiel: „${DEFAULT_OPENROUTER_MODEL}“).` }
        : {}),
    };
  } catch {
    return {
      live: false,
      fetchedAt: null,
      models: ids.map(snapshotInfo),
      message: `Die aktuellen Preise von OpenRouter sind gerade nicht abrufbar. Angezeigt werden die Preise vom ${germanDate(PRICES_AS_OF)}.`,
    };
  }
}

// ---------------------------------------------------------------------------------------------
// Status

type KeyCheck =
  | { kind: 'ok'; creditUsd: number | null; freeTier: boolean }
  | { kind: 'rejected' }
  | { kind: 'unreachable'; detail: string }
  | { kind: 'error'; status: number };

/** Remaining account credit via GET /credits (works only for some keys; null otherwise). */
async function fetchCredits(config: OpenRouterConfig, apiKey: string, fetchImpl: FetchLike): Promise<number | null> {
  try {
    const res = await fetchImpl(`${config.baseUrl}/credits`, { headers: openRouterHeaders(apiKey), signal: AbortSignal.timeout(CREDITS_TIMEOUT_MS) });
    if (!res.ok) return null;
    const body = (await res.json()) as unknown;
    const data = isObj(body) && isObj(body.data) ? body.data : null;
    const total = finite(data?.total_credits);
    const used = finite(data?.total_usage);
    return total !== null && used !== null ? Math.round((total - used) * 1e6) / 1e6 : null;
  } catch {
    return null;
  }
}

/** GET /key: is the key accepted, and how much may it still spend? */
async function checkKey(config: OpenRouterConfig, apiKey: string, fetchImpl: FetchLike): Promise<KeyCheck> {
  try {
    const res = await fetchImpl(`${config.baseUrl}/key`, { headers: openRouterHeaders(apiKey), signal: AbortSignal.timeout(STATUS_TIMEOUT_MS) });
    if (res.status === 401 || res.status === 403) return { kind: 'rejected' };
    if (!res.ok) return { kind: 'error', status: res.status };
    const body = (await res.json()) as unknown;
    const data = isObj(body) && isObj(body.data) ? body.data : {};
    // limit_remaining: what is left of the key's own spending limit (null = no limit).
    const creditUsd = finite(data.limit_remaining) ?? (await fetchCredits(config, apiKey, fetchImpl));
    return { kind: 'ok', creditUsd, freeTier: data.is_free_tier === true };
  } catch (error) {
    return { kind: 'unreachable', detail: isAbortError(error) ? 'Zeitüberschreitung' : redactKey((error as Error).message, apiKey).slice(0, 120) };
  }
}

/**
 * Status of the OpenRouter connection without spending anything: key accepted (GET /key,
 * credit if reported), model exists and offers structured output (model list).
 */
export async function getOpenRouterStatus(config: OpenRouterConfig, fetchImpl: FetchLike = fetch): Promise<AiStatus> {
  const name = modelDisplayName(config.model);
  const label = `${name} über OpenRouter`;
  const snapshot: ModelPrice | null = OPENROUTER_RECOMMENDED.find((m) => m.id === config.model)?.snapshot ?? null;
  const base = { enabled: true, provider: 'openrouter' as const, model: config.model, installedModels: [] as string[], label, creditUsd: null, price: snapshot };
  if (!config.apiKey) return { ...base, reachable: false, modelInstalled: false, message: AI_NO_KEY_MESSAGE, problem: 'no_key' };
  const apiKey = config.apiKey;
  if (!isUsableKey(apiKey)) return { ...base, reachable: false, modelInstalled: false, message: KEY_UNUSABLE_MESSAGE, problem: 'key' };

  const [key, list] = await Promise.all([
    checkKey(config, apiKey, fetchImpl),
    getOpenRouterModels({ baseUrl: config.baseUrl, apiKey, fetchImpl }).catch(() => null),
  ]);
  const entry = list?.models.get(config.model) ?? null;
  const modelProblem =
    list === null
      ? 'Die Modellliste von OpenRouter ist gerade nicht abrufbar, deshalb ist das Modell noch nicht geprüft. Versuche es gleich noch einmal.'
      : entry === null
        ? `Das Modell „${config.model}“ gibt es bei OpenRouter nicht (mehr). Wähle unter „KI einrichten“ ein anderes Modell.`
        : !entry.structuredOutputs
          ? `Das Modell „${name}“ unterstützt kein strenges JSON-Format (strukturierte Ausgabe), das die App für den Bauplan braucht. Wähle unter „KI einrichten“ eines der empfohlenen Modelle.`
          : null;
  const common = { ...base, price: entry?.price ?? snapshot, modelInstalled: modelProblem === null };
  const freeModel = config.model.endsWith(':free');

  switch (key.kind) {
    case 'unreachable':
      return { ...common, reachable: false, message: `OpenRouter ist nicht erreichbar (${key.detail}). Prüfe deine Internetverbindung und versuche es noch einmal.`, problem: 'unreachable' };
    case 'error':
      return { ...common, reachable: false, message: `OpenRouter antwortet gerade nicht richtig (HTTP ${key.status}). Versuche es in ein paar Minuten noch einmal.`, problem: 'unreachable' };
    case 'rejected':
      return { ...common, reachable: false, message: KEY_REJECTED_MESSAGE, problem: 'key' };
    case 'ok': {
      const creditUsd = key.creditUsd;
      if (creditUsd !== null && creditUsd <= 0 && !freeModel) return { ...common, reachable: false, creditUsd, message: NO_CREDITS_MESSAGE, problem: 'credits' };
      if (modelProblem) return { ...common, reachable: true, creditUsd, message: `Der API-Schlüssel ist gültig. ${modelProblem}`, problem: 'model' };
      const hint =
        key.freeTier && creditUsd === null && !freeModel
          ? ' Hinweis: Laut OpenRouter wurde auf deinem Konto noch kein Guthaben gekauft – ohne Guthaben schlagen Anfragen fehl.'
          : '';
      return { ...common, reachable: true, creditUsd, message: `Bereit: ${label}.${hint}`, problem: null };
    }
  }
}
