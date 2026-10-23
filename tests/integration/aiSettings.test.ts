import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { GET as modelsRoute } from '@/app/api/ai/models/route';
import { POST as planRoute, type AiPlanResponse } from '@/app/api/ai/plan/route';
import { GET as getSettingsRoute, PUT as putSettingsRoute } from '@/app/api/ai/settings/route';
import { GET as statusRoute } from '@/app/api/ai/status/route';
import { AI_OFF_MESSAGE, DEFAULT_OPENROUTER_MODEL, DEFAULT_REASONING, type AiSettingsView, type AiStatus, type ModelCatalogResponse } from '@/core/ai/providers';
import { resetOpenRouterModelCache } from '@/lib/ai/openRouterModels';
import { aiStatus } from '@/lib/ai/planner';
import { loadAiConfig, settingsFilePath, toSettingsView, writeAiSettings, writeFileAtomic } from '@/lib/ai/settingsStore';
import { isLoopbackHost } from '@/lib/http/apiResponses';
import { GOOD_KEY, NO_LIMIT_KEY, PLAN_COST, startFakeOpenRouter, type FakeOpenRouter } from '../helpers/fakeOpenRouter';

/**
 * The app's own AI settings (.mcb-local/ai-settings.json, here in a temporary folder via
 * MCB_SETTINGS_DIR) and the AI routes: precedence file > environment > defaults, masking of
 * the key, atomic writes, broken files, strict PUT validation, origin/host checks and the
 * provider dispatch of /api/ai/plan, /api/ai/status and /api/ai/models.
 */

const ENV_KEY = `sk-or-v1-${'f'.repeat(60)}e7e7`;
let root: string;
let dir: string;
let fake: FakeOpenRouter;
const savedEnv = { ...process.env };

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), 'mcb-ai-settings-'));
  fake = await startFakeOpenRouter();
});

afterAll(async () => {
  await fake.close();
  rmSync(root, { recursive: true, force: true });
});

let counter = 0;
beforeEach(() => {
  dir = join(root, `case-${++counter}`);
  fake.reset();
  resetOpenRouterModelCache();
  for (const name of ['MCB_AI_PROVIDER', 'OPENROUTER_API_KEY', 'OPENROUTER_MODEL', 'OPENROUTER_REASONING', 'OLLAMA_MODEL', 'OLLAMA_BASE_URL']) delete process.env[name];
  process.env.MCB_SETTINGS_DIR = dir;
  process.env.OPENROUTER_BASE_URL = fake.baseUrl;
});

afterEach(() => {
  for (const name of Object.keys(process.env)) if (!(name in savedEnv)) delete process.env[name];
  Object.assign(process.env, savedEnv);
});

const env = (extra: Record<string, string> = {}) => ({ MCB_SETTINGS_DIR: dir, OPENROUTER_BASE_URL: fake.baseUrl, ...extra });

describe('Einstellungsspeicher', () => {
  it('ohne Datei und Umgebung: KI aus, Standardmodell, kein Schlüssel', async () => {
    const config = await loadAiConfig(env());
    expect(config).toMatchObject({ provider: 'off', source: 'default', fileProblem: null });
    expect(config.openrouter).toMatchObject({ apiKey: null, keyFromEnv: false, model: DEFAULT_OPENROUTER_MODEL, reasoning: DEFAULT_REASONING, timeoutMs: 60_000 });
    expect(config.ollama.enabled).toBe(false);
    expect(settingsFilePath(env())).toBe(join(dir, 'ai-settings.json'));
  });

  it('Umgebungsvariablen (.env.local) gelten ohne Datei; die Ansicht zeigt den Schlüssel nur maskiert', async () => {
    const config = await loadAiConfig(env({ MCB_AI_PROVIDER: 'OpenRouter', OPENROUTER_API_KEY: ` ${ENV_KEY} `, OPENROUTER_MODEL: 'anthropic/claude-haiku-5.5', OPENROUTER_REASONING: 'medium', MCB_AI_TIMEOUT_MS: '20000' }));
    expect(config).toMatchObject({ provider: 'openrouter', source: 'env' });
    expect(config.openrouter).toMatchObject({ apiKey: ENV_KEY, keyFromEnv: true, model: 'anthropic/claude-haiku-5.5', reasoning: 'medium', timeoutMs: 20_000, baseUrl: fake.baseUrl });
    const view = toSettingsView(config);
    expect(view.openrouter).toEqual({ model: 'anthropic/claude-haiku-5.5', reasoning: 'medium', hasKey: true, keyHint: 'sk-or-v1-…e7e7', keyFromEnv: true });
    expect(JSON.stringify(view)).not.toContain(ENV_KEY.slice(9, 30));
    // Invalid values in the environment fall back to the defaults.
    const invalid = await loadAiConfig(env({ MCB_AI_PROVIDER: 'chatgpt', OPENROUTER_MODEL: 'kein modell', OPENROUTER_REASONING: 'max' }));
    expect(invalid.provider).toBe('off');
    expect(invalid.openrouter).toMatchObject({ model: DEFAULT_OPENROUTER_MODEL, reasoning: DEFAULT_REASONING });
  });

  it('Vorrang: App-Datei vor Umgebung vor Standard; Umgebungsschlüssel wird nie in die Datei kopiert', async () => {
    const e = env({ MCB_AI_PROVIDER: 'openrouter', OPENROUTER_API_KEY: ENV_KEY, OLLAMA_MODEL: 'gemma3:12b' });
    let config = await writeAiSettings({ provider: 'ollama', ollama: { model: 'qwen3:8b', baseUrl: 'localhost:11434/' } }, e);
    expect(config).toMatchObject({ provider: 'ollama', source: 'app' });
    expect(config.ollama).toMatchObject({ enabled: true, provider: 'ollama', model: 'qwen3:8b', baseUrl: 'http://localhost:11434' });
    expect(config.openrouter).toMatchObject({ apiKey: ENV_KEY, keyFromEnv: true });
    expect(readFileSync(settingsFilePath(e), 'utf8')).not.toContain(ENV_KEY);

    config = await writeAiSettings({ provider: 'openrouter', openrouter: { apiKey: `  ${GOOD_KEY} `, model: 'inclusionai/ling-3.1-flash' } }, e);
    expect(config.openrouter).toMatchObject({ apiKey: GOOD_KEY, keyFromEnv: false, model: 'inclusionai/ling-3.1-flash', reasoning: 'low' });
    expect(config.ollama.model).toBe('qwen3:8b'); // omitted fields keep their value
    const stored = JSON.parse(readFileSync(settingsFilePath(e), 'utf8')) as Record<string, unknown>;
    expect(stored).toEqual({
      version: 1,
      provider: 'openrouter',
      openrouter: { apiKey: GOOD_KEY, model: 'inclusionai/ling-3.1-flash', reasoning: 'low' },
      ollama: { baseUrl: 'http://localhost:11434', model: 'qwen3:8b' },
    });
    expect(JSON.stringify(toSettingsView(config))).not.toContain(GOOD_KEY.slice(9, 30));

    // Key removed → the key from .env.local applies again.
    config = await writeAiSettings({ provider: 'openrouter', openrouter: { apiKey: null } }, e);
    expect(config.openrouter).toMatchObject({ apiKey: ENV_KEY, keyFromEnv: true, model: 'inclusionai/ling-3.1-flash' });
    expect(readFileSync(settingsFilePath(e), 'utf8')).not.toContain('apiKey');
    config = await writeAiSettings({ provider: 'off' }, env());
    expect(config.openrouter.apiKey).toBeNull();
  });

  it('schreibt atomar: keine Temp-Reste, auch bei gleichzeitigen Schreibvorgängen', async () => {
    const e = env();
    await Promise.all(['openai/gpt-6-luna', 'anthropic/claude-haiku-5.5', 'inclusionai/ling-3.1-flash', 'test/a', 'test/b'].map((model) => writeAiSettings({ provider: 'openrouter', openrouter: { model } }, e)));
    expect(readdirSync(dir)).toEqual(['ai-settings.json']);
    const stored = JSON.parse(readFileSync(settingsFilePath(e), 'utf8')) as { openrouter: { model: string } };
    expect(['openai/gpt-6-luna', 'anthropic/claude-haiku-5.5', 'inclusionai/ling-3.1-flash', 'test/a', 'test/b']).toContain(stored.openrouter.model);
    const nested = join(dir, 'a', 'b', 'c.json');
    await writeFileAtomic(nested, '{"ok":true}\n');
    expect(readFileSync(nested, 'utf8')).toBe('{"ok":true}\n');
    await writeFileAtomic(nested, '{"ok":2}\n');
    expect(readdirSync(join(dir, 'a', 'b'))).toEqual(['c.json']);
    expect(readFileSync(nested, 'utf8')).toBe('{"ok":2}\n');
  });

  it('eine kaputte Datei wird ignoriert, gemeldet und beim nächsten Speichern ersetzt', async () => {
    mkdirSync(dir, { recursive: true });
    writeFileSync(settingsFilePath(env()), '{ "version": 1, "provider": "openrouter", ', 'utf8');
    const config = await loadAiConfig(env({ MCB_AI_PROVIDER: 'ollama' }));
    expect(config.provider).toBe('ollama'); // the environment applies
    expect(config.source).toBe('env');
    expect(config.fileProblem).toMatch(/beschädigt.*ignoriert.*KI einrichten/);
    expect(toSettingsView(config).fileProblem).toBe(config.fileProblem);

    const off = await loadAiConfig(env());
    const status = await aiStatus(off);
    expect(status.message).toMatch(/^Die gespeicherten KI-Einstellungen .* beschädigt/);
    expect(status.message).toContain('nicht aktiviert');

    writeFileSync(settingsFilePath(env()), JSON.stringify({ version: 2, provider: 'openrouter' }), 'utf8');
    expect((await loadAiConfig(env())).fileProblem).toMatch(/unbekanntes Format/);

    await writeAiSettings({ provider: 'openrouter' }, env());
    expect((await loadAiConfig(env())).fileProblem).toBeNull();
  });
});

// ---------------------------------------------------------------------------------------------
// Routes

const LOCAL = 'http://localhost:3000';

function request(url: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}): Request {
  const host = new URL(url).host;
  return new Request(url, {
    method: init.method ?? 'GET',
    headers: { host, ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}), ...init.headers },
    ...(init.body !== undefined ? { body: typeof init.body === 'string' ? init.body : JSON.stringify(init.body) } : {}),
  });
}

const putSettings = (body: unknown, headers: Record<string, string> = {}, base = LOCAL) =>
  putSettingsRoute(request(`${base}/api/ai/settings`, { method: 'PUT', body, headers: { origin: base, 'sec-fetch-site': 'same-origin', ...headers } }));

describe('GET/PUT /api/ai/settings', () => {
  it('GET liefert die Ansicht ohne Schlüssel, mit no-store', async () => {
    expect((await putSettings({ provider: 'openrouter', openrouter: { apiKey: GOOD_KEY } })).status).toBe(200);
    const res = await getSettingsRoute();
    expect(res.headers.get('cache-control')).toBe('no-store');
    const text = await res.text();
    expect(text).not.toContain(GOOD_KEY.slice(9, 30));
    const view = JSON.parse(text) as AiSettingsView;
    expect(view).toMatchObject({ provider: 'openrouter', source: 'app', openrouter: { hasKey: true, keyHint: 'sk-or-v1-…9z8y', keyFromEnv: false } });
    expect(view.storedIn).toContain('ai-settings.json');
  });

  it('PUT antwortet mit der neuen Ansicht und trimmt den Schlüssel', async () => {
    const res = await putSettings({ provider: 'openrouter', openrouter: { apiKey: `\t${GOOD_KEY}  `, model: 'anthropic/claude-haiku-5.5', reasoning: 'none' } });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const text = await res.text();
    expect(text).not.toContain(GOOD_KEY.slice(9, 30));
    expect(JSON.parse(text)).toMatchObject({ provider: 'openrouter', openrouter: { model: 'anthropic/claude-haiku-5.5', reasoning: 'none', hasKey: true } });
    expect((await loadAiConfig()).openrouter.apiKey).toBe(GOOD_KEY);
  });

  it('PUT prüft streng und erklärt den Fehler auf Deutsch (ohne den Schlüssel zu wiederholen)', async () => {
    const cases: [unknown, RegExp][] = [
      [{ provider: 'openrouter', openrouter: { apiKey: 'abc-123-geheim-xyz' } }, /beginnt immer mit „sk-or-“/],
      [{ provider: 'openrouter', openrouter: { apiKey: 'sk-or-v1-abc def-geheim-xyz' } }, /Leerzeichen/],
      [{ provider: 'openrouter', openrouter: { apiKey: `sk-or-v1-${'x'.repeat(400)}` } }, /zu lang \(höchstens 300 Zeichen\)/],
      [{ provider: 'openrouter', openrouter: { apiKey: '   ' } }, /leer/],
      [{ provider: 'openrouter', openrouter: { apiKey: 'sk-or-v1-kurz' } }, /unvollständig/],
      [{ provider: 'openrouter', openrouter: { model: 'gpt 6' } }, /Ungültige Modell-ID/],
      [{ provider: 'openrouter', openrouter: { reasoning: 'max' } }, /Nachdenk-Stufe/],
      [{ provider: 'chatgpt' }, /Unbekannter Anbieter/],
      [{ openrouter: {} }, /Anbieter fehlt/],
      [{ provider: 'off', extra: 1 }, /Unbekanntes Feld: extra/],
      [{ provider: 'ollama', ollama: { baseUrl: 'ftp://server' } }, /Ollama-Adresse/],
      [{ provider: 'ollama', ollama: { model: 'qwen3 14b' } }, /Modellname für Ollama/],
      [[1, 2], /JSON-Objekt/],
    ];
    for (const [body, message] of cases) {
      const res = await putSettings(body);
      expect(res.status, JSON.stringify(body).slice(0, 80)).toBe(400);
      const text = await res.text();
      expect((JSON.parse(text) as { error: string }).error, JSON.stringify(body).slice(0, 80)).toMatch(message);
      expect(text).not.toContain('geheim');
      expect(text).not.toContain('x'.repeat(50));
    }
    expect((await putSettings('{kein json')).status).toBe(400);
    expect(readdirSync(root).includes(`case-${counter}`)).toBe(false); // nothing was written
  });

  it('PUT nur auf diesem PC (localhost) und nur von der App selbst – sonst 403', async () => {
    const lan = await putSettings({ provider: 'off' }, {}, 'http://192.168.1.20:3000');
    expect(lan.status).toBe(403);
    expect(((await lan.json()) as { error: string }).error).toMatch(/nur an dem PC ändern.*http:\/\/localhost:3000/);
    for (const headers of [{ origin: 'https://evil.example' }, { origin: 'null' }, { 'sec-fetch-site': 'cross-site', origin: LOCAL }, { origin: 'http://localhost:3001', 'sec-fetch-site': 'same-site' }]) {
      const res = await putSettings({ provider: 'openrouter', openrouter: { apiKey: GOOD_KEY } }, headers);
      expect(res.status, JSON.stringify(headers)).toBe(403);
      expect(((await res.json()) as { error: string }).error).toMatch(/nicht von der App selbst/);
    }
    expect((await loadAiConfig()).provider).toBe('off'); // nothing was saved
    // Without Origin/Sec-Fetch-Site (no browser, e.g. curl on this PC) it is allowed.
    const curl = await putSettingsRoute(request(`${LOCAL}/api/ai/settings`, { method: 'PUT', body: { provider: 'off' } }));
    expect(curl.status).toBe(200);
    for (const host of ['127.0.0.1:3000', '[::1]:3000', 'localhost']) {
      const res = await putSettings({ provider: 'off' }, {}, `http://${host}`);
      expect(res.status, host).toBe(200);
    }
    expect(isLoopbackHost('localhost.evil.example')).toBe(false);
    expect(isLoopbackHost('127.0.0.1.nip.io')).toBe(false);
  });
});

const postPlan = (body: unknown, headers: Record<string, string> = {}) =>
  planRoute(request(`${LOCAL}/api/ai/plan`, { method: 'POST', body, headers: { origin: LOCAL, 'sec-fetch-site': 'same-origin', ...headers } }));

describe('POST /api/ai/plan, GET /api/ai/status und /api/ai/models', () => {
  it('fremde Webseiten dürfen keine Planung auslösen (kein Guthaben verbrauchen)', async () => {
    process.env.MCB_AI_PROVIDER = 'openrouter';
    process.env.OPENROUTER_API_KEY = GOOD_KEY;
    const res = await postPlan({ description: 'Haus' }, { origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' });
    expect(res.status).toBe(403);
    expect(fake.chat).toHaveLength(0);
  });

  it('mit OpenRouter: source openrouter, Kosten und ein gültiger Patch', async () => {
    await putSettings({ provider: 'openrouter', openrouter: { apiKey: GOOD_KEY } });
    const res = await postPlan({ description: 'Großes Steinhaus mit Turm' });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const body = (await res.json()) as AiPlanResponse;
    expect(body).toMatchObject({ source: 'openrouter', model: DEFAULT_OPENROUTER_MODEL, attempts: 1, fromThinking: false, thinkDropped: false, provider: 'OpenAI' });
    expect(body.costUsd).toBeCloseTo(PLAN_COST, 10);
    expect(body.patch).toMatchObject({ kind: 'house', size: 'large', options: { width: 21, tower: 'square' } });
    expect(fake.chat[0]!.headers.authorization).toBe(`Bearer ${GOOD_KEY}`);
  });

  it('OpenRouter-Fehler kommen mit Code, deutscher Meldung und (falls bekannt) Kosten', async () => {
    await putSettings({ provider: 'openrouter', openrouter: { apiKey: GOOD_KEY } });
    const expectations: [FakeOpenRouter['scenario'], number, string][] = [
      ['status-401', 502, 'auth'],
      ['status-402', 402, 'credits'],
      ['status-429', 429, 'rate_limit'],
      ['no-endpoints', 502, 'unsupported'],
      ['garbage', 502, 'invalid'],
    ];
    for (const [scenario, status, code] of expectations) {
      fake.reset();
      fake.scenario = scenario;
      const res = await postPlan({ description: 'Haus' });
      expect(res.status, scenario).toBe(status);
      const body = (await res.json()) as { error: string; code: string; costUsd?: number | null };
      expect(body.code, scenario).toBe(code);
      if (scenario === 'garbage') expect(body.costUsd).toBeCloseTo(2 * PLAN_COST, 10);
      else expect(body.costUsd).toBeUndefined();
      expect(JSON.stringify(body)).not.toContain(GOOD_KEY.slice(9, 30));
    }
    await putSettings({ provider: 'openrouter', openrouter: { apiKey: null } });
    const noKey = await postPlan({ description: 'Haus' });
    expect(noKey.status).toBe(503);
    expect(((await noKey.json()) as { code: string }).code).toBe('no_key');
  });

  it('Status: aus → „nicht aktiviert“; OpenRouter ohne Schlüssel; OpenRouter bereit', async () => {
    const off = (await (await statusRoute()).json()) as AiStatus;
    expect(off).toMatchObject({ enabled: false, provider: 'off', problem: 'off' });
    expect(off.message).toBe(AI_OFF_MESSAGE);
    expect(off.message).toContain('nicht aktiviert');
    expect(fake.requests).toHaveLength(0); // "off" never touches the network

    await putSettings({ provider: 'openrouter' });
    const noKey = (await (await statusRoute()).json()) as AiStatus;
    expect(noKey).toMatchObject({ enabled: true, provider: 'openrouter', reachable: false, problem: 'no_key' });
    expect(noKey.message).toMatch(/Kein API-Schlüssel hinterlegt/);

    await putSettings({ provider: 'openrouter', openrouter: { apiKey: NO_LIMIT_KEY } });
    const res = await statusRoute();
    expect(res.headers.get('cache-control')).toBe('no-store');
    const ready = (await res.json()) as AiStatus;
    expect(ready).toMatchObject({ reachable: true, modelInstalled: true, label: 'GPT-6 Luna über OpenRouter', creditUsd: null });
    expect(fake.chat).toHaveLength(0);
  });

  it('/api/ai/models: live, mit Fallback auf den Schnappschuss, und prüft die Modell-ID', async () => {
    const live = (await (await modelsRoute(request(`${LOCAL}/api/ai/models?model=test%2Fno-schema`))).json()) as ModelCatalogResponse;
    expect(live.live).toBe(true);
    expect(live.models.map((m) => m.id)).toContain('test/no-schema');
    resetOpenRouterModelCache();
    fake.modelsDown = true;
    const res = await modelsRoute(request(`${LOCAL}/api/ai/models`));
    expect(res.headers.get('cache-control')).toBe('no-store');
    const snapshot = (await res.json()) as ModelCatalogResponse;
    expect(snapshot).toMatchObject({ live: false, fetchedAt: null });
    expect(snapshot.models).toHaveLength(3);
    expect((await modelsRoute(request(`${LOCAL}/api/ai/models?model=${encodeURIComponent('kein modell')}`))).status).toBe(400);
  });
});
