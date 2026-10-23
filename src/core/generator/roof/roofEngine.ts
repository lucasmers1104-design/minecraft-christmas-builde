import type { HorizontalDirection } from '@/core/blocks/directions';
import { AIR, blockState, propsOf } from '@/core/blocks/registry';
import { Priority, type PriorityValue, type VoxelBuilder } from '@/core/generator/geometry';
import { columnPieces, pickPitch, profileDeltas, tops, type Piece, type PitchId, type ProfileName } from '@/core/generator/roof/profiles';
import { formOf, requireForm } from '@/core/style/materials';
import type { RoofType } from '@/core/style/styles';

/**
 * Roof engine. A roof is a set of sections (main house, wings, annex, dormers, tower). Each
 * section is a height field over its footprint (walls + overhang): every column has a ring or
 * row index d (distance from the eave), a facing towards the ridge and a top height from the
 * Δ profile. Sections are combined by taking the highest surface per column – that is the
 * "build from the highest section down, remove what lies inside the V" rule of the wiki, so
 * hips, valleys and dormer intersections need no special cases; the state resolver turns the
 * corner stairs into outer_* (hips) and inner_* (valleys).
 *
 * Details per section: overhang on all four sides, contrast trim on the outermost ring and the
 * verges, a cornice of upside-down stairs under the eaves, a 1-block "board" of upside-down
 * stairs under the verges, five ridge variants, gable infill (optionally recessed by one block)
 * and a rise cap of 7 blocks per section.
 */

export type SectionType = RoofType | 'shed' | 'skirt';
export type RidgeStyle = 'slab' | 'block' | 'block_slab' | 'wall' | 'log' | 'none';

export interface RoofMaterials {
  roof: string;
  trim: string;
  ridge: string;
  soffit: string;
  gable: string;
}

export interface RoofSectionSpec {
  id: string;
  /** Wall footprint (outer wall faces), inclusive. */
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  /** Highest wall layer; the eave hangs next to it, the roof rests on it. */
  wallTop: number;
  type: SectionType;
  /** Ridge direction of gable-like roofs (long side by default). */
  ridgeAxis: 'x' | 'z';
  profile: ProfileName;
  overhang: number;
  materials: RoofMaterials;
  ridgeStyle?: RidgeStyle;
  /** Gable wall one block behind the verge (shadow line). */
  gableRecess?: boolean;
  /** Cornice under the eaves and boards under the verges. */
  soffit?: boolean;
  /** Shed roofs: the high side. */
  shedHigh?: HorizontalDirection;
  /** Skirt roofs (pagoda tiers): number of rings. */
  rings?: number;
  /** Max rise in blocks (default 7). */
  maxRise?: number;
  /** Pitch ladder step shared by the whole house (planar profiles; see `housePitch`). */
  pitch?: PitchId;
  /** Seed for the roof material blend (unset: one material only). */
  blendSeed?: number;
  /** Fill the gable triangles (default true for gable-like types). */
  gables?: boolean;
  priority?: PriorityValue;
}

interface Column {
  section: number;
  d: number;
  /** Absolute top in half blocks. */
  top: number;
  pieces: { y: number; state: string }[];
  /** Direction towards the ridge (null for ridge / flat columns). */
  facing: HorizontalDirection | null;
  ridge: boolean;
  trim: boolean;
  /** Column on the verge (gable end overhang). */
  verge: boolean;
  /** Column outside the walls on an eave side. */
  eave: boolean;
  lowest: number;
}

export interface EaveCell {
  x: number;
  y: number;
  z: number;
  /** Direction away from the wall (outwards). */
  outward: HorizontalDirection;
}

export interface RoofResult {
  /** Highest block row used by the roof. */
  topY: number;
  /** y of the ridge per section id. */
  ridgeY: Record<string, number>;
  /** Gable infill cells (for windows and beams). */
  gableCells: { x: number; y: number; z: number; section: string; side: HorizontalDirection }[];
  /** Free cells directly under the outer edge of the eaves (garlands, hanging lanterns). */
  eaveCells: EaveCell[];
  /** Roof surface height (block y of the top piece) per column "x,z". */
  surface: Map<string, number>;
}

const key = (x: number, z: number) => `${x},${z}`;

function stairs(material: string, facing: HorizontalDirection, half: 'top' | 'bottom'): string {
  return blockState(requireForm(material, 'stairs'), { facing, half });
}
function slab(material: string, type: 'top' | 'bottom' | 'double'): string {
  return blockState(requireForm(material, 'slab'), { type });
}
function full(material: string): string {
  return blockState(requireForm(material, 'block'));
}

function pieceState(p: Piece, material: string, facing: HorizontalDirection | null): string {
  switch (p.kind) {
    case 'stairs':
      return facing ? stairs(material, facing, 'bottom') : full(material);
    case 'slab_bottom':
      return slab(material, 'bottom');
    case 'slab_top':
      return slab(material, 'top');
    case 'full':
      return full(material);
  }
}

/** Footprint including the overhang. */
function outer(s: RoofSectionSpec) {
  return { X0: s.x0 - s.overhang, X1: s.x1 + s.overhang, Z0: s.z0 - s.overhang, Z1: s.z1 + s.overhang };
}

const GABLE_LIKE: ReadonlySet<SectionType> = new Set(['gable', 'gambrel', 'a_frame', 'saltbox', 'half_hip']);

/** Effective profile of a section type (gambrel = convex, mansard rings, a-frame steep). */
function profileFor(s: RoofSectionSpec): ProfileName {
  if (s.type === 'gambrel') return 'convex';
  if (s.type === 'mansard') return 'mansard';
  if (s.type === 'a_frame') return 'steep';
  return s.profile;
}

interface Layout {
  d: number;
  facing: HorizontalDirection | null;
  ridge: boolean;
  verge: boolean;
  /** Slope columns per side (n). */
  n: number;
}

/** Ring/row index, facing and role of one column of a section. */
function layoutAt(s: RoofSectionSpec, x: number, z: number): Layout | null {
  const { X0, X1, Z0, Z1 } = outer(s);
  if (x < X0 || x > X1 || z < Z0 || z > Z1) return null;
  const fz = z - Z0; // distance to the north edge
  const bz = Z1 - z;
  const fx = x - X0;
  const bx = X1 - x;
  const along = s.ridgeAxis;
  const W = X1 - X0 + 1;
  const D = Z1 - Z0 + 1;
  const zFacing: HorizontalDirection = fz < bz ? 'south' : 'north';
  const xFacing: HorizontalDirection = fx < bx ? 'east' : 'west';
  const dz = Math.min(fz, bz);
  const dx = Math.min(fx, bx);

  switch (s.type) {
    case 'shed': {
      const high = s.shedHigh ?? 'north';
      const span = high === 'north' || high === 'south' ? D : W;
      const d = high === 'north' ? bz : high === 'south' ? fz : high === 'west' ? bx : fx;
      return { d, facing: high, ridge: false, verge: high === 'north' || high === 'south' ? x < s.x0 || x > s.x1 : z < s.z0 || z > s.z1, n: span };
    }
    case 'flat':
      return { d: Math.min(dx, dz), facing: null, ridge: false, verge: false, n: 0 };
    case 'hip':
    case 'pyramid':
    case 'mansard':
    case 'skirt': {
      const n = Math.floor((Math.min(W, D) - 1) / 2);
      const d = Math.min(dx, dz);
      if (s.type === 'skirt' && d >= (s.rings ?? 2)) return null;
      // Ridge: the centre line of the short axis (odd span), between the hips.
      const ridge = (W <= D ? fx === bx && dx <= dz : fz === bz && dz <= dx) && s.type !== 'skirt';
      let facing: HorizontalDirection | null = dz < dx ? zFacing : dx < dz ? xFacing : W >= D ? zFacing : xFacing;
      if (ridge) facing = null;
      return { d, facing, ridge, verge: false, n };
    }
    default: {
      // Gable-like: rows along the ridge axis; slopes towards it.
      const span = along === 'x' ? D : W;
      const n = Math.floor((span - 1) / 2);
      const across = along === 'x' ? dz : dx;
      const tie = along === 'x' ? fz === bz : fx === bx;
      const facing = tie ? null : along === 'x' ? zFacing : xFacing;
      const verge = along === 'x' ? x < s.x0 || x > s.x1 : z < s.z0 || z > s.z1;
      if (s.type === 'half_hip') {
        // Jerkinhead: the gable is cut by a small hip near the ridge.
        const shift = Math.max(1, Math.ceil(n / 2));
        const endDist = (along === 'x' ? dx : dz) + shift;
        if (endDist < across || (tie && endDist <= across)) {
          return { d: endDist, facing: along === 'x' ? xFacing : zFacing, ridge: false, verge: false, n };
        }
      }
      return { d: across, facing, ridge: tie, verge, n };
    }
  }
}

/** Δ profile and tops for a section (cached per section). */
function sectionTops(s: RoofSectionSpec, n: number): number[] {
  const profile = s.type === 'saltbox' ? 'standard' : profileFor(s);
  if (s.type === 'a_frame' || s.type === 'skirt') return tops(profileDeltas(profile, n, 14));
  // The rise limit counts from the wall top: profiles with a flat eave (bell, flared) lift the
  // base above the wall, so their cap shrinks by that lift.
  const maxRise = s.maxRise ?? 7;
  let t = tops(profileDeltas(profile, n, maxRise, s.pitch));
  for (let cap = maxRise - 1; cap >= 3; cap--) {
    const lift = baseY(s, t) - s.wallTop;
    if (Math.ceil(Math.max(0, ...t) / 2) + lift <= maxRise) break;
    t = tops(profileDeltas(profile, n, cap, s.pitch));
  }
  return t;
}

/**
 * Roof blend partners (research 07 T1, 06 R23, 13 P3): a darker sister material runs up from
 * the eave in streaks along the fall line (water), a lighter one bleaches a few cells near the
 * ridge. Only the material changes; facing, half and shape stay, so the resolver computes the
 * same corners. Materials without a fitting sister stay plain.
 */
const ROOF_BLEND: Readonly<Record<string, { darker?: string; lighter?: string }>> = {
  spruce_planks: { darker: 'dark_oak_planks', lighter: 'oak_planks' },
  dark_oak_planks: { lighter: 'spruce_planks' },
  oak_planks: { darker: 'spruce_planks', lighter: 'birch_planks' },
  birch_planks: { darker: 'oak_planks' },
  jungle_planks: { darker: 'spruce_planks' },
  deepslate_tiles: { darker: 'cobbled_deepslate', lighter: 'deepslate_bricks' },
  polished_deepslate: { darker: 'deepslate_tiles', lighter: 'deepslate_bricks' },
  deepslate_bricks: { darker: 'deepslate_tiles' },
  bricks: { lighter: 'granite' },
  cobblestone: { darker: 'mossy_cobblestone', lighter: 'andesite' },
  stone_bricks: { darker: 'mossy_stone_bricks' },
  tuff_bricks: { darker: 'tuff', lighter: 'polished_tuff' },
};

/** Share of darker-partner columns by distance from the eave: 55 / 35 / 15 / 5 %. */
const DRIP = [0.55, 0.35, 0.15, 0.05];

function hash(...v: number[]): number {
  let h = 0x811c9dc5;
  for (const n of v) {
    h ^= n | 0;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d) >>> 0;
  return (h >>> 8) / 0x1000000;
}

function blendedRoof(s: RoofSectionSpec, x: number, z: number, l: Layout): string {
  const blend = s.blendSeed === undefined ? undefined : ROOF_BLEND[s.materials.roof];
  if (!blend || l.ridge || !l.facing || l.n < 3) return s.materials.roof;
  // Coordinate along the eave of this slope face: one streak length per eave column.
  const a = l.facing === 'north' || l.facing === 'south' ? x : z;
  const face = ['north', 'east', 'south', 'west'].indexOf(l.facing);
  if (blend.darker) {
    const r = hash(s.blendSeed!, a, face, 1);
    let streak = 0;
    while (streak < DRIP.length && r < DRIP[streak]!) streak++;
    if (l.d < streak) return blend.darker;
  }
  if (blend.lighter) {
    // Sun bleaching: short streaks down from the ridge (1–2 rows) on some columns.
    const r = hash(s.blendSeed!, a, face, 2);
    const streak = r < 0.08 ? 2 : r < 0.2 ? 1 : 0;
    if (l.d >= l.n - streak) return blend.lighter;
  }
  return s.materials.roof;
}

/** Number of slope columns (eave to ridge) of a section. */
export function slopeColumns(s: RoofSectionSpec): number {
  const { X0, Z0 } = outer(s);
  return layoutAt(s, X0, Z0)?.n ?? 0;
}

/**
 * Ladder step for a whole house, taken from its main section (research 05: one pitch per
 * building; wings, cross gables and annexes follow it instead of picking their own), never
 * below the style's minimum pitch. Undefined for curved profiles and flat roofs.
 */
export function housePitch(main: RoofSectionSpec, floor: PitchId = 'P27'): PitchId | undefined {
  if (main.type === 'flat' || main.type === 'shed' || main.type === 'a_frame' || main.type === 'skirt') return undefined;
  const profile = main.type === 'saltbox' ? 'standard' : profileFor(main);
  return pickPitch(profile, Math.max(1, slopeColumns(main)), main.maxRise ?? 7, undefined, floor);
}

/**
 * Irimoya (research 05 T-irimoya, 11 Empf. 1): a hip roof over the whole footprint and a
 * gable roof of the same pitch, shortened at both ridge ends by about a third of the slope.
 * The column union keeps the higher surface, so the hip runs round below and the gable
 * triangle stands on it at the ends, its verge overhanging the hip slope. Too short a house
 * keeps the plain hip.
 */
export function irimoyaSections(s: RoofSectionSpec): RoofSectionSpec[] {
  const hip: RoofSectionSpec = { ...s, type: 'hip' };
  const n = slopeColumns({ ...s, type: 'gable' });
  const k = Math.max(2, Math.min(n - 2, Math.round(0.35 * n)));
  const alongX = s.ridgeAxis === 'x';
  const length = alongX ? s.x1 - s.x0 + 1 : s.z1 - s.z0 + 1;
  if (n < 4 || length - 2 * k < 3) return [hip];
  const gable: RoofSectionSpec = {
    ...s,
    id: `${s.id}-gable`,
    type: 'gable',
    gableRecess: false,
    ...(alongX ? { x0: s.x0 + k, x1: s.x1 - k } : { z0: s.z0 + k, z1: s.z1 - k }),
  };
  return [hip, gable];
}

/** Roof base y: the column above the wall line rests on the wall top. */
function baseY(s: RoofSectionSpec, t: readonly number[]): number {
  const oh = Math.min(s.overhang, Math.max(0, t.length - 1));
  const atWall = t[oh] ?? 0;
  return s.wallTop + 1 - Math.floor((atWall - 1) / 2);
}

function sectionColumns(s: RoofSectionSpec, index: number): { columns: Map<string, Column>; base: number } {
  const columns = new Map<string, Column>();
  const { X0, X1, Z0, Z1 } = outer(s);
  const sample = layoutAt(s, X0, Z0);
  const n = sample?.n ?? 0;
  const t = s.type === 'flat' ? [] : sectionTops(s, Math.max(n, 1));
  const base = s.type === 'flat' ? s.wallTop + 1 : baseY(s, t);
  const m = s.materials;
  const ridgeStyle = s.ridgeStyle ?? 'slab';
  for (let x = X0; x <= X1; x++)
    for (let z = Z0; z <= Z1; z++) {
      const l = layoutAt(s, x, z);
      if (!l) continue;
      const outside = x < s.x0 || x > s.x1 || z < s.z0 || z > s.z1;
      // Contrast only as a thin barge board on the outermost verge column; the eaves stay in
      // the roof material (research 06: a full contrast ring covered 36–43 % of the roof).
      const trim = l.verge && (s.ridgeAxis === 'x' || s.type === 'shed' ? x === X0 || x === X1 : z === Z0 || z === Z1);
      const material = trim ? m.trim : blendedRoof(s, x, z, l);
      const pieces: { y: number; state: string }[] = [];
      let topHalf: number;
      if (s.type === 'flat') {
        const edge = l.d === 0;
        pieces.push({ y: base, state: edge ? full(m.trim) : slab(m.roof, 'bottom') });
        if (edge) pieces.push({ y: base + 1, state: slab(m.trim, 'bottom') });
        topHalf = base * 2 + (edge ? 3 : 1);
      } else if (l.ridge) {
        const tPrev = t[Math.min(l.d, t.length) - 1] ?? 0;
        topHalf = base * 2 + tPrev;
        const y0 = base + Math.floor(tPrev / 2);
        const odd = tPrev % 2 === 1;
        const ridgeMat = m.ridge;
        const cap = (y: number) => {
          pieces.push({ y, state: slab(formOf(ridgeMat, 'slab') ? ridgeMat : m.roof, 'bottom') });
          topHalf = y * 2 + 1;
        };
        if (odd) {
          pieces.push({ y: base + (tPrev - 1) / 2, state: slab(m.roof, 'top') });
          if (ridgeStyle !== 'none') cap(base + (tPrev + 1) / 2);
        } else if (ridgeStyle === 'slab') cap(y0);
        else if (ridgeStyle === 'none') pieces.push({ y: y0, state: slab(m.roof, 'bottom') });
        else {
          const log = ridgeStyle === 'log' ? formOf(ridgeMat, 'pillar') : null;
          pieces.push({ y: y0, state: log ? blockState(log, { axis: s.ridgeAxis }) : full(formOf(ridgeMat, 'block') ? ridgeMat : m.roof) });
          topHalf = y0 * 2 + 2;
          if (ridgeStyle === 'block_slab') cap(y0 + 1);
          if (ridgeStyle === 'wall') {
            const wall = formOf(ridgeMat, 'wall');
            if (wall) {
              pieces.push({ y: y0 + 1, state: blockState(wall) });
              topHalf = y0 * 2 + 4;
            } else cap(y0 + 1);
          }
        }
      } else {
        const d = Math.min(l.d, t.length - 1);
        const tCol = t[d]!;
        const tPrev = d === 0 ? 0 : t[d - 1]!;
        for (const p of columnPieces(tPrev, tCol)) pieces.push({ y: base + p.y, state: pieceState(p, material, l.facing) });
        topHalf = base * 2 + tCol;
      }
      if (pieces.length === 0) continue;
      columns.set(key(x, z), {
        section: index,
        d: l.d,
        top: topHalf,
        pieces,
        facing: l.facing,
        ridge: l.ridge,
        trim,
        verge: l.verge,
        eave: outside && !l.verge,
        lowest: Math.min(...pieces.map((p) => p.y)),
      });
    }
  return { columns, base };
}

/** Max y and per-section ridge y without writing anything (for volume planning). */
export function planRoofs(sections: readonly RoofSectionSpec[]): { topY: number; minY: number; ridgeY: Record<string, number> } {
  let topY = -Infinity;
  let minY = Infinity;
  const ridgeY: Record<string, number> = {};
  sections.forEach((s, i) => {
    const { columns } = sectionColumns(s, i);
    let r = -Infinity;
    for (const c of columns.values()) {
      for (const p of c.pieces) {
        topY = Math.max(topY, p.y);
        minY = Math.min(minY, p.y);
        r = Math.max(r, p.y);
      }
    }
    // Cornice and verge boards hang one block below the lowest piece.
    minY = Math.min(minY, ...[...columns.values()].map((c) => c.lowest - 1));
    ridgeY[s.id] = r;
  });
  return { topY, minY, ridgeY };
}

export function buildRoofs(builder: VoxelBuilder, sections: readonly RoofSectionSpec[]): RoofResult {
  const all = sections.map((s, i) => sectionColumns(s, i));
  // Winner per column: the highest surface (ties: the earlier, i.e. more important section).
  const winners = new Map<string, Column>();
  for (const { columns } of all) {
    for (const [k, c] of columns) {
      const w = winners.get(k);
      if (!w || c.top > w.top) winners.set(k, c);
    }
  }

  const result: RoofResult = { topY: -Infinity, ridgeY: {}, gableCells: [], eaveCells: [], surface: new Map() };
  for (const [k, c] of winners) {
    const s = sections[c.section]!;
    const priority = s.priority ?? Priority.ROOF;
    const [x, z] = k.split(',').map(Number) as [number, number];
    let top = -Infinity;
    for (const p of c.pieces) {
      if (!builder.inside(x, p.y, z)) continue;
      builder.setBlock(x, p.y, z, p.state, priority);
      top = Math.max(top, p.y);
    }
    result.surface.set(k, top);
    result.topY = Math.max(result.topY, top);
    result.ridgeY[s.id] = Math.max(result.ridgeY[s.id] ?? -Infinity, top);
  }

  // Under the verge of an irimoya gable the hip slope still has to be there, or the overhang
  // leaves a hole into the attic.
  for (const [k, w] of winners) {
    if (!w.verge || !sections[w.section]!.id.endsWith('-gable')) continue;
    const hipId = sections[w.section]!.id.replace(/-gable$/, '');
    let under: Column | undefined;
    for (const { columns } of all) {
      const c = columns.get(k);
      if (!c || c === w || sections[c.section]!.id !== hipId || Math.max(...c.pieces.map((p) => p.y)) >= w.lowest) continue;
      if (!under || c.top > under.top) under = c;
    }
    if (!under) continue;
    const [x, z] = k.split(',').map(Number) as [number, number];
    const priority = sections[under.section]!.priority ?? Priority.ROOF;
    for (const p of under.pieces) if (builder.inside(x, p.y, z)) builder.setBlock(x, p.y, z, p.state, priority);
  }

  // Soffits: cornice under the eaves, boards under the verges.
  sections.forEach((s, i) => {
    if (!s.soffit || s.type === 'flat' || s.type === 'skirt') return;
    for (const [k, c] of all[i]!.columns) {
      if (winners.get(k) !== c) continue;
      const [x, z] = k.split(',').map(Number) as [number, number];
      const below = c.lowest - 1;
      if (!builder.inside(x, below, z) || !builder.isAir(x, below, z)) continue;
      // The barge board meets itself under the ridge: close the notch with a full block.
      if (!c.facing) {
        if (c.ridge && c.trim) builder.setBlock(x, below, z, full(s.materials.trim), s.priority ?? Priority.ROOF);
        continue;
      }
      if (c.verge && c.d > 0) {
        // Board under the verge: upside-down stair facing away from the ridge; the outermost
        // column is the barge board itself (one material with the verge, research 06 R01).
        const away = ({ north: 'south', south: 'north', east: 'west', west: 'east' } as const)[c.facing];
        builder.setBlock(x, below, z, stairs(c.trim ? s.materials.trim : s.materials.soffit, away, 'top'), s.priority ?? Priority.ROOF);
      } else if (c.eave && !c.verge && c.d === s.overhang - 1) {
        // Cornice right outside the wall: the full side of the upside-down stair against the wall.
        builder.setBlock(x, below, z, stairs(s.materials.soffit, c.facing, 'top'), s.priority ?? Priority.ROOF);
      }
    }
  });

  // Gable infill (gable-like sections): between the wall top and the roof, in the gable plane.
  sections.forEach((s, i) => {
    const gableLike = GABLE_LIKE.has(s.type);
    if (!gableLike || s.gables === false) return;
    const recess = s.gableRecess ? 1 : 0;
    const planes =
      s.ridgeAxis === 'x'
        ? [
            { fixed: s.x0 + recess, side: 'west' as const },
            { fixed: s.x1 - recess, side: 'east' as const },
          ]
        : [
            { fixed: s.z0 + recess, side: 'north' as const },
            { fixed: s.z1 - recess, side: 'south' as const },
          ];
    // Log gables lie like the wall courses below them (axis along the gable).
    const plain = full(s.materials.gable);
    const gableBlock = propsOf(plain).axis ? blockState(requireForm(s.materials.gable, 'block'), { axis: s.ridgeAxis === 'x' ? 'z' : 'x' }) : plain;
    for (const { fixed, side } of planes) {
      const from = s.ridgeAxis === 'x' ? s.z0 : s.x0;
      const to = s.ridgeAxis === 'x' ? s.z1 : s.x1;
      for (let a = from; a <= to; a++) {
        const x = s.ridgeAxis === 'x' ? fixed : a;
        const z = s.ridgeAxis === 'x' ? a : fixed;
        const k = key(x, z);
        const own = all[i]!.columns.get(k);
        const winner = winners.get(k);
        if (!own || !winner) continue;
        const ceiling = Math.min(own.lowest, winner.lowest);
        for (let y = s.wallTop + 1; y < ceiling; y++) {
          if (!builder.inside(x, y, z)) continue;
          if (builder.setBlock(x, y, z, gableBlock, Priority.STRUCTURE)) result.gableCells.push({ x, y, z, section: s.id, side });
        }
      }
      // A recessed gable leaves the cells in front of it free under the verge.
      if (recess) {
        for (let a = from; a <= to; a++) {
          const x = s.ridgeAxis === 'x' ? (side === 'west' ? s.x0 : s.x1) : a;
          const z = s.ridgeAxis === 'x' ? a : side === 'north' ? s.z0 : s.z1;
          const own = all[i]!.columns.get(key(x, z));
          if (!own) continue;
          for (let y = s.wallTop + 1; y < own.lowest; y++) if (builder.inside(x, y, z) && builder.getBlock(x, y, z) === AIR) builder.clear(x, y, z, Priority.ROOF);
        }
      }
    }
  });

  // Eave cells: directly below the outermost row, outside the walls (garlands, lanterns).
  sections.forEach((s, i) => {
    if (s.type === 'flat') return;
    for (const [k, c] of all[i]!.columns) {
      if (winners.get(k) !== c || c.d !== 0 || c.verge || !c.facing) continue;
      const [x, z] = k.split(',').map(Number) as [number, number];
      const outward = ({ north: 'south', south: 'north', east: 'west', west: 'east' } as const)[c.facing];
      let y = c.lowest - 1;
      while (y > 0 && builder.inside(x, y, z) && !builder.isAir(x, y, z)) y--;
      if (builder.inside(x, y, z)) result.eaveCells.push({ x, y, z, outward });
    }
  });

  return result;
}
