import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative } from 'node:path';
import { z } from 'zod';
import {
  AI_PROVIDERS,
  DEFAULT_OPENROUTER_MODEL,
  DEFAULT_REASONING,
  isOpenRouterModelId,
  maskKey,
  MAX_API_KEY_LENGTH,
  REASONING_EFFORTS,
  type AiProvider,
  type AiSettingsUpdate,
  type AiSettingsView,
  type ReasoningEffort,
} from '@/core/ai/providers';
import { normalizeOllamaBaseUrl, readAiConfig, type AiConfig } from '@/lib/ai/ollamaPlanner';
import { DEFAULT_OPENROUTER_BASE_URL, DEFAULT_OPENROUTER_TIMEOUT_MS, type OpenRouterConfig } from '@/lib/ai/openRouterPlanner';

/**
 * The AI settings the app stores itself (chosen in the "KI einrichten" dialog):
 * `${MCB_SETTINGS_DIR || <project>/.mcb-local}/ai-settings.json` (.mcb-local/ is gitignored).
 *
 * Precedence: settings file > environment variables (.env.local) > defaults. The OpenRouter
 * key is the exception: without a key in the file, OPENROUTER_API_KEY is used (keyFromEnv).
 * A broken file is treated as missing and reported (fileProblem). Writes are atomic
 * (temporary file + rename). The key never leaves the server: toSettingsView only shows a
 * masked hint, and nothing here logs it.
 */

type Env = Record<string, string | undefined>;

export const SETTINGS_FILE_NAME = 'ai-settings.json';
export const SETTINGS_VERSION = 1;

export function settingsDir(env: Env = process.env): string {
  return env.MCB_SETTINGS_DIR?.trim() || join(process.cwd(), '.mcb-local');
}

export function settingsFilePath(env: Env = process.env): string {
  return join(settingsDir(env), SETTINGS_FILE_NAME);
}

/** Path as shown to the user: relative to the project folder when inside it. */
export function displaySettingsPath(path: string): string {
  const rel = relative(process.cwd(), path);
  return rel && !rel.startsWith('..') && !isAbsolute(rel) ? rel.split('\\').join('/') : path;
}

const storedSettingsSchema = z.object({
  version: z.literal(SETTINGS_VERSION),
  provider: z.enum(AI_PROVIDERS),
  openrouter: z.object({
    apiKey: z.string().min(1).max(MAX_API_KEY_LENGTH).optional(),
    model: z.string().refine(isOpenRouterModelId),
    reasoning: z.enum(REASONING_EFFORTS),
  }),
  ollama: z.object({ baseUrl: z.string().min(1).max(300), model: z.string().min(1).max(120) }),
});

export type StoredAiSettings = z.infer<typeof storedSettingsSchema>;

export interface SettingsFile {
  /** Null = no file, or a file that cannot be used (then `problem` says why). */
  settings: StoredAiSettings | null;
  problem: string | null;
  path: string;
}

function brokenFileMessage(path: string, why: string): string {
  return `Die gespeicherten KI-Einstellungen (${displaySettingsPath(path)}) ${why} und werden ignoriert. Speichere sie unter „KI einrichten“ neu.`;
}

export async function readSettingsFile(env: Env = process.env): Promise<SettingsFile> {
  const path = settingsFilePath(env);
  let text: string;
  try {
    text = await readFile(path, 'utf8');
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' || code === 'ENOTDIR') return { settings: null, problem: null, path };
    return { settings: null, problem: brokenFileMessage(path, `können nicht gelesen werden (${code ?? 'Fehler'})`), path };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    return { settings: null, problem: brokenFileMessage(path, 'sind beschädigt (kein gültiges JSON)'), path };
  }
  const parsed = storedSettingsSchema.safeParse(raw);
  if (!parsed.success) return { settings: null, problem: brokenFileMessage(path, 'haben ein unbekanntes Format'), path };
  return { settings: parsed.data, problem: null, path };
}

/** Everything the server needs, including the key. Never send this object to the browser. */
export interface ServerAiConfig {
  provider: AiProvider;
  source: 'app' | 'env' | 'default';
  openrouter: OpenRouterConfig & { keyFromEnv: boolean };
  ollama: AiConfig;
  /** Settings file as shown to the user. */
  storedIn: string;
  fileProblem: string | null;
}

function envProvider(env: Env): AiProvider | null {
  const value = env.MCB_AI_PROVIDER?.trim().toLowerCase();
  return value && (AI_PROVIDERS as readonly string[]).includes(value) ? (value as AiProvider) : null;
}

function envReasoning(env: Env): ReasoningEffort | null {
  const value = env.OPENROUTER_REASONING?.trim().toLowerCase();
  return value && (REASONING_EFFORTS as readonly string[]).includes(value) ? (value as ReasoningEffort) : null;
}

function envModel(env: Env): string | null {
  const value = env.OPENROUTER_MODEL?.trim();
  return value && isOpenRouterModelId(value) ? value : null;
}

function envOpenRouterBaseUrl(env: Env): string {
  const value = env.OPENROUTER_BASE_URL?.trim().replace(/\/+$/, '');
  return value && /^https?:\/\/[^\s]+$/i.test(value) ? value : DEFAULT_OPENROUTER_BASE_URL;
}

function envTimeout(env: Env, fallback: number): number {
  const value = Number.parseInt(env.MCB_AI_TIMEOUT_MS ?? '', 10);
  return Number.isFinite(value) ? Math.min(600_000, Math.max(5_000, value)) : fallback;
}

/** Combines settings file, environment and defaults (pure; see loadAiConfig). */
export function resolveAiConfig(file: StoredAiSettings | null, env: Env, meta: { storedIn: string; fileProblem: string | null }): ServerAiConfig {
  const envKey = env.OPENROUTER_API_KEY?.trim() || null;
  const fileKey = file?.openrouter.apiKey?.trim() || null;
  const provider = file?.provider ?? envProvider(env) ?? 'off';
  const envOllama = readAiConfig(env);
  return {
    provider,
    source: file ? 'app' : envProvider(env) !== null || envKey !== null ? 'env' : 'default',
    openrouter: {
      apiKey: fileKey ?? envKey,
      keyFromEnv: fileKey === null && envKey !== null,
      model: file?.openrouter.model ?? envModel(env) ?? DEFAULT_OPENROUTER_MODEL,
      reasoning: file?.openrouter.reasoning ?? envReasoning(env) ?? DEFAULT_REASONING,
      baseUrl: envOpenRouterBaseUrl(env),
      timeoutMs: envTimeout(env, DEFAULT_OPENROUTER_TIMEOUT_MS),
    },
    ollama: {
      ...envOllama,
      enabled: provider === 'ollama',
      provider: provider === 'ollama' ? 'ollama' : 'off',
      baseUrl: file ? normalizeOllamaBaseUrl(file.ollama.baseUrl) : envOllama.baseUrl,
      model: file?.ollama.model ?? envOllama.model,
    },
    storedIn: meta.storedIn,
    fileProblem: meta.fileProblem,
  };
}

/** Reads the settings file (if any) and resolves the active configuration. */
export async function loadAiConfig(env: Env = process.env): Promise<ServerAiConfig> {
  const file = await readSettingsFile(env);
  return resolveAiConfig(file.settings, env, { storedIn: displaySettingsPath(file.path), fileProblem: file.problem });
}

/** What the browser may see: no key, only a masked hint. */
export function toSettingsView(config: ServerAiConfig): AiSettingsView {
  const key = config.openrouter.apiKey;
  return {
    provider: config.provider,
    source: config.source,
    openrouter: {
      model: config.openrouter.model,
      reasoning: config.openrouter.reasoning,
      hasKey: key !== null,
      keyHint: key !== null ? maskKey(key) : null,
      keyFromEnv: config.openrouter.keyFromEnv,
    },
    ollama: { baseUrl: config.ollama.baseUrl, model: config.ollama.model },
    storedIn: config.storedIn,
    fileProblem: config.fileProblem,
  };
}

async function renameWithRetry(from: string, to: string): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      await rename(from, to);
      return;
    } catch (error) {
      // Windows: a virus scanner or an open editor can hold the target for a moment.
      const code = (error as NodeJS.ErrnoException).code;
      if (attempt >= 4 || !(code === 'EPERM' || code === 'EBUSY' || code === 'EACCES')) throw error;
      await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
    }
  }
}

/** Writes a file atomically: temporary file in the same folder, then rename over the target. */
export async function writeFileAtomic(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
  try {
    await writeFile(tmp, content, { encoding: 'utf8', mode: 0o600 });
    await renameWithRetry(tmp, path);
  } catch (error) {
    await rm(tmp, { force: true }).catch(() => undefined);
    throw error;
  }
}

/**
 * Applies a (validated) update and writes the settings file. Omitted fields keep their current
 * value (file > environment > default); `apiKey: null` removes the stored key (a key from
 * OPENROUTER_API_KEY then applies again). The environment key is never copied into the file.
 */
export async function writeAiSettings(update: AiSettingsUpdate, env: Env = process.env): Promise<ServerAiConfig> {
  const file = await readSettingsFile(env);
  const current = resolveAiConfig(file.settings, env, { storedIn: '', fileProblem: null });
  const keyUpdate = update.openrouter?.apiKey;
  const apiKey = keyUpdate === null ? undefined : keyUpdate !== undefined ? keyUpdate.trim() : file.settings?.openrouter.apiKey;
  const next = storedSettingsSchema.parse({
    version: SETTINGS_VERSION,
    provider: update.provider,
    openrouter: {
      model: update.openrouter?.model ?? current.openrouter.model,
      reasoning: update.openrouter?.reasoning ?? current.openrouter.reasoning,
      ...(apiKey ? { apiKey } : {}),
    },
    ollama: {
      baseUrl: update.ollama?.baseUrl !== undefined ? normalizeOllamaBaseUrl(update.ollama.baseUrl) : current.ollama.baseUrl,
      model: update.ollama?.model?.trim() || current.ollama.model,
    },
  } satisfies StoredAiSettings);
  await writeFileAtomic(file.path, `${JSON.stringify(next, null, 2)}\n`);
  return resolveAiConfig(next, env, { storedIn: displaySettingsPath(file.path), fileProblem: null });
}
