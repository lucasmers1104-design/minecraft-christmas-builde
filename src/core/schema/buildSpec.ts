import { z } from 'zod';
import { DEFAULT_PROFILE, SUPPORTED_MINECRAFT_VERSIONS } from '@/core/compat/profile';
import { buildOptionsSchema } from '@/core/schema/buildOptions';

export const BUILDING_TYPES = ['house', 'tree', 'market_stall', 'station'] as const;
export const BUILD_STYLES = ['realistic', 'fairytale', 'christmas'] as const;
export const BUILD_SIZES = ['small', 'medium', 'large'] as const;
export const MATERIAL_THEMES = ['spruce', 'oak', 'stone'] as const;
export const COLOR_THEMES = ['red_green', 'ice_blue', 'natural'] as const;
export const DETAIL_LEVELS = [1, 2, 3] as const;

/** Building kinds that have a real generator. Everything else is shown as "noch nicht verfügbar". */
export const IMPLEMENTED_BUILDING_TYPES: readonly BuildingType[] = ['house', 'tree', 'market_stall', 'station'];

export const MAX_DESCRIPTION_LENGTH = 600;
export const MAX_SEED = 0x7fffffff;

export const buildSpecSchema = z
  .object({
    schemaVersion: z.literal(1),
    kind: z.enum(BUILDING_TYPES),
    description: z.string().max(MAX_DESCRIPTION_LENGTH),
    style: z.enum(BUILD_STYLES),
    size: z.enum(BUILD_SIZES),
    materialTheme: z.enum(MATERIAL_THEMES),
    colorTheme: z.enum(COLOR_THEMES),
    detailLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    seed: z.number().int().min(0).max(MAX_SEED),
    targetMinecraftVersion: z.string().refine((v) => SUPPORTED_MINECRAFT_VERSIONS.includes(v), {
      message: `Nicht unterstützte Minecraft-Version. Unterstützt: ${SUPPORTED_MINECRAFT_VERSIONS.join(', ')}`,
    }),
    /** Fine parameters; empty object = everything derived automatically. */
    options: buildOptionsSchema,
  })
  .strict();

export type BuildSpec = z.infer<typeof buildSpecSchema>;
export type BuildingType = (typeof BUILDING_TYPES)[number];
export type BuildStyle = (typeof BUILD_STYLES)[number];
export type BuildSize = (typeof BUILD_SIZES)[number];
export type MaterialTheme = (typeof MATERIAL_THEMES)[number];
export type ColorTheme = (typeof COLOR_THEMES)[number];
export type DetailLevel = (typeof DETAIL_LEVELS)[number];

export const DEFAULT_DESCRIPTION =
  'Baue ein gemütliches Weihnachtshaus aus Fichtenholz, mit verschneitem Dach, roten Akzenten, leuchtenden Fenstern und einem Schornstein.';

/** The fixed, complete Christmas-house spec used by the Phase-1 vertical slice. */
export const DEFAULT_HOUSE_SPEC: BuildSpec = {
  schemaVersion: 1,
  kind: 'house',
  description: DEFAULT_DESCRIPTION,
  style: 'christmas',
  size: 'medium',
  materialTheme: 'spruce',
  colorTheme: 'red_green',
  detailLevel: 3,
  seed: 1,
  targetMinecraftVersion: DEFAULT_PROFILE.minecraftVersion,
  options: {},
};

export function isImplementedBuildingType(kind: BuildingType): boolean {
  return IMPLEMENTED_BUILDING_TYPES.includes(kind);
}
