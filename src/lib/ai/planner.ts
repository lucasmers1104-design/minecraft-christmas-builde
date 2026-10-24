import type { BuildPlan } from '@/core/ai/planSchema';
import { AI_OFF_MESSAGE, AI_PROVIDER_LABELS, type AiStatus } from '@/core/ai/providers';
import { getAiStatus, requestAiPlan } from '@/lib/ai/ollamaPlanner';
import { getOpenRouterStatus } from '@/lib/ai/openRouterModels';
import { requestOpenRouterPlan, type OpenRouterUsage } from '@/lib/ai/openRouterPlanner';
import { AiPlanError } from '@/lib/ai/planValidation';
import type { ServerAiConfig } from '@/lib/ai/settingsStore';

/**
 * Entry point of the AI planning on the server: dispatches status checks and plan requests to
 * the provider of the active settings (settingsStore.ts). "off" never touches the network.
 */

type FetchLike = typeof fetch;

export interface ProviderPlanResult {
  source: 'ollama' | 'openrouter';
  plan: BuildPlan;
  model: string;
  durationMs: number;
  /** 1 = valid at once, 2 = valid after the repair round. */
  attempts: number;
  examples: string[];
  /** Ollama only (false for OpenRouter). */
  fromThinking: boolean;
  /** Ollama only (false for OpenRouter). */
  thinkDropped: boolean;
  /** OpenRouter: cost of all rounds in US dollars (null = not reported). Ollama: null (local, free). */
  costUsd: number | null;
  /** OpenRouter only. */
  usage?: OpenRouterUsage;
  /** OpenRouter only: repeated without temperature/reasoning. */
  paramsDropped?: boolean;
  /** OpenRouter only: provider that answered, e.g. "OpenAI". */
  provider?: string | null;
}

export function offStatus(): AiStatus {
  return {
    enabled: false,
    provider: 'off',
    model: '',
    reachable: false,
    modelInstalled: false,
    installedModels: [],
    message: AI_OFF_MESSAGE,
    label: AI_PROVIDER_LABELS.off,
    problem: 'off',
  };
}

/** Status of the active provider (free: no plan request is made). */
export async function aiStatus(config: ServerAiConfig, fetchImpl: FetchLike = fetch): Promise<AiStatus> {
  const status =
    config.provider === 'openrouter'
      ? await getOpenRouterStatus(config.openrouter, fetchImpl)
      : config.provider === 'ollama'
        ? await getAiStatus(config.ollama, fetchImpl)
        : offStatus();
  return config.fileProblem ? { ...status, message: `${config.fileProblem} ${status.message}` } : status;
}

/** Plans with the active provider; throws AiPlanError (code "disabled" when the AI is off). */
export async function planWithProvider(config: ServerAiConfig, description: string, fetchImpl: FetchLike = fetch): Promise<ProviderPlanResult> {
  if (config.provider === 'openrouter') {
    const r = await requestOpenRouterPlan(config.openrouter, description, fetchImpl);
    return {
      source: 'openrouter',
      plan: r.plan,
      model: r.model,
      durationMs: r.durationMs,
      attempts: r.attempts,
      examples: r.examples,
      fromThinking: false,
      thinkDropped: false,
      costUsd: r.costUsd,
      usage: r.usage,
      paramsDropped: r.paramsDropped,
      provider: r.provider,
    };
  }
  if (config.provider === 'ollama') {
    const r = await requestAiPlan(config.ollama, description, fetchImpl);
    return { source: 'ollama', ...r, costUsd: null };
  }
  throw new AiPlanError('disabled', AI_OFF_MESSAGE);
}
