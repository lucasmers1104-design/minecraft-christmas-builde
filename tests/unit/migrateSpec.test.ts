import { describe, expect, it } from 'vitest';
import { generateBuildingWithReport } from '@/core/generator/generateBuilding';
import { buildSpecSchema, DEFAULT_HOUSE_SPEC } from '@/core/schema/buildSpec';
import { migrateSpecLike } from '@/core/schema/migrateSpec';

/** A spec as version 1 of the app stored it (style/material/colour themes, wall height, tower side). */
const V1_SPEC = {
  schemaVersion: 1,
  kind: 'house',
  description: 'Altes Projekt',
  style: 'fairytale',
  size: 'large',
  materialTheme: 'stone',
  colorTheme: 'red_green',
  detailLevel: 2,
  seed: 7,
  targetMinecraftVersion: '1.21.11',
  options: { width: 15, wallHeight: 7, roofShape: 'steep', tower: 'left', hedge: true, lights: false, frameWood: 'dark_oak', materials: { foundation: 'cobblestone', roof: 'red_terracotta', accent: 'gravel' } },
};

describe('Migration Version 1 → 2', () => {
  it('übersetzt einen gespeicherten v1-Spec in einen gültigen v2-Spec', () => {
    const migrated = buildSpecSchema.parse(migrateSpecLike(V1_SPEC));
    expect(migrated).toMatchObject({ schemaVersion: 2, style: 'fantasy', theme: 'christmas', size: 'large', seed: 7 });
    expect(migrated.options).toMatchObject({
      width: 15,
      floors: 2,
      roofType: 'gable',
      roofProfile: 'steep',
      tower: 'square',
      towerPosition: 'front_left',
      garden: true,
      lanternDensity: 'none',
      materials: { frame: 'dark_oak_log', plinth: 'cobblestone' },
    });
    // Block ids that are no material of the catalogue are dropped, not guessed.
    expect(migrated.options.materials?.roof).toBe('red_terracotta');
    expect(migrated.options.materials?.accent).toBeUndefined();
    // The migrated spec builds without repairs.
    expect(generateBuildingWithReport(migrated).repairs).toEqual([]);
  });

  it('übersetzt Teil-Patches (alte Textwünsche) und lässt v2 unverändert', () => {
    expect(migrateSpecLike({ colorTheme: 'ice_blue', materialTheme: 'oak' })).toEqual({ style: 'rustic', theme: 'winter' });
    expect(migrateSpecLike({ style: 'realistic' })).toEqual({ style: 'rustic', theme: 'none' });
    expect(migrateSpecLike(DEFAULT_HOUSE_SPEC)).toBe(DEFAULT_HOUSE_SPEC);
    expect(migrateSpecLike('kein Objekt')).toBe('kein Objekt');
  });
});
