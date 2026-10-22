import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { POST as planRoute, type AiPlanResponse } from '@/app/api/ai/plan/route';
import { GET as statusRoute } from '@/app/api/ai/status/route';
import { completePlan, emptyPlan, normalizePlan, planJsonSchema, planSchema, planToPatch } from '@/core/ai/planSchema';
import { plannerSystemPrompt } from '@/core/ai/prompt';
import { DEFAULT_HOUSE_SPEC } from '@/core/schema/buildSpec';
import { resolveSpec } from '@/core/schema/resolveSpec';
import { STYLE_IDS, STYLES } from '@/core/style/styles';
import { AiPlanError, extractJson, getAiStatus, PLANNER_NUM_CTX, readAiConfig, requestAiPlan, type AiConfig } from '@/lib/ai/ollamaPlanner';

/**
 * A small fake Ollama server (same HTTP API: GET /api/tags, POST /api/chat). It lets the
 * tests drive every path – valid plan, repair round, garbage, timeout, missing model, think
 * handling – without a real model. The real model is measured by ollamaTestset.test.ts
 * (MCB_OLLAMA_TESTSET=1).
 */
type Scenario = 'valid' | 'repair' | 'garbage' | 'slow' | 'missing-model' | 'think-unsupported' | 'answer-in-thinking';
let scenario: Scenario = 'valid';
let chatCalls: { body: Record<string, unknown> }[] = [];
let server: Server;
let baseUrl = '';

/** What a model typically returns: mostly right, but with an even width and a null enum. */
const VALID_PLAN = {
  ...completePlan({
    kind: 'house',
    style: 'fantasy',
    theme: 'winter',
    size: 'large',
    detailLevel: 3,
    tower: 'square',
    towerPosition: 'front_right',
    garden: true,
    roofMaterial: 'deepslate_tiles',
    wallMaterial: 'stone_bricks',
  }),
  width: 20,
  roofType: null,
  explanation: 'Großes Steinhaus im Märchenstil mit Turm rechts und Garten.',
  unsupported: ['Pool'],
};

function reply(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
}

beforeAll(async () => {
  server = createServer(async (req, res) => {
    if (req.url === '/api/tags') return reply(res, 200, { models: [{ name: 'qwen3:14b' }, { name: 'llama3.1:8b' }] });
    if (req.url !== '/api/chat') return reply(res, 404, { error: 'not found' });
    const body = await readBody(req);
    chatCalls.push({ body });
    const message = (content: string, thinking?: string) => reply(res, 200, { message: { role: 'assistant', content, ...(thinking ? { thinking } : {}) }, done: true });
    switch (scenario) {
      case 'valid':
        return message('```json\n' + JSON.stringify(VALID_PLAN) + '\n```');
      case 'repair':
        return chatCalls.length === 1 ? message(JSON.stringify({ ...VALID_PLAN, kind: 'castle' })) : message(JSON.stringify(VALID_PLAN));
      case 'garbage':
        return message('Ich baue dir ein schönes Haus!');
      case 'slow':
        return setTimeout(() => message(JSON.stringify(VALID_PLAN)), 8_000);
      case 'missing-model':
        return reply(res, 404, { error: "model 'qwen3:14b' not found" });
      case 'think-unsupported':
        if ('think' in body) return reply(res, 400, { error: '"llama3" does not support thinking' });
        return message(JSON.stringify(VALID_PLAN));
      case 'answer-in-thinking':
        // Known Ollama issue with format + think: content empty, JSON in the thinking field.
        return message('', JSON.stringify(VALID_PLAN));
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  scenario = 'valid';
  chatCalls = [];
});

const config = (patch: Partial<AiConfig> = {}): AiConfig => ({ ...readAiConfig({ MCB_AI_PROVIDER: 'ollama', OLLAMA_BASE_URL: baseUrl }), ...patch });

describe('Konfiguration', () => {
  it('ist standardmäßig aus und liest Ollama-Einstellungen aus der Umgebung', () => {
    expect(readAiConfig({}).enabled).toBe(false);
    const c = readAiConfig({ MCB_AI_PROVIDER: 'ollama', OLLAMA_MODEL: 'gemma3:12b', OLLAMA_BASE_URL: 'localhost:11434/', MCB_AI_TIMEOUT_MS: '1' });
    expect(c).toMatchObject({ enabled: true, model: 'gemma3:12b', baseUrl: 'http://localhost:11434', timeoutMs: 5000, think: false });
    expect(readAiConfig({ OLLAMA_THINK: 'true' }).think).toBe(true);
    expect(readAiConfig({ OLLAMA_THINK: 'unset' }).think).toBeUndefined();
  });
});

describe('Status', () => {
  it('meldet aus / erreichbar / Modell fehlt / nicht erreichbar', async () => {
    expect((await getAiStatus(readAiConfig({}))).message).toMatch(/nicht aktiviert/);
    const ok = await getAiStatus(config());
    expect(ok).toMatchObject({ reachable: true, modelInstalled: true });
    const missing = await getAiStatus(config({ model: 'mistral' }));
    expect(missing).toMatchObject({ reachable: true, modelInstalled: false });
    expect(missing.message).toMatch(/ollama pull mistral/);
    const down = await getAiStatus(config({ baseUrl: 'http://127.0.0.1:9' }));
    expect(down.reachable).toBe(false);
  });
});

describe('Planung', () => {
  it('liefert einen validierten, geklemmten Plan, der eine gültige BuildSpec ergibt', async () => {
    const result = await requestAiPlan(config(), 'Großes Steinhaus im Märchenstil mit Turm rechts, Garten und Pool');
    expect(result.attempts).toBe(1);
    expect(result.fromThinking).toBe(false);
    expect(result.plan.unsupported).toEqual(['Pool']);
    // Even width from the model → next odd value; null enum → "auto".
    expect(result.plan.width).toBe(21);
    expect(result.plan.roofType).toBe('auto');

    const sent = chatCalls[0]!.body;
    expect(sent.format).toEqual(planJsonSchema());
    expect(sent.stream).toBe(false);
    expect(sent.model).toBe('qwen3:14b');
    expect(sent.options).toMatchObject({ temperature: 0, num_ctx: PLANNER_NUM_CTX });
    expect(sent.think).toBe(false);
    // System prompt, 2–4 few-shot pairs, then the wish.
    const messages = sent.messages as { role: string; content: string }[];
    expect(messages[0]!.role).toBe('system');
    const pairs = messages.filter((m) => m.role === 'assistant').length;
    expect(pairs).toBeGreaterThanOrEqual(2);
    expect(pairs).toBeLessThanOrEqual(4);
    expect(result.examples).toHaveLength(pairs);
    expect(messages.at(-1)).toMatchObject({ role: 'user' });
    expect(messages.at(-1)!.content).toContain('Großes Steinhaus im Märchenstil');
    for (const m of messages.filter((x) => x.role === 'assistant')) expect(planSchema.safeParse(JSON.parse(m.content)).success).toBe(true);

    const patch = planToPatch(result.plan);
    expect(patch).toMatchObject({ kind: 'house', style: 'fantasy', theme: 'winter', size: 'large', detailLevel: 3, options: { width: 21, tower: 'square', garden: true } });
    expect(patch.options?.roofType).toBeUndefined();
    const { spec } = resolveSpec(DEFAULT_HOUSE_SPEC, { patch, recognized: [], warnings: [], unsupported: result.plan.unsupported, explanation: result.plan.explanation }, {}, 'ki');
    expect(spec).toMatchObject({ kind: 'house', style: 'fantasy', theme: 'winter', options: { width: 21, materials: { roof: 'deepslate_tiles', wall: 'stone_bricks' } } });
  });

  it('korrigiert eine ungültige erste Antwort in einer zweiten Runde (mit der Fehlermeldung)', async () => {
    scenario = 'repair';
    const result = await requestAiPlan(config(), 'Haus');
    expect(result.attempts).toBe(2);
    const messages = chatCalls[1]!.body.messages as { content: string }[];
    expect(messages.at(-1)!.content).toMatch(/passt nicht zum Schema: kind/);
  });

  it('wirft verständliche Fehler: Unsinn, Zeitüberschreitung, fehlendes Modell, nicht erreichbar, aus', async () => {
    scenario = 'garbage';
    await expect(requestAiPlan(config(), 'Haus')).rejects.toMatchObject({ code: 'invalid' });
    expect(chatCalls).toHaveLength(2); // exactly one retry
    scenario = 'slow';
    await expect(requestAiPlan(config({ timeoutMs: 1_000 }), 'Haus')).rejects.toMatchObject({ code: 'timeout' });
    scenario = 'missing-model';
    await expect(requestAiPlan(config(), 'Haus')).rejects.toThrow(/ollama pull qwen3:14b/);
    await expect(requestAiPlan(config({ baseUrl: 'http://127.0.0.1:9' }), 'Haus')).rejects.toMatchObject({ code: 'unreachable' });
    await expect(requestAiPlan(readAiConfig({}), 'Haus')).rejects.toBeInstanceOf(AiPlanError);
  });

  it('wiederholt ohne "think", wenn das Modell kein Reasoning kann', async () => {
    scenario = 'think-unsupported';
    const result = await requestAiPlan(config(), 'Haus');
    expect(result.plan.kind).toBe('house');
    expect(result.thinkDropped).toBe(true);
    expect(result.attempts).toBe(1);
    expect('think' in chatCalls[0]!.body).toBe(true);
    expect('think' in chatCalls[1]!.body).toBe(false);
  });

  it('liest den Plan aus dem thinking-Feld, wenn content leer bleibt (format + think)', async () => {
    scenario = 'answer-in-thinking';
    const result = await requestAiPlan(config({ think: true }), 'Haus');
    expect(result.fromThinking).toBe(true);
    expect(result.plan.style).toBe('fantasy');
  });
});

describe('API-Routen', () => {
  const post = (body: unknown) =>
    new Request('http://localhost/api/ai/plan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

  it('/api/ai/plan und /api/ai/status mit aktivierter KI', async () => {
    process.env.MCB_AI_PROVIDER = 'ollama';
    process.env.OLLAMA_BASE_URL = baseUrl;
    try {
      const status = await (await statusRoute()).json();
      expect(status).toMatchObject({ enabled: true, reachable: true, modelInstalled: true });
      const res = await planRoute(post({ description: 'Großes Steinhaus mit Turm' }));
      expect(res.status).toBe(200);
      const body = (await res.json()) as AiPlanResponse;
      expect(body.source).toBe('ollama');
      expect(body.plan.width).toBe(21);
      expect(body.patch).toMatchObject({ kind: 'house', size: 'large', options: { tower: 'square', towerPosition: 'front_right' } });
      expect(body.examples.length).toBeGreaterThanOrEqual(2);
      scenario = 'garbage';
      expect((await planRoute(post({ description: 'Haus' }))).status).toBe(502);
      expect((await planRoute(post({ description: '' }))).status).toBe(400);
    } finally {
      delete process.env.MCB_AI_PROVIDER;
      delete process.env.OLLAMA_BASE_URL;
    }
  });

  it('ohne Aktivierung antwortet /api/ai/plan mit 503 (regelbasierter Fallback im Client)', async () => {
    const res = await planRoute(post({ description: 'Haus' }));
    expect(res.status).toBe(503);
    expect(((await res.json()) as { code: string }).code).toBe('disabled');
  });
});

describe('Planschema und Prompt', () => {
  it('JSON-Schema: flach, alle Felder Pflicht, keine Koordinaten und keine freien Block-IDs', () => {
    const schema = planJsonSchema() as { properties: Record<string, Record<string, unknown>>; required: string[]; additionalProperties: boolean };
    expect(schema.additionalProperties).toBe(false);
    expect(new Set(schema.required)).toEqual(new Set(Object.keys(schema.properties)));
    for (const [key, prop] of Object.entries(schema.properties)) {
      expect(['object'].includes(String(prop.type)), key).toBe(false);
      if (key === 'explanation' || key === 'unsupported') continue;
      // Every other field is an enum or a bounded number/boolean – never free text.
      const text = JSON.stringify(prop);
      expect(text.includes('"enum"') || text.includes('"maximum"') || text.includes('"boolean"'), key).toBe(true);
    }
    for (const forbidden of ['x', 'y', 'z', 'coordinates', 'blocks', 'blockId', 'nbt']) expect(schema.properties[forbidden]).toBeUndefined();
    expect((schema.properties.style as { enum: string[] }).enum).toEqual(['auto', ...STYLE_IDS]);
  });

  it('normalizePlan ist tolerant, aber nicht beliebig', () => {
    expect(extractJson('<think>hm</think>{"a":1}')).toEqual({ a: 1 });
    expect(() => extractJson('kein json')).toThrow();
    const n = normalizePlan({ kind: 'House', depth: 8, floors: 99, overhang: '2', tower: null, porch: 'ja', options: { dormers: 9 }, materials: { roof: 'minecraft:bricks' }, extra: 1 });
    expect(n).toMatchObject({ kind: 'house', depth: 9, floors: 8, overhang: 2, tower: 'auto', porch: true, dormers: 6, roofMaterial: 'bricks', unsupported: [], explanation: '' });
    expect(planSchema.safeParse(n).success).toBe(true);
    // A palette of another style is dropped; a palette alone decides the style.
    expect(normalizePlan({ ...emptyPlan(), style: 'modern', palette: 'medieval_tudor' })).toMatchObject({ style: 'modern', palette: 'auto' });
    expect(normalizePlan({ ...emptyPlan(), palette: 'medieval_tudor' })).toMatchObject({ style: 'medieval', palette: 'medieval_tudor' });
    // Unknown values stay invalid (→ repair round); objects without plan fields are not "repaired".
    expect(planSchema.safeParse(normalizePlan({ ...emptyPlan(), kind: 'castle' })).success).toBe(false);
    expect(planSchema.safeParse(normalizePlan({ answer: 'Haus' })).success).toBe(false);
  });

  it('der Systemprompt dokumentiert Stilkatalog, Schema und Regeln', () => {
    const prompt = plannerSystemPrompt();
    for (const id of STYLE_IDS) {
      expect(prompt).toContain(`"${id}"`);
      expect(prompt).toContain(STYLES[id].llm.description);
    }
    for (const field of Object.keys(planSchema.shape)) expect(prompt, field).toContain(field);
    expect(prompt).toMatch(/Keine Koordinaten, keine Block-IDs/);
    expect(prompt).toMatch(/Winter ist ein Thema, kein Schnee/);
  });
});
