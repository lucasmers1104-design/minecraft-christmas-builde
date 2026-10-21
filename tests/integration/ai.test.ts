import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { POST as planRoute, type AiPlanResponse } from '@/app/api/ai/plan/route';
import { GET as statusRoute } from '@/app/api/ai/status/route';
import { aiPlanJsonSchema, aiPlanToPatch, normalizeAiPlan } from '@/core/ai/planSchema';
import { generateBuilding } from '@/core/generator/generateBuilding';
import { DEFAULT_HOUSE_SPEC } from '@/core/schema/buildSpec';
import { resolveSpec } from '@/core/schema/resolveSpec';
import { AiPlanError, extractJson, getAiStatus, readAiConfig, requestAiPlan, type AiConfig } from '@/lib/ai/ollamaPlanner';

/**
 * A small fake Ollama server (same HTTP API: GET /api/tags, POST /api/chat). It lets the
 * tests drive every path – valid plan, repair round, garbage, timeout, missing model – without
 * a real model. A test with a real local model is documented as manual step.
 */
type Scenario = 'valid' | 'repair' | 'garbage' | 'slow' | 'missing-model' | 'think-unsupported';
let scenario: Scenario = 'valid';
let chatCalls: { body: Record<string, unknown> }[] = [];
let server: Server;
let baseUrl = '';

const VALID_PLAN = {
  kind: 'house',
  style: 'fairytale',
  size: 'large',
  materialTheme: 'stone',
  colorTheme: 'ice_blue',
  detailLevel: 3,
  options: { tower: 'right', hedge: true, width: 20, materials: { roof: 'blue_terracotta' } },
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
    const message = (content: string) => reply(res, 200, { message: { role: 'assistant', content }, done: true });
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
  it('liefert einen validierten Plan, der echte Modelle erzeugt', async () => {
    const result = await requestAiPlan(config(), 'Großes Steinhaus im Märchenstil mit Turm rechts, Garten und Pool');
    expect(result.attempts).toBe(1);
    expect(result.plan.unsupported).toEqual(['Pool']);
    // Even width from the model was repaired to the next odd value.
    expect(result.plan.options?.width).toBe(21);
    const sent = chatCalls[0]!.body;
    expect(sent.format).toEqual(aiPlanJsonSchema());
    expect(sent.stream).toBe(false);
    expect(sent.model).toBe('qwen3:14b');

    const { spec } = resolveSpec(DEFAULT_HOUSE_SPEC, { patch: aiPlanToPatch(result.plan), recognized: [], warnings: [] }, {});
    const model = generateBuilding(spec);
    expect(model.palette).toContain('minecraft:blue_terracotta');
    expect(model.dimensions.width).toBeGreaterThan(21);
  });

  it('korrigiert eine ungültige erste Antwort in einer zweiten Runde', async () => {
    scenario = 'repair';
    const result = await requestAiPlan(config(), 'Haus');
    expect(result.attempts).toBe(2);
    const messages = chatCalls[1]!.body.messages as { content: string }[];
    expect(messages.at(-1)!.content).toMatch(/passt nicht zum Schema/);
  });

  it('wirft verständliche Fehler: Unsinn, Zeitüberschreitung, fehlendes Modell, nicht erreichbar, aus', async () => {
    scenario = 'garbage';
    await expect(requestAiPlan(config(), 'Haus')).rejects.toMatchObject({ code: 'invalid' });
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
    expect('think' in chatCalls[0]!.body).toBe(true);
    expect('think' in chatCalls[1]!.body).toBe(false);
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
      expect(body.patch).toMatchObject({ kind: 'house', size: 'large', options: { tower: 'right' } });
      scenario = 'garbage';
      expect((await planRoute(post({ description: 'Haus' }))).status).toBe(502);
      expect((await planRoute(post({ description: '' }))).status).toBe(400);
    } finally {
      delete process.env.MCB_AI_PROVIDER;
      delete process.env.OLLAMA_BASE_URL;
    }
  });

  it('ohne Aktivierung antwortet /api/ai/plan mit 503 (regelbasierter Fallback)', async () => {
    const res = await planRoute(post({ description: 'Haus' }));
    expect(res.status).toBe(503);
    expect(((await res.json()) as { code: string }).code).toBe('disabled');
  });
});

describe('Hilfsfunktionen', () => {
  it('extractJson und normalizeAiPlan sind tolerant, aber nicht beliebig', () => {
    expect(extractJson('<think>hm</think>{"a":1}')).toEqual({ a: 1 });
    expect(() => extractJson('kein json')).toThrow();
    expect(normalizeAiPlan({ kind: 'house', options: { depth: 8, wallHeight: 99, tower: null } })).toMatchObject({
      options: { depth: 9, wallHeight: 8 },
      unsupported: [],
      explanation: '',
    });
  });
});
