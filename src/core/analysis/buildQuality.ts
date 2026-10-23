import { HORIZONTAL, VECTOR, type HorizontalDirection } from '@/core/blocks/directions';
import { AIR, blockIdOf, definitionOf, propsOf } from '@/core/blocks/registry';
import type { ShapeClass } from '@/core/blocks/shapes';
import type { HouseResult } from '@/core/generator/house/buildHouse';
import { floorY, joinedAt, storeyRect, wallTopOf, type MassKind } from '@/core/generator/house/plan';
import { facadeOf, facadePos } from '@/core/generator/house/walls';
import type { SizeClass, StyleId } from '@/core/style/styles';
import { listMaterials } from '@/core/style/materials';
import { blockAt, type VoxelModel } from '@/core/schema/voxelModel';

/**
 * Build quality metrics (stage "Profi-Builds", phase 1). "Better" has to be measurable: the
 * metrics below describe a finished house model the way the research reports and the creative
 * director's reference builds judge it – depth of every facade, silhouette, palette balance,
 * detail density (with an upper bound against overloading), all four sides and light.
 *
 * They are diagnostics and the basis of the variant ranking (phase 5), not a beauty formula:
 * research 20 found no metric that tracks aesthetics on its own. Every value is computed from
 * the canonical VoxelModel plus the house plan (masses, roof sections) – nothing is guessed from
 * generator internals that the model does not show.
 *
 * Conventions as in the generator: facade depth d = −1 inside, 0 wall plane, +1/+2 in front;
 * the front of a house faces north.
 */

/** Shapes that read as structure from a distance (≥ 8/16 deep, research 01 T1). */
const STRUCTURAL: ReadonlySet<ShapeClass> = new Set(['cube', 'pillar', 'facing_cube', 'barrel', 'stairs', 'slab', 'fence', 'fence_gate', 'wall', 'pane', 'door', 'bulb', 'grate', 'campfire']);

/** Small parts counted as micro detail in front of a wall (research 19 L7). */
const MICRO: ReadonlySet<ShapeClass> = new Set([
  'stairs',
  'slab',
  'trapdoor',
  'fence',
  'fence_gate',
  'wall',
  'button',
  'lantern',
  'chain',
  'potted',
  'plant',
  'candle',
  'vine',
  'sapling',
  'petals',
  'end_rod',
  'lightning_rod',
  'carpet',
  'barrel',
  'bulb',
]);

/** Micro parts that a viewer counts as detail on a whole side (no roof stairs or slabs). */
const SIDE_MICRO: ReadonlySet<ShapeClass> = new Set(['trapdoor', 'fence', 'fence_gate', 'wall', 'button', 'lantern', 'chain', 'potted', 'plant', 'candle', 'vine', 'sapling', 'barrel', 'bulb', 'end_rod', 'lightning_rod']);

/** Blocks a view ray passes through: plants, leaves, snow (garden, hedges, garlands). */
function passThrough(state: string): boolean {
  if (state === AIR) return true;
  const def = definitionOf(state);
  return def.category === 'nature' || def.category === 'winter' || def.shape === 'leaves';
}

const isGlass = (state: string) => state !== AIR && blockIdOf(state).includes('glass');
const isLight = (state: string) => state !== AIR && definitionOf(state).light >= 10 && propsOf(state).lit !== 'false';

export interface FacadeSample {
  mass: string;
  kind: MassKind;
  storey: number;
  side: HorizontalDirection;
  /** Wall-plane columns of the storey. */
  length: number;
  /** Wall cells (columns × wall rows between the floor layers). */
  cells: number;
  /** Cells per structural depth level d = −1, 0, +1, +2 (outermost structural block). */
  levels: [number, number, number, number];
  /** Micro detail blocks in front of the wall (d = +1/+2) in the wall rows. */
  micro: number;
  /** Glass cells and window openings (connected glass groups). */
  glass: number;
  windows: number;
  doors: number;
}

export interface GableSample {
  section: string;
  side: HorizontalDirection;
  cells: number;
  /** Distinct depth levels with a notable share. */
  levels: number;
}

export interface SideSample {
  /** Openings seen from this side (glass groups incl. dormers and gables). */
  windows: number;
  doors: number;
  /** Visible micro detail (lanterns, shutters, fences, plants, props …). */
  micro: number;
  /** Feature points (research 19 T14): window 1, door 3, micro 0.25. */
  points: number;
}

export interface QualityMetrics {
  facades: FacadeSample[];
  gables: GableSample[];
  depth: {
    /** Fewest depth levels of a main facade (main body and cross gable, length ≥ 7). */
    minLevelsMain: number;
    /** Mean depth levels over all facades. */
    meanLevels: number;
    /** Share of facade cells outside the wall plane (d ≠ 0). */
    relief: number;
    /** Fewest depth levels of a gable field with at least 9 cells (−1: no such gable). */
    minLevelsGable: number;
  };
  silhouette: {
    masses: number;
    eaveHeights: number;
    ridgeHeights: number;
    /** Towers, chimneys and dormers. */
    accents: number;
    /** Roof share of the main body's total height (ridge above wall top / ridge above ground). */
    roofShare: number;
    /** Local maxima of the skyline summed over the four views. */
    peaks: number;
  };
  palette: {
    /** Materials with at least 3 % of the visible hull. */
    materials: number;
    /** Share of the most used material and of the three most used together. */
    dominant: number;
    top3: number;
    shares: [string, number][];
  };
  detail: {
    /** Micro blocks per facade cell over all facades. */
    density: number;
    /** Lowest and highest density of a single facade side (main and secondary masses). */
    minSide: number;
    maxSide: number;
  };
  sides: Record<HorizontalDirection, SideSample>;
  fourSides: {
    /** Back (south) points relative to the front (north). */
    back: number;
    /** Weaker of the two sides relative to the front. */
    side: number;
  };
  light: {
    /** Share of doors with a light within 4 blocks. */
    entrance: number;
    /** Share of free eave corners with a light within 2 blocks. */
    eaveCorners: number;
    /** Light at the tower top (null: no tower). */
    tower: boolean | null;
    /** Share of windows with a light inside the room behind them. */
    windows: number;
  };
}

const NOTABLE = (count: number, total: number) => count >= 2 && count >= 0.04 * total;

function levelCount(levels: readonly number[], total: number): number {
  return levels.filter((n) => NOTABLE(n, total)).length;
}

/** Connected groups (4-neighbourhood) of marked cells in a column/row grid. */
function groups(cells: ReadonlySet<string>): number {
  const seen = new Set<string>();
  let n = 0;
  for (const start of cells) {
    if (seen.has(start)) continue;
    n++;
    const stack = [start];
    seen.add(start);
    while (stack.length > 0) {
      const [a, b] = stack.pop()!.split(',').map(Number) as [number, number];
      for (const [da, db] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const k = `${a + da},${b + db}`;
        if (cells.has(k) && !seen.has(k)) {
          seen.add(k);
          stack.push(k);
        }
      }
    }
  }
  return n;
}

/** Bounding zone of the building: all masses plus roof overhang and two blocks of trim. */
function buildingZone(house: HouseResult): { x0: number; x1: number; z0: number; z1: number } {
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  for (const m of house.plan.masses) {
    x0 = Math.min(x0, m.rect.x0 - 2);
    x1 = Math.max(x1, m.rect.x1 + 2);
    z0 = Math.min(z0, m.rect.z0 - 2);
    z1 = Math.max(z1, m.rect.z1 + 2);
  }
  for (const s of house.sections) {
    x0 = Math.min(x0, s.x0 - s.overhang - 1);
    x1 = Math.max(x1, s.x1 + s.overhang + 1);
    z0 = Math.min(z0, s.z0 - s.overhang - 1);
    z1 = Math.max(z1, s.z1 + s.overhang + 1);
  }
  return { x0, x1, z0, z1 };
}

function sampleFacades(model: VoxelModel, house: HouseResult): FacadeSample[] {
  const { plan } = house;
  const out: FacadeSample[] = [];
  for (const mass of plan.masses) {
    if (mass.round) continue;
    for (let k = 0; k < mass.floors; k++) {
      const rect = storeyRect(mass, k);
      const y0 = floorY(plan, k) + 1;
      const y1 = floorY(plan, k + 1) - 1;
      for (const side of HORIZONTAL) {
        if (joinedAt(plan, mass, side, k)) continue;
        const f = facadeOf(rect, side);
        const levels: [number, number, number, number] = [0, 0, 0, 0];
        const glass = new Set<string>();
        let cells = 0;
        let micro = 0;
        let doors = 0;
        for (let u = 0; u < f.length; u++)
          for (let y = y0; y <= y1; y++) {
            let level: number | null = null;
            for (let d = 2; d >= -1; d--) {
              const p = facadePos(f, u, d);
              const s = blockAt(model, p.x, y, p.z);
              if (s === AIR) continue;
              const shape = definitionOf(s).shape;
              if (d >= 1 && MICRO.has(shape)) micro++;
              if (isGlass(s) && d <= 0) glass.add(`${u},${y}`);
              if (shape === 'door' && propsOf(s).half === 'lower' && d <= 0) doors++;
              if (level === null && STRUCTURAL.has(shape) && definitionOf(s).category !== 'nature') level = d;
            }
            // An open doorway or arch (nothing structural down to d = −1) is not a wall cell.
            if (level === null) continue;
            cells++;
            levels[level + 1]!++;
          }
        out.push({ mass: mass.id, kind: mass.kind, storey: k, side, length: f.length, cells, levels, micro, glass: glass.size, windows: groups(glass), doors });
      }
    }
  }
  return out;
}

function sampleGables(model: VoxelModel, house: HouseResult): GableSample[] {
  const bySide = new Map<string, { side: HorizontalDirection; section: string; cells: { x: number; y: number; z: number }[] }>();
  for (const c of house.roof.gableCells) {
    const key = `${c.section}:${c.side}`;
    if (!bySide.has(key)) bySide.set(key, { side: c.side, section: c.section, cells: [] });
    bySide.get(key)!.cells.push(c);
  }
  const out: GableSample[] = [];
  for (const g of bySide.values()) {
    const [ox, , oz] = VECTOR[g.side];
    const levels = new Map<number, number>();
    for (const c of g.cells) {
      // Depth relative to the gable plane: outermost structural block from +2 to −1.
      for (let d = 2; d >= -1; d--) {
        const s = blockAt(model, c.x + ox * d, c.y, c.z + oz * d);
        if (s === AIR || !STRUCTURAL.has(definitionOf(s).shape)) continue;
        levels.set(d, (levels.get(d) ?? 0) + 1);
        break;
      }
    }
    out.push({ section: g.section, side: g.side, cells: g.cells.length, levels: levelCount([...levels.values()], g.cells.length) });
  }
  return out;
}

/** What a viewer sees from each side: the first block along the view ray inside the zone. */
function sampleSides(model: VoxelModel, house: HouseResult): Record<HorizontalDirection, SideSample> {
  const zone = buildingZone(house);
  const H = model.dimensions.height;
  const out = {} as Record<HorizontalDirection, SideSample>;
  for (const side of HORIZONTAL) {
    const [ox, , oz] = VECTOR[side];
    const alongX = side === 'north' || side === 'south';
    const a0 = alongX ? zone.x0 : zone.z0;
    const a1 = alongX ? zone.x1 : zone.z1;
    // Rays start outside on `side` and travel against its outward vector.
    const start = side === 'north' ? zone.z0 : side === 'south' ? zone.z1 : side === 'west' ? zone.x0 : zone.x1;
    const end = side === 'north' ? zone.z1 : side === 'south' ? zone.z0 : side === 'west' ? zone.x1 : zone.x0;
    const step = -(ox + oz);
    const glass = new Set<string>();
    let doors = 0;
    let micro = 0;
    for (let a = a0; a <= a1; a++)
      for (let y = 1; y < H; y++) {
        for (let t = start; step > 0 ? t <= end : t >= end; t += step) {
          const x = alongX ? a : t;
          const z = alongX ? t : a;
          const s = blockAt(model, x, y, z);
          if (passThrough(s)) continue;
          const shape = definitionOf(s).shape;
          if (isGlass(s)) glass.add(`${a},${y}`);
          else if (shape === 'door' && propsOf(s).half === 'lower') doors++;
          else if (SIDE_MICRO.has(shape)) {
            micro++;
            // Thin parts do not hide what is behind them (a lantern in front of a window).
            if (shape === 'lantern' || shape === 'chain' || shape === 'fence' || shape === 'trapdoor') continue;
          }
          break;
        }
      }
    const windows = groups(glass);
    out[side] = { windows, doors, micro, points: windows + 3 * doors + 0.25 * micro };
  }
  return out;
}

/** Skyline local maxima (plateaus higher than both neighbours) summed over the four views. */
function skylinePeaks(model: VoxelModel, house: HouseResult): number {
  const zone = buildingZone(house);
  const H = model.dimensions.height;
  const decor = (s: string) => {
    if (passThrough(s)) return true;
    const shape = definitionOf(s).shape;
    return shape === 'lantern' || shape === 'chain' || shape === 'candle' || shape === 'carpet' || shape === 'end_rod' || shape === 'lightning_rod';
  };
  let peaks = 0;
  for (const alongX of [true, false]) {
    const a0 = alongX ? zone.x0 : zone.z0;
    const a1 = alongX ? zone.x1 : zone.z1;
    const b0 = alongX ? zone.z0 : zone.x0;
    const b1 = alongX ? zone.z1 : zone.x1;
    const sky: number[] = [];
    for (let a = a0; a <= a1; a++) {
      let top = 0;
      for (let b = b0; b <= b1; b++)
        for (let y = H - 1; y > top; y--) {
          const s = blockAt(model, alongX ? a : b, y, alongX ? b : a);
          if (s !== AIR && !decor(s)) {
            top = y;
            break;
          }
        }
      sky.push(top);
    }
    // Runs of equal height; a peak is a run higher than its neighbouring runs.
    const runs: number[] = [];
    for (const h of sky) if (runs.at(-1) !== h) runs.push(h);
    for (let i = 0; i < runs.length; i++) if ((runs[i - 1] ?? -1) < runs[i]! && (runs[i + 1] ?? -1) < runs[i]!) peaks++;
  }
  // Both opposite views show the same outline mirrored: count each axis twice.
  return 2 * peaks;
}

let MATERIAL_OF: Map<string, string> | null = null;

/** Block id → material id (forms of the catalogue; full blocks and pillars win). */
function materialOf(id: string): string {
  if (!MATERIAL_OF) {
    MATERIAL_OF = new Map();
    const materials = listMaterials();
    for (const m of materials) {
      for (const form of ['block', 'pillar'] as const) {
        const b = m.forms[form];
        if (b && !MATERIAL_OF.has(b)) MATERIAL_OF.set(b, m.id);
      }
      for (const w of m.weathering ?? []) if (!MATERIAL_OF.has(w)) MATERIAL_OF.set(w, m.id);
    }
    for (const m of materials) for (const b of Object.values(m.forms)) if (b && !MATERIAL_OF.has(b)) MATERIAL_OF.set(b, m.id);
  }
  const short = id.replace('minecraft:', '');
  return MATERIAL_OF.get(short) ?? short;
}

/** Visible hull of the building (blocks touching outside air), grouped by material. */
function samplePalette(model: VoxelModel, house: HouseResult): QualityMetrics['palette'] {
  const { width: W, height: H, length: L } = model.dimensions;
  const outside = new Uint8Array(W * H * L);
  const idx = (x: number, y: number, z: number) => x + W * (z + L * y);
  const stack: number[] = [];
  const push = (x: number, y: number, z: number) => {
    if (x < 0 || y < 0 || z < 0 || x >= W || y >= H || z >= L) return;
    const i = idx(x, y, z);
    if (outside[i] || blockAt(model, x, y, z) !== AIR) return;
    outside[i] = 1;
    stack.push(i);
  };
  for (let x = 0; x < W; x++)
    for (let z = 0; z < L; z++) {
      push(x, H - 1, z);
      for (let y = 0; y < H; y++) if (x === 0 || z === 0 || x === W - 1 || z === L - 1) push(x, y, z);
    }
  while (stack.length > 0) {
    const i = stack.pop()!;
    const x = i % W;
    const z = Math.floor(i / W) % L;
    const y = Math.floor(i / (W * L));
    push(x + 1, y, z);
    push(x - 1, y, z);
    push(x, y + 1, z);
    push(x, y - 1, z);
    push(x, y, z + 1);
    push(x, y, z - 1);
  }
  const zone = buildingZone(house);
  const counts = new Map<string, number>();
  let total = 0;
  for (let y = 1; y < H; y++)
    for (let z = Math.max(0, zone.z0); z <= Math.min(L - 1, zone.z1); z++)
      for (let x = Math.max(0, zone.x0); x <= Math.min(W - 1, zone.x1); x++) {
        const s = blockAt(model, x, y, z);
        if (s === AIR) continue;
        const def = definitionOf(s);
        if (def.category === 'nature' || def.category === 'winter' || def.category === 'light' || def.category === 'deco') continue;
        const visible = [
          [1, 0, 0],
          [-1, 0, 0],
          [0, 1, 0],
          [0, -1, 0],
          [0, 0, 1],
          [0, 0, -1],
        ].some(([dx, dy, dz]) => {
          const nx = x + dx!;
          const ny = y + dy!;
          const nz = z + dz!;
          if (nx < 0 || ny < 0 || nz < 0 || nx >= W || ny >= H || nz >= L) return true;
          return outside[idx(nx, ny, nz)] === 1;
        });
        if (!visible) continue;
        const m = materialOf(blockIdOf(s));
        counts.set(m, (counts.get(m) ?? 0) + 1);
        total++;
      }
  const shares = [...counts.entries()].map(([m, n]): [string, number] => [m, total > 0 ? n / total : 0]).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return {
    materials: shares.filter(([, s]) => s >= 0.03).length,
    dominant: shares[0]?.[1] ?? 0,
    top3: shares.slice(0, 3).reduce((a, [, s]) => a + s, 0),
    shares,
  };
}

function hasLight(model: VoxelModel, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): boolean {
  for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (isLight(blockAt(model, x, y, z))) return true;
  return false;
}

function sampleLight(model: VoxelModel, house: HouseResult, facades: readonly FacadeSample[]): QualityMetrics['light'] {
  const { plan, sections } = house;
  // Doors: every lower door half on a storey-0 facade of the model.
  let doors = 0;
  let litDoors = 0;
  for (const mass of plan.masses) {
    if (mass.round) continue;
    const rect = storeyRect(mass, 0);
    const y = floorY(plan, 0) + 1;
    for (const side of HORIZONTAL) {
      if (joinedAt(plan, mass, side, 0)) continue;
      const f = facadeOf(rect, side);
      for (let u = 0; u < f.length; u++)
        for (const d of [0, -1]) {
          const p = facadePos(f, u, d);
          const s = blockAt(model, p.x, y, p.z);
          if (definitionOf(s).shape !== 'door' || propsOf(s).half !== 'lower') continue;
          doors++;
          if (hasLight(model, p.x - 4, p.x + 4, y - 1, y + 4, p.z - 4, p.z + 4)) litDoors++;
        }
    }
  }
  // Eave corners of the masses' roofs that are not covered by another section.
  const massIds = new Set(plan.masses.map((m) => m.id));
  const roofs = sections.filter((s) => massIds.has(s.id) && s.type !== 'flat');
  const covered = (x: number, z: number, own: string) =>
    sections.some((s) => s.id !== own && !s.id.startsWith(`${own}-`) && !own.startsWith(`${s.id}-`) && x >= s.x0 - s.overhang && x <= s.x1 + s.overhang && z >= s.z0 - s.overhang && z <= s.z1 + s.overhang);
  let corners = 0;
  let litCorners = 0;
  for (const s of roofs) {
    for (const x of [s.x0 - s.overhang, s.x1 + s.overhang])
      for (const z of [s.z0 - s.overhang, s.z1 + s.overhang]) {
        if (covered(x, z, s.id)) continue;
        corners++;
        if (hasLight(model, x - 2, x + 2, s.wallTop - 4, s.wallTop + 1, z - 2, z + 2)) litCorners++;
      }
  }
  // Tower: a light around its top (above the main wall top).
  const tower = plan.masses.find((m) => m.kind === 'tower');
  let towerLit: boolean | null = null;
  if (tower) {
    const main = plan.masses[0]!;
    const r = tower.rect;
    towerLit = hasLight(model, r.x0 - 2, r.x1 + 2, wallTopOf(plan, main), model.dimensions.height - 1, r.z0 - 2, r.z1 + 2);
  }
  // Windows: a light in the room behind them (same storey, up to 7 deep, ±5 along the wall).
  let windows = 0;
  let litWindows = 0;
  for (const fs of facades) {
    if (fs.windows === 0) continue;
    const mass = plan.masses.find((m) => m.id === fs.mass)!;
    const rect = storeyRect(mass, fs.storey);
    const f = facadeOf(rect, fs.side);
    const y0 = floorY(plan, fs.storey) + 1;
    const y1 = floorY(plan, fs.storey + 1) - 1;
    const glass = new Set<string>();
    for (let u = 0; u < f.length; u++)
      for (let y = y0; y <= y1; y++)
        for (const d of [0, -1]) {
          const p = facadePos(f, u, d);
          if (isGlass(blockAt(model, p.x, y, p.z))) glass.add(`${u},${y}`);
        }
    // One sample per window: the first cell of each group.
    const seen = new Set<string>();
    for (const start of glass) {
      if (seen.has(start)) continue;
      const stack = [start];
      seen.add(start);
      while (stack.length > 0) {
        const [a, b] = stack.pop()!.split(',').map(Number) as [number, number];
        for (const k of [`${a + 1},${b}`, `${a - 1},${b}`, `${a},${b + 1}`, `${a},${b - 1}`])
          if (glass.has(k) && !seen.has(k)) {
            seen.add(k);
            stack.push(k);
          }
      }
      windows++;
      const [u] = start.split(',').map(Number) as [number];
      let lit = false;
      for (let du = -5; du <= 5 && !lit; du++)
        for (let d = -1; d >= -7 && !lit; d--) {
          const p = facadePos(f, u + du, d);
          for (let y = y0; y <= y1 + 1 && !lit; y++) if (isLight(blockAt(model, p.x, y, p.z))) lit = true;
        }
      if (lit) litWindows++;
    }
  }
  return {
    entrance: doors > 0 ? litDoors / doors : 1,
    eaveCorners: corners > 0 ? litCorners / corners : 1,
    tower: towerLit,
    windows: windows > 0 ? litWindows / windows : 1,
  };
}

export function measureHouse(model: VoxelModel, house: HouseResult): QualityMetrics {
  const { plan, roof, sections } = house;
  const facades = sampleFacades(model, house);
  const gables = sampleGables(model, house);

  // Depth per facade side of a mass (all storeys together).
  const perSide = new Map<string, { cells: number; levels: number[]; length: number; kind: MassKind; micro: number }>();
  for (const f of facades) {
    const key = `${f.mass}:${f.side}`;
    const e = perSide.get(key) ?? { cells: 0, levels: [0, 0, 0, 0], length: 0, kind: f.kind, micro: 0 };
    e.cells += f.cells;
    e.micro += f.micro;
    e.length = Math.max(e.length, f.length);
    f.levels.forEach((n, i) => (e.levels[i]! += n));
    perSide.set(key, e);
  }
  const sides = [...perSide.values()].filter((e) => e.cells > 0);
  const mainSides = sides.filter((e) => (e.kind === 'main' || e.kind === 'cross') && e.length >= 7);
  const levelOf = (e: { cells: number; levels: number[] }) => levelCount(e.levels, e.cells);
  const totalCells = sides.reduce((a, e) => a + e.cells, 0);
  const offPlane = sides.reduce((a, e) => a + e.cells - e.levels[1]!, 0);
  const bigGables = gables.filter((g) => g.cells >= 9);

  // Silhouette from the plan and the built roof.
  const main = plan.masses[0]!;
  const porch = sections.find((s) => s.id === 'porch');
  const eaves = new Set([...plan.masses.map((m) => wallTopOf(plan, m)), ...(porch ? [porch.wallTop] : [])]);
  const ridgeOf = new Map<string, number>();
  for (const m of plan.masses) {
    let top = -Infinity;
    for (const [id, y] of Object.entries(roof.ridgeY)) if (id === m.id || id === `${m.id}-gable`) top = Math.max(top, y);
    if (m.round) {
      const r = m.rect;
      for (let y = model.dimensions.height - 1; y > 0 && top === -Infinity; y--)
        for (let x = r.x0; x <= r.x1 && top === -Infinity; x++) for (let z = r.z0; z <= r.z1; z++) if (blockAt(model, x, y, z) !== AIR) top = y;
    }
    if (top > -Infinity) ridgeOf.set(m.id, top);
  }
  const mainRidge = ridgeOf.get(main.id) ?? wallTopOf(plan, main);
  const mainTop = wallTopOf(plan, main);
  let chimneys = 0;
  for (let y = mainTop; y < model.dimensions.height; y++)
    for (let z = 0; z < model.dimensions.length; z++) for (let x = 0; x < model.dimensions.width; x++) if (blockIdOf(blockAt(model, x, y, z)) === 'minecraft:campfire') chimneys++;
  const dormers = sections.filter((s) => s.id.startsWith('dormer')).length;
  const towers = plan.masses.filter((m) => m.kind === 'tower').length;

  const sideSamples = sampleSides(model, house);
  const front = Math.max(1, sideSamples.north.points);
  const densities = sides.map((e) => (e.cells > 0 ? e.micro / e.cells : 0));

  return {
    facades,
    gables,
    depth: {
      minLevelsMain: mainSides.length > 0 ? Math.min(...mainSides.map(levelOf)) : 0,
      meanLevels: sides.length > 0 ? sides.reduce((a, e) => a + levelOf(e), 0) / sides.length : 0,
      relief: totalCells > 0 ? offPlane / totalCells : 0,
      minLevelsGable: bigGables.length > 0 ? Math.min(...bigGables.map((g) => g.levels)) : -1,
    },
    silhouette: {
      masses: plan.masses.length,
      eaveHeights: eaves.size,
      ridgeHeights: new Set(ridgeOf.values()).size,
      accents: towers + chimneys + dormers,
      roofShare: mainRidge > mainTop ? (mainRidge - mainTop) / mainRidge : 0,
      peaks: skylinePeaks(model, house),
    },
    palette: samplePalette(model, house),
    detail: {
      density: totalCells > 0 ? sides.reduce((a, e) => a + e.micro, 0) / totalCells : 0,
      minSide: densities.length > 0 ? Math.min(...densities) : 0,
      maxSide: densities.length > 0 ? Math.max(...densities) : 0,
    },
    sides: sideSamples,
    fourSides: {
      back: sideSamples.south.points / front,
      side: Math.min(sideSamples.east.points, sideSamples.west.points) / front,
    },
    light: sampleLight(model, house, facades),
  };
}

// ---------------------------------------------------------------------------------------------
// Target ranges and score

export type Range = readonly [min: number, max: number];

export interface QualityTargets {
  minLevelsMain: Range;
  relief: Range;
  minLevelsGable: Range;
  masses: Range;
  eaveHeights: Range;
  ridgeHeights: Range;
  accents: Range;
  roofShare: Range;
  dominant: Range;
  materials: Range;
  density: Range;
  maxSide: Range;
  back: Range;
  side: Range;
  entrance: Range;
  eaveCorners: Range;
  windowsLit: Range;
}

/**
 * Roof share of the total height per style: R = h_roof / h_wall bands from research 19 T4,
 * converted with share = R / (1 + R); the creative director's references sit at 45–55 %.
 */
const ROOF_SHARE: Readonly<Record<StyleId, Range>> = {
  medieval: [0.4, 0.58],
  fantasy: [0.42, 0.62],
  rustic: [0.38, 0.56],
  nordic: [0.44, 0.64],
  japanese: [0.3, 0.52],
  cherry: [0.3, 0.52],
  mediterranean: [0.12, 0.36],
  modern: [0, 0.2],
};

/**
 * Target ranges per style and size (estimates from research 01, 19, 20 and the reference
 * builds). Small houses may stay one mass; from medium on a house is a cascade (≥ 2 masses,
 * ≥ 2 eave heights), main facades show three depth levels, every side carries detail.
 */
export function qualityTargets(style: StyleId, size: SizeClass): QualityTargets {
  const formal = style === 'modern' || style === 'mediterranean';
  const big = size === 'large' || size === 'huge';
  const cascade = size !== 'small';
  return {
    minLevelsMain: [3, 4],
    relief: formal ? [0.15, 0.6] : [0.25, 0.7],
    minLevelsGable: [2, 4],
    masses: [cascade ? 2 : 1, size === 'huge' ? 6 : 5],
    eaveHeights: [cascade ? 2 : 1, 5],
    ridgeHeights: [cascade && style !== 'modern' ? 2 : 1, 6],
    accents: [style === 'modern' ? 0 : 1, big ? 6 : 4],
    roofShare: ROOF_SHARE[style],
    dominant: [0.2, 0.55],
    materials: [3, 7],
    density: style === 'modern' ? [0.03, 0.18] : [0.08, 0.35],
    maxSide: [0, style === 'modern' ? 0.3 : 0.6],
    back: [0.5, 2],
    side: [0.3, 2],
    entrance: [1, 1],
    eaveCorners: [style === 'modern' ? 0 : 0.5, 1],
    windowsLit: [0.8, 1],
  };
}

/** Weights of the score terms (structure and form first, research 19/20). */
export const QUALITY_WEIGHTS: Readonly<Record<keyof QualityTargets, number>> = {
  minLevelsMain: 3,
  relief: 2,
  minLevelsGable: 1,
  masses: 3,
  eaveHeights: 2,
  ridgeHeights: 1,
  accents: 1,
  roofShare: 2,
  dominant: 1,
  materials: 1,
  density: 2,
  maxSide: 1,
  back: 2,
  side: 1,
  entrance: 2,
  eaveCorners: 1,
  windowsLit: 1,
};

/** Metric values in the order of the targets. */
export function metricValues(m: QualityMetrics): Record<keyof QualityTargets, number> {
  return {
    minLevelsMain: m.depth.minLevelsMain,
    relief: m.depth.relief,
    // No gable (flat or hip roof) is not a fault.
    minLevelsGable: m.depth.minLevelsGable < 0 ? 2 : m.depth.minLevelsGable,
    masses: m.silhouette.masses,
    eaveHeights: m.silhouette.eaveHeights,
    ridgeHeights: m.silhouette.ridgeHeights,
    accents: m.silhouette.accents,
    roofShare: m.silhouette.roofShare,
    dominant: m.palette.dominant,
    materials: m.palette.materials,
    density: m.detail.density,
    maxSide: m.detail.maxSide,
    back: m.fourSides.back,
    side: m.fourSides.side,
    entrance: m.light.entrance,
    eaveCorners: m.light.eaveCorners,
    windowsLit: m.light.windows,
  };
}

/** 1 inside the range, falling linearly to 0 at one range width (at least `tol`) outside. */
export function rangeScore(value: number, [min, max]: Range, tol: number): number {
  if (value >= min && value <= max) return 1;
  const dist = value < min ? min - value : value - max;
  return Math.max(0, 1 - dist / Math.max(tol, max - min));
}

const TOLERANCE: Readonly<Record<keyof QualityTargets, number>> = {
  minLevelsMain: 2,
  relief: 0.2,
  minLevelsGable: 2,
  masses: 2,
  eaveHeights: 2,
  ridgeHeights: 2,
  accents: 2,
  roofShare: 0.15,
  dominant: 0.2,
  materials: 2,
  density: 0.15,
  maxSide: 0.3,
  back: 0.5,
  side: 0.3,
  entrance: 1,
  eaveCorners: 0.5,
  windowsLit: 0.5,
};

export interface QualityScore {
  /** Weighted mean of all terms, 0..1. */
  total: number;
  terms: Record<keyof QualityTargets, number>;
  /** Metrics outside their target range. */
  misses: (keyof QualityTargets)[];
}

export function qualityScore(m: QualityMetrics, targets: QualityTargets): QualityScore {
  const values = metricValues(m);
  const terms = {} as Record<keyof QualityTargets, number>;
  const misses: (keyof QualityTargets)[] = [];
  let sum = 0;
  let weights = 0;
  for (const key of Object.keys(targets) as (keyof QualityTargets)[]) {
    const s = rangeScore(values[key], targets[key], TOLERANCE[key]);
    terms[key] = s;
    if (s < 1) misses.push(key);
    sum += s * QUALITY_WEIGHTS[key];
    weights += QUALITY_WEIGHTS[key];
  }
  return { total: weights > 0 ? sum / weights : 0, terms, misses };
}
