import { isAvailableIn } from '@/core/blocks/registry';
import { brightnessOf, formOf, hasMaterial, hasOwnForm, type Form } from '@/core/style/materials';
import { getPalette, ROLES, type Palette, type Role } from '@/core/style/palettes';
import { STYLE_IDS, STYLES, type StyleDef } from '@/core/style/styles';

/**
 * Palette and style lints (run by tests; the rules come from the research report):
 * - roof material differs from the wall material,
 * - frame or roof at least ΔL* 15 away from the wall (bright walls should get a dark roof:
 *   warning only),
 * - 3–5 main material families plus at most 2 accents,
 * - the roof only from families that have stairs (flat-roof styles: slabs),
 * - every role resolves to the forms the generator asks for, in every Minecraft version,
 * - no forbidden materials of the style.
 */

export interface LintResult {
  errors: string[];
  warnings: string[];
}

/** Forms the generator needs per role (alternatives separated: any one is enough). */
const REQUIRED_FORMS: Readonly<Record<Role, readonly (readonly Form[])[]>> = {
  plinth: [['block'], ['stairs']],
  wall: [['block']],
  upperWall: [['block']],
  infill: [['block']],
  frame: [['pillar', 'block'], ['stairs'], ['slab']],
  beam: [['pillar', 'block']],
  roof: [['stairs'], ['slab'], ['block']],
  roofTrim: [['stairs'], ['slab']],
  ridge: [['slab'], ['block']],
  soffit: [['stairs'], ['slab']],
  window: [['pane'], ['block']],
  shutter: [['trapdoor']],
  door: [['door']],
  floor: [['block'], ['slab']],
  path: [['block']],
  chimney: [['block']],
  accent: [['block']],
};

const MAIN_ROLES: readonly Role[] = ['plinth', 'wall', 'upperWall', 'infill', 'frame', 'beam', 'roof', 'roofTrim', 'ridge', 'soffit'];

/** A forbidden entry matches whole name parts: 'log' matches spruce_log, not spruce_planks. */
export function isForbidden(materialId: string, entry: string): boolean {
  return materialId === entry || materialId.startsWith(`${entry}_`) || materialId.endsWith(`_${entry}`) || materialId.includes(`_${entry}_`);
}

/** Material family key: dark_oak_log and stripped_dark_oak_log are one family, as are deepslate variants. */
export function familyKey(materialId: string): string {
  return materialId
    .replace(/^(stripped|polished|mossy|cracked|chiseled|cobbled|smooth|cut)_/, '')
    .replace(/_(log|planks|wood|stem|hyphae|bricks|tiles|block)$/, '')
    .replace(/^stone_brick$/, 'stone');
}

export function lintPalette(palette: Palette, style?: StyleDef): LintResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const first = (role: Role) => palette.roles[role][0]?.[0] ?? '';
  const flatOnly = style ? Object.keys(style.roofTypes).every((t) => t === 'flat') : false;

  for (const role of ROLES) {
    const entries = palette.roles[role];
    if (entries.length === 0) errors.push(`${palette.id}: Rolle ${role} ist leer`);
    for (const [material, weight] of entries) {
      if (!hasMaterial(material)) {
        errors.push(`${palette.id}.${role}: unbekanntes Material ${material}`);
        continue;
      }
      if (weight <= 0) errors.push(`${palette.id}.${role}: Gewicht von ${material} muss positiv sein`);
      for (const alternatives of REQUIRED_FORMS[role]) {
        if (role === 'roof' && flatOnly && alternatives.includes('stairs')) continue;
        const found = alternatives.map((f) => formOf(material, f)).find((id) => id !== null);
        if (!found) errors.push(`${palette.id}.${role}: ${material} hat keine Form ${alternatives.join('/')}`);
        else if (!isAvailableIn(`minecraft:${found}`, '1.21.1') || !isAvailableIn(`minecraft:${found}`, '1.21.11')) {
          errors.push(`${palette.id}.${role}: ${found} gibt es nicht in allen unterstützten Versionen`);
        }
      }
      if (style && MAIN_ROLES.includes(role)) {
        const bad = style.forbidden.find((f) => isForbidden(material, f));
        if (bad) errors.push(`${palette.id}.${role}: ${material} ist im Stil ${style.id} verboten („${bad}“)`);
      }
    }
  }

  for (const [roof] of palette.roles.roof) {
    if (hasMaterial(roof) && !flatOnly && !hasOwnForm(roof, 'stairs')) errors.push(`${palette.id}: Dachmaterial ${roof} hat keine eigene Treppe`);
  }
  if (palette.roles.roof.some(([r]) => palette.roles.wall.some(([w]) => w === r))) {
    errors.push(`${palette.id}: Dach und Wand sind dasselbe Material`);
  }

  const wall = first('wall');
  if (hasMaterial(wall)) {
    const lw = brightnessOf(wall);
    const lFrame = Math.max(...palette.roles.frame.map(([m]) => Math.abs(brightnessOf(m) - lw)));
    const lRoof = Math.max(...palette.roles.roof.map(([m]) => Math.abs(brightnessOf(m) - lw)));
    if (lFrame < 15 && lRoof < 15) {
      errors.push(`${palette.id}: Rahmen (ΔL ${lFrame.toFixed(1)}) und Dach (ΔL ${lRoof.toFixed(1)}) heben sich nicht von der Wand ab (≥ 15)`);
    }
    if (lw > 75 && !flatOnly && palette.roles.roof.some(([m]) => brightnessOf(m) >= 40)) {
      warnings.push(`${palette.id}: helle Wand (L* ${lw.toFixed(0)}) mit hellem Dach – dunkle Dachkante nötig`);
    }
  }

  // A building uses one material per role: check the first choices and every alternative.
  const families = (swap?: { role: Role; material: string }) =>
    new Set(MAIN_ROLES.map((r) => familyKey(swap?.role === r ? swap.material : first(r))));
  const variants = [families(), ...MAIN_ROLES.flatMap((role) => palette.roles[role].slice(1).map(([material]) => families({ role, material })))];
  for (const main of variants) {
    if (main.size < 3 || main.size > 5) {
      errors.push(`${palette.id}: ${main.size} Hauptmaterial-Familien (${[...main].join(', ')}), erlaubt 3–5`);
      break;
    }
  }
  if (palette.roles.accent.length > 2) errors.push(`${palette.id}: mehr als 2 Akzente`);
  return { errors, warnings };
}

export function lintStyle(style: StyleDef): LintResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (style.palettes.length === 0) errors.push(`${style.id}: keine Palette`);
  const sum = (o: Readonly<Record<string, number | undefined>>) => Object.values(o).reduce<number>((a, b) => a + (b ?? 0), 0);
  if (Math.abs(sum(style.roofTypes) - 1) > 1e-6) errors.push(`${style.id}: Dachtyp-Prioren summieren nicht zu 1`);
  if (Math.abs(sum(style.roofProfiles) - 1) > 1e-6) errors.push(`${style.id}: Profil-Prioren summieren nicht zu 1`);
  for (const [cls, s] of Object.entries(style.proportions.size)) {
    if (s.width % 2 === 0 || s.depth % 2 === 0) errors.push(`${style.id}.${cls}: Maße müssen ungerade sein`);
  }
  if (style.windows.length === 0 || style.windows.length > 4) errors.push(`${style.id}: 1–4 Fenstervorlagen erwartet`);
  for (const id of style.palettes) {
    const r = lintPalette(getPalette(id), style);
    errors.push(...r.errors);
    warnings.push(...r.warnings);
  }
  return { errors, warnings };
}

export function lintAllStyles(): LintResult {
  const out: LintResult = { errors: [], warnings: [] };
  for (const id of STYLE_IDS) {
    const r = lintStyle(STYLES[id]);
    out.errors.push(...r.errors);
    out.warnings.push(...r.warnings);
  }
  return out;
}
