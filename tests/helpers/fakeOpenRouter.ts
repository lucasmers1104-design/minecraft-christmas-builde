import { createServer, type IncomingHttpHeaders, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { completePlan } from '@/core/ai/planSchema';

/**
 * A small fake OpenRouter (same HTTP API as https://openrouter.ai/api/v1: POST
 * /chat/completions, GET /key, GET /credits, GET /models). Tests point OPENROUTER_BASE_URL
 * (or the config's baseUrl) at it; no real key and no real network are involved.
 */

const key = (fill: string) => `sk-or-v1-${fill.repeat(60)}9z8y`;
/** Accepted, spending limit with 9.42 $ left. */
export const GOOD_KEY = key('a');
/** Accepted, but its spending limit is used up. */
export const EMPTY_KEY = key('b');
/** Accepted, no limit; /credits not allowed (normal key). */
export const NO_LIMIT_KEY = key('c');
/** Accepted, no limit; /credits allowed (management key): 10 $ bought, 2.50 $ used. */
export const MANAGEMENT_KEY = key('d');
/** Accepted, never bought credit. */
export const FREE_TIER_KEY = key('e');

export const PLAN_COST = 0.00095;

/** What a model typically returns: mostly right, but with an even width and a null enum. */
export const VALID_PLAN = {
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

export const FAKE_MODELS = [
  {
    id: 'openai/gpt-6-luna',
    name: 'OpenAI: GPT-6 Luna',
    context_length: 400_000,
    pricing: { prompt: '0.0000001', completion: '0.0000005' },
    supported_parameters: ['max_tokens', 'temperature', 'reasoning', 'response_format', 'structured_outputs'],
  },
  {
    id: 'anthropic/claude-haiku-5.5',
    name: 'Anthropic: Claude Haiku 5.5',
    context_length: 200_000,
    pricing: { prompt: '0.0000001', completion: '0.0000005' },
    supported_parameters: ['max_tokens', 'temperature', 'reasoning', 'response_format', 'structured_outputs'],
  },
  {
    // Live price differs from the snapshot in providers.ts on purpose.
    id: 'inclusionai/ling-3.1-flash',
    name: 'inclusionAI: Ling 3.1 Flash',
    context_length: 128_000,
    pricing: { prompt: '0.00000008', completion: '0.00000024' },
    supported_parameters: ['max_tokens', 'temperature', 'response_format', 'structured_outputs'],
  },
  {
    id: 'test/no-schema',
    name: 'Test: Ohne Schema',
    context_length: 32_000,
    pricing: { prompt: '0.000001', completion: '0.000002' },
    supported_parameters: ['max_tokens', 'temperature'],
  },
];

export type ChatScenario =
  | 'valid'
  | 'repair'
  | 'garbage'
  | 'slow'
  | 'status-401'
  | 'status-402'
  | 'status-408'
  | 'status-429'
  | 'status-500'
  | 'unknown-model'
  | 'no-endpoints'
  | 'no-endpoints-with-sampling'
  | 'error-in-body'
  | 'echo-key'
  | 'no-usage';

export interface RecordedRequest {
  method: string;
  url: string;
  headers: IncomingHttpHeaders;
  body: Record<string, unknown> | null;
}

export interface FakeOpenRouter {
  /** e.g. http://127.0.0.1:1234/api/v1 */
  baseUrl: string;
  scenario: ChatScenario;
  modelsDown: boolean;
  requests: RecordedRequest[];
  /** Only the chat completion requests. */
  readonly chat: RecordedRequest[];
  reset(): void;
  close(): Promise<void>;
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown> | null> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return null;
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
}

const usage = {
  prompt_tokens: 6000,
  completion_tokens: 700,
  total_tokens: 6700,
  completion_tokens_details: { reasoning_tokens: 200 },
  cost: PLAN_COST,
  is_byok: false,
};

export async function startFakeOpenRouter(): Promise<FakeOpenRouter> {
  const state = {
    scenario: 'valid' as ChatScenario,
    modelsDown: false,
    requests: [] as RecordedRequest[],
  };

  const server = createServer(async (req, res) => {
    const body = await readBody(req);
    const record: RecordedRequest = { method: req.method ?? '', url: req.url ?? '', headers: req.headers, body };
    state.requests.push(record);
    const auth = req.headers.authorization ?? '';
    const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const path = (req.url ?? '').split('?')[0];

    if (path === '/api/v1/models') {
      if (state.modelsDown) return send(res, 503, { error: { code: 503, message: 'Service temporarily unavailable' } });
      return send(res, 200, { data: FAKE_MODELS });
    }
    if (path === '/api/v1/key') {
      const data = { label: 'test', usage: 10.58, is_free_tier: false, limit: null as number | null, limit_remaining: null as number | null };
      if (bearer === GOOD_KEY) return send(res, 200, { data: { ...data, limit: 20, limit_remaining: 9.42 } });
      if (bearer === EMPTY_KEY) return send(res, 200, { data: { ...data, limit: 5, limit_remaining: 0 } });
      if (bearer === NO_LIMIT_KEY || bearer === MANAGEMENT_KEY) return send(res, 200, { data });
      if (bearer === FREE_TIER_KEY) return send(res, 200, { data: { ...data, usage: 0, is_free_tier: true } });
      return send(res, 401, { error: { code: 401, message: 'User not found.' } });
    }
    if (path === '/api/v1/credits') {
      if (bearer === MANAGEMENT_KEY) return send(res, 200, { data: { total_credits: 10, total_usage: 2.5 } });
      return send(res, 403, { error: { code: 403, message: 'Only management keys can perform this operation' } });
    }
    if (path !== '/api/v1/chat/completions' || req.method !== 'POST' || !body) return send(res, 404, { error: { code: 404, message: 'Not Found' } });

    const chatCount = state.requests.filter((r) => r.url.startsWith('/api/v1/chat/completions')).length;
    const completion = (content: string, withUsage = true) => ({
      id: `gen-${chatCount}`,
      object: 'chat.completion',
      provider: 'OpenAI',
      model: body.model,
      choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content, reasoning: 'Kurz überlegt …' } }],
      ...(withUsage ? { usage } : {}),
    });
    const noEndpoints = { error: { code: 404, message: 'No endpoints found that can handle the requested parameters.' } };
    switch (state.scenario) {
      case 'valid':
        return send(res, 200, completion(JSON.stringify(VALID_PLAN)));
      case 'repair':
        return send(res, 200, completion(JSON.stringify(chatCount === 1 ? { ...VALID_PLAN, kind: 'castle' } : VALID_PLAN)));
      case 'garbage':
        return send(res, 200, completion('Ich baue dir ein schönes Haus!'));
      case 'slow':
        setTimeout(() => send(res, 200, completion(JSON.stringify(VALID_PLAN))), 3_000);
        return;
      case 'status-401':
        return send(res, 401, { error: { code: 401, message: 'User not found.' } });
      case 'status-402':
        return send(res, 402, { error: { code: 402, message: 'Insufficient credits. Add more using https://openrouter.ai/credits' } });
      case 'status-408':
        return send(res, 408, { error: { code: 408, message: 'Operation timed out. Please try again later.' } });
      case 'status-429':
        return send(res, 429, { error: { code: 429, message: 'Rate limit exceeded' } });
      case 'status-500':
        return send(res, 500, { error: { code: 500, message: 'Internal Server Error' } });
      case 'unknown-model':
        return send(res, 400, { error: { code: 400, message: `${String(body.model)} is not a valid model ID` } });
      case 'no-endpoints':
        return send(res, 404, noEndpoints);
      case 'no-endpoints-with-sampling':
        if ('temperature' in body || 'reasoning' in body) return send(res, 404, noEndpoints);
        return send(res, 200, completion(JSON.stringify(VALID_PLAN)));
      case 'error-in-body':
        return send(res, 200, { id: 'gen-x', choices: [], error: { code: 502, message: 'Provider returned error', metadata: { provider_name: 'Example', raw: 'upstream exploded' } } });
      case 'echo-key':
        return send(res, 400, { error: { code: 400, message: `Bad request for key ${bearer}`, metadata: { raw: `header was "${auth}"` } } });
      case 'no-usage':
        return send(res, 200, completion(JSON.stringify(VALID_PLAN), false));
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;

  return {
    baseUrl: `http://127.0.0.1:${port}/api/v1`,
    get scenario() {
      return state.scenario;
    },
    set scenario(value: ChatScenario) {
      state.scenario = value;
    },
    get modelsDown() {
      return state.modelsDown;
    },
    set modelsDown(value: boolean) {
      state.modelsDown = value;
    },
    get requests() {
      return state.requests;
    },
    set requests(value: RecordedRequest[]) {
      state.requests = value;
    },
    get chat() {
      return state.requests.filter((r) => r.url.startsWith('/api/v1/chat/completions'));
    },
    reset() {
      state.scenario = 'valid';
      state.modelsDown = false;
      state.requests = [];
    },
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}
