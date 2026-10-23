import { getBlockDefinition, isAvailableIn, profileBlockId } from '@/core/blocks/registry';
import { SUPPORTED_MINECRAFT_VERSIONS } from '@/core/compat/profile';
import { blocksOf, brightnessOf, colorDistance, formOf, getMaterial, hasMaterial, hasOwnForm, type Form } from '@/core/style/materials';
import { getPalette, ROLES, type Palette, type Role } from '@/core/style/palettes';
import { STYLE_IDS, STYLES, type StyleDef } from '@/core/style/styles';
import { TEXTURE_STATS } from '@/core/style/textureStats';

/**
 * Palette and style lints (run by tests). Contrast rules in ΔE00 after research 07 (T10),
 * calibrated on the measured texture colours; a building draws one material per role, so every
 * combination of the weighted alternatives has to pass:
 * - wall ↔ frame ≥ 15 (wall, upper wall and infill against every frame),
 * - roof ≠ wall: another material and ≥ 12 to wall, upper wall and infill (the gable); below 15
 *   the roof trim must stand out ≥ 15 from both (flat-roof styles: material only),
 * - the frame does not vanish in the roof: frame ↔ roof ≥ 8, or a trim ≥ 15 from both,
 * - the roof trim (research 06, recommendation 3: one verge column plus its board) is wood or of
 *   the roof's own family, never jointed masonry, and ≥ 10 from the roof unless it is the roof
 *   material itself (an edge without contrast),
 * - braces of timber styles are frame-material stairs: |ΔL*| ≤ 8 to the post (research 08 T3),
 * - glass only in calm colours (clear, white, grey, brown, black); coloured glass only as accent,
 * - 3–5 main material families plus at most 2 accents,
 * - the roof only from families that have stairs (flat-roof styles: slabs),
 * - every role resolves to the forms the generator asks for in every Minecraft version: blocks
 *   newer than 1.21.1 need a stand-in of the same shape (registry), and roles that the roof
 *   engine builds directly (without a version step) use only blocks of every version,
 * - no forbidden materials of the style.
 * Bright walls under a bright roof give a warning only.
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

/**
 * Roles whose blocks the roof engine places straight from the material (roof, edges, soffit and
 * the gable, which is the wall, upper wall or infill material) without a version step: these
 * use only blocks of every supported version.
 */
const VERSIONLESS_ROLES: ReadonlySet<Role> = new Set(['roof', 'roofTrim', 'ridge', 'soffit', 'wall', 'upperWall', 'infill']);

/** Calm window glass (research 09/11: coloured panes read as church or toy windows). */
export const CALM_GLASS: ReadonlySet<string> = new Set([
  'glass',
  'white_stained_glass',
  'light_gray_stained_glass',
  'gray_stained_glass',
  'brown_stained_glass',
  'black_stained_glass',
]);

/** Contrast thresholds, ΔE00 (research 07, table T10) and |ΔL*| for braces (research 08 T3). */
export const CONTRAST = { wallFrame: 15, wallRoof: 12, wallRoofClear: 15, frameRoof: 8, trimRoof: 10, trimSeparates: 15, braceL: 8 } as const;

/**
 * A forbidden entry matches whole name parts: 'log' matches spruce_log, not spruce_planks.
 * Exceptions follow after '!': 'log!stripped' forbids bark logs but allows stripped logs.
 */
export function isForbidden(materialId: string, entry: string): boolean {
  const [part = '', ...exceptions] = entry.split('!');
  const has = (p: string) => materialId === p || materialId.startsWith(`${p}_`) || materialId.endsWith(`_${p}`) || materialId.includes(`_${p}_`);
  return has(part) && !exceptions.some(has);
}

/**
 * Material family key: dark_oak_log and stripped_dark_oak_log are one family, as are the
 * deepslate variants, the copper oxidation stages and the tuff, quartz and mud variants.
 */
export function familyKey(materialId: string): string {
  let id = materialId;
  for (let next = id; ; id = next) {
    next = id.replace(/^(waxed|exposed|weathered|oxidized|stripped|polished|mossy|cracked|chiseled|cobbled|smooth|cut|packed)_/, '');
    if (next === id) break;
  }
  return id.replace(/_(log|planks|wood|stem|hyphae|bricks|tiles|block|pillar|mosaic)$/, '').replace(/^stone_brick$/, 'stone');
}

/** Bricks, tiles and cobbles: a jointed edge reads as a wall standing on the roof. */
function isMasonry(materialId: string): boolean {
  const m = getMaterial(materialId);
  if (m.family !== 'stone' && m.family !== 'brick') return false;
  return !/^(smooth|polished)_/.test(materialId) && !/(quartz|calcite|concrete)/.test(materialId);
}

const shapeOf = (block: string) => getBlockDefinition(`minecraft:${block}`)?.shape;
const brightnessOfBlock = (block: string) => TEXTURE_STATS[block]?.[1] ?? 0;
const alternativesOf = (palette: Palette, role: Role) => palette.roles[role].map(([m]) => m).filter(hasMaterial);
const fmt = (n: number) => n.toFixed(1);

/** Version problems of a material in a role (empty when it builds in every version). */
function versionProblems(material: string, role: Role): string[] {
  const out: string[] = [];
  for (const block of blocksOf(material)) {
    const id = `minecraft:${block}`;
    for (const version of SUPPORTED_MINECRAFT_VERSIONS) {
      if (isAvailableIn(id, version)) continue;
      const standIn = profileBlockId(id, version);
      if (VERSIONLESS_ROLES.has(role)) out.push(`${block} gibt es nicht in ${version}, und die Dach-Engine baut diese Rolle ohne Versionsersatz`);
      else if (standIn === id || !isAvailableIn(standIn, version)) out.push(`${block} gibt es nicht in ${version} und hat keinen Ersatz`);
      else if (getBlockDefinition(standIn)?.shape !== shapeOf(block)) out.push(`Ersatz ${standIn} für ${block} hat eine andere Form`);
    }
  }
  return out;
}

export function lintPalette(palette: Palette, style?: StyleDef): LintResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const report = (message: string) => {
    if (!errors.includes(message)) errors.push(message);
  };
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
      for (const alts of REQUIRED_FORMS[role]) {
        if (role === 'roof' && flatOnly && alts.includes('stairs')) continue;
        if (!alts.some((f) => formOf(material, f) !== null)) errors.push(`${palette.id}.${role}: ${material} hat keine Form ${alts.join('/')}`);
      }
      for (const problem of versionProblems(material, role)) report(`${palette.id}.${role}: ${problem}`);
      if (style && MAIN_ROLES.includes(role)) {
        const bad = style.forbidden.find((f) => isForbidden(material, f));
        if (bad) errors.push(`${palette.id}.${role}: ${material} ist im Stil ${style.id} verboten („${bad}“)`);
      }
      const family = getMaterial(material).family;
      if (family === 'glass' && role !== 'accent' && !CALM_GLASS.has(material)) {
        errors.push(`${palette.id}.${role}: Glas ${material} ist zu bunt (ruhig: ${[...CALM_GLASS].join(', ')}; Farbglas nur als Akzent)`);
      }
      if (role === 'window' && family !== 'glass') errors.push(`${palette.id}.window: ${material} ist kein Glas`);
    }
  }

  for (const [roof] of palette.roles.roof) {
    if (hasMaterial(roof) && !flatOnly && !hasOwnForm(roof, 'stairs')) errors.push(`${palette.id}: Dachmaterial ${roof} hat keine eigene Treppe`);
  }
  if (palette.roles.roof.some(([r]) => palette.roles.wall.some(([w]) => w === r))) {
    errors.push(`${palette.id}: Dach und Wand sind dasselbe Material`);
  }

  // Contrast over every combination of alternatives (one material per role and building).
  const walls = [...new Set([...alternativesOf(palette, 'wall'), ...alternativesOf(palette, 'upperWall'), ...alternativesOf(palette, 'infill')])];
  const frames = alternativesOf(palette, 'frame');
  const roofs = alternativesOf(palette, 'roof');
  const trims = alternativesOf(palette, 'roofTrim');
  const separated = (a: string, b: string) =>
    trims.every((t) => colorDistance(t, a) >= CONTRAST.trimSeparates && colorDistance(t, b) >= CONTRAST.trimSeparates);
  for (const wall of walls) {
    for (const frame of frames) {
      const d = colorDistance(wall, frame);
      if (d < CONTRAST.wallFrame) report(`${palette.id}: Rahmen ${frame} hebt sich nicht von ${wall} ab (ΔE00 ${fmt(d)} < ${CONTRAST.wallFrame})`);
    }
    if (flatOnly) continue;
    for (const roof of roofs) {
      const d = colorDistance(wall, roof);
      if (d < CONTRAST.wallRoof || (d < CONTRAST.wallRoofClear && !separated(wall, roof))) {
        report(
          `${palette.id}: Dach ${roof} hebt sich nicht von ${wall} ab (ΔE00 ${fmt(d)}; nötig ≥ ${CONTRAST.wallRoofClear} oder ≥ ${CONTRAST.wallRoof} mit Dachkante ≥ ${CONTRAST.trimSeparates} zu beiden)`,
        );
      }
    }
  }
  for (const frame of frames)
    for (const roof of roofs) {
      const d = colorDistance(frame, roof);
      if (d < CONTRAST.frameRoof && !separated(frame, roof)) {
        report(`${palette.id}: Rahmen ${frame} verschwindet im Dach ${roof} (ΔE00 ${fmt(d)} < ${CONTRAST.frameRoof}, keine Dachkante ≥ ${CONTRAST.trimSeparates} zu beiden)`);
      }
    }
  if (!flatOnly) {
    for (const trim of trims)
      for (const roof of roofs) {
        if (trim === roof) continue;
        if (isMasonry(trim) && familyKey(trim) !== familyKey(roof)) report(`${palette.id}: Dachkante ${trim} ist Mauerwerk auf dem Dach ${roof} (Holz oder Material der Dachfamilie)`);
        const d = colorDistance(trim, roof);
        if (d < CONTRAST.trimRoof) report(`${palette.id}: Dachkante ${trim} ist kaum vom Dach ${roof} zu unterscheiden (ΔE00 ${fmt(d)} < ${CONTRAST.trimRoof})`);
      }
  }

  // Braces are stairs of the frame material: they must look like the post.
  if (style && style.timber !== 'none') {
    for (const frame of frames) {
      const stairs = formOf(frame, 'stairs');
      const post = formOf(frame, 'pillar') ?? formOf(frame, 'block');
      if (!stairs || !post) continue;
      const d = Math.abs(brightnessOfBlock(stairs) - brightnessOfBlock(post));
      if (d > CONTRAST.braceL) report(`${palette.id}: Streben ${stairs} passen nicht zum Ständer ${post} (|ΔL*| ${fmt(d)} > ${CONTRAST.braceL})`);
    }
  }

  const wall = first('wall');
  if (hasMaterial(wall)) {
    const lw = brightnessOf(wall);
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
