import type { HorizontalDirection } from '@/core/blocks/directions';
import type { RidgeStyle, RoofMaterials, RoofSectionSpec, SectionType } from '@/core/generator/roof/roofEngine';
import type { ProfileName } from '@/core/generator/roof/profiles';
import type { SeededRandom } from '@/core/generator/seededRandom';
import type { Role } from '@/core/style/palettes';
import type { RoofProfile, RoofType, StyleDef, StyleId, Theme } from '@/core/style/styles';
import type { RoleMaterials } from '@/core/templates/place';
import { studPositions } from '@/core/generator/house/studs';
import type { CompositionPlan, CrossPart } from '@/core/generator/house/composition';
import { planRoofs } from '@/core/generator/roof/roofEngine';

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
  annex: 'none' | 'left' | 'right' | 'back';
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
  /** Archetype of the masses (phase 2); null = the classic single-body rules (tower, station). */
  composition: CompositionPlan | null;
  /** Porch kind when `porch` is set: canopy over the door, veranda along the front, engawa deck. */
  porchKind: 'canopy' | 'veranda' | 'engawa';
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
  /** Upper storeys step in by this many blocks per side and storey (pagoda tiers). */
  setback?: number;
  /** Own footprint of the upper storeys (stacked, shifted cube); replaces the jetty. */
  upper?: Rect;
}

export interface HousePlan {
  input: HouseInput;
  plinth: number;
  floorHeight: number;
  masses: Mass[];
  /** Door on the front (north) of `mass` (default: the cross gable, else the main body). */
  door: { x: number; side: HorizontalDirection; mass?: string };
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

/**
 * True if this side of the mass opens into another mass at storey k. A one-storey annex only
 * joins the ground floor; the storeys above it are an ordinary facade with windows.
 */
export function joinedAt(plan: Pick<HousePlan, 'masses'>, mass: Mass, side: HorizontalDirection, k: number): boolean {
  if (!mass.joins[side]) return false;
  const r = mass.rect;
  return plan.masses.some((o) => {
    if (o === mass || o.round || o.floors <= k) return false;
    const q = o.rect;
    const overlapX = q.x0 <= r.x1 && q.x1 >= r.x0;
    const overlapZ = q.z0 <= r.z1 && q.z1 >= r.z0;
    switch (side) {
      case 'east':
        return overlapZ && q.x0 <= r.x1 && q.x1 > r.x1 - 1;
      case 'west':
        return overlapZ && q.x1 >= r.x0 && q.x0 < r.x0 + 1;
      case 'south':
        return overlapX && q.z0 <= r.z1 && q.z1 > r.z1 - 1;
      case 'north':
        return overlapX && q.z1 >= r.z0 && q.z0 < r.z0 + 1;
    }
  });
}

/** Wall plane of a storey (upper storeys include the jetty, the setback or their own footprint). */
export function storeyRect(mass: Mass, storey: number): Rect {
  if (storey === 0) return mass.rect;
  if (mass.upper) return mass.upper;
  const j = mass.jetty;
  const s = (mass.setback ?? 0) * storey;
  return {
    x0: mass.rect.x0 - (j.west ? 1 : 0) + s,
    x1: mass.rect.x1 + (j.east ? 1 : 0) - s,
    z0: mass.rect.z0 - (j.north ? 1 : 0) + s,
    z1: mass.rect.z1 + (j.south ? 1 : 0) - s,
  };
}

/** The mass whose front carries the entrance. */
export function doorMassOf(plan: Pick<HousePlan, 'masses' | 'door'>): Mass {
  return plan.masses.find((m) => m.id === plan.door.mass) ?? plan.masses.find((m) => m.kind === 'cross') ?? plan.masses[0]!;
}

/** True if another (square) mass occupies (x, z) at storey k: its wall ring or its rooms. */
export function occupiedByOther(plan: Pick<HousePlan, 'masses'>, mass: Mass, x: number, z: number, k: number): boolean {
  return plan.masses.some((o) => {
    if (o === mass || o.round || o.floors <= k) return false;
    const q = storeyRect(o, k);
    return x >= q.x0 && x <= q.x1 && z >= q.z0 && z <= q.z1;
  });
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
  const comp = input.composition;
  const frames = input.styleId !== 'modern' && input.styleId !== 'mediterranean';
  const ridgeMain: 'x' | 'z' = W >= D ? 'x' : 'z';
  const ridgeStyle: RidgeStyle = input.styleId === 'nordic' ? 'log' : input.styleId === 'japanese' ? 'block_slab' : input.styleId === 'medieval' ? 'block_slab' : 'slab';
  const r = rng.fork('masses');
  const notes: string[] = [];

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
  // Pagoda tiers: every upper storey steps in on all sides (its own roof ring below it).
  if (comp?.setback && input.floors > 1 && Math.min(W, D) - 2 * comp.setback * (input.floors - 1) >= 5) {
    main.setback = comp.setback;
    main.jetty = {};
  }
  // Modern stacked cube: the upper storeys have their own footprint, shifted to one end and
  // optionally cantilevered beyond it; the rest of the lower roof becomes a terrace.
  if (comp?.upper && input.floors > 1) {
    const u = comp.upper;
    const uw = Math.max(5, odd(Math.min(W - 2, Math.round(W * u.widthRatio))));
    const x0 = u.side === 'east' ? W - uw + u.cantilever : -u.cantilever;
    main.upper = { x0, x1: x0 + uw - 1, z0: Math.min(u.depthDelta, D - 5), z1: D - 1 };
    main.jetty = {};
  }
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
  };
  const leftX = (wingWidth - 1) / 2;
  const rightX = W - 1 - (wingWidth - 1) / 2;
  if (input.wings === 'L') addWing('wing', input.symmetry === 'symmetric' || r.chance(0.5) ? rightX : leftX);
  if (input.wings === 'T') addWing('wing', (W - 1) / 2);
  if (input.wings === 'U') {
    addWing('wing_left', leftX);
    addWing('wing_right', rightX);
  }

  // Masses in front of the main body (research 19 T1/T2): cross gable (Zwerchhaus), cross wing
  // (L, flush with one end), entrance vestibule. Narrower than the main span so their ridge stays
  // below the main ridge; a rambling house without archetype parts keeps its classic cross gable.
  const legacy: CrossPart[] =
    input.symmetry === 'rambling' && W >= 9 && input.roofType !== 'flat'
      ? [{ align: input.wings === 'L' && masses.some((m) => m.rect.x0 === 0) ? 'east' : 'west', widthRatio: 0.45, minWidth: 5, protrude: 3, floorsDelta: 0, door: true }]
      : [];
  const parts = comp && comp.cross.length > 0 ? comp.cross : legacy;
  const crossRoof: SectionType = input.roofType === 'flat' ? 'flat' : input.roofType === 'hip' || input.roofType === 'pyramid' ? 'hip' : 'gable';
  let doorCross: Mass | null = null;
  let wingCross: Mass | null = null;
  parts.forEach((part, i) => {
    let cap = ridgeMain === 'x' ? D - 2 : W - 4;
    if (cap % 2 === 0) cap--;
    if (cap < part.minWidth) {
      notes.push('Der Quergiebel passt an diesem schmalen Hauptbau nicht – weggelassen.');
      return;
    }
    const cw = Math.min(cap, Math.max(part.minWidth, odd(Math.round(W * part.widthRatio))));
    const half = (cw - 1) / 2;
    const third = Math.round((W - 1) / 3);
    const want = { centre: (W - 1) / 2, east: W - 1 - half, west: half, third_east: W - 1 - third, third_west: third }[part.align];
    const cx = Math.max(half, Math.min(W - 1 - half, want));
    const m: Mass = {
      id: i === 0 ? 'cross' : `cross${i}`,
      kind: 'cross',
      rect: { x0: cx - half, x1: cx + half, z0: -part.protrude, z1: 0 },
      floors: Math.max(1, Math.min(input.floors, input.floors + part.floorsDelta)),
      jetty: {},
      joins: { south: true },
      ridgeAxis: 'z',
      roofType: crossRoof,
      profile: input.roofProfile,
      overhang: input.overhang,
      ridgeStyle,
      frames,
      timber: input.timber !== 'none',
    };
    masses.push(m);
    if (part.door && !doorCross) doorCross = m;
    else if (!part.door && !wingCross) wingCross = m;
  });

  // Annex: one storey. A lean-to roof only where it fits under the main eave (eave at least three
  // blocks above the annex wall top, the main slope running down towards it); otherwise the
  // annex gets its own lower gable pointing away (cross wing).
  if (input.annex !== 'none') {
    const spec = comp?.annex ?? null;
    // Modern: a wide one-storey cube shifted two blocks forward (offset volumes, research 12).
    const modernCube = input.styleId === 'modern' && !spec;
    const eaveGap = (input.floors - 1) * FH;
    if (input.annex === 'back') {
      const aw = Math.max(5, odd(Math.min(W - 4, spec?.width ?? 5)));
      const ad = Math.max(4, Math.round(D * (spec?.depthRatio ?? 0.5)));
      const third = Math.round((W - 1) / 3);
      const ax = r.fork('annexBack').chance(0.5) ? third : W - 1 - third;
      const cx = Math.max((aw - 1) / 2, Math.min(W - 1 - (aw - 1) / 2, ax));
      const rect: Rect = { x0: cx - (aw - 1) / 2, x1: cx + (aw - 1) / 2, z0: D - 1, z1: D - 1 + ad };
      if (masses.some((m) => m.kind === 'wing' && m.rect.x0 <= rect.x1 && m.rect.x1 >= rect.x0)) notes.push('Der Anbau hinten hat neben dem Flügel keinen Platz – weggelassen.');
      else {
        const shedFits = ridgeMain === 'x' && eaveGap >= 3;
        masses.push({
          id: 'annex',
          kind: 'annex',
          rect,
          floors: 1,
          jetty: {},
          joins: { north: true },
          ...(input.roofType === 'flat'
            ? { ridgeAxis: 'x' as const, roofType: 'flat' as const }
            : shedFits
              ? { ridgeAxis: 'x' as const, roofType: 'shed' as const, shedHigh: 'north' as HorizontalDirection, maxRise: eaveGap - 1 }
              : { ridgeAxis: 'z' as const, roofType: 'gable' as const }),
          profile: 'standard',
          overhang: Math.max(1, Math.min(input.overhang, 1)),
          ridgeStyle: shedFits || input.roofType === 'flat' ? 'none' : ridgeStyle,
          frames,
          timber: false,
        });
      }
    } else {
      const aw = modernCube ? Math.max(5, odd(Math.round(W * 0.6))) - 1 : (spec?.width ?? 4);
      const ad = spec ? Math.max(5, odd(Math.min(D - 2, Math.round(D * spec.depthRatio)))) : Math.max(5, odd(D - 2));
      const az0 = modernCube ? -2 : Math.floor((D - ad) / 2);
      const left = input.annex === 'left';
      const shedFits = ridgeMain === 'z' && eaveGap >= 3;
      const rect: Rect = left ? { x0: -aw, x1: 0, z0: az0, z1: az0 + ad - 1 } : { x0: W - 1, x1: W - 1 + aw, z0: az0, z1: az0 + ad - 1 };
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
    }
  }

  // A jetty never runs into an attached mass (it would stand as a wall inside its rooms).
  if (masses.some((m) => m.kind === 'cross')) main.jetty = { ...main.jetty, north: false };
  if (masses.some((m) => (m.kind === 'wing' || m.kind === 'annex') && m.rect.z0 >= D - 1)) main.jetty = { ...main.jetty, south: false };

  if ((input.oriel || input.balcony) && input.floors < 2) notes.push('Erker und Balkon brauchen ein Obergeschoss – weggelassen.');

  // Door: in the front cross part that carries it, in the inner corner of an L, or in the middle
  // of a panel of the front stud grid – the centre panel (symmetric) or a side panel.
  const posts = frames ? studPositions(W + 2).map((u) => u - 1) : [-1, W];
  const centres: number[] = [];
  for (let i = 0; i + 1 < posts.length; i++) {
    const u0 = posts[i]! + 1;
    const u1 = posts[i + 1]! - 1;
    // Facade u counts from the east corner on the north side: x = (W - 1) - u.
    if (u1 >= u0 && u0 >= 1 && u1 <= W - 2) centres.push(W - 1 - Math.floor((u0 + u1) / 2));
  }
  const frontParts = masses.filter((m) => m.kind === 'cross');
  const clearOfParts = (x: number) => frontParts.every((m) => x < m.rect.x0 - 1 || x > m.rect.x1 + 1);
  let doorX = (W - 1) / 2;
  let doorMass = 'main';
  const dc = doorCross as Mass | null;
  const wc = wingCross as Mass | null;
  if (dc) {
    doorX = Math.round((dc.rect.x0 + dc.rect.x1) / 2);
    doorMass = dc.id;
  } else if (wc && (comp?.door === 'inner_corner' || input.symmetry !== 'symmetric')) {
    // Inner corner of the L: the column nearest to the wing that keeps two blocks to its wall
    // (room for the door jambs and lanterns), preferring a panel centre.
    const columns = Array.from({ length: W }, (_, x) => x).filter((x) => x >= 2 && x <= W - 3 && (x <= wc.rect.x0 - 3 || x >= wc.rect.x1 + 3) && clearOfParts(x));
    const near = (x: number) => Math.min(Math.abs(x - wc.rect.x0), Math.abs(x - wc.rect.x1)) - (centres.includes(x) ? 0.5 : 0);
    if (columns.length > 0) doorX = columns.reduce((a, x) => (near(x) < near(a) ? x : a));
  } else if (input.symmetry !== 'symmetric') {
    const side = centres.filter((x) => x !== (W - 1) / 2 && x >= 2 && x <= W - 3 && clearOfParts(x));
    if (side.length > 0) doorX = r.fork('door').pick(side);
    else if (!frames) doorX = r.fork('door').pick([Math.floor(W * 0.3), Math.ceil(W * 0.7) - 1].filter((x) => x >= 2 && x <= W - 3 && clearOfParts(x)).concat([(W - 1) / 2]));
  }

  // Towers keep clear of the door and of the other masses; a taken corner moves to the next one.
  const allPositions = ['front_right', 'front_left', 'back_right', 'back_left'] as const;
  const order: TowerPosition[] = [input.towerPosition, ...allPositions.filter((p) => p !== input.towerPosition)];
  const towerClash = (box: Rect, front: boolean, reach: number) =>
    (front && doorMass === 'main' && box.x0 - reach <= doorX && box.x1 + reach >= doorX) ||
    masses.some((m) => m !== main && m.rect.x0 <= box.x1 && m.rect.x1 >= box.x0 && m.rect.z0 <= box.z1 && m.rect.z1 >= box.z0);

  // Square tower on a corner: clearly above the main ridge (research 19 T10: wall top ≥ ridge + 2),
  // scaled with the house; a pyramid or (phase 3) a stepped cap.
  if (input.tower === 'square') {
    const size = comp?.tower?.kind === 'square' && comp.tower.size ? comp.tower.size : 5;
    const at = (pos: TowerPosition): Rect => {
      const x0 = pos.endsWith('left') ? -2 : W - size + 2;
      const z0 = pos.startsWith('front') ? -2 : D - size + 2;
      return { x0, z0, x1: x0 + size - 1, z1: z0 + size - 1 };
    };
    const pos = order.find((p) => !towerClash(at(p), p.startsWith('front'), 2));
    if (pos) {
      if (pos !== input.towerPosition) notes.push(`Turm an eine freie Ecke verschoben (${POSITION_LABELS[pos]}).`);
      let floors = input.floors + 1;
      if (comp && input.roofType !== 'flat') {
        const probe: HousePlan = { input, plinth: P, floorHeight: FH, masses: [main], door: { x: doorX, side: 'north' }, notes: [] };
        const ridge = planRoofs([roofSection(probe, main, input.materials)]).topY;
        floors = Math.max(floors, Math.ceil((ridge + 2 - P) / FH));
      }
      masses.push({
        id: 'tower',
        kind: 'tower',
        rect: at(pos),
        floors,
        jetty: {},
        joins: {},
        ridgeAxis: 'x',
        roofType: input.roofType === 'flat' ? 'flat' : 'pyramid',
        profile: input.styleId === 'fantasy' || input.styleId === 'medieval' ? 'steep' : input.roofProfile,
        overhang: 1,
        ridgeStyle: 'block_slab',
        frames,
        timber: false,
      });
    } else notes.push('Der Turm passt an keine Ecke (Tür, Flügel oder Anbau im Weg) – weggelassen.');
  }

  // Round tower on a corner (phase 7): its centre sits diagonally one block outside the corner
  // of the main body, so the circle takes in the corner and opens into the house.
  if (input.tower === 'round') {
    // D 9 and 11 read as octagons; houses get D 7, very large ones D 13 (research 16, diameter ladder).
    const d = Math.min(W, D) >= 21 ? 13 : 7;
    const rr = (d - 1) / 2;
    const centreOf = (pos: TowerPosition) => ({ cx: pos.endsWith('left') ? -1 : W, cz: pos.startsWith('front') ? -1 : D });
    const box = (pos: TowerPosition): Rect => {
      const { cx, cz } = centreOf(pos);
      return { x0: cx - rr - 1, x1: cx + rr + 1, z0: cz - rr - 1, z1: cz + rr + 1 };
    };
    const pos = order.find((p) => !towerClash(box(p), p.startsWith('front'), 2));
    if (pos) {
      if (pos !== input.towerPosition) notes.push(`Rundturm an eine freie Ecke verschoben (${POSITION_LABELS[pos]}).`);
      const { cx, cz } = centreOf(pos);
      const front = pos.startsWith('front');
      const roofSpec = roundRoofFor(input, true);
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

  return { input, plinth: P, floorHeight: FH, masses, door: { x: doorX, side: 'north', mass: doorMass }, notes };
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
    // The annex roof runs on under the main eave where both meet.
    ...(mass.kind === 'annex' ? { layer: 1 } : {}),
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
