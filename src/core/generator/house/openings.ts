import type { HorizontalDirection } from '@/core/blocks/directions';
import { AIR, definitionOf } from '@/core/blocks/registry';
import { Priority } from '@/core/generator/geometry';
import { floorY, nearRoundTower, storeyRect, type HousePlan, type Mass } from '@/core/generator/house/plan';
import { addBraces, facadeOf, facadePos, isTimberStorey, type Ctx, type Facade, type Panel } from '@/core/generator/house/walls';
import { BALCONY_TEMPLATES } from '@/core/templates/balcony';
import { baseTemplateId, getTemplate, templateBounds, templatesByIds } from '@/core/templates/catalog';
import { cellPosition, cellState, type FacadeFrame } from '@/core/templates/place';
import type { FacadeTemplate } from '@/core/templates/types';

/**
 * Windows and doors from the template library (phase 4). Rules from the research notes:
 * window axes line up across storeys, at least one block between windows (two with
 * shutters) and to the corner, the door in the middle or on an axis with 1–2 blocks of path in
 * front, and everything in front of the wall (d ≥ 1) is checked against porches, eaves and
 * oriels before it is placed. Templates are tried in the style's order; if none fits, a plain
 * recessed pane is used, never nothing.
 */

export interface OpeningsResult {
  doors: { x: number; y: number; z: number; outward: HorizontalDirection; width: number }[];
  sills: { x: number; y: number; z: number }[];
  windows: number;
  /** Ids of the placed templates (one entry per placement). */
  templates: string[];
  /** Cells that must stay free (door clearance inside and outside). */
  reserved: Set<string>;
  /** Why door templates were rejected (diagnostics). */
  doorRejections: string[];
}

const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
/** Template parts that may meet an existing post or beam (the post takes their place). */
const FRAME_ROLES = new Set(['frame', 'beam', 'roof', 'roofTrim', 'soffit']);

function frameAt(f: Facade, u: number, y: number): FacadeFrame {
  const p = facadePos(f, u, 0);
  return { origin: { x: p.x, y, z: p.z }, outward: f.side };
}

/** Places the template if everything in front of the wall is free; frame cells may meet posts. */
let lastRejection = '';

function placeIfFits(
  ctx: Ctx,
  t: FacadeTemplate,
  frame: FacadeFrame,
  // Oriels and balconies interrupt the frame: their cells replace posts and beams in front.
  overPosts = false,
): { x: number; y: number; z: number; state: string; cell: FacadeTemplate['cells'][number] }[] | null {
  const { builder, plan } = ctx;
  const out: { x: number; y: number; z: number; state: string; cell: FacadeTemplate['cells'][number] }[] = [];
  // House openings keep clear of an attached round tower (it is built over them later).
  const towerAttached = !plan.masses[0]!.round && plan.masses.some((m) => m.round);
  for (const cell of t.cells) {
    const p = cellPosition(t, cell, frame);
    if (!builder.inside(p.x, p.y, p.z)) {
      lastRejection = `${t.id}: außerhalb bei ${cell.x},${cell.y},${cell.d}`;
      return null;
    }
    if (towerAttached && nearRoundTower(plan, p.x, p.z, 1)) {
      lastRejection = `${t.id}: am Rundturm`;
      return null;
    }
    const occupant = builder.getBlock(p.x, p.y, p.z);
    if (cell.d >= 1 && occupant !== AIR) {
      const shape = definitionOf(occupant).shape;
      const post = shape === 'pillar' || shape === 'cube';
      // A frame piece meeting an existing post or beam: the post is the frame.
      // Stone jambs of a portal (plinth role above the sill) also give way to a post.
      if (post && !overPosts && (FRAME_ROLES.has(cell.role) || (cell.role === 'plinth' && cell.y >= 0))) continue;
      // An oriel's little roof tucks under the main eave where they meet.
      if (overPosts && cell.role === 'roof' && (shape === 'stairs' || shape === 'slab')) continue;
      // Below the door sill the template's step replaces the protruding plinth or porch floor.
      if (!(post && overPosts) && !(t.kind === 'door' && cell.y < 0)) {
        lastRejection = `${t.id}: Zelle ${cell.x},${cell.y},${cell.d} (${cell.role}) belegt von ${occupant}`;
        return null;
      }
    }
    // Lanterns follow the style (soul lanterns for fantasy).
    const styled = cell.block === 'lantern' ? { ...cell, block: plan.input.lantern } : cell;
    const state = cellState(styled, frame, plan.input.materials, plan.input.minecraftVersion);
    if (state === null) return null;
    out.push({ ...p, state, cell });
  }
  return out;
}

function commit(ctx: Ctx, cells: NonNullable<ReturnType<typeof placeIfFits>>): void {
  for (const c of cells) ctx.builder.setBlock(c.x, c.y, c.z, c.state, Priority.OPENING);
}

/** Simple fallback: recessed pane column with a sill (never an empty hole). */
function plainWindow(ctx: Ctx, f: Facade, u: number, y0: number, height: number, sills: OpeningsResult['sills']): void {
  const { builder, blocks } = ctx;
  const c = facadePos(f, u, 0);
  if (!ctx.plan.masses[0]!.round && nearRoundTower(ctx.plan, c.x, c.z, 1)) return;
  for (let dy = 0; dy < height; dy++) {
    const p = facadePos(f, u, 0);
    builder.setBlock(p.x, y0 + dy, p.z, blocks.pane(), Priority.OPENING);
  }
  const s = facadePos(f, u, 1);
  if (builder.inside(s.x, y0 - 1, s.z) && builder.isAir(s.x, y0 - 1, s.z)) {
    builder.setBlock(s.x, y0 - 1, s.z, blocks.stairs('frame', OPP[f.side], 'top'), Priority.OPENING);
    sills.push({ x: s.x, y: y0 - 1, z: s.z });
  }
}

const OPP: Record<HorizontalDirection, HorizontalDirection> = { north: 'south', south: 'north', east: 'west', west: 'east' };

/**
 * Lanterns beside the entrance (user decision: lanterns are the signature detail): if the door
 * template brought none, a fence post on each side in front of the wall carries a standing
 * lantern; where a post does not fit, a lantern hangs from a chain under an overhang.
 */
function addDoorLanterns(ctx: Ctx, f: Facade, startU: number, width: number, y: number, reserved: Set<string>): void {
  const { builder, blocks, plan } = ctx;
  const lantern = plan.input.lantern;
  const near = (x: number, z: number) => {
    for (let dx = -3; dx <= 3; dx++)
      for (let dz = -3; dz <= 3; dz++)
        for (let dy = 0; dy <= 3; dy++) if (builder.inside(x + dx, y + dy, z + dz) && builder.getBlock(x + dx, y + dy, z + dz).includes('lantern[')) return true;
    return false;
  };
  const door = facadePos(f, startU, 0);
  if (near(door.x, door.z)) return;
  for (const u of [startU - 1, startU + width]) {
    const p = facadePos(f, u, 1);
    if (reserved.has(key(p.x, y, p.z))) continue;
    if (![y, y + 1].every((yy) => builder.inside(p.x, yy, p.z) && builder.isAir(p.x, yy, p.z))) continue;
    builder.setBlock(p.x, y, p.z, blocks.fence('frame'), Priority.OPENING);
    builder.setBlock(p.x, y + 1, p.z, blocks.fixed(lantern, { hanging: 'false' }), Priority.OPENING);
  }
}

/**
 * Stoop for a raised entrance (research 04 E06): with a plinth of two or more rows the door's
 * own step is no longer enough – players would have to jump. A landing in front of the door at
 * floor level, one stair per plinth row (half a block rise each) running out from the wall, one
 * column wider than the door on each side, filled underneath, and low cheek walls beside it.
 */
function buildStoop(ctx: Ctx, f: Facade, startU: number, width: number, doorY: number): void {
  const { builder, blocks } = ctx;
  const P = doorY - 1;
  if (P < 2) return;
  const toWall = OPP[f.side];
  const put = (u: number, d: number, y: number, state: string) => {
    const p = facadePos(f, u, d);
    if (builder.inside(p.x, y, p.z)) builder.setBlock(p.x, y, p.z, state, Priority.OPENING);
  };
  for (let u = startU - 1; u <= startU + width; u++) {
    put(u, 1, P, blocks.block('plinth'));
    for (let k = 1; k <= P; k++) {
      const y = P + 1 - k;
      put(u, 1 + k, y, blocks.stairs('plinth', toWall, 'bottom'));
      for (let yy = 1; yy < y; yy++) put(u, 1 + k, yy, blocks.block('plinth'));
    }
  }
  const cheek = blocks.wallForm('plinth');
  for (const u of [startU - 2, startU + width + 1])
    for (let k = 1; k <= P; k++) {
      const y = P + 1 - k;
      for (let yy = 1; yy <= y; yy++) put(u, 1 + k, yy, blocks.block('plinth'));
      if (cheek) put(u, 1 + k, y + 1, cheek);
    }
}

/** Axes (leftmost column) of evenly spaced openings inside [from, to) with margins at both ends. */
function axesIn(from: number, to: number, width: number, gap: number, density: HousePlan['input']['windows'], marginLeft: number, marginRight: number): number[] {
  const start0 = from + marginLeft;
  const usable = to - marginRight - start0;
  if (usable < width) return [];
  const step = width + gap + (density === 'few' ? 3 : density === 'many' ? 0 : 1);
  const n = Math.max(1, Math.floor((usable + step - width) / step));
  const total = n * width + (n - 1) * (step - width);
  const start = start0 + Math.floor((usable - total) / 2);
  return Array.from({ length: n }, (_, i) => start + i * step);
}

/**
 * Window axes (leftmost column of each opening footprint) on a facade without stud grid:
 * symmetric, at least gap + 1 from the corners, and on both sides of the door (never in it).
 */
function axesFor(length: number, width: number, gap: number, density: HousePlan['input']['windows'], avoid: [number, number] | null): number[] {
  // The footprint already contains shutters and frames: one free column to the corner.
  if (!avoid) return axesIn(0, length, width, gap, density, 1, 1);
  const left = axesIn(0, avoid[0], width, gap, density, 1, gap);
  const right = axesIn(avoid[1] + 1, length, width, gap, density, gap, 1);
  return [...left, ...right];
}

/**
 * Oriel or balcony on an upper storey, centred on the facade or as close to the centre as it
 * fits. Returns the occupied columns; if nothing fits, the plan gets a note.
 */
function placeFeature(ctx: Ctx, f: Facade, y: number, templates: readonly FacadeTemplate[], label: string, result: OpeningsResult): [number, number] | null {
  for (const shift of [0, -1, 1, -2, 2, -3, 3])
    for (const t of templates) {
      const b = templateBounds(t);
      const u0 = Math.floor((f.length - t.width) / 2) + shift;
      if (u0 + b.minX < 1 || u0 + b.maxX > f.length - 2) continue;
      const cells = placeIfFits(ctx, t, frameAt(f, u0, y), true);
      if (!cells) continue;
      commit(ctx, cells);
      result.templates.push(t.id);
      for (const c of cells) if (c.cell.d === -1 || (c.cell.role === 'air' && c.cell.d === 0)) result.reserved.add(key(c.x, c.y, c.z));
      return [u0 + b.minX - 1, u0 + b.maxX + 1];
    }
  ctx.plan.notes.push(`${label} passt an dieser Fassade nicht – weggelassen.`);
  return null;
}

/**
 * Entrance at facade column `uDoor` (door leaf bottom at `y`): the first door template that
 * fits, clearance in front and behind, lanterns beside it. Returns the occupied columns.
 */
export function placeDoor(ctx: Ctx, f: Facade, uDoor: number, y: number, doors: readonly FacadeTemplate[], result: OpeningsResult): [number, number] | null {
  for (const t of doors) {
    const startU = uDoor - Math.floor((t.width - 1) / 2);
    const cells = placeIfFits(ctx, t, frameAt(f, startU, y));
    if (!cells) {
      result.doorRejections.push(lastRejection);
      continue;
    }
    commit(ctx, cells);
    result.templates.push(t.id);
    const p = facadePos(f, startU, 0);
    result.doors.push({ x: p.x, y, z: p.z, outward: f.side, width: t.width });
    // Keep the way in free: two cells in front, one behind.
    for (let w = 0; w < t.width; w++)
      for (const d of [-1, 1, 2]) {
        const q = facadePos(f, startU + w, d);
        for (const dy of [0, 1]) result.reserved.add(key(q.x, y + dy, q.z));
      }
    if (!ctx.plan.input.porch) buildStoop(ctx, f, startU, t.width, y);
    if (ctx.plan.input.lanternDensity !== 'none') addDoorLanterns(ctx, f, startU, t.width, y, result.reserved);
    // Door leaf plus jambs; parts in front of the wall are checked by placeIfFits.
    return [startU - 1, startU + t.width];
  }
  return null;
}

export function emptyOpenings(): OpeningsResult {
  return { doors: [], sills: [], windows: 0, templates: [], reserved: new Set(), doorRejections: [] };
}

export function buildOpenings(ctx: Ctx, panels: Map<string, Map<HorizontalDirection, Panel[]>[]>): OpeningsResult {
  const { plan } = ctx;
  const result = emptyOpenings();
  const windows = templatesByIds('window', plan.input.windowTemplates);
  const doors = templatesByIds('door', plan.input.doorTemplates);
  const doorMass = plan.masses.find((m) => m.kind === 'cross') ?? plan.masses[0]!;

  for (const mass of plan.masses) {
    if (mass.round) continue;
    const perStorey = panels.get(mass.id) ?? [];
    for (let k = 0; k < mass.floors; k++) {
      const rect = storeyRect(mass, k);
      const y0 = floorY(plan, k);
      const rows = plan.floorHeight - 1;
      for (const side of ['north', 'east', 'south', 'west'] as const) {
        if (mass.joins[side]) continue;
        const f = facadeOf(rect, side);
        const facadePanels = perStorey[k]?.get(side) ?? [];
        // Door: ground storey, front of the door mass.
        let doorSpan = k === 0 && mass === doorMass && side === 'north' ? placeDoor(ctx, f, f.origin.x - plan.door.x, y0 + 1, doors, result) : null;
        // Oriel on the front of the first upper storey, balcony on the front (or the back if
        // the front has the oriel); windows keep clear of both like of the door.
        if (k === 1 && mass === plan.masses[0]) {
          const rowsUp = plan.floorHeight - 1;
          if (plan.input.oriel && side === 'north') doorSpan = placeFeature(ctx, f, rowsUp >= 4 ? y0 + 2 : y0 + 1, [getTemplate('W09')], 'Erker', result);
          if (plan.input.balcony && side === (plan.input.oriel ? 'south' : 'north')) doorSpan = placeFeature(ctx, f, y0 + 1, BALCONY_TEMPLATES, 'Balkon', result);
        }
        // Windows: in stud-grid panels, or on symmetric axes for plain walls.
        const density = plan.input.windows;
        const candidates = windows.filter((t) => t.height <= rows - 1 || (rows <= 3 && t.height <= rows));
        // Centred in the panel by the template's own width (research 03: centring by the panel
        // width left narrower windows hugging the left post).
        const tryWindow = (panelU0: number, panelWidth: number, maxWidth: number): boolean => {
          for (const t of candidates) {
            if (t.width > maxWidth) continue;
            const yBottom = rows >= t.height + 2 ? y0 + 2 : y0 + 1;
            const frame = frameAt(f, panelU0 + Math.floor((panelWidth - t.width) / 2), yBottom);
            const cells = placeIfFits(ctx, t, frame);
            if (!cells) continue;
            if (cells.some((c) => result.reserved.has(key(c.x, c.y, c.z)))) continue;
            commit(ctx, cells);
            for (const c of cells) if (c.cell.d === 1 && c.cell.y === -1 && c.cell.form === 'stairs') result.sills.push({ x: c.x, y: c.y, z: c.z });
            result.windows++;
            result.templates.push(t.id);
            return true;
          }
          return false;
        };
        if (mass.frames && facadePanels.length > 1) {
          const timber = isTimberStorey(ctx, mass, k);
          const n = facadePanels.length;
          // Rhythm instead of a window in every panel (research 08/19/20): the corner panels
          // of a timber facade stay closed and carry braces, the windows sit in the middle
          // panels. Always from five panels on; on smaller side and back facades for most
          // houses; the entrance front keeps its windows. The choice is per facade, so the
          // window axes of all storeys line up.
          const rhythm =
            density !== 'many' && n >= 3 && (n >= 5 || (side !== 'north' && ctx.rng.fork(`rhythm:${mass.id}:${side}`).chance(0.65)));
          facadePanels.forEach((panel, i) => {
            const width = panel.u1 - panel.u0 + 1;
            const brace = () => {
              if (timber) addBraces(ctx, f, panel, y0, floorY(plan, k + 1));
            };
            if (doorSpan && panel.u1 >= doorSpan[0] && panel.u0 <= doorSpan[1]) return;
            if (rhythm && (i === 0 || i === n - 1)) return brace();
            if (density === 'few' && i % 2 === 1 && facadePanels.length > 2) return brace();
            if (density !== 'many' && width < 2 && facadePanels.length > 3) return brace();
            if (!tryWindow(panel.u0, width, Math.min(width, width >= 4 ? 2 : width))) {
              const yBottom = rows >= 4 ? y0 + 2 : y0 + 1;
              plainWindow(ctx, f, panel.u0 + Math.floor((width - 1) / 2), yBottom, Math.min(2, rows - 1), result.sills);
              result.windows++;
            }
          });
        } else {
          // Plain walls: one recurring window type per facade, on symmetric axes computed from
          // the template's full footprint (shutters, frames included).
          let placedAny = false;
          for (const t of candidates) {
            const b = templateBounds(t);
            const outer = b.maxX - b.minX + 1;
            const gap = Math.max(1, t.spacing);
            const axes = axesFor(f.length, outer, gap, density, doorSpan);
            if (axes.length === 0) continue;
            const yBottom = rows >= t.height + 2 ? y0 + 2 : y0 + 1;
            const placements = axes.map((pos) => placeIfFits(ctx, t, frameAt(f, pos - b.minX, yBottom)));
            // Use the type only if it fits on every axis (consistent facade).
            if (placements.some((c) => !c || c.some((cell) => result.reserved.has(key(cell.x, cell.y, cell.z))))) continue;
            for (const cells of placements) {
              commit(ctx, cells!);
              result.templates.push(t.id);
              for (const c of cells!) if (c.cell.d === 1 && c.cell.y === -1 && c.cell.form === 'stairs') result.sills.push({ x: c.x, y: c.y, z: c.z });
              result.windows++;
            }
            placedAny = true;
            break;
          }
          if (!placedAny) {
            for (const u0 of axesFor(f.length, 1, 2, density, doorSpan)) {
              plainWindow(ctx, f, u0, rows >= 4 ? y0 + 2 : y0 + 1, Math.min(2, rows - 1), result.sills);
              result.windows++;
            }
          }
        }
      }
    }
  }
  // Say so when a chosen window or door family found no place (the style's own was used).
  const placed = new Set(result.templates.map(baseTemplateId));
  const { windowWish, doorWish } = plan.input;
  if (doorWish.length > 0 && result.doors.length > 0 && !doorWish.some((id) => placed.has(id))) plan.notes.push('Die gewünschte Türform passt an dieser Fassade nicht – die Tür des Stils wurde verwendet.');
  if (windowWish.length > 0 && !windowWish.some((id) => placed.has(id))) plan.notes.push('Die gewünschte Fensterform passt in diese Wände nicht – die Fenster des Stils wurden verwendet.');
  return result;
}

/** Mass helper for callers. */
export function isDoorMass(plan: HousePlan, mass: Mass): boolean {
  return (plan.masses.find((m) => m.kind === 'cross') ?? plan.masses[0]) === mass;
}
