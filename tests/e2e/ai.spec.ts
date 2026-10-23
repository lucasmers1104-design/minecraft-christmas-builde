import { expect, test, type Page } from '@playwright/test';
import type { AiSettingsUpdate, AiSettingsView, AiStatus, ModelCatalogResponse } from '../../src/core/ai/providers';
import { waitForRenderedModel } from './helpers';

/**
 * UI behaviour of the optional AI planning. The AI endpoints are intercepted here (no model
 * can run in CI, no real OpenRouter key exists); the real clients are covered by the
 * integration tests against fake servers. The block generation itself is real.
 */
const READY = {
  enabled: true,
  provider: 'ollama',
  model: 'qwen3:14b',
  reachable: true,
  modelInstalled: true,
  installedModels: ['qwen3:14b'],
  message: 'Lokale KI bereit (Ollama, Modell qwen3:14b).',
};

async function mockStatus(page: Page, status: object) {
  await page.route('**/api/ai/status', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(status) }));
}

test('ohne aktivierte KI: ehrlich als regelbasiert gekennzeichnet, Schalter gesperrt', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('ai-status')).toContainText('nicht aktiviert');
  await expect(page.getByTestId('ai-toggle')).toBeDisabled();
  await expect(page.getByTestId('generator-mode')).toContainText('keine KI aktiv');
  await page.getByTestId('generate-button').click();
  await waitForRenderedModel(page);
  await expect(page.getByTestId('planner-badge')).toHaveText('Regelbasierter Generator');
});

test('mit bereiter lokaler KI: Plan wird angezeigt, angewendet und gekennzeichnet', async ({ page }) => {
  await mockStatus(page, READY);
  let planCalls = 0;
  await page.route('**/api/ai/plan', async (route) => {
    planCalls++;
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        source: 'ollama',
        model: 'qwen3:14b',
        durationMs: 4200,
        attempts: 1,
        plan: { kind: 'station', size: 'small', explanation: 'Ein kleiner Winterbahnhof.', unsupported: ['Dampflok'] },
        patch: { kind: 'station', size: 'small' },
      }),
    });
  });
  await page.goto('/');
  await expect(page.getByTestId('ai-status')).toHaveAttribute('data-ready', 'true');
  await page.getByTestId('ai-toggle').check();
  await expect(page.getByTestId('generator-mode')).toContainText('lokale KI (qwen3:14b)');
  await page.getByTestId('prompt-input').fill('Ein kleiner Bahnhof mit Dampflok');
  await page.getByTestId('generate-button').click();
  await expect(page.getByTestId('building-title')).toHaveText('Weihnachtlicher Bahnhof · Rustikal');
  await waitForRenderedModel(page);
  await expect(page.getByTestId('ai-plan')).toContainText('Ein kleiner Winterbahnhof.');
  await expect(page.getByTestId('ai-unsupported')).toContainText('Dampflok');
  await expect(page.getByTestId('planner-badge')).toHaveText('KI-Plan: qwen3:14b (lokal)');
  await expect(page.getByTestId('control-kind')).toContainText('von KI');
  // Same text again: the existing plan is reused, the model is not asked twice.
  await page.getByTestId('generate-button').click();
  await waitForRenderedModel(page);
  expect(planCalls).toBe(1);
});

test('KI-Fehler: regelbasierter Fallback mit Hinweis', async ({ page }) => {
  await mockStatus(page, READY);
  await page.route('**/api/ai/plan', (route) =>
    route.fulfill({ status: 504, contentType: 'application/json', body: JSON.stringify({ error: 'Die lokale KI hat nicht innerhalb von 120 s geantwortet.', code: 'timeout' }) }),
  );
  await page.goto('/');
  await page.getByTestId('ai-toggle').check();
  await page.getByTestId('prompt-input').fill('kleines Haus aus Eiche');
  await page.getByTestId('generate-button').click();
  await waitForRenderedModel(page);
  await expect(page.getByTestId('ai-notice')).toContainText('regelbasiert erzeugt');
  await expect(page.getByTestId('planner-badge')).toHaveText('Regelbasierter Generator');
  await expect(page.getByTestId('preview-dimensions')).toContainText('31 × 15 × 29');
});

// ---------------------------------------------------------------------------------------------
// Settings dialog "KI einrichten" against a mocked settings API (the key never comes back).

const KEY = 'sk-or-v1-0123456789abcdef0123456789abcdef0123456789abcdef0123456789a1b2';

const SETTINGS_DEFAULT: AiSettingsView = {
  provider: 'off',
  source: 'default',
  openrouter: { model: 'openai/gpt-6-luna', reasoning: 'low', hasKey: false, keyHint: null, keyFromEnv: false },
  ollama: { baseUrl: 'http://127.0.0.1:11434', model: 'qwen3:14b' },
  storedIn: '.mcb-local/ai-settings.json',
};

const STATUS_OFF: AiStatus = {
  enabled: false,
  provider: 'off',
  model: '',
  reachable: false,
  modelInstalled: false,
  installedModels: [],
  message: 'KI-Planung ist nicht aktiviert – es plant die eingebaute Texterkennung.',
};

const STATUS_OPENROUTER_READY: AiStatus = {
  enabled: true,
  provider: 'openrouter',
  model: 'openai/gpt-6-luna',
  reachable: true,
  modelInstalled: true,
  installedModels: [],
  message: 'OpenRouter bereit: Schlüssel gültig, Modell unterstützt strukturierte Ausgabe.',
  label: 'GPT-6 Luna über OpenRouter',
  creditUsd: 9.42,
  price: { inputPerM: 0.1, outputPerM: 0.5 },
};

const CATALOG: ModelCatalogResponse = {
  live: true,
  fetchedAt: '2026-10-23T10:00:00.000Z',
  models: [
    { id: 'openai/gpt-6-luna', name: 'OpenAI: GPT-6 Luna', price: { inputPerM: 0.1, outputPerM: 0.5 }, contextLength: 400000, structuredOutputs: true },
    { id: 'anthropic/claude-haiku-5.5', name: 'Anthropic: Claude Haiku 5.5', price: { inputPerM: 0.1, outputPerM: 0.5 }, contextLength: 200000, structuredOutputs: true },
    { id: 'inclusionai/ling-3.1-flash', name: 'inclusionAI: Ling 3.1 Flash', price: { inputPerM: 0.075, outputPerM: 0.225 }, contextLength: 128000, structuredOutputs: true },
  ],
};

/** Mocked /api/ai/{settings,status,models}; PUT applies the update like the real server. */
async function mockAiBackend(page: Page, start: { settings: AiSettingsView; status: AiStatus }) {
  const state = {
    settings: structuredClone(start.settings),
    status: structuredClone(start.status),
    puts: [] as AiSettingsUpdate[],
    getBodies: [] as string[],
    /** Answer for the next PUT instead of applying it (e.g. a 400 with issues). */
    nextPutError: null as null | { status: number; body: object },
  };
  await page.route('**/api/ai/settings', async (route) => {
    const request = route.request();
    if (request.method() === 'PUT') {
      const update = request.postDataJSON() as AiSettingsUpdate;
      state.puts.push(update);
      if (state.nextPutError) {
        const { status, body } = state.nextPutError;
        state.nextPutError = null;
        return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      }
      const s = state.settings;
      const or = update.openrouter ?? {};
      state.settings = {
        ...s,
        provider: update.provider,
        source: 'app',
        openrouter: {
          ...s.openrouter,
          ...(or.model ? { model: or.model } : {}),
          ...(or.reasoning ? { reasoning: or.reasoning } : {}),
          ...(or.apiKey === null ? { hasKey: false, keyHint: null } : or.apiKey ? { hasKey: true, keyHint: `sk-or-v1-…${or.apiKey.slice(-4)}` } : {}),
        },
        ollama: { ...s.ollama, ...update.ollama },
      };
    }
    const body = JSON.stringify(state.settings);
    if (request.method() === 'GET') state.getBodies.push(body);
    return route.fulfill({ contentType: 'application/json', body });
  });
  await page.route('**/api/ai/status', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(state.status) }));
  // A live catalogue only lists models OpenRouter knows; an unknown `?model=` id is simply absent.
  await page.route('**/api/ai/models**', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(CATALOG) }));
  return state;
}

test('KI-Einstellungen: Empfehlung sichtbar, OpenRouter-Schlüssel speichern und prüfen', async ({ page }) => {
  const backend = await mockAiBackend(page, { settings: SETTINGS_DEFAULT, status: STATUS_OFF });
  await page.goto('/');
  await expect(page.getByTestId('ai-status')).toContainText('nicht aktiviert');
  await page.getByTestId('ai-open-settings').click();
  const dialog = page.getByTestId('ai-settings');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'KI einrichten' })).toBeVisible();
  await expect(page.getByTestId('ai-provider-off')).toBeChecked();
  await expect(page.getByTestId('openrouter-key-input')).toHaveCount(0);

  await page.getByTestId('ai-provider-openrouter').check();
  await expect(dialog).toContainText('Unsere Empfehlung: GPT-6 Luna');
  await expect(dialog.getByText('Empfehlung', { exact: true })).toBeVisible();
  await expect(page.getByTestId('model-option-openai/gpt-6-luna')).toBeChecked();
  await expect(dialog).toContainText('Live-Preise von OpenRouter');
  await expect(dialog).toContainText('Pläne pro 1 $');
  await expect(page.getByTestId('reasoning-control')).toContainText('Kurz');

  await page.getByTestId('openrouter-key-input').fill(KEY);
  await expect(page.getByTestId('openrouter-key-input')).toHaveAttribute('type', 'password');
  backend.status = STATUS_OPENROUTER_READY;
  await page.getByTestId('ai-settings-save').click();

  const status = page.getByTestId('ai-settings-status');
  await expect(status).toHaveAttribute('data-ready', 'true');
  await expect(status).toContainText('Bereit: GPT-6 Luna über OpenRouter');
  await expect(status).toContainText('9,42 $');
  expect(backend.puts).toHaveLength(1);
  expect(backend.puts[0]).toMatchObject({ provider: 'openrouter', openrouter: { model: 'openai/gpt-6-luna', reasoning: 'low', apiKey: KEY } });

  // Only the masked hint is shown afterwards; the key itself is gone from the page.
  await expect(page.getByTestId('openrouter-key-hint')).toHaveText('sk-or-v1-…a1b2');
  await expect(page.getByTestId('openrouter-key-input')).toHaveCount(0);
  await expect(dialog).not.toContainText(KEY);

  await page.getByTestId('ai-settings-done').click();
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId('ai-status')).toHaveAttribute('data-ready', 'true');
  await expect(page.getByTestId('ai-toggle')).toBeEnabled();

  // Reopening loads the settings again – never with the key.
  await page.getByTestId('ai-open-settings').click();
  await expect(page.getByTestId('openrouter-key-hint')).toHaveText('sk-or-v1-…a1b2');
  await expect(page.getByTestId('ai-provider-openrouter')).toBeChecked();
  expect(backend.getBodies.length).toBeGreaterThanOrEqual(2);
  for (const body of backend.getBodies) expect(body).not.toContain(KEY);
});

test('KI-Einstellungen: Fehler beim Speichern, abgelehnter Schlüssel und Entfernen', async ({ page }) => {
  const rejected: AiStatus = {
    ...STATUS_OPENROUTER_READY,
    reachable: false,
    modelInstalled: false,
    creditUsd: null,
    message: 'Der API-Schlüssel wurde abgelehnt. Prüfe ihn auf openrouter.ai.',
  };
  const backend = await mockAiBackend(page, {
    settings: { ...SETTINGS_DEFAULT, provider: 'openrouter', source: 'app', openrouter: { ...SETTINGS_DEFAULT.openrouter, hasKey: true, keyHint: 'sk-or-v1-…a1b2' } },
    status: rejected,
  });
  await page.goto('/');
  await expect(page.getByTestId('ai-status')).toHaveAttribute('data-ready', 'false');
  await expect(page.getByTestId('ai-status')).toContainText('abgelehnt');
  await page.getByTestId('ai-open-settings').click();
  await expect(page.getByTestId('openrouter-key-hint')).toHaveText('sk-or-v1-…a1b2');

  // A free model id is looked up at OpenRouter; an unknown one gets an honest warning.
  await page.getByTestId('openrouter-model-input').fill('acme/gibt-es-nicht');
  await expect(page.getByTestId('model-option-openai/gpt-6-luna')).not.toBeChecked();
  await expect(page.getByTestId('openrouter-model-check')).toContainText('kennt kein Modell');

  // Server-side validation errors are shown with their details.
  backend.nextPutError = { status: 400, body: { error: 'Ungültige Einstellungen.', issues: ['openrouter.model: unbekanntes Modell'] } };
  await page.getByTestId('ai-settings-save').click();
  await expect(page.getByTestId('ai-settings-error')).toContainText('unbekanntes Modell');
  expect(backend.puts[0]).toMatchObject({ provider: 'openrouter', openrouter: { model: 'acme/gibt-es-nicht' } });
  expect(backend.puts[0]?.openrouter).not.toHaveProperty('apiKey');

  // Back to a recommendation: saved, but the check reports the rejected key.
  await page.getByTestId('model-option-anthropic/claude-haiku-5.5').check();
  await expect(page.getByTestId('openrouter-model-input')).toHaveValue('');
  await page.getByTestId('ai-settings-save').click();
  const status = page.getByTestId('ai-settings-status');
  await expect(status).toHaveAttribute('data-ready', 'false');
  await expect(status).toContainText('abgelehnt');
  await expect(page.getByTestId('ai-settings-recheck')).toBeVisible();
  expect(backend.puts[1]).toEqual({ provider: 'openrouter', openrouter: { model: 'anthropic/claude-haiku-5.5' } });

  // Removing the key needs another provider (or a new key) – then it is sent as null.
  await page.getByTestId('openrouter-key-remove').click();
  await page.getByTestId('ai-settings-save').click();
  await expect(page.getByTestId('ai-settings')).toContainText('Ohne Schlüssel funktioniert OpenRouter nicht');
  expect(backend.puts).toHaveLength(2);
  await page.getByTestId('ai-provider-off').check();
  backend.status = STATUS_OFF;
  await page.getByTestId('ai-settings-save').click();
  await expect(page.getByTestId('ai-settings-status')).toContainText('ohne KI');
  expect(backend.puts[2]).toEqual({ provider: 'off', openrouter: { apiKey: null } });
});
