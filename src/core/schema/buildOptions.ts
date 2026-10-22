import { z } from 'zod';
import { hasMaterial } from '@/core/style/materials';
import { ROOF_PROFILES, ROOF_TYPES } from '@/core/style/styles';

/**
 * Fine-grained, optional building parameters (BuildSpec v2). Every field is optional:
 * `undefined` means "the style decides" (priors, proportions, detail level). The same flat
 * structure is filled by the UI, the free-text parser and the local AI planner; materials are
 * catalogue ids (never free block ids) and only offered in the UI.
 */

export const WING_LAYOUTS = ['none', 'L', 'T', 'U'] as const;
export const ANNEX_SIDES = ['none', 'left', 'right'] as const;
export const TOWER_KINDS = ['none', 'square', 'round'] as const;
export const TOWER_POSITIONS = ['front_left', 'front_right', 'back_left', 'back_right'] as const;
export const SYMMETRIES = ['auto', 'symmetric', 'asymmetric', 'rambling'] as const;
export const WINDOW_DENSITIES = ['few', 'normal', 'many'] as const;
export const LANTERN_DENSITIES = ['none', 'few', 'normal', 'many'] as const;
export const WINDOW_FAMILIES = ['auto', 'simple', 'shuttered', 'framed', 'arched', 'round', 'shoji', 'band', 'leaded'] as const;
export const DOOR_FAMILIES = ['auto', 'simple', 'transom', 'arched', 'double', 'porch', 'genkan'] as const;
export type WindowFamily = (typeof WINDOW_FAMILIES)[number];
export type DoorFamily = (typeof DOOR_FAMILIES)[number];
export const MATERIAL_ROLES_UI = ['wall', 'roof', 'frame', 'plinth', 'accent'] as const;

export const FOOTPRINT_LIMITS = {
  width: { min: 5, max: 61 },
  depth: { min: 5, max: 61 },
  floors: { min: 1, max: 8 },
  floorHeight: { min: 4, max: 6 },
  overhang: { min: 0, max: 3 },
  dormers: { min: 0, max: 6 },
} as const;

const oddInt = (limits: { min: number; max: number }, message: string) =>
  z.number().int().min(limits.min).max(limits.max).refine((v) => v % 2 === 1, { message });
const int = (limits: { min: number; max: number }) => z.number().int().min(limits.min).max(limits.max);
const materialId = z.string().max(64).refine((id) => hasMaterial(id), { message: 'Unbekanntes Material' });

export const buildOptionsSchema = z
  .object({
    width: oddInt(FOOTPRINT_LIMITS.width, 'Breite muss ungerade sein (mittige Tür)').optional(),
    depth: oddInt(FOOTPRINT_LIMITS.depth, 'Tiefe muss ungerade sein (mittiger First)').optional(),
    floors: int(FOOTPRINT_LIMITS.floors).optional(),
    floorHeight: int(FOOTPRINT_LIMITS.floorHeight).optional(),
    roofType: z.enum(ROOF_TYPES).optional(),
    roofProfile: z.enum(ROOF_PROFILES).optional(),
    overhang: int(FOOTPRINT_LIMITS.overhang).optional(),
    dormers: int(FOOTPRINT_LIMITS.dormers).optional(),
    wings: z.enum(WING_LAYOUTS).optional(),
    annex: z.enum(ANNEX_SIDES).optional(),
    tower: z.enum(TOWER_KINDS).optional(),
    towerPosition: z.enum(TOWER_POSITIONS).optional(),
    symmetry: z.enum(SYMMETRIES).optional(),
    windows: z.enum(WINDOW_DENSITIES).optional(),
    windowFamily: z.enum(WINDOW_FAMILIES).optional(),
    doorFamily: z.enum(DOOR_FAMILIES).optional(),
    jetty: z.boolean().optional(),
    oriel: z.boolean().optional(),
    porch: z.boolean().optional(),
    balcony: z.boolean().optional(),
    chimney: z.boolean().optional(),
    lanternDensity: z.enum(LANTERN_DENSITIES).optional(),
    soulLanterns: z.boolean().optional(),
    garland: z.boolean().optional(),
    christmasTree: z.boolean().optional(),
    presents: z.boolean().optional(),
    /** Snow only on explicit request, and only where it holds (user decision). */
    snow: z.boolean().optional(),
    garden: z.boolean().optional(),
    /** Palette id of the style (see src/core/style/palettes.ts). */
    palette: z.string().max(40).optional(),
    materials: z
      .object({
        wall: materialId.optional(),
        roof: materialId.optional(),
        frame: materialId.optional(),
        plinth: materialId.optional(),
        accent: materialId.optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type BuildOptions = z.infer<typeof buildOptionsSchema>;
export type WingLayout = (typeof WING_LAYOUTS)[number];
export type TowerKind = (typeof TOWER_KINDS)[number];
export type TowerPosition = (typeof TOWER_POSITIONS)[number];
export type SymmetryOption = (typeof SYMMETRIES)[number];
export type WindowDensity = (typeof WINDOW_DENSITIES)[number];
export type MaterialRoleUi = (typeof MATERIAL_ROLES_UI)[number];

/** Rounds to the nearest allowed odd value within limits (used by parser, AI and UI). */
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
