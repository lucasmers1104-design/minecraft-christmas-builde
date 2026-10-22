import { describe, expect, it } from 'vitest';
import { selectFewShotExamples } from '@/core/ai/fewShot';
import { DEFAULT_FEW_SHOT_IDS, FEW_SHOT_EXAMPLES } from '@/core/ai/fewShotExamples';
import { completePlan, PLAN_MATERIAL_ROLES, PLAN_MATERIALS, PLAN_MATERIALS_RAW, planSchema } from '@/core/ai/planSchema';
import { parsedToPlan, parseDescription } from '@/core/generator/parseDescription';
import { hasMaterial } from '@/core/style/materials';
import { checkPlan, expectationSize, PLAN_TESTSET } from '../fixtures/planTestset';

describe('Testset: deutsche Wünsche → Plan (regelbasierter Parser)', () => {
  it('hat mindestens 50 Wünsche ohne Dubletten', () => {
    expect(PLAN_TESTSET.length).toBeGreaterThanOrEqual(50);
    expect(new Set(PLAN_TESTSET.map((c) => c.wish.toLowerCase())).size).toBe(PLAN_TESTSET.length);
  });

  it('erfüllt alle erwarteten Planeigenschaften (Trefferquote wird ausgegeben)', () => {
    const failures: string[] = [];
    let props = 0;
    let propsOk = 0;
    for (const c of PLAN_TESTSET) {
      const plan = parsedToPlan(parseDescription(c.wish));
      expect(planSchema.safeParse(plan).success, c.wish).toBe(true);
      const problems = checkPlan(plan, c.expect);
      const size = expectationSize(c.expect);
      props += size;
      propsOk += size - problems.length;
      if (problems.length > 0) failures.push(`„${c.wish}“: ${problems.join('; ')}`);
    }
    const passed = PLAN_TESTSET.length - failures.length;
    console.info(
      `Parser-Testset: ${passed}/${PLAN_TESTSET.length} Wünsche vollständig richtig (${((100 * passed) / PLAN_TESTSET.length).toFixed(1)} %), ` +
        `${propsOk}/${props} Eigenschaften (${((100 * propsOk) / props).toFixed(1)} %)`,
    );
    expect(failures).toEqual([]);
  });
});

describe('Few-Shot-Beispiele für den KI-Prompt', () => {
  it('mindestens 20 eindeutige, schema-gültige Paare mit Stichworten', () => {
    expect(FEW_SHOT_EXAMPLES.length).toBeGreaterThanOrEqual(20);
    expect(new Set(FEW_SHOT_EXAMPLES.map((e) => e.id)).size).toBe(FEW_SHOT_EXAMPLES.length);
    expect(new Set(FEW_SHOT_EXAMPLES.map((e) => e.wish.toLowerCase())).size).toBe(FEW_SHOT_EXAMPLES.length);
    for (const e of FEW_SHOT_EXAMPLES) {
      const result = planSchema.safeParse(completePlan(e.plan));
      expect(result.success, `${e.id}: ${JSON.stringify(result.error?.issues)}`).toBe(true);
      expect(e.keywords.length, e.id).toBeGreaterThan(0);
      for (const k of e.keywords) expect(k, e.id).toMatch(/^[a-zäöüß-]{3,}$/);
      expect(e.plan.explanation.length, e.id).toBeGreaterThan(10);
    }
    for (const id of DEFAULT_FEW_SHOT_IDS) expect(FEW_SHOT_EXAMPLES.some((e) => e.id === id)).toBe(true);
  });

  it('überschneiden sich nicht mit dem Testset (sonst wäre die KI-Messung geschönt)', () => {
    const testset = new Set(PLAN_TESTSET.map((c) => c.wish.toLowerCase()));
    for (const e of FEW_SHOT_EXAMPLES) expect(testset.has(e.wish.toLowerCase()), e.wish).toBe(false);
  });

  it('der regelbasierte Parser stimmt mit jedem Beispiel überein (gleiches Planformat)', () => {
    for (const e of FEW_SHOT_EXAMPLES) {
      const plan = parsedToPlan(parseDescription(e.wish));
      const { explanation: _e, unsupported, ...decided } = e.plan;
      void _e;
      expect(checkPlan(plan, { ...decided, unsupported }), e.id).toEqual([]);
    }
  });

  it('Auswahl per Stichwort: 2–4 passende Beispiele, deterministisch, sonst Standardbeispiele', () => {
    const pick = (text: string) => selectFewShotExamples(text).map((e) => e.id);
    expect(pick('Mittelalterliches Fachwerkhaus mit Turm')).toContain('tavern');
    expect(pick('Japanische Pagode')).toContain('pagoda-temple');
    expect(pick('Haus mit Pool und Keller')).toContain('unsupported');
    expect(pick('Weihnachtsbaum')).toContain('big-tree');
    expect(pick('Xyz')).toEqual(DEFAULT_FEW_SHOT_IDS.slice(0, 2));
    expect(pick('Mittelalterliches Fachwerkhaus mit Turm')).toEqual(pick('Mittelalterliches Fachwerkhaus mit Turm'));
    for (const c of PLAN_TESTSET) {
      const n = selectFewShotExamples(c.wish).length;
      expect(n, c.wish).toBeGreaterThanOrEqual(2);
      expect(n, c.wish).toBeLessThanOrEqual(4);
    }
    expect(selectFewShotExamples('Fachwerk Turm Pagode Pool Weihnachtsbaum Bahnhof', { max: 4 })).toHaveLength(4);
  });
});

describe('Kuratierte Materialliste des Plans', () => {
  it('alle IDs existieren im Materialkatalog', () => {
    for (const role of PLAN_MATERIAL_ROLES) {
      for (const id of PLAN_MATERIALS_RAW[role]) expect(hasMaterial(id), `${role}: ${id}`).toBe(true);
      expect(PLAN_MATERIALS[role]).toEqual(PLAN_MATERIALS_RAW[role]);
    }
  });
});
