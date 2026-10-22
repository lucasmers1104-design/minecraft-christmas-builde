import { describe, expect, it } from 'vitest';
import { lintHouse } from '@/core/analysis/buildingLints';
import { checkBlockState } from '@/core/blocks/registry';
import { generateBuildingWithReport } from '@/core/generator/generateBuilding';
import { parseDescription } from '@/core/generator/parseDescription';
import { DEFAULT_HOUSE_SPEC } from '@/core/schema/buildSpec';
import { resolveSpec } from '@/core/schema/resolveSpec';
import { PLAN_TESTSET } from '../fixtures/planTestset';

/**
 * From wish to blocks: every wish of the test set is read by the rule-based parser, turned
 * into a spec and generated. The result must be valid in 1.21.11, need no validator repair and
 * pass the building lints – whatever combination of options the text produced.
 */
describe('Wunsch → Bauwerk (Testset, regelbasiert)', () => {
  it.each(PLAN_TESTSET.map((c) => [c.wish]))('%s', (wish) => {
    const parsed = parseDescription(wish);
    const spec = resolveSpec({ ...DEFAULT_HOUSE_SPEC, description: wish }, parsed, {}).spec;
    const r = generateBuildingWithReport(spec);
    expect(r.repairs).toEqual([]);
    for (const state of r.model.palette) expect(checkBlockState(state, '1.21.11').ok, state).toBe(true);
    if (r.house) expect(lintHouse(r.model, r.house)).toEqual([]);
  });

  it('jede erkannte Einstellung verändert das Modell – oder es gibt einen Hinweis, warum nicht', () => {
    const base = generateBuildingWithReport({ ...DEFAULT_HOUSE_SPEC, options: {} }).model.hash;
    for (const wish of ['Haus mit Erker', 'Haus mit Balkon', 'Haus mit rundem Turm', 'Haus mit Bogenfenstern', 'Haus mit Doppeltür', 'Haus mit Gauben', 'Haus ohne Schornstein']) {
      const spec = resolveSpec(DEFAULT_HOUSE_SPEC, parseDescription(wish), {}).spec;
      const r = generateBuildingWithReport(spec);
      expect(r.model.hash !== base || r.notes.length > 0, wish).toBe(true);
    }
  });
});
