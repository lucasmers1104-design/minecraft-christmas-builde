import { z } from 'zod';
import type { SpecPatch } from '@/core/generator/parseDescription';
import {
  ANNEX_SIDES,
  clampInt,
  clampOdd,
  compactOptions,
  DOOR_FAMILIES,
  FOOTPRINT_LIMITS,
  LANTERN_DENSITIES,
  SYMMETRIES,
  TOWER_KINDS,
  TOWER_POSITIONS,
  WINDOW_DENSITIES,
  WINDOW_FAMILIES,
  WING_LAYOUTS,
  type BuildOptions,
  type MaterialRoleUi,
} from '@/core/schema/buildOptions';
import { BUILD_SIZES, BUILDING_TYPES, type BuildingType, type BuildSize } from '@/core/schema/buildSpec';
import { getMaterial, hasMaterial } from '@/core/style/materials';
import { PALETTES } from '@/core/style/palettes';
import { ROOF_PROFILES, ROOF_TYPES, STYLE_IDS, STYLE_LABELS, STYLES, THEME_LABELS, THEMES, type StyleId, type Theme } from '@/core/style/styles';
import { COMPOSITION_LABELS, COMPOSITIONS } from '@/core/style/compositions';

/**
 * The building plan: ONE flat format shared by the rule-based parser and the local AI.
 *
 * Only catalogue decisions – enums from the style catalogue and the option lists, bounded
 * integers and yes/no switches. No coordinates, no block ids (the material fields are
 * catalogue material ids from a short fixed list). Every field is required so a small model
 * never has to decide whether to omit something: "auto" (enums) or null (numbers, switches)
 * means "not specified, the style decides". `planToPatch` drops those values; `patchToPlan`
 * turns a parser result into the same format so the UI can show both identically.
 */

export const AUTO = 'auto' as const;

const withAuto = <const T extends readonly string[]>(values: T) => [AUTO, ...values] as const;

/** Plan limits = the option limits of BuildSpec v2. */
export const PLAN_LIMITS = {
  floors: FOOTPRINT_LIMITS.floors,
  width: FOOTPRINT_LIMITS.width,
  depth: FOOTPRINT_LIMITS.depth,
  overhang: FOOTPRINT_LIMITS.overhang,
  dormers: FOOTPRINT_LIMITS.dormers,
} as const;

export const PLAN_MATERIAL_ROLES = ['wall', 'roof', 'frame', 'plinth', 'accent'] as const satisfies readonly MaterialRoleUi[];
export type PlanMaterialRole = (typeof PLAN_MATERIAL_ROLES)[number];

const PLANK_WOODS = ['oak', 'spruce', 'birch', 'dark_oak', 'cherry', 'jungle', 'acacia', 'mangrove', 'bamboo', 'crimson', 'warped'];

/**
 * Curated material ids per role that text or AI may name (everything else stays a UI-only
 * choice). Checked against the material catalogue in tests; unknown ids are filtered out.
 */
export const PLAN_MATERIALS_RAW: Readonly<Record<PlanMaterialRole, readonly string[]>> = {
  wall: [
    ...PLANK_WOODS.map((w) => `${w}_planks`),
    'spruce_log',
    'oak_log',
    'dark_oak_log',
    'stripped_spruce_log',
    'stripped_oak_log',
    'stone_bricks',
    'cobblestone',
    'mossy_cobblestone',
    'stone',
    'andesite',
    'granite',
    'diorite',
    'calcite',
    'deepslate_bricks',
    'cobbled_deepslate',
    'tuff_bricks',
    'polished_blackstone_bricks',
    'bricks',
    'mud_bricks',
    'sandstone',
    'smooth_sandstone',
    'red_sandstone',
    'quartz_block',
    'white_concrete',
    'white_terracotta',
    'terracotta',
  ],
  roof: [
    'spruce_planks',
    'dark_oak_planks',
    'oak_planks',
    'birch_planks',
    'cherry_planks',
    'acacia_planks',
    'mangrove_planks',
    'crimson_planks',
    'warped_planks',
    'deepslate_tiles',
    'deepslate_bricks',
    'cobbled_deepslate',
    'polished_deepslate',
    'stone_bricks',
    'cobblestone',
    'andesite',
    'bricks',
    'red_nether_bricks',
    'polished_blackstone_bricks',
    'sandstone',
    'red_sandstone',
    'waxed_cut_copper',
    'waxed_oxidized_cut_copper',
  ],
  frame: [
    'oak_log',
    'spruce_log',
    'birch_log',
    'dark_oak_log',
    'cherry_log',
    'jungle_log',
    'acacia_log',
    'mangrove_log',
    'stripped_oak_log',
    'stripped_spruce_log',
    'stripped_birch_log',
    'stripped_dark_oak_log',
    'stripped_cherry_log',
    'dark_oak_planks',
    'spruce_planks',
    'oak_planks',
  ],
  plinth: [
    'cobblestone',
    'mossy_cobblestone',
    'stone_bricks',
    'mossy_stone_bricks',
    'stone',
    'andesite',
    'cobbled_deepslate',
    'deepslate_bricks',
    'polished_deepslate',
    'blackstone',
    'tuff_bricks',
    'bricks',
    'sandstone',
    'granite',
  ],
  accent: ['red_wool', 'white_wool', 'gold_block', 'red_terracotta', 'moss_block', 'spruce_planks', 'pink_stained_glass', 'light_blue_stained_glass'],
};

export const PLAN_MATERIALS: Readonly<Record<PlanMaterialRole, readonly string[]>> = {
  wall: PLAN_MATERIALS_RAW.wall.filter(hasMaterial),
  roof: PLAN_MATERIALS_RAW.roof.filter(hasMaterial),
  frame: PLAN_MATERIALS_RAW.frame.filter(hasMaterial),
  plinth: PLAN_MATERIALS_RAW.plinth.filter(hasMaterial),
  accent: PLAN_MATERIALS_RAW.accent.filter(hasMaterial),
};

export const MATERIAL_FIELDS = {
  wall: 'wallMaterial',
  roof: 'roofMaterial',
  frame: 'frameMaterial',
  plinth: 'plinthMaterial',
  accent: 'accentMaterial',
} as const satisfies Record<PlanMaterialRole, string>;

export const PALETTE_IDS: readonly string[] = PALETTES.map((p) => p.id);

/** Style that owns a palette (palettes are style specific). */
export function paletteStyle(paletteId: string): StyleId | null {
  return STYLE_IDS.find((s) => STYLES[s].palettes.includes(paletteId)) ?? null;
}

const nullableInt = (limits: { readonly min: number; readonly max: number }) => z.number().int().min(limits.min).max(limits.max).nullable();
const tri = () => z.boolean().nullable();
const idEnum = (ids: readonly string[]) => z.enum([AUTO, ...ids] as [string, ...string[]]);

/**
 * Builds the plan schema from the catalogue (styles, roof types, option lists, palettes,
 * material list). Field order is the order the model writes: explanation and unsupported
 * first (a short "think aloud"), then the decisions.
 */
export function createPlanSchema() {
  return z
    .object({
      /** 1–2 short German sentences: what is planned (shown to the user). */
      explanation: z.string().max(600),
      /** Wishes the generator cannot build (Pool, Garage, Möbel …), short German keywords. */
      unsupported: z.array(z.string().max(200)).max(12),
      kind: z.enum(withAuto(BUILDING_TYPES)),
      style: z.enum(withAuto(STYLE_IDS)),
      palette: idEnum(PALETTE_IDS),
      theme: z.enum(withAuto(THEMES)),
      size: z.enum(withAuto(BUILD_SIZES)),
      detailLevel: z.literal([1, 2, 3]).nullable(),
      composition: z.enum(COMPOSITIONS),
      floors: nullableInt(PLAN_LIMITS.floors),
      width: nullableInt(PLAN_LIMITS.width),
      depth: nullableInt(PLAN_LIMITS.depth),
      roofType: z.enum(withAuto(ROOF_TYPES)),
      roofProfile: z.enum(withAuto(ROOF_PROFILES)),
      overhang: nullableInt(PLAN_LIMITS.overhang),
      dormers: nullableInt(PLAN_LIMITS.dormers),
      wings: z.enum(withAuto(WING_LAYOUTS)),
      annex: z.enum(withAuto(ANNEX_SIDES)),
      tower: z.enum(withAuto(TOWER_KINDS)),
      towerPosition: z.enum(withAuto(TOWER_POSITIONS)),
      symmetry: z.enum(SYMMETRIES),
      windows: z.enum(withAuto(WINDOW_DENSITIES)),
      windowFamily: z.enum(WINDOW_FAMILIES),
      doorFamily: z.enum(DOOR_FAMILIES),
      porch: tri(),
      balcony: tri(),
      chimney: tri(),
      oriel: tri(),
      jetty: tri(),
      garden: tri(),
      lanternDensity: z.enum(withAuto(LANTERN_DENSITIES)),
      soulLanterns: tri(),
      garland: tri(),
      christmasTree: tri(),
      presents: tri(),
      snow: tri(),
      wallMaterial: idEnum(PLAN_MATERIALS.wall),
      roofMaterial: idEnum(PLAN_MATERIALS.roof),
      frameMaterial: idEnum(PLAN_MATERIALS.frame),
      plinthMaterial: idEnum(PLAN_MATERIALS.plinth),
      accentMaterial: idEnum(PLAN_MATERIALS.accent),
    })
    .strict();
}

export const planSchema = createPlanSchema();
export type BuildPlan = z.infer<typeof planSchema>;
export type PlanField = keyof BuildPlan;
/** A plan with only the decided fields (rest = auto/null). */
export type PlanDraft = Partial<BuildPlan>;

export const PLAN_FIELDS: readonly PlanField[] = Object.keys(planSchema.shape) as PlanField[];

const INT_FIELDS = ['floors', 'width', 'depth', 'overhang', 'dormers'] as const;
const BOOL_FIELDS = ['porch', 'balcony', 'chimney', 'oriel', 'jetty', 'garden', 'soulLanterns', 'garland', 'christmasTree', 'presents', 'snow'] as const;
const ENUM_OPTION_FIELDS = ['composition', 'roofType', 'roofProfile', 'wings', 'annex', 'tower', 'towerPosition', 'symmetry', 'windows', 'windowFamily', 'doorFamily', 'lanternDensity'] as const;

/** Fields whose "not specified" value is null (numbers and switches); all others use "auto". */
const NULL_FIELDS: ReadonlySet<PlanField> = new Set<PlanField>(['detailLevel', ...INT_FIELDS, ...BOOL_FIELDS]);

/** JSON schema for Ollama's structured output (`format`), generated per call from the catalogue. */
export function planJsonSchema(): Record<string, unknown> {
  const schema = z.toJSONSchema(createPlanSchema()) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}

/** All fields "not specified". */
export function emptyPlan(): BuildPlan {
  const plan: Record<string, unknown> = { explanation: '', unsupported: [] };
  for (const field of PLAN_FIELDS) {
    if (field === 'explanation' || field === 'unsupported') continue;
    plan[field] = NULL_FIELDS.has(field) ? null : AUTO;
  }
  return plan as BuildPlan;
}

/** Fills a draft (e.g. a few-shot example) with "not specified" values. */
export function completePlan(draft: PlanDraft): BuildPlan {
  return { ...emptyPlan(), ...draft };
}

// ---------------------------------------------------------------------------------------------
// Normalisation (before strict validation)

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

const AUTO_WORDS = new Set(['auto', 'automatisch', 'default', 'standard', 'unknown', 'unbekannt', 'unspecified', 'n/a', 'null', '']);
const NONE_WORDS = new Set(['none', 'keine', 'kein', 'keiner', 'nein', 'no', 'ohne']);

function enumValues(field: PlanField): readonly unknown[] | null {
  const options = (planSchema.shape[field] as unknown as { options?: unknown }).options;
  return Array.isArray(options) ? options : null;
}

function normalizeEnum(field: PlanField, value: unknown): unknown {
  const allowed = enumValues(field);
  if (!allowed) return value;
  if (value === null || value === undefined) return AUTO;
  if (typeof value !== 'string') return value;
  let s = value.trim();
  if (field.endsWith('Material')) s = s.replace(/^minecraft:/i, '');
  const lower = s.toLowerCase();
  const exact = allowed.find((v) => typeof v === 'string' && v.toLowerCase() === lower);
  if (exact !== undefined) return exact;
  // Standard roof profile is a real value; "standard" must not become "auto" there.
  if (AUTO_WORDS.has(lower)) return AUTO;
  if (NONE_WORDS.has(lower) && allowed.includes('none')) return 'none';
  return value; // stays invalid → the model gets the error in the repair round
}

function normalizeInt(field: (typeof INT_FIELDS)[number], value: unknown): unknown {
  if (value === null || value === undefined) return null;
  let n = value;
  if (typeof n === 'string') {
    if (AUTO_WORDS.has(n.trim().toLowerCase())) return null;
    n = Number(n.trim().replace(',', '.'));
  }
  if (typeof n !== 'number' || !Number.isFinite(n)) return value;
  const limits = PLAN_LIMITS[field];
  return field === 'width' || field === 'depth' ? clampOdd(n, limits) : clampInt(n, limits);
}

function normalizeBool(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1 ? true : value === 0 ? false : value;
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    if (['true', 'ja', 'yes', '1'].includes(s)) return true;
    if (['false', 'nein', 'no', '0'].includes(s)) return false;
    if (AUTO_WORDS.has(s)) return null;
  }
  return value;
}

function normalizeDetail(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && AUTO_WORDS.has(value.trim().toLowerCase())) return null;
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) return value;
  return clampInt(n, { min: 1, max: 3 });
}

function normalizeTextList(value: unknown): string[] {
  const raw: unknown[] = Array.isArray(value) ? value : typeof value === 'string' && value.trim() ? [value] : [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const s = item.trim().slice(0, 200);
    if (s && !out.some((o) => o.toLowerCase() === s.toLowerCase())) out.push(s);
    if (out.length >= 12) break;
  }
  return out;
}

/**
 * Repairs harmless deviations a model tends to make before strict validation: missing fields
 * (→ auto/null), null for enums, numbers or booleans as strings, even widths, out-of-range
 * numbers, "minecraft:" prefixes, a nested `options`/`materials` object, a palette of another
 * style. Unknown enum values stay as they are so the repair round can name them. Input without
 * a single plan field is returned unchanged (and fails validation).
 */
export function normalizePlan(raw: unknown): unknown {
  if (!isObj(raw)) return raw;
  const flat: Obj = { ...raw };
  if (isObj(flat.options)) {
    for (const [k, v] of Object.entries(flat.options)) if (!(k in flat)) flat[k] = v;
    delete flat.options;
  }
  if (isObj(flat.materials)) {
    const m = flat.materials;
    for (const role of PLAN_MATERIAL_ROLES) {
      if (m[role] !== undefined && flat[MATERIAL_FIELDS[role]] === undefined) flat[MATERIAL_FIELDS[role]] = m[role];
    }
    delete flat.materials;
  }
  if (!PLAN_FIELDS.some((f) => f in flat)) return raw;

  const plan: Obj = {};
  for (const field of PLAN_FIELDS) {
    const value = flat[field];
    if (field === 'explanation') plan[field] = typeof value === 'string' ? value.trim().slice(0, 600) : '';
    else if (field === 'unsupported') plan[field] = normalizeTextList(value);
    else if (field === 'detailLevel') plan[field] = normalizeDetail(value);
    else if ((INT_FIELDS as readonly string[]).includes(field)) plan[field] = normalizeInt(field as (typeof INT_FIELDS)[number], value);
    else if ((BOOL_FIELDS as readonly string[]).includes(field)) plan[field] = normalizeBool(value);
    else plan[field] = normalizeEnum(field, value);
  }
  // Extra keys are dropped: the plan has a fixed shape.

  // Palettes belong to a style: infer the style from the palette, drop foreign palettes.
  if (typeof plan.palette === 'string' && plan.palette !== AUTO && PALETTE_IDS.includes(plan.palette)) {
    const owner = paletteStyle(plan.palette);
    if (plan.style === AUTO && owner) plan.style = owner;
    else if (owner && plan.style !== owner) plan.palette = AUTO;
  }
  if (plan.tower === 'none') plan.towerPosition = AUTO;
  return plan;
}

// ---------------------------------------------------------------------------------------------
// Plan ⇄ SpecPatch

const isSet = (v: unknown): boolean => v !== null && v !== undefined && v !== AUTO;

/** Plan → partial spec: "auto"/null are dropped, so the style decides those values. */
export function planToPatch(plan: BuildPlan): SpecPatch {
  const patch: SpecPatch = {};
  if (plan.kind !== AUTO) patch.kind = plan.kind;
  if (plan.style !== AUTO) patch.style = plan.style;
  if (plan.theme !== AUTO) patch.theme = plan.theme;
  if (plan.size !== AUTO) patch.size = plan.size;
  if (plan.detailLevel !== null) patch.detailLevel = plan.detailLevel;

  const o: Record<string, unknown> = {};
  if (isSet(plan.palette)) o.palette = plan.palette;
  for (const f of INT_FIELDS) if (plan[f] !== null) o[f] = plan[f];
  for (const f of BOOL_FIELDS) if (plan[f] !== null) o[f] = plan[f];
  for (const f of ENUM_OPTION_FIELDS) if (isSet(plan[f])) o[f] = plan[f];
  const materials: Record<string, string> = {};
  for (const role of PLAN_MATERIAL_ROLES) {
    const id = plan[MATERIAL_FIELDS[role]];
    if (id !== AUTO && hasMaterial(id)) materials[role] = id;
  }
  if (Object.keys(materials).length > 0) o.materials = materials;
  const options = compactOptions(o as BuildOptions);
  if (Object.keys(options).length > 0) patch.options = options;
  return patch;
}

/**
 * Partial spec (e.g. from the parser) → plan. Values outside the plan's catalogue (floor
 * height, materials outside the curated list) are not representable and left out.
 */
export function patchToPlan(patch: SpecPatch, extra: { explanation?: string; unsupported?: readonly string[] } = {}): BuildPlan {
  const plan = emptyPlan() as Record<string, unknown>;
  for (const key of ['kind', 'style', 'theme', 'size', 'detailLevel'] as const) if (patch[key] !== undefined) plan[key] = patch[key];
  const o = patch.options ?? {};
  for (const [key, value] of Object.entries(o)) {
    if (value === undefined || key === 'materials' || key === 'floorHeight') continue;
    if (key in plan) plan[key] = value;
  }
  for (const role of PLAN_MATERIAL_ROLES) {
    const id = o.materials?.[role];
    if (id && PLAN_MATERIALS[role].includes(id)) plan[MATERIAL_FIELDS[role]] = id;
  }
  plan.explanation = (extra.explanation ?? '').slice(0, 600);
  plan.unsupported = normalizeTextList(extra.unsupported ?? []);
  return planSchema.parse(plan);
}

// ---------------------------------------------------------------------------------------------
// German labels and a short description (identical display for parser and AI plans)

export const KIND_LABELS: Readonly<Record<BuildingType, string>> = {
  house: 'Haus',
  tree: 'Weihnachtsbaum',
  market_stall: 'Marktstand',
  station: 'Bahnhof',
  tower: 'Turm',
};

export const SIZE_LABELS: Readonly<Record<BuildSize, string>> = { small: 'klein', medium: 'mittel', large: 'groß', huge: 'riesig' };

export const PLAN_FIELD_LABELS: Readonly<Record<PlanField, string>> = {
  explanation: 'Erklärung',
  unsupported: 'Nicht umsetzbar',
  kind: 'Bauwerk',
  style: 'Stil',
  palette: 'Palette',
  theme: 'Thema',
  size: 'Größe',
  detailLevel: 'Detailgrad',
  composition: 'Bauform',
  floors: 'Geschosse',
  width: 'Breite',
  depth: 'Tiefe',
  roofType: 'Dachform',
  roofProfile: 'Dachprofil',
  overhang: 'Dachüberstand',
  dormers: 'Gauben',
  wings: 'Grundriss',
  annex: 'Anbau',
  tower: 'Turm',
  towerPosition: 'Turmposition',
  symmetry: 'Symmetrie',
  windows: 'Fenster',
  windowFamily: 'Fensterform',
  doorFamily: 'Tür',
  porch: 'Veranda/Vordach',
  balcony: 'Balkon',
  chimney: 'Schornstein',
  oriel: 'Erker',
  jetty: 'Auskragung (Jetty)',
  garden: 'Garten',
  lanternDensity: 'Laternen',
  soulLanterns: 'Seelenlaternen',
  garland: 'Girlanden',
  christmasTree: 'Weihnachtsbaum am Haus',
  presents: 'Geschenke',
  snow: 'Schnee auf dem Dach',
  wallMaterial: 'Wände',
  roofMaterial: 'Dachmaterial',
  frameMaterial: 'Rahmen/Balken',
  plinthMaterial: 'Sockel',
  accentMaterial: 'Akzente',
};

/** German labels of enum values (keys are the catalogue values). */
export const PLAN_VALUE_LABELS: Readonly<Partial<Record<PlanField, Readonly<Record<string, string>>>>> = {
  kind: KIND_LABELS,
  style: STYLE_LABELS,
  theme: THEME_LABELS,
  size: SIZE_LABELS,
  detailLevel: { 1: 'schlicht', 2: 'normal', 3: 'festlich' },
  composition: COMPOSITION_LABELS,
  roofType: {
    gable: 'Satteldach',
    hip: 'Walmdach',
    half_hip: 'Krüppelwalmdach',
    irimoya: 'Irimoya-Dach (unten Walm, oben Giebel)',
    pyramid: 'Pyramidendach',
    mansard: 'Mansarddach',
    gambrel: 'Scheunendach (Gambrel)',
    saltbox: 'Saltbox-Dach',
    a_frame: 'A-Frame',
    flat: 'Flachdach',
    pagoda: 'Pagodendach',
  },
  roofProfile: {
    standard: 'normal',
    steep: 'steil',
    shallow: 'flach geneigt',
    flared: 'ausgestellte Traufe',
    bell: 'geschwungen (Glocke)',
    convex: 'gewölbt',
    ogee: 'S-Schwung',
  },
  wings: { none: 'einfach', L: 'L-Form', T: 'T-Form', U: 'U-Form' },
  annex: { none: 'kein Anbau', left: 'links', right: 'rechts' },
  tower: { none: 'kein Turm', square: 'eckig', round: 'rund' },
  towerPosition: { front_left: 'vorne links', front_right: 'vorne rechts', back_left: 'hinten links', back_right: 'hinten rechts' },
  symmetry: { auto: 'Stil-Standard', symmetric: 'symmetrisch', asymmetric: 'asymmetrisch', rambling: 'verwinkelt' },
  windows: { few: 'wenige', normal: 'normal', many: 'viele' },
  windowFamily: {
    simple: 'einfach',
    shuttered: 'mit Fensterläden',
    framed: 'gerahmt',
    arched: 'Bogenfenster',
    round: 'Rundfenster',
    shoji: 'Shoji',
    band: 'Fensterband',
    leaded: 'Bleiglas',
  },
  doorFamily: { simple: 'einfach', transom: 'mit Oberlicht', arched: 'Rundbogen', double: 'Doppeltür', porch: 'mit Vordach', genkan: 'Genkan' },
  lanternDensity: { none: 'keine', few: 'wenige', normal: 'normal', many: 'viele' },
};

export interface PlanEntry {
  field: PlanField;
  label: string;
  value: string;
}

/** German label of one plan value. */
export function planValueLabel(field: PlanField, value: unknown): string {
  if (typeof value === 'boolean') return value ? 'ja' : 'nein';
  if (field === 'palette' && typeof value === 'string') return PALETTES.find((p) => p.id === value)?.label ?? value;
  if (field.endsWith('Material') && typeof value === 'string' && hasMaterial(value)) return getMaterial(value).label;
  return PLAN_VALUE_LABELS[field]?.[String(value)] ?? String(value);
}

/** The decided fields of a plan with German labels, in schema order (for the UI). */
export function planEntries(plan: BuildPlan): PlanEntry[] {
  const out: PlanEntry[] = [];
  for (const field of PLAN_FIELDS) {
    if (field === 'explanation' || field === 'unsupported') continue;
    const value = plan[field];
    if (!isSet(value)) continue;
    out.push({ field, label: PLAN_FIELD_LABELS[field], value: planValueLabel(field, value) });
  }
  return out;
}

/** Short German summary of a plan (the parser's `explanation`). */
export function describePlan(plan: BuildPlan): string {
  const entries = planEntries(plan);
  const head = [
    plan.kind !== AUTO ? KIND_LABELS[plan.kind] : 'Bauwerk',
    plan.style !== AUTO ? `im Stil ${STYLE_LABELS[plan.style]}` : null,
    plan.theme !== AUTO && plan.theme !== 'none' ? `mit Thema ${THEME_LABELS[plan.theme as Theme]}` : null,
  ]
    .filter(Boolean)
    .join(' ');
  const rest = entries.filter((e) => !['kind', 'style', 'theme'].includes(e.field)).map((e) => `${e.label}: ${e.value}`);
  const parts: string[] = [];
  if (entries.length === 0) parts.push('Keine besonderen Wünsche erkannt – Stil, Maße und Bauteile kommen aus den Standardwerten.');
  else parts.push(`${head}.${rest.length > 0 ? ` ${rest.join(', ')}.` : ''}`);
  if (plan.unsupported.length > 0) parts.push(`Nicht umsetzbar: ${plan.unsupported.join('; ')}.`);
  const text = parts.join(' ');
  return text.length > 600 ? `${text.slice(0, 599)}…` : text;
}
