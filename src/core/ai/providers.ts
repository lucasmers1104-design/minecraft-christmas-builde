/**
 * Shared contract of the optional AI planning (server AND browser – no Node imports here).
 *
 * Providers:
 * - "off": rule-based text reading only (default, no network access).
 * - "openrouter": a cloud model through OpenRouter (API key, costs per request).
 * - "ollama": a local model on this PC (no key, no costs).
 *
 * HTTP API of the app (all JSON, all `Cache-Control: no-store`):
 * - GET  /api/ai/settings  → AiSettingsView (never contains the API key, only a masked hint)
 * - PUT  /api/ai/settings  ← AiSettingsUpdate → AiSettingsView (400 { error, issues } if invalid)
 * - GET  /api/ai/status    → AiStatus (checks the active provider; costs nothing)
 * - GET  /api/ai/models    → ModelCatalogResponse (live OpenRouter prices, snapshot as fallback)
 * - POST /api/ai/plan      ← { description } → AiPlanResponse (see app/api/ai/plan/route.ts)
 */

export const AI_PROVIDERS = ['off', 'openrouter', 'ollama'] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export const AI_PROVIDER_LABELS: Record<AiProvider, string> = {
  off: 'Ohne KI',
  openrouter: 'OpenRouter (Cloud)',
  ollama: 'Ollama (lokal)',
};

/** How long a reasoning model may think before it answers. */
export const REASONING_EFFORTS = ['none', 'low', 'medium'] as const;
export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

export const REASONING_LABELS: Record<ReasoningEffort, { label: string; hint: string }> = {
  none: { label: 'Aus', hint: 'Am schnellsten und günstigsten, bei verwinkelten Wünschen etwas ungenauer.' },
  low: { label: 'Kurz', hint: 'Empfohlen: kurzes Nachdenken, kaum teurer und kaum langsamer.' },
  medium: { label: 'Gründlich', hint: 'Langsamer und teurer, nur für sehr lange Beschreibungen sinnvoll.' },
};

/** US dollars per one million tokens. */
export interface ModelPrice {
  inputPerM: number;
  outputPerM: number;
}

export type RecommendationRole = 'recommended' | 'quality' | 'budget';

export interface RecommendedModel {
  /** OpenRouter model id. */
  id: string;
  name: string;
  vendor: string;
  role: RecommendationRole;
  roleLabel: string;
  /** One sentence: why this model. */
  summary: string;
  /** Typical time for one plan with the recommended reasoning setting. */
  speed: string;
  reasoning: ReasoningEffort;
  /** Price snapshot (PRICES_AS_OF); the app shows live prices when it can reach OpenRouter. */
  snapshot: ModelPrice;
  /** Honest limitation, shown under the card. */
  caveat?: string;
}

/** Date of the price snapshot and of the benchmark figures behind the recommendations. */
export const PRICES_AS_OF = '2026-10-23';

/**
 * Recommendations for this app's task (German wish → strict JSON plan from a fixed catalogue).
 * Sources (23.10.2026): OpenRouter model and endpoint API (prices, structured-output support),
 * Artificial Analysis (Intelligence Index, speed, time to first token). Not yet measured with
 * this app's test set – that is what `MCB_AI_TESTSET=1` is for (docs/KI.md).
 */
export const OPENROUTER_RECOMMENDED: readonly RecommendedModel[] = [
  {
    id: 'openai/gpt-6-luna',
    name: 'GPT-6 Luna',
    vendor: 'OpenAI',
    role: 'recommended',
    roleLabel: 'Empfehlung',
    summary: 'Schnell, sehr günstig und hält das Bauplan-Format zuverlässig ein.',
    speed: 'ca. 5 s',
    reasoning: 'low',
    snapshot: { inputPerM: 0.1, outputPerM: 0.5 },
  },
  {
    id: 'anthropic/claude-haiku-5.5',
    name: 'Claude Haiku 5.5',
    vendor: 'Anthropic',
    role: 'quality',
    roleLabel: 'Beste Qualität',
    summary: 'Versteht lange und verwinkelte Wünsche am besten, gleicher Preis pro Token.',
    speed: 'ca. 10 s',
    reasoning: 'low',
    snapshot: { inputPerM: 0.1, outputPerM: 0.5 },
    caveat: 'Denkt ausführlicher nach – dadurch etwas langsamer und pro Plan etwas teurer.',
  },
  {
    id: 'inclusionai/ling-3.1-flash',
    name: 'Ling 3.1 Flash',
    vendor: 'inclusionAI',
    role: 'budget',
    roleLabel: 'Am günstigsten',
    summary: 'Etwa halb so teuer wie die Empfehlung, bei kurzen Wünschen kaum schlechter.',
    speed: 'ca. 4 s',
    reasoning: 'low',
    snapshot: { inputPerM: 0.075, outputPerM: 0.225 },
    caveat: 'Strenges JSON nur bei einem Anbieter (DeepInfra) – fällt der aus, schlägt die Planung fehl.',
  },
];

export const DEFAULT_OPENROUTER_MODEL = 'openai/gpt-6-luna';
export const DEFAULT_REASONING: ReasoningEffort = 'low';
export const DEFAULT_OLLAMA_BASE_URL = 'http://127.0.0.1:11434';
export const DEFAULT_OLLAMA_MODEL = 'qwen3:14b';
export const OPENROUTER_KEYS_URL = 'https://openrouter.ai/settings/keys';
export const OPENROUTER_CREDITS_URL = 'https://openrouter.ai/settings/credits';

/**
 * Typical tokens of one plan request (measured prompt: ~15,800 characters plus the JSON
 * schema; answer ~450 tokens). Reasoning tokens are an estimate and billed as output.
 */
export const PLAN_TOKEN_ESTIMATE = {
  input: 6000,
  output: 500,
  reasoning: { none: 0, low: 800, medium: 2500 } satisfies Record<ReasoningEffort, number>,
} as const;

/** Estimated cost of one plan in US dollars (without the occasional repair round). */
export function estimatePlanCostUsd(price: ModelPrice, effort: ReasoningEffort): number {
  const output = PLAN_TOKEN_ESTIMATE.output + PLAN_TOKEN_ESTIMATE.reasoning[effort];
  return (PLAN_TOKEN_ESTIMATE.input * price.inputPerM + output * price.outputPerM) / 1_000_000;
}

/** Plans per US dollar for a cost per plan (rounded down to a readable step). */
export function plansPerDollar(costUsd: number): number {
  if (!(costUsd > 0)) return 0;
  const n = 1 / costUsd;
  const step = n >= 1000 ? 100 : n >= 100 ? 10 : 1;
  return Math.floor(n / step) * step;
}

const deNumber = (value: number, digits: number) =>
  value.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** "0,09 Cent", "1,2 Cent", "12 Cent" – costs per plan are tiny, cents read better. */
export function formatUsdCents(usd: number): string {
  const cents = usd * 100;
  if (cents < 0.01) return '< 0,01 Cent';
  if (cents < 1) return `${deNumber(cents, 2)} Cent`;
  if (cents < 10) return `${deNumber(cents, 1)} Cent`;
  return `${deNumber(cents, 0)} Cent`;
}

/** "9,42 $" */
export function formatUsd(usd: number): string {
  return `${deNumber(usd, 2)} $`;
}

/** "0,10 $ / 0,50 $ je 1 Mio. Tokens (Eingabe / Ausgabe)" in short form. */
export function formatPricePerM(price: ModelPrice): string {
  const f = (v: number) => (v < 0.1 ? deNumber(v, 3) : deNumber(v, 2));
  return `${f(price.inputPerM)} $ / ${f(price.outputPerM)} $`;
}

/** Loose shape check of an OpenRouter key ("sk-or-v1-…"); the real check is the status call. */
export function looksLikeOpenRouterKey(key: string): boolean {
  return /^sk-or-[A-Za-z0-9_-]{16,}$/.test(key.trim());
}

/** Masked key for display, e.g. "sk-or-v1-…a1b2". Never send the full key to the browser. */
export function maskKey(key: string): string {
  const k = key.trim();
  if (k.length <= 12) return '…';
  const prefix = k.startsWith('sk-or-v1-') ? 'sk-or-v1-' : k.slice(0, 6);
  return `${prefix}…${k.slice(-4)}`;
}

/** Display name of a model id ("openai/gpt-6-luna" → "GPT-6 Luna"); unknown ids stay as they are. */
export function modelDisplayName(id: string): string {
  return OPENROUTER_RECOMMENDED.find((m) => m.id === id)?.name ?? id;
}

/** Header badge text for a building planned by an AI. */
export function plannerBadgeText(plan: { model: string; source?: AiProvider }): string {
  return plan.source === 'openrouter' ? `KI-Plan: ${modelDisplayName(plan.model)} (OpenRouter)` : `KI-Plan: ${plan.model} (lokal)`;
}

/** What the browser may see of the settings. The API key itself never leaves the server. */
export interface AiSettingsView {
  provider: AiProvider;
  /** Where the active settings come from: the app's settings file, .env.local, or defaults. */
  source: 'app' | 'env' | 'default';
  openrouter: {
    model: string;
    reasoning: ReasoningEffort;
    hasKey: boolean;
    /** Masked key ("sk-or-v1-…a1b2") or null. */
    keyHint: string | null;
    /** The key comes from OPENROUTER_API_KEY in .env.local (cannot be removed in the app). */
    keyFromEnv: boolean;
  };
  ollama: { baseUrl: string; model: string };
  /** Where the app stores the settings (shown to the user), e.g. ".mcb-local/ai-settings.json". */
  storedIn: string;
}

/** PUT body. Omitted fields keep their value. `apiKey: null` removes the stored key. */
export interface AiSettingsUpdate {
  provider: AiProvider;
  openrouter?: { model?: string; reasoning?: ReasoningEffort; apiKey?: string | null };
  ollama?: { baseUrl?: string; model?: string };
}

export interface AiStatus {
  enabled: boolean;
  provider: AiProvider;
  model: string;
  /** Ollama: server answers. OpenRouter: API reachable AND key accepted. */
  reachable: boolean;
  /** Ollama: model pulled. OpenRouter: model exists and offers structured output. */
  modelInstalled: boolean;
  /** Ollama only. */
  installedModels: string[];
  /** One German sentence for the user (what works, or what to do next). */
  message: string;
  /** Display label, e.g. "GPT-6 Luna über OpenRouter" or "qwen3:14b (lokal)". */
  label?: string;
  /** OpenRouter: remaining credit in US dollars if the key reports one, else null. */
  creditUsd?: number | null;
  /** OpenRouter: live price of the active model. */
  price?: ModelPrice | null;
}

export interface ModelInfo {
  id: string;
  name: string;
  price: ModelPrice | null;
  contextLength: number | null;
  /** At least one provider offers strict JSON schema output. */
  structuredOutputs: boolean;
}

export interface ModelCatalogResponse {
  /** True if the prices were just fetched from OpenRouter, false = snapshot of PRICES_AS_OF. */
  live: boolean;
  fetchedAt: string | null;
  /** The recommended models (always) plus the requested model, if any. */
  models: ModelInfo[];
  message?: string;
}
