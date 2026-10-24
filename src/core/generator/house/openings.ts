import type { HorizontalDirection } from '@/core/blocks/directions';
import { AIR, definitionOf } from '@/core/blocks/registry';
import { Priority } from '@/core/generator/geometry';
import { doorMassOf, floorY, joinedAt, nearRoundTower, storeyRect, type HousePlan, type Mass } from '@/core/generator/house/plan';
import { addBraces, coveredColumns, facadeOf, facadePos, isTimberStorey, wallRole, type Ctx, type Facade, type Panel } from '@/core/generator/house/walls';
import { isNiche, nicheDoor, revealWindow } from '@/core/generator/house/reveal';
import type { Role } from '@/core/style/palettes';
import { BALCONY_TEMPLATES } from '@/core/templates/balcony';
import { baseTemplateId, getTemplate, templateBounds, templatesByIds } from '@/core/templates/catalog';
import { FALLBACK_DOOR } from '@/core/templates/doors';
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
  /** Door leaves (lower half); `niche`: the leaf stands one block deep in the wall (d = −1). */
  doors: { x: number; y: number; z: number; outward: HorizontalDirection; width: number; niche?: boolean }[];
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
/** Winter and Christmas: evergreen stand-ins for the flowers of window boxes and pots. */
const WINTER_PLANTS: Readonly<Record<string, string>> = {
  red_tulip: 'fern',
  oxeye_daisy: 'fern',
  poppy: 'fern',
  cornflower: 'fern',
  potted_red_tulip: 'potted_spruce_sapling',
  potted_poppy: 'potted_spruce_sapling',
  potted_dandelion: 'potted_fern',
};
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
      // An entrance hood replaces a low eave cornice above the door (one-storey houses).
      const hood = t.kind === 'door' && cell.y >= 2 && (shape === 'stairs' || shape === 'slab');
      // Below the door sill the template's step replaces the protruding plinth or porch floor.
      if (!(post && overPosts) && !(t.kind === 'door' && cell.y < 0) && !hood) {
        lastRejection = `${t.id}: Zelle ${cell.x},${cell.y},${cell.d} (${cell.role}) belegt von ${occupant}`;
        return null;
      }
    }
    // Lanterns follow the style (soul lanterns for fantasy).
    // Flowers do not bloom in winter (research 14): boxes and pots get fern and fir instead.
    const winter = plan.input.theme !== 'none' && cell.block ? WINTER_PLANTS[cell.block] : undefined;
    const styled = cell.block === 'lantern' ? { ...cell, block: plan.input.lantern } : winter ? { ...cell, block: winter } : cell;
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
function plainWindow(ctx: Ctx, f: Facade, u: number, y0: number, height: number, sills: OpeningsResult['sills'], lining: Role | null = null, reserved?: Set<string>): void {
  const { builder, blocks } = ctx;
  const c = facadePos(f, u, 0);
  if (!ctx.plan.masses[0]!.round && nearRoundTower(ctx.plan, c.x, c.z, 1)) return;
  const depth = lining ? -1 : 0;
  for (let dy = 0; dy < height; dy++) {
    const p = facadePos(f, u, depth);
    builder.setBlock(p.x, y0 + dy, p.z, blocks.pane(), Priority.OPENING);
    if (!lining) continue;
    // Reveal: open wall plane in front, lining beside the pane, free room behind it.
    builder.vacate(c.x, y0 + dy, c.z);
    for (const du of [-1, 1]) {
      const q = facadePos(f, u + du, -1);
      builder.setBlock(q.x, y0 + dy, q.z, blocks.block(lining), Priority.OPENING);
      reserved?.add(key(q.x, y0 + dy, q.z));
    }
    reserved?.add(key(p.x, y0 + dy, p.z));
  }
  if (lining) {
    const p = facadePos(f, u, -1);
    builder.setBlock(p.x, y0 - 1, p.z, blocks.block(lining), Priority.OPENING);
    builder.setBlock(p.x, y0 + height, p.z, blocks.block(lining), Priority.OPENING);
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
 * Window axes on the free stretches of a facade: the door span and the columns covered by other
 * masses are cut out, every remaining stretch gets its own evenly spaced axes.
 */
function axesAround(length: number, width: number, gap: number, density: HousePlan['input']['windows'], door: [number, number] | null, covered: ReadonlySet<number>): number[] {
  if (covered.size === 0) return axesFor(length, width, gap, density, door);
  const blockedAt = (u: number) => covered.has(u) || (door !== null && u >= door[0] && u <= door[1]);
  const out: number[] = [];
  let a = 0;
  while (a < length) {
    while (a < length && blockedAt(a)) a++;
    let b = a;
    while (b < length && !blockedAt(b)) b++;
    if (b > a) out.push(...axesIn(a, b, width, gap, density, a === 0 ? 1 : gap, b === length ? 1 : gap));
    a = b;
  }
  return out;
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
function placeFeature(ctx: Ctx, f: Facade, y: number, templates: readonly FacadeTemplate[], label: string, result: OpeningsResult, covered: ReadonlySet<number> = new Set()): [number, number] | null {
  const shifts = [0];
  for (let i = 1; i <= Math.floor(f.length / 2); i++) shifts.push(-i, i);
  for (const shift of shifts)
    for (const t of templates) {
      const b = templateBounds(t);
      const u0 = Math.floor((f.length - t.width) / 2) + shift;
      if (u0 + b.minX < 1 || u0 + b.maxX > f.length - 2) continue;
      let hit = false;
      for (let u = u0 + b.minX - 1; u <= u0 + b.maxX + 1; u++) if (covered.has(u)) hit = true;
      if (hit) continue;
      const cells = placeIfFits(ctx, t, frameAt(f, u0, y), true);
      if (!cells) continue;
      commit(ctx, cells);
      result.templates.push(t.id);
      for (const c of cells) if (c.cell.d === -1 || (c.cell.role === 'air' && c.cell.d === 0)) result.reserved.add(key(c.x, c.y, c.z));
      return [u0 + b.minX - 1, u0 + b.maxX + 1];
    }
  void label;
  return null;
}

/**
 * Entrance at facade column `uDoor` (door leaf bottom at `y`): the first door template that
 * fits, clearance in front and behind, lanterns beside it. Returns the occupied columns.
 */
export function placeDoor(ctx: Ctx, f: Facade, uDoor: number, y: number, doors: readonly FacadeTemplate[], result: OpeningsResult, lining: Role | null = null): [number, number] | null {
  for (const raw of [...doors, FALLBACK_DOOR]) {
    // Door niche (research 01 T2): the leaf one block deep, lining beside and above it.
    const t = lining ? nicheDoor(raw, lining) : raw;
    const niche = isNiche(t);
    const startU = uDoor - Math.floor((t.width - 1) / 2);
    if (raw === FALLBACK_DOOR) {
      // Last resort: whatever stands right in front of the door leaf gives way.
      for (const d of [1, 2]) for (const dy of [0, 1]) {
        const q = facadePos(f, startU, d);
        if (ctx.builder.inside(q.x, y + dy, q.z)) ctx.builder.clear(q.x, y + dy, q.z, Priority.CLEARANCE);
      }
    }
    const cells = placeIfFits(ctx, t, frameAt(f, startU, y));
    if (!cells) {
      result.doorRejections.push(lastRejection);
      continue;
    }
    commit(ctx, cells);
    result.templates.push(t.id);
    const p = facadePos(f, startU, niche ? -1 : 0);
    result.doors.push({ x: p.x, y, z: p.z, outward: f.side, width: t.width, ...(niche ? { niche } : {}) });
    // Keep the way in free: two cells in front, one behind. Roofs are built before the
    // openings, so a low eave cornice may already hang there (one-storey houses with a steep
    // eave): the clearance wins and takes it out.
    for (let w = 0; w < t.width; w++)
      for (const d of niche ? [-2, 0, 1, 2] : [-1, 1, 2]) {
        const q = facadePos(f, startU + w, d);
        for (const dy of [0, 1]) {
          result.reserved.add(key(q.x, y + dy, q.z));
          if (d > 0 && ctx.builder.inside(q.x, y + dy, q.z)) ctx.builder.clear(q.x, y + dy, q.z, Priority.CLEARANCE);
        }
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

/**
 * Columns of a storey facade with an outside chimney in front (up to three blocks out, the
 * stack reaching into the storey): no window or balcony behind the stack.
 */
function behindStack(f: Facade, y0: number, stack: ReadonlyMap<string, number>): Set<number> {
  const out = new Set<number>();
  if (stack.size === 0) return out;
  for (let u = -1; u <= f.length; u++)
    for (const d of [1, 2, 3]) {
      const p = facadePos(f, u, d);
      if ((stack.get(`${p.x},${p.z}`) ?? -1) > y0) out.add(u);
    }
  return out;
}

export function buildOpenings(ctx: Ctx, panels: Map<string, Map<HorizontalDirection, Panel[]>[]>, stack: ReadonlyMap<string, number> = new Map()): OpeningsResult {
  const { plan } = ctx;
  const result = emptyOpenings();
  // Shutters and flower boxes by the style's probabilities (research 03; details.shutters and
  // details.flowerBoxes were never read before): decided once per house, so all windows match.
  // An explicitly wished window family keeps its own order.
  const dl = plan.input.detailLevel;
  const scale = (p: number) => Math.min(1, p * (dl === 1 ? 0.5 : dl === 3 ? 1.4 : 1));
  const deco = ctx.rng.fork('windowDeco');
  const boxes = deco.fork('boxes').chance(scale(plan.input.style.details.flowerBoxes));
  const shutters = deco.fork('shutters').chance(scale(plan.input.style.details.shutters));
  // One of the two (research 19 T13: at most two micro types per facade; sills come with both).
  const prefer = plan.input.windowWish.length > 0 ? [] : boxes ? ['W05', 'W05b'] : shutters ? ['W04', 'W04b'] : [];
  const variants = templatesByIds('window', [...new Set(prefer.map(baseTemplateId))]);
  const preferred = prefer.map((id) => variants.find((t) => t.id === id)).filter((t): t is FacadeTemplate => t !== undefined);
  const windows = [...preferred, ...templatesByIds('window', plan.input.windowTemplates).filter((t) => !prefer.includes(t.id))];
  const doors = templatesByIds('door', plan.input.doorTemplates);
  const doorMass = doorMassOf(plan);

  // Oriel and balcony on the first upper storey of the main body: on the front where they fit,
  // else on the back or a side (research 19 T14: details on all four sides); one per facade.
  const featureSpans = new Map<HorizontalDirection, [number, number]>();
  const main = plan.masses[0]!;
  if (!main.round && main.floors > 1) {
    const rect = storeyRect(main, 1);
    const y0 = floorY(plan, 1);
    const rowsUp = plan.floorHeight - 1;
    const place = (templates: readonly FacadeTemplate[], y: number, label: string) => {
      for (const side of ['north', 'south', 'east', 'west'] as const) {
        if (featureSpans.has(side) || joinedAt(plan, main, side, 1)) continue;
        const f = facadeOf(rect, side);
        const span = placeFeature(ctx, f, y, templates, label, result, new Set([...coveredColumns(plan, main, side, 1), ...behindStack(f, y0, stack)]));
        if (span) {
          featureSpans.set(side, span);
          return;
        }
      }
      plan.notes.push(`${label} passt an keiner Fassade – weggelassen.`);
    };
    if (plan.input.oriel) place([getTemplate('W09')], rowsUp >= 4 ? y0 + 2 : y0 + 1, 'Erker');
    if (plan.input.balcony) place(BALCONY_TEMPLATES, y0 + 1, 'Balkon');
  }

  for (const mass of plan.masses) {
    if (mass.round) continue;
    const perStorey = panels.get(mass.id) ?? [];
    for (let k = 0; k < mass.floors; k++) {
      const rect = storeyRect(mass, k);
      const y0 = floorY(plan, k);
      const rows = plan.floorHeight - 1;
      for (const side of ['north', 'east', 'south', 'west'] as const) {
        if (joinedAt(plan, mass, side, k)) continue;
        const f = facadeOf(rect, side);
        const facadePanels = perStorey[k]?.get(side) ?? [];
        // Columns in front of which another mass (cross gable, wing, annex) or the chimney
        // stands: no openings.
        const stackCols = mass === main ? behindStack(f, y0, stack) : new Set<number>();
        const covered = new Set([...coveredColumns(plan, mass, side, k), ...stackCols]);
        const blocked = (a: number, b: number) => {
          for (let u = a; u <= b; u++) if (covered.has(u)) return true;
          return false;
        };
        // Door: ground storey, front of the door mass.
        let doorSpan = k === 0 && mass === doorMass && side === 'north' ? placeDoor(ctx, f, f.origin.x - plan.door.x, y0 + 1, doors, result, wallRole(mass, k, plan)) : null;
        // Oriel on the front of the first upper storey, balcony on the front (or the back if
        // the front has the oriel); windows keep clear of both like of the door.
        if (k === 1 && mass === main) doorSpan = featureSpans.get(side) ?? doorSpan;
        // Windows: in stud-grid panels, or on symmetric axes for plain walls.
        // Towers: a window on every second storey from the top (a slender shaft, not a lattice).
        if (mass.kind === 'tower' && f.length < 6 && (mass.floors - 1 - k) % 2 === 1) continue;
        const density = mass.kind === 'tower' ? 'few' : plan.input.windows;
        const candidates = windows.filter((t) => t.height <= rows - 1 || (rows <= 3 && t.height <= rows));
        // Centred in the panel by the template's own width (research 03: centring by the panel
        // width left narrower windows hugging the left post).
        // Reveal: glass one block deep with a lining of the storey's wall material (research 01 T2).
        const lining = wallRole(mass, k, plan);
        const reserveGlass = (cells: NonNullable<ReturnType<typeof placeIfFits>>) => {
          // The open wall plane of a reveal stays free for decoration (candles in the window).
          for (const c of cells) if (c.cell.role === 'air' && c.cell.d === 0 && c.cell.y >= 0) ctx.builder.vacate(c.x, c.y, c.z);
          // Recessed panes and their lining stand in the room's first row: stairs and ladders keep away.
          for (const c of cells) if (c.cell.d === -1) result.reserved.add(key(c.x, c.y, c.z));
        };
        const tryWindow = (panelU0: number, panelWidth: number, maxWidth: number): boolean => {
          for (const t0 of candidates) {
            const t = revealWindow(t0, lining);
            if (t.width > maxWidth) continue;
            const yBottom = rows >= t.height + 2 ? y0 + 2 : y0 + 1;
            const frame = frameAt(f, panelU0 + Math.floor((panelWidth - t.width) / 2), yBottom);
            const cells = placeIfFits(ctx, t, frame);
            if (!cells) continue;
            if (cells.some((c) => result.reserved.has(key(c.x, c.y, c.z)))) continue;
            commit(ctx, cells);
            reserveGlass(cells);
            for (const c of cells) if (c.cell.d === 1 && c.cell.y === -1 && c.cell.form === 'stairs') result.sills.push({ x: c.x, y: c.y, z: c.z });
            result.windows++;
            result.templates.push(t.id);
            return true;
          }
          return false;
        };
        if (mass.frames && facadePanels.length > 1 && facadePanels.some((p) => !blocked(p.u0 - 1, p.u1 + 1))) {
          const timber = isTimberStorey(ctx, mass, k);
          // Panels with another mass in front are no facade: the rhythm counts the free ones.
          const free = facadePanels.filter((p) => !blocked(p.u0 - 1, p.u1 + 1));
          const n = free.length;
          // Rhythm instead of a window in every panel (research 08/19/20): the corner panels
          // of a timber facade stay closed and carry braces, the windows sit in the middle
          // panels. Always from five panels on; on smaller side and back facades for most
          // houses; the entrance front keeps its windows. The choice is per facade, so the
          // window axes of all storeys line up.
          const rhythm =
            density !== 'many' && n >= 3 && (n >= 5 || (side !== 'north' && ctx.rng.fork(`rhythm:${mass.id}:${side}`).chance(0.65)));
          free.forEach((panel, i) => {
            const width = panel.u1 - panel.u0 + 1;
            const brace = () => {
              // Japanese framing has no European braces (research 11): the panel stays a plain wall.
              if (timber && plan.input.styleId !== 'japanese' && plan.input.styleId !== 'cherry') addBraces(ctx, f, panel, y0, floorY(plan, k + 1));
            };
            if (doorSpan && panel.u1 >= doorSpan[0] && panel.u0 <= doorSpan[1]) return;
            if (rhythm && (i === 0 || i === n - 1)) return brace();
            if (density === 'few' && i % 2 === 1 && n > 2) return brace();
            if (density !== 'many' && width < 2 && n > 3) return brace();
            if (!tryWindow(panel.u0, width, Math.min(width, width >= 4 ? 2 : width))) {
              const yBottom = rows >= 4 ? y0 + 2 : y0 + 1;
              plainWindow(ctx, f, panel.u0 + Math.floor((width - 1) / 2), yBottom, Math.min(2, rows - 1), result.sills, lining, result.reserved);
              result.windows++;
            }
          });
        } else {
          // Plain walls: one recurring window type per facade, on symmetric axes computed from
          // the template's full footprint (shutters, frames included).
          let placedAny = false;
          for (const t0 of candidates) {
            const t = revealWindow(t0, lining);
            const b = templateBounds(t);
            const outer = b.maxX - b.minX + 1;
            const gap = Math.max(1, t.spacing);
            const axes = axesAround(f.length, outer, gap, density, doorSpan, covered).filter((pos) => !blocked(pos - 1, pos + outer));
            if (axes.length === 0) continue;
            const yBottom = rows >= t.height + 2 ? y0 + 2 : y0 + 1;
            const placements = axes.map((pos) => placeIfFits(ctx, t, frameAt(f, pos - b.minX, yBottom)));
            // Use the type only if it fits on every axis (consistent facade).
            if (placements.some((c) => !c || c.some((cell) => result.reserved.has(key(cell.x, cell.y, cell.z))))) continue;
            for (const cells of placements) {
              commit(ctx, cells!);
              reserveGlass(cells!);
              result.templates.push(t.id);
              for (const c of cells!) if (c.cell.d === 1 && c.cell.y === -1 && c.cell.form === 'stairs') result.sills.push({ x: c.x, y: c.y, z: c.z });
              result.windows++;
            }
            placedAny = true;
            break;
          }
          if (!placedAny) {
            for (const u0 of axesAround(f.length, 1, 2, density, doorSpan, covered).filter((pos) => !blocked(pos - 1, pos + 1))) {
              plainWindow(ctx, f, u0, rows >= 4 ? y0 + 2 : y0 + 1, Math.min(2, rows - 1), result.sills, lining, result.reserved);
              result.windows++;
            }
          }
        }
        // Beside an outside chimney: a small window in the wall next to the stack where that
        // stretch got none (the classic chimney gable) – one wall column between, one to the corner.
        if (stackCols.size > 0) {
          const s0 = Math.min(...stackCols);
          const s1 = Math.max(...stackCols);
          const framed = mass.frames && facadePanels.length > 1;
          const inPanel = (u: number) => !framed || facadePanels.some((p) => u >= p.u0 && u <= p.u1);
          const hasGlass = (a: number, b: number) => {
            for (let u = a; u <= b; u++)
              for (const d of [-1, 0]) {
                const q = facadePos(f, u, d);
                for (let y = y0 + 1; y < floorY(plan, k + 1); y++) if (ctx.builder.inside(q.x, y, q.z) && ctx.builder.getBlock(q.x, y, q.z).includes('glass')) return true;
              }
            return false;
          };
          for (const [from, to, step] of [
            [s0 - 2, 1, -1],
            [s1 + 2, f.length - 2, 1],
          ] as const) {
            if (hasGlass(Math.min(from, to), Math.max(from, to))) continue;
            for (let u = from; step < 0 ? u >= to : u <= to; u += step) {
              if (!inPanel(u) || blocked(u - 1, u + 1) || (doorSpan && u + 1 >= doorSpan[0] && u - 1 <= doorSpan[1])) continue;
              plainWindow(ctx, f, u, rows >= 4 ? y0 + 2 : y0 + 1, Math.min(2, rows - 1), result.sills, lining, result.reserved);
              result.windows++;
              break;
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
  return doorMassOf(plan) === mass;
}
