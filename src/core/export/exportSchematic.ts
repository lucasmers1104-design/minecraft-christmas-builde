import { requireProfile, type CompatibilityProfile } from '@/core/compat/profile';
import { validateSchematic, type SchematicValidationReport } from '@/core/export/validateSchematic';
import { SchematicExportError, writeSpongeV3 } from '@/core/export/writeSpongeV3';
import type { VoxelModel } from '@/core/schema/voxelModel';

/**
 * Write + immediately re-read through the independent validator. Only returns a buffer if
 * the decoded file is block-for-block identical to the model.
 */
export function exportSchematic(
  model: VoxelModel,
  profile: CompatibilityProfile = requireProfile(model.spec.targetMinecraftVersion),
): { file: Buffer; report: SchematicValidationReport } {
  const file = writeSpongeV3(model, profile);
  const report = validateSchematic(file, { expected: model, profile });
  if (!report.ok) throw new SchematicExportError(['Selbstprüfung der .schem-Datei fehlgeschlagen', ...report.issues]);
  return { file, report };
}

export function schematicFileName(model: VoxelModel): string {
  const { kind, size, seed } = model.spec;
  return `christmas-${kind}-${size}-seed${seed}-${model.hash.slice(0, 8)}.schem`;
}
