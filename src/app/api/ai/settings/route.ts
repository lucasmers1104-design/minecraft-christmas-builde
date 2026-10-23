import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AI_PROVIDERS, isOpenRouterModelId, openRouterKeyProblem, REASONING_EFFORTS, type AiSettingsUpdate } from '@/core/ai/providers';
import { loadAiConfig, toSettingsView, writeAiSettings } from '@/lib/ai/settingsStore';
import { jsonError, jsonNoStore, readJsonBody, rejectCrossOrigin, rejectUnlessLocal, RequestBodyError } from '@/lib/http/apiResponses';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const apiKeySchema = z
  .string({ error: 'Der API-Schlüssel muss ein Text sein.' })
  .max(4_000)
  .superRefine((value, ctx) => {
    const problem = openRouterKeyProblem(value);
    if (problem) ctx.addIssue({ code: 'custom', message: problem });
  })
  .transform((value) => value.trim());

const modelIdSchema = z
  .string({ error: 'Die Modell-ID muss ein Text sein.' })
  .trim()
  .refine(isOpenRouterModelId, {
    error: 'Ungültige Modell-ID. Erwartet wird „anbieter/modell“ wie auf openrouter.ai/models, z. B. „openai/gpt-6-luna“.',
  });

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `http://${value}`);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname !== '' && !url.username && !url.password;
  } catch {
    return false;
  }
}

/** PUT body (AiSettingsUpdate), strict: unknown fields are rejected. */
const settingsUpdateSchema = z.strictObject(
  {
    provider: z.enum(AI_PROVIDERS, {
      error: (issue) => (issue.input === undefined ? 'Der Anbieter fehlt (off, openrouter oder ollama).' : 'Unbekannter Anbieter (erlaubt: off, openrouter, ollama).'),
    }),
    openrouter: z
      .strictObject(
        {
          model: modelIdSchema.optional(),
          reasoning: z.enum(REASONING_EFFORTS, { error: 'Unbekannte Nachdenk-Stufe (erlaubt: none, low, medium).' }).optional(),
          // null removes the stored key.
          apiKey: apiKeySchema.nullable().optional(),
        },
        { error: 'Die OpenRouter-Einstellungen müssen ein Objekt sein.' },
      )
      .optional(),
    ollama: z
      .strictObject(
        {
          baseUrl: z
            .string({ error: 'Die Ollama-Adresse muss ein Text sein.' })
            .trim()
            .max(300, { error: 'Die Ollama-Adresse ist zu lang.' })
            .refine(isHttpUrl, { error: 'Ungültige Ollama-Adresse. Beispiel: http://127.0.0.1:11434' })
            .optional(),
          model: z
            .string({ error: 'Der Ollama-Modellname muss ein Text sein.' })
            .trim()
            .regex(/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,119}$/, { error: 'Ungültiger Modellname für Ollama. Beispiel: qwen3:14b' })
            .optional(),
        },
        { error: 'Die Ollama-Einstellungen müssen ein Objekt sein.' },
      )
      .optional(),
  },
  { error: 'Die Einstellungen müssen ein JSON-Objekt sein.' },
);

/** German text of a validation issue (never contains the submitted values). */
function issueText(issue: z.core.$ZodIssue): string {
  if (issue.code === 'unrecognized_keys') return `Unbekanntes Feld: ${issue.keys.join(', ')}.`;
  return issue.message;
}

/** The AI settings as the browser may see them (no API key, only a masked hint). */
export async function GET(request?: Request): Promise<NextResponse> {
  const denied = request ? rejectCrossOrigin(request) : null;
  if (denied) return denied;
  return jsonNoStore(toSettingsView(await loadAiConfig()));
}

/**
 * Saves the AI settings in .mcb-local/ai-settings.json. Only from this PC (host localhost)
 * and only from the app's own page; returns the new AiSettingsView.
 */
export async function PUT(request: Request): Promise<NextResponse> {
  const denied = rejectUnlessLocal(request);
  if (denied) return denied;
  let body: unknown;
  try {
    body = await readJsonBody(request, 4 * 1024);
  } catch (error) {
    if (error instanceof RequestBodyError) return jsonError(error.status, error.message);
    throw error;
  }
  const parsed = settingsUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.') || 'Einstellungen'}: ${issueText(i)}`);
    return jsonError(400, issueText(parsed.error.issues[0]!), issues);
  }
  const update: AiSettingsUpdate = parsed.data;
  try {
    return jsonNoStore(toSettingsView(await writeAiSettings(update)));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code ?? 'Fehler';
    console.error('ai settings could not be written:', code);
    return jsonError(
      500,
      `Die Einstellungen konnten nicht gespeichert werden (${code}). Prüfe, ob der Projektordner beschreibbar ist und ob der Virenschutz den Ordner .mcb-local sperrt.`,
    );
  }
}
