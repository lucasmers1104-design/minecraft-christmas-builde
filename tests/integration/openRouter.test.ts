import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { planJsonSchema, planSchema } from '@/core/ai/planSchema';
import { plannerMessages } from '@/core/ai/prompt';
import { AI_NO_KEY_MESSAGE, REASONING_EFFORTS, type ReasoningEffort } from '@/core/ai/providers';
import { buildModelCatalog, getOpenRouterModels, getOpenRouterStatus, resetOpenRouterModelCache } from '@/lib/ai/openRouterModels';
import {
  chatRequestBody,
  OPENROUTER_APP_TITLE,
  OPENROUTER_MAX_TOKENS,
  redactKey,
  requestOpenRouterPlan,
  strictPlanJsonSchema,
  type OpenRouterConfig,
} from '@/lib/ai/openRouterPlanner';
import { AiPlanError } from '@/lib/ai/planValidation';
import { EMPTY_KEY, FREE_TIER_KEY, GOOD_KEY, MANAGEMENT_KEY, NO_LIMIT_KEY, PLAN_COST, startFakeOpenRouter, type FakeOpenRouter } from '../helpers/fakeOpenRouter';

/**
 * The OpenRouter client against a fake OpenRouter server (tests/helpers/fakeOpenRouter.ts):
 * request format, validation and repair round, costs, every error class, the free status
 * check and the model catalogue. Not tested here: the real OpenRouter (no key on this PC).
 */

let fake: FakeOpenRouter;

beforeAll(async () => {
  fake = await startFakeOpenRouter();
});

afterAll(async () => {
  await fake.close();
});

beforeEach(() => {
  fake.reset();
  resetOpenRouterModelCache();
});

const config = (patch: Partial<OpenRouterConfig> = {}): OpenRouterConfig => ({
  apiKey: GOOD_KEY,
  model: 'openai/gpt-6-luna',
  reasoning: 'low',
  baseUrl: fake.baseUrl,
  timeoutMs: 10_000,
  ...patch,
});

async function planError(c: OpenRouterConfig): Promise<AiPlanError> {
  try {
    await requestOpenRouterPlan(c, 'Haus');
  } catch (error) {
    expect(error).toBeInstanceOf(AiPlanError);
    return error as AiPlanError;
  }
  throw new Error('kein Fehler geworfen');
}

describe('OpenRouter-Planung', () => {
  it('liefert einen validierten, geklemmten Plan mit Kosten und Token-Zahlen', async () => {
    const result = await requestOpenRouterPlan(config(), 'Großes Steinhaus im Märchenstil mit Turm rechts, Garten und Pool');
    expect(result.attempts).toBe(1);
    expect(result.plan.width).toBe(21);
    expect(result.plan.roofType).toBe('auto');
    expect(result.plan.unsupported).toEqual(['Pool']);
    expect(result.costUsd).toBeCloseTo(PLAN_COST, 10);
    expect(result.usage).toEqual({ promptTokens: 6000, completionTokens: 700, reasoningTokens: 200 });
    expect(result.provider).toBe('OpenAI');
    expect(result.paramsDropped).toBe(false);
    expect(result.examples.length).toBeGreaterThanOrEqual(2);
    expect(fake.chat).toHaveLength(1);
  });

  it('sendet strenges JSON-Schema, require_parameters, temperature 0, Nachdenk-Stufe und die App-Header', async () => {
    const description = 'Kleine Hütte im Wald';
    await requestOpenRouterPlan(config(), description);
    const { body, headers } = fake.chat[0]!;
    expect(body).toMatchObject({
      model: 'openai/gpt-6-luna',
      stream: false,
      temperature: 0,
      max_tokens: OPENROUTER_MAX_TOKENS.low,
      provider: { require_parameters: true },
      reasoning: { effort: 'low', exclude: true },
      response_format: { type: 'json_schema', json_schema: { name: 'bauplan', strict: true } },
    });
    expect((body!.response_format as { json_schema: { schema: unknown } }).json_schema.schema).toEqual(strictPlanJsonSchema());
    // Same prompt as for Ollama.
    expect(body!.messages).toEqual(plannerMessages(description).messages);
    expect(headers.authorization).toBe(`Bearer ${GOOD_KEY}`);
    expect(headers['x-title']).toBe(OPENROUTER_APP_TITLE);
    expect(headers['http-referer']).toBeTruthy();
    expect(headers['content-type']).toContain('application/json');
  });

  it('jede Nachdenk-Stufe landet im Request, mit passendem Token-Deckel', async () => {
    for (const effort of REASONING_EFFORTS) {
      fake.reset();
      await requestOpenRouterPlan(config({ reasoning: effort }), 'Haus');
      expect(fake.chat[0]!.body).toMatchObject({ reasoning: { effort }, max_tokens: OPENROUTER_MAX_TOKENS[effort] });
    }
    const caps = REASONING_EFFORTS.map((e: ReasoningEffort) => OPENROUTER_MAX_TOKENS[e]);
    expect([...caps].sort((a, b) => a - b)).toEqual(caps);
  });

  it('korrigiert eine ungültige erste Antwort und addiert die Kosten beider Runden', async () => {
    fake.scenario = 'repair';
    const result = await requestOpenRouterPlan(config(), 'Haus');
    expect(result.attempts).toBe(2);
    expect(result.costUsd).toBeCloseTo(2 * PLAN_COST, 10);
    expect(result.usage.promptTokens).toBe(12_000);
    const messages = fake.chat[1]!.body!.messages as { role: string; content: string }[];
    expect(messages.at(-1)!.content).toMatch(/passt nicht zum Schema: kind/);
    expect(messages.at(-2)!.role).toBe('assistant');
  });

  it('Kosten unbekannt, wenn OpenRouter keine usage liefert', async () => {
    fake.scenario = 'no-usage';
    const result = await requestOpenRouterPlan(config(), 'Haus');
    expect(result.costUsd).toBeNull();
  });

  it('wiederholt ohne temperature/reasoning, wenn kein Anbieter diese Parameter annimmt', async () => {
    fake.scenario = 'no-endpoints-with-sampling';
    const result = await requestOpenRouterPlan(config(), 'Haus');
    expect(result.paramsDropped).toBe(true);
    expect(result.attempts).toBe(1);
    expect(fake.chat).toHaveLength(2);
    const second = fake.chat[1]!.body!;
    expect('temperature' in second).toBe(false);
    expect('reasoning' in second).toBe(false);
    expect(second).toMatchObject({ provider: { require_parameters: true }, response_format: { json_schema: { strict: true } } });
  });

  it('verständliche Fehler mit Handlungshinweis: 401, 402, 408, 429, 5xx, Modell unbekannt, Format nicht unterstützt', async () => {
    const cases: [OpenRouterConfig | null, FakeOpenRouter['scenario'], string, RegExp][] = [
      [null, 'status-401', 'auth', /API-Schlüssel wurde von OpenRouter abgelehnt.*openrouter\.ai\/settings\/keys/],
      [null, 'status-402', 'credits', /Kein Guthaben mehr auf OpenRouter.*Guthaben auf/],
      [null, 'status-408', 'timeout', /Zeitüberschreitung bei OpenRouter/],
      [null, 'status-429', 'rate_limit', /Zu viele Anfragen.*Warte/],
      [null, 'status-500', 'upstream', /Störung \(HTTP 500\).*noch einmal/],
      [config({ model: 'openai/gibt-es-nicht' }), 'unknown-model', 'model', /„openai\/gibt-es-nicht“ ist bei OpenRouter unbekannt.*KI einrichten/],
      [null, 'no-endpoints', 'unsupported', /Kein Anbieter des Modells „GPT-6 Luna“ unterstützt das Bauplan-Format \(strukturierte Ausgabe\)/],
      [null, 'error-in-body', 'upstream', /Störung \(HTTP 502\)/],
    ];
    for (const [c, scenario, code, message] of cases) {
      fake.reset();
      fake.scenario = scenario;
      const error = await planError(c ?? config());
      expect(error.code, scenario).toBe(code);
      expect(error.message, scenario).toMatch(message);
    }
    // "No endpoints": once with, once without temperature/reasoning – then give up.
    fake.reset();
    fake.scenario = 'no-endpoints';
    await planError(config());
    expect(fake.chat).toHaveLength(2);
    // Upstream details are kept for the "Details" view.
    fake.reset();
    fake.scenario = 'error-in-body';
    expect((await planError(config())).details.join(' ')).toMatch(/Example: upstream exploded/);
  });

  it('Zeitüberschreitung, nicht erreichbar, kein Schlüssel, unbrauchbare Antwort (mit Kosten)', async () => {
    fake.scenario = 'slow';
    const slow = await planError(config({ timeoutMs: 1_000 }));
    expect(slow.code).toBe('timeout');
    expect(slow.message).toMatch(/nicht innerhalb von 1 s geantwortet/);

    const down = await planError(config({ baseUrl: 'http://127.0.0.1:9/api/v1' }));
    expect(down.code).toBe('unreachable');
    expect(down.message).toMatch(/Internetverbindung/);

    fake.reset();
    const noKey = await planError(config({ apiKey: null }));
    expect(noKey.code).toBe('no_key');
    expect(noKey.message).toBe(AI_NO_KEY_MESSAGE);
    expect(fake.chat).toHaveLength(0);

    fake.scenario = 'garbage';
    const garbage = await planError(config());
    expect(garbage.code).toBe('invalid');
    expect(fake.chat).toHaveLength(2); // exactly one repair round
    expect(garbage.costUsd).toBeCloseTo(2 * PLAN_COST, 10);
  });

  it('der Schlüssel erscheint nie in Logs, Fehlermeldungen oder Details', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => undefined));
    try {
      const texts: string[] = [];
      for (const scenario of ['echo-key', 'status-401', 'status-500', 'garbage', 'error-in-body'] as const) {
        fake.reset();
        fake.scenario = scenario;
        const error = await planError(config());
        texts.push(error.message, ...error.details, JSON.stringify(error));
      }
      texts.push(JSON.stringify(await planError(config({ baseUrl: 'http://127.0.0.1:9/api/v1' }))));
      const joined = texts.join('\n');
      expect(joined).toContain('Bad request for key sk-or-…'); // the echoed key was removed
      expect(joined).not.toContain(GOOD_KEY);
      expect(joined).not.toContain(GOOD_KEY.slice(9, 40));
      for (const spy of spies) for (const call of spy.mock.calls) expect(JSON.stringify(call)).not.toContain(GOOD_KEY.slice(9, 40));
    } finally {
      for (const spy of spies) spy.mockRestore();
    }
    expect(redactKey(`x ${GOOD_KEY} y sk-or-v1-abcdefgh`, GOOD_KEY)).toBe('x sk-or-… y sk-or-…');
  });
});

describe('Strict-kompatibles Planschema', () => {
  /** Keywords every strict structured-output implementation understands. */
  const ALLOWED = new Set(['type', 'properties', 'required', 'additionalProperties', 'items', 'enum', 'const', 'anyOf', 'description']);

  function walk(node: unknown, path: string, visit: (node: Record<string, unknown>, path: string) => void): void {
    if (Array.isArray(node)) return node.forEach((n, i) => walk(n, `${path}[${i}]`, visit));
    if (typeof node !== 'object' || node === null) return;
    const obj = node as Record<string, unknown>;
    visit(obj, path);
    if (obj.properties) for (const [k, v] of Object.entries(obj.properties as object)) walk(v, `${path}.${k}`, visit);
    if (obj.items) walk(obj.items, `${path}.items`, visit);
    if (obj.anyOf) walk(obj.anyOf, `${path}.anyOf`, visit);
  }

  it('nur erlaubte Schlüsselwörter, alle Felder Pflicht, keine Zusatzfelder – abgeleitet vom selben Katalog', () => {
    const strict = strictPlanJsonSchema() as { properties: Record<string, Record<string, unknown>>; required: string[]; additionalProperties: boolean };
    const original = planJsonSchema() as { properties: Record<string, Record<string, unknown>> };
    walk(strict, '$', (node, path) => {
      for (const key of Object.keys(node)) expect(ALLOWED.has(key), `${path}.${key}`).toBe(true);
      if (node.type === 'object') {
        expect(node.additionalProperties, path).toBe(false);
        expect(new Set(node.required as string[]), path).toEqual(new Set(Object.keys(node.properties as object)));
      }
    });
    expect(Object.keys(strict.properties)).toEqual(Object.keys(original.properties));
    expect(strict.properties.style).toEqual(original.properties.style);
    // Limits move into the description (the Zod check enforces them afterwards).
    expect(JSON.stringify(strict.properties.floors)).toMatch(/mindestens 1.*höchstens \d+/);
    expect(JSON.stringify(strict.properties.explanation)).toMatch(/höchstens 600 Zeichen/);
    expect(JSON.stringify(strict)).not.toMatch(/"(minimum|maximum|maxLength|maxItems|\$schema)"/);
  });

  it('chatRequestBody ohne sampling lässt nur temperature und reasoning weg', () => {
    const messages = plannerMessages('Haus').messages;
    const full = chatRequestBody({ model: 'm/x', reasoning: 'medium' }, messages);
    const lean = chatRequestBody({ model: 'm/x', reasoning: 'medium' }, messages, { sampling: false });
    expect(Object.keys(full).filter((k) => !(k in lean)).sort()).toEqual(['reasoning', 'temperature']);
  });

  it('ein vom Modell nach dem strengen Schema geschriebener Plan besteht dieselbe Zod-Prüfung', async () => {
    const result = await requestOpenRouterPlan(config(), 'Haus');
    expect(planSchema.safeParse(result.plan).success).toBe(true);
  });
});

describe('OpenRouter-Status (kostenlos)', () => {
  it('ohne Schlüssel: nicht bereit, klare Meldung, kein Netzwerkzugriff', async () => {
    const status = await getOpenRouterStatus(config({ apiKey: null }));
    expect(status).toMatchObject({ enabled: true, provider: 'openrouter', reachable: false, modelInstalled: false, problem: 'no_key', label: 'GPT-6 Luna über OpenRouter' });
    expect(status.message).toBe(AI_NO_KEY_MESSAGE);
    expect(status.message).toMatch(/Kein API-Schlüssel hinterlegt/);
    expect(fake.requests).toHaveLength(0);
  });

  it('mit gültigem Schlüssel: bereit, Guthaben und Live-Preis – ohne eine Planungsanfrage', async () => {
    const status = await getOpenRouterStatus(config());
    expect(status).toMatchObject({ reachable: true, modelInstalled: true, problem: null, creditUsd: 9.42, price: { inputPerM: 0.1, outputPerM: 0.5 } });
    expect(status.message).toBe('Bereit: GPT-6 Luna über OpenRouter.');
    expect(fake.chat).toHaveLength(0);
    expect(fake.requests.map((r) => r.url.split('?')[0]).sort()).toEqual(['/api/v1/key', '/api/v1/models']);
  });

  it('Guthaben über /credits (Management-Schlüssel), sonst unbekannt; Hinweis bei nie gekauftem Guthaben', async () => {
    expect((await getOpenRouterStatus(config({ apiKey: MANAGEMENT_KEY }))).creditUsd).toBe(7.5);
    const noLimit = await getOpenRouterStatus(config({ apiKey: NO_LIMIT_KEY }));
    expect(noLimit).toMatchObject({ reachable: true, modelInstalled: true, creditUsd: null, problem: null });
    const freeTier = await getOpenRouterStatus(config({ apiKey: FREE_TIER_KEY }));
    expect(freeTier.message).toMatch(/noch kein Guthaben gekauft/);
  });

  it('abgelehnter Schlüssel, verbrauchtes Guthaben, nicht erreichbar', async () => {
    const rejected = await getOpenRouterStatus(config({ apiKey: 'sk-or-v1-falsch000000000000000000000' }));
    expect(rejected).toMatchObject({ reachable: false, problem: 'key' });
    expect(rejected.message).toMatch(/abgelehnt/);
    const empty = await getOpenRouterStatus(config({ apiKey: EMPTY_KEY }));
    expect(empty).toMatchObject({ reachable: false, problem: 'credits', creditUsd: 0 });
    expect(empty.message).toMatch(/Kein Guthaben mehr/);
    const down = await getOpenRouterStatus(config({ baseUrl: 'http://127.0.0.1:9/api/v1' }));
    expect(down).toMatchObject({ reachable: false, modelInstalled: false, problem: 'unreachable' });
    expect(down.message).toMatch(/nicht erreichbar/);
  });

  it('prüft das Modell: unbekannt, ohne strukturierte Ausgabe, Modellliste nicht abrufbar', async () => {
    const unknown = await getOpenRouterStatus(config({ model: 'openai/gibt-es-nicht' }));
    expect(unknown).toMatchObject({ reachable: true, modelInstalled: false, problem: 'model' });
    expect(unknown.message).toMatch(/gibt es bei OpenRouter nicht/);
    const noSchema = await getOpenRouterStatus(config({ model: 'test/no-schema' }));
    expect(noSchema).toMatchObject({ reachable: true, modelInstalled: false, problem: 'model', price: { inputPerM: 1, outputPerM: 2 } });
    expect(noSchema.message).toMatch(/strukturierte Ausgabe/);
    resetOpenRouterModelCache();
    fake.modelsDown = true;
    const unchecked = await getOpenRouterStatus(config());
    expect(unchecked).toMatchObject({ reachable: true, modelInstalled: false, problem: 'model', price: { inputPerM: 0.1, outputPerM: 0.5 } });
    expect(unchecked.message).toMatch(/nicht geprüft/);
  });

  it('die Modellliste wird eine Stunde zwischengespeichert (ein Abruf für viele Statusprüfungen)', async () => {
    await Promise.all([getOpenRouterStatus(config()), getOpenRouterStatus(config()), getOpenRouterModels({ baseUrl: fake.baseUrl })]);
    await getOpenRouterStatus(config());
    expect(fake.requests.filter((r) => r.url.startsWith('/api/v1/models'))).toHaveLength(1);
    const realNow = Date.now;
    try {
      Date.now = () => realNow() + 61 * 60 * 1000;
      await getOpenRouterModels({ baseUrl: fake.baseUrl });
    } finally {
      Date.now = realNow;
    }
    expect(fake.requests.filter((r) => r.url.startsWith('/api/v1/models'))).toHaveLength(2);
  });
});

describe('Modellkatalog', () => {
  it('live: Preise je 1 Mio. Tokens, strukturierte Ausgabe, angefragtes Modell', async () => {
    const catalog = await buildModelCatalog({ baseUrl: fake.baseUrl, requested: 'test/no-schema' });
    expect(catalog.live).toBe(true);
    expect(catalog.fetchedAt).toMatch(/^\d{4}-\d\d-\d\dT/);
    expect(catalog.models.map((m) => m.id)).toEqual(['openai/gpt-6-luna', 'anthropic/claude-haiku-5.5', 'inclusionai/ling-3.1-flash', 'test/no-schema']);
    expect(catalog.models[0]).toEqual({ id: 'openai/gpt-6-luna', name: 'GPT-6 Luna', price: { inputPerM: 0.1, outputPerM: 0.5 }, contextLength: 400_000, structuredOutputs: true, available: true });
    expect(catalog.models[2]!.price).toEqual({ inputPerM: 0.08, outputPerM: 0.24 });
    expect(catalog.models[3]).toMatchObject({ name: 'Test: Ohne Schema', structuredOutputs: false, available: true });
    expect(catalog.message).toBeUndefined();
  });

  it('unbekanntes Modell: available false und ein Hinweis', async () => {
    const catalog = await buildModelCatalog({ baseUrl: fake.baseUrl, requested: 'openai/gibt-es-nicht' });
    expect(catalog.models.at(-1)).toMatchObject({ id: 'openai/gibt-es-nicht', available: false, price: null });
    expect(catalog.message).toMatch(/nicht in der aktuellen Modellliste/);
  });

  it('ohne Verbindung: Preis-Schnappschuss mit live false', async () => {
    fake.modelsDown = true;
    const catalog = await buildModelCatalog({ baseUrl: fake.baseUrl, requested: 'test/no-schema' });
    expect(catalog).toMatchObject({ live: false, fetchedAt: null });
    expect(catalog.models[2]!.price).toEqual({ inputPerM: 0.075, outputPerM: 0.225 });
    expect(catalog.models[0]!.available).toBeUndefined();
    expect(catalog.models[3]).toMatchObject({ id: 'test/no-schema', price: null, structuredOutputs: false });
    expect(catalog.message).toMatch(/Preise vom 23\.10\.2026/);
  });
});
