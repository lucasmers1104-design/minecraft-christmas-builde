import type { Role } from '@/core/style/palettes';
import type { FacadeTemplate, TemplateCell } from '@/core/templates/types';

/**
 * Reveal (Laibung) for openings, research 01 T2 and 03: the glass of a window and the leaf of a
 * door move one block into the wall (d = −1), the wall plane in front of them stays open. The
 * walls are one block thick, so a lining block of the storey's wall material goes beside (and
 * above and below) the glass in d = −1: the panes connect to it instead of standing loose in the
 * room. From outside the recess reads as a shadow frame – the strongest single depth step.
 *
 * The templates themselves stay as they are (canonical, glass in d = 0); this is a transform at
 * placement. Lattice and glass-block windows (shoji, round and church windows, bays) keep their
 * glass in the wall plane, as the research recommends.
 */

/** Templates whose glass stays flush: shoji lattices, mullioned windows, bays, glass blocks. */
const FLUSH_WINDOWS = /^(W09|W10|W11|W13|W14|W15|W18)/;
/** Doors that keep their leaf in the wall plane (Japanese genkan with its own frame). */
const FLUSH_DOORS = /^(T09|T10)/;

const cache = new Map<string, FacadeTemplate>();

const at = (x: number, y: number) => `${x},${y}`;

function lining(cells: TemplateCell[], taken: Set<string>, role: Role, x: number, y: number): void {
  if (taken.has(at(x, y))) return;
  taken.add(at(x, y));
  cells.push({ x, y, d: -1, role, form: 'block' });
}

/** The window with its panes in d = −1, open wall plane in front, lining around (or itself). */
export function revealWindow(t: FacadeTemplate, role: Role): FacadeTemplate {
  // Detail kits are placed exactly as the creative director built them.
  if (t.kind !== 'window' || FLUSH_WINDOWS.test(t.id) || t.id.startsWith('kit:')) return t;
  const k = `${t.id}|${role}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const glass = t.cells.filter((c) => c.role === 'glass' && c.d === 0 && c.form === 'pane');
  if (glass.length === 0) {
    cache.set(k, t);
    return t;
  }
  const g = new Set(glass.map((c) => at(c.x, c.y)));
  const cells: TemplateCell[] = [];
  for (const c of t.cells) {
    if (c.d === 0 && g.has(at(c.x, c.y))) continue;
    if (c.d === -1 && g.has(at(c.x, c.y))) continue;
    cells.push(c);
  }
  const taken = new Set<string>();
  for (const c of glass) {
    cells.push({ ...c, d: -1 }, { x: c.x, y: c.y, d: 0, role: 'air' });
    taken.add(at(c.x, c.y));
  }
  for (const c of glass)
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const)
      if (!g.has(at(c.x + dx, c.y + dy))) lining(cells, taken, role, c.x + dx, c.y + dy);
  const out: FacadeTemplate = { ...t, cells };
  cache.set(k, out);
  return out;
}

/**
 * The door one block deep in a niche: the leaf in d = −1 (it stands on the floor layer), the
 * wall plane in front open, lining beside and above it; the way in stays free inside (d = −2).
 */
export function nicheDoor(t: FacadeTemplate, role: Role): FacadeTemplate {
  if (t.kind !== 'door' || FLUSH_DOORS.test(t.id) || t.id.startsWith('kit:')) return t;
  const k = `${t.id}|${role}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const leaves = t.cells.filter((c) => c.role === 'door' && c.d === 0 && c.y === 0);
  if (leaves.length === 0) {
    cache.set(k, t);
    return t;
  }
  const xs = new Set(leaves.map((c) => c.x));
  const cells: TemplateCell[] = [];
  for (const c of t.cells) {
    // The doorway column moves in by one: leaf and upper half to d = −1, inner clearance to −2.
    if (xs.has(c.x) && c.y >= 0 && c.y <= 1 && c.d <= 0) {
      cells.push({ ...c, d: c.d - 1 });
      continue;
    }
    cells.push(c);
  }
  const taken = new Set<string>();
  for (const x of xs) {
    cells.push({ x, y: 0, d: 0, role: 'air' }, { x, y: 1, d: 0, role: 'air' });
    taken.add(at(x, 0)).add(at(x, 1));
  }
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  for (const y of [0, 1]) {
    lining(cells, taken, role, x0 - 1, y);
    lining(cells, taken, role, x1 + 1, y);
  }
  for (let x = x0; x <= x1; x++) lining(cells, taken, role, x, 2);
  const out: FacadeTemplate = { ...t, cells };
  cache.set(k, out);
  return out;
}

/** True if the placed template has its door leaf in the niche. */
export function isNiche(t: FacadeTemplate): boolean {
  return t.cells.some((c) => c.role === 'door' && c.d === -1);
}
