import { VECTOR, clockwise, type HorizontalDirection } from '@/core/blocks/directions';
import { blockState, profileBlockId } from '@/core/blocks/registry';
import { snowCanRestOn, strongLightAt } from '@/core/blocks/validator';
import { Priority, type VoxelBuilder } from '@/core/generator/geometry';
import type { SeededRandom } from '@/core/generator/seededRandom';
import type { EaveCell } from '@/core/generator/roof/roofEngine';
import type { Theme } from '@/core/style/styles';

/**
 * Winter / Christmas layer (phase 5). Runs after the building and before the state resolver
 * and validator; places only blocks that hold in the game:
 *
 * - garlands of persistent spruce leaves under the eaves, light blocks *inside* the garland
 *   (froglight / glowstone) and red bows every 4–6 blocks,
 * - lanterns on iron chains under the eaves (chains need no support, the lantern hangs below),
 * - wreaths above doors, lit candles on window sills (sills are upside-down stairs with a full
 *   top), presents (wool cube + carpet),
 * - no snow on roofs and no icicles (user decision); never a lantern or candle on leaves.
 *
 * Intensity 1–3 follows the detail level.
 */

export interface FestiveTargets {
  eaves: readonly EaveCell[];
  doors: readonly { x: number; y: number; z: number; outward: HorizontalDirection; width: number }[];
  sills: readonly { x: number; y: number; z: number }[];
  /** Free ground cells near the entrance for presents and trees (y = first free row). */
  yard: readonly { x: number; y: number; z: number }[];
}

export interface FestiveOptions {
  theme: Theme;
  intensity: 1 | 2 | 3;
  garland: boolean;
  presents: boolean;
  lantern: 'lantern' | 'soul_lantern';
  lanternDensity: 'none' | 'few' | 'normal' | 'many';
  minecraftVersion: string;
}

const PRESENT_COLORS = ['red', 'white', 'lime', 'light_blue', 'yellow', 'green'] as const;

function free(b: VoxelBuilder, x: number, y: number, z: number): boolean {
  return b.inside(x, y, z) && b.isAir(x, y, z);
}

/** Groups eave cells into straight runs (same y, same outward side, adjacent). */
function eaveRuns(eaves: readonly EaveCell[]): EaveCell[][] {
  const byLine = new Map<string, EaveCell[]>();
  for (const c of eaves) {
    const along = c.outward === 'north' || c.outward === 'south' ? 'x' : 'z';
    const key = `${c.outward}|${c.y}|${along === 'x' ? c.z : c.x}`;
    const list = byLine.get(key) ?? [];
    list.push(c);
    byLine.set(key, list);
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

export function decorateFestive(b: VoxelBuilder, rng: SeededRandom, t: FestiveTargets, o: FestiveOptions): void {
  const christmas = o.theme === 'christmas';
  const winter = o.theme === 'winter';
  const leaves = blockState('spruce_leaves', { persistent: 'true' });
  const light = blockState(o.intensity >= 3 ? 'ochre_froglight' : 'glowstone', o.intensity >= 3 ? { axis: 'y' } : {});
  const bow = blockState('red_wool');
  const chain = blockState(profileBlockId('iron_chain', o.minecraftVersion), { axis: 'y' });
  const hanging = blockState(o.lantern, { hanging: 'true' });

  const runs = eaveRuns(t.eaves);
  // The way in stays free: two cells in front of every door, at door height.
  const clearance = new Set<string>();
  for (const d of t.doors) {
    const [ox, , oz] = VECTOR[d.outward];
    const right = VECTOR[clockwise(d.outward, -1)];
    for (let w = 0; w < d.width; w++)
      for (const dist of [1, 2])
        for (const dy of [0, 1]) clearance.add(`${d.x + right[0] * w + ox * dist},${d.y + dy},${d.z + right[2] * w + oz * dist}`);
  }
  const open = (x: number, y: number, z: number) => free(b, x, y, z) && !clearance.has(`${x},${y},${z}`);

  // Garlands along the eaves (Christmas only), with swags at intensity 3.
  if (christmas && o.garland) {
    const r = rng.fork('garland');
    for (const run of runs) {
      if (run.length < 3) continue;
      const bowEvery = r.int(4, 6);
      run.forEach((c, i) => {
        const dip = o.intensity >= 3 && run.length >= 6 && i % 6 >= 2 && i % 6 <= 3 ? 1 : 0;
        const y = c.y - dip;
        if (!open(c.x, y, c.z)) return;
        const state = i % bowEvery === Math.floor(bowEvery / 2) ? bow : (i + 1) % 3 === 0 ? light : leaves;
        b.setBlock(c.x, y, c.z, state, Priority.DECOR);
        if (dip && open(c.x, c.y, c.z)) b.setBlock(c.x, c.y, c.z, leaves, Priority.DECOR);
      });
    }
  }

  // Lanterns on chains under the eaves: corners (few/normal) or every 4 blocks (many).
  if (o.lanternDensity !== 'none' && (christmas || winter || o.lanternDensity !== 'few')) {
    for (const run of runs) {
      if (run.length < 2) continue;
      const every = o.lanternDensity === 'many' ? 4 : o.lanternDensity === 'normal' ? 6 : 100;
      const picks = new Set<number>([0, run.length - 1]);
      for (let i = every; i < run.length - 1; i += every) picks.add(i);
      for (const i of picks) {
        const c = run[i]!;
        // Garland cells are taken: hang the lantern one block further out is not possible
        // (no support), so the chain starts below the garland if there is one.
        let y = c.y;
        while (y > 1 && !free(b, c.x, y, c.z)) y--;
        if (!open(c.x, y, c.z) || !open(c.x, y - 1, c.z) || !free(b, c.x, y - 2, c.z) || clearance.has(`${c.x},${y - 2},${c.z}`)) continue;
        const above = b.getBlock(c.x, y + 1, c.z);
        if (above.includes('_leaves')) continue; // lanterns never hang from leaves
        b.setBlock(c.x, y, c.z, chain, Priority.DECOR);
        b.setBlock(c.x, y - 1, c.z, hanging, Priority.DECOR);
      }
    }
  }

  // Wreath above each door (Christmas): leaves ring with a red bow in the middle.
  if (christmas) {
    for (const d of t.doors) {
      const [ox, , oz] = VECTOR[d.outward];
      const right = VECTOR[clockwise(d.outward, -1)];
      const yTop = d.y + 2;
      const cx = d.x + ox;
      const cz = d.z + oz;
      for (let i = -1; i <= d.width; i++) {
        const x = cx + right[0] * i;
        const z = cz + right[2] * i;
        if (!free(b, x, yTop, z)) continue;
        const middle = i === Math.floor((d.width - 1) / 2);
        b.setBlock(x, yTop, z, middle ? bow : leaves, Priority.DECOR);
      }
    }
  }

  // Candles on sills: red/white (Christmas) or white (winter), lit.
  if ((christmas || winter) && o.intensity >= 2) {
    const r = rng.fork('candles');
    for (const s of t.sills) {
      if (!free(b, s.x, s.y + 1, s.z) || !r.chance(o.intensity >= 3 ? 0.8 : 0.5)) continue;
      const color = christmas ? r.pick(['red_candle', 'white_candle'] as const) : 'white_candle';
      b.setBlock(s.x, s.y + 1, s.z, blockState(color, { candles: String(r.int(1, 3)), lit: 'true' }), Priority.DECOR);
    }
  }

  // Presents in the yard near the entrance.
  if (christmas && o.presents) {
    const r = rng.fork('presents');
    const cells = r.shuffle(t.yard).slice(0, 2 + o.intensity);
    for (const c of cells) {
      if (!open(c.x, c.y, c.z) || !open(c.x, c.y + 1, c.z)) continue;
      const color = r.pick(PRESENT_COLORS);
      const ribbon = r.pick(PRESENT_COLORS.filter((x) => x !== color));
      b.setBlock(c.x, c.y, c.z, blockState(`${color}_wool`), Priority.DECOR);
      b.setBlock(c.x, c.y + 1, c.z, blockState(`${ribbon}_carpet`), Priority.DECOR);
    }
  }
}

/**
 * Snow cover on explicit request only (user decision): one snow layer on every topmost block
 * that can carry it in the game – a full top face (ridge blocks, flat roofs, upside-down
 * stairs, top slabs, leaves), not next to a light that would melt it. Sloped stair roofs
 * stay mostly bare: a stair's upper face is not full, so vanilla snow would not stay there.
 */
export function addSnowCover(b: VoxelBuilder): number {
  const { width: W, height: H, length: L } = b.dimensions;
  const get = (x: number, y: number, z: number) => (b.inside(x, y, z) ? b.getBlock(x, y, z) : 'minecraft:air');
  const snow = blockState('snow', { layers: '1' });
  let placed = 0;
  for (let x = 0; x < W; x++)
    for (let z = 0; z < L; z++) {
      let y = H - 2;
      while (y > 0 && b.isAir(x, y, z)) y--;
      if (y <= 0) continue;
      if (!snowCanRestOn(b.getBlock(x, y, z)) || strongLightAt(get, x, y + 1, z) >= 12) continue;
      if (b.setBlock(x, y + 1, z, snow, Priority.DECOR)) placed++;
    }
  return placed;
}
