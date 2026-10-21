import { z } from 'zod';

/**
 * Fine-grained, optional building parameters. Every field is optional: `undefined` means
 * "derive from size / style / detail level". The same structure is filled by the UI, the
 * free-text parser and (later) the local AI planner, and every field changes real blocks.
 */

export const ROOF_SHAPES = ['gable', 'steep', 'hip'] as const;
export const TOWER_POSITIONS = ['none', 'left', 'right'] as const;
export const ANNEX_SIDES = ['none', 'left', 'right'] as const;
export const WINDOW_DENSITIES = ['few', 'normal', 'many'] as const;
export const WOOD_TYPES = ['spruce', 'oak', 'dark_oak', 'birch'] as const;

/** Allowed materials per building part (short block ids, all in the registry). */
export const MATERIAL_CHOICES = {
  wall: [
    'spruce_planks',
    'oak_planks',
    'dark_oak_planks',
    'birch_planks',
    'stone_bricks',
    'cobblestone',
    'stone',
    'bricks',
    'mud_bricks',
    'tuff_bricks',
    'quartz_block',
    'calcite',
    'sandstone',
    'white_terracotta',
    'white_concrete',
  ],
  roof: [
    'dark_oak_planks',
    'spruce_planks',
    'oak_planks',
    'birch_planks',
    'deepslate_tiles',
    'bricks',
    'stone_bricks',
    'mud_bricks',
    'red_terracotta',
    'green_terracotta',
    'blue_terracotta',
    'black_terracotta',
    'red_concrete',
    'gray_concrete',
    'packed_ice',
  ],
  floor: [
    'spruce_planks',
    'oak_planks',
    'dark_oak_planks',
    'birch_planks',
    'stone_bricks',
    'smooth_stone',
    'polished_andesite',
    'polished_deepslate',
  ],
  foundation: [
    'cobblestone',
    'stone_bricks',
    'mossy_cobblestone',
    'stone',
    'polished_andesite',
    'smooth_stone',
    'deepslate_tiles',
    'bricks',
  ],
  accent: [
    'red_wool',
    'green_wool',
    'white_wool',
    'light_blue_wool',
    'blue_wool',
    'yellow_wool',
    'orange_wool',
    'purple_wool',
    'black_wool',
  ],
} as const;

export type MaterialPart = keyof typeof MATERIAL_CHOICES;
export const MATERIAL_PARTS = Object.keys(MATERIAL_CHOICES) as MaterialPart[];

const enumOf = <T extends readonly [string, ...string[]]>(values: T) => z.enum(values);

export const FOOTPRINT_LIMITS = {
  width: { min: 7, max: 33 },
  depth: { min: 5, max: 25 },
  wallHeight: { min: 3, max: 8 },
} as const;

export const buildOptionsSchema = z
  .object({
    width: z
      .number()
      .int()
      .min(FOOTPRINT_LIMITS.width.min)
      .max(FOOTPRINT_LIMITS.width.max)
      .refine((v) => v % 2 === 1, { message: 'Breite muss ungerade sein (mittige Tür)' })
      .optional(),
    depth: z
      .number()
      .int()
      .min(FOOTPRINT_LIMITS.depth.min)
      .max(FOOTPRINT_LIMITS.depth.max)
      .refine((v) => v % 2 === 1, { message: 'Tiefe muss ungerade sein (mittiger First)' })
      .optional(),
    wallHeight: z.number().int().min(FOOTPRINT_LIMITS.wallHeight.min).max(FOOTPRINT_LIMITS.wallHeight.max).optional(),
    roofShape: z.enum(ROOF_SHAPES).optional(),
    windows: z.enum(WINDOW_DENSITIES).optional(),
    snow: z.boolean().optional(),
    chimney: z.boolean().optional(),
    lights: z.boolean().optional(),
    garland: z.boolean().optional(),
    christmasTree: z.boolean().optional(),
    presents: z.boolean().optional(),
    /** Square tower with pyramid roof on a front corner (house only). */
    tower: z.enum(TOWER_POSITIONS).optional(),
    /** Smaller gabled wing on one side, connected by an open doorway (house only). */
    annex: z.enum(ANNEX_SIDES).optional(),
    /** Roofed porch in front of the entrance (house only). */
    porch: z.boolean().optional(),
    /** Hedge around the plot with a path to the door (house only). */
    hedge: z.boolean().optional(),
    frameWood: z.enum(WOOD_TYPES).optional(),
    materials: z
      .object({
        wall: enumOf(MATERIAL_CHOICES.wall).optional(),
        roof: enumOf(MATERIAL_CHOICES.roof).optional(),
        floor: enumOf(MATERIAL_CHOICES.floor).optional(),
        foundation: enumOf(MATERIAL_CHOICES.foundation).optional(),
        accent: enumOf(MATERIAL_CHOICES.accent).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type BuildOptions = z.infer<typeof buildOptionsSchema>;
export type RoofShape = (typeof ROOF_SHAPES)[number];
export type TowerPosition = (typeof TOWER_POSITIONS)[number];
export type AnnexSide = (typeof ANNEX_SIDES)[number];
export type WindowDensity = (typeof WINDOW_DENSITIES)[number];
export type WoodType = (typeof WOOD_TYPES)[number];

/** Rounds to the nearest allowed odd value within limits (used by parser and UI). */
export function clampOdd(value: number, limits: { min: number; max: number }): number {
  let v = Math.round(value);
  if (v % 2 === 0) v += 1;
  return Math.min(limits.max % 2 === 1 ? limits.max : limits.max - 1, Math.max(limits.min, v));
}

export function clampInt(value: number, limits: { min: number; max: number }): number {
  return Math.min(limits.max, Math.max(limits.min, Math.round(value)));
}

/** Keeps only defined values, so `{}` means "everything automatic". */
export function compactOptions(options: BuildOptions): BuildOptions {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(options)) {
    if (value === undefined) continue;
    if (key === 'materials' && value && typeof value === 'object') {
      const m = Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined));
      if (Object.keys(m).length > 0) out.materials = m;
      continue;
    }
    out[key] = value;
  }
  return out as BuildOptions;
}
