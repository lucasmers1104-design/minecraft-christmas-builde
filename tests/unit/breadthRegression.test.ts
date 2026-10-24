import { describe, expect, it } from 'vitest';
import { lintHouse } from '@/core/analysis/buildingLints';
import { blockIdOf } from '@/core/blocks/registry';
import { generateBuildingWithReport } from '@/core/generator/generateBuilding';
import { DEFAULT_HOUSE_SPEC, type BuildSpec } from '@/core/schema/buildSpec';
import { blockAt } from '@/core/schema/voxelModel';

/**
 * Findings of the phase-7 breadth run (all styles × sizes × themes × detail levels × seeds, all
 * building types, both versions), kept as regression tests: each case was a lint finding.
 */

const build = (over: Partial<BuildSpec>, options: BuildSpec['options'] = {}) => generateBuildingWithReport({ ...DEFAULT_HOUSE_SPEC, theme: 'none', ...over, options });

describe('Regression aus dem Breitendurchlauf', () => {
  it('U-Flügel: ein Ersatzfenster überschreibt nie die Hintertür', () => {
    for (const style of ['fantasy', 'japanese', 'cherry'] as const)
      for (const theme of ['none', 'christmas'] as const) {
        const r = build({ style, size: 'large', seed: 1, theme }, { wings: 'U' });
        for (const d of r.house!.openings.doors) expect(blockIdOf(blockAt(r.model, d.x, d.y, d.z)), `${style} ${theme}`).toMatch(/_door$/);
        expect(lintHouse(r.model, r.house!), `${style} ${theme}`).toEqual([]);
      }
  });

  it('tiefes Portal am Kreuzgiebel: die Eingangslaterne bleibt stehen (kein Laibungsfutter darüber)', () => {
    for (const [style, size, seed] of [
      ['fantasy', 'medium', 2],
      ['fantasy', 'large', 2],
      ['medieval', 'medium', 2],
      ['medieval', 'small', 3],
    ] as const)
      for (const theme of ['none', 'christmas'] as const) {
        const r = build({ style, size, seed, theme }, { composition: 'cross_gable' });
        expect(lintHouse(r.model, r.house!), `${style} ${size} ${seed} ${theme}`).toEqual([]);
      }
  });

  it('Japanisch mit Chalet-Anbau: das Ersatzfenster darf vorhandenes Glas an der Ecke teilen', () => {
    for (const size of ['small', 'medium', 'large'] as const)
      for (const seed of [1, 2]) {
        const r = build({ style: 'japanese', size, seed }, { composition: 'chalet' });
        expect(lintHouse(r.model, r.house!), `${size} ${seed}`).toEqual([]);
        expect(r.repairs, `${size} ${seed}`).toEqual([]);
      }
  });
});
