import type { DoorFamily, WindowFamily } from '@/core/schema/buildOptions';
import { STYLES, type StyleId } from '@/core/style/styles';
import { DOOR_TEMPLATES } from '@/core/templates/doors';
import type { FacadeTemplate } from '@/core/templates/types';
import { WINDOW_TEMPLATES } from '@/core/templates/windows';

/**
 * Catalog of all facade templates (windows W01–W18, doors T01–T10, plus size variants such as
 * "W03b" that share the canonical template's styles).
 *
 * Placement facts for the facade assembler (see also each template's `note`):
 * - `width`/`height` are the opening only; frames, shutters, lanterns and sills extend beyond
 *   it. Use `templateBounds` for the full footprint (x, y and depth d).
 * - `spacing` = minimum free wall columns between the outermost cells (`templateBounds`) of two
 *   neighbouring templates on the same wall, and between a template and the building corner.
 * - Every cell with d ≥ 1 must be free (`templateFits`), d = 0 cells replace the wall, d = −1
 *   cells are inside (door clearance, dormer body).
 */

export const TEMPLATES: readonly FacadeTemplate[] = [...WINDOW_TEMPLATES, ...DOOR_TEMPLATES];

const BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]));
if (BY_ID.size !== TEMPLATES.length) throw new Error('Doppelte Vorlagen-ID im Katalog');

/** Canonical template id of a variant ("W03b" → "W03"). */
export function baseTemplateId(id: string): string {
  return /^[WT]\d\d/.exec(id)?.[0] ?? id;
}

export function getTemplate(id: string): FacadeTemplate {
  const t = BY_ID.get(id);
  if (!t) throw new Error(`Unbekannte Fenster- oder Türvorlage: ${id}`);
  return t;
}

export function hasTemplate(id: string): boolean {
  return BY_ID.has(id);
}

/**
 * Templates of one kind a style may use, in the order of the style's list (canonical template
 * first, then its size variants).
 */
export function templatesFor(kind: FacadeTemplate['kind'], styleId: StyleId): readonly FacadeTemplate[] {
  const style = STYLES[styleId];
  const order = kind === 'window' ? style.windows : style.doors;
  const out: FacadeTemplate[] = [];
  for (const base of order) {
    for (const t of TEMPLATES) if (t.kind === kind && baseTemplateId(t.id) === base && t.styles.includes(styleId)) out.push(t);
  }
  return out;
}

/** Window and door families of the fine controls → canonical templates, preferred in this order. */
export const WINDOW_FAMILY_TEMPLATES: Readonly<Record<Exclude<WindowFamily, 'auto'>, readonly string[]>> = {
  simple: ['W01', 'W02'],
  shuttered: ['W04', 'W05', 'W17'],
  framed: ['W03', 'W06'],
  arched: ['W07', 'W17'],
  round: ['W08'],
  shoji: ['W15'],
  band: ['W16'],
  leaded: ['W13'],
};

export const DOOR_FAMILY_TEMPLATES: Readonly<Record<Exclude<DoorFamily, 'auto'>, readonly string[]>> = {
  simple: ['T01'],
  transom: ['T02'],
  arched: ['T04', 'T03'],
  double: ['T03'],
  porch: ['T06', 'T05'],
  genkan: ['T09'],
};

/**
 * Templates for a list of canonical ids (a chosen family followed by the style's own list):
 * canonical template first, then its size variants; duplicates are dropped. Unlike
 * `templatesFor`, a template outside the style is allowed – the user asked for it.
 */
export function templatesByIds(kind: FacadeTemplate['kind'], bases: readonly string[]): readonly FacadeTemplate[] {
  const out: FacadeTemplate[] = [];
  const seen = new Set<string>();
  for (const base of bases) {
    if (seen.has(base)) continue;
    seen.add(base);
    for (const t of TEMPLATES) if (t.kind === kind && baseTemplateId(t.id) === base) out.push(t);
  }
  return out;
}

export interface TemplateBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minD: number;
  maxD: number;
}

/** Extent of all cells in template coordinates (opening origin at x = 0, y = 0, d = 0). */
export function templateBounds(t: FacadeTemplate): TemplateBounds {
  const b: TemplateBounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minD: Infinity, maxD: -Infinity };
  for (const c of t.cells) {
    b.minX = Math.min(b.minX, c.x);
    b.maxX = Math.max(b.maxX, c.x);
    b.minY = Math.min(b.minY, c.y);
    b.maxY = Math.max(b.maxY, c.y);
    b.minD = Math.min(b.minD, c.d);
    b.maxD = Math.max(b.maxD, c.d);
  }
  return b;
}
