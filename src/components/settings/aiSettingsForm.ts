/**
 * Pure form logic of the AI settings dialog: draft state, validation and the PUT body.
 * No React here, so the rules stay easy to read and to test.
 */
import {
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_OLLAMA_MODEL,
  DEFAULT_OPENROUTER_MODEL,
  DEFAULT_REASONING,
  OPENROUTER_RECOMMENDED,
  PRICES_AS_OF,
  type AiProvider,
  type AiSettingsUpdate,
  type AiSettingsView,
  type ModelCatalogResponse,
  type ModelPrice,
  type ReasoningEffort,
} from '@/core/ai/providers';

/** What happens with an already stored OpenRouter key. */
export type KeyAction = 'keep' | 'replace' | 'remove';

export interface AiSettingsDraft {
  provider: AiProvider;
  /** Chosen recommended model (used while `customModel` is empty). */
  card: string;
  /** Free OpenRouter model id; wins over `card` when not empty. */
  customModel: string;
  reasoning: ReasoningEffort;
  /** Newly typed key. Never pre-filled: the server does not send the stored key. */
  apiKey: string;
  keyAction: KeyAction;
  ollamaBaseUrl: string;
  ollamaModel: string;
}

export type DraftIssues = Partial<Record<'apiKey' | 'customModel' | 'ollamaBaseUrl' | 'ollamaModel', string>>;

export function isRecommendedModel(id: string): boolean {
  return OPENROUTER_RECOMMENDED.some((m) => m.id === id);
}

export function draftFromView(view: AiSettingsView): AiSettingsDraft {
  const model = view.openrouter.model.trim() || DEFAULT_OPENROUTER_MODEL;
  const known = isRecommendedModel(model);
  return {
    provider: view.provider,
    card: known ? model : DEFAULT_OPENROUTER_MODEL,
    customModel: known ? '' : model,
    reasoning: view.openrouter.reasoning ?? DEFAULT_REASONING,
    apiKey: '',
    keyAction: 'keep',
    ollamaBaseUrl: view.ollama.baseUrl.trim() || DEFAULT_OLLAMA_BASE_URL,
    ollamaModel: view.ollama.model.trim() || DEFAULT_OLLAMA_MODEL,
  };
}

/** The OpenRouter model id the draft would save. */
export function effectiveModel(draft: AiSettingsDraft): string {
  return draft.customModel.trim() || draft.card;
}

/** True if the key input is shown (no stored key, or the user wants to replace it). */
export function keyInputVisible(view: AiSettingsView, draft: AiSettingsDraft): boolean {
  return !view.openrouter.hasKey || draft.keyAction === 'replace';
}

/** True if the server will have an OpenRouter key after saving this draft. */
export function willHaveKey(view: AiSettingsView, draft: AiSettingsDraft): boolean {
  if (keyInputVisible(view, draft) && draft.apiKey.trim()) return true;
  return view.openrouter.hasKey && draft.keyAction !== 'remove';
}

/** Rough shape of an OpenRouter model id: "vendor/model" without spaces. */
export function looksLikeModelId(id: string): boolean {
  return /^[A-Za-z0-9][\w.-]*\/[\w.:@-]+$/.test(id);
}

/** Blocking problems; the field shows the message. The key shape is only a soft warning. */
export function validateDraft(view: AiSettingsView, draft: AiSettingsDraft): DraftIssues {
  const issues: DraftIssues = {};
  if (draft.provider === 'openrouter') {
    if (!willHaveKey(view, draft)) {
      issues.apiKey =
        draft.keyAction === 'remove'
          ? 'Ohne Schlüssel funktioniert OpenRouter nicht. Trage einen neuen ein oder wähle „Ohne KI“.'
          : 'Trage deinen OpenRouter-Schlüssel ein – ohne ihn kann die App OpenRouter nicht nutzen.';
    }
    const custom = draft.customModel.trim();
    if (custom && !looksLikeModelId(custom)) {
      issues.customModel = 'Eine Modell-ID hat die Form anbieter/modell, ohne Leerzeichen – z. B. openai/gpt-6-luna.';
    }
  }
  if (draft.provider === 'ollama') {
    if (!isHttpUrl(draft.ollamaBaseUrl.trim())) {
      issues.ollamaBaseUrl = `Gib eine Adresse wie ${DEFAULT_OLLAMA_BASE_URL} ein.`;
    }
    if (!draft.ollamaModel.trim()) issues.ollamaModel = `Gib den Namen eines Ollama-Modells ein, z. B. ${DEFAULT_OLLAMA_MODEL}.`;
  }
  return issues;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * PUT body: only fields that changed. Exceptions:
 * - The key is sent only when one was typed (and OpenRouter is chosen); `null` removes it.
 * - When the current values come from .env.local or the defaults (`source !== 'app'`), the
 *   chosen provider's values are written as shown, so the app file holds what the user saw.
 */
export function buildUpdate(view: AiSettingsView, draft: AiSettingsDraft): AiSettingsUpdate {
  const pin = view.source !== 'app';
  const update: AiSettingsUpdate = { provider: draft.provider };

  const openrouter: NonNullable<AiSettingsUpdate['openrouter']> = {};
  const pinOpenRouter = pin && draft.provider === 'openrouter';
  const model = effectiveModel(draft);
  if (model !== view.openrouter.model || pinOpenRouter) openrouter.model = model;
  if (draft.reasoning !== view.openrouter.reasoning || pinOpenRouter) openrouter.reasoning = draft.reasoning;
  const key = draft.apiKey.trim();
  if (draft.provider === 'openrouter' && key && keyInputVisible(view, draft)) openrouter.apiKey = key;
  else if (draft.keyAction === 'remove' && view.openrouter.hasKey && !view.openrouter.keyFromEnv) openrouter.apiKey = null;
  if (Object.keys(openrouter).length > 0) update.openrouter = openrouter;

  const ollama: NonNullable<AiSettingsUpdate['ollama']> = {};
  const pinOllama = pin && draft.provider === 'ollama';
  const baseUrl = draft.ollamaBaseUrl.trim();
  const ollamaModel = draft.ollamaModel.trim();
  if (baseUrl !== view.ollama.baseUrl || pinOllama) ollama.baseUrl = baseUrl;
  if (ollamaModel !== view.ollama.model || pinOllama) ollama.model = ollamaModel;
  if (Object.keys(ollama).length > 0) update.ollama = ollama;

  return update;
}

/** Price of a model: live from the catalogue when available, else the snapshot (if known). */
export function priceOf(id: string, catalog: ModelCatalogResponse | null): { price: ModelPrice | null; live: boolean } {
  const live = catalog?.live ? catalog.models.find((m) => m.id === id)?.price ?? null : null;
  if (live) return { price: live, live: true };
  return { price: OPENROUTER_RECOMMENDED.find((m) => m.id === id)?.snapshot ?? null, live: false };
}

/** "23.10.2026" from PRICES_AS_OF. */
export function pricesAsOfLabel(): string {
  const [y, m, d] = PRICES_AS_OF.split('-');
  return `${d}.${m}.${y}`;
}
