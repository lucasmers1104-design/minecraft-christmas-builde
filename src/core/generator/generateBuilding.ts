import { buildSpecSchema, isImplementedBuildingType, MAX_SEED, type BuildSpec } from '@/core/schema/buildSpec';
import type { VoxelModel } from '@/core/schema/voxelModel';
import { buildHouse, resolveHouseParameters } from '@/core/generator/buildHouse';

export class NotImplementedBuildingError extends Error {
  constructor(kind: string) {
    super(`Bauwerkstyp "${kind}" ist noch nicht verfügbar. Derzeit implementiert: Haus.`);
    this.name = 'NotImplementedBuildingError';
  }
}

/** Deterministic: the same validated spec always yields bit-identical block data. */
export function generateBuilding(input: BuildSpec): VoxelModel {
  const spec = buildSpecSchema.parse(input);
  if (!isImplementedBuildingType(spec.kind)) throw new NotImplementedBuildingError(spec.kind);
  switch (spec.kind) {
    case 'house':
      return buildHouse(spec).builder.toModel(spec);
    default:
      throw new NotImplementedBuildingError(spec.kind);
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

/** Adjustments the generator makes to the requested spec (e.g. omitted decoration). */
export function generationNotes(input: BuildSpec): string[] {
  const spec = buildSpecSchema.parse(input);
  return spec.kind === 'house' ? resolveHouseParameters(spec).notes : [];
}
