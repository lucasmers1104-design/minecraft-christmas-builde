import { describe, expect, it } from 'vitest';
import { lintHouse } from '@/core/analysis/buildingLints';
import { measureHouse } from '@/core/analysis/buildQuality';
import { OPPOSITE, VECTOR, type HorizontalDirection } from '@/core/blocks/directions';
import { isFaceFull } from '@/core/blocks/faces';
import { AIR, blockIdOf, definitionOf, propsOf } from '@/core/blocks/registry';
import { generateBuildingWithReport } from '@/core/generator/generateBuilding';
import { DEFAULT_HOUSE_SPEC, type BuildSpec } from '@/core/schema/buildSpec';
import { blockAt, type VoxelModel } from '@/core/schema/voxelModel';
import { STYLE_IDS, type StyleId } from '@/core/style/styles';

/**
 * Phase 4 of "Profi-Builds": life around the house – a back door with its own path, bushes at
 * the plinth, curbs, ivy, tall grass, a kitchen garden, and for Christmas colourful light chains
 * along eaves, verges and ridges plus mini firs at the forecourt. Everything repair- and lint-free.
 */

const build = (over: Partial<BuildSpec>, options: BuildSpec['options'] = {}) => generateBuildingWithReport({ ...DEFAULT_HOUSE_SPEC, theme: 'none', ...over, options });

function cells(model: VoxelModel, test: (id: string, state: string) => boolean): [number, number, number, string][] {
  const out: [number, number, number, string][] = [];
  const { width: W, height: H, length: L } = model.dimensions;
  for (let y = 0; y < H; y++)
    for (let z = 0; z < L; z++)
      for (let x = 0; x < W; x++) {
        const s = blockAt(model, x, y, z);
        if (s !== AIR && test(blockIdOf(s), s)) out.push([x, y, z, s]);
      }
  return out;
}

describe('Keine Rückseite mehr: Hintertür mit eigenem Weg', () => {
  it('jeder Stil bekommt eine Hinter- oder Seitentür mit Stufe, Laterne und Weg; die Haustür bleibt die erste', () => {
    for (const style of STYLE_IDS)
      for (const seed of [1, 2]) {
        const r = build({ style, size: 'medium', seed });
        const doors = r.house!.openings.doors;
        expect(doors[0]!.back, `${style} ${seed}`).toBeUndefined();
        const back = doors.find((d) => d.back);
        expect(back, `${style} ${seed}`).toBeDefined();
        expect(back!.outward, `${style} ${seed}`).not.toBe('north');
        expect(r.repairs, `${style} ${seed}`).toEqual([]);
        expect(lintHouse(r.model, r.house!), `${style} ${seed}`).toEqual([]);
        // The way out: something other than plain grass right beyond the step.
        const mass = r.house!.plan.masses.find((m) => m.id === back!.mass)!;
        const [ox, , oz] = VECTOR[back!.outward];
        const k = (back!.niche ? 1 : 0) + (mass.frames ? 3 : 2);
        const ground = [k, k + 1, k + 2].map((d) => blockIdOf(blockAt(r.model, back!.x + ox * d, 0, back!.z + oz * d)));
        expect(ground.some((id) => id !== 'minecraft:grass_block'), `${style} ${seed}: ${ground.join(',')}`).toBe(true);
      }
  });

  it('Detailgrad 1 bleibt schlicht: nur die Haustür', () => {
    const r = build({ style: 'rustic', size: 'medium', seed: 1, detailLevel: 1 });
    expect(r.house!.openings.doors.filter((d) => d.back)).toEqual([]);
  });

  it('die Rückseite liegt für fast alle Häuser im Zielbereich', () => {
    let pass = 0;
    let n = 0;
    for (const style of STYLE_IDS)
      for (const size of ['small', 'medium', 'large'] as const) {
        const r = build({ style, size, seed: 1 });
        const m = measureHouse(r.model, r.house!);
        n++;
        if (m.fourSides.back >= 0.35) pass++;
      }
    expect(pass / n).toBeGreaterThanOrEqual(0.9);
  });
});

describe('Grün am Haus', () => {
  const NATURE: readonly StyleId[] = ['medieval', 'fantasy', 'rustic', 'nordic', 'mediterranean'];

  it('Ranken hängen nur vor vollen Flächen, nie an modernen oder japanischen Häusern, nie im Winter', () => {
    let total = 0;
    for (const style of STYLE_IDS)
      for (const seed of [1, 2, 3]) {
        const r = build({ style, size: 'medium', seed });
        const vines = cells(r.model, (id) => id === 'minecraft:vine');
        if (style === 'modern' || style === 'japanese' || style === 'cherry') expect(vines, style).toEqual([]);
        total += vines.length;
        for (const [x, y, z, s] of vines) {
          const sides = (['north', 'east', 'south', 'west'] as const).filter((d) => propsOf(s)[d] === 'true');
          expect(sides.length, `${style} ${x},${y},${z}`).toBeGreaterThan(0);
          for (const d of sides) {
            const [dx, , dz] = VECTOR[d];
            expect(isFaceFull(blockAt(r.model, x + dx, y, z + dz), OPPOSITE[d] as HorizontalDirection), `${style} ${x},${y},${z} ${d}`).toBe(true);
          }
        }
      }
    expect(total).toBeGreaterThan(10);
    expect(cells(build({ style: 'rustic', size: 'medium', seed: 1, theme: 'winter' }).model, (id) => id === 'minecraft:vine')).toEqual([]);
  });

  it('hohes Gras und große Farne: immer beide Hälften, unten auf Erde, keine Reparatur', () => {
    for (const style of NATURE) {
      const r = build({ style, size: 'medium', seed: 2 });
      const tall = cells(r.model, (_, s) => definitionOf(s).shape === 'tall_plant');
      expect(tall.length, style).toBeGreaterThan(4);
      for (const [x, y, z, s] of tall) {
        const other = propsOf(s).half === 'lower' ? blockAt(r.model, x, y + 1, z) : blockAt(r.model, x, y - 1, z);
        expect(blockIdOf(other), `${style} ${x},${y},${z}`).toBe(blockIdOf(s));
      }
      expect(r.repairs, style).toEqual([]);
    }
    // Clipped gardens stay clipped.
    expect(cells(build({ style: 'japanese', size: 'medium', seed: 2 }).model, (_, s) => definitionOf(s).shape === 'tall_plant')).toEqual([]);
  });

  it('Büsche am Sockel und Bordsteine am Weg, die sich vom Weg abheben', () => {
    for (const style of NATURE) {
      const r = build({ style, size: 'medium', seed: 1 });
      const main = r.house!.plan.masses[0]!;
      const { x0, x1, z0, z1 } = main.rect;
      // Leaves at walking height right outside the plinth (posts and apron reach two further).
      const plinth = cells(r.model, (id) => id.endsWith('_leaves')).filter(([x, y, z]) => y === 1 && x >= x0 - 5 && x <= x1 + 5 && z >= z0 - 5 && z <= z1 + 5);
      expect(plinth.length, style).toBeGreaterThan(2);
    }
    // Medieval: cobblestone path, stone brick curb beside it.
    const m = build({ style: 'medieval', size: 'medium', seed: 1 }).model;
    const curbs = cells(m, (id) => id === 'minecraft:stone_bricks' || id === 'minecraft:mossy_stone_bricks').filter(([x, y, z]) => {
      if (y !== 0) return false;
      return [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dz]) => blockIdOf(blockAt(m, x + dx!, 0, z + dz!)) === 'minecraft:cobblestone');
    });
    expect(curbs.length).toBeGreaterThan(4);
  });

  it('Nutzgarten mit Vogelscheuche neben oder hinter dem Haus, nur ohne Thema', () => {
    let gardens = 0;
    for (const style of NATURE) {
      const r = build({ style, size: 'medium', seed: 1 });
      const heads = cells(r.model, (id) => id === 'minecraft:carved_pumpkin');
      // Only where the side or the back has room for it.
      expect(heads.length, style).toBeLessThanOrEqual(1);
      if (heads.length === 0) continue;
      gardens++;
      const [x, y, z] = heads[0]!;
      expect(blockIdOf(blockAt(r.model, x, y - 1, z)), style).toBe('minecraft:hay_block');
      expect(blockIdOf(blockAt(r.model, x, y - 2, z)), style).toMatch(/_fence$/);
      // Not in the front garden.
      expect(z, style).toBeGreaterThanOrEqual(r.house!.plan.masses[0]!.rect.z0 - 2);
    }
    expect(gardens).toBeGreaterThanOrEqual(4);
    expect(cells(build({ style: 'rustic', size: 'medium', seed: 1, theme: 'christmas' }).model, (id) => id === 'minecraft:carved_pumpkin')).toEqual([]);
  });
});

describe('Weihnachten: Lichterketten und festlicher Vorplatz', () => {
  const lights = (model: VoxelModel) =>
    cells(model, (id) => id.endsWith('candle')).filter(([x, y, z]) => {
      const below = blockAt(model, x, y - 1, z);
      return (blockIdOf(below) === 'minecraft:spruce_trapdoor' && propsOf(below).half === 'top') || y > 8;
    });

  it('bunte Kerzen an Traufe, Ortgang und First – mehrere Farben, alles hält', () => {
    for (const style of ['rustic', 'fantasy', 'nordic', 'medieval', 'mediterranean'] as const) {
      const r = build({ style, size: 'medium', seed: 1, theme: 'christmas' });
      const chain = lights(r.model);
      expect(chain.length, style).toBeGreaterThanOrEqual(6);
      expect(new Set(chain.map(([, , , s]) => blockIdOf(s))).size, style).toBeGreaterThanOrEqual(2);
      expect(r.repairs, style).toEqual([]);
      expect(lintHouse(r.model, r.house!), style).toEqual([]);
    }
    // Japanese and modern houses keep their own lights (lanterns, parapet lights).
    for (const style of ['japanese', 'cherry', 'modern'] as const) {
      const m = build({ style, size: 'medium', seed: 1, theme: 'christmas' }).model;
      expect(cells(m, (id) => id === 'minecraft:spruce_trapdoor').filter(([x, y, z]) => blockIdOf(blockAt(m, x, y + 1, z)).endsWith('candle')), style).toEqual([]);
    }
  });

  it('Detailgrad 2: nur eine kurze Kette, Detailgrad 3: deutlich mehr', () => {
    const two = lights(build({ style: 'rustic', size: 'medium', seed: 1, theme: 'christmas', detailLevel: 2 }).model).length;
    const three = lights(build({ style: 'rustic', size: 'medium', seed: 1, theme: 'christmas', detailLevel: 3 }).model).length;
    expect(three).toBeGreaterThan(two);
  });

  it('Mini-Tannen flankieren den Weg zur Tür; mit Schnee leuchtet eine Kupferlampe statt Schroomlicht', () => {
    const near = (r: ReturnType<typeof build>) => {
      const d = r.house!.openings.doors[0]!;
      return cells(r.model, (id) => id === 'minecraft:spruce_leaves').filter(([x, y, z]) => y === 2 && Math.abs(x - d.x) <= 6 && z < d.z && z >= d.z - 5);
    };
    const plain = build({ style: 'rustic', size: 'medium', seed: 1, theme: 'christmas' });
    expect(near(plain).length).toBeGreaterThanOrEqual(2);
    const snowy = build({ style: 'nordic', size: 'large', seed: 2, theme: 'christmas' }, { snow: true });
    expect(snowy.repairs).toEqual([]);
    // No shroomlight inside a fir under snow (light 15 would melt the snow around it).
    const firLights = cells(snowy.model, (id) => id === 'minecraft:shroomlight').filter(([x, y, z]) => y <= 2 && blockIdOf(blockAt(snowy.model, x, y + 1, z)) === 'minecraft:spruce_leaves');
    expect(firLights).toEqual([]);
  });
});
