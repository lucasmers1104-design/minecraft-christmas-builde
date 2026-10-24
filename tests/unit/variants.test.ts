import { describe, expect, it } from 'vitest';
import { CANDIDATES, chooseVariants, evaluateCandidate, generateBuilding, generateSelectedVariants, selectVariantSeeds, variantSeeds, type Candidate } from '@/core/generator/generateBuilding';
import { DEFAULT_HOUSE_SPEC, type BuildSpec } from '@/core/schema/buildSpec';
import { STYLE_IDS } from '@/core/style/styles';

/**
 * Variant selection (Profi-Builds phase 5): houses score a fixed number of candidate seeds with
 * the quality metrics of phase 1 and show the three best that differ clearly. Same input, same
 * three; the shown models are exactly what a fresh generation of their seed gives.
 */

const spec = (over: Partial<BuildSpec> = {}, options: BuildSpec['options'] = {}): BuildSpec => ({ ...DEFAULT_HOUSE_SPEC, ...over, options });

describe('Varianten: die besten Kandidaten statt Seed 1, 2, 3', () => {
  it('gleiche Eingabe ergibt dieselben drei, die besten zuerst, aus den festen Kandidaten', () => {
    for (const style of ['rustic', 'medieval', 'japanese'] as const) {
      const s = spec({ style, seed: 7 });
      const a = selectVariantSeeds(s);
      const b = selectVariantSeeds(s);
      expect(a, style).toEqual(b);
      expect(a.candidates, style).toBe(CANDIDATES.medium);
      const pool = variantSeeds(7, CANDIDATES.medium);
      for (const seed of a.seeds) expect(pool, style).toContain(seed);
      // The first pick is the best candidate overall.
      const best = Math.max(...pool.map((seed) => evaluateCandidate({ ...s, seed }).score));
      expect(a.scores[0], style).toBe(best);
    }
  });

  it('die drei unterscheiden sich deutlich: andere Bauform, wo der Stil mehrere hat', () => {
    for (const style of STYLE_IDS) {
      const s = spec({ style, seed: 1, size: 'medium', theme: 'none' });
      const forms = selectVariantSeeds(s).seeds.map((seed) => evaluateCandidate({ ...s, seed }).composition);
      expect(new Set(forms).size, `${style}: ${forms.join(', ')}`).toBeGreaterThanOrEqual(2);
    }
  });

  it('mit festgelegter Bauform unterscheiden sie sich in der Silhouette oder sind die nächstbesten', () => {
    const s = spec({ style: 'rustic', seed: 3 }, { composition: 'log_cabin' });
    const picks = selectVariantSeeds(s).seeds.map((seed) => evaluateCandidate({ ...s, seed }));
    expect(new Set(picks.map((p) => p.composition))).toEqual(new Set(['log_cabin']));
    expect(new Set(picks.map((p) => p.seed)).size).toBe(3);
  });

  it('die gezeigten Modelle sind genau die frische Generierung ihres Seeds', () => {
    const s = spec({ style: 'fantasy', seed: 11, size: 'small' });
    const { models, selection } = generateSelectedVariants(s);
    expect(models.map((m) => m.spec.seed)).toEqual(selection.seeds);
    for (const m of models) expect(m.hash).toBe(generateBuilding({ ...s, seed: m.spec.seed }).hash);
  });

  it('andere Bauwerkstypen bleiben bei aufeinanderfolgenden Seeds', () => {
    for (const kind of ['tree', 'market_stall', 'station', 'tower'] as const) {
      const sel = selectVariantSeeds(spec({ kind, seed: 4 }));
      expect(sel.seeds, kind).toEqual([4, 5, 6]);
      expect(sel.candidates, kind).toBe(3);
    }
  });

  it('Auswahlregel: beste zuerst, dann andere Bauform, dann andere Silhouette, Gleichstand zum kleineren Seed', () => {
    const c = (seed: number, score: number, composition: string, silhouette: string): Candidate => ({ seed, score, composition, silhouette });
    const pool = [c(1, 0.9, 'simple', 'a'), c(2, 0.99, 'simple', 'a'), c(3, 0.95, 'cross', 'b'), c(4, 0.99, 'simple', 'b'), c(5, 0.5, 'tower', 'c')];
    expect(chooseVariants(pool).map((p) => p.seed)).toEqual([2, 3, 5]);
    const same = [c(1, 0.9, 'x', 'a'), c(2, 0.8, 'x', 'a'), c(3, 0.7, 'x', 'b')];
    expect(chooseVariants(same).map((p) => p.seed)).toEqual([1, 3, 2]);
  });
});
