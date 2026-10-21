import { buildSpecSchema, isImplementedBuildingType, MAX_SEED, type BuildingType, type BuildSpec } from '@/core/schema/buildSpec';
import type { BuildOptions } from '@/core/schema/buildOptions';
import type { VoxelModel } from '@/core/schema/voxelModel';
import { buildHouse, resolveHouseParameters } from '@/core/generator/buildHouse';
import { buildMarketStall } from '@/core/generator/buildMarketStall';
import { buildStation } from '@/core/generator/buildStation';
import { buildTree } from '@/core/generator/buildTree';

export class NotImplementedBuildingError extends Error {
  constructor(kind: string) {
    super(`Bauwerkstyp "${kind}" ist noch nicht verfügbar.`);
    this.name = 'NotImplementedBuildingError';
  }
}

/** Options each building type actually uses; everything else is reported as ignored. */
export const APPLICABLE_OPTIONS: Record<BuildingType, readonly (keyof BuildOptions)[]> = {
  house: [
    'width',
    'depth',
    'wallHeight',
    'roofShape',
    'windows',
    'snow',
    'chimney',
    'lights',
    'garland',
    'christmasTree',
    'presents',
    'tower',
    'annex',
    'porch',
    'hedge',
    'frameWood',
    'materials',
  ],
  tree: ['snow', 'lights', 'garland', 'presents'],
  market_stall: ['snow', 'lights', 'garland', 'presents', 'frameWood', 'materials'],
  station: ['snow', 'lights', 'garland', 'christmasTree', 'chimney', 'frameWood', 'materials'],
};

const OPTION_LABELS: Partial<Record<keyof BuildOptions, string>> = {
  width: 'Breite',
  depth: 'Tiefe',
  wallHeight: 'Wandhöhe',
  roofShape: 'Dachform',
  windows: 'Fenster',
  chimney: 'Schornstein',
  christmasTree: 'Weihnachtsbaum',
  tower: 'Turm',
  annex: 'Anbau',
  porch: 'Vordach',
  hedge: 'Hecke',
  frameWood: 'Balkenholz',
  materials: 'Materialien',
};

/** Deterministic: the same validated spec always yields bit-identical block data. */
export function generateBuilding(input: BuildSpec): VoxelModel {
  const spec = buildSpecSchema.parse(input);
  if (!isImplementedBuildingType(spec.kind)) throw new NotImplementedBuildingError(spec.kind);
  switch (spec.kind) {
    case 'house':
      return buildHouse(spec).builder.toModel(spec);
    case 'tree':
      return buildTree(spec).builder.toModel(spec);
    case 'market_stall':
      return buildMarketStall(spec).builder.toModel(spec);
    case 'station':
      return buildStation(spec).builder.toModel(spec);
  }
}

export const VARIANT_COUNT = 3;

export function variantSeeds(baseSeed: number, count = VARIANT_COUNT): number[] {
  return Array.from({ length: count }, (_, i) => (baseSeed + i) % (MAX_SEED + 1));
}

/** One real, independently generated model per seed (seed, seed+1, seed+2). */
export function generateVariants(spec: BuildSpec, count = VARIANT_COUNT): VoxelModel[] {
  return variantSeeds(spec.seed, count).map((seed) => generateBuilding({ ...spec, seed }));
}

/** Adjustments the generator makes to the requested spec (omitted parts, ignored options). */
export function generationNotes(input: BuildSpec): string[] {
  const spec = buildSpecSchema.parse(input);
  const notes = spec.kind === 'house' ? [...resolveHouseParameters(spec).notes] : [];
  const applicable = APPLICABLE_OPTIONS[spec.kind];
  const ignored = (Object.keys(spec.options) as (keyof BuildOptions)[]).filter(
    (key) => spec.options[key] !== undefined && !applicable.includes(key),
  );
  if (ignored.length > 0) {
    notes.push(`Für diesen Bauwerkstyp ohne Wirkung: ${ignored.map((k) => OPTION_LABELS[k] ?? k).join(', ')}.`);
  }
  return notes;
}
