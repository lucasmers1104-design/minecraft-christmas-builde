import { describe, expect, it } from 'vitest';
import { floatingBlocks, lintHouse } from '@/core/analysis/buildingLints';
import { AIR, blockIdOf, blockState } from '@/core/blocks/registry';
import { generateBuildingWithReport } from '@/core/generator/generateBuilding';
import { Priority, VoxelBuilder } from '@/core/generator/geometry';
import { buildHouseV2 } from '@/core/generator/house/buildHouse';
import { resolveHouseInput, type HouseWishes } from '@/core/generator/house/resolveInput';
import { buildLandscape, type LandscapeReport } from '@/core/generator/landscape';
import { FLOWER_IDS, LANDSCAPE_STYLES, landscapeStyle, WINTER_BED } from '@/core/generator/landscapeStyles';
import { BORDER_INSET } from '@/core/generator/borders';
import { createSeededRandom } from '@/core/generator/seededRandom';
import { LAMP_DESIGNS, lampCells, lightHeight } from '@/core/templates/lampPosts';
import { formOf } from '@/core/style/materials';
import { DEFAULT_HOUSE_SPEC, STYLE_IDS, type BuildSpec } from '@/core/schema/buildSpec';
import type { SizeClass, StyleId, Theme } from '@/core/style/styles';

/**
 * Landscape (research 15, 18, 14 and the style bibles): paths, borders, lamp posts, gardens,
 * ground texture and the dissolved plot edge – checked on the landscape alone (difference to
 * the bare house) and on the finished building (no repairs, no lint findings).
 */

const spec = (over: Partial<BuildSpec> = {}, options: BuildSpec['options'] = {}): BuildSpec => ({ ...DEFAULT_HOUSE_SPEC, ...over, options });

interface Run {
  b: VoxelBuilder;
  before: string[];
  report: LandscapeReport;
  pathBlock: string;
  frameWood: string[];
  yard: { x: number; y: number; z: number }[];
  doorX: number;
  frontZ: number;
}

/** The house exactly as generateBuilding builds it, then the landscape on top (same forks). */
function run(style: StyleId, size: SizeClass, theme: Theme, seed: number, wishes: HouseWishes = {}, detailLevel: 1 | 2 | 3 = 3): Run {
  const rng = createSeededRandom(seed);
  const input = resolveHouseInput(style, theme, size, detailLevel, seed, '1.21.11', wishes, rng);
  const house = buildHouseV2(input);
  const b = house.builder;
  const { width: W, height: H, length: L } = b.dimensions;
  const before: string[] = [];
  for (let y = 0; y < H; y++) for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) before.push(b.getBlock(x, y, z));
  const main = house.plan.masses[0]!;
  const doorZ = main.rect.z0 - (main.frames ? 3 : 2);
  const { yard, report } = buildLandscape(b, rng.fork('landscape'), [{ x: house.plan.door.x, z: doorZ, outward: 'north' }], {
    style,
    theme,
    garden: input.garden,
    lantern: input.lantern,
    lanternDensity: input.lanternDensity,
    snowGround: input.festive.snow,
    materials: input.materials,
    minecraftVersion: '1.21.11',
    size,
    detailLevel,
    christmasTree: input.festive.christmasTree && theme !== 'none',
  });
  const wood = (role: 'frame' | 'beam') => formOf(input.materials[role], 'fence')?.replace(/_fence$/, '') ?? '';
  return { b, before, report, pathBlock: `minecraft:${formOf(input.materials.path, 'block')}`, frameWood: [wood('frame'), wood('beam')], yard, doorX: house.plan.door.x, frontZ: main.rect.z0 };
}

/** Cells the landscape changed: [x, y, z, state]. */
function changes(r: Run): [number, number, number, string][] {
  const { width: W, height: H, length: L } = r.b.dimensions;
  const out: [number, number, number, string][] = [];
  for (let y = 0; y < H; y++)
    for (let z = 0; z < L; z++)
      for (let x = 0; x < W; x++) {
        const s = r.b.getBlock(x, y, z);
        if (s !== r.before[x + W * (z + L * y)]) out.push([x, y, z, s]);
      }
  return out;
}

const short = (state: string) => blockIdOf(state).replace('minecraft:', '');
const SIZES: SizeClass[] = ['small', 'medium', 'large'];
const CURVED: StyleId[] = ['medieval', 'fantasy', 'rustic', 'nordic', 'cherry', 'mediterranean'];

describe('Landschaft als Stildaten', () => {
  it('jeder Stil hat Weg, Boden, Grenze, Garten und Laternenpfähle aus gültigen Blöcken', () => {
    for (const style of STYLE_IDS) {
      const s = LANDSCAPE_STYLES[style];
      const ids = [
        ...s.path.shoulder.map(([id]) => id),
        s.path.accent,
        ...(s.path.landing === 'path' ? [] : [s.path.landing]),
        ...[s.ground.wear, s.ground.shade, s.ground.patch, s.ground.plants, s.ground.bedSoil].flatMap((m) => m.map(([id]) => id)),
        ...s.border.hedge.map(([id]) => id),
        ...s.border.stones.map(([id]) => id),
        s.border.cap,
        ...s.border.pots,
        ...s.garden.flowers,
        s.garden.accent,
        ...s.garden.backRow,
        ...s.garden.green,
        ...s.garden.bush.map(([id]) => id),
        ...(s.garden.rocks ?? []).map(([id]) => id),
      ];
      for (const id of ids) expect(() => blockState(id), `${style}: ${id}`).not.toThrow();
      expect(s.lamps.length, style).toBeGreaterThan(0);
      expect(s.garden.trees.length, style).toBeGreaterThan(0);
      for (const [id] of s.border.hedge) expect(id.endsWith('_leaves'), id).toBe(true);
    }
  });

  it('Winter und Weihnachten: keine Blumen in den Stildaten, immergrüne Hecken', () => {
    for (const style of STYLE_IDS)
      for (const theme of ['winter', 'christmas'] as const) {
        const s = landscapeStyle(style, theme);
        const all = [...s.garden.flowers, s.garden.accent, ...s.garden.backRow, ...s.garden.bush.map(([id]) => id), ...s.border.hedge.map(([id]) => id), ...s.border.pots, ...s.path.edgePlants.map(([id]) => id)];
        expect(all.filter((id) => FLOWER_IDS.has(id)), `${style} ${theme}`).toEqual([]);
        if (style !== 'cherry') expect(s.border.hedge[0]![0], style).toBe('spruce_leaves');
      }
    expect(WINTER_BED.some(([id]) => id === 'potted_spruce_sapling')).toBe(true);
  });
});

describe('Winter und Weihnachten: keine Blumen (Bericht 14, Empfehlung 1)', () => {
  it.each(STYLE_IDS.flatMap((style) => (['winter', 'christmas'] as const).map((theme) => [style, theme] as const)))('%s / %s: die Landschaft setzt keine einzige Blume', (style, theme) => {
    for (const size of ['small', 'medium'] as const) {
      const r = run(style, size, theme, 1);
      const flowers = changes(r).filter(([, , , s]) => FLOWER_IDS.has(short(s)));
      expect(flowers, `${style} ${size}`).toEqual([]);
      // Winter beds still exist: ferns and little spruces instead.
      expect(changes(r).some(([, , , s]) => ['fern', 'spruce_sapling', 'potted_spruce_sapling'].includes(short(s))), `${style} ${size}`).toBe(true);
    }
  });

  it('ohne Thema blühen die Beete in den Farben des Stils', () => {
    for (const style of ['medieval', 'rustic', 'mediterranean', 'cherry'] as const) {
      const r = run(style, 'medium', 'none', 1);
      expect(changes(r).some(([, , , s]) => FLOWER_IDS.has(short(s))), style).toBe(true);
    }
  });
});

describe('Wegsystem (Bericht 15, T5/T6, Empfehlung 2)', () => {
  it.each(CURVED.flatMap((style) => SIZES.map((size) => [style, size] as const)))('%s / %s: zusammenhängend Tür → Rand, ohne Löcher, Mitte aus der Rolle path', (style, size) => {
    for (const seed of [1, 2, 3]) {
      const r = run(style, size, 'none', seed);
      const plan = r.report.path!;
      const cells = [...plan.cells.values()];
      const key = (x: number, z: number) => `${x},${z}`;
      const set = new Set(cells.map((c) => key(c.x, c.z)));
      // 4-connected from the first row behind the landing to the plot edge (the landing may be
      // split by porch steps; every landing cell touches the path or the building).
      const body = cells.filter((c) => c.s >= 3);
      const start = body.filter((c) => c.s === Math.min(...body.map((d) => d.s)));
      const seen = new Set(start.map((c) => key(c.x, c.z)));
      const stack = [...start];
      while (stack.length > 0) {
        const c = stack.pop()!;
        for (const [dx, dz] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const k = key(c.x + dx, c.z + dz);
          if (set.has(k) && !seen.has(k)) {
            seen.add(k);
            stack.push(plan.cells.get(k)!);
          }
        }
      }
      expect(body.every((c) => seen.has(key(c.x, c.z))), `${style} ${size} ${seed}: zusammenhängend`).toBe(true);
      for (const c of cells.filter((d) => d.s < 3)) {
        const touches = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].some(([dx, dz]) => set.has(key(c.x + dx!, c.z + dz!)) || r.report.site.foot[r.report.site.i(c.x + dx!, c.z + dz!)]);
        expect(touches, `${style} ${size} ${seed}: Antritt bei ${c.x},${c.z}`).toBe(true);
      }
      expect(cells.some((c) => c.z === 0), `${style} ${size} ${seed}: bis zum Rand`).toBe(true);
      // No holes: every row is one contiguous run across the path.
      plan.rows.forEach((ts) => {
        if (ts.length > 1) expect(ts.at(-1)! - ts[0]!, `${style} ${size} ${seed}`).toBe(ts.length - 1);
      });
      // Centre ≥ 70 % path role, no straight stretch longer than 7.
      const centre = cells.filter((c) => c.role === 'centre');
      const main = centre.filter((c) => r.b.getBlock(c.x, 0, c.z) === r.pathBlock).length;
      expect(main / centre.length, `${style} ${size} ${seed}: Mitte`).toBeGreaterThanOrEqual(0.7);
      let straight = 1;
      for (let s = 1; s < plan.centre.length; s++) {
        straight = plan.centre[s] === plan.centre[s - 1] ? straight + 1 : 1;
        expect(straight, `${style} ${size} ${seed}: gerade Strecke`).toBeLessThanOrEqual(7);
      }
      // No 2 × 2 checkerboard of path blocks.
      for (const c of cells) {
        const ks = [key(c.x, c.z), key(c.x + 1, c.z), key(c.x, c.z + 1), key(c.x + 1, c.z + 1)];
        if (!ks.every((k) => set.has(k))) continue;
        const [a, b2, cc, d] = [[c.x, c.z], [c.x + 1, c.z], [c.x, c.z + 1], [c.x + 1, c.z + 1]].map(([x, z]) => r.b.getBlock(x!, 0, z!));
        expect(a === d && b2 === cc && a !== b2, `${style} ${size} ${seed}: Schachbrett bei ${c.x},${c.z}`).toBe(false);
      }
    }
  });

  it('japanisch: Trittsteine, höchstens einen Block breit; modern: gerade Platten mit Grasfugen', () => {
    for (const size of SIZES) {
      const jp = run('japanese', size, 'none', 1).report.path!;
      jp.rows.slice(1).forEach((ts) => expect(ts.length).toBeLessThanOrEqual(1));
      expect(jp.rows.filter((ts) => ts.length === 0).length).toBeGreaterThan(0);
      const mo = run('modern', size, 'none', 1).report.path!;
      expect(new Set(mo.centre)).toEqual(new Set([0]));
      expect(mo.rows.some((ts) => ts.length === 0)).toBe(true);
    }
  });
});

describe('Grenzen statt Ringhecke (Bericht 15, Empfehlung 7)', () => {
  it.each(STYLE_IDS)('%s: eingerückt, höchstens 75 % des Umfangs, Tor am Hauptweg, kein Laub am Modellrand', (style) => {
    for (const size of SIZES) {
      const r = run(style, size, 'none', 1);
      const border = r.report.border!;
      const { width: W, length: L } = r.b.dimensions;
      const edge = (x: number, z: number) => Math.min(x, z, W - 1 - x, L - 1 - z);
      for (const [x, z] of border.cells) expect(edge(x, z), `${style} ${size}`).toBeGreaterThanOrEqual(BORDER_INSET);
      const perimeter = 2 * (W - 2 * BORDER_INSET) + 2 * (L - 2 * BORDER_INSET);
      expect(new Set(border.cells.map(([x, z]) => `${x},${z}`)).size, `${style} ${size}`).toBeLessThanOrEqual(0.75 * perimeter + 2);
      // No leaves on the model edge (the old one-high ring hedge).
      // Crowns of trees may reach over the outer ring higher up; nothing stands there.
      for (const [x, y, z, s] of changes(r)) if (y >= 1 && y <= 2 && edge(x, z) <= 1) expect(['short_grass', 'fern', 'moss_carpet'].includes(short(s)) || s === AIR, `${style} ${size}: ${s} bei ${x},${y},${z}`).toBe(true);
      // The main path crosses the front line in a gate (gate leaves, or an opening flanked by posts).
      if (LANDSCAPE_STYLES[style].border.front !== 'boxHedge') {
        const gate = [...r.report.path!.cells.values()].filter((c) => c.z === BORDER_INSET);
        expect(gate.length, `${style} ${size}`).toBeGreaterThan(0);
        for (const c of gate) {
          const above = r.b.getBlock(c.x, 1, c.z);
          expect(above === AIR || short(above).endsWith('fence_gate'), `${style} ${size}: ${above}`).toBe(true);
        }
        expect(border.gatePosts.length + r.report.lamps.filter((l) => l.gate).length, `${style} ${size}`).toBeGreaterThan(0);
      }
    }
  });

  it('Hecken sind gemischt und nie sieben gleich hoch in Folge (außer formal)', () => {
    for (const style of ['medieval', 'fantasy', 'nordic'] as const)
      for (const seed of [1, 2, 3]) {
        const r = run(style, 'medium', 'none', seed);
        const { width: W, length: L } = r.b.dimensions;
        // Straight stretches between the corners (a corner turns the line anyway).
        const lines: [number, number][][] = [
          Array.from({ length: W - 2 * BORDER_INSET - 2 }, (_, k) => [BORDER_INSET + 1 + k, BORDER_INSET] as [number, number]),
          Array.from({ length: L - BORDER_INSET - 1 }, (_, k) => [BORDER_INSET, BORDER_INSET + 1 + k] as [number, number]),
          Array.from({ length: L - BORDER_INSET - 1 }, (_, k) => [W - 1 - BORDER_INSET, BORDER_INSET + 1 + k] as [number, number]),
        ];
        const species = new Set<string>();
        for (const line of lines) {
          let last = -1;
          let count = 0;
          for (const [x, z] of line) {
            // Hedge height: leaves stacked from the ground (or from the earth bank) up.
            let y = short(r.b.getBlock(x, 1, z)) === 'grass_block' ? 2 : 1;
            let h = 0;
            while (y <= 4 && short(r.b.getBlock(x, y, z)).endsWith('_leaves')) {
              species.add(short(r.b.getBlock(x, y, z)));
              h++;
              y++;
            }
            if (h === 0) {
              last = -1;
              count = 0;
              continue;
            }
            count = h === last ? count + 1 : 1;
            last = h;
            expect(count, `${style} ${seed}`).toBeLessThan(7);
          }
        }
        if (style !== 'nordic') expect(species.size, `${style} ${seed}`).toBeGreaterThanOrEqual(2);
      }
  });

  it('mediterran: Gartenmauer statt Hecke, mindestens zwei Zypressen; modern: keine Grundstückshecke', () => {
    for (const size of ['medium', 'large'] as const) {
      const me = run('mediterranean', size, 'none', 1);
      expect(me.report.border!.cells.every(([x, z]) => !short(me.b.getBlock(x, 1, z)).endsWith('_leaves'))).toBe(true);
      expect(me.report.trees.filter((t) => t.kind === 'cypress').length, size).toBeGreaterThanOrEqual(2);
      const mo = run('modern', size, 'none', 1);
      const leaves = mo.report.border!.cells.filter(([x, z]) => short(mo.b.getBlock(x, 1, z)).endsWith('_leaves'));
      // Box hedges: single cubes, never two side by side.
      for (const [x, z] of leaves) expect(leaves.some(([a, c]) => Math.abs(a - x) + Math.abs(c - z) === 1)).toBe(false);
    }
  });

  it('Zaunholz kommt aus den Rollen Rahmen und Balken, nicht fest aus Fichte', () => {
    for (const style of ['medieval', 'rustic', 'nordic', 'fantasy', 'cherry'] as const)
      for (const seed of [1, 2]) {
        const r = run(style, 'medium', 'none', seed);
        const fences = changes(r).map(([, , , s]) => short(s)).filter((id) => id.endsWith('_fence') || id.endsWith('_fence_gate'));
        for (const id of fences) {
          const wood = id.replace(/_fence(_gate)?$/, '');
          expect(r.frameWood.includes(wood) || wood === 'bamboo', `${style} ${seed}: ${id} (Rahmen ${r.frameWood.join('/')})`).toBe(true);
        }
      }
  });
});

describe('Laternenpfähle als Vorlagen (Bericht 18, Empfehlungen 3 und 4)', () => {
  it.each(Object.keys(LAMP_DESIGNS))('%s hält in allen vier Drehungen: keine Reparatur, nichts schwebt, Licht ab y = 3', (id) => {
    const design = LAMP_DESIGNS[id as keyof typeof LAMP_DESIGNS];
    expect(lightHeight(design)).toBeGreaterThanOrEqual(3);
    const materials = resolveHouseInput('medieval', 'none', 'small', 2, 1, '1.21.11', {}, createSeededRandom(1)).materials;
    for (let turns = 0; turns < 4; turns++) {
      const b = new VoxelBuilder({ width: 7, height: 9, length: 7 });
      for (let x = 0; x < 7; x++) for (let z = 0; z < 7; z++) b.setBlock(x, 0, z, blockState('grass_block'), Priority.DECOR);
      const cells = lampCells(design, 3, 3, turns, { materials, minecraftVersion: '1.21.11', lantern: 'lantern' });
      for (const c of cells) b.setBlock(c.x, c.y, c.z, c.state, Priority.DECOR);
      const { model, repairs } = b.finalize(DEFAULT_HOUSE_SPEC);
      expect(repairs, `${id} ${turns}`).toEqual([]);
      expect(floatingBlocks(model), `${id} ${turns}`).toBe(0);
    }
  });

  it('modern, japanisch und mediterran ohne Holzpfahl; ein Entwurf je Gebäude', () => {
    for (const style of ['modern', 'japanese', 'mediterranean'] as const) for (const id of LANDSCAPE_STYLES[style].lamps) expect(LAMP_DESIGNS[id].wooden, `${style} ${id}`).toBe(false);
  });

  it('Rhythmus statt Spam: Licht nie unter y = 3, Pfähle mindestens 6 auseinander (außer Torpaar)', () => {
    for (const style of STYLE_IDS)
      for (const lanternDensity of ['few', 'normal', 'many'] as const) {
        const r = run(style, 'large', 'none', 2, { lanternDensity });
        const lights = changes(r).filter(([, , , s]) => /lantern|froglight|shroomlight|copper_bulb/.test(short(s)));
        for (const [x, y, z] of lights) expect(y, `${style} ${lanternDensity}: Licht bei ${x},${y},${z}`).toBeGreaterThanOrEqual(3);
        const posts = r.report.lamps;
        expect(posts.length, `${style} ${lanternDensity}`).toBeGreaterThan(0);
        if (lanternDensity === 'few') expect(posts.length, style).toBe(1);
        for (const a of posts)
          for (const b of posts) {
            if (a === b) continue;
            const d = Math.max(Math.abs(a.x - b.x), Math.abs(a.z - b.z));
            if (lanternDensity === 'many' && a.z === b.z && Math.abs(a.x - b.x) <= 6) continue;
            expect(d, `${style} ${lanternDensity}`).toBeGreaterThanOrEqual(6);
          }
      }
  });

  it('ohne Laternenwunsch keine Pfähle', () => {
    const r = run('medieval', 'medium', 'none', 1, { lanternDensity: 'none' });
    expect(r.report.lamps).toEqual([]);
  });
});

describe('Boden nach Ursache und aufgelöster Rand (Bericht 15, Empfehlungen 1 und 9)', () => {
  it.each(STYLE_IDS)('%s: Außenringe nur Gras, Pflanzen, Luft oder Weg; Rasen überwiegt; der Rand ist nicht gerade', (style) => {
    for (const size of SIZES) {
      const r = run(style, size, 'none', 1);
      const { width: W, length: L } = r.b.dimensions;
      const path = new Set([...r.report.path!.cells.values()].map((c) => `${c.x},${c.z}`));
      let grass = 0;
      let ground = 0;
      for (let x = 0; x < W; x++)
        for (let z = 0; z < L; z++) {
          if (!r.report.site.owned[x + W * z]) continue;
          const e = Math.min(x, z, W - 1 - x, L - 1 - z);
          const s = short(r.b.getBlock(x, 0, z));
          if (e <= 1 && !path.has(`${x},${z}`)) expect(['grass_block', 'air'].includes(s), `${style} ${size}: ${s} am Rand ${x},${z}`).toBe(true);
          // Lawn: free ground outside beds, paths and objects, not the strip under the eaves.
          if (e >= 2 && r.report.site.use[x + W * z] === 0 && !r.report.site.covered[x + W * z] && s !== 'air') {
            ground++;
            if (s === 'grass_block') grass++;
          }
        }
      expect(grass / ground, `${style} ${size}: Rasenanteil`).toBeGreaterThanOrEqual(style === 'modern' ? 0.8 : 0.5);
      // The outermost ring is ragged: never more than 7 solid cells in a row outside the path.
      for (const line of [
        Array.from({ length: W }, (_, x) => [x, 0] as const),
        Array.from({ length: W }, (_, x) => [x, L - 1] as const),
        Array.from({ length: L }, (_, z) => [0, z] as const),
        Array.from({ length: L }, (_, z) => [W - 1, z] as const),
      ]) {
        let run2 = 0;
        for (const [x, z] of line) {
          const solid = r.b.getBlock(x, 0, z) !== AIR && !path.has(`${x},${z}`) && r.report.site.owned[x + W * z];
          run2 = solid ? run2 + 1 : 0;
          expect(run2, `${style} ${size}: gerader Rand`).toBeLessThanOrEqual(7);
        }
      }
    }
  });

  it('Bodentextur in Flecken: Abnutzung am Weg, Schatten, weiche Inseln (kein Schachbrett)', () => {
    for (const style of ['medieval', 'rustic', 'nordic', 'fantasy'] as const) {
      const r = run(style, 'medium', 'none', 1);
      const { width: W, length: L } = r.b.dimensions;
      const textured = new Set<string>();
      for (let x = 2; x < W - 2; x++)
        for (let z = 2; z < L - 2; z++) {
          const s = short(r.b.getBlock(x, 0, z));
          if (r.report.site.owned[x + W * z] && ['coarse_dirt', 'rooted_dirt', 'moss_block', 'podzol', 'gravel'].includes(s) && r.report.site.use[x + W * z] === 0) textured.add(`${x},${z}`);
        }
      // At least one cluster of three or more connected cells.
      const clusters = [...textured].filter((k) => {
        const [x, z] = k.split(',').map(Number) as [number, number];
        return [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].filter(([dx, dz]) => textured.has(`${x + dx!},${z + dz!}`)).length >= 2;
      });
      expect(clusters.length, style).toBeGreaterThan(0);
    }
  });

  it('Schnee nur auf Wunsch: Schneeboden, aber nicht unter den Traufen und nicht auf dem Weg', () => {
    for (const style of ['nordic', 'medieval', 'japanese'] as const) {
      const r = run(style, 'medium', 'winter', 1, { snow: true });
      const { width: W, length: L } = r.b.dimensions;
      for (const c of r.report.path!.cells.values()) expect(short(r.b.getBlock(c.x, 0, c.z)), style).not.toBe('snow_block');
      for (let x = 0; x < W; x++) for (let z = 0; z < L; z++) if (r.report.site.covered[x + W * z] && r.report.site.owned[x + W * z]) expect(short(r.b.getBlock(x, 0, z)), style).not.toBe('snow_block');
      expect(changes(r).some(([, y, , s]) => y === 0 && short(s) === 'snow_block'), style).toBe(true);
    }
  });
});

describe('Gartenzonen und Naturvorlagen (Bericht 15, Empfehlungen 6 und 8)', () => {
  it.each(STYLE_IDS)('%s: Bäume ≥ 3 von der Fassade und nicht vor Fenstern', (style) => {
    for (const size of SIZES)
      for (const seed of [1, 2]) {
        const r = run(style, size, 'none', seed);
        const site = r.report.site;
        for (const t of r.report.trees) {
          expect(site.distFoot[site.i(t.x, t.z)], `${style} ${size} ${seed}`).toBeGreaterThanOrEqual(3);
          expect(site.windowZone[site.i(t.x, t.z)], `${style} ${size} ${seed}`).toBe(0);
        }
        if (size !== 'small') expect(r.report.trees.length, `${style} ${size} ${seed}`).toBeGreaterThan(0);
      }
  });

  it('Kirschblüte: mindestens ein Kirschbaum mit Krone ab Ø 7; nordisch: Birke; japanisch: Kiefer', () => {
    for (const size of ['medium', 'large'] as const) {
      const ch = run('cherry', size, 'none', 1).report.trees;
      expect(ch.some((t) => t.kind === 'cherry' && 2 * t.radius + 1 >= 7), `${size} ${JSON.stringify(ch)}`).toBe(true);
      const no = run('nordic', size, 'none', 1).report.trees;
      expect(no.some((t) => t.kind === 'birch'), `${size} ${JSON.stringify(no)}`).toBe(true);
      const jp = run('japanese', size, 'none', 1).report.trees;
      expect(jp.some((t) => t.kind === 'pine'), `${size} ${JSON.stringify(jp)}`).toBe(true);
    }
  });

  it('Requisiten dort, wo gearbeitet wird: Holzstapel, Heu oder Fässer bei rustikal und nordisch', () => {
    for (const style of ['rustic', 'nordic', 'medieval'] as const) {
      const ids = new Set(changes(run(style, 'medium', 'none', 1)).map(([, , , s]) => short(s)));
      expect(['hay_block', 'barrel'].some((id) => ids.has(id)) || [...ids].some((id) => id.startsWith('stripped_') && id.endsWith('_log')), style).toBe(true);
    }
  });

  it('Weihnachtsbaum: Platz im Vorgarten abseits der Türachse, Geschenke im Umkreis von 3', () => {
    for (const style of STYLE_IDS)
      for (const size of ['medium', 'large'] as const) {
        const r = run(style, size, 'christmas', 1);
        const anchor = r.report.anchor;
        expect(anchor, `${style} ${size}`).not.toBeNull();
        const first = r.yard[0]!;
        expect([first.x, first.z]).toEqual(anchor);
        expect(first.z < r.frontZ - 4 && Math.abs(first.x - r.doorX) > 5, `${style} ${size}`).toBe(true);
        for (const c of r.yard.slice(1)) expect(Math.max(Math.abs(c.x - first.x), Math.abs(c.z - first.z)), `${style} ${size}`).toBeLessThanOrEqual(3);
        expect(r.yard.length, `${style} ${size}: Platz für Geschenke`).toBeGreaterThanOrEqual(4);
        // The finished building really has the tree (star with end rods).
        const m = generateBuildingWithReport(spec({ style, size, theme: 'christmas', seed: 1 })).model;
        expect(m.palette.some((s) => blockIdOf(s) === 'minecraft:end_rod'), `${style} ${size}`).toBe(true);
      }
  });
});

describe('Ganze Bauwerke mit der neuen Landschaft', () => {
  it.each(STYLE_IDS.flatMap((style) => (['small', 'medium', 'large'] as const).map((size) => [style, size] as const)))('%s / %s Winter (mit und ohne Schnee): keine Reparaturen, kein Lint-Befund', (style, size) => {
    for (const snow of [false, true]) {
      const r = generateBuildingWithReport(spec({ style, size, theme: 'winter', seed: 3 }, { snow }));
      expect(r.repairs, `${style} ${size} ${snow}`).toEqual([]);
      expect(lintHouse(r.model, r.house!), `${style} ${size} ${snow}`).toEqual([]);
    }
  });

  it('Türme, riesige Häuser, Profil 1.21.1 und Detailgrad 1: keine Reparaturen', () => {
    for (const style of ['medieval', 'fantasy', 'mediterranean'] as const) {
      expect(generateBuildingWithReport(spec({ style, kind: 'tower', theme: 'christmas', seed: 2 })).repairs, style).toEqual([]);
      const huge = generateBuildingWithReport(spec({ style, size: 'huge', theme: 'none', seed: 2 }));
      expect(huge.repairs, style).toEqual([]);
      expect(lintHouse(huge.model, huge.house!), style).toEqual([]);
      expect(generateBuildingWithReport(spec({ style, theme: 'christmas', seed: 4, targetMinecraftVersion: '1.21.1' })).repairs, style).toEqual([]);
      expect(generateBuildingWithReport(spec({ style, detailLevel: 1, seed: 4 })).repairs, style).toEqual([]);
    }
  });

  it('deterministisch: gleicher Seed ergibt bitgleiche Landschaft, anderer Seed eine andere', () => {
    for (const style of ['rustic', 'japanese', 'modern'] as const) {
      const a = generateBuildingWithReport(spec({ style, seed: 9 })).model.hash;
      expect(generateBuildingWithReport(spec({ style, seed: 9 })).model.hash).toBe(a);
      expect(generateBuildingWithReport(spec({ style, seed: 10 })).model.hash).not.toBe(a);
    }
  });
});
