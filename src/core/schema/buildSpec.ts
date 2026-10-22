import { z } from 'zod';
import { DEFAULT_PROFILE, SUPPORTED_MINECRAFT_VERSIONS } from '@/core/compat/profile';
import { buildOptionsSchema } from '@/core/schema/buildOptions';
import { STYLE_IDS, THEMES, type StyleId, type Theme } from '@/core/style/styles';

/**
 * BuildSpec v2: building type, one of the 8 styles, the theme axis (none / winter /
 * Christmas) on top of every style, size, detail level, seed, target version and optional
 * fine parameters. Version 1 specs (style christmas/fairytale/realistic plus material and
 * colour themes) are migrated on load (src/core/schema/migrateSpec.ts).
 */

export const BUILDING_TYPES = ['house', 'tree', 'market_stall', 'station', 'tower'] as const;
export const BUILD_SIZES = ['small', 'medium', 'large', 'huge'] as const;
export const DETAIL_LEVELS = [1, 2, 3] as const;
export { STYLE_IDS, THEMES };

/** Building kinds that have a real generator. */
export const IMPLEMENTED_BUILDING_TYPES: readonly BuildingType[] = ['house', 'tree', 'market_stall', 'station', 'tower'];

export const MAX_DESCRIPTION_LENGTH = 600;
export const MAX_SEED = 0x7fffffff;

export const buildSpecSchema = z
  .object({
    schemaVersion: z.literal(2),
    kind: z.enum(BUILDING_TYPES),
    description: z.string().max(MAX_DESCRIPTION_LENGTH),
    style: z.enum(STYLE_IDS),
    theme: z.enum(THEMES),
    size: z.enum(BUILD_SIZES),
    detailLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    seed: z.number().int().min(0).max(MAX_SEED),
    targetMinecraftVersion: z.string().refine((v) => SUPPORTED_MINECRAFT_VERSIONS.includes(v), {
      message: `Nicht unterstützte Minecraft-Version. Unterstützt: ${SUPPORTED_MINECRAFT_VERSIONS.join(', ')}`,
    }),
    /** Fine parameters; empty object = everything derived from the style. */
    options: buildOptionsSchema,
  })
  .strict();

export type BuildSpec = z.infer<typeof buildSpecSchema>;
export type BuildingType = (typeof BUILDING_TYPES)[number];
export type BuildSize = (typeof BUILD_SIZES)[number];
export type DetailLevel = (typeof DETAIL_LEVELS)[number];
export type { StyleId, Theme };

export const DEFAULT_DESCRIPTION =
  'Baue ein gemütliches Weihnachtshaus aus Fichtenholz mit steilem Dach, vielen Laternen, Girlanden und einem Schornstein.';

/** Default spec: a rustic Christmas house. */
export const DEFAULT_HOUSE_SPEC: BuildSpec = {
  schemaVersion: 2,
  kind: 'house',
  description: DEFAULT_DESCRIPTION,
  style: 'rustic',
  theme: 'christmas',
  size: 'medium',
  detailLevel: 3,
  seed: 1,
  targetMinecraftVersion: DEFAULT_PROFILE.minecraftVersion,
  options: {},
};

export function isImplementedBuildingType(kind: BuildingType): boolean {
  return IMPLEMENTED_BUILDING_TYPES.includes(kind);
}
