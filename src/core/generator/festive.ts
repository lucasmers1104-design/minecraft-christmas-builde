import { OPPOSITE, VECTOR, clockwise, isHorizontal, type HorizontalDirection } from '@/core/blocks/directions';
import { isFaceFull, supportsCenter } from '@/core/blocks/faces';
import { AIR, blockState, definitionOf, profileBlockId, propsOf } from '@/core/blocks/registry';
import { snowCanRestOn, strongLightAt } from '@/core/blocks/validator';
import { Priority, type VoxelBuilder } from '@/core/generator/geometry';
import type { SeededRandom } from '@/core/generator/seededRandom';
import type { EaveCell, RoofResult } from '@/core/generator/roof/roofEngine';
import { festiveKit, leavesFor, type FestiveKit } from '@/core/generator/festiveKits';
import { buildCandyCane, buildFarolito, buildJulenek, buildKadomatsu, buildShimekazari, isPlainWall, standingY, type Cell } from '@/core/generator/festiveProps';
import { placePresentGroup, type PresentSpot } from '@/core/generator/presents';
import { placeStringLights, STRING_LIGHTS, type RoofLine } from '@/core/generator/festiveLights';
import { circle } from '@/core/geometry';
import type { SizeClass, StyleId, Theme } from '@/core/style/styles';

/**
 * Winter / Christmas layer (research 2026-10, report 14 GA1/GA2, K1/K2, L1, P1–P3, report 18
 * recommendation 7, style reports 08/10/11/12). Runs after the building and before the state
 * resolver and validator; places only blocks that hold in the game.
 *
 * - **Garlands (GA1, GA2, 02 P11):** persistent leaves in the eave cells. Anchors at the run
 *   ends, above the door axis and every ~6 cells; a bow only at anchors (style kit), between
 *   anchors the garland really sags one row (no leaves above the sagging cells). Light is
 *   sparse and hidden: a light block one cell behind the garland (towards the wall, under the
 *   roof) every 4–6 cells – never in the outer eave cell – or, where the overhang is too
 *   shallow or the kit says so, lanterns on chains at the anchors. With snow: no light blocks.
 * - **Lanterns on chains** under eaves without garland light (never in the same run).
 * - **Wreaths (K1, K2):** a ring with a hollow centre on a window-free wall beside or above
 *   the entrance (never in the door clearance), and a thin 5×5 ring in a gable from medium
 *   size on another facade (one main motif per facade).
 * - **Candles (L1, 18 E7):** per facade one colour and one count, on mirrored pairs of sills.
 * - **Presents** at the entrance: one group beside the steps, outside the clearance.
 * - **Door extras** of the kits: kadomatsu pair and shimekazari (japanese, cherry), julenek
 *   (nordic), farolitos along the path (mediterranean).
 * - **Light chains (Profi-Builds phase 4):** coloured candles along eaves, verges and ridges
 *   (festiveLights.ts).
 * - No snow on roofs and no icicles of any kind (user decision); never a lantern or candle
 *   on leaves. Intensity 1–3 follows the detail level.
 */

export interface FestiveDoor {
  x: number;
  y: number;
  z: number;
  outward: HorizontalDirection;
  width: number;
}

export interface FestiveTargets {
  eaves: readonly EaveCell[];
  doors: readonly FestiveDoor[];
  /** Blocks a candle can stand on in front of a window (template sills or plinth tops). */
  sills: readonly (Cell & { side?: HorizontalDirection })[];
  /** Free ground cells near the entrance (kept for callers; presents now go beside the door). */
  yard: readonly Cell[];
  /** Gable infill cells (houses): the gable wreath goes there. */
  gables?: RoofResult['gableCells'];
  /** Cells that must stay free (door clearance of the openings). */
  reserved?: ReadonlySet<string>;
  /** Verge and ridge cells of the gable roofs (light chains, festiveLights.ts). */
  verges?: readonly RoofLine[];
  ridges?: readonly Cell[];
}

export interface FestiveOptions {
  theme: Theme;
  intensity: 1 | 2 | 3;
  garland: boolean;
  presents: boolean;
  lantern: 'lantern' | 'soul_lantern';
  lanternDensity: 'none' | 'few' | 'normal' | 'many';
  minecraftVersion: string;
  /** Style kit (default: rustic). */
  style?: StyleId;
  /** Snow on request: no light blocks in garlands. */
  snow?: boolean;
  /** Size class of the building (gable wreath from medium). */
  size?: SizeClass;
  /** Presents beside the entrance (default 2 + 1 at intensity 3 when `presents`). */
  entrancePresents?: number;
}

const key = (x: number, y: number, z: number) => `${x},${y},${z}`;

function free(b: VoxelBuilder, x: number, y: number, z: number): boolean {
  return b.inside(x, y, z) && b.isAir(x, y, z);
}

/** Groups eave cells into straight runs (same y, same outward side, adjacent). */
function eaveRuns(eaves: readonly EaveCell[]): EaveCell[][] {
  const byLine = new Map<string, EaveCell[]>();
  for (const c of eaves) {
    const along = c.outward === 'north' || c.outward === 'south' ? 'x' : 'z';
    const k = `${c.outward}|${c.y}|${along === 'x' ? c.z : c.x}`;
    const list = byLine.get(k) ?? [];
    list.push(c);
    byLine.set(k, list);
  }
  const runs: EaveCell[][] = [];
  for (const list of byLine.values()) {
    const along = list[0]!.outward === 'north' || list[0]!.outward === 'south' ? 'x' : 'z';
    list.sort((a, b) => (along === 'x' ? a.x - b.x : a.z - b.z));
    let run: EaveCell[] = [];
    for (const c of list) {
      const prev = run.at(-1);
      if (prev && (along === 'x' ? c.x - prev.x : c.z - prev.z) !== 1) {
        runs.push(run);
        run = [];
      }
      run.push(c);
    }
    if (run.length > 0) runs.push(run);
  }
  return runs;
}

/** Leftmost-to-right direction along a facade seen from outside. */
function rightOf(outward: HorizontalDirection): readonly [number, number, number] {
  return VECTOR[clockwise(outward, -1)];
}

/** Anchor indices of a run: ends, door axes and evenly spaced points about every 6 cells. */
function anchorsOf(run: readonly EaveCell[], doorAxes: readonly number[]): Set<number> {
  const n = run.length;
  const anchors = new Set<number>([0, n - 1]);
  const segments = Math.max(1, Math.round((n - 1) / 6));
  for (let i = 1; i < segments; i++) anchors.add(Math.round((i * (n - 1)) / segments));
  for (const a of doorAxes) {
    if (a <= 0 || a >= n - 1) continue;
    for (const k of [...anchors]) if (k !== 0 && k !== n - 1 && Math.abs(k - a) <= 2) anchors.delete(k);
    anchors.add(a);
  }
  return anchors;
}

/** True if the cell or the cells towards the wall show a window, door or shutter. */
function opensBehind(b: VoxelBuilder, c: EaveCell, y: number): boolean {
  const [ox, , oz] = VECTOR[c.outward];
  for (let d = 0; d <= 3; d++) {
    const x = c.x - ox * d;
    const z = c.z - oz * d;
    if (!b.inside(x, y, z)) continue;
    const s = b.getBlock(x, y, z);
    if (s === AIR) continue;
    const def = definitionOf(s);
    if (def.id.includes('glass') || def.id.includes('bars') || def.shape === 'trapdoor' || def.shape === 'door') return true;
  }
  return false;
}

export function decorateFestive(b: VoxelBuilder, rng: SeededRandom, t: FestiveTargets, o: FestiveOptions): void {
  const christmas = o.theme === 'christmas';
  const winter = o.theme === 'winter';
  if (!christmas && !winter) return;
  const kit = festiveKit(o.style);
  const extras = kit.extras[christmas ? 'christmas' : 'winter'];
  const leaves = blockState(leavesFor(kit.garlandLeaves, o.minecraftVersion), { persistent: 'true' });
  const chain = blockState(profileBlockId('iron_chain', o.minecraftVersion), { axis: 'y' });
  const hanging = blockState(o.lantern, { hanging: 'true' });
  const doors = t.doors;

  // The way in stays free: two cells in front of every door at door height (plus the
  // openings' own reserved cells).
  const clearance = new Set<string>(t.reserved ?? []);
  for (const d of doors) {
    const [ox, , oz] = VECTOR[d.outward];
    const right = rightOf(d.outward);
    for (let w = 0; w < d.width; w++)
      for (const dist of [1, 2])
        for (const dy of [0, 1]) clearance.add(key(d.x + right[0] * w + ox * dist, d.y + dy, d.z + right[2] * w + oz * dist));
  }
  const open = (x: number, y: number, z: number) => free(b, x, y, z) && !clearance.has(key(x, y, z));
  const put = (x: number, y: number, z: number, state: string) => b.setBlock(x, y, z, state, Priority.DECOR);

  // ------------------------------------------------------------------------------------
  // Ground at the entrance first (kadomatsu, julenek, farolitos, presents), then the wall
  // motifs, so eave lanterns and candles never take their place.
  const mainDoor = doors[0];
  if (christmas && o.intensity >= 2 && extras.includes('kadomatsu') && mainDoor) placeKadomatsu(b, mainDoor, open);
  if (christmas && extras.includes('julenek') && mainDoor) placeJulenek(b, mainDoor, open);
  if (christmas && extras.includes('candyCanes') && mainDoor) placeCandyCanes(b, mainDoor, open);
  if (christmas && extras.includes('farolitos') && mainDoor) placeFarolitos(b, mainDoor, open, kit.candles.christmas[0] ?? 'white_candle');
  // Presents: one group beside the main entrance, outside the clearance.
  const count = Math.min(kit.maxPresents, o.entrancePresents ?? (o.presents ? 2 + (o.intensity >= 3 ? 1 : 0) : 0));
  if (christmas && mainDoor && count > 0) placeEntrancePresents(b, rng.fork('presents'), mainDoor, kit, count, clearance);
  // Wall motifs (christmas): wreaths, or the kit's new-year rope.
  const motifFacades = new Set<HorizontalDirection>();
  if (christmas && o.intensity >= 2) {
    const wreathDoors = o.intensity >= 3 ? doors : doors.slice(0, 1);
    // The eave row belongs to the garland: a wreath hangs below it, never in it.
    const eaveRow = new Set(t.eaves.map((c) => key(c.x, c.y, c.z)));
    const wreathOpen = (x: number, y: number, z: number) => open(x, y, z) && !eaveRow.has(key(x, y, z)) && !eaveRow.has(key(x, y + 1, z));
    if (kit.wreath) for (const d of wreathDoors) if (placeDoorWreath(b, d, kit, leaves, wreathOpen)) motifFacades.add(d.outward);
    if (extras.includes('shimekazari')) for (const d of doors.slice(0, 1)) placeShimekazari(b, d, open);
    if (kit.wreath && o.intensity >= 3 && o.size !== 'small' && t.gables) placeGableWreath(b, t.gables, motifFacades, kit, leaves, open);
  }

  // ------------------------------------------------------------------------------------
  // Garlands and lanterns under the eaves.
  const runs = eaveRuns(t.eaves);
  const lit = new Set<EaveCell[]>(); // runs with garland light: no extra lanterns there
  const garlanded = new Set<EaveCell[]>();
  // Styles with a light chain keep the garland at the entrance, the chain runs along the rest.
  const chains = christmas && STRING_LIGHTS[o.style ?? 'rustic'] !== null;
  if (christmas && o.garland && o.intensity >= 2) {
    const front = runs.filter((r) => r[0]!.outward === 'north' && r.length >= 3);
    const longest = [...runs].sort((p, q) => q.length - p.length).slice(0, 2);
    const chosen =
      kit.garlandFrontOnly || o.intensity === 2 || chains
        ? front.length > 0
          ? front
          : longest.filter((r) => r.length >= 3)
        : runs.filter((r) => r.length >= 5 || (r[0]!.outward === 'north' && r.length >= 3));
    const gr = rng.fork('garland');
    for (const run of chosen) {
      garlanded.add(run);
      const outward = run[0]!.outward;
      const [ox, , oz] = VECTOR[outward];
      const alongX = outward === 'north' || outward === 'south';
      const doorAxes = doors
        .filter((d) => d.outward === outward)
        .map((d) => {
          const right = rightOf(d.outward);
          const mid = (d.width - 1) / 2;
          const ax = Math.round(d.x + right[0] * mid);
          const az = Math.round(d.z + right[2] * mid);
          return run.findIndex((c) => (alongX ? c.x === ax : c.z === az));
        })
        .filter((i) => i >= 0);
      const anchors = anchorsOf(run, doorAxes);
      // Deep overhang: the cell behind the garland is free and under the roof.
      const deep = run.filter((c) => free(b, c.x - ox, c.y, c.z - oz) && !free(b, c.x - ox, c.y + 1, c.z - oz)).length >= run.length * 0.7;
      const lanternMode = kit.garlandLight === 'lantern' || (!deep && o.lanternDensity !== 'none' && kit.hangingLanterns);
      const sorted = [...anchors].sort((p, q) => p - q);
      // Sag (GA2): between two anchors at least 5 apart, the inner cells hang one row lower.
      const sag = new Set<number>();
      if (o.intensity >= 3) {
        for (let k = 0; k + 1 < sorted.length; k++) {
          const a = sorted[k]!;
          const z = sorted[k + 1]!;
          if (z - a < 5) continue;
          const cells: number[] = [];
          for (let i = a + 2; i <= z - 2; i++) cells.push(i);
          const ok = cells.every((i) => {
            const c = run[i]!;
            return open(c.x, c.y - 1, c.z) && !opensBehind(b, c, c.y - 1) && !clearance.has(key(c.x, c.y, c.z));
          });
          if (ok) for (const i of cells) sag.add(i);
        }
      }
      let sinceLight = gr.int(1, 3);
      const lightEvery = gr.int(4, 6);
      let lights = 0;
      run.forEach((c, i) => {
        if (anchors.has(i) && lanternMode) {
          // Lantern on a chain at the anchor (the chain needs no support).
          if (open(c.x, c.y, c.z) && open(c.x, c.y - 1, c.z) && free(b, c.x, c.y - 2, c.z) && !clearance.has(key(c.x, c.y - 2, c.z))) {
            put(c.x, c.y, c.z, chain);
            put(c.x, c.y - 1, c.z, hanging);
            return;
          }
        }
        const y = sag.has(i) ? c.y - 1 : c.y;
        if (!open(c.x, y, c.z)) return;
        // Two eaves above each other (annex or porch under the main eave): one garland only.
        const leafAt = (yy: number) => b.inside(c.x, yy, c.z) && b.getBlock(c.x, yy, c.z).includes('_leaves[');
        if (leafAt(y - 1) || leafAt(y + 1)) return;
        const bow = anchors.has(i) && !lanternMode && kit.bow ? blockState(kit.bow) : null;
        put(c.x, y, c.z, bow ?? leaves);
        // Hidden light behind the garland (not in the outer eave cell, not at bows or sags).
        sinceLight++;
        if (!lanternMode && !o.snow && deep && !bow && !sag.has(i) && sinceLight >= lightEvery) {
          const lx = c.x - ox;
          const lz = c.z - oz;
          if (open(lx, c.y, lz)) {
            const light = kit.garlandLight === 'lantern' ? 'shroomlight' : kit.garlandLight;
            put(lx, c.y, lz, blockState(light, light.endsWith('froglight') ? { axis: 'y' } : {}));
            sinceLight = 0;
            lights++;
          }
        }
      });
      if (lights > 0 || lanternMode) lit.add(run);
    }
  }

  // Colourful light chains (christmas): eaves without garland; level 3 also verges and ridges.
  if (christmas) {
    const strung = placeStringLights(b, rng.fork('stringLights'), { runs: runs.filter((r) => !garlanded.has(r)), verges: t.verges ?? [], ridges: t.ridges ?? [], style: o.style ?? 'rustic', intensity: o.intensity, open, opensBehind: (c, y) => opensBehind(b, c, y) });
    for (const run of strung) lit.add(run);
  }

  // Lanterns on chains under the remaining eaves: corners, every 6 (normal) or 4 (many).
  const eaveLanterns = extras.includes('eaveLanterns');
  if (kit.hangingLanterns && o.lanternDensity !== 'none' && (eaveLanterns || o.lanternDensity !== 'few' || christmas || winter)) {
    for (const run of runs) {
      if (run.length < 2 || lit.has(run)) continue;
      const every = eaveLanterns || o.lanternDensity === 'many' ? 4 : o.lanternDensity === 'normal' ? 6 : 100;
      const picks = new Set<number>([0, run.length - 1]);
      for (let i = every; i < run.length - 1; i += every) picks.add(i);
      for (const i of picks) {
        const c = run[i]!;
        // At most two cells below the eave cell (never down into a window reveal or a doorway).
        let y = c.y;
        while (y > Math.max(1, c.y - 2) && !free(b, c.x, y, c.z)) y--;
        if (!open(c.x, y, c.z) || !open(c.x, y - 1, c.z) || !free(b, c.x, y - 2, c.z) || clearance.has(key(c.x, y - 2, c.z))) continue;
        const above = b.getBlock(c.x, y + 1, c.z);
        if (above.includes('_leaves')) continue; // lanterns never hang from leaves
        put(c.x, y, c.z, chain);
        put(c.x, y - 1, c.z, hanging);
      }
    }
  }


  // ------------------------------------------------------------------------------------
  // Candles on sills: one colour and one count per facade, on mirrored pairs (L1, 18 E7).
  if (o.intensity >= 2) {
    const colours = kit.candles[christmas ? 'christmas' : 'winter'];
    const byFacade = new Map<string, { side: HorizontalDirection; sills: Cell[] }>();
    const seen = new Set<string>();
    for (const s of t.sills) {
      if (!b.inside(s.x, s.y, s.z) || seen.has(key(s.x, s.y, s.z))) continue;
      seen.add(key(s.x, s.y, s.z));
      // Template sills are upside-down stairs facing the wall; other sills name their side.
      const facing = propsOf(b.getBlock(s.x, s.y, s.z)).facing;
      const side = s.side ?? (facing && isHorizontal(facing) ? (OPPOSITE[facing] as HorizontalDirection) : null);
      if (!side) continue;
      const plane = side === 'north' || side === 'south' ? s.z : s.x;
      const k = `${side}|${plane}|${s.y}`;
      const entry = byFacade.get(k) ?? { side, sills: [] };
      entry.sills.push(s);
      byFacade.set(k, entry);
    }
    const share = o.intensity >= 3 ? 0.7 : 0.4;
    for (const [k, { side, sills }] of [...byFacade.entries()].sort(([p], [q]) => (p < q ? -1 : 1))) {
      const cr = rng.fork(`candles:${side}`);
      const colour = side === 'north' ? colours[0]! : cr.pick(colours);
      const count = String(cr.weighted([[1, 1], [2, 3], [3, 2]] as const));
      const along = side === 'north' || side === 'south' ? 'x' : 'z';
      const sorted = [...sills].sort((p, q) => p[along] - q[along]);
      const pick = new Set<number>();
      const pr = rng.fork(`candlePairs:${k}`);
      for (let i = 0; i <= (sorted.length - 1) / 2; i++) {
        if (!kit.candlesEverywhere && !pr.chance(share)) continue;
        pick.add(i);
        pick.add(sorted.length - 1 - i);
      }
      for (const i of pick) {
        const s = sorted[i]!;
        const sill = b.getBlock(s.x, s.y, s.z);
        if (!free(b, s.x, s.y + 1, s.z) || !supportsCenter(sill, 'up')) continue;
        put(s.x, s.y + 1, s.z, blockState(colour, { candles: count, lit: 'true' }));
      }
    }
  }

}

type Open = (x: number, y: number, z: number) => boolean;

/** Facade helper for a door: world cell at (u along the facade, d out, dy up) from the door's leftmost cell. */
function doorFrame(d: FestiveDoor) {
  const [ox, , oz] = VECTOR[d.outward];
  const right = rightOf(d.outward);
  return (u: number, dist: number, dy: number): Cell => ({ x: d.x + right[0] * u + ox * dist, y: d.y + dy, z: d.z + right[2] * u + oz * dist });
}

/** Block a wreath can hang in front of: wall or frame, no window, opening, light or greenery. */
function wallish(state: string): boolean {
  if (state === AIR) return false;
  const def = definitionOf(state);
  if (def.shape !== 'cube' && def.shape !== 'pillar' && def.shape !== 'stairs' && def.shape !== 'slab') return false;
  return def.light === 0 && !def.id.includes('glass') && !def.id.includes('leaves');
}

/** First block behind `c` (towards the wall, up to `depth` cells): wall-ish, or null. */
function backing(b: VoxelBuilder, c: Cell, inward: readonly [number, number], depth: number): string | null {
  for (let k = 1; k <= depth; k++) {
    const x = c.x + inward[0] * k;
    const z = c.z + inward[1] * k;
    if (!b.inside(x, c.y, z)) return null;
    const s = b.getBlock(x, c.y, z);
    if (s === AIR) continue;
    return wallish(s) ? s : null;
  }
  return null;
}

interface RingCell {
  at: Cell;
  /** null: hollow (the wall must show through). */
  state: string | null;
}

/** Places the ring if every cell is free and backed by wall (hollow cells by plain wall). */
function tryRing(b: VoxelBuilder, cells: readonly RingCell[], inward: readonly [number, number], depth: number, open: Open): boolean {
  for (const { at, state } of cells) {
    if (!open(at.x, at.y, at.z)) return false;
    const back = backing(b, at, inward, depth);
    if (!back || (state === null && !isPlainWall(back))) return false;
  }
  for (const { at, state } of cells) if (state) b.setBlock(at.x, at.y, at.z, state, Priority.DECOR);
  return true;
}

/**
 * K1: a 3×3 ring of leaves with a hollow centre and the bow at the bottom, in front of a
 * window-free wall near the door: directly above it if possible, else beside it at door
 * height, else as close as possible on the same facade. The ring may hang in front of a
 * timber frame or a jetty (backed within two blocks). Returns true if a place was found.
 */
function placeDoorWreath(b: VoxelBuilder, d: FestiveDoor, kit: FestiveKit, leaves: string, open: Open): boolean {
  const at = doorFrame(d);
  const [ox, , oz] = VECTOR[d.outward];
  const inward = [-ox, -oz] as const;
  const mid = (d.width - 1) / 2;
  const candidates: { uc: number; yc: number; dr: number; score: number }[] = [];
  for (let uc = -8; uc <= d.width + 7; uc++)
    for (let yc = 1; yc <= 8; yc++)
      for (const dr of [1, 2, 3]) {
        const above = Math.abs(uc - mid) < 1 && yc >= 3;
        const beside = Math.abs(uc - mid) >= mid + 2;
        if (!above && !beside) continue;
        candidates.push({ uc, yc, dr, score: Math.abs(uc - mid) + 1.5 * Math.abs(yc - (above ? 3 : 1)) + (dr - 1) * 0.75 - (above ? 1 : 0) });
      }
  candidates.sort((p, q) => p.score - q.score || p.uc - q.uc || p.yc - q.yc || p.dr - q.dr);
  const bow = kit.wreathBow ? blockState(kit.wreathBow) : leaves;
  for (const { uc, yc, dr } of candidates) {
    const cells: RingCell[] = [];
    for (let dy = -1; dy <= 1; dy++)
      for (let du = -1; du <= 1; du++) cells.push({ at: at(uc + du, dr, yc + dy), state: du === 0 && dy === 0 ? null : du === 0 && dy === -1 ? bow : leaves });
    if (tryRing(b, cells, inward, dr, open)) return true;
  }
  return false;
}

/**
 * K2: a thin 5×5 ring (12 cells) with two berries at the top and the bow at the bottom, in
 * front of a gable on a facade that has no main motif yet.
 */
function placeGableWreath(b: VoxelBuilder, gables: NonNullable<FestiveTargets['gables']>, taken: Set<HorizontalDirection>, kit: FestiveKit, leaves: string, open: Open): void {
  const ring = circle(5, 'thin');
  const groups = new Map<string, typeof gables>();
  for (const g of gables) {
    const k = `${g.section}|${g.side}`;
    groups.set(k, [...(groups.get(k) ?? []), g]);
  }
  const order: HorizontalDirection[] = ['north', 'east', 'west', 'south'];
  const sorted = [...groups.values()].sort((p, q) => order.indexOf(p[0]!.side) - order.indexOf(q[0]!.side) || q.length - p.length);
  const bow = kit.wreathBow ? blockState(kit.wreathBow) : leaves;
  const berry = blockState('red_terracotta');
  for (const cells of sorted) {
    const side = cells[0]!.side;
    if (taken.has(side)) continue;
    const [ox, , oz] = VECTOR[side];
    const right = rightOf(side);
    const alongX = side === 'north' || side === 'south';
    const ys = cells.map((c) => c.y);
    const us = cells.map((c) => (alongX ? c.x : c.z));
    const midY = (Math.min(...ys) + Math.max(...ys)) / 2;
    const midU = (Math.min(...us) + Math.max(...us)) / 2;
    const centres = [...cells].sort((p, q) => Math.hypot((alongX ? p.x : p.z) - midU, p.y - midY) - Math.hypot((alongX ? q.x : q.z) - midU, q.y - midY));
    for (const c of centres.slice(0, 16)) {
      const ringCells: RingCell[] = [];
      for (let j = 0; j < 5; j++)
        for (let i = 0; i < 5; i++) {
          const atCell = { x: c.x + right[0] * (i - 2) + ox, y: c.y + (2 - j), z: c.z + right[2] * (i - 2) + oz };
          const onRing = ring.has(i, j);
          const inside = i >= 1 && i <= 3 && j >= 1 && j <= 3;
          if (!onRing && !inside) continue;
          // Berries hang inside the ring at the top; the rest of the inside stays hollow.
          const inner = j === 1 && (i === 1 || i === 3) ? berry : null;
          ringCells.push({ at: atCell, state: !onRing ? inner : j === 4 && i === 2 ? bow : leaves });
        }
      if (!tryRing(b, ringCells, [-ox, -oz], 1, open)) continue;
      taken.add(side);
      return;
    }
  }
}

/** Shimekazari: straw rope above the door (d = +1), one cell wider than the door on each side. */
function placeShimekazari(b: VoxelBuilder, d: FestiveDoor, open: Open): void {
  const at = doorFrame(d);
  // Directly above the door, or above a door canopy; always against something behind it.
  for (const dy of [2, 3, 4])
    for (const dist of [1, 2]) {
      const cells: Cell[] = [];
      for (let u = -1; u <= d.width; u++) cells.push(at(u, dist, dy));
      const backed = cells.every((c, i) => {
        const back = at(i - 1, dist - 1, dy);
        return b.inside(back.x, back.y, back.z) && !b.isAir(back.x, back.y, back.z);
      });
      if (!backed || !cells.every((c) => open(c.x, c.y, c.z))) continue;
      buildShimekazari(b, cells, d.outward === 'north' || d.outward === 'south' ? 'x' : 'z');
      return;
    }
}

/** Mirrored pair of standing spots beside the door (lateral offset, distance out), or null. */
function mirroredSpots(b: VoxelBuilder, d: FestiveDoor, open: Open, rows: number, offsets: readonly number[], dists: readonly number[], footprint = 1): { left: Cell[]; right: Cell[] } | null {
  const at = doorFrame(d);
  for (const dist of dists)
    for (const off of offsets) {
      const sides: Cell[][] = [];
      for (const s of [-1, 1] as const) {
        const cells: Cell[] = [];
        for (let k = 0; k < footprint; k++) {
          const u = s < 0 ? -off - k : d.width - 1 + off + k;
          const c = at(u, dist, 0);
          const y = standingY(b, c.x, c.z, d.y);
          if (y === null) break;
          let fine = true;
          for (let dy = 0; dy < rows; dy++) if (!open(c.x, y + dy, c.z)) fine = false;
          if (!fine) break;
          cells.push({ x: c.x, y, z: c.z });
        }
        if (cells.length < footprint || cells.some((c) => c.y !== cells[0]!.y)) break;
        sides.push(cells);
      }
      if (sides.length === 2 && sides[0]![0]!.y === sides[1]![0]!.y) return { left: sides[0]!, right: sides[1]! };
    }
  return null;
}

/** Kadomatsu pair beside the entrance (two columns, the taller one outside; one column where tight). */
function placeKadomatsu(b: VoxelBuilder, d: FestiveDoor, open: Open): void {
  const wide = mirroredSpots(b, d, open, 4, [2, 3, 4], [1, 2, 3], 2);
  if (wide) {
    buildKadomatsu(b, wide.left[0]!, wide.left[1]!);
    buildKadomatsu(b, wide.right[0]!, wide.right[1]!);
    return;
  }
  const narrow = mirroredSpots(b, d, open, 4, [2, 3, 4], [1, 2, 3], 1);
  if (!narrow) return;
  buildKadomatsu(b, null, narrow.left[0]!);
  buildKadomatsu(b, null, narrow.right[0]!);
}

/** Julenek beside the path in front of the entrance. */
function placeJulenek(b: VoxelBuilder, d: FestiveDoor, open: Open): void {
  const at = doorFrame(d);
  for (const dist of [3, 4, 5, 2, 6])
    for (const u of [-3, d.width + 2, -4, d.width + 3, -5, d.width + 4]) {
      const c = at(u, dist, 0);
      const y = standingY(b, c.x, c.z, d.y);
      if (y === null || ![0, 1, 2, 3].every((dy) => open(c.x, y + dy, c.z))) continue;
      // Not next to another fence or post (it would connect into a railing).
      const lonely = [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dz]) => free(b, c.x + dx!, y, c.z + dz!) && free(b, c.x + dx!, y + 1, c.z + dz!));
      if (!lonely) continue;
      buildJulenek(b, { x: c.x, y, z: c.z });
      return;
    }
}

/** Candy canes: a mirrored pair beside the path, 3–5 blocks in front of the door, hooks inwards. */
function placeCandyCanes(b: VoxelBuilder, d: FestiveDoor, open: Open): void {
  const at = doorFrame(d);
  const right = rightOf(d.outward);
  for (const dist of [4, 5, 3])
    for (const off of [2, 3]) {
      const spots: { foot: Cell; hook: [number, number] }[] = [];
      for (const s of [-1, 1] as const) {
        const u = s < 0 ? -off : d.width - 1 + off;
        const c = at(u, dist, 0);
        // Hook towards the door axis (the path).
        const hook: [number, number] = [right[0] * -s, right[2] * -s];
        const y = standingY(b, c.x, c.z, d.y);
        if (y === null) break;
        const cells = [0, 1, 2, 3].map((dy) => [c.x, y + dy, c.z] as const).concat([[c.x + hook[0], y + 3, c.z + hook[1]], [c.x + hook[0], y + 2, c.z + hook[1]]]);
        if (!cells.every(([x, yy, z]) => open(x, yy, z))) break;
        spots.push({ foot: { x: c.x, y, z: c.z }, hook });
      }
      if (spots.length < 2 || spots[0]!.foot.y !== spots[1]!.foot.y) continue;
      for (const sp of spots) buildCandyCane(b, sp.foot, sp.hook);
      return;
    }
}

/**
 * Farolitos (12 i): two candles on every second grass cell on both sides of the path, from
 * the door outwards, mirrored.
 */
function placeFarolitos(b: VoxelBuilder, d: FestiveDoor, open: Open, colour: string): void {
  const [ox, , oz] = VECTOR[d.outward];
  const right = rightOf(d.outward);
  const mid = (d.width - 1) / 2;
  const cx = d.x + right[0] * mid;
  const cz = d.z + right[2] * mid;
  const grass = blockState('grass_block');
  for (let dist = 3; dist < 40; dist += 2) {
    const px = Math.round(cx + ox * dist);
    const pz = Math.round(cz + oz * dist);
    if (!b.inside(px, 1, pz)) break;
    // Walk sideways from the path centre to the first grass cell on each side.
    for (const s of [-1, 1]) {
      for (let w = 1; w <= 4; w++) {
        const x = Math.round(px + right[0] * w * s);
        const z = Math.round(pz + right[2] * w * s);
        if (!b.inside(x, 1, z)) break;
        const ground = b.getBlock(x, 0, z);
        if (ground === grass) {
          if (open(x, 1, z) && isFaceFull(ground, 'up')) buildFarolito(b, { x, y: 1, z }, colour);
          break;
        }
        if (!free(b, x, 1, z)) break;
      }
    }
  }
}

/** One group of presents beside the entrance (side with more room), outside the clearance. */
function placeEntrancePresents(b: VoxelBuilder, rng: SeededRandom, d: FestiveDoor, kit: FestiveKit, count: number, clearance: ReadonlySet<string>): void {
  const at = doorFrame(d);
  const sides: Map<string, PresentSpot>[] = [];
  for (const s of [-1, 1]) {
    const spots = new Map<string, PresentSpot>();
    for (let dist = 1; dist <= 4; dist++)
      for (let k = 2; k <= 4; k++) {
        const u = s < 0 ? -k : d.width - 1 + k;
        const c = at(u, dist, 0);
        const y = standingY(b, c.x, c.z, d.y);
        if (y === null) continue;
        let headroom = 0;
        while (headroom < 3 && free(b, c.x, y + headroom, c.z) && !clearance.has(key(c.x, y + headroom, c.z))) headroom++;
        if (headroom >= 2) spots.set(`${c.x},${c.z}`, { x: c.x, y, z: c.z, headroom });
      }
    sides.push(spots);
  }
  const spots = sides[0]!.size >= sides[1]!.size ? sides[0]! : sides[1]!;
  const left = spots === sides[0];
  const start = at(left ? -2 : d.width + 1, 1, 0);
  // Same ground level as the nearest spot only (no presents on steps of different heights).
  const first = [...spots.values()].sort((p, q) => Math.hypot(p.x - start.x, p.z - start.z) - Math.hypot(q.x - start.x, q.z - start.z))[0];
  if (!first) return;
  for (const [k, s] of spots) if (s.y !== first.y) spots.delete(k);
  placePresentGroup(b, rng, spots, start, kit.present, { size: count, big: false, stack: false });
}

/**
 * Snow cover on explicit request only (user decision): one snow layer on every topmost block
 * that can carry it in the game – a full top face (ridge blocks, flat roofs, upside-down
 * stairs, top slabs, leaves), not next to a light that would melt it. Sloped stair roofs
 * stay mostly bare: a stair's upper face is not full, so vanilla snow would not stay there.
 */
export function addSnowCover(b: VoxelBuilder, clear: ReadonlySet<string> = new Set(), ground = 0): number {
  const { width: W, height: H, length: L } = b.dimensions;
  const get = (x: number, y: number, z: number) => (b.inside(x, y, z) ? b.getBlock(x, y, z) : 'minecraft:air');
  const snow = blockState('snow', { layers: '1' });
  let placed = 0;
  for (let x = 0; x < W; x++)
    for (let z = 0; z < L; z++) {
      let y = H - 2;
      while (y > 0 && b.isAir(x, y, z)) y--;
      // The ground too, except the cleared paths.
      if (b.isAir(x, y, z) || (y === ground && clear.has(`${x},${z}`))) continue;
      if (!snowCanRestOn(b.getBlock(x, y, z)) || strongLightAt(get, x, y + 1, z) >= 12) continue;
      if (b.setBlock(x, y + 1, z, snow, Priority.DECOR)) placed++;
    }
  return placed;
}
