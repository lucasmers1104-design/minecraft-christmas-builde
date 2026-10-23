import { HORIZONTAL, OPPOSITE, VECTOR, clockwise, type HorizontalDirection } from '@/core/blocks/directions';
import { blockState } from '@/core/blocks/registry';
import { Priority, type PriorityValue } from '@/core/generator/geometry';
import {
  battlementLayout,
  circle,
  dome,
  notchCells,
  ring,
  ringFacing,
  sectorBattlements,
  spireDiameters,
  witchHatLayers,
  type Mask2D,
} from '@/core/geometry';
import { floorY, wallTopOf, type HousePlan, type Mass, type RoundSpec } from '@/core/generator/house/plan';
import { createSeededRandom, hashSeed, valueNoise } from '@/core/generator/seededRandom';
import type { Ctx } from '@/core/generator/house/walls';
import { getMaterial } from '@/core/style/materials';
import type { Role } from '@/core/style/palettes';
import type { StyleId } from '@/core/style/styles';

/**
 * Round tower (phase 7; reworked after research report 16 "Türme, Rundformen, Bögen", 2026-10).
 * Three zones instead of a stack of identical storeys:
 *
 * - **Base:** plinth material in the plinth zone (the house's plinth height when attached, so the
 *   lines run through), a batter (one step, two from D 13) with a water-table stair on top.
 * - **Shaft:** the wall role of the palette (never the plinth role all the way up), weathered over
 *   the full height in clusters (mossy at the bottom, cracked in the shaft, more under the crown,
 *   clean crown). At most one projecting band per 8–10 blocks of shaft (alternating cornice and
 *   shadow joint); attached to a house only the band at its eave line. Timber styles get posts in
 *   the diagonal notches (they cover the pixel steps of the circle). Windows are set back one
 *   block (pane inside, reveal, sill and hood in front); a free tower has slits on the ground floor.
 * - **Crown and helm:** battlements stand on a corbel ring that carries the parapet (machicolations
 *   with lanterns from D 11), merlons by angular sectors (symmetric for every diameter), wide
 *   towers mostly with a spire behind the parapet; cones get a kicked eave of slabs and a slender
 *   tip of thin elements (post, lightning rod or end rod); fantasy gets a witch hat (slab brim, hat
 *   band, concave cone, bent tip); domes have the tower's diameter, on a drum, with a cupola from D 9.
 *
 * Attached to a house, the ring is left out inside the house's rooms so tower and house form one
 * interior. One lantern hangs in every storey; rooms stay otherwise empty. All choices are
 * deterministic (seeded from the house seed and the mass id).
 */

export interface RoundTowerResult {
  sills: { x: number; y: number; z: number }[];
  /** Cells just outside the wall under the crown or roof edge, on a witch hat's brim (for garlands). */
  eaves: { x: number; y: number; z: number; outward: HorizontalDirection }[];
  windows: number;
}

export function towerCentre(mass: Mass): { cx: number; cz: number; r: number; spec: RoundSpec } {
  const spec = mass.round!;
  const r = (spec.d - 1) / 2;
  return { cx: mass.rect.x0 + r, cz: mass.rect.z0 + r, r, spec };
}

// ---------------------------------------------------------------------------------------------
// Style table (report 16 "Stil-Matrix", report 09 T7). Only what the round roof chosen by the plan
// leaves open is decided here: which helm a cone becomes, the finial, posts and merlon rhythm.
// ---------------------------------------------------------------------------------------------

type Finial = 'rod' | 'end_rod' | 'fence';

interface TowerLook {
  /** Helm of a cone roof: kicked cone or witch hat. */
  cone: 'kick' | 'witch';
  /** Thin element on the tip of a helm (on a fence post, except `fence` itself). */
  finial: Finial;
  /** Timber posts in the diagonal notches above the plinth zone (plastered or planked walls). */
  posts: boolean;
  /** Merlons wider than crenels ("two up, one down") or 1:1. */
  merlons: 'wide' | 'even';
}

const LOOK: Readonly<Record<StyleId, TowerLook>> = {
  medieval: { cone: 'kick', finial: 'rod', posts: false, merlons: 'wide' },
  fantasy: { cone: 'witch', finial: 'end_rod', posts: true, merlons: 'wide' },
  rustic: { cone: 'kick', finial: 'fence', posts: true, merlons: 'even' },
  nordic: { cone: 'kick', finial: 'rod', posts: true, merlons: 'even' },
  japanese: { cone: 'kick', finial: 'rod', posts: true, merlons: 'even' },
  cherry: { cone: 'kick', finial: 'rod', posts: true, merlons: 'even' },
  modern: { cone: 'kick', finial: 'rod', posts: false, merlons: 'even' },
  mediterranean: { cone: 'kick', finial: 'rod', posts: false, merlons: 'even' },
};

/** Exponent of the spire profile per cone outline (1 straight, > 1 concave needle, < 1 bell). */
const CONE_EXPONENT: Readonly<Record<RoundSpec['coneProfile'], number>> = { linear: 1, concave: 1.75, convex: 0.6 };

// ---------------------------------------------------------------------------------------------
// Design: every height and every seeded choice, computed without a builder (also used for the
// model height before anything is built).
// ---------------------------------------------------------------------------------------------

type FinialPart = 'post' | 'rod' | 'end_rod' | 'lantern' | 'cupola';

export interface HelmPlan {
  kind: 'none' | 'kick' | 'witch' | 'spire' | 'dome';
  /** y of the first helm layer. */
  y0: number;
  /** Layers bottom → top, each mask centred on its own grid, shifted along `bend`. */
  layers: { mask: Mask2D; shift: number }[];
  /** Layer built as a ring of bottom slabs (brim, kicked eave); -1 = none. */
  brim: number;
  /** Layer whose visible ring is the hat band (trim material); -1 = none. */
  band: number;
  bend: HorizontalDirection;
  /** Thin elements on the tip, bottom → top. */
  finial: FinialPart[];
}

export interface TowerDesign {
  d: number;
  /** Wall top (deck) = wallTopOf. */
  top: number;
  /** Last row of the plinth zone. */
  plinthTop: number;
  /** Row of the corbel ring that carries the parapet (battlements) or the helm's eave. */
  corbelY: number;
  crown: 'battlement' | 'corbel' | 'flat';
  /** Corbels only under the merlons, open holes (some with lanterns) between them. */
  machicolation: boolean;
  /** Projecting bands on the ring just outside the wall (never the same profile twice in a row). */
  bands: { y: number; kind: 'cornice' | 'shadow' }[];
  /** Drum rows above the deck (domes). */
  drum: number;
  helm: HelmPlan;
  /** Highest y the tower builds. */
  topY: number;
}

const odd = (n: number) => (n % 2 === 0 ? n + 1 : n);

function nearestLine(lines: number[], target: number, ok: (y: number) => boolean): number | null {
  let best: number | null = null;
  for (const y of lines) if (ok(y) && (best === null || Math.abs(y - target) < Math.abs(best - target))) best = y;
  return best;
}

export function designRoundTower(plan: Pick<HousePlan, 'plinth' | 'floorHeight' | 'input' | 'masses'>, mass: Mass): TowerDesign {
  const spec = mass.round!;
  const d = spec.d;
  const top = wallTopOf(plan, mass);
  const look = LOOK[plan.input.styleId];
  const alone = plan.masses[0] === mass;
  const rng = createSeededRandom(hashSeed(plan.input.seed, `roundTower:${mass.id}`));

  // Plinth zone: the house's plinth when attached (lines run through); a free tower gets a heavy
  // base of about 12 % of its height, timber styles a whole stone ground storey.
  const firstLine = floorY(plan, 1);
  const cap = plan.plinth + Math.max(1, Math.floor((top - plan.plinth) * 0.4));
  const plinthTop = !alone
    ? plan.plinth
    : Math.min(cap, look.posts ? Math.max(plan.plinth, firstLine - 1) : Math.max(2, plan.plinth, Math.min(Math.round(0.12 * top), firstLine - 1)));

  const crown: TowerDesign['crown'] = spec.roof === 'battlement' ? 'battlement' : spec.roof === 'flat' ? 'flat' : 'corbel';
  const corbelY = crown === 'battlement' ? top - 1 : top;

  // Bands (report 16 T3, report 19 T10): none on short shafts, at most one per 8–10 blocks,
  // profiles alternate; attached to a house only at its eave line.
  const bands: TowerDesign['bands'] = [];
  const lines = Array.from({ length: Math.max(0, mass.floors - 1) }, (_, k) => floorY(plan, k + 1));
  const usable = (y: number) => y > plinthTop + 1 && y <= corbelY - 5 && bands.every((b) => Math.abs(b.y - y) >= 6);
  if (!alone) {
    const eave = wallTopOf(plan, plan.masses[0]!);
    if (usable(eave)) bands.push({ y: eave, kind: 'cornice' });
  } else {
    // Timber styles: a band on top of the stone ground storey (report 09, recommendation 11).
    if (look.posts && plinthTop >= 3 && lines.includes(plinthTop + 1) && plinthTop + 1 <= corbelY - 5) bands.push({ y: plinthTop + 1, kind: 'cornice' });
    const base = bands.at(-1)?.y ?? plinthTop;
    const shaft = corbelY - base;
    const n = shaft < 16 ? 0 : shaft <= 28 ? 1 : Math.floor(shaft / 10);
    for (let i = 1; i <= n; i++) {
      const y = nearestLine(lines, base + shaft * (n === 1 ? 0.6 : i / (n + 1)), usable);
      if (y !== null) bands.push({ y, kind: 'cornice' });
    }
    bands.sort((a, b) => a.y - b.y);
    bands.forEach((b, i) => (b.kind = i % 2 === 0 ? 'cornice' : 'shadow'));
  }

  const bend = rng.fork('bend').pick(HORIZONTAL);
  const none: HelmPlan = { kind: 'none', y0: top + 1, layers: [], brim: -1, band: -1, bend, finial: [] };
  const tip = (f: Finial): FinialPart[] => (f === 'fence' ? ['post'] : ['post', f]);
  const rings = (widths: number[]) => widths.map((w) => ({ mask: circle(w), shift: 0 }));
  let helm = none;
  let drum = 0;
  if (spec.roof === 'cone' && look.cone === 'witch') {
    // Witch hat (report 09 T7): slab brim, hat band, concave cone, usually a bent tip.
    const layers = witchHatLayers(d, rng.fork('witch').chance(0.8));
    helm = { ...none, kind: 'witch', layers: layers.map((l) => ({ mask: circle(l.d), shift: l.shift })), brim: 0, band: 1, finial: [look.finial === 'end_rod' ? 'end_rod' : 'rod'] };
  } else if (spec.roof === 'cone') {
    // Kicked cone (report 16 T9): eave of slabs two in front of the wall, slender tip.
    const h = Math.max(3, Math.round((d + 2) * spec.slope));
    helm = { ...none, kind: 'kick', layers: rings([d + 4, ...spireDiameters(d + 2, h, CONE_EXPONENT[spec.coneProfile], 1)]), brim: 0, finial: tip(look.finial) };
  } else if (spec.roof === 'dome') {
    // Dome of the tower's own diameter on a drum (report 16 T12), slightly raised (one layer
    // more than a hemisphere) so it is not hidden behind the cornice in views from above.
    drum = d <= 9 ? 2 : 3;
    helm = { ...none, kind: 'dome', y0: top + drum + 1, layers: dome(d, Math.ceil(d / 2) + 1).layers.map((mask) => ({ mask, shift: 0 })), finial: d >= 9 ? ['cupola'] : ['lantern'] };
  } else if (spec.roof === 'battlement' && d >= 9 && rng.fork('spire').chance(0.75)) {
    // Spire behind the parapet (T10): helm D − 4 on the deck, the walkway stays two blocks wide
    // (the ladder hatch lies in it). About 1.3 × its base high: steeper spires stack into rings.
    helm = { ...none, kind: 'spire', layers: rings(spireDiameters(d - 4, odd(Math.round(1.3 * (d - 4))), 1, 1)), finial: tip(look.finial) };
  }

  const finialHeight = helm.finial.reduce((n, f) => n + (f === 'cupola' ? 4 : 1), 0);
  const helmTop = helm.layers.length > 0 ? helm.y0 + helm.layers.length - 1 + finialHeight : top;
  const crownTop = crown === 'battlement' ? top + 2 : crown === 'flat' ? top + 1 : top;
  return {
    d,
    top,
    plinthTop,
    corbelY,
    crown,
    machicolation: crown === 'battlement' && d >= 11,
    bands,
    drum,
    helm,
    topY: Math.max(helmTop, crownTop),
  };
}

/** Highest y the tower builds (finial, cupola, merlons, parapet). */
export function roundTowerTop(plan: Pick<HousePlan, 'plinth' | 'floorHeight' | 'input' | 'masses'>, mass: Mass): number {
  return designRoundTower(plan, mass).topY;
}

// ---------------------------------------------------------------------------------------------
// Weathering over the full height (report 16 T6, report 07 T3): clusters from two octaves of
// value noise, made uniform with a measured quantile table, so the share per zone is as planned.
// ---------------------------------------------------------------------------------------------

/** Quantiles (0, 5 %, …, 100 %) of 0.65·noise(cell 3) + 0.35·noise(cell 1.5), measured over 216 000 samples. */
const NOISE_QUANTILES = [0, 0.276, 0.324, 0.356, 0.382, 0.405, 0.425, 0.444, 0.463, 0.481, 0.499, 0.517, 0.535, 0.554, 0.573, 0.594, 0.617, 0.643, 0.675, 0.723, 1];

function uniform(n: number): number {
  for (let i = 1; i < NOISE_QUANTILES.length; i++) {
    const hi = NOISE_QUANTILES[i]!;
    if (n <= hi) {
      const lo = NOISE_QUANTILES[i - 1]!;
      return (i - 1 + (n - lo) / Math.max(1e-9, hi - lo)) / (NOISE_QUANTILES.length - 1);
    }
  }
  return 1;
}

/**
 * Wall block (short id) of a material at (x, y, z): the clean block or a weathering variant.
 * `amount` is the share of weathered blocks wanted here, `heavy` the share of those that take the
 * strongest variant (mossy). Moss blocks only right above the ground.
 */
export function towerWallBlock(materialId: string, seed: number, x: number, y: number, z: number, amount: number, heavy: number): string {
  const material = getMaterial(materialId);
  const levels = material.weathering;
  if (!levels || levels.length < 2) return material.forms.block ?? materialId;
  const n = 0.65 * valueNoise(hashSeed(seed, 'tower-weather-a'), x, y, z, 3) + 0.35 * valueNoise(hashSeed(seed, 'tower-weather-b'), x, y, z, 1.5);
  if (uniform(n) >= amount) return levels[0]!;
  const strong = levels.length >= 3 && uniform(valueNoise(hashSeed(seed, 'tower-weather-c'), x, y, z, 2)) < heavy;
  const variant = strong ? levels[2]! : levels[1]!;
  return variant === 'moss_block' && y > 2 ? levels[0]! : variant;
}

/** Share of weathered wall blocks (and of those the heavy variant) per height of a tower. */
export function towerWeather(design: Pick<TowerDesign, 'plinthTop' | 'corbelY'>, y: number): { amount: number; heavy: number } {
  const { plinthTop, corbelY } = design;
  if (y <= plinthTop) return { amount: 0.42 - 0.14 * (plinthTop > 1 ? (y - 1) / (plinthTop - 1) : 0), heavy: 0.4 };
  if (y >= corbelY) return { amount: 0.06, heavy: 0 };
  const h = (y - plinthTop) / Math.max(1, corbelY - plinthTop);
  // Two rows under the corbel ring: weathered about 1.5–2 × as much as the shaft (drip under the crown).
  return { amount: 0.26 - 0.12 * h + (y >= corbelY - 2 ? 0.2 : 0), heavy: h < 0.3 ? 0.3 : 0 };
}

const N4: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/**
 * Builds the tower. `inHouse(x, y, z)` marks cells inside the rooms of an attached house: the
 * ring is left open there (one interior), everything else of the tower is built over the house.
 */
export function buildRoundTower(
  ctx: Ctx,
  mass: Mass,
  inHouse: (x: number, y: number, z: number) => boolean = () => false,
  // Attached to a house the tower replaces whatever the house put into its cylinder; alone it
  // builds at wall priority so the entrance can be cut in afterwards.
  P: PriorityValue = Priority.CLEARANCE,
): RoundTowerResult {
  const { builder, plan, blocks } = ctx;
  const { cx, cz, r, spec } = towerCentre(mass);
  const design = designRoundTower(plan, mass);
  const { d, top, plinthTop, corbelY } = design;
  const look = LOOK[plan.input.styleId];
  const alone = plan.masses[0] === mass;
  const centre = { x: cx, z: cz };
  const wall = circle(d, 'thick');
  const disk = circle(d, 'filled');
  const outerDisk = circle(d + 2, 'filled');
  const has = (m: Mask2D, x: number, z: number) => {
    const o = (m.width - 1) / 2;
    return m.has(x - cx + o, z - cz + o);
  };
  const levels = new Set(Array.from({ length: mass.floors + 1 }, (_, k) => floorY(plan, k)));
  const set = (x: number, y: number, z: number, state: string, priority: PriorityValue = P) => {
    if (builder.inside(x, y, z)) builder.setBlock(x, y, z, state, priority);
  };
  const free = (x: number, y: number, z: number) => builder.inside(x, y, z) && builder.isAir(x, y, z);
  // Outside the wall: only into free cells that do not belong to the house.
  const freeOut = (x: number, y: number, z: number) => !inHouse(x, y, z) && free(x, y, z);
  const roleWith = (form: 'stairs' | 'slab', ...roles: Role[]): Role => roles.find((role) => blocks.has(role, form)) ?? 'roof';
  const result: RoundTowerResult = { sills: [], eaves: [], windows: 0 };

  // Entrance of a free tower: batter, bands and windows keep its portal free.
  const doorY = plan.plinth + 1;
  const entrance = spec.door ? { x: cx + VECTOR[spec.door][0] * (r + 1), z: cz + VECTOR[spec.door][2] * (r + 1) } : null;
  const nearEntrance = (x: number, z: number, reach = 2.5) => !!entrance && (x - entrance.x) ** 2 + (z - entrance.z) ** 2 <= reach * reach;

  // Ladder: inside the wall on the ladder side, one cell beside the axis (the axis keeps its
  // window), on the side away from the house.
  const [lx, , lz] = VECTOR[spec.ladder];
  const tangent = clockwise(spec.ladder, 1);
  const [tx, , tz] = VECTOR[tangent];
  const houseCells = (sign: number) => {
    let n = 0;
    for (let k = 1; k <= r; k++) if (inHouse(cx + tx * sign * k - lx, plan.plinth + 1, cz + tz * sign * k - lz)) n++;
    return n;
  };
  const sign = houseCells(1) <= houseCells(-1) ? 1 : -1;
  const ladder = { x: cx + lx * (r - 1) + tx * sign, z: cz + lz * (r - 1) + tz * sign };
  const ladderFacing = OPPOSITE[spec.ladder] as HorizontalDirection;
  const ladderTop = design.crown === 'battlement' ? top : floorY(plan, mass.floors - 1);
  const isLadder = (x: number, y: number, z: number) => x === ladder.x && z === ladder.z && y > plan.plinth && y <= ladderTop;

  // Windows (planned first: drip streaks below them weather the wall). Slits on the ground floor
  // of a free tower, set-back windows with sill and hood above.
  const windows: { side: HorizontalDirection; yb: number; h: number; hood: boolean }[] = [];
  const rows = plan.floorHeight - 1;
  for (let k = 0; k < mass.floors; k++) {
    const y0 = floorY(plan, k);
    const slit = alone && k === 0;
    const h = slit && rows >= 4 ? 3 : 2;
    const yb = slit || rows < 4 ? y0 + 1 : y0 + 2;
    const outside = HORIZONTAL.filter((s) => {
      if (k === 0 && s === spec.door) return false;
      const [vx, , vz] = VECTOR[s];
      const ax = cx + vx * r;
      const az = cz + vz * r;
      return [0, 1, -1].every((dd) => [yb - 1, yb, yb + h].every((y) => !inHouse(ax + vx * dd, y, az + vz * dd)));
    });
    const density = plan.input.windows;
    const chosen = density === 'many' ? outside : outside.filter((_, i) => (density === 'few' ? i === k % outside.length : (i + k) % 2 === 0 || outside.length <= 2));
    for (const side of chosen) windows.push({ side, yb, h, hood: !slit });
  }
  const drip = new Set<string>();
  for (const w of windows) {
    const [vx, , vz] = VECTOR[w.side];
    for (const y of [w.yb - 2, w.yb - 3]) drip.add(`${cx + vx * r},${y},${cz + vz * r}`);
  }

  // Wall material per zone (plinth role only in the plinth zone), weathered over the full height.
  const crownWall = blocks.block('wall');
  const wallState = (x: number, y: number, z: number): string => {
    const { amount, heavy } = towerWeather(design, y);
    const material = y <= plinthTop ? blocks.materials.plinth : blocks.materials.wall;
    return blockState(towerWallBlock(material, blocks.seed, x, y, z, amount + (drip.has(`${x},${y},${z}`) ? 0.15 : 0), heavy));
  };

  // Body: foundation, wall ring, floors (the deck on top), air inside.
  for (let x = cx - r - 1; x <= cx + r + 1; x++)
    for (let z = cz - r - 1; z <= cz + r + 1; z++) {
      const isWall = has(wall, x, z);
      const isIn = has(disk, x, z) && !isWall;
      if (!isWall && !isIn) continue;
      set(x, 0, z, blocks.block('plinth'));
      for (let y = 1; y <= top; y++) {
        if (isLadder(x, y, z)) set(x, y, z, blocks.fixed('ladder', { facing: ladderFacing }));
        else if (isWall && !inHouse(x, y, z)) set(x, y, z, wallState(x, y, z));
        else if (levels.has(y) || y < plan.plinth) set(x, y, z, blocks.block(y < plan.plinth ? 'plinth' : 'floor'));
        else builder.clear(x, y, z, P);
      }
    }

  // Ring just outside the wall (K1) and the one beyond (K2), each on its own grid.
  const k1 = ring(d + 2, 1);
  const k2 = ring(d + 4, 1);
  const cellsOf = (m: Mask2D) => {
    const o = (m.width - 1) / 2;
    return m.cells().map(([mx, mz]) => ({ mx, mz, x: cx - o + mx, z: cz - o + mz }));
  };
  const facingIn = (x: number, z: number) => ringFacing(x, z, centre) as HorizontalDirection;
  const outward = (x: number, z: number) => OPPOSITE[facingIn(x, z)] as HorizontalDirection;

  // Base: batter with a water-table stair (report 16 T4); a second step from D 13 on a free tower.
  // Attached to a house it repeats the house's plinth apron.
  const plinthStairs = roleWith('stairs', 'plinth', 'wall');
  const steps = alone
    ? [{ cells: cellsOf(k1), top: d >= 13 ? plinthTop : Math.min(plinthTop, 2) }, ...(d >= 13 ? [{ cells: cellsOf(k2), top: Math.ceil(plinthTop / 2) }] : [])]
    : [{ cells: cellsOf(k1), top: plan.plinth - 1 }];
  steps.forEach((step, i) => {
    for (const { x, z } of step.cells)
      for (let y = 1; y <= step.top + 1; y++) {
        // In front of the entrance the door template brings its own step (and snow must not
        // settle on a batter block at door height).
        if (nearEntrance(x, z, 2.5 + i) || !freeOut(x, y, z)) continue;
        if (y <= step.top) set(x, y, z, blockState(towerWallBlock(blocks.materials.plinth, blocks.seed, x, y, z, 0.4, 0.4)), Priority.STRUCTURE);
        else set(x, y, z, blocks.stairs(plinthStairs, facingIn(x, z), 'bottom'), Priority.DECOR);
      }
  });

  // Posts in the diagonal notches (timber styles), from the plinth zone up to the corbel ring.
  if (look.posts)
    for (const { x, z } of cellsOf(notchCells(d)))
      for (let y = plinthTop + 1; y < corbelY; y++) if (freeOut(x, y, z)) set(x, y, z, blocks.log('frame', 'y'), Priority.STRUCTURE);

  // Bands: cornice (upside-down stairs) or shadow joint (top slabs), never across the entrance
  // portal. Timber styles take the beam wood (the bands tie the posts), stone towers their wall.
  const trimRoles: Role[] = look.posts ? ['beam', 'frame', 'roofTrim', 'wall', 'plinth'] : ['wall', 'plinth', 'roofTrim'];
  const trimStairs = roleWith('stairs', ...trimRoles);
  const trimSlab = roleWith('slab', ...trimRoles);
  for (const band of design.bands)
    for (const { x, z } of cellsOf(k1)) {
      if ((band.y <= doorY + 4 && nearEntrance(x, z)) || !freeOut(x, band.y, z)) continue;
      set(x, band.y, z, band.kind === 'cornice' ? blocks.stairs(trimStairs, facingIn(x, z), 'top') : blocks.slab(trimSlab, 'top'), Priority.STRUCTURE);
    }

  // Windows set back one block (report 16 T7a): opening in the wall, pane and reveal inside, sill
  // and hood in front of the wall.
  const interiorAir = (x: number, y: number, z: number) => has(disk, x, z) && !has(wall, x, z) && !isLadder(x, y, z) && free(x, y, z);
  const reveal = blocks.block('wall');
  for (const w of windows) {
    const [vx, , vz] = VECTOR[w.side];
    const [wx, , wz] = VECTOR[clockwise(w.side, 1)];
    const ax = cx + vx * r;
    const az = cz + vz * r;
    const ix = ax - vx;
    const iz = az - vz;
    for (let y = w.yb; y < w.yb + w.h; y++) {
      builder.clear(ax, y, az, P);
      set(ix, y, iz, blocks.pane());
      for (const s of [-1, 1]) if (interiorAir(ix + wx * s, y, iz + wz * s)) set(ix + wx * s, y, iz + wz * s, reveal);
    }
    for (const s of [-1, 0, 1])
      for (const y of [w.yb - 1, w.yb + w.h]) if (interiorAir(ix + wx * s, y, iz + wz * s)) set(ix + wx * s, y, iz + wz * s, reveal);
    const facing = OPPOSITE[w.side] as HorizontalDirection;
    if (w.hood) {
      if (freeOut(ax + vx, w.yb - 1, az + vz)) {
        set(ax + vx, w.yb - 1, az + vz, blocks.stairs(trimStairs, facing, 'top'), Priority.OPENING);
        result.sills.push({ x: ax + vx, y: w.yb - 1, z: az + vz });
      }
      if (freeOut(ax + vx, w.yb + w.h, az + vz)) set(ax + vx, w.yb + w.h, az + vz, blocks.stairs(trimStairs, facing, 'top'), Priority.OPENING);
    }
    result.windows++;
  }

  // One lantern hangs under the ceiling of every storey (light inside, otherwise empty rooms).
  if (plan.input.lanternDensity !== 'none')
    for (let k = 0; k < mass.floors; k++) {
      const y = floorY(plan, k + 1) - 1;
      if (y > floorY(plan, k) + 2 && free(cx, y, cz) && !free(cx, y + 1, cz)) set(cx, y, cz, blocks.fixed(plan.input.lantern, { hanging: 'true' }));
    }

  // Crown.
  if (design.crown === 'battlement') {
    // Corbels on K1 carry the parapet (K1, two rows) with the merlons on top (report 16 T1, T2);
    // from D 11 machicolations: corbels only under the merlons, lanterns in some of the holes.
    const layout = battlementLayout(k1, look.merlons);
    const merlons = sectorBattlements(k1, layout.merlons, layout.share);
    const corbelStairs = roleWith('stairs', 'wall', 'plinth', 'roofTrim');
    const period = (2 * Math.PI) / layout.merlons;
    const every = plan.input.lanternDensity === 'many' ? 1 : plan.input.lanternDensity === 'normal' ? 2 : 4;
    const lit = new Set<number>();
    for (const { mx, mz, x, z } of cellsOf(k1)) {
      if (inHouse(x, corbelY, z)) continue;
      const merlon = merlons.has(mx, mz);
      let lantern = false;
      if ((!design.machicolation || merlon) && free(x, corbelY, z)) set(x, corbelY, z, blocks.stairs(corbelStairs, facingIn(x, z), 'top'), Priority.STRUCTURE);
      else if (design.machicolation && plan.input.lanternDensity !== 'none' && free(x, corbelY, z) && N4.some(([a, b]) => !has(outerDisk, x + a, z + b))) {
        const gap = Math.floor(Math.atan2(z - cz, x - cx) / period + 100 * layout.merlons);
        if (gap % every === 0 && !lit.has(gap)) {
          lit.add(gap);
          lantern = true;
          set(x, corbelY, z, blocks.fixed(plan.input.lantern, { hanging: 'true' }), Priority.STRUCTURE);
        }
      }
      for (const y of [top, top + 1]) if (free(x, y, z)) set(x, y, z, crownWall, Priority.STRUCTURE);
      if (merlon && free(x, top + 2, z)) set(x, top + 2, z, crownWall, Priority.STRUCTURE);
      if (!lantern) result.eaves.push({ x, y: corbelY - 1, z, outward: outward(x, z) });
    }
  } else {
    // Corbel ring that carries the helm's eave (the cornice under a dome's drum).
    const corbelStairs = roleWith('stairs', 'roofTrim', 'wall', 'plinth');
    for (const { x, z } of cellsOf(k1)) {
      if (!freeOut(x, top, z)) continue;
      set(x, top, z, blocks.stairs(corbelStairs, facingIn(x, z), 'top'), Priority.STRUCTURE);
      if (design.helm.kind !== 'witch') result.eaves.push({ x, y: top - 1, z, outward: outward(x, z) });
    }
    if (design.crown === 'flat') for (const { x, z } of cellsOf(wall)) if (free(x, top + 1, z)) set(x, top + 1, z, crownWall);
  }

  // Drum under a dome: the wall ring continues above the cornice, with a pane on every axis.
  if (design.drum > 0) {
    for (const { x, z } of cellsOf(wall)) for (let y = top + 1; y <= top + design.drum; y++) set(x, y, z, crownWall);
    for (const s of HORIZONTAL) {
      const [vx, , vz] = VECTOR[s];
      for (let y = top + 1; y < top + design.drum; y++) set(cx + vx * r, y, cz + vz * r, blocks.pane());
    }
  }

  buildHelm(ctx, design.helm, cx, cz, set);
  // Garlands of a witch hat lie on its brim, against the hat band (report 09, winter variant).
  if (design.helm.kind === 'witch')
    for (const { x, z } of cellsOf(k2)) if (free(x, design.helm.y0 + 1, z)) result.eaves.push({ x, y: design.helm.y0 + 1, z, outward: outward(x, z) });
  return result;
}

/**
 * Builds a helm from its layers, only the visible hull (hollow inside). A cell covered by the layer
 * above is a full block (the hat band in the trim material); an uncovered one a stair facing the
 * next layer (convex corners of a step too – the state resolver turns them into outer corners), a
 * bottom slab where a step is two wide or on the brim, the top single a full block.
 */
function buildHelm(ctx: Ctx, helm: HelmPlan, cx: number, cz: number, set: (x: number, y: number, z: number, state: string) => void): void {
  const { blocks, plan } = ctx;
  const L = helm.layers;
  if (L.length === 0) return;
  const [bx, , bz] = VECTOR[helm.bend];
  const centreOf = (i: number) => ({ x: cx + bx * L[i]!.shift, z: cz + bz * L[i]!.shift });
  const inLayer = (i: number, x: number, z: number) => {
    const l = L[i];
    if (!l) return false;
    const c = centreOf(i);
    const o = (l.mask.width - 1) / 2;
    return l.mask.has(x - c.x + o, z - c.z + o);
  };
  // Brim slabs are half blocks: the cells behind them must be closed.
  const brimCell = (i: number, x: number, z: number) => i === helm.brim && inLayer(i, x, z) && !inLayer(i + 1, x, z);
  const band = blocks.block('roofTrim');
  for (let i = 0; i < L.length; i++) {
    const y = helm.y0 + i;
    const c = centreOf(i);
    const mask = L[i]!.mask;
    const o = (mask.width - 1) / 2;
    for (const [mx, mz] of mask.cells()) {
      const x = c.x - o + mx;
      const z = c.z - o + mz;
      const edge = N4.some(([dx, dz]) => !inLayer(i, x + dx, z + dz) || brimCell(i, x + dx, z + dz));
      const covered = inLayer(i + 1, x, z);
      if (!edge && covered) continue;
      let state: string;
      if (covered) state = i === helm.band ? band : blocks.block('roof');
      else if (i === helm.brim) state = blocks.slab('roof', 'bottom');
      else if (i + 1 >= L.length) state = blocks.block('roof');
      else {
        const next = centreOf(i + 1);
        const f0 = ringFacing(x, z, next) as HorizontalDirection;
        const f = [f0, ...HORIZONTAL.filter((h) => h !== f0)].find((h) => inLayer(i + 1, x + VECTOR[h][0], z + VECTOR[h][2]));
        const sx = Math.sign(next.x - x);
        const sz = Math.sign(next.z - z);
        const corner = sx !== 0 && sz !== 0 && inLayer(i + 1, x + sx, z + sz) && inLayer(i, x + sx, z) && inLayer(i, x, z + sz);
        state = f ? blocks.stairs('roof', f, 'bottom') : corner ? blocks.stairs('roof', f0, 'bottom') : blocks.slab('roof', 'bottom');
      }
      set(x, y, z, state);
    }
  }

  // Thin elements on the tip.
  const last = centreOf(L.length - 1);
  let y = helm.y0 + L.length;
  for (const part of helm.finial) {
    if (part === 'post') set(last.x, y, last.z, blocks.fence('frame'));
    else if (part === 'rod') set(last.x, y, last.z, blocks.fixed('waxed_lightning_rod', { facing: 'up' }));
    else if (part === 'end_rod') set(last.x, y, last.z, blocks.fixed('end_rod', { facing: 'up' }));
    else if (part === 'lantern') set(last.x, y, last.z, blocks.fixed(plan.input.lantern, { hanging: 'false' }));
    else {
      // Cupola (report 16 T12): posts on the corners, panes on the edges, a lantern inside, a cap
      // of slabs and a rod on top.
      const post = blocks.wallForm('roofTrim') ?? blocks.wallForm('plinth') ?? blocks.fence('frame');
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++) {
          for (const dy of [0, 1]) {
            if (dx !== 0 && dz !== 0) set(last.x + dx, y + dy, last.z + dz, post);
            else if (dx !== 0 || dz !== 0) set(last.x + dx, y + dy, last.z + dz, blocks.pane());
          }
          set(last.x + dx, y + 2, last.z + dz, blocks.slab('roof', 'bottom'));
        }
      set(last.x, y, last.z, blocks.fixed(plan.input.lantern, { hanging: 'false' }));
      set(last.x, y + 3, last.z, blocks.fixed('waxed_lightning_rod', { facing: 'up' }));
      y += 3;
    }
    y++;
  }
}
