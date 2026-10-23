import { blockState } from '@/core/blocks/registry';
import type { SeededRandom } from '@/core/generator/seededRandom';
import { valueNoise } from '@/core/generator/seededRandom';
import { clusteredAssign, frontLine, pickBy, cellHash, Use, type PlotFrame, type Site } from '@/core/generator/landscapeSite';
import type { BorderKind, LandscapeStyle, Mix } from '@/core/generator/landscapeStyles';
import type { LandscapeMaterials } from '@/core/generator/landscapeMaterials';

/**
 * Plot borders instead of a ring hedge (research 15, T8/T9 and recommendation 7): the border
 * stands at least two blocks inside the model edge, covers at most 75 % of the perimeter
 * (front plus one or two sides – a front garden, an L or just the front with short returns),
 * and opens with a gate on the main path. Per style it is a mixed hedge with bumps, a hedge
 * on an earth bank, a wooden fence with log posts every 4–6, a nordic gärdsgård, a dry stone
 * wall with a cap, a masonry wall, a garden wall with pots, a bamboo fence or – for modern –
 * single box-hedge cubes. Posts are one higher than the fence and stand at corners and gates.
 */

export const BORDER_INSET = 2;

type End = 'gate' | 'corner' | 'open' | 'joined';

interface Segment {
  kind: BorderKind;
  cells: [number, number][];
  ends: [End, End];
  /** Side runs of cherry get a low bamboo fence. */
  low: boolean;
}

export interface BorderResult {
  /** All columns with border elements. */
  cells: [number, number][];
  /** Columns beside the gate (posts or lamp). */
  gatePosts: [number, number][];
}

export interface GateInfo {
  /** Path cells on the front border line. */
  cells: [number, number][];
  /** Posts beside the gate already taken by a lamp post. */
  lampPosts: [number, number][];
}

export function buildBorder(
  site: Site,
  frame: PlotFrame,
  ls: LandscapeStyle,
  m: LandscapeMaterials,
  gate: GateInfo,
  o: { flowers: boolean },
  rng: SeededRandom,
): BorderResult {
  const result: BorderResult = { cells: [], gatePosts: [] };
  const { front, sides } = ls.border;
  if (front === 'none' && sides === 'none') return result;
  const vb = BORDER_INSET;
  const u0 = BORDER_INSET;
  const u1 = frame.Wu - 1 - BORDER_INSET;
  // Front line of the building in plot coordinates.
  const vh = frontLine(site, frame);

  const usable = (u: number, v: number) => {
    const [x, z] = frame.toWorld(u, v);
    return site.inside(x, z) && site.owned[site.i(x, z)] === 1 && site.use[site.i(x, z)] === Use.FREE && site.distBuilt[site.i(x, z)]! >= 2;
  };
  const gateKeys = new Set(gate.cells.map(([x, z]) => `${x},${z}`));
  const lampKeys = new Set(gate.lampPosts.map(([x, z]) => `${x},${z}`));

  // Side runs (mode chosen per building): front garden, L or front with short returns.
  const mode = front === 'boxHedge' ? 'front' : rng.weighted([
    ['vorgarten', 3],
    ['L', 2],
    ['front', 1],
  ] as const);
  const longSide = rng.chance(0.5) ? 0 : 1;
  const sideEnd = (which: 0 | 1) => (mode === 'front' ? vb + 2 : mode === 'L' && which === longSide ? frame.Lv - 1 - BORDER_INSET : vh);
  const sideRuns: [number, number][][] = [[], []];
  if (sides !== 'none')
    ([0, 1] as const).forEach((which) => {
      const u = which === 0 ? u0 : u1;
      for (let v = vb + 1; v <= sideEnd(which); v++) {
        if (!usable(u, v)) break;
        sideRuns[which]!.push(frame.toWorld(u, v));
      }
    });
  // At most 75 % of the inset perimeter (research T8).
  const perimeter = 2 * (u1 - u0 + 1) + 2 * (frame.Lv - 2 * BORDER_INSET - 1);
  const frontLength = u1 - u0 + 1;
  while (frontLength + sideRuns[0]!.length + sideRuns[1]!.length > 0.75 * perimeter) {
    const longer = sideRuns[0]!.length >= sideRuns[1]!.length ? 0 : 1;
    sideRuns[longer]!.pop();
  }

  // Front segments, split at the gate (path cells) and at lamp posts beside it.
  const segments: Segment[] = [];
  if (front !== 'none') {
    let current: [number, number][] = [];
    let startEnd: End = sideRuns[0]!.length > 0 ? 'corner' : 'open';
    const flush = (end: End) => {
      if (current.length > 0) segments.push({ kind: front, cells: current, ends: [startEnd, end], low: false });
      current = [];
    };
    for (let u = u0; u <= u1; u++) {
      const [x, z] = frame.toWorld(u, vb);
      const k = `${x},${z}`;
      if (gateKeys.has(k) || lampKeys.has(k)) {
        flush('gate');
        startEnd = 'gate';
        continue;
      }
      if (!usable(u, vb)) {
        flush('open');
        startEnd = 'open';
        continue;
      }
      current.push([x, z]);
    }
    flush(sideRuns[1]!.length > 0 ? 'corner' : 'open');
  }
  for (const run of sideRuns) if (run.length > 0) segments.push({ kind: sides, cells: run, ends: [front !== 'none' ? 'joined' : 'open', 'open'], low: ls.border.sides === 'bambooFence' && ls.border.front !== 'bambooFence' });

  const seed = rng.fork('borderNoise').int(0, 2 ** 31 - 1);
  for (const seg of segments) placeSegment(site, seg, ls, m, o, rng.fork(`seg${seg.cells[0]![0]},${seg.cells[0]![1]}`), seed, result);

  // Gate: fence gates on narrow gates of fence and wall borders, an open gap in hedges.
  if (front !== 'none' && front !== 'boxHedge' && gate.cells.length > 0) placeGate(site, frame, ls, m, gate, o, rng.fork('gate'), result);
  return result;
}

function hedgeHeights(base: number[], exact: boolean, openEnds: readonly [boolean, boolean], rng: SeededRandom): number[] {
  const h = base.slice();
  if (!exact) {
    for (let i = 0; i < h.length; i++) {
      if (base[i]! < 2) continue;
      if (rng.chance(0.12)) {
        // Bumps come in small clusters (research T8: 10–20 % +1 in clusters, 5 % dents).
        h[i] = base[i]! + 1;
        if (i + 1 < h.length && base[i + 1]! >= 2 && rng.chance(0.5)) h[++i] = base[i]! + 1;
      } else if (rng.chance(0.05)) h[i] = base[i]! - 1;
    }
  }
  // Open ends sit one lower.
  if (openEnds[0] && h[0]! > 1) h[0] = h[0]! - 1;
  if (openEnds[1] && h.at(-1)! > 1) h[h.length - 1] = h.at(-1)! - 1;
  // Never seven equal heights in a row (a low stretch gets a one-block gap instead).
  if (!exact) {
    let count = 1;
    for (let i = 1; i < h.length; i++) {
      count = h[i] === h[i - 1] ? count + 1 : 1;
      if (count >= 7) {
        h[i] = h[i]! >= 2 ? h[i]! + 1 : 0;
        count = 1;
      }
    }
  }
  return h;
}

function placeSegment(site: Site, seg: Segment, ls: LandscapeStyle, m: LandscapeMaterials, o: { flowers: boolean }, rng: SeededRandom, seed: number, result: BorderResult): void {
  const n = seg.cells.length;
  const noise = (x: number, z: number) => valueNoise(seed, x, 7, z, 3);
  const isEnd = (i: number) => (i === 0 && seg.ends[0] !== 'joined') || i === n - 1;
  const endType = (i: number): End | null => (i === 0 ? seg.ends[0] : i === n - 1 ? seg.ends[1] : null);
  const post = m.post();
  // Posts every 4–6 and at corners and open ends; gate ends get gate posts.
  const postAt = new Set<number>();
  let next = seg.ends[0] === 'joined' ? rng.int(3, 5) : 0;
  for (let i = 0; i < n; i++) {
    if (i === next) {
      postAt.add(i);
      next = i + rng.int(4, 6);
    }
  }
  if (seg.ends[1] !== 'joined') postAt.add(n - 1);
  if (seg.ends[0] !== 'joined') postAt.add(0);

  const put = (x: number, y: number, z: number, state: string) => site.set(x, y, z, state);
  const ground = (x: number, z: number) => {
    // Grass under an opaque block would turn into dirt in the game: store dirt.
    if (site.owned[site.i(x, z)]) put(x, 0, z, blockState('dirt'));
  };

  const claimAll = () => {
    for (const [x, z] of seg.cells) {
      site.claim(x, z, Use.BORDER);
      result.cells.push([x, z]);
    }
  };

  switch (seg.kind) {
    case 'hedge':
    case 'hedgeBank': {
      const bank = seg.kind === 'hedgeBank' ? 1 : 0;
      const exact = ls.border.exact;
      const base = seg.cells.map(([x, z], i) => {
        const nearGate = endType(i) === 'gate' || (seg.ends[0] === 'gate' && i <= 1) || (seg.ends[1] === 'gate' && i >= n - 2);
        if (exact) return 1;
        const zone = site.windowZone[site.i(x, z)]!;
        return (zone > 0 && zone <= 5) || nearGate ? 1 : 2;
      });
      const heights = hedgeHeights(base, exact, [seg.ends[0] === 'open', seg.ends[1] === 'open'], rng);
      const species = clusteredAssign(seg.cells, ls.border.hedge, noise);
      seg.cells.forEach(([x, z], i) => {
        const leaf = blockState(species.get(`${x},${z}`) ?? ls.border.hedge[0]![0], { persistent: 'true' });
        if (bank) {
          put(x, 1, z, blockState('grass_block'));
          ground(x, z);
        }
        for (let y = 1; y <= heights[i]!; y++) put(x, y + bank, z, leaf);
      });
      claimAll();
      return;
    }
    case 'fence':
    case 'gardsgard': {
      const fence = m.state(m.fenceId());
      seg.cells.forEach(([x, z], i) => {
        if (seg.kind === 'gardsgard') {
          put(x, 1, z, fence);
          if (i % 3 === 0 || isEnd(i)) put(x, 2, z, fence);
        } else if (postAt.has(i)) {
          put(x, 1, z, post);
          put(x, 2, z, post);
          ground(x, z);
        } else put(x, 1, z, fence);
      });
      claimAll();
      return;
    }
    case 'bambooFence': {
      const h = seg.low ? 1 : 2;
      const fence = m.state('bamboo_fence');
      seg.cells.forEach(([x, z], i) => {
        const isPost = i % 4 === 0 || isEnd(i);
        for (let y = 1; y <= h; y++) put(x, y, z, isPost ? post : fence);
        if (isPost) ground(x, z);
      });
      claimAll();
      return;
    }
    case 'fieldWall': {
      const stones = clusteredAssign(seg.cells, ls.border.stones, noise);
      seg.cells.forEach(([x, z]) => {
        put(x, 1, z, blockState(stones.get(`${x},${z}`) ?? ls.border.stones[0]![0]));
        put(x, 2, z, blockState(ls.border.cap, { type: 'bottom' }));
        ground(x, z);
      });
      claimAll();
      return;
    }
    case 'stoneWall': {
      const stones = clusteredAssign(seg.cells, ls.border.stones, noise);
      seg.cells.forEach(([x, z], i) => {
        const wall = blockState(stones.get(`${x},${z}`) ?? ls.border.stones[0]![0]);
        put(x, 1, z, wall);
        if (postAt.has(i) && isEnd(i)) put(x, 2, z, wall);
      });
      claimAll();
      return;
    }
    case 'gardenWall': {
      const block = m.state(m.wallBlockId());
      const cap = blockState(m.wallSlabId() ?? ls.border.cap, { type: 'bottom' });
      const pots = ls.border.pots;
      seg.cells.forEach(([x, z], i) => {
        put(x, 1, z, block);
        ground(x, z);
        const pier = i % 3 === 0 || isEnd(i);
        if (pier) {
          put(x, 2, z, block);
          if (pots.length > 0 && cellHash(seed, x, z, 9) < 0.75) put(x, 3, z, blockState(pickBy(pots.map((p) => [p, 1] as const), cellHash(seed, x, z, 10))));
        } else put(x, 2, z, cap);
      });
      claimAll();
      return;
    }
    case 'boxHedge': {
      // Modern: no enclosure, a rhythm of clipped cubes along the front (research 12/N13).
      const leaf = blockState(ls.border.hedge[0]![0], { persistent: 'true' });
      seg.cells.forEach(([x, z], i) => {
        const near = (seg.ends[0] === 'gate' && i <= 1) || (seg.ends[1] === 'gate' && i >= n - 2);
        if (i % 4 !== 1 || near) return;
        put(x, 1, z, leaf);
        site.claim(x, z, Use.BORDER);
        result.cells.push([x, z]);
      });
      return;
    }
    case 'none':
      return;
  }
}

function placeGate(site: Site, frame: PlotFrame, ls: LandscapeStyle, m: LandscapeMaterials, gate: GateInfo, o: { flowers: boolean }, rng: SeededRandom, result: BorderResult): void {
  const kind = ls.border.front;
  const cells = [...gate.cells].sort((a, b) => frame.toPlot(a[0], a[1])[0] - frame.toPlot(b[0], b[1])[0]);
  const [ua, v] = frame.toPlot(...cells[0]!);
  const ub = frame.toPlot(...cells.at(-1)!)[0];
  const posts = [frame.toWorld(ua - 1, v), frame.toWorld(ub + 1, v)];
  result.gatePosts.push(...posts);
  const hedge = kind === 'hedge' || kind === 'hedgeBank';
  const arch = ls.border.arch && gate.lampPosts.length === 0 && ['fence', 'hedge', 'hedgeBank', 'gardsgard', 'bambooFence'].includes(kind);
  const borderHeight = kind === 'bambooFence' ? 2 : 1;
  const postHeight = arch ? 3 : borderHeight + 1;
  const post = m.post();
  let placed = 0;
  for (const [x, z] of posts) {
    if (!site.inside(x, z) || site.usage(x, z) === Use.LAMP || site.usage(x, z) === Use.PATH || !site.owned[site.i(x, z)]) continue;
    // The post replaces whatever the segment put into its column.
    for (let y = 1; y <= 4; y++) if (!site.b.isAir(x, y, z)) site.b.setBlock(x, y, z, 'minecraft:air', 10);
    if (kind === 'gardenWall') {
      const block = m.state(m.wallBlockId());
      site.set(x, 1, z, block);
      site.set(x, 2, z, block);
      if (!arch) site.set(x, 3, z, blockState(ls.border.pots[0] ?? 'potted_fern'));
    } else if (kind === 'stoneWall') {
      const wall = blockState(ls.border.stones[0]![0]);
      for (let y = 1; y <= postHeight; y++) site.set(x, y, z, wall);
    } else if (kind === 'fieldWall') {
      const stone = blockState(ls.border.stones[0]![0]);
      for (let y = 1; y <= Math.max(2, postHeight); y++) site.set(x, y, z, stone);
    } else if (arch && !hedge) {
      for (let y = 1; y <= postHeight; y++) site.set(x, y, z, post);
    } else if (arch) {
      const fence = m.state(m.fenceId());
      for (let y = 1; y <= postHeight; y++) site.set(x, y, z, fence);
    } else {
      for (let y = 1; y <= postHeight; y++) site.set(x, y, z, post);
    }
    site.claim(x, z, Use.BORDER);
    result.cells.push([x, z]);
    placed++;
  }
  // Gate leaves for fence and wall borders up to two blocks wide; hedges stay open.
  if (!hedge && cells.length <= 2) {
    const id = kind === 'bambooFence' ? 'bamboo_fence_gate' : m.gateId();
    const open = ls.border.front === 'fence' && rng.chance(0.2);
    for (const [x, z] of cells) site.set(x, 1, z, m.state(id, { facing: frame.front, open: String(open) }));
  }
  // Leaf arch over the gate (cottage rose bower; plain leaves in winter).
  if (arch && placed === 2) {
    const top = postHeight + 1;
    const mix: Mix = o.flowers
      ? [
          ['azalea_leaves', 7],
          ['flowering_azalea_leaves', 3],
        ]
      : [['spruce_leaves', 1]];
    const span = [frame.toWorld(ua - 1, v), ...cells, frame.toWorld(ub + 1, v)];
    for (const [x, z] of span) {
      if (!site.b.inside(x, top, z) || !site.b.isAir(x, top, z)) continue;
      site.set(x, top, z, blockState(pickBy(mix, cellHash(site.W * 31 + site.L, x, z, 11)), { persistent: 'true' }));
    }
  }
}
