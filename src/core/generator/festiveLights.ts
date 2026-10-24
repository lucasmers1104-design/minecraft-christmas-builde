import { VECTOR, clockwise, type HorizontalDirection } from '@/core/blocks/directions';
import { supportsCenter } from '@/core/blocks/faces';
import { AIR, blockIdOf, blockState, definitionOf, propsOf } from '@/core/blocks/registry';
import { Priority, type VoxelBuilder } from '@/core/generator/geometry';
import type { SeededRandom } from '@/core/generator/seededRandom';
import type { EaveCell, RoofResult, RoofSectionSpec } from '@/core/generator/roof/roofEngine';
import type { Cell } from '@/core/generator/festiveProps';
import type { SizeClass, StyleId } from '@/core/style/styles';

/**
 * Colourful string lights and mini firs (Profi-Builds phase 4, reference 19365618 "Hollyridge
 * Lodge"; research 14/18). Everything holds in the game without tricks:
 *
 * - **String lights** are lit candles (light 3, snow-safe), every second cell, colours cycling
 *   like a real light chain. Under eaves and verges a candle stands on a closed top trapdoor
 *   directly below the roof edge (a candle needs centre support; leaves and bottom slabs give
 *   none); on the ridge it stands on the ridge block (a slab cap becomes a double slab under
 *   the light). Detail level 2
 *   lights the front eave, level 3 every eave run of five or more, the verges and the ridge.
 * - **Mini firs** (persistent spruce leaves on a hidden light – shroomlight, with snow a waxed
 *   exposed copper bulb whose light 12 melts no snow beside it): a pair flanking the way to the
 *   door and, on level 3, groups of large–medium–small at the front corners (the festive
 *   forecourt).
 */

/** Candle colours of the light chain per style; null: the style has its own lights. */
export const STRING_LIGHTS: Readonly<Record<StyleId, readonly string[] | null>> = {
  rustic: ['red_candle', 'yellow_candle', 'lime_candle', 'blue_candle', 'orange_candle'],
  fantasy: ['purple_candle', 'yellow_candle', 'cyan_candle', 'pink_candle'],
  mediterranean: ['orange_candle', 'yellow_candle', 'white_candle'],
  nordic: ['white_candle', 'red_candle'],
  medieval: ['candle', 'red_candle'],
  // Lanterns under the eaves (Japanese) and the parapet lights (modern) take this part.
  japanese: null,
  cherry: null,
  modern: null,
};

/** Styles with mini firs at the forecourt (Japanese: kadomatsu; mediterranean: farolitos). */
const MINI_FIRS: ReadonlySet<StyleId> = new Set(['rustic', 'fantasy', 'nordic', 'medieval', 'modern']);
/** Mini firs per size class on detail level 3 (the pair at the door included). */
const FIR_COUNT: Readonly<Record<SizeClass, number>> = { small: 2, medium: 3, large: 4, huge: 6 };

const key = (x: number, y: number, z: number) => `${x},${y},${z}`;

export interface RoofLine extends Cell {
  outward: HorizontalDirection;
}

/**
 * Verge cells (first free cell under the verge board, per step of the slope) and ridge cells
 * (free cell on top of a ridge block) of the gable sections; towers, tiers and dormers excluded.
 */
export function roofLines(b: VoxelBuilder, sections: readonly RoofSectionSpec[], roof: RoofResult): { verges: RoofLine[]; ridges: Cell[] } {
  const verges: RoofLine[] = [];
  const ridges: Cell[] = [];
  const free = (x: number, y: number, z: number) => b.inside(x, y, z) && b.isAir(x, y, z);
  for (const s of sections) {
    if (s.id.includes('-tier') || s.id.startsWith('dormer') || s.id.startsWith('tower') || s.type === 'flat') continue;
    const oh = s.overhang;
    const gableSides = new Set(roof.gableCells.filter((g) => g.section === s.id).map((g) => g.side));
    const ends: [HorizontalDirection, number][] =
      s.ridgeAxis === 'x'
        ? [
            ['west', s.x0 - oh],
            ['east', s.x1 + oh],
          ]
        : [
            ['north', s.z0 - oh],
            ['south', s.z1 + oh],
          ];
    for (const [side, line] of ends) {
      if (!gableSides.has(side)) continue;
      const [a0, a1] = s.ridgeAxis === 'x' ? [s.z0 - oh, s.z1 + oh] : [s.x0 - oh, s.x1 + oh];
      for (let a = a0; a <= a1; a++) {
        const [x, z] = s.ridgeAxis === 'x' ? [line, a] : [a, line];
        const h = roof.surface.get(`${x},${z}`);
        if (h === undefined) continue;
        for (let y = h - 1; y >= h - 3; y--)
          if (free(x, y, z)) {
            if (!free(x, y + 1, z)) verges.push({ x, y, z, outward: side });
            break;
          }
      }
    }
    if (roof.ridgeY[s.id] === undefined) continue;
    const mids = s.ridgeAxis === 'x' ? [Math.floor((s.z0 + s.z1) / 2), Math.ceil((s.z0 + s.z1) / 2)] : [Math.floor((s.x0 + s.x1) / 2), Math.ceil((s.x0 + s.x1) / 2)];
    const [r0, r1] = s.ridgeAxis === 'x' ? [s.x0 - oh, s.x1 + oh] : [s.z0 - oh, s.z1 + oh];
    for (const m of new Set(mids))
      for (let r = r0; r <= r1; r++) {
        const [x, z] = s.ridgeAxis === 'x' ? [r, m] : [m, r];
        // The ridge line is the local top across the roof (raised verge tips and sags included).
        const top = roof.surface.get(`${x},${z}`);
        const [ax, az] = s.ridgeAxis === 'x' ? [0, 1] : [1, 0];
        if (top === undefined || !b.inside(x, top + 1, z) || !free(x, top + 1, z)) continue;
        if ([-1, 1].some((k) => (roof.surface.get(`${x + ax * k},${z + az * k}`) ?? -1) > top)) continue;
        const cap = b.getBlock(x, top, z);
        // A slab cap gives no centre support: there the light stands on a double slab.
        if (supportsCenter(cap, 'up') || (definitionOf(cap).shape === 'slab' && propsOf(cap).type === 'bottom')) ridges.push({ x, y: top + 1, z });
      }
  }
  return { verges, ridges };
}

export interface StringLightTargets {
  /** Eave runs without garland. */
  runs: readonly EaveCell[][];
  verges: readonly RoofLine[];
  ridges: readonly Cell[];
  style: StyleId;
  intensity: 1 | 2 | 3;
  /** Free and outside every door clearance. */
  open: (x: number, y: number, z: number) => boolean;
  /** A window, door or shutter right behind the cell. */
  opensBehind: (c: EaveCell, y: number) => boolean;
}

/** Places the light chains; returns the eave runs that got lights (no extra lanterns there). */
export function placeStringLights(b: VoxelBuilder, rng: SeededRandom, t: StringLightTargets): Set<EaveCell[]> {
  const lit = new Set<EaveCell[]>();
  const colours = STRING_LIGHTS[t.style];
  if (!colours || t.intensity < 2) return lit;
  const ledge = (outward: HorizontalDirection) => blockState('spruce_trapdoor', { facing: outward, half: 'top', open: 'false' });
  let n = rng.int(0, colours.length - 1);
  const candle = () => blockState(colours[n++ % colours.length]!, { candles: '1', lit: 'true' });
  const taken = new Set<string>();
  const hang = (c: EaveCell): boolean => {
    if (taken.has(key(c.x, c.y, c.z)) || !t.open(c.x, c.y, c.z) || !t.open(c.x, c.y - 1, c.z) || c.y - 1 < 1) return false;
    if (t.opensBehind(c, c.y) || t.opensBehind(c, c.y - 1)) return false;
    // Never under leaves (a garland of another run right above).
    if (b.inside(c.x, c.y + 1, c.z) && blockIdOf(b.getBlock(c.x, c.y + 1, c.z)).endsWith('_leaves')) return false;
    b.setBlock(c.x, c.y - 1, c.z, ledge(c.outward), Priority.DECOR);
    b.setBlock(c.x, c.y, c.z, candle(), Priority.DECOR);
    taken.add(key(c.x, c.y, c.z));
    return true;
  };
  // Level 2: the front eave (or the two longest free runs), level 3: every run of five or more.
  const front = t.runs.filter((r) => r[0]!.outward === 'north' && r.length >= 3);
  const runs = t.intensity >= 3 ? t.runs.filter((r) => r.length >= 5 || front.includes(r)) : front.length > 0 ? front : [...t.runs].filter((r) => r.length >= 3).sort((p, q) => q.length - p.length).slice(0, 2);
  for (const run of runs) {
    let any = false;
    run.forEach((c, i) => {
      if (i % 2 === 0 && hang(c)) any = true;
    });
    if (any) lit.add(run);
  }
  if (t.intensity < 3) return lit;
  // Verges: every second step of the slope, from the eave up.
  const byVerge = new Map<string, RoofLine[]>();
  for (const v of t.verges) {
    const k = `${v.outward}|${v.outward === 'east' || v.outward === 'west' ? v.x : v.z}`;
    byVerge.set(k, [...(byVerge.get(k) ?? []), v]);
  }
  for (const line of byVerge.values()) {
    const along = line[0]!.outward === 'east' || line[0]!.outward === 'west' ? 'z' : 'x';
    line.sort((p, q) => p[along] - q[along]);
    line.forEach((v, i) => {
      if (i % 2 === 0) hang(v);
    });
  }
  // Ridge: a candle on every second supporting ridge block.
  const ridges = [...t.ridges].sort((p, q) => p.x - q.x || p.z - q.z);
  ridges.forEach((r, i) => {
    if (i % 2 !== 0 || !t.open(r.x, r.y, r.z) || taken.has(key(r.x, r.y, r.z))) return;
    const cap = b.getBlock(r.x, r.y - 1, r.z);
    if (!supportsCenter(cap, 'up')) b.setBlock(r.x, r.y - 1, r.z, blockState(blockIdOf(cap), { ...propsOf(cap), type: 'double' }), Priority.ROOF);
    b.setBlock(r.x, r.y, r.z, candle(), Priority.DECOR);
    taken.add(key(r.x, r.y, r.z));
  });
  return lit;
}

/** Leaf cells of a mini fir relative to its base (y = 1 is the ground row). */
function firCells(size: 'S' | 'M' | 'L', rng: SeededRandom): { leaves: [number, number, number][]; light: [number, number, number] | null; trunk: [number, number, number][]; height: number } {
  const leaves: [number, number, number][] = [];
  const plus = (y: number) => leaves.push([0, y, 0], [1, y, 0], [-1, y, 0], [0, y, 1], [0, y, -1]);
  const square = (y: number, corners: boolean) => {
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        const corner = dx !== 0 && dz !== 0;
        if (!corner || corners || rng.chance(0.5)) leaves.push([dx, y, dz]);
      }
  };
  if (size === 'S') {
    plus(1);
    leaves.push([0, 2, 0]);
    return { leaves, light: null, trunk: [], height: 2 };
  }
  if (size === 'M') {
    square(2, false);
    plus(3);
    leaves.push([0, 4, 0], [0, 5, 0]);
    return { leaves, light: [0, 1, 0], trunk: [], height: 5 };
  }
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) if (Math.abs(dx) + Math.abs(dz) <= 2 && !(dx === 0 && dz === 0)) leaves.push([dx, 2, dz]);
  plus(3);
  square(4, true);
  plus(5);
  leaves.push([0, 6, 0], [0, 7, 0]);
  // The large fir stands on a short trunk; the light sits in the lowest ring.
  return { leaves, light: [0, 2, 0], trunk: [[0, 1, 0]], height: 7 };
}

export interface MiniFirTargets {
  door: { x: number; y: number; z: number; outward: HorizontalDirection; width: number } | undefined;
  /** Front corners of the house (ground cells just outside the plinth). */
  corners: readonly Cell[];
  size: SizeClass;
  style: StyleId;
  intensity: 1 | 2 | 3;
  snow: boolean;
  open: (x: number, y: number, z: number) => boolean;
  /** Free lawn of the landscape (never a path or a bed). */
  lawn: (x: number, z: number) => boolean;
}

/** Mini firs flanking the way to the door and at the front corners; returns how many stand. */
export function placeMiniFirs(b: VoxelBuilder, rng: SeededRandom, t: MiniFirTargets): number {
  if (!MINI_FIRS.has(t.style) || t.intensity < 2 || !t.door) return 0;
  const leaf = blockState('spruce_leaves', { persistent: 'true' });
  const light = t.snow ? blockState('waxed_exposed_copper_bulb', { lit: 'true' }) : blockState('shroomlight');
  const solidBelow = (x: number, z: number) => t.lawn(x, z) && b.inside(x, 0, z) && !b.isAir(x, 0, z) && supportsCenter(b.getBlock(x, 0, z), 'up');
  // Medium and large firs keep their distance (two cells beyond the crown) to the house, lamps
  // and trees, so they frame the front instead of hiding a window; low plants do not count.
  const crowded = (x: number, z: number, reach: number, top: number) => {
    for (let dx = -reach; dx <= reach; dx++)
      for (let dz = -reach; dz <= reach; dz++)
        for (let y = 1; y <= top; y++) {
          if (!b.inside(x + dx, y, z + dz)) continue;
          const s = b.getBlock(x + dx, y, z + dz);
          if (s === AIR) continue;
          const shape = definitionOf(s).shape;
          if (y <= 2 && (shape === 'plant' || shape === 'tall_plant' || shape === 'petals' || shape === 'carpet')) continue;
          return true;
        }
    return false;
  };
  const tryFir = (x: number, z: number, size: 'S' | 'M' | 'L', r: SeededRandom): boolean => {
    const f = firCells(size, r);
    const cells = [...f.leaves, ...f.trunk, ...(f.light ? [f.light] : [])];
    if (!solidBelow(x, z) || cells.some(([dx, dy, dz]) => !t.open(x + dx, dy, z + dz))) return false;
    // Every leaf of the lowest row stands on lawn (never on the path or over the plot edge).
    if (cells.some(([dx, dy, dz]) => dy === 1 && !solidBelow(x + dx, z + dz))) return false;
    if (size !== 'S' && crowded(x, z, (size === 'L' ? 2 : 1) + 2, f.height + 1)) return false;
    for (const [dx, dy, dz] of f.leaves) b.setBlock(x + dx, dy, z + dz, leaf, Priority.DECOR);
    if (f.light) b.setBlock(x + f.light[0], f.light[1], z + f.light[2], light, Priority.DECOR);
    for (const [dx, dy, dz] of f.trunk) b.setBlock(x + dx, dy, z + dz, blockState('spruce_log', { axis: 'y' }), Priority.DECOR);
    return true;
  };
  let placed = 0;
  // The pair at the door: mirrored, two to four cells beside the door axis, one or two out.
  const d = t.door;
  const [ox, , oz] = VECTOR[d.outward];
  const [rx, , rz] = VECTOR[clockwise(d.outward, -1)];
  const mid = (d.width - 1) / 2;
  pair: for (const dist of [2, 3, 1])
    for (const off of [3, 4, 2]) {
      const spots = [-1, 1].map((s) => [Math.round(d.x + rx * (mid + s * off) + ox * dist), Math.round(d.z + rz * (mid + s * off) + oz * dist)] as const);
      const r = rng.fork(`pair${dist},${off}`);
      const okBoth = spots.every(([x, z]) => {
        const f = firCells('S', r.fork('probe'));
        return solidBelow(x, z) && f.leaves.every(([dx, dy, dz]) => t.open(x + dx, dy, z + dz) && (dy !== 1 || solidBelow(x + dx, z + dz)));
      });
      if (!okBoth) continue;
      for (const [x, z] of spots) if (tryFir(x, z, 'S', r)) placed++;
      break pair;
    }
  if (t.intensity < 3) return placed;
  // Front corners: large, medium, small stepping away from the corner.
  const want = FIR_COUNT[t.size];
  const order: ('L' | 'M' | 'S')[] = ['L', 'M', 'S'];
  for (const [ci, c] of t.corners.entries()) {
    for (const size of order) {
      if (placed >= want) return placed;
      const r = rng.fork(`corner${ci}${size}`);
      const reach = size === 'L' ? 3 : 2;
      let done = false;
      for (let ring = reach; ring <= reach + 4 && !done; ring++)
        for (let dx = -ring; dx <= ring && !done; dx++)
          for (let dz = -ring; dz <= ring && !done; dz++) {
            if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
            if (tryFir(c.x + dx, c.z + dz, size, r)) {
              placed++;
              done = true;
            }
          }
    }
  }
  return placed;
}
