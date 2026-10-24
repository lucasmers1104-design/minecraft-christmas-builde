import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { BuildPlan } from '@/core/ai/planSchema';
import { modelDisplayName } from '@/core/ai/providers';
import { parsedToPlan, parseDescription } from '@/core/generator/parseDescription';
import { PLANNER_NUM_CTX } from '@/lib/ai/ollamaPlanner';
import { aiStatus, planWithProvider } from '@/lib/ai/planner';
import { AiPlanError } from '@/lib/ai/planValidation';
import { loadAiConfig, resolveAiConfig, type ServerAiConfig } from '@/lib/ai/settingsStore';
import { checkPlan, expectationSize, PLAN_TESTSET, type PlanTestCase } from '../fixtures/planTestset';

/**
 * The plan test set against a REAL model – the provider configured in the app (settings file
 * .mcb-local/ai-settings.json, else .env.local). Skipped unless one of the flags is set:
 *
 *   MCB_AI_TESTSET=1      the configured provider (OpenRouter or Ollama)
 *   MCB_OLLAMA_TESTSET=1  always the local Ollama (as before)
 *
 *   e.g. MCB_AI_TESTSET=1 npx vitest run tests/integration/ollamaTestset.test.ts
 *
 * Measures validation rate (valid plan after at most one repair round), retry rate, duration,
 * cost (OpenRouter) and accuracy against the expected plan properties, and writes
 * reports/ki-testset-<model>.json. The same evaluation code runs every time against simulated
 * models (the parser's plan as answer), so the runner itself stays tested without a model.
 */

const OLLAMA_ONLY = process.env.MCB_OLLAMA_TESTSET === '1';
const ENABLED = OLLAMA_ONLY || process.env.MCB_AI_TESTSET === '1';

interface CaseResult {
  wish: string;
  valid: boolean;
  attempts: number;
  durationMs: number;
  examples: string[];
  fromThinking: boolean;
  /** OpenRouter: cost of this wish in US dollars (null = not reported); Ollama: null. */
  costUsd: number | null;
  /** Mismatches against the expectation (empty = fully correct). */
  problems: string[];
  checkedProperties: number;
  correctProperties: number;
  /** Same properties checked on the rule-based parser, for comparison. */
  parserProblems: string[];
  error?: string;
  plan?: BuildPlan;
}

interface Summary {
  cases: number;
  validPlans: number;
  validationRate: number;
  firstTryRate: number;
  retryRate: number;
  errors: Record<string, number>;
  fromThinking: number;
  durationMs: { mean: number; median: number; p95: number; max: number; total: number };
  /** OpenRouter only (null for Ollama): total and mean per wish in US dollars. */
  costUsd: { total: number; meanPerWish: number; casesWithoutCost: number } | null;
  fullyCorrect: number;
  caseAccuracy: number;
  propertyAccuracy: number;
  parserCaseAccuracy: number;
  /** Fields the model got wrong most often. */
  fieldErrors: Record<string, number>;
}

const round = (n: number, digits = 3) => Math.round(n * 10 ** digits) / 10 ** digits;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)]!;
}

/** Model name as a file name part ("openai/gpt-6-luna" → "openai-gpt-6-luna", "qwen3:14b" → "qwen3-14b"). */
function modelSlug(model: string): string {
  return model.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '') || 'modell';
}

function activeModel(config: ServerAiConfig): string {
  return config.provider === 'openrouter' ? config.openrouter.model : config.ollama.model;
}

async function runCase(config: ServerAiConfig, c: PlanTestCase, fetchImpl: typeof fetch): Promise<CaseResult> {
  const started = Date.now();
  const checkedProperties = expectationSize(c.expect);
  const parserProblems = checkPlan(parsedToPlan(parseDescription(c.wish)), c.expect);
  try {
    const r = await planWithProvider(config, c.wish, fetchImpl);
    const problems = checkPlan(r.plan, c.expect);
    return {
      wish: c.wish,
      valid: true,
      attempts: r.attempts,
      durationMs: r.durationMs,
      examples: r.examples,
      fromThinking: r.fromThinking,
      costUsd: r.costUsd,
      problems,
      checkedProperties,
      correctProperties: checkedProperties - problems.length,
      parserProblems,
      plan: r.plan,
    };
  } catch (error) {
    const code = (error as { code?: string }).code ?? 'error';
    return {
      wish: c.wish,
      valid: false,
      attempts: code === 'invalid' ? 2 : 0,
      durationMs: Date.now() - started,
      examples: [],
      fromThinking: false,
      costUsd: error instanceof AiPlanError && error.costUsd !== undefined ? error.costUsd : null,
      problems: [`kein gültiger Plan (${code}): ${(error as Error).message}`],
      checkedProperties,
      correctProperties: 0,
      parserProblems,
      error: code,
    };
  }
}

function summarize(results: CaseResult[], provider: ServerAiConfig['provider']): Summary {
  const n = results.length;
  const valid = results.filter((r) => r.valid);
  const durations = results.map((r) => r.durationMs).sort((a, b) => a - b);
  const total = durations.reduce((a, b) => a + b, 0);
  const errors: Record<string, number> = {};
  for (const r of results) if (r.error) errors[r.error] = (errors[r.error] ?? 0) + 1;
  const fieldErrors: Record<string, number> = {};
  for (const r of valid) for (const p of r.problems) {
    const field = p.split(':')[0]!;
    fieldErrors[field] = (fieldErrors[field] ?? 0) + 1;
  }
  const checked = results.reduce((a, r) => a + r.checkedProperties, 0);
  const correct = results.reduce((a, r) => a + r.correctProperties, 0);
  const fullyCorrect = results.filter((r) => r.valid && r.problems.length === 0).length;
  // Wishes that failed before reaching the model (e.g. no connection) cost nothing.
  const billed = results.filter((r) => r.valid || r.error === 'invalid');
  const totalCost = results.reduce((a, r) => a + (r.costUsd ?? 0), 0);
  return {
    cases: n,
    validPlans: valid.length,
    validationRate: round(valid.length / n),
    firstTryRate: round(valid.filter((r) => r.attempts === 1).length / n),
    retryRate: round(results.filter((r) => r.attempts === 2).length / n),
    errors,
    fromThinking: valid.filter((r) => r.fromThinking).length,
    durationMs: {
      mean: Math.round(total / n),
      median: percentile(durations, 50),
      p95: percentile(durations, 95),
      max: durations.at(-1) ?? 0,
      total,
    },
    costUsd:
      provider === 'openrouter'
        ? { total: round(totalCost, 6), meanPerWish: round(totalCost / n, 6), casesWithoutCost: billed.filter((r) => r.costUsd === null).length }
        : null,
    fullyCorrect,
    caseAccuracy: round(fullyCorrect / n),
    propertyAccuracy: round(correct / checked),
    parserCaseAccuracy: round(results.filter((r) => r.parserProblems.length === 0).length / n),
    fieldErrors: Object.fromEntries(Object.entries(fieldErrors).sort((a, b) => b[1] - a[1])),
  };
}

async function runTestset(config: ServerAiConfig, cases: readonly PlanTestCase[], fetchImpl: typeof fetch = fetch) {
  const results: CaseResult[] = [];
  // Sequential on purpose: one local GPU (Ollama), comparable durations, no rate limits.
  for (const c of cases) results.push(await runCase(config, c, fetchImpl));
  const model = activeModel(config);
  return {
    generatedAt: new Date().toISOString(),
    provider: config.provider,
    model,
    label: config.provider === 'openrouter' ? `${modelDisplayName(model)} über OpenRouter` : `${model} (lokal)`,
    settings:
      config.provider === 'openrouter'
        ? { reasoning: config.openrouter.reasoning, baseUrl: config.openrouter.baseUrl, timeoutMs: config.openrouter.timeoutMs }
        : { baseUrl: config.ollama.baseUrl, think: config.ollama.think ?? 'unset', numCtx: PLANNER_NUM_CTX, timeoutMs: config.ollama.timeoutMs },
    temperature: 0,
    summary: summarize(results, config.provider),
    results,
  };
}

function reportPath(model: string, dir = join(process.cwd(), 'reports')): string {
  return join(dir, `ki-testset-${modelSlug(model)}.json`);
}

function writeReport(path: string, report: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

/** The wish of the last "Wunsch:" turn and whether this is the repair round. */
function wishOf(body: { messages: { role: string; content: string }[] }): { wish: string; isRetry: boolean } {
  const wishTurn = [...body.messages].reverse().find((m) => m.role === 'user' && m.content.startsWith('Wunsch:'))!;
  return { wish: /"""([\s\S]*)"""/.exec(wishTurn.content)![1]!, isRetry: body.messages.at(-1) !== wishTurn };
}

/** The simulated model: the parser's plan; the "Pultdach" wish answers garbage first (retry). */
function simulatedAnswer(body: { messages: { role: string; content: string }[] }): string {
  const { wish, isRetry } = wishOf(body);
  return wish.includes('Pultdach') && !isRetry ? 'Gern! Hier ist dein Plan.' : JSON.stringify(parsedToPlan(parseDescription(wish)));
}

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

function simulatedOllama(): typeof fetch {
  return (async (_url: string | URL | Request, init?: RequestInit) => {
    const content = simulatedAnswer(JSON.parse(String(init?.body)));
    return json({ message: { role: 'assistant', content }, done: true });
  }) as typeof fetch;
}

const SIMULATED_COST = 0.001;

function simulatedOpenRouter(): typeof fetch {
  return (async (_url: string | URL | Request, init?: RequestInit) => {
    const content = simulatedAnswer(JSON.parse(String(init?.body)));
    return json({ provider: 'Simuliert', choices: [{ message: { role: 'assistant', content }, finish_reason: 'stop' }], usage: { prompt_tokens: 6000, completion_tokens: 500, cost: SIMULATED_COST } });
  }) as typeof fetch;
}

const meta = { storedIn: '(Test)', fileProblem: null };

describe('KI-Testset: Auswertung (Trockenlauf mit simuliertem Modell)', () => {
  it('Ollama: misst Validierung, Retries, Laufzeit und Genauigkeit und schreibt einen JSON-Bericht', async () => {
    const config = resolveAiConfig(null, { MCB_AI_PROVIDER: 'ollama', OLLAMA_BASE_URL: 'http://simuliert.invalid' }, meta);
    const report = await runTestset(config, PLAN_TESTSET, simulatedOllama());
    const s = report.summary;
    expect(report).toMatchObject({ provider: 'ollama', model: 'qwen3:14b', label: 'qwen3:14b (lokal)' });
    expect(s.cases).toBe(PLAN_TESTSET.length);
    expect(s.validationRate).toBe(1);
    expect(s.retryRate).toBeCloseTo(1 / PLAN_TESTSET.length, 3);
    expect(s.caseAccuracy).toBe(1);
    expect(s.propertyAccuracy).toBe(1);
    expect(s.parserCaseAccuracy).toBe(1);
    expect(s.costUsd).toBeNull();
    expect(s.durationMs.mean).toBeGreaterThanOrEqual(0);
    expect(report.results.every((r) => r.examples.length >= 2 && r.examples.length <= 4)).toBe(true);

    const dir = mkdtempSync(join(tmpdir(), 'mcb-ki-testset-'));
    try {
      const path = reportPath(report.model, dir);
      expect(path.endsWith('ki-testset-qwen3-14b.json')).toBe(true);
      writeReport(path, report);
      const read = JSON.parse(readFileSync(path, 'utf8')) as typeof report;
      expect(read.summary.cases).toBe(PLAN_TESTSET.length);
      expect(read.results[0]!.plan).toBeDefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('OpenRouter: derselbe Lauf mit Anbieter, Modell und Gesamtkosten', async () => {
    const config = resolveAiConfig(
      null,
      { MCB_AI_PROVIDER: 'openrouter', OPENROUTER_API_KEY: `sk-or-v1-${'0'.repeat(64)}`, OPENROUTER_BASE_URL: 'http://simuliert.invalid/api/v1' },
      meta,
    );
    const report = await runTestset(config, PLAN_TESTSET, simulatedOpenRouter());
    const s = report.summary;
    expect(report).toMatchObject({ provider: 'openrouter', model: 'openai/gpt-6-luna', label: 'GPT-6 Luna über OpenRouter', settings: { reasoning: 'low' } });
    expect(s.validationRate).toBe(1);
    expect(s.caseAccuracy).toBe(1);
    // One wish needs the repair round → one extra paid answer.
    expect(s.costUsd!.total).toBeCloseTo((PLAN_TESTSET.length + 1) * SIMULATED_COST, 6);
    expect(s.costUsd!.casesWithoutCost).toBe(0);
    expect(reportPath(report.model).endsWith('ki-testset-openai-gpt-6-luna.json')).toBe(true);
    expect(modelSlug('anthropic/claude-haiku-5.5')).toBe('anthropic-claude-haiku-5.5');
  });
});

describe.skipIf(!ENABLED)('KI-Testset gegen die echte KI (MCB_AI_TESTSET=1 oder MCB_OLLAMA_TESTSET=1)', () => {
  it(
    'läuft alle Wünsche durch und schreibt reports/ki-testset-<modell>.json',
    async () => {
      let config = await loadAiConfig(process.env);
      if (OLLAMA_ONLY) {
        // As before: always Ollama, with a generous time limit for a local GPU.
        const timeoutMs = process.env.MCB_AI_TIMEOUT_MS ? config.ollama.timeoutMs : 300_000;
        config = { ...config, provider: 'ollama', ollama: { ...config.ollama, enabled: true, provider: 'ollama', timeoutMs } };
      }
      if (config.provider === 'off') throw new Error('Kein KI-Anbieter eingerichtet: in der App unter „KI einrichten“ OpenRouter oder Ollama verbinden (oder MCB_AI_PROVIDER in .env.local).');
      const status = await aiStatus(config);
      if (!status.reachable || !status.modelInstalled) throw new Error(`KI nicht bereit: ${status.message}`);
      const report = await runTestset(config, PLAN_TESTSET);
      const path = reportPath(report.model);
      writeReport(path, report);
      const s = report.summary;
      const cost = s.costUsd ? `, Kosten gesamt ${s.costUsd.total.toFixed(4)} $ (${(s.costUsd.meanPerWish * 100).toFixed(3)} Cent je Wunsch)` : '';
      console.info(
        `KI-Testset (${report.label}): gültig ${(100 * s.validationRate).toFixed(1)} %, Retries ${(100 * s.retryRate).toFixed(1)} %, ` +
          `vollständig richtig ${(100 * s.caseAccuracy).toFixed(1)} %, Eigenschaften ${(100 * s.propertyAccuracy).toFixed(1)} %, ` +
          `Mittel ${(s.durationMs.mean / 1000).toFixed(1)} s, Median ${(s.durationMs.median / 1000).toFixed(1)} s, p95 ${(s.durationMs.p95 / 1000).toFixed(1)} s${cost} → ${path}`,
      );
      expect(s.cases).toBe(PLAN_TESTSET.length);
    },
    3 * 60 * 60 * 1000,
  );
});
