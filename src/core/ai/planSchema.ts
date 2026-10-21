import { z } from 'zod';
import type { SpecPatch } from '@/core/generator/parseDescription';
import {
  buildOptionsSchema,
  clampInt,
  clampOdd,
  compactOptions,
  FOOTPRINT_LIMITS,
  type BuildOptions,
} from '@/core/schema/buildOptions';
import { BUILD_SIZES, BUILD_STYLES, BUILDING_TYPES, COLOR_THEMES, MATERIAL_THEMES } from '@/core/schema/buildSpec';

/**
 * What a (local) language model may return: a structured building plan using only the
 * enumerated fields of the rule-based generator. No coordinates, no block lists, no NBT –
 * geometry, valid blocks and export stay the generator's job.
 */
export const aiPlanSchema = z
  .object({
    kind: z.enum(BUILDING_TYPES),
    style: z.enum(BUILD_STYLES).optional(),
    size: z.enum(BUILD_SIZES).optional(),
    materialTheme: z.enum(MATERIAL_THEMES).optional(),
    colorTheme: z.enum(COLOR_THEMES).optional(),
    detailLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
    options: buildOptionsSchema.optional(),
    /** Short German explanation of the plan for the user. */
    explanation: z.string().max(600),
    /** Wishes from the description the generator cannot build. */
    unsupported: z.array(z.string().max(200)).max(12),
  })
  .strict();

export type AiPlan = z.infer<typeof aiPlanSchema>;

/** JSON schema handed to Ollama's structured-output `format` parameter. */
export function aiPlanJsonSchema(): Record<string, unknown> {
  const schema = z.toJSONSchema(aiPlanSchema) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}

/**
 * Repairs harmless deviations a model tends to make (even widths, out-of-range numbers)
 * before strict validation, so a nearly-correct plan is not thrown away.
 */
export function normalizeAiPlan(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const plan = { ...(raw as Record<string, unknown>) };
  const options = plan.options && typeof plan.options === 'object' ? { ...(plan.options as Record<string, unknown>) } : undefined;
  if (options) {
    for (const key of Object.keys(options)) if (options[key] === null) delete options[key];
    if (typeof options.width === 'number') options.width = clampOdd(options.width, FOOTPRINT_LIMITS.width);
    if (typeof options.depth === 'number') options.depth = clampOdd(options.depth, FOOTPRINT_LIMITS.depth);
    if (typeof options.wallHeight === 'number') options.wallHeight = clampInt(options.wallHeight, FOOTPRINT_LIMITS.wallHeight);
    if (options.materials && typeof options.materials === 'object') {
      const m = { ...(options.materials as Record<string, unknown>) };
      for (const key of Object.keys(m)) if (m[key] === null) delete m[key];
      options.materials = m;
    }
    plan.options = options;
  }
  for (const key of Object.keys(plan)) if (plan[key] === null) delete plan[key];
  if (!Array.isArray(plan.unsupported)) plan.unsupported = [];
  if (typeof plan.explanation !== 'string') plan.explanation = '';
  return plan;
}

export function aiPlanToPatch(plan: AiPlan): SpecPatch {
  const patch: SpecPatch = { kind: plan.kind };
  if (plan.style) patch.style = plan.style;
  if (plan.size) patch.size = plan.size;
  if (plan.materialTheme) patch.materialTheme = plan.materialTheme;
  if (plan.colorTheme) patch.colorTheme = plan.colorTheme;
  if (plan.detailLevel) patch.detailLevel = plan.detailLevel;
  if (plan.options) {
    const options: BuildOptions = compactOptions(plan.options);
    if (Object.keys(options).length > 0) patch.options = options;
  }
  return patch;
}
