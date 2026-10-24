import { OPPOSITE, VECTOR, type HorizontalDirection } from '@/core/blocks/directions';
import { AIR } from '@/core/blocks/registry';
import { Priority } from '@/core/generator/geometry';
import type { RoofResult, RoofSectionSpec } from '@/core/generator/roof/roofEngine';
import type { Ctx } from '@/core/generator/house/walls';
import type { StyleId } from '@/core/style/styles';

/**
 * Gable fields and ridge ends (research 01, 03, 06, 08, 20: gables were flat, empty triangles
 * although the roof engine already reports their cells):
 *
 * - Timber-framed masses get a recessed gable (the roof engine moves the infill one block in)
 *   with a king post on the ridge axis and collar beams every four rows in front of it, and two
 *   gable windows beside the king post where the triangle is wide enough.
 * - Other gables get windows on the ridge axis: one in the centre, or a pair beside it plus a
 *   small one higher up on wide gables. Each window has an upside-down stair as sill.
 * - Ridge ends carry a style finial: a lightning rod (medieval), an end rod (fantasy; a rod when
 *   snow is wished, end rods would melt it), a fence post (rustic), crossed barge boards
 *   (nordic) or raised ridge ends (japanese, cherry). Modern and mediterranean stay plain.
 */

type Finial = 'rod' | 'end_rod' | 'fence' | 'horns' | 'raised' | 'none';

const FINIAL: Readonly<Record<StyleId, Finial>> = {
  medieval: 'rod',
  fantasy: 'end_rod',
  rustic: 'fence',
  nordic: 'horns',
  japanese: 'raised',
  cherry: 'raised',
  modern: 'none',
  mediterranean: 'none',
};

const GABLE_LIKE = new Set(['gable', 'gambrel', 'a_frame', 'saltbox']);

interface Gable {
  section: RoofSectionSpec;
  side: HorizontalDirection;
  /** Width coordinate (x or z) → rows (y) present in the gable plane. */
  rows: Map<number, Set<number>>;
  /** Fixed coordinate of the gable plane. */
  plane: number;
}

const along = (side: HorizontalDirection): 'x' | 'z' => (side === 'west' || side === 'east' ? 'z' : 'x');

function cell(g: Gable, w: number, y: number, d: number): { x: number; y: number; z: number } {
  const [ox, , oz] = VECTOR[g.side];
  return along(g.side) === 'z' ? { x: g.plane + ox * d, y, z: w } : { x: w, y, z: g.plane + oz * d };
}

function gablesOf(roof: RoofResult, sections: readonly RoofSectionSpec[]): Gable[] {
  const groups = new Map<string, Gable>();
  for (const c of roof.gableCells) {
    const section = sections.find((s) => s.id === c.section);
    if (!section) continue;
    const key = `${c.section}:${c.side}`;
    let g = groups.get(key);
    if (!g) {
      g = { section, side: c.side, rows: new Map(), plane: along(c.side) === 'z' ? c.x : c.z };
      groups.set(key, g);
    }
    const w = along(c.side) === 'z' ? c.z : c.x;
    if (!g.rows.has(w)) g.rows.set(w, new Set());
    g.rows.get(w)!.add(c.y);
  }
  return [...groups.values()];
}

export function buildGables(ctx: Ctx, roof: RoofResult, sections: readonly RoofSectionSpec[], plain: readonly string[] = []): { windows: number } {
  const { builder, blocks, plan } = ctx;
  const style = plan.input.styleId;
  let windows = 0;
  const has = (g: Gable, w: number, y: number) => g.rows.get(w)?.has(y) ?? false;
  const put = (p: { x: number; y: number; z: number }, state: string, priority: number) => {
    if (builder.inside(p.x, p.y, p.z)) builder.setBlock(p.x, p.y, p.z, state, priority as never);
  };
  const free = (p: { x: number; y: number; z: number }) => builder.inside(p.x, p.y, p.z) && builder.getBlock(p.x, p.y, p.z) === AIR;
  const window = (g: Gable, w: number, y0: number) => {
    // Inside the triangle with a column on each side, and nothing (chimney) in front of it.
    if (![y0, y0 + 1].every((y) => has(g, w, y) && has(g, w - 1, y) && has(g, w + 1, y) && free(cell(g, w, y, 1)) && free(cell(g, w, y, 2)))) return;
    for (const y of [y0, y0 + 1]) put(cell(g, w, y, 0), blocks.pane(), Priority.OPENING);
    // Sill: upside-down stair with its full side against the gable, one row below the glass.
    const sill = cell(g, w, y0 - 1, 1);
    if (free(sill)) put(sill, blocks.stairs('frame', OPPOSITE[g.side] as HorizontalDirection, 'top'), Priority.OPENING);
    windows++;
  };

  for (const g of gablesOf(roof, sections)) {
    if (!GABLE_LIKE.has(g.section.type) || plain.includes(`${g.section.id}:${g.side}`)) continue;
    const s = g.section;
    const c = Math.round(along(g.side) === 'z' ? (s.z0 + s.z1) / 2 : (s.x0 + s.x1) / 2);
    const top = s.wallTop;
    const apex = Math.max(...(g.rows.get(c) ?? new Set([top])));
    const mass = plan.masses.find((m) => m.id === s.id);
    const timber = !!mass?.timber && !!s.gableRecess && style !== 'japanese' && style !== 'cherry';
    if (timber) {
      // King post and collar beams in the frame plane in front of the recessed infill.
      const axis = along(g.side);
      const collars = new Set<number>();
      for (let y = top + 4; y < apex; y += 4) if ([...g.rows.values()].filter((ys) => ys.has(y)).length >= 3) collars.add(y);
      for (const [w, ys] of g.rows)
        for (const y of ys) {
          const front = cell(g, w, y, 1);
          if (!free(front)) continue;
          if (w === c) put(front, collars.has(y) ? blocks.wood('beam') : blocks.log('frame', 'y'), Priority.STRUCTURE + 1);
          else if (collars.has(y)) put(front, blocks.log('beam', axis), Priority.STRUCTURE + 1);
        }
      // Two windows beside the king post, below the first collar.
      if (apex - top >= 5) for (const w of [c - 2, c + 2]) window(g, w, top + 2);
      continue;
    }
    if (style === 'japanese' || style === 'cherry' || apex - top < 4) continue;
    const wide = [-4, 4].every((dw) => has(g, c + dw, top + 2));
    if (wide) {
      for (const w of [c - 2, c + 2]) window(g, w, top + 2);
      if (apex - top >= 8) window(g, c, top + 5);
    } else window(g, c, top + 2);
  }

  placeFinials(ctx, roof, sections);
  return { windows };
}

/** Finials on the ridge ends of gable roofs (only where this section's ridge is the top). */
function placeFinials(ctx: Ctx, roof: RoofResult, sections: readonly RoofSectionSpec[]): void {
  const { builder, blocks, plan } = ctx;
  let kind = FINIAL[plan.input.styleId];
  if (kind === 'end_rod' && plan.input.festive.snow) kind = 'rod';
  if (kind === 'none') return;
  // Renamed to lightning_rod for 1.21.1 by the registry profile.
  const rod = 'waxed_lightning_rod';
  const massIds = new Set(plan.masses.map((m) => m.id));
  for (const s of sections) {
    if (!massIds.has(s.id.replace(/-gable$/, '')) || !GABLE_LIKE.has(s.type)) continue;
    const ridgeY = roof.ridgeY[s.id];
    if (ridgeY === undefined) continue;
    const alongX = s.ridgeAxis === 'x';
    const c = Math.round(alongX ? (s.z0 + s.z1) / 2 : (s.x0 + s.x1) / 2);
    const ends: { x: number; z: number; outward: HorizontalDirection }[] = alongX
      ? [
          { x: s.x0 - s.overhang, z: c, outward: 'west' },
          { x: s.x1 + s.overhang, z: c, outward: 'east' },
        ]
      : [
          { x: c, z: s.z0 - s.overhang, outward: 'north' },
          { x: c, z: s.z1 + s.overhang, outward: 'south' },
        ];
    for (const e of ends) {
      const y = roof.surface.get(`${e.x},${e.z}`);
      if (y === undefined || y < ridgeY || !builder.inside(e.x, y + 1, e.z) || builder.getBlock(e.x, y + 1, e.z) !== AIR) continue;
      const at = (x: number, z: number, state: string) => {
        if (builder.inside(x, y + 1, z) && builder.getBlock(x, y + 1, z) === AIR) builder.setBlock(x, y + 1, z, state, Priority.ROOF);
      };
      switch (kind) {
        case 'rod':
          at(e.x, e.z, blocks.fixed(rod));
          break;
        case 'end_rod':
          at(e.x, e.z, blocks.fixed('end_rod'));
          break;
        case 'fence':
          at(e.x, e.z, blocks.fence('frame'));
          break;
        case 'raised':
          at(e.x, e.z, blocks.stairs(blocks.has('ridge', 'stairs') ? 'ridge' : 'roof', e.outward, 'bottom'));
          break;
        case 'horns': {
          // The two barge boards run on past the ridge and cross (Nordic gable horns).
          const [neg, pos]: [HorizontalDirection, HorizontalDirection] = alongX ? ['north', 'south'] : ['west', 'east'];
          const shift = (d: number) => (alongX ? { x: e.x, z: c + d } : { x: c + d, z: e.z });
          const a = shift(-1);
          const b = shift(1);
          at(a.x, a.z, blocks.stairs('roofTrim', neg, 'bottom'));
          at(b.x, b.z, blocks.stairs('roofTrim', pos, 'bottom'));
          break;
        }
      }
    }
  }

}
