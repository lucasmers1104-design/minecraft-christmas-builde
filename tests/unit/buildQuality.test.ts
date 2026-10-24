import { describe, expect, it } from 'vitest';
import { AIR } from '@/core/blocks/registry';
import { measureHouse, metricValues, qualityScore, qualityTargets, rangeScore, type QualityTargets } from '@/core/analysis/buildQuality';
import { generateBuildingWithReport } from '@/core/generator/generateBuilding';
import { floorY, storeyRect } from '@/core/generator/house/plan';
import { facadeOf, facadePos } from '@/core/generator/house/walls';
import { DEFAULT_HOUSE_SPEC, type BuildSpec } from '@/core/schema/buildSpec';
import { createVoxelModel, linearIndex } from '@/core/schema/voxelModel';
import { STYLE_IDS, type StyleId } from '@/core/style/styles';

/**
 * Build quality metrics (stage "Profi-Builds", phase 1): the computation itself and a
 * regression over all styles. The floors document the state of each phase and only ever rise:
 * a change that makes houses measurably worse fails here.
 */

function house(style: StyleId, size: BuildSpec['size'], seed: number, options: BuildSpec['options'] = {}) {
  const spec: BuildSpec = { ...DEFAULT_HOUSE_SPEC, style, size, seed, theme: 'none', options };
  const { model, house } = generateBuildingWithReport(spec);
  return { spec, model, house: house! };
}

describe('Kennzahlen der Bauqualität', () => {
  it('sind deterministisch und in sich stimmig', () => {
    const a = house('medieval', 'medium', 4);
    const m1 = measureHouse(a.model, a.house);
    const m2 = measureHouse(a.model, a.house);
    expect(metricValues(m1)).toEqual(metricValues(m2));
    for (const f of m1.facades) {
      expect(f.levels.reduce((x, y) => x + y, 0)).toBe(f.cells);
      expect(f.windows).toBeLessThanOrEqual(f.glass);
    }
    expect(m1.palette.shares.reduce((x, [, s]) => x + s, 0)).toBeCloseTo(1, 5);
    expect(m1.silhouette.roofShare).toBeGreaterThan(0);
    expect(m1.silhouette.roofShare).toBeLessThan(1);
  });

  it('eine abgeräumte Fassade verliert Tiefenebenen und Details', () => {
    const a = house('rustic', 'medium', 2);
    const before = measureHouse(a.model, a.house);
    // Strip everything in front of the main front facade (d = +1, +2) in the ground storey.
    const main = a.house.plan.masses[0]!;
    const f = facadeOf(storeyRect(main, 0), 'north');
    const indices = a.model.indices.slice();
    const air = a.model.palette.indexOf(AIR);
    for (let u = -1; u <= f.length; u++)
      for (const d of [1, 2])
        for (let y = floorY(a.house.plan, 0) + 1; y < floorY(a.house.plan, 1); y++) {
          const p = facadePos(f, u, d);
          indices[linearIndex(a.model.dimensions, p.x, y, p.z)] = air;
        }
    const stripped = createVoxelModel(a.spec, a.model.dimensions, a.model.palette, indices);
    const after = measureHouse(stripped, a.house);
    const front = (m: typeof before) => m.facades.find((x) => x.mass === 'main' && x.storey === 0 && x.side === 'north')!;
    expect(front(after).micro).toBe(0);
    expect(front(after).levels[2] + front(after).levels[3]).toBe(0);
    expect(front(before).micro).toBeGreaterThan(0);
    expect(after.depth.relief).toBeLessThanOrEqual(before.depth.relief);
  });

  it('Bereichswertung: 1 im Ziel, linear fallend außerhalb', () => {
    expect(rangeScore(3, [3, 4], 2)).toBe(1);
    expect(rangeScore(2, [3, 4], 2)).toBe(0.5);
    expect(rangeScore(0, [3, 4], 2)).toBe(0);
    expect(rangeScore(0.7, [0.2, 0.5], 0.2)).toBeCloseTo(1 / 3, 5);
  });

  it('jeder Stil und jede Größe hat Zielbereiche mit min ≤ max', () => {
    for (const style of STYLE_IDS)
      for (const size of ['small', 'medium', 'large', 'huge'] as const)
        for (const [key, [min, max]] of Object.entries(qualityTargets(style, size))) expect(min, `${style}/${size}/${key}`).toBeLessThanOrEqual(max);
  });
});

/**
 * Share of sample houses (8 styles × small/medium/large × seeds 1–2) whose metric lies in its
 * target range. Phase 1 documented the starting point (mean score 0.85, main facades with only
 * two depth levels, unlit eave corners, one mass from medium on, weak back sides). Phase 2
 * (archetypes): masses 0.50 → 0.79, ridge heights 0.50 → 0.79, roof share 0.81 → 1.00, mean
 * score 0.87; the back side and the busiest facade dropped slightly (more parts in front) and
 * are the subject of phases 3 and 4. Phase 3 (depth and roofs): glass and doors in a reveal,
 * shutters or window boxes, lanterns at the eave corners, shaped roof edges – main facades with
 * three depth levels 0.21 → 0.92, lit eave corners 0.13 → 0.94, mean score 0.97. Phase 4
 * (environment): a back or side door with its own path, ivy, a kitchen garden and windows beside
 * the chimney – back sides in range 0.50 → 0.96, mean score 0.98.
 */
const PASS_FLOORS: Readonly<Record<keyof QualityTargets, number>> = {
  minLevelsMain: 0.9,
  relief: 0.8,
  minLevelsGable: 0.95,
  masses: 0.75,
  eaveHeights: 0.8,
  ridgeHeights: 0.75,
  accents: 0.95,
  roofShare: 0.95,
  dominant: 0.95,
  materials: 0.9,
  density: 0.8,
  maxSide: 0.75,
  back: 0.9,
  side: 0.95,
  entrance: 1,
  eaveCorners: 0.9,
  windowsLit: 1,
};
/** Lowest mean score per style. */
const SCORE_FLOOR = 0.94;

describe('Regression: Kennzahlen je Stil', () => {
  const samples = STYLE_IDS.flatMap((style) =>
    (['small', 'medium', 'large'] as const).flatMap((size) =>
      [1, 2].map((seed) => {
        const h = house(style, size, seed);
        const m = measureHouse(h.model, h.house);
        return { style, size, seed, values: metricValues(m), score: qualityScore(m, qualityTargets(style, size, h.house.plan.input.composition?.id)) };
      }),
    ),
  );

  it('Anteil im Zielbereich je Kennzahl liegt nicht unter dem Stand der Phase', () => {
    for (const key of Object.keys(PASS_FLOORS) as (keyof QualityTargets)[]) {
      const pass = samples.filter((s) => !s.score.misses.includes(key)).length / samples.length;
      expect(pass, key).toBeGreaterThanOrEqual(PASS_FLOORS[key]);
    }
  });

  it('mittlere Wertung je Stil liegt nicht unter dem Stand der Phase', () => {
    for (const style of STYLE_IDS) {
      const own = samples.filter((s) => s.style === style);
      const mean = own.reduce((a, s) => a + s.score.total, 0) / own.length;
      expect(mean, style).toBeGreaterThanOrEqual(SCORE_FLOOR);
    }
  });
});
