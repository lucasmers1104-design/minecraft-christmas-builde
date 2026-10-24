import { VECTOR, clockwise, type HorizontalDirection } from '@/core/blocks/directions';
import { blockState } from '@/core/blocks/registry';
import type { SeededRandom } from '@/core/generator/seededRandom';
import { valueNoise } from '@/core/generator/seededRandom';
import { cellHash, clusteredAssign, Use, type Site } from '@/core/generator/landscapeSite';
import type { Mix, PathStyle } from '@/core/generator/landscapeStyles';
import type { SizeClass } from '@/core/style/styles';

/**
 * Path system (research note 15, T5/T6 and recommendation 2): one main path from the door
 * to the plot edge, drawn as a centre line with control points every 4–6 steps and a lateral
 * offset of ±1, painted with a brush of the row's width – so it curves organically and never
 * has holes. Across the path the centre is the palette role `path` (≥ 80 %), the shoulders mix
 * the style's rough blocks 50/30/15/5 in soft clusters (no checkerboard); three rows of stone
 * in front of the door (Antritt), wider at the door and narrower at the gate, thinning out
 * with some grass beyond the gate. Japanese gardens get stepping stones, modern ones a
 * straight line of plates with grass joints.
 */

export interface Entrance {
  x: number;
  z: number;
  /** Direction from the door towards the plot edge. */
  outward: HorizontalDirection;
}

export type PathRole = 'landing' | 'centre' | 'shoulder' | 'outer' | 'stone';

export interface PathCell {
  x: number;
  z: number;
  /** Step from the door (0 = first row in front of the door steps). */
  s: number;
  /** Lateral offset from the door axis. */
  t: number;
  role: PathRole;
}

export interface PathPlan {
  entrance: Entrance;
  cells: Map<string, PathCell>;
  /** Centre offset per step. */
  centre: number[];
  /** Lateral offsets used per step (sorted). */
  rows: number[][];
  /** Step at which the path crosses the front border line (null: no border crossing). */
  gateStep: number | null;
  /** World position of (step, lateral offset). */
  at(s: number, t: number): [number, number];
  /** Unit vector of +t (clockwise of outward). */
  side: readonly [number, number];
}

const key = (x: number, z: number) => `${x},${z}`;

/** Base width per size (research T5: small 2, medium 3, large/huge 3 + forecourt 5 × 5). */
const WIDTH: Readonly<Record<SizeClass, number>> = { small: 2, medium: 3, large: 3, huge: 3 };

/** Lateral offsets of a row of `width` around centre c; even widths lean to `lean`. */
function offsets(c: number, width: number, lean: 1 | -1): number[] {
  if (width <= 1) return [c];
  if (width === 2) return [c, c + lean].sort((a, b) => a - b);
  const h = Math.floor(width / 2);
  const out: number[] = [];
  for (let t = c - h; t <= c + h; t++) out.push(t);
  return out;
}

/**
 * Plans the main path. `gateStep` is the step that lies on the front border line (null if the
 * path does not cross one). Cells are only planned on ground the landscape owns.
 */
export function planPath(site: Site, e: Entrance, style: PathStyle, size: SizeClass, gateStep: number | null, rng: SeededRandom): PathPlan {
  const [ox, , oz] = VECTOR[e.outward];
  const [sx, , sz] = VECTOR[clockwise(e.outward)];
  const at = (s: number, t: number): [number, number] => [e.x + ox * s + sx * t, e.z + oz * s + sz * t];
  let n = 0;
  while (site.inside(...at(n, 0))) n++;

  // Centre line: straight for the landing, then control points every 4–6 steps (±1).
  const maxC = style.curve;
  const centre = new Array<number>(n).fill(0);
  if (maxC > 0) {
    const cps: [number, number][] = [[2, 0]];
    let s = 2;
    let c = 0;
    let dir = rng.chance(0.5) ? 1 : -1;
    while (s < n) {
      s += rng.int(4, 6);
      if (c + dir > maxC || c + dir < -maxC || rng.chance(0.3)) dir = -dir;
      c += dir;
      cps.push([s, c]);
    }
    for (let k = 0; k + 1 < cps.length; k++) {
      const [s0, c0] = cps[k]!;
      const [s1, c1] = cps[k + 1]!;
      for (let t = s0; t <= s1 && t < n; t++) centre[t] = Math.round(c0 + ((c1 - c0) * (t - s0)) / (s1 - s0));
    }
  }

  const lean: 1 | -1 = rng.chance(0.5) ? 1 : -1;
  const base = WIDTH[size];
  const cells = new Map<string, PathCell>();
  const rows: number[][] = [];
  const add = (s: number, t: number, role: PathRole) => {
    const [x, z] = at(s, t);
    if (!site.inside(x, z) || !site.owned[site.i(x, z)] || site.foot[site.i(x, z)]) return;
    cells.set(key(x, z), { x, z, s, t, role });
  };

  if (style.form === 'stepping') {
    // Stepping stones on every second step, zig-zag 0/±1; every third stone is 2 × 1 along the
    // walking direction, so the path stays one block wide (T6, 11/T18). The gate gets a stone.
    let t = 0;
    let stone = 0;
    let next = 2;
    const extended = new Set<number>();
    add(0, 0, 'landing');
    add(0, lean, 'landing');
    rows.push([0, lean].sort((a, b) => a - b));
    for (let s = 1; s < n; s++) {
      if (extended.has(s)) {
        add(s, t, s > (gateStep ?? n) ? 'outer' : 'stone');
        rows.push([t]);
        centre[s] = t;
        continue;
      }
      const onGate = gateStep !== null && s === gateStep;
      // Keep the rhythm around the gate: no stone right before or after it.
      if (gateStep !== null && (next === gateStep - 1 || next === gateStep + 1)) next = next < gateStep ? gateStep : gateStep + 2;
      if (!onGate && s !== next) {
        rows.push([]);
        continue;
      }
      if (onGate) t = 0;
      else t = Math.max(-1, Math.min(1, t + rng.pick([-1, 0, 1])));
      stone++;
      add(s, t, s > (gateStep ?? n) ? 'outer' : 'stone');
      rows.push([t]);
      centre[s] = t;
      const long = !onGate && stone % 3 === 0 && s + 1 < n && s + 1 !== gateStep && s + 2 !== gateStep;
      if (long) extended.add(s + 1);
      next = s + (long ? 3 : 2);
    }
    return { entrance: e, cells, centre, rows, gateStep, at, side: [sx, sz] };
  }

  for (let s = 0; s < n; s++) {
    let width = base;
    if (size === 'large' || size === 'huge') width = s <= 2 ? 5 : width;
    if (gateStep !== null && s >= gateStep - 1) width = Math.min(width, 2);
    const c = centre[s]!;
    const ts = offsets(c, width, lean);
    // Modern: plates with a grass joint every third row.
    if (style.form === 'grid' && s > 1 && s % 3 === 2) {
      rows.push([]);
      continue;
    }
    for (const t of ts) {
      let role: PathRole;
      if (s <= 2) role = 'landing';
      else if (gateStep !== null && s > gateStep) role = 'outer';
      else if (width <= 2 || t === c) role = 'centre';
      else role = 'shoulder';
      add(s, t, role);
    }
    rows.push(ts);
  }
  return { entrance: e, cells, centre, rows, gateStep, at, side: [sx, sz] };
}

export interface PathMaterials {
  /** Block of the palette role `path`. */
  path: string;
  seed: number;
  /** Snow on the ground: the path is cleared, so thinned-out cells are paved too. */
  snow: boolean;
}

/**
 * Paints a planned path onto the ground layer and claims its columns. dirt_path is only used
 * where nothing stands above (it would turn into dirt under a solid block).
 */
export function paintPath(site: Site, plan: PathPlan, style: PathStyle, m: PathMaterials): void {
  const b = site.b;
  const noise = (x: number, z: number) => valueNoise(m.seed, x, 0, z, 2.5);
  const landing = style.landing === 'path' ? m.path : style.landing;
  const shoulderWeight = style.shoulder.reduce((s, [, w]) => s + w, 0);
  const shoulderMix: Mix = [[m.path, Math.max(0, 100 - shoulderWeight)], ...style.shoulder];
  const byRole = (role: PathRole) => [...plan.cells.values()].filter((c) => c.role === role).map((c) => [c.x, c.z] as const);

  const centre = byRole('centre');
  const accent = clusteredAssign(centre, [
    [m.path, 92],
    [style.accent, 8],
  ], noise);
  const shoulders = clusteredAssign(byRole('shoulder'), shoulderMix, noise);
  const outer = clusteredAssign(byRole('outer'), [
    [m.path, 55],
    ...style.shoulder.map(([id, w]): readonly [string, number] => [id, (w * 30) / Math.max(1, shoulderWeight)]),
    ['grass', 15],
  ], noise);

  for (const c of plan.cells.values()) {
    const k = key(c.x, c.z);
    let id: string;
    switch (c.role) {
      case 'landing':
        id = landing;
        break;
      case 'centre':
        id = accent.get(k) ?? m.path;
        break;
      case 'shoulder':
        id = shoulders.get(k) ?? m.path;
        break;
      case 'outer':
        id = outer.get(k) ?? m.path;
        break;
      case 'stone':
        id = cellHash(m.seed, c.x, c.z, 3) < 0.3 ? style.accent : m.path;
        break;
    }
    // Thinned-out cells stay lawn but remain part of the path line (nothing is built there).
    site.claim(c.x, c.z, Use.PATH);
    if (id === 'grass' && !m.snow) continue;
    if (id === 'grass') id = shoulderMix[0]![0];
    if (id === 'dirt_path' && !b.isAir(c.x, 1, c.z)) id = 'coarse_dirt';
    site.set(c.x, 0, c.z, blockState(id));
  }
  // No 2 × 2 checkerboard anywhere (it reads as a pattern, not as wear): where two blocks
  // alternate diagonally, the upper right cell takes the colour of its diagonal pair.
  for (let pass = 0; pass < 2; pass++)
    for (const c of plan.cells.values()) {
      const ks = [key(c.x + 1, c.z), key(c.x, c.z + 1), key(c.x + 1, c.z + 1)];
      if (!ks.every((k) => plan.cells.has(k))) continue;
      const a = b.getBlock(c.x, 0, c.z);
      const r = b.getBlock(c.x + 1, 0, c.z);
      const d = b.getBlock(c.x, 0, c.z + 1);
      const e = b.getBlock(c.x + 1, 0, c.z + 1);
      if (a === e && r === d && a !== r) site.set(c.x + 1, 0, c.z, a);
    }
  // Stepping stones sit in moss: 40 % of the stones get a moss ring cell (T6).
  if (style.form === 'stepping') {
    for (const c of plan.cells.values()) {
      if (cellHash(m.seed, c.x, c.z, 5) >= 0.4) continue;
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const x = c.x + dx;
        const z = c.z + dz;
        if (!site.isFree(x, z) || site.edge(x, z) < 2 || cellHash(m.seed, x, z, 6) >= 0.5) continue;
        site.set(x, 0, z, blockState(style.shoulder[0]?.[0] ?? 'moss_block'));
      }
    }
  }
}

/** Path cells on a given step (e.g. the gate row), in lateral order. */
export function rowCells(plan: PathPlan, s: number): PathCell[] {
  return [...plan.cells.values()].filter((c) => c.s === s).sort((a, b) => a.t - b.t);
}
