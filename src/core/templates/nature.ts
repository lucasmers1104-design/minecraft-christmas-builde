import { blockState, isAvailableIn } from '@/core/blocks/registry';
import type { HorizontalDirection } from '@/core/blocks/directions';
import type { SeededRandom } from '@/core/generator/seededRandom';

/**
 * Nature and garden props as procedural templates (research note 15_gelaende_gaerten_wege.md,
 * T12 bushes, T13 small trees, T14 rocks, T17 props; style bibles: cherry tree 11/T16, niwaki
 * pine 11/T17, cypress and olive 12/M12, woodpile 10/T12 and 13/T11).
 *
 * Every generator returns cells relative to its base: x/z offsets from the trunk (or anchor)
 * and absolute y, where y = 1 is the first cell above the ground layer and y = 0 the ground
 * itself (rooted dirt under a trunk, half-buried rocks). The caller checks that every cell is
 * free and inside the plot before it writes anything. Leaves are always persistent; nothing
 * needs support except plants, petals and buttons, which stand on dirt or full faces.
 */

export type TreeKind = 'oak' | 'birch' | 'spruce' | 'azalea' | 'cherry' | 'pine' | 'cypress' | 'olive';

export interface NatureCell {
  x: number;
  y: number;
  z: number;
  state: string;
}

export interface NaturePiece {
  cells: NatureCell[];
  /** Plants on the ground around the piece (cherry petals); placed only on free dirt-like cells. */
  decor: NatureCell[];
  /** Horizontal reach of the crown from the base (Chebyshev). */
  radius: number;
  /** Highest y used. */
  top: number;
}

const leaves = (id: string) => blockState(id, { persistent: 'true' });
const log = (id: string, axis: 'x' | 'y' | 'z' = 'y') => blockState(id, { axis });

class Shape {
  private readonly map = new Map<string, NatureCell>();
  readonly decor: NatureCell[] = [];

  /** Sets a cell; `soft` cells (leaves) never replace wood. */
  set(x: number, y: number, z: number, state: string, soft = false): void {
    const key = `${x},${y},${z}`;
    if (soft && this.map.has(key)) return;
    this.map.set(key, { x, y, z, state });
  }

  piece(): NaturePiece {
    const cells = [...this.map.values()].sort((a, b) => a.y - b.y || a.z - b.z || a.x - b.x);
    let radius = 0;
    let top = 0;
    for (const c of cells) {
      radius = Math.max(radius, Math.abs(c.x), Math.abs(c.z));
      top = Math.max(top, c.y);
    }
    return { cells, decor: this.decor, radius, top };
  }
}

/** Square layer of radius r; corner cells only with probability `corner`. */
function layer(s: Shape, rng: SeededRandom, cx: number, y: number, cz: number, r: number, state: string, corner: number, hole = 0): void {
  for (let dx = -r; dx <= r; dx++)
    for (let dz = -r; dz <= r; dz++) {
      const isCorner = r > 0 && Math.abs(dx) === r && Math.abs(dz) === r;
      if (isCorner && !rng.chance(corner)) continue;
      if (!isCorner && hole > 0 && (Math.abs(dx) === r || Math.abs(dz) === r) && rng.chance(hole)) continue;
      s.set(cx + dx, y, cz + dz, state, true);
    }
}

function plus(s: Shape, cx: number, y: number, cz: number, state: string): void {
  for (const [dx, dz] of [
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const)
    s.set(cx + dx, y, cz + dz, state, true);
}

const DIRS: readonly [number, number][] = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];

/** Root flare: 1–2 horizontal logs beside the trunk on y = 1, rooted dirt below (T13). */
function roots(s: Shape, rng: SeededRandom, wood: string): void {
  s.set(0, 0, 0, blockState('rooted_dirt'));
  for (const [dx, dz] of rng.shuffle(DIRS).slice(0, rng.int(1, 2))) {
    s.set(dx, 1, dz, log(wood, dx !== 0 ? 'x' : 'z'));
    s.set(dx, 0, dz, blockState('rooted_dirt'));
  }
}

/** Small oak (T13: trunk 4–6, blob crown r = 2, h = 3, crown one above the trunk). */
function oak(rng: SeededRandom, maxTop: number): NaturePiece {
  const s = new Shape();
  const t = Math.min(rng.int(4, 5), maxTop - 2);
  for (let y = 1; y <= t; y++) s.set(0, y, 0, log('oak_log'));
  // One short branch on the lower crown edge (uneven branches, T13 custom).
  const [bx, bz] = rng.pick(DIRS);
  s.set(bx, t - 1, bz, log('oak_log', bx !== 0 ? 'x' : 'z'));
  const l = leaves('oak_leaves');
  layer(s, rng, 0, t - 1, 0, 2, l, 0.35);
  layer(s, rng, 0, t, 0, 2, l, 0.5);
  layer(s, rng, 0, t + 1, 0, 1, l, 0.6);
  plus(s, 0, t + 2, 0, l);
  roots(s, rng, 'oak_log');
  return s.piece();
}

/** Birch (vanilla: trunk 5–7, blob r = 2): slimmer crown, white trunk. */
function birch(rng: SeededRandom, maxTop: number): NaturePiece {
  const s = new Shape();
  const t = Math.min(rng.int(5, 6), maxTop - 2);
  for (let y = 1; y <= t; y++) s.set(0, y, 0, log('birch_log'));
  const l = leaves('birch_leaves');
  layer(s, rng, 0, t - 2, 0, 1, l, 0.5);
  layer(s, rng, 0, t - 1, 0, 2, l, 0.0, 0.25);
  layer(s, rng, 0, t, 0, 1, l, 0.7);
  plus(s, 0, t + 1, 0, l);
  s.set(0, 0, 0, blockState('rooted_dirt'));
  return s.piece();
}

/** Small spruce cone (vanilla: 5 + 0–2 trunk, radius 2–3), alternating tiers. */
function spruce(rng: SeededRandom, maxTop: number): NaturePiece {
  const s = new Shape();
  const t = Math.min(rng.int(6, 8), maxTop - 1);
  for (let y = 1; y <= t; y++) s.set(0, y, 0, log('spruce_log'));
  const l = leaves('spruce_leaves');
  s.set(0, t + 1, 0, l);
  const radii = [1, 1, 2, 1, 2, 2, 1, 2];
  for (let i = 0; i < radii.length; i++) {
    const y = t - i;
    if (y < 3) break;
    const r = radii[i]!;
    if (r === 1) plus(s, 0, y, 0, l);
    else layer(s, rng, 0, y, 0, 2, l, 0, 0.15);
  }
  s.set(0, 0, 0, blockState('podzol'));
  return s.piece();
}

/** Azalea tree (vanilla azalea_tree: bent trunk 4–6, flat spread crown r = 3, azalea : flowering 3 : 1). */
function azalea(rng: SeededRandom, maxTop: number, flowering: boolean): NaturePiece {
  const s = new Shape();
  const t = Math.min(rng.int(4, 5), maxTop - 2);
  const [bx, bz] = rng.pick(DIRS);
  // Bent trunk: the upper part leans one block (touching along an edge, like vanilla's bend).
  for (let y = 1; y <= t; y++) s.set(y >= 3 ? bx : 0, y, y >= 3 ? bz : 0, log('oak_log'));
  const pick = () => leaves(flowering && rng.chance(0.25) ? 'flowering_azalea_leaves' : 'azalea_leaves');
  const cx = bx;
  const cz = bz;
  for (let dx = -2; dx <= 2; dx++)
    for (let dz = -2; dz <= 2; dz++) {
      const d = Math.hypot(dx, dz);
      if (d <= 2.3 && rng.chance(0.9)) s.set(cx + dx, t, cz + dz, pick(), true);
      if (d <= 1.5 && rng.chance(0.8)) s.set(cx + dx, t + 1, cz + dz, pick(), true);
      if (d <= 1.2 && d > 0 && rng.chance(0.5)) s.set(cx + dx, t - 1, cz + dz, pick(), true);
    }
  s.set(0, 0, 0, blockState('rooted_dirt'));
  return s.piece();
}

/**
 * Cherry tree after research 11/T16, size S (height 6–7, crown Ø 7–9): short trunk, two or
 * three branches 90–180° apart from 55–70 % of the height, a leaf cushion per branch end
 * with layer radii r−1, r, r, r−1, 25 % holes at corners, hanging leaves under the rim and
 * pink petals in the crown's shadow.
 */
function cherry(rng: SeededRandom, maxTop: number, petals: boolean, compact: boolean): NaturePiece {
  const s = new Shape();
  const trunk = 4;
  for (let y = 1; y <= trunk; y++) s.set(0, y, 0, log('cherry_log'));
  const l = leaves('cherry_leaves');
  const first = rng.int(0, 3);
  const count = rng.chance(0.5) ? 2 : 3;
  const dirs = count === 2 ? [DIRS[first]!, DIRS[(first + 2) % 4]!] : [DIRS[first]!, DIRS[(first + 1) % 4]!, DIRS[(first + 3) % 4]!];
  const pads: [number, number, number][] = [];
  dirs.forEach(([dx, dz], i) => {
    const len = compact ? 1 : i === 0 ? 2 : rng.int(1, 2);
    let x = 0;
    let z = 0;
    let y = trunk;
    for (let k = 1; k <= len; k++) {
      x += dx;
      z += dz;
      if (k === len) y += 1;
      s.set(x, y, z, blockState('cherry_wood', { axis: 'y' }));
    }
    pads.push([x, Math.min(y + 1, maxTop - 2), z]);
  });
  // The trunk continues a little into the crown.
  s.set(0, trunk + 1, 0, log('cherry_log'));
  for (const [px, py, pz] of pads) {
    const r = 2;
    const radii = [r - 1, r, r, r - 1];
    radii.forEach((rr, i) => layer(s, rng, px, py - 1 + i, pz, rr, l, 0.75, i === 0 ? 0.25 : 0));
  }
  const shape = s.piece();
  // Hanging leaves under the lowest rim (1/6, a second one with 1/3).
  const lowest = new Map<string, number>();
  for (const c of shape.cells) if (c.state === l) lowest.set(`${c.x},${c.z}`, Math.min(lowest.get(`${c.x},${c.z}`) ?? Infinity, c.y));
  for (const [key, y] of lowest) {
    const [x, z] = key.split(',').map(Number) as [number, number];
    const edge = DIRS.some(([dx, dz]) => !lowest.has(`${x + dx},${z + dz}`));
    if (!edge || y <= 3 || !rng.chance(1 / 6)) continue;
    s.set(x, y - 1, z, l, true);
    if (y > 4 && rng.chance(1 / 3)) s.set(x, y - 2, z, l, true);
  }
  if (petals) {
    for (const key of lowest.keys()) {
      const [x, z] = key.split(',').map(Number) as [number, number];
      if ((x === 0 && z === 0) || !rng.chance(0.6)) continue;
      s.decor.push({ x, y: 1, z, state: blockState('pink_petals', { flower_amount: String(rng.int(2, 4)), facing: rng.pick(['north', 'east', 'south', 'west'] as const) }) });
    }
  }
  s.set(0, 0, 0, blockState('rooted_dirt'));
  return s.piece();
}

/** Niwaki pine (research 11/T17): trunk 4–6 with an offset, 3–4 flat staggered cushions. */
function pine(rng: SeededRandom, maxTop: number): NaturePiece {
  const s = new Shape();
  const t = Math.min(rng.int(5, 6), maxTop - 1);
  const [ox, oz] = rng.pick(DIRS);
  for (let y = 1; y <= t; y++) s.set(y > 3 ? ox : 0, y, y > 3 ? oz : 0, log('spruce_log'));
  const l = leaves('spruce_leaves');
  // Top cushion over the trunk: flat, wider than high.
  layer(s, rng, ox, t + 1, oz, 1, l, 0.4);
  layer(s, rng, ox, t, oz, 2, l, 0.0, 0.35);
  // Side cushions on short branches, alternating directions and heights (one block thick).
  const sides = rng.shuffle(DIRS.filter(([dx, dz]) => dx !== -ox || dz !== -oz)).slice(0, 2);
  sides.forEach(([dx, dz], i) => {
    const y = t - 2 - i;
    if (y < 3) return;
    const bx = (y > 3 ? ox : 0) + dx;
    const bz = (y > 3 ? oz : 0) + dz;
    s.set(bx, y, bz, log('spruce_log', dx !== 0 ? 'x' : 'z'));
    layer(s, rng, bx, y + 1, bz, 1, l, 0.4);
    for (const [ex, ez] of DIRS) if (ex !== -dx || ez !== -dz) s.set(bx + ex, y, bz + ez, l, true);
  });
  s.set(0, 0, 0, blockState('rooted_dirt'));
  return s.piece();
}

/** Cypress (research 12/M12): spruce trunk, a column of spruce leaves with a narrow cross. */
function cypress(rng: SeededRandom, maxTop: number): NaturePiece {
  const s = new Shape();
  const h = Math.min(rng.int(7, 9), maxTop);
  s.set(0, 1, 0, log('spruce_log'));
  s.set(0, 2, 0, log('spruce_log'));
  const l = leaves('spruce_leaves');
  for (let y = 3; y <= h; y++) s.set(0, y, 0, l);
  const wide = [3, 4, 5].filter((y) => y < h - 1);
  for (const y of wide) for (const [dx, dz] of DIRS) if (y !== 5 || rng.chance(0.5)) s.set(dx, y, dz, l, true);
  for (const [dx, dz] of DIRS) if (rng.chance(0.4)) s.set(dx, 6, dz, l, true);
  return s.piece();
}

/** Olive (research 12/M12): crooked dark trunk, flat open crown in grey pale-oak leaves (azalea leaves in 1.21.1). */
function olive(rng: SeededRandom, maxTop: number, minecraftVersion: string): NaturePiece {
  const s = new Shape();
  const [ox, oz] = rng.pick(DIRS);
  s.set(0, 1, 0, log('dark_oak_log'));
  s.set(0, 2, 0, log('dark_oak_log'));
  s.set(ox, 3, oz, log('dark_oak_log'));
  const id = isAvailableIn('minecraft:pale_oak_leaves', minecraftVersion) ? 'pale_oak_leaves' : 'azalea_leaves';
  const l = leaves(id);
  const top = Math.min(4, maxTop - 1);
  for (let dx = -2; dx <= 2; dx++)
    for (let dz = -2; dz <= 2; dz++) {
      const corner = Math.abs(dx) === 2 && Math.abs(dz) === 2;
      if (!corner && rng.chance(0.78)) s.set(ox + dx, top, oz + dz, l, true);
      if (Math.abs(dx) <= 1 && Math.abs(dz) <= 1 && rng.chance(0.75)) s.set(ox + dx, top + 1, oz + dz, l, true);
    }
  s.set(ox, top, oz, l, true);
  return s.piece();
}

export interface TreeOptions {
  /** Highest y the tree may reach. */
  maxTop: number;
  minecraftVersion: string;
  /** Flowers allowed (no winter/christmas): flowering azalea leaves, cherry petals. */
  blossoms: boolean;
  /** Smaller variant for tight plots (cherry: crown Ø 7 instead of 9). */
  compact?: boolean;
}

export function tree(kind: TreeKind, rng: SeededRandom, o: TreeOptions): NaturePiece {
  switch (kind) {
    case 'oak':
      return oak(rng, o.maxTop);
    case 'birch':
      return birch(rng, o.maxTop);
    case 'spruce':
      return spruce(rng, o.maxTop);
    case 'azalea':
      return azalea(rng, o.maxTop, o.blossoms);
    case 'cherry':
      return cherry(rng, o.maxTop, o.blossoms, o.compact ?? false);
    case 'pine':
      return pine(rng, o.maxTop);
    case 'cypress':
      return cypress(rng, o.maxTop);
    case 'olive':
      return olive(rng, o.maxTop, o.minecraftVersion);
  }
}

/** Bush in three sizes (T12): S one leaf block, M a stem with a 3×3 cushion, L two merged M. */
export function bush(size: 'S' | 'M' | 'L', rng: SeededRandom, mix: readonly (readonly [string, number])[]): NaturePiece {
  const s = new Shape();
  const leaf = () => leaves(rng.weighted(mix));
  if (size === 'S') {
    s.set(0, 1, 0, leaf());
    if (rng.chance(0.5)) s.set(rng.pick([1, -1]), 1, 0, leaf());
    return s.piece();
  }
  const cushion = (cx: number, cz: number) => {
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        const corner = dx !== 0 && dz !== 0;
        if (!corner || rng.chance(0.5)) s.set(cx + dx, 1, cz + dz, leaf(), true);
      }
    s.set(cx, 2, cz, leaf(), true);
    for (const [dx, dz] of DIRS) if (rng.chance(0.5)) s.set(cx + dx, 2, cz + dz, leaf(), true);
  };
  s.set(0, 1, 0, log('oak_log'));
  cushion(0, 0);
  if (size === 'L') {
    const [dx, dz] = rng.pick(DIRS);
    s.set(dx * 2, 1, dz * 2, log('oak_log'));
    cushion(dx * 2, dz * 2);
  }
  return s.piece();
}

/** Rock (T14): a half-buried boulder with stair edges and a slab, or a small stone. */
export function rock(size: 'big' | 'small', rng: SeededRandom, mix: readonly (readonly [string, number])[], shade: boolean): NaturePiece {
  const s = new Shape();
  const pick = () => rng.weighted(mix);
  if (size === 'small') {
    const id = pick();
    s.set(0, 0, 0, blockState(id));
    s.set(0, 1, 0, rng.chance(0.5) ? blockState(`${id}_slab`, { type: 'bottom' }) : blockState(`${id}_stairs`, { facing: rng.pick(['north', 'east', 'south', 'west'] as const) }));
    return s.piece();
  }
  const w = rng.int(2, 3);
  const d = 2;
  const core: [number, number][] = [];
  for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) core.push([x, z]);
  for (const [x, z] of core) s.set(x, 0, z, blockState(pick()));
  // y = 1: full blocks in the middle, stairs facing the middle on the rim (high side inwards).
  const cx = (w - 1) / 2;
  core.forEach(([x, z], i) => {
    const id = pick();
    const rim = rng.chance(0.55) && i !== 0;
    if (!rim) s.set(x, 1, z, blockState(id));
    else {
      const facing: HorizontalDirection = Math.abs(x - cx) >= 0.5 ? (x < cx ? 'east' : 'west') : z === 0 ? 'south' : 'north';
      s.set(x, 1, z, blockState(`${id}_stairs`, { facing }));
    }
  });
  // A slab or moss on top of the first (always full) block.
  s.set(0, 2, 0, shade && rng.chance(0.5) ? blockState('moss_carpet') : blockState(`${pick()}_slab`, { type: 'bottom' }));
  return s.piece();
}

/** Woodpile against a wall (T17, nordic T12, rustic T11): logs end-on, top row shorter. */
export function woodpile(length: number, along: 'x' | 'z', rng: SeededRandom, wood: string): NaturePiece {
  const s = new Shape();
  const axis = along === 'x' ? 'z' : 'x';
  const mix: [string, number][] = [
    [`${wood}_log`, 7],
    [`stripped_${wood}_log`, 2],
    [wood === 'birch' ? 'spruce_log' : 'birch_log', 1],
  ];
  const at = (i: number): [number, number] => (along === 'x' ? [i, 0] : [0, i]);
  for (let i = 0; i < length; i++) {
    const [x, z] = at(i);
    s.set(x, 1, z, log(rng.weighted(mix), axis));
  }
  // Top row one shorter, the gap at a random end.
  const shift = rng.int(0, 1);
  for (let i = 0; i < length - 1; i++) {
    const [x, z] = at(i + shift);
    s.set(x, 2, z, log(rng.weighted(mix), axis));
  }
  return s.piece();
}

/** Hay pile (vanilla pile_hay, ≈ 8 blocks): mixed axes y 50 %, x 25 %, z 25 %. */
export function hayPile(rng: SeededRandom): NaturePiece {
  const s = new Shape();
  const axis = () => rng.weighted([
    ['y', 2],
    ['x', 1],
    ['z', 1],
  ] as const);
  const base: [number, number][] = [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
    [2, 0],
    [-1, 1],
  ];
  for (const [x, z] of base.slice(0, rng.int(4, 6))) s.set(x, 1, z, blockState('hay_block', { axis: axis() }));
  s.set(0, 2, 0, blockState('hay_block', { axis: axis() }));
  if (rng.chance(0.5)) s.set(1, 2, 0, blockState('hay_block', { axis: axis() }));
  return s.piece();
}

/** Barrel group (T17): two or three upright barrels, one stacked. */
export function barrels(rng: SeededRandom): NaturePiece {
  const s = new Shape();
  const up = blockState('barrel', { facing: 'up' });
  s.set(0, 1, 0, up);
  s.set(1, 1, 0, rng.chance(0.3) ? blockState('barrel', { facing: 'east' }) : up);
  if (rng.chance(0.6)) s.set(0, 2, 0, up);
  return s.piece();
}
