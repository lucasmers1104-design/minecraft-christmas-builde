import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { beforeEach, describe, expect, it } from 'vitest';
import { completePlan } from '@/core/ai/planSchema';
import { generateVariants } from '@/core/generator/generateBuilding';
import { DEFAULT_HOUSE_SPEC } from '@/core/schema/buildSpec';
import type { AiPlanState } from '@/lib/client/aiApi';
import { loadProject, PROJECT_DB_VERSION, resetProjectDatabaseForTests, saveNewProject, type ProjectContent } from '@/lib/persistence/projects';

/**
 * The AI plan stored with a project: the full client state (plan, attempts, source, costUsd)
 * round-trips, and projects saved before OpenRouter existed still load.
 */

const variants = generateVariants(DEFAULT_HOUSE_SPEC);
const plan = completePlan({ kind: 'station', size: 'small', explanation: 'Ein kleiner Winterbahnhof.', unsupported: ['Dampflok'] });

const aiPlan: AiPlanState = {
  description: 'Ein kleiner Bahnhof mit Dampflok',
  model: 'openai/gpt-6-luna',
  durationMs: 4200,
  explanation: plan.explanation,
  unsupported: plan.unsupported,
  patch: { kind: 'station', size: 'small' },
  plan,
  attempts: 2,
  source: 'openrouter',
  costUsd: 0.0019,
};

const content = (ai: ProjectContent['aiPlan']): ProjectContent => ({
  description: aiPlan.description,
  manual: {},
  seed: 1,
  targetMinecraftVersion: '1.21.11',
  variants,
  edits: [0, 0, 0],
  selected: 0,
  aiPlan: ai,
});

beforeEach(async () => {
  await resetProjectDatabaseForTests();
});

describe('Projekte mit KI-Plan', () => {
  it('speichert und lädt den vollständigen KI-Plan (Plan, Runden, Anbieter, Kosten)', async () => {
    const saved = await saveNewProject('Bahnhof', content(aiPlan));
    const loaded = await loadProject(saved.id);
    expect(loaded.aiPlan).toEqual(aiPlan);
    const unknownCost = await saveNewProject('Bahnhof 2', content({ ...aiPlan, costUsd: null }));
    expect((await loadProject(unknownCost.id)).aiPlan?.costUsd).toBeNull();
  });

  it('alte Projekte ohne source/costUsd/plan laden weiter (Quelle fehlt = Ollama)', async () => {
    const saved = await saveNewProject('Neu', content(null));
    const raw = new Dexie('minecraft-christmas-builder');
    raw.version(PROJECT_DB_VERSION).stores({ projects: 'id, updatedAt, name' });
    await raw.open();
    const record = await raw.table('projects').get(saved.id);
    const legacyAiPlan = { description: aiPlan.description, model: 'qwen3:14b', durationMs: 9000, explanation: plan.explanation, unsupported: plan.unsupported, patch: aiPlan.patch };
    await raw.table('projects').put({ ...record, id: 'alt', aiPlan: legacyAiPlan });
    // A stored plan that no longer fits the catalogue is dropped instead of breaking the project.
    await raw.table('projects').put({ ...record, id: 'veraltet', aiPlan: { ...legacyAiPlan, plan: { ...plan, style: 'gibt_es_nicht' }, attempts: 1 } });
    raw.close();

    const old = await loadProject('alt');
    expect(old.aiPlan).toEqual(legacyAiPlan);
    expect(old.aiPlan?.source).toBeUndefined();
    const outdated = await loadProject('veraltet');
    expect(outdated.aiPlan?.plan).toBeUndefined();
    expect(outdated.aiPlan?.attempts).toBe(1);
  });

  it('lehnt unbekannte Anbieter und negative Kosten ab', async () => {
    await expect(saveNewProject('X', content({ ...aiPlan, source: 'off' as never }))).rejects.toThrow(/nicht gespeichert/);
    await expect(saveNewProject('X', content({ ...aiPlan, costUsd: -1 }))).rejects.toThrow(/nicht gespeichert/);
  });
});
