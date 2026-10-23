import type { HorizontalDirection } from '@/core/blocks/directions';
import type { RidgeStyle, RoofMaterials, RoofSectionSpec, SectionType } from '@/core/generator/roof/roofEngine';
import type { ProfileName } from '@/core/generator/roof/profiles';
import type { SeededRandom } from '@/core/generator/seededRandom';
import type { Role } from '@/core/style/palettes';
import type { RoofProfile, RoofType, StyleDef, StyleId, Theme } from '@/core/style/styles';
import type { RoleMaterials } from '@/core/templates/place';
import { studPositions } from '@/core/generator/house/studs';

/**
 * House plan: the resolved input (style, materials, sizes, features) turned into masses
 * (main body, wings, cross gable, annex, tower) with storeys, frame planes and roof sections.
 * Coordinates are local here (main body starting at 0,0); buildHouse shifts everything into
 * the model volume once the bounding box is known.
 *
 * Vertical layout (all masses share it): y = 0 ground, plinth rows 1..P, storey k has its floor
 * layer at yF(k) = P + k·FH and wall rows above it; the top storey ends with a beam layer at
 * wallTop = P + floors·FH on which the roof rests.
 */

export type Symmetry = 'symmetric' | 'asymmetric' | 'rambling';
export type Wings = 'none' | 'L' | 'T' | 'U';
export type TowerKind = 'none' | 'square' | 'round';
export type TowerPosition = 'front_left' | 'front_right' | 'back_left' | 'back_right';

export interface HouseInput {
  styleId: StyleId;
  style: StyleDef;
  paletteId: string;
  materials: RoleMaterials;
  theme: Theme;
  seed: number;
  minecraftVersion: string;
  /** Main body wall plane (odd). */
  width: number;
  depth: number;
  floors: number;
  /** Storey height including the floor layer. */
  floorHeight: number;
  plinth: number;
  roofType: RoofType;
  roofProfile: RoofProfile;
  overhang: number;
  wings: Wings;
  annex: 'none' | 'left' | 'right';
  tower: TowerKind;
  towerPosition: TowerPosition;
  symmetry: Symmetry;
  windows: 'few' | 'normal' | 'many';
  windowTemplates: readonly string[];
  doorTemplates: readonly string[];
  /** Templates of an explicitly chosen window/door family (empty: the style decides). */
  windowWish: readonly string[];
  doorWish: readonly string[];
  timber: 'none' | 'upper' | 'all';
  jetty: boolean;
  porch: boolean;
  oriel: boolean;
  balcony: boolean;
  chimney: boolean;
  dormers: number;
  lanternDensity: 'none' | 'few' | 'normal' | 'many';
  lantern: 'lantern' | 'soul_lantern';
  detailLevel: 1 | 2 | 3;
  garden: boolean;
  festive: { garland: boolean; christmasTree: boolean; presents: boolean; snow: boolean };
}

export interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

export type MassKind = 'main' | 'wing' | 'cross' | 'annex' | 'tower';

/** Roof of a round tower: cone with overhang, dome, battlements (symmetric D only) or flat. */
export type RoundRoof = 'cone' | 'dome' | 'battlement' | 'flat';

export interface RoundSpec {
  /** Outer wall diameter, odd (7–15); the mass rect is the d × d square around it. */
  d: number;
  roof: RoundRoof;
  /** Cone height per block of cone diameter. */
  slope: number;
  /** Cone outline: straight, concave (bell, flared) or convex. */
  coneProfile: 'linear' | 'concave' | 'convex';
  /** Inside wall the ladder leans against (never a window or door there). */
  ladder: HorizontalDirection;
  /** Entrance of a free-standing tower (null: entered from the house). */
  door: HorizontalDirection | null;
}

export interface Mass {
  id: string;
  kind: MassKind;
  /** Wall plane of the ground storey. */
  rect: Rect;
  floors: number;
  /** Upper storeys grow outwards by one block on these sides (jetty). */
  jetty: Partial<Record<HorizontalDirection, boolean>>;
  /** Sides that open into another mass (no facade, passage instead). */
  joins: Partial<Record<HorizontalDirection, boolean>>;
  ridgeAxis: 'x' | 'z';
  roofType: SectionType;
  profile: ProfileName;
  overhang: number;
  shedHigh?: HorizontalDirection;
  ridgeStyle: RidgeStyle;
  /** Frames (posts, beams) stand one block in front of the wall plane. */
  frames: boolean;
  timber: boolean;
  /** Round tower (phase 7): built from the geometry library instead of walls and roof engine. */
  round?: RoundSpec;
  /** Rise limit of the roof section (default 7, towers 12). */
  maxRise?: number;
}

export interface HousePlan {
  input: HouseInput;
  plinth: number;
  floorHeight: number;
  masses: Mass[];
  /** Door on the main body's front (north, z = rect.z0). */
  door: { x: number; side: HorizontalDirection };
  /** Wishes the plan had to adapt (shown to the user). */
  notes: string[];
}

/** True if (x, z) lies within `margin` blocks outside a round tower's wall circle. */
export function nearRoundTower(plan: Pick<HousePlan, 'masses'>, x: number, z: number, margin: number): boolean {
  for (const m of plan.masses) {
    if (!m.round) continue;
    const r = (m.round.d - 1) / 2;
    const dx = x - (m.rect.x0 + r);
    const dz = z - (m.rect.z0 + r);
    if (dx * dx + dz * dz <= (r + margin + 0.5) ** 2) return true;
  }
  return false;
}

const POSITION_LABELS: Record<TowerPosition, string> = { front_left: 'vorne links', front_right: 'vorne rechts', back_left: 'hinten links', back_right: 'hinten rechts' };

/**
 * Roof of a round tower: flat roofs stay flat, otherwise the style decides (dome, battlements
 * on symmetric D, cone); an explicitly wished profile always gives a cone shaped by it.
 */
export function roundRoofFor(
  input: Pick<HouseInput, 'styleId' | 'roofType' | 'roofProfile'>,
  battlements: boolean,
  profileWished = false,
): Pick<RoundSpec, 'roof' | 'slope' | 'coneProfile'> {
  const p = input.roofProfile;
  const coneProfile = p === 'bell' || p === 'flared' || p === 'ogee' ? 'concave' : p === 'convex' ? 'convex' : 'linear';
  if (input.roofType === 'flat' || (input.styleId === 'modern' && !profileWished)) return { roof: 'flat', slope: 0, coneProfile };
  if (!profileWished && input.styleId === 'mediterranean') return { roof: 'dome', slope: 0, coneProfile };
  if (!profileWished && input.styleId === 'medieval' && battlements) return { roof: 'battlement', slope: 0, coneProfile };
  const styleSlope = input.styleId === 'fantasy' ? 1.5 : input.styleId === 'japanese' || input.styleId === 'cherry' ? 0.6 : 1.1;
  const slope = p === 'steep' ? 1.5 : p === 'shallow' ? 0.6 : p === 'standard' && profileWished ? 1 : styleSlope;
  return { roof: 'cone', slope, coneProfile };
}

export function floorY(plan: Pick<HousePlan, 'plinth' | 'floorHeight'>, storey: number): number {
  return plan.plinth + storey * plan.floorHeight;
}

export function wallTopOf(plan: Pick<HousePlan, 'plinth' | 'floorHeight'>, mass: Pick<Mass, 'floors'>): number {
  return floorY(plan, mass.floors);
}

/** Wall plane of a storey (upper storeys include the jetty). */
export function storeyRect(mass: Mass, storey: number): Rect {
  if (storey === 0) return mass.rect;
  const j = mass.jetty;
  return {
    x0: mass.rect.x0 - (j.west ? 1 : 0),
    x1: mass.rect.x1 + (j.east ? 1 : 0),
    z0: mass.rect.z0 - (j.north ? 1 : 0),
    z1: mass.rect.z1 + (j.south ? 1 : 0),
  };
}

const odd = (n: number) => (n % 2 === 0 ? n + 1 : n);

function roofTypeFor(type: RoofType, w: number, d: number): SectionType {
  // Gable roofs read "barn-like" beyond ~12 depth: switch to hip (research report).
  if ((type === 'gable' || type === 'a_frame') && Math.min(w, d) > 13) return 'hip';
  if (type === 'pagoda') return 'hip';
  return type;
}

/**
 * Masses and roofs from the input. All randomness comes from `rng` (forked per part).
 */
export function planHouse(input: HouseInput, rng: SeededRandom): HousePlan {
  const P = input.plinth;
  const FH = input.floorHeight;
  const W = input.width;
  const D = input.depth;
  const frames = input.styleId !== 'modern' && input.styleId !== 'mediterranean';
  const ridgeMain: 'x' | 'z' = W >= D ? 'x' : 'z';
  const ridgeStyle: RidgeStyle = input.styleId === 'nordic' ? 'log' : input.styleId === 'japanese' ? 'block_slab' : input.styleId === 'medieval' ? 'block_slab' : 'slab';
  const r = rng.fork('masses');

  const main: Mass = {
    id: 'main',
    kind: 'main',
    rect: { x0: 0, z0: 0, x1: W - 1, z1: D - 1 },
    floors: input.floors,
    jetty: input.jetty && input.floors > 1 ? { north: true, south: true } : {},
    joins: {},
    ridgeAxis: ridgeMain,
    roofType: roofTypeFor(input.roofType, W, D),
    profile: input.roofProfile,
    overhang: input.overhang,
    ridgeStyle,
    frames,
    timber: input.timber !== 'none',
  };
  const masses: Mass[] = [main];
  const wingRoof: SectionType = input.roofType === 'flat' ? 'flat' : input.roofType === 'hip' || input.roofType === 'pyramid' ? 'hip' : 'gable';

  // Wings at the back (z > D-1). Width about 60 % of the main depth, odd, at least 5.
  const wingWidth = Math.max(5, odd(Math.min(W - 4, Math.round(D * 0.7))));
  const wingLength = Math.max(4, Math.round(D * 0.6));
  const addWing = (id: string, xCenter: number) => {
    const half = (wingWidth - 1) / 2;
    const rect: Rect = { x0: xCenter - half, x1: xCenter + half, z0: D - 1, z1: D - 1 + wingLength };
    masses.push({
      id,
      kind: 'wing',
      rect,
      floors: Math.max(1, input.floors - (input.floors > 1 && r.chance(0.5) ? 1 : 0)),
      jetty: {},
      joins: { north: true },
      ridgeAxis: 'z',
      roofType: wingRoof,
      profile: input.roofProfile,
      overhang: input.overhang,
      ridgeStyle,
      frames,
      timber: input.timber === 'all',
    });
    main.joins.south = true;
  };
  const leftX = (wingWidth - 1) / 2;
  const rightX = W - 1 - (wingWidth - 1) / 2;
  if (input.wings === 'L') addWing('wing', input.symmetry === 'symmetric' || r.chance(0.5) ? rightX : leftX);
  if (input.wings === 'T') addWing('wing', (W - 1) / 2);
  if (input.wings === 'U') {
    addWing('wing_left', leftX);
    addWing('wing_right', rightX);
  }

  // Rambling houses get a cross gable in front: a short wing protruding 2–3 blocks with its own gable.
  if (input.symmetry === 'rambling' && W >= 9 && input.roofType !== 'flat') {
    const cw = Math.max(5, odd(Math.round(W * 0.45)));
    const cx = input.wings === 'L' && masses.some((m) => m.rect.x0 === 0) ? W - 1 - (cw - 1) / 2 - 1 : (cw - 1) / 2 + 1;
    masses.push({
      id: 'cross',
      kind: 'cross',
      rect: { x0: cx - (cw - 1) / 2, x1: cx + (cw - 1) / 2, z0: -3, z1: 0 },
      floors: input.floors,
      jetty: {},
      joins: { south: true },
      ridgeAxis: 'z',
      roofType: 'gable',
      profile: input.roofProfile,
      overhang: input.overhang,
      ridgeStyle,
      frames,
      timber: input.timber !== 'none',
    });
  }

  // Annex: one storey. A lean-to roof only where it fits under the main eave (main ridge along
  // z, eave at least three blocks above the annex wall top); against a gable end it would cut
  // through the verge, so there the annex gets its own lower gable pointing away (cross wing).
  if (input.annex !== 'none') {
    const aw = 4;
    const ad = Math.max(5, odd(D - 2));
    const left = input.annex === 'left';
    // Blocks between the annex wall top (one storey) and the main wall top on that side.
    const eaveGap = (input.floors - 1) * FH;
    const shedFits = ridgeMain === 'z' && eaveGap >= 3;
    const rect: Rect = left
      ? { x0: -aw, x1: 0, z0: Math.floor((D - ad) / 2), z1: Math.floor((D - ad) / 2) + ad - 1 }
      : { x0: W - 1, x1: W - 1 + aw, z0: Math.floor((D - ad) / 2), z1: Math.floor((D - ad) / 2) + ad - 1 };
    masses.push({
      id: 'annex',
      kind: 'annex',
      rect,
      floors: 1,
      jetty: {},
      joins: left ? { east: true } : { west: true },
      ...(input.roofType === 'flat'
        ? { ridgeAxis: 'z' as const, roofType: 'flat' as const }
        : shedFits
          ? { ridgeAxis: 'z' as const, roofType: 'shed' as const, shedHigh: (left ? 'east' : 'west') as HorizontalDirection, maxRise: eaveGap - 1 }
          : { ridgeAxis: 'x' as const, roofType: 'gable' as const }),
      profile: 'standard',
      overhang: Math.max(1, Math.min(input.overhang, 1)),
      ridgeStyle: shedFits || input.roofType === 'flat' ? 'none' : ridgeStyle,
      frames,
      timber: false,
    });
    if (left) main.joins.west = true;
    else main.joins.east = true;
  }

  // Square tower on a corner, one storey taller than the main body, pyramid roof.
  if (input.tower === 'square') {
    const size = 5;
    const front = input.towerPosition.startsWith('front');
    const left = input.towerPosition.endsWith('left');
    const x0 = left ? -2 : W - size + 2;
    const z0 = front ? -2 : D - size + 2;
    masses.push({
      id: 'tower',
      kind: 'tower',
      rect: { x0, z0, x1: x0 + size - 1, z1: z0 + size - 1 },
      floors: input.floors + 1,
      jetty: {},
      joins: {},
      ridgeAxis: 'x',
      roofType: input.roofType === 'flat' ? 'flat' : 'pyramid',
      profile: input.styleId === 'fantasy' || input.styleId === 'medieval' ? 'steep' : input.roofProfile,
      overhang: 1,
      ridgeStyle: 'block_slab',
      frames,
      timber: input.timber === 'all',
    });
  }

  const notes: string[] = [];
  if ((input.oriel || input.balcony) && input.floors < 2) notes.push('Erker und Balkon brauchen ein Obergeschoss – weggelassen.');

  // Door: in the middle of a panel of the front stud grid – the centre panel (symmetric) or a
  // side panel (asymmetric); with a cross gable in the middle of its front wall.
  const cross = masses.find((m) => m.kind === 'cross');
  let doorX = (W - 1) / 2;
  if (input.symmetry !== 'symmetric' && !cross) {
    const posts = frames ? studPositions(W + 2).map((u) => u - 1) : [-1, W];
    const centres: number[] = [];
    for (let i = 0; i + 1 < posts.length; i++) {
      const u0 = posts[i]! + 1;
      const u1 = posts[i + 1]! - 1;
      if (u1 >= u0 && u0 >= 1 && u1 <= W - 2) centres.push(Math.floor((u0 + u1) / 2));
    }
    const side = centres.filter((u) => u !== (W - 1) / 2 && u >= 2 && u <= W - 3);
    // Facade u counts from the east corner on the north side: x = (W - 1) - u.
    if (side.length > 0) doorX = W - 1 - r.fork('door').pick(side);
    else if (!frames) doorX = r.fork('door').pick([Math.floor(W * 0.3), Math.ceil(W * 0.7) - 1].filter((x) => x >= 2 && x <= W - 3).concat([(W - 1) / 2]));
  }
  if (cross) doorX = Math.round((cross.rect.x0 + cross.rect.x1) / 2);

  // Round tower on a corner (phase 7): its centre sits diagonally one block outside the corner
  // of the main body, so the circle takes in the corner and opens into the house. Positions that collide with the door, the cross
  // gable, wings or the annex move to the next free corner.
  if (input.tower === 'round') {
    const d = W >= 17 && D >= 13 ? 9 : 7;
    const rr = (d - 1) / 2;
    const order: TowerPosition[] = [input.towerPosition, ...(['front_right', 'front_left', 'back_right', 'back_left'] as const).filter((p) => p !== input.towerPosition)];
    const centreOf = (pos: TowerPosition) => ({ cx: pos.endsWith('left') ? -1 : W, cz: pos.startsWith('front') ? -1 : D });
    const clash = (pos: TowerPosition) => {
      const { cx, cz } = centreOf(pos);
      const box = { x0: cx - rr - 1, x1: cx + rr + 1, z0: cz - rr - 1, z1: cz + rr + 1 };
      if (pos.startsWith('front') && Math.abs(cx - doorX) <= rr + 3) return true;
      return masses.some((m) => m !== main && m.rect.x0 <= box.x1 && m.rect.x1 >= box.x0 && m.rect.z0 <= box.z1 && m.rect.z1 >= box.z0);
    };
    const pos = order.find((p) => !clash(p));
    if (pos) {
      if (pos !== input.towerPosition) notes.push(`Rundturm an eine freie Ecke verschoben (${POSITION_LABELS[pos]}).`);
      const { cx, cz } = centreOf(pos);
      const front = pos.startsWith('front');
      const roofSpec = roundRoofFor(input, d === 7 || d === 9);
      masses.push({
        id: 'tower',
        kind: 'tower',
        rect: { x0: cx - rr, z0: cz - rr, x1: cx + rr, z1: cz + rr },
        floors: input.floors + 2,
        jetty: {},
        joins: {},
        ridgeAxis: 'x',
        roofType: 'pyramid',
        profile: input.roofProfile,
        overhang: 1,
        ridgeStyle: 'none',
        frames: false,
        timber: false,
        round: { d, ...roofSpec, ladder: front ? 'north' : 'south', door: null },
      });
    } else notes.push('Rundturm passt an keine Ecke (Tür, Flügel oder Anbau im Weg) – weggelassen.');
  }

  return { input, plinth: P, floorHeight: FH, masses, door: { x: doorX, side: 'north' }, notes };
}

/** Roof materials from the palette roles. */
export function roofMaterials(m: RoleMaterials): RoofMaterials {
  return { roof: m.roof, trim: m.roofTrim, ridge: m.ridge, soffit: m.soffit, gable: m.upperWall };
}

/** Roof section of a mass (outer frame plane of its top storey + overhang). */
export function roofSection(plan: HousePlan, mass: Mass, materials: RoleMaterials): RoofSectionSpec {
  const top = storeyRect(mass, Math.max(0, mass.floors - 1));
  const f = mass.frames ? 1 : 0;
  const role = (r: Role) => materials[r];
  return {
    id: mass.id,
    x0: top.x0 - f,
    z0: top.z0 - f,
    x1: top.x1 + f,
    z1: top.z1 + f,
    wallTop: wallTopOf(plan, mass),
    type: mass.roofType,
    ridgeAxis: mass.ridgeAxis,
    profile: mass.profile,
    overhang: mass.overhang,
    materials: { ...roofMaterials(materials), gable: role(mass.timber ? 'infill' : 'upperWall') },
    ridgeStyle: mass.ridgeStyle,
    // Timber gables sit one block behind the verge so the frame can stand in front (research 01/06).
    gableRecess: mass.timber,
    soffit: true,
    ...(mass.shedHigh ? { shedHigh: mass.shedHigh } : {}),
    maxRise: mass.maxRise ?? (mass.kind === 'tower' ? 12 : roofRiseCap(plan, mass)),
    // Weathered roof blend (dark streaks from the eave); modern roofs stay uniform.
    ...(plan.input.styleId === 'modern' ? {} : { blendSeed: (plan.input.seed ^ [...mass.id].reduce((h, ch) => Math.imul(h, 31) + ch.charCodeAt(0), 7)) >>> 0 }),
  };
}

/** Style rise cap for a mass: about one to two storeys of roof, relative to its wall height. */
export function roofRiseCap(plan: HousePlan, mass: Pick<Mass, 'floors'>): number {
  const { factor, min, max } = plan.input.style.proportions.roofRise;
  return Math.max(min, Math.min(max, Math.round(factor * wallTopOf(plan, mass))));
}
