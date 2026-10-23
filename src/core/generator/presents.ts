import { blockIdOf, blockState } from '@/core/blocks/registry';
import { Priority, type VoxelBuilder } from '@/core/generator/geometry';
import type { SeededRandom } from '@/core/generator/seededRandom';
import type { PresentKit } from '@/core/generator/festiveKits';

/**
 * Presents (research 2026-10, report 14 P1–P3 and report 17 A7): always in groups of 3–5 under
 * a tree or beside an entrance, never scattered across the yard. Sizes are mixed:
 *
 * - P1 small 1×1×1: paper block with a ribbon carpet on top,
 * - tall 1×1×2 and long 2×1×1 (ribbon carpet on top),
 * - P2 big 3×3×2 with a ribbon band across sides and lid and an unlit candle bow on top
 *   (only where there is room, e.g. in front of big trees),
 * - P3: a small present offset on top of a long or big one (never higher than three blocks).
 *
 * Paper and ribbon colours come from the style kit (muted, at most three papers and two
 * ribbons per scene); neighbouring presents never share the paper, so a group never melts
 * into one block. Big presents stand outside, small ones inside and on top.
 */

export interface PresentSpot {
  x: number;
  /** First free row (the present's bottom block). */
  y: number;
  z: number;
  /** Free rows from y upwards. */
  headroom: number;
}

export interface PresentGroupOptions {
  /** Number of presents in this group. */
  size: number;
  /** A big 3×3×2 present may start the group. */
  big: boolean;
  /** Small presents may sit on top of long and big ones. */
  stack: boolean;
}

type Piece = 'big' | 'long' | 'tall' | 'small';

const k2 = (x: number, z: number) => `${x},${z}`;
const STEPS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/** Dye colour of a paper block ("red_wool" → "red"), or null for barrels, copper … */
function dyeOf(paper: string): string | null {
  const m = /^(white|orange|magenta|light_blue|yellow|lime|pink|gray|light_gray|cyan|purple|blue|brown|green|red|black)_/.exec(paper);
  return m ? m[1]! : null;
}

function paperState(paper: string): string {
  return paper === 'barrel' ? blockState('barrel', { facing: 'up' }) : blockState(paper);
}

/**
 * Places one group of presents, grown from the free spot closest to `start`. Occupied spots
 * are removed from `spots`. Returns the number of presents placed.
 */
export function placePresentGroup(b: VoxelBuilder, rng: SeededRandom, spots: Map<string, PresentSpot>, start: { x: number; z: number }, kit: PresentKit, o: PresentGroupOptions): number {
  const r = rng;
  const papers = kit.papers;
  const ribbonFor = (paper: string) => {
    const options = kit.ribbons.filter((c) => c !== dyeOf(paper));
    return r.pick(options.length > 0 ? options : ['white']);
  };
  const free = (x: number, z: number, rows: number, y?: number) => {
    const s = spots.get(k2(x, z));
    return !!s && s.headroom >= rows && (y === undefined || s.y === y);
  };
  // Paper of each occupied column (neighbours get a different one).
  const paperAt = new Map<string, string>();
  const choosePaper = (cells: readonly (readonly [number, number])[]) => {
    const near = new Set<string>();
    for (const [x, z] of cells) for (const [dx, dz] of STEPS) near.add(paperAt.get(k2(x + dx, z + dz)) ?? '');
    const options = papers.filter((p) => !near.has(p));
    return r.pick(options.length > 0 ? options : papers);
  };
  const take = (x: number, z: number, paper: string) => {
    spots.delete(k2(x, z));
    paperAt.set(k2(x, z), paper);
  };
  const set = (x: number, y: number, z: number, state: string) => b.setBlock(x, y, z, state, Priority.DECOR);

  // Candidate spots by distance to the start (deterministic order).
  const order = () =>
    [...spots.values()].sort((p, q) => Math.hypot(p.x - start.x, p.z - start.z) - Math.hypot(q.x - start.x, q.z - start.z) || p.x - q.x || p.z - q.z);
  const groupCells: [number, number][] = [];
  const touchesGroup = (x: number, z: number) => groupCells.length === 0 || groupCells.some(([gx, gz]) => Math.max(Math.abs(gx - x), Math.abs(gz - z)) <= 1);

  let placed = 0;
  const tops: { x: number; y: number; z: number; piece: Piece }[] = [];
  for (let n = 0; n < o.size; n++) {
    const candidates = order().filter((s) => touchesGroup(s.x, s.z));
    let done = false;
    for (const s of candidates) {
      // A group needs room to grow: the first present starts next to another free spot.
      if (n === 0 && o.size >= 2 && !STEPS.some(([dx, dz]) => free(s.x + dx, s.z + dz, 2, s.y))) continue;
      const pieces: Piece[] = [];
      if (n === 0 && o.big) pieces.push('big');
      if (r.chance(0.3)) pieces.push('long');
      if (r.chance(0.25)) pieces.push('tall');
      pieces.push('small');
      for (const piece of pieces) {
        if (piece === 'big') {
          // Big present: 3×3 around s, all spots free with headroom 3, same ground level.
          const cells: [number, number][] = [];
          for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) cells.push([s.x + dx, s.z + dz]);
          if (!cells.every(([x, z]) => free(x, z, 3, s.y))) continue;
          const paper = choosePaper(cells);
          const ribbon = ribbonFor(paper);
          const band = blockState(`${ribbon}_wool`);
          for (const [x, z] of cells) {
            const onBand = x === s.x || z === s.z;
            for (const dy of [0, 1]) set(x, s.y + dy, z, onBand ? band : paperState(paper));
            take(x, z, paper);
            groupCells.push([x, z]);
          }
          set(s.x, s.y + 2, s.z, blockState(`${ribbon}_candle`, { candles: '4', lit: 'false' }));
          tops.push({ x: s.x, y: s.y + 2, z: s.z, piece });
        } else if (piece === 'long') {
          const dirs = r.shuffle(STEPS);
          const dir = dirs.find(([dx, dz]) => free(s.x, s.z, 2) && free(s.x + dx, s.z + dz, 2, s.y) && touchesGroup(s.x + dx, s.z + dz));
          if (!dir) continue;
          const cells: [number, number][] = [
            [s.x, s.z],
            [s.x + dir[0], s.z + dir[1]],
          ];
          const paper = choosePaper(cells);
          const ribbon = blockState(`${ribbonFor(paper)}_carpet`);
          for (const [x, z] of cells) {
            set(x, s.y, z, paperState(paper));
            set(x, s.y + 1, z, ribbon);
            take(x, z, paper);
            groupCells.push([x, z]);
          }
          tops.push({ x: s.x, y: s.y + 1, z: s.z, piece });
        } else if (piece === 'tall') {
          if (!free(s.x, s.z, 3)) continue;
          const paper = choosePaper([[s.x, s.z]]);
          set(s.x, s.y, s.z, paperState(paper));
          set(s.x, s.y + 1, s.z, paperState(paper));
          set(s.x, s.y + 2, s.z, blockState(`${ribbonFor(paper)}_carpet`));
          take(s.x, s.z, paper);
          groupCells.push([s.x, s.z]);
        } else {
          if (!free(s.x, s.z, 2)) continue;
          const paper = choosePaper([[s.x, s.z]]);
          set(s.x, s.y, s.z, paperState(paper));
          set(s.x, s.y + 1, s.z, blockState(`${ribbonFor(paper)}_carpet`));
          take(s.x, s.z, paper);
          groupCells.push([s.x, s.z]);
        }
        placed++;
        done = true;
        break;
      }
      if (done) break;
    }
    if (!done) break;
  }

  // P3: one small present offset on top of a long or big present (replaces its ribbon carpet).
  if (o.stack) {
    for (const t of tops) {
      if (t.piece === 'big' || !r.chance(0.5)) continue;
      const below = b.getBlock(t.x, t.y, t.z);
      if (!blockIdOf(below).endsWith('_carpet') || !b.inside(t.x, t.y + 1, t.z) || !b.isAir(t.x, t.y + 1, t.z)) continue;
      const base = b.getBlock(t.x, t.y - 1, t.z);
      const paper = papers.find((p) => paperState(p) !== base) ?? papers[0]!;
      set(t.x, t.y, t.z, paperState(paper));
      set(t.x, t.y + 1, t.z, blockState(`${ribbonFor(paper)}_carpet`));
      break;
    }
  }
  return placed;
}

export interface TreePresentOptions {
  /** Total number of presents (report 14: clamp(round(1.2·R), 2, 12)). */
  count: number;
  big: boolean;
  stack: boolean;
}

/**
 * Presents in groups of 3–5 around a tree: every other group under the lowest tier
 * (r ≈ 0.6·R), the others directly in front of the crown (r ≈ R + 1.5), where big ones fit.
 */
export function presentsAroundTree(
  b: VoxelBuilder,
  rng: SeededRandom,
  tree: { bottomRadius: number; under: readonly PresentSpot[] },
  cx: number,
  y0: number,
  cz: number,
  kit: PresentKit,
  o: TreePresentOptions,
): number {
  const R = tree.bottomRadius;
  const spots = new Map<string, PresentSpot>();
  for (const s of tree.under) spots.set(k2(s.x, s.z), s);
  for (let dx = -R - 4; dx <= R + 4; dx++)
    for (let dz = -R - 4; dz <= R + 4; dz++) {
      const d = Math.hypot(dx, dz);
      if (d <= R + 0.5 || d > R + 3.5) continue;
      const s = spotAt(b, cx + dx, y0, cz + dz, 3);
      if (s) spots.set(k2(s.x, s.z), s);
    }
  // Groups of 3–5 (two for very few presents), sizes fixed up front so no present is left alone.
  const groups = Math.max(1, Math.min(3, Math.round(o.count / 4)));
  const sizes = Array.from({ length: groups }, (_, g) => Math.floor(o.count / groups) + (g < o.count % groups ? 1 : 0));
  const base = rng.next() * 2 * Math.PI;
  let placed = 0;
  for (let g = 0; g < groups; g++) {
    const size = sizes[g]!;
    const angle = base + (g * 2 * Math.PI) / groups;
    const under = g % 2 === 0 && R >= 3;
    const dist = under ? Math.max(1.5, 0.6 * R) : R + 1.5;
    const start = { x: Math.round(cx + Math.cos(angle) * dist), z: Math.round(cz + Math.sin(angle) * dist) };
    placed += placePresentGroup(b, rng.fork(`group${g}`), spots, start, kit, { size, big: o.big && !under, stack: o.stack && !under });
  }
  return placed;
}

/** Spot helper: free column at (x, z) standing on a solid block at y − 1, up to `maxRows`. */
export function spotAt(b: VoxelBuilder, x: number, y: number, z: number, maxRows: number, blocked?: (x: number, y: number, z: number) => boolean): PresentSpot | null {
  if (!b.inside(x, y, z) || y < 1 || b.isAir(x, y - 1, z)) return null;
  let headroom = 0;
  while (headroom < maxRows && b.inside(x, y + headroom, z) && b.isAir(x, y + headroom, z) && !blocked?.(x, y + headroom, z)) headroom++;
  return headroom >= 2 ? { x, y, z, headroom } : null;
}
