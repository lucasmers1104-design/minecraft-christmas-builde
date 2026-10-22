import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { BuildPlan } from '@/core/ai/planSchema';
import { parsedToPlan, parseDescription } from '@/core/generator/parseDescription';
import { getAiStatus, PLANNER_NUM_CTX, readAiConfig, requestAiPlan, type AiConfig } from '@/lib/ai/ollamaPlanner';
import { checkPlan, expectationSize, PLAN_TESTSET, type PlanTestCase } from '../fixtures/planTestset';

/**
 * The plan test set against the LOCAL model (Ollama). Skipped unless MCB_OLLAMA_TESTSET=1:
 *
 *   MCB_OLLAMA_TESTSET=1 OLLAMA_MODEL=qwen3:14b npx vitest run tests/integration/ollamaTestset.test.ts
 *
 * Measures validation rate (valid plan after at most one repair round), retry rate,
 * duration and accuracy against the expected plan properties, and writes
 * reports/ki-testset.json. The same evaluation code runs every time against a simulated
 * model (the parser's plan as answer), so the runner itself stays tested without Ollama.
 */

const ENABLED = process.env.MCB_OLLAMA_TESTSET === '1';
const REPORT_PATH = join(process.cwd(), 'reports', 'ki-testset.json');

interface CaseResult {
  wish: string;
  valid: boolean;
  attempts: number;
  durationMs: number;
  examples: string[];
  fromThinking: boolean;
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

async function runCase(config: AiConfig, c: PlanTestCase, fetchImpl: typeof fetch): Promise<CaseResult> {
  const started = Date.now();
  const checkedProperties = expectationSize(c.expect);
  const parserProblems = checkPlan(parsedToPlan(parseDescription(c.wish)), c.expect);
  try {
    const r = await requestAiPlan(config, c.wish, fetchImpl);
    const problems = checkPlan(r.plan, c.expect);
    return {
      wish: c.wish,
      valid: true,
      attempts: r.attempts,
      durationMs: r.durationMs,
      examples: r.examples,
      fromThinking: r.fromThinking,
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
      problems: [`kein gültiger Plan (${code}): ${(error as Error).message}`],
      checkedProperties,
      correctProperties: 0,
      parserProblems,
      error: code,
    };
  }
}

function summarize(results: CaseResult[]): Summary {
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
    fullyCorrect,
    caseAccuracy: round(fullyCorrect / n),
    propertyAccuracy: round(correct / checked),
    parserCaseAccuracy: round(results.filter((r) => r.parserProblems.length === 0).length / n),
    fieldErrors: Object.fromEntries(Object.entries(fieldErrors).sort((a, b) => b[1] - a[1])),
  };
}

async function runTestset(config: AiConfig, cases: readonly PlanTestCase[], fetchImpl: typeof fetch = fetch) {
  const results: CaseResult[] = [];
  // Sequential on purpose: one local GPU, comparable durations.
  for (const c of cases) results.push(await runCase(config, c, fetchImpl));
  return {
    generatedAt: new Date().toISOString(),
    model: config.model,
    baseUrl: config.baseUrl,
    think: config.think ?? 'unset',
    temperature: 0,
    numCtx: PLANNER_NUM_CTX,
    summary: summarize(results),
    results,
  };
}

function writeReport(path: string, report: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

/** Simulated Ollama: answers with the parser's plan; one case answers garbage first (retry). */
function simulatedOllama(): typeof fetch {
  return (async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { messages: { role: string; content: string }[] };
    const wishTurn = [...body.messages].reverse().find((m) => m.role === 'user' && m.content.startsWith('Wunsch:'))!;
    const wish = /"""([\s\S]*)"""/.exec(wishTurn.content)![1]!;
    const isRetry = body.messages.at(-1) !== wishTurn;
    const content = wish.includes('Pultdach') && !isRetry ? 'Gern! Hier ist dein Plan.' : JSON.stringify(parsedToPlan(parseDescription(wish)));
    return new Response(JSON.stringify({ message: { role: 'assistant', content }, done: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
}

describe('KI-Testset: Auswertung (Trockenlauf mit simuliertem Modell)', () => {
  it('misst Validierung, Retries, Laufzeit und Genauigkeit und schreibt einen JSON-Bericht', async () => {
    const config = readAiConfig({ MCB_AI_PROVIDER: 'ollama', OLLAMA_BASE_URL: 'http://simuliert.invalid' });
    const report = await runTestset(config, PLAN_TESTSET, simulatedOllama());
    const s = report.summary;
    expect(s.cases).toBe(PLAN_TESTSET.length);
    expect(s.validationRate).toBe(1);
    expect(s.retryRate).toBeCloseTo(1 / PLAN_TESTSET.length, 3);
    expect(s.caseAccuracy).toBe(1);
    expect(s.propertyAccuracy).toBe(1);
    expect(s.parserCaseAccuracy).toBe(1);
    expect(report.results.every((r) => r.examples.length >= 2 && r.examples.length <= 4)).toBe(true);

    const dir = mkdtempSync(join(tmpdir(), 'mcb-ki-testset-'));
    try {
      const path = join(dir, 'ki-testset.json');
      writeReport(path, report);
      const read = JSON.parse(readFileSync(path, 'utf8')) as typeof report;
      expect(read.summary.cases).toBe(PLAN_TESTSET.length);
      expect(read.results[0]!.plan).toBeDefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe.skipIf(!ENABLED)('KI-Testset gegen die echte lokale KI (MCB_OLLAMA_TESTSET=1)', () => {
  it(
    'läuft alle Wünsche durch und schreibt reports/ki-testset.json',
    async () => {
      const config = readAiConfig({ ...process.env, MCB_AI_PROVIDER: 'ollama', MCB_AI_TIMEOUT_MS: process.env.MCB_AI_TIMEOUT_MS ?? '300000' });
      const status = await getAiStatus(config);
      if (!status.reachable || !status.modelInstalled) throw new Error(`Ollama nicht bereit: ${status.message}`);
      const report = await runTestset(config, PLAN_TESTSET);
      writeReport(REPORT_PATH, report);
      const s = report.summary;
      console.info(
        `KI-Testset (${config.model}): gültig ${(100 * s.validationRate).toFixed(1)} %, Retries ${(100 * s.retryRate).toFixed(1)} %, ` +
          `vollständig richtig ${(100 * s.caseAccuracy).toFixed(1)} %, Eigenschaften ${(100 * s.propertyAccuracy).toFixed(1)} %, ` +
          `Median ${(s.durationMs.median / 1000).toFixed(1)} s, p95 ${(s.durationMs.p95 / 1000).toFixed(1)} s → ${REPORT_PATH}`,
      );
      expect(s.cases).toBe(PLAN_TESTSET.length);
    },
    3 * 60 * 60 * 1000,
  );
});
