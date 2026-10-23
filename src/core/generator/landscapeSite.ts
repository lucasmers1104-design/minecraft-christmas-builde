import { HORIZONTAL, VECTOR, clockwise, type HorizontalDirection } from '@/core/blocks/directions';
import { AIR, blockIdOf } from '@/core/blocks/registry';
import { Priority, type VoxelBuilder } from '@/core/generator/geometry';
import { latticeValue } from '@/core/generator/seededRandom';

/**
 * What the landscape knows about the plot before it builds anything: which ground cells it
 * owns (y = 0 still empty), where the building stands at walking height, where eaves cover the
 * ground, how far every column is from the building, which columns lie in front of windows,
 * and which columns the landscape has already planned for something (path, border, beds …).
 * All landscape modules share one Site so they never place two things on the same spot.
 */

/** Planned use of a column (0 = free lawn). */
export const Use = {
  FREE: 0,
  PATH: 1,
  BORDER: 2,
  LAMP: 3,
  BED: 4,
  TREE: 5,
  PROP: 6,
  RESERVED: 7,
  POND: 8,
  ROCK: 9,
  BUSH: 10,
} as const;
export type UseValue = (typeof Use)[keyof typeof Use];

/** Plants (flowers, grass, saplings, petals) need one of these below (validator DIRT_LIKE). */
const PLANTABLE = new Set(['minecraft:grass_block', 'minecraft:dirt', 'minecraft:coarse_dirt', 'minecraft:rooted_dirt', 'minecraft:moss_block', 'minecraft:podzol']);

export function plantable(state: string): boolean {
  return PLANTABLE.has(blockIdOf(state));
}

/** Plot frame of the main entrance: u runs along the front edge, v is the depth from it. */
export interface PlotFrame {
  front: HorizontalDirection;
  /** Plot size along u and v. */
  Wu: number;
  Lv: number;
  toWorld(u: number, v: number): [number, number];
  toPlot(x: number, z: number): [number, number];
}

export function plotFrame(W: number, L: number, front: HorizontalDirection): PlotFrame {
  switch (front) {
    case 'north':
      return { front, Wu: W, Lv: L, toWorld: (u, v) => [u, v], toPlot: (x, z) => [x, z] };
    case 'south':
      return { front, Wu: W, Lv: L, toWorld: (u, v) => [W - 1 - u, L - 1 - v], toPlot: (x, z) => [W - 1 - x, L - 1 - z] };
    case 'west':
      return { front, Wu: L, Lv: W, toWorld: (u, v) => [v, L - 1 - u], toPlot: (x, z) => [L - 1 - z, x] };
    case 'east':
      return { front, Wu: L, Lv: W, toWorld: (u, v) => [W - 1 - v, u], toPlot: (x, z) => [z, W - 1 - x] };
  }
}

export class Site {
  readonly W: number;
  readonly L: number;
  readonly H: number;
  /** y = 0 was empty before the landscape: the landscape owns this ground cell. */
  readonly owned: Uint8Array;
  /** The building stands here at walking height (y = 1): walls, plinth apron, porch, steps. */
  readonly foot: Uint8Array;
  /** The building occupies this column somewhere above the ground (including eaves). */
  readonly built: Uint8Array;
  /** Building above, free at y = 1: ground under an overhang (no snow, shade). */
  readonly covered: Uint8Array;
  /** Chebyshev distance to the nearest foot column / built column. */
  readonly distFoot: Int16Array;
  readonly distBuilt: Int16Array;
  /** Distance to the nearest window in front of it (1–7, ±1 wide; 0 = not in front of a window). */
  readonly windowZone: Uint8Array;
  /** Highest window row (objects below stay out of the view anyway). */
  readonly windowTop: number;
  /** Planned use per column. */
  readonly use: Uint8Array;

  constructor(readonly b: VoxelBuilder) {
    const { width: W, height: H, length: L } = b.dimensions;
    this.W = W;
    this.L = L;
    this.H = H;
    const n = W * L;
    this.owned = new Uint8Array(n);
    this.foot = new Uint8Array(n);
    this.built = new Uint8Array(n);
    this.covered = new Uint8Array(n);
    this.windowZone = new Uint8Array(n);
    this.use = new Uint8Array(n);
    let windowTop = 0;
    const glass: [number, number, number][] = [];
    for (let x = 0; x < W; x++)
      for (let z = 0; z < L; z++) {
        const i = this.i(x, z);
        if (b.isAir(x, 0, z)) this.owned[i] = 1;
        if (!b.isAir(x, 1, z)) this.foot[i] = 1;
        for (let y = 1; y < H; y++) {
          const s = b.getBlock(x, y, z);
          if (s === AIR) continue;
          this.built[i] = 1;
          if (s.includes('glass')) {
            glass.push([x, y, z]);
            windowTop = Math.max(windowTop, y);
          }
        }
        if (this.built[i] && !this.foot[i]) this.covered[i] = 1;
      }
    this.windowTop = windowTop;
    this.distFoot = this.distances(this.foot);
    this.distBuilt = this.distances(this.built);
    // Window views: walk outward from every glass cell; mark open columns (not under the roof).
    for (const [gx, gy, gz] of glass)
      for (const dir of HORIZONTAL) {
        const [dx, , dz] = VECTOR[dir];
        const [sx, , sz] = VECTOR[clockwise(dir)];
        for (let k = 1; k <= 7; k++) {
          const x = gx + dx * k;
          const z = gz + dz * k;
          if (!this.inside(x, z)) break;
          if (k > 2 && this.foot[this.i(x, z)]) break;
          if (k > 1 && !b.isAir(x, gy, z) && this.foot[this.i(x, z)]) break;
          if (this.built[this.i(x, z)]) continue;
          for (const w of [-1, 0, 1]) {
            const wx = x + sx * w;
            const wz = z + sz * w;
            if (!this.inside(wx, wz)) continue;
            const j = this.i(wx, wz);
            this.windowZone[j] = this.windowZone[j] === 0 ? k : Math.min(this.windowZone[j]!, k);
          }
        }
      }
  }

  i(x: number, z: number): number {
    return x + this.W * z;
  }

  inside(x: number, z: number): boolean {
    return x >= 0 && z >= 0 && x < this.W && z < this.L;
  }

  /** Distance to the model edge (0 = outermost ring). */
  edge(x: number, z: number): number {
    return Math.min(x, z, this.W - 1 - x, this.L - 1 - z);
  }

  usage(x: number, z: number): number {
    return this.inside(x, z) ? this.use[this.i(x, z)]! : Use.RESERVED;
  }

  isFree(x: number, z: number): boolean {
    return this.inside(x, z) && this.use[this.i(x, z)] === Use.FREE && this.owned[this.i(x, z)] === 1;
  }

  claim(x: number, z: number, use: UseValue): void {
    if (this.inside(x, z)) this.use[this.i(x, z)] = use;
  }

  /** Free lawn: owned, unused, nothing standing on it. */
  isLawn(x: number, z: number): boolean {
    return this.isFree(x, z) && this.b.isAir(x, 1, z) && this.b.getBlock(x, 0, z) !== AIR;
  }

  ground(x: number, z: number): string {
    return this.b.getBlock(x, 0, z);
  }

  /** Writes a landscape block (DECOR priority); returns false if the cell is taken. */
  set(x: number, y: number, z: number, state: string): boolean {
    if (!this.b.inside(x, y, z)) return false;
    return this.b.setBlock(x, y, z, state, Priority.DECOR);
  }

  /** Multi-source BFS, 8-neighbourhood (Chebyshev distance). */
  private distances(source: Uint8Array): Int16Array {
    const d = new Int16Array(this.W * this.L).fill(32767);
    const queue: number[] = [];
    for (let i = 0; i < source.length; i++)
      if (source[i]) {
        d[i] = 0;
        queue.push(i);
      }
    for (let head = 0; head < queue.length; head++) {
      const i = queue[head]!;
      const x = i % this.W;
      const z = Math.floor(i / this.W);
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++) {
          const nx = x + dx;
          const nz = z + dz;
          if (!this.inside(nx, nz)) continue;
          const j = this.i(nx, nz);
          if (d[j]! <= d[i]! + 1) continue;
          d[j] = d[i]! + 1;
          queue.push(j);
        }
    }
    return d;
  }
}

/** Front line of the building in plot coordinates (smallest depth v of a foot column). */
export function frontLine(site: Site, frame: PlotFrame): number {
  let vh = frame.Lv;
  for (let x = 0; x < site.W; x++) for (let z = 0; z < site.L; z++) if (site.foot[site.i(x, z)]) vh = Math.min(vh, frame.toPlot(x, z)[1]);
  return vh;
}

/** Deterministic [0, 1) hash per column and channel (for material picks without a stream). */
export function cellHash(seed: number, x: number, z: number, channel = 0): number {
  return latticeValue(seed, x, channel, z);
}

/** Weighted pick from a mix with a given uniform value in [0, 1). */
export function pickBy<T>(mix: readonly (readonly [T, number])[], u: number): T {
  const total = mix.reduce((s, [, w]) => s + Math.max(0, w), 0);
  let r = u * total;
  for (const [v, w] of mix) {
    if (w <= 0) continue;
    r -= w;
    if (r < 0) return v;
  }
  return mix.filter(([, w]) => w > 0).at(-1)![0];
}

/**
 * Assigns materials to cells by rank of a smooth noise value, so that the shares match the
 * weights exactly and equal materials form soft clusters instead of a checkerboard.
 */
export function clusteredAssign<T>(cells: readonly (readonly [number, number])[], mix: readonly (readonly [T, number])[], noise: (x: number, z: number) => number): Map<string, T> {
  const out = new Map<string, T>();
  if (cells.length === 0 || mix.length === 0) return out;
  const ranked = [...cells].map(([x, z]) => ({ x, z, n: noise(x, z) })).sort((a, b) => a.n - b.n || a.x - b.x || a.z - b.z);
  const total = mix.reduce((s, [, w]) => s + Math.max(0, w), 0);
  let k = 0;
  let acc = 0;
  for (const [value, w] of mix) {
    if (w <= 0) continue;
    acc += w;
    const end = Math.round((acc / total) * ranked.length);
    for (; k < end; k++) out.set(`${ranked[k]!.x},${ranked[k]!.z}`, value);
  }
  for (; k < ranked.length; k++) out.set(`${ranked[k]!.x},${ranked[k]!.z}`, mix.at(-1)![0]);
  return out;
}
