import { normalizePlan, planSchema, type BuildPlan } from '@/core/ai/planSchema';
import type { ChatMessage } from '@/core/ai/prompt';

/**
 * Provider-neutral part of the AI planning (used by the Ollama and the OpenRouter client):
 * read the JSON object out of a model reply, normalise it (clamping, "auto"/null), validate
 * it strictly with the plan's Zod schema, and – if that fails – run exactly one repair round
 * that shows the model its own answer and the validation errors.
 */

export type AiErrorCode =
  /** No provider selected. */
  | 'disabled'
  /** Network error: server not reachable. */
  | 'unreachable'
  | 'timeout'
  /** No valid plan after the repair round. */
  | 'invalid'
  /** Other HTTP error of the provider. */
  | 'http'
  /** OpenRouter: no API key stored. */
  | 'no_key'
  /** OpenRouter: key rejected (401). */
  | 'auth'
  /** OpenRouter: no credit left (402). */
  | 'credits'
  /** OpenRouter: model unknown. */
  | 'model'
  /** OpenRouter: no provider of the model supports the plan format (structured output). */
  | 'unsupported'
  /** OpenRouter: rate limit (429). */
  | 'rate_limit'
  /** OpenRouter or the model's provider has a disruption (5xx). */
  | 'upstream';

export class AiPlanError extends Error {
  /** Money already spent on this request in US dollars (OpenRouter), null = unknown. */
  costUsd: number | null | undefined = undefined;

  constructor(
    readonly code: AiErrorCode,
    message: string,
    readonly details: string[] = [],
  ) {
    super(message);
    this.name = 'AiPlanError';
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
}

/** Extracts the JSON object from a model reply (tolerates code fences and <think> blocks). */
export function extractJson(content: string): unknown {
  const cleaned = content
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^\s*```(?:json)?/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('Antwort enthält kein JSON-Objekt');
  return JSON.parse(cleaned.slice(start, end + 1));
}

export type PlanCheck =
  | { ok: true; plan: BuildPlan }
  /** `repair` = the two chat turns of the repair round (the model's answer + the errors). */
  | { ok: false; issues: string[]; repair: ChatMessage[] };

/** Checks one model reply: extract → normalise → strict Zod validation. */
export function checkPlanReply(text: string): PlanCheck {
  let parsed: unknown;
  try {
    parsed = normalizePlan(extractJson(text));
  } catch (error) {
    const issues = [(error as Error).message];
    return {
      ok: false,
      issues,
      repair: [
        { role: 'assistant', content: text.slice(0, 2000) },
        { role: 'user', content: `Ungültig: ${issues.join('; ')}. Antworte nur mit gültigem JSON nach dem Schema.` },
      ],
    };
  }
  const result = planSchema.safeParse(parsed);
  if (result.success) return { ok: true, plan: result.data };
  const issues = result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`);
  return {
    ok: false,
    issues,
    repair: [
      { role: 'assistant', content: text.slice(0, 4000) },
      { role: 'user', content: `Die Antwort passt nicht zum Schema: ${issues.slice(0, 6).join('; ')}. Antworte nur mit korrigiertem JSON.` },
    ],
  };
}

/** First answer plus one repair round. */
export const MAX_PLAN_ATTEMPTS = 2;

export interface PlanReply {
  /** The text that should contain the plan. */
  text: string;
}

export interface PlanRoundsResult<R extends PlanReply> {
  plan: BuildPlan;
  /** 1 = valid at once, 2 = valid after the repair round. */
  attempts: number;
  /** The reply the plan came from. */
  reply: R;
}

/**
 * Asks the model (`ask` sends the whole conversation and returns its reply), validates the
 * answer and runs one repair round if needed. Transport errors thrown by `ask` end the loop
 * at once. Throws AiPlanError('invalid', invalidMessage, issues) if no round was valid.
 */
export async function runPlanRounds<R extends PlanReply>(
  prompt: readonly ChatMessage[],
  ask: (messages: ChatMessage[], attempt: number) => Promise<R>,
  invalidMessage: string,
): Promise<PlanRoundsResult<R>> {
  const messages: ChatMessage[] = [...prompt];
  let lastIssues: string[] = [];
  for (let attempt = 1; attempt <= MAX_PLAN_ATTEMPTS; attempt++) {
    const reply = await ask([...messages], attempt);
    const check = checkPlanReply(reply.text);
    if (check.ok) return { plan: check.plan, attempts: attempt, reply };
    lastIssues = check.issues;
    messages.push(...check.repair);
  }
  throw new AiPlanError('invalid', invalidMessage, lastIssues);
}
