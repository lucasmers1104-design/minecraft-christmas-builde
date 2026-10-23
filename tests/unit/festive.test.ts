import { describe, expect, it } from 'vitest';
import { countMaterials } from '@/core/analysis/materialCounts';
import { floatingBlocks, lintHouse } from '@/core/analysis/buildingLints';
import { AIR, blockIdOf, blockState, definitionOf, propsOf } from '@/core/blocks/registry';
import { buildChristmasTree, treeProfile } from '@/core/generator/christmasTree';
import { decorateFestive } from '@/core/generator/festive';
import { FESTIVE_KITS, festiveChoices, WINTER_TREE_KIT } from '@/core/generator/festiveKits';
import { Priority, VoxelBuilder } from '@/core/generator/geometry';
import { generateBuilding, generateBuildingWithReport } from '@/core/generator/generateBuilding';
import { createSeededRandom } from '@/core/generator/seededRandom';
import { DEFAULT_HOUSE_SPEC, STYLE_IDS, type BuildSpec } from '@/core/schema/buildSpec';
import { blockAt, type VoxelModel } from '@/core/schema/voxelModel';

const spec = (over: Partial<BuildSpec> = {}, options: BuildSpec['options'] = {}): BuildSpec => ({ ...DEFAULT_HOUSE_SPEC, ...over, options });
const ids = (m: VoxelModel) => new Set(countMaterials(m).byBlock.map((b) => b.blockId));
const count = (m: VoxelModel, test: (id: string, state: string) => boolean) => {
  let n = 0;
  for (const i of m.indices) {
    const s = m.palette[i]!;
    if (s !== AIR && test(blockIdOf(s), s)) n++;
  }
  return n;
};
const isOrnament = (id: string) => /_(wool|concrete|terracotta)$/.test(id) || id === 'minecraft:gold_block' || id === 'minecraft:iron_block';
const isLight = (id: string) => /froglight|shroomlight|glowstone|sea_lantern|copper_bulb/.test(id);

/** Stand-alone tree in an empty plot (no presents), trunk at (h, 1, h). */
function soloTree(height: number, o: Partial<Parameters<typeof buildChristmasTree>[6]> = {}) {
  const half = Math.max(...treeProfile(height).radii) + 5;
  const b = new VoxelBuilder({ width: 2 * half + 1, height: height + 3, length: 2 * half + 1 });
  for (let x = 0; x <= 2 * half; x++) for (let z = 0; z <= 2 * half; z++) b.setBlock(x, 0, z, blockState('grass_block'), Priority.DECOR);
  const tree = buildChristmasTree(b, createSeededRandom(7).fork('t'), half, 1, half, height, { theme: 'christmas', intensity: 3, lights: true, star: true, style: 'nordic', ...o });
  return { b, tree, half, model: b.toModel(spec({ kind: 'tree' })) };
}

describe('Weihnachtsbaum: Etagenprofil (Bericht 17 A1)', () => {
  it('Etagen mit Rücksprung: jede Etage beginnt deutlich kleiner, als die vorige endete', () => {
    for (const h of [12, 18, 26, 40]) {
      const p = treeProfile(h);
      expect(p.tiers.length, `H=${h}`).toBeGreaterThanOrEqual(h >= 18 ? 4 : 2);
      for (let i = 1; i < p.tiers.length; i++) {
        const prevEnd = p.radii[p.tiers[i - 1]!.to]!;
        const start = p.radii[p.tiers[i]!.from]!;
        // The top tier of small trees ends at radius 1: the next one cannot start smaller.
        if (prevEnd >= 2) expect(prevEnd - start, `H=${h} Etage ${i}`).toBeGreaterThanOrEqual(1);
        if (h >= 18 && i >= 2) expect(prevEnd - start, `H=${h} Etage ${i}`).toBeGreaterThanOrEqual(2);
      }
      // Base width about 0.6–0.85 of the crown height.
      const R = Math.max(...p.radii);
      expect((2 * R + 1) / p.radii.length, `H=${h}`).toBeGreaterThan(0.55);
      expect((2 * R + 1) / p.radii.length, `H=${h}`).toBeLessThan(0.95);
      // Total height: trunk + crown + star.
      expect(p.trunkBelow + p.radii.length + p.starHeight, `H=${h}`).toBe(h);
    }
    expect(treeProfile(18).tiers.map((t) => treeProfile(18).radii.slice(t.from, t.to + 1).join(','))).toEqual(['0,1,2', '1,2,3', '1,2,3,4', '2,3,4,5']);
  });

  it('gelappte Lagen (Lappen je Etage gedreht), hängende Spitzen und hohles Inneres', () => {
    const { model, half } = soloTree(26);
    const p = treeProfile(26);
    const bottomY = 1 + p.trunkBelow;
    const crownTop = bottomY + p.radii.length - 1;
    const leaf = (x: number, y: number, z: number) => blockAt(model, x, y, z) !== AIR && !blockIdOf(blockAt(model, x, y, z)).includes('log');
    let lobed = 0;
    let checked = 0;
    p.radii.forEach((r, i) => {
      if (r < 4) return;
      const y = crownTop - i;
      // Outer radius per 20° sector.
      const outer: number[] = new Array(18).fill(0);
      for (let dx = -r - 3; dx <= r + 3; dx++)
        for (let dz = -r - 3; dz <= r + 3; dz++) {
          if (!leaf(half + dx, y, half + dz)) continue;
          const s = Math.floor(((Math.atan2(dz, dx) + Math.PI) / (2 * Math.PI)) * 18) % 18;
          outer[s] = Math.max(outer[s]!, Math.hypot(dx, dz));
        }
      checked++;
      if (Math.max(...outer) - Math.min(...outer) >= 1) lobed++;
      // Hollow: half way between trunk and rim there is no leaf (air or a branch).
      const mid = Math.floor(r / 2);
      if (r >= 6) expect(blockAt(model, half + mid, y, half).includes('_leaves'), `Lage ${i}`).toBe(false);
    });
    expect(checked).toBeGreaterThan(5);
    expect(lobed).toBe(checked);
    // Hanging tips: leaves one row under a tier rim, outside the next tier's top layer.
    let tips = 0;
    for (const t of p.tiers.slice(0, -1)) {
      const y = crownTop - t.to - 1;
      const rb = p.radii[t.to]!;
      for (let dx = -rb - 2; dx <= rb + 2; dx++)
        for (let dz = -rb - 2; dz <= rb + 2; dz++) if (Math.hypot(dx, dz) >= rb - 1 && leaf(half + dx, y, half + dz)) tips++;
    }
    expect(tips).toBeGreaterThan(4);
  });

  it('hohl gebaut: bei H = 40 mindestens 40 % weniger Laub als der Baum vor dieser Etappe', () => {
    // The previous generator (commit 4fa2db3) used 8896 leaves for H = 40 (measured).
    const { model } = soloTree(40);
    expect(count(model, (id) => id.endsWith('_leaves'))).toBeLessThan(8896 * 0.6);
    // And clearly fewer than full discs of the same profile.
    const p = treeProfile(40);
    const full = p.radii.reduce((n, r) => n + Math.PI * (r + 0.5) ** 2, 0);
    expect(count(model, (id) => id.endsWith('_leaves'))).toBeLessThan(full * 0.7);
  });

  it('Stamm sichtbar unter der untersten Etage, Stammfuß wächst mit der Höhe', () => {
    for (const h of [12, 26, 40]) {
      const { model, half } = soloTree(h);
      const p = treeProfile(h);
      for (let y = 1; y < 1 + p.trunkBelow; y++) expect(blockIdOf(blockAt(model, half, y, half)), `H=${h} y=${y}`).toBe('minecraft:spruce_log');
      expect(blockAt(model, half + 1, 1 + p.trunkBelow - 1, half).includes('leaves'), `H=${h}`).toBe(false);
    }
    expect(blockIdOf(blockAt(soloTree(26).model, soloTree(26).half + 1, 1, soloTree(26).half))).toBe('minecraft:spruce_log');
  });
});

describe('Weihnachtsbaum: Schmuck, Licht und Stern (Bericht 17 A5/A6, 14 B1–B4)', () => {
  it('Schmuck 3–6 % der Hülle, höchstens 3 Farben, nie zwei Schmuckblöcke nebeneinander', () => {
    for (const style of STYLE_IDS)
      for (const h of [18, 26]) {
        const { model, b } = soloTree(h, { style });
        const kit = FESTIVE_KITS[style].treeDecor;
        const kitIds = new Set(kit.ornaments.map(([id]) => `minecraft:${id}`));
        expect(kit.ornaments.length).toBeLessThanOrEqual(3);
        const cells: [number, number, number][] = [];
        let hull = 0;
        const { width: W, height: H, length: L } = model.dimensions;
        for (let y = 1; y < H; y++)
          for (let z = 0; z < L; z++)
            for (let x = 0; x < W; x++) {
              const s = blockAt(model, x, y, z);
              if (s === AIR) continue;
              const id = blockIdOf(s);
              const side = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => b.inside(x + dx!, y, z + dz!) && b.isAir(x + dx!, y, z + dz!));
              if (side && (id.endsWith('_leaves') || kitIds.has(id))) hull++;
              // Star blocks sit above the crown; only count ornaments in the crown.
              if (kitIds.has(id) && y < H - 8) cells.push([x, y, z]);
            }
        const share = cells.length / hull;
        expect(share, `${style} H=${h}`).toBeGreaterThan(0.02);
        expect(share, `${style} H=${h}`).toBeLessThan(0.07);
        for (const [i, p] of cells.entries())
          for (const q of cells.slice(i + 1)) expect(Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(p[2] - q[2])), `${style} H=${h}`).toBeGreaterThanOrEqual(2);
      }
  });

  it('kleine Bäume (H < 12) ohne Vollblock-Kugeln, dafür Laternen an Ketten', () => {
    for (const h of [9, 10, 11]) {
      const { model } = soloTree(h);
      expect(count(model, (id) => isOrnament(id)), `H=${h}`).toBe(0);
      expect(count(model, (id) => id === 'minecraft:lantern'), `H=${h}`).toBeGreaterThanOrEqual(2);
      expect(count(model, (id) => id === 'minecraft:iron_chain'), `H=${h}`).toBeGreaterThanOrEqual(2);
    }
  });

  it('genau eine Lichtart; mindestens 40 % der Lichter glimmen hinter der Hülle', () => {
    for (const style of STYLE_IDS) {
      const { model, b } = soloTree(26, { style });
      const lights = new Map<string, number>();
      let behind = 0;
      let total = 0;
      const { width: W, height: H, length: L } = model.dimensions;
      const starFrom = H - 3 - treeProfile(26).starHeight - 1;
      for (let y = 1; y < starFrom; y++)
        for (let z = 0; z < L; z++)
          for (let x = 0; x < W; x++) {
            const id = blockIdOf(blockAt(model, x, y, z));
            if (!isLight(id)) continue;
            lights.set(id, (lights.get(id) ?? 0) + 1);
            total++;
            if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => b.isAir(x + dx!, y, z + dz!))) behind++;
          }
      expect(lights.size, style).toBe(1);
      expect(behind / total, style).toBeGreaterThanOrEqual(0.4);
    }
  });

  it('der Stern wächst mit dem Baum und ist nie ein einzelner Goldwürfel', () => {
    const width = (h: number) => {
      const { model, half } = soloTree(h);
      const p = treeProfile(h);
      const crownTop = p.trunkBelow + p.radii.length;
      let w = 0;
      // Star rows: from the crown top (the plus star replaces it) upwards.
      for (let y = crownTop; y < model.dimensions.height; y++) {
        let row = 0;
        for (let x = 0; x < model.dimensions.width; x++) if (['minecraft:gold_block', 'minecraft:ochre_froglight'].includes(blockIdOf(blockAt(model, x, y, half)))) row++;
        w = Math.max(w, row);
      }
      return { w, gold: count(model, (id) => id === 'minecraft:gold_block') };
    };
    expect(width(12)).toEqual({ w: 0, gold: 0 }); // end-rod sparkle, no cube
    expect(width(18).w).toBe(3);
    expect(width(26).w).toBe(5);
    expect(width(40).w).toBe(7);
    const small = soloTree(12).model;
    expect(count(small, (id) => id === 'minecraft:end_rod')).toBe(5);
    // Winter: white star, pearlescent light.
    expect(WINTER_TREE_KIT.starOutline).not.toBe('gold_block');
  });

  it('Schnee auf Wunsch: Lichter als angelaufene Kupferleuchten (Licht 12, Schnee bleibt liegen)', () => {
    const r = generateBuildingWithReport(spec({ kind: 'tree', size: 'medium' }, { snow: true }));
    expect(r.repairs).toEqual([]);
    expect(ids(r.model).has('minecraft:waxed_exposed_copper_bulb')).toBe(true);
  });

  it('ohne Thema: natürliche Fichte ohne Schmuck, Licht und Stern', () => {
    const { model } = soloTree(26, { theme: 'none' });
    expect(count(model, (id) => isOrnament(id) || isLight(id) || id === 'minecraft:end_rod')).toBe(0);
  });

  it('deterministisch: gleicher Seed, bitgleicher Baum', () => {
    for (const size of ['small', 'medium', 'large', 'huge'] as const) {
      const a = generateBuilding(spec({ kind: 'tree', size }));
      expect(generateBuilding(spec({ kind: 'tree', size })).hash, size).toBe(a.hash);
      expect(generateBuilding(spec({ kind: 'tree', size, seed: 2 })).hash, size).not.toBe(a.hash);
    }
  });
});

/** Present blocks: paper of a style kit (wool, terracotta, concrete, barrels, copper). */
const PAPER = /_(wool|terracotta|concrete)$|barrel$|waxed_copper_block$/;

describe('Geschenke (Bericht 14 P1–P3, 17 A7)', () => {
  it('am Baum: Gruppen unter und direkt vor der untersten Etage, gedeckte Farben, immer mit Band', () => {
    for (const size of ['small', 'medium', 'large', 'huge'] as const)
      for (const style of ['rustic', 'nordic', 'medieval', 'modern'] as const) {
        const m = generateBuilding(spec({ kind: 'tree', size, style }));
        const half = (m.dimensions.width - 1) / 2;
        const R = Math.max(...treeProfile({ small: 12, medium: 18, large: 26, huge: 40 }[size]).radii);
        const papers = new Set<string>();
        const cells: [number, number][] = [];
        for (let z = 0; z < m.dimensions.length; z++)
          for (let x = 0; x < m.dimensions.width; x++) {
            const s = blockAt(m, x, 1, z);
            const id = blockIdOf(s);
            if (!PAPER.test(id)) continue;
            papers.add(id.replace(/^minecraft:/, ''));
            cells.push([x, z]);
            expect(Math.hypot(x - half, z - half), `${style} ${size}`).toBeLessThanOrEqual(R + 4);
            // Something on top: ribbon carpet, band, candle bow or a second paper block.
            expect(blockAt(m, x, 2, z), `${style} ${size} ${x},${z}`).not.toBe(AIR);
          }
        expect(cells.length, `${style} ${size}`).toBeGreaterThanOrEqual(2);
        for (const p of papers) expect(p, style).not.toMatch(/^(lime|light_blue)_|^yellow_concrete$/);
        // In groups: every present touches another one.
        for (const [x, z] of cells) expect(cells.some(([a, c]) => (a !== x || c !== z) && Math.max(Math.abs(a - x), Math.abs(c - z)) <= 1), `${style} ${size}`).toBe(true);
      }
  });

  it('am Haus: nur unter dem Gartenbaum oder neben dem Eingang, nie vor der Tür', () => {
    for (const style of STYLE_IDS)
      for (const seed of [1, 2, 3]) {
        const r = generateBuildingWithReport(spec({ style, seed, size: 'medium' }, { presents: true }));
        const door = r.house!.openings.doors[0]!;
        const m = r.model;
        // Trunks of garden trees: upright spruce logs standing on the ground.
        const trunks: [number, number][] = [];
        for (let z = 0; z < m.dimensions.length; z++)
          for (let x = 0; x < m.dimensions.width; x++) {
            const s = blockAt(m, x, 1, z);
            if (blockIdOf(s) === 'minecraft:spruce_log' && propsOf(s).axis === 'y' && blockIdOf(blockAt(m, x, 2, z)) === 'minecraft:spruce_log') trunks.push([x, z]);
          }
        for (let y = 1; y < 6; y++)
          for (let z = 0; z < m.dimensions.length; z++)
            for (let x = 0; x < m.dimensions.width; x++) {
              const s = blockAt(m, x, y, z);
              if (!blockIdOf(s).endsWith('_carpet')) continue;
              const below = blockIdOf(blockAt(m, x, y - 1, z));
              if (!PAPER.test(below)) continue;
              // A present: near the door (beside it) or under a tree (leaves somewhere above).
              const nearDoor = Math.abs(x - door.x) <= 6 && Math.abs(z - door.z) <= 5;
              const underTree = trunks.some(([tx, tz]) => Math.hypot(tx - x, tz - z) <= 6);
              expect(nearDoor || underTree, `${style} ${seed} ${x},${y},${z}`).toBe(true);
            }
        expect(lintHouse(r.model, r.house!), `${style} ${seed}`).toEqual([]);
        expect(r.repairs).toEqual([]);
      }
  });
});

describe('Girlanden (Bericht 14 GA1/GA2, 02 P11)', () => {
  it('Licht sparsam und versteckt, Schleifen nur an Ankern, echter Durchhang', () => {
    let sagging = 0;
    for (const style of ['rustic', 'fantasy', 'mediterranean', 'nordic', 'medieval'] as const)
      for (const seed of [1, 2, 3]) {
        const r = generateBuildingWithReport(spec({ style, seed, size: 'large' }));
        const m = r.model;
        let garland = 0;
        let lights = 0;
        for (const c of r.house!.roof.eaveCells) {
          const id = blockIdOf(blockAt(m, c.x, c.y, c.z));
          // Never a light block in the outer eave cell.
          expect(isLight(id), `${style} ${seed} ${c.x},${c.y},${c.z}`).toBe(false);
          const below = blockIdOf(blockAt(m, c.x, c.y - 1, c.z));
          if (id.endsWith('_leaves') || id === 'minecraft:red_wool') garland++;
          if (below.endsWith('_leaves') && id === 'minecraft:air') sagging++;
          // No leaves in y and y − 1 at the same time (a sag is a sag, not a clump).
          if (id.endsWith('_leaves') && c.y - 1 >= 0) expect(below.endsWith('_leaves'), `${style} ${seed}`).toBe(false);
          const [ox, oz] = c.outward === 'north' ? [0, -1] : c.outward === 'south' ? [0, 1] : c.outward === 'east' ? [1, 0] : [-1, 0];
          if (isLight(blockIdOf(blockAt(m, c.x - ox, c.y, c.z - oz)))) lights++;
        }
        if (garland > 0) expect(lights, `${style} ${seed}`).toBeLessThanOrEqual(Math.ceil(garland / 4));
        // Bows only at anchors: never two bows closer than 4 along the eaves.
        const bows = r.house!.roof.eaveCells.filter((c) => blockIdOf(blockAt(m, c.x, c.y, c.z)) === 'minecraft:red_wool');
        for (const [i, p] of bows.entries())
          for (const q of bows.slice(i + 1)) if (p.y === q.y && p.outward === q.outward) expect(Math.abs(p.x - q.x) + Math.abs(p.z - q.z), style).toBeGreaterThanOrEqual(4);
      }
    expect(sagging).toBeGreaterThan(0);
  });

  it('Mittelalter: keine Wollschleifen und keine Woll- oder Betonblöcke', () => {
    for (const seed of [1, 2, 3])
      for (const size of ['small', 'medium', 'large'] as const) {
        const m = generateBuilding(spec({ style: 'medieval', seed, size }));
        expect(count(m, (id) => /_(wool|concrete)$/.test(id)), `${seed} ${size}`).toBe(0);
      }
  });
});

describe('Kranz (Bericht 14 K1/K2)', () => {
  /** A plain 15-wide wall facing north with a door in the middle (synthetic test facade). */
  function wallWithDoor(windowAt: number[] = []) {
    const b = new VoxelBuilder({ width: 17, height: 10, length: 8 });
    for (let x = 0; x < 17; x++) for (let z = 0; z < 8; z++) b.setBlock(x, 0, z, blockState('grass_block'), Priority.STRUCTURE);
    for (let x = 1; x <= 15; x++) for (let y = 1; y <= 8; y++) b.setBlock(x, y, 5, blockState('spruce_planks'), Priority.STRUCTURE);
    for (const x of windowAt) for (const y of [2, 3]) b.setBlock(x, y, 5, blockState('glass_pane'), Priority.STRUCTURE);
    b.setBlock(8, 1, 5, blockState('spruce_door', { facing: 'north', half: 'lower' }), Priority.STRUCTURE);
    b.setBlock(8, 2, 5, blockState('spruce_door', { facing: 'north', half: 'upper' }), Priority.STRUCTURE);
    return b;
  }

  it('Ring mit hohler Mitte auf fensterfreier Wand über der Tür, nie in der Tür-Freihaltung', () => {
    const b = wallWithDoor();
    decorateFestive(b, createSeededRandom(1), { eaves: [], doors: [{ x: 8, y: 1, z: 5, outward: 'north', width: 1 }], sills: [], yard: [] }, {
      theme: 'christmas',
      intensity: 2,
      garland: false,
      presents: false,
      lantern: 'lantern',
      lanternDensity: 'none',
      minecraftVersion: '1.21.11',
      style: 'rustic',
    });
    const ring: string[] = [];
    for (const y of [5, 4, 3]) {
      let row = '';
      for (const x of [7, 8, 9]) {
        const id = blockIdOf(b.getBlock(x, y, 4));
        row += id.endsWith('_leaves') ? 'L' : id === 'minecraft:red_wool' ? 'B' : id === 'minecraft:air' ? '.' : '?';
      }
      ring.push(row);
    }
    expect(ring).toEqual(['LLL', 'L.L', 'LBL']);
    // Door clearance stays free.
    for (const z of [4, 3]) for (const y of [1, 2]) expect(b.getBlock(8, y, z)).toBe(AIR);
  });

  it('kein Kranz vor Fenstern: neben der Tür nur, wo die Wand fensterfrei ist', () => {
    // A transom window above the door: the wreath moves beside the door.
    const b = wallWithDoor([6, 10]);
    for (const x of [7, 8, 9]) b.setBlock(x, 4, 5, blockState('glass_pane'), Priority.OPENING);
    decorateFestive(b, createSeededRandom(1), { eaves: [], doors: [{ x: 8, y: 1, z: 5, outward: 'north', width: 1 }], sills: [], yard: [] }, {
      theme: 'christmas',
      intensity: 2,
      garland: false,
      presents: false,
      lantern: 'lantern',
      lanternDensity: 'none',
      minecraftVersion: '1.21.11',
      style: 'rustic',
    });
    let leaves = 0;
    for (let x = 0; x < 17; x++)
      for (let y = 1; y < 10; y++) {
        const s = b.getBlock(x, y, 4);
        if (!s.includes('_leaves') && !s.includes('red_wool')) continue;
        leaves++;
        expect(blockIdOf(b.getBlock(x, y, 5)), `${x},${y}`).not.toContain('glass');
      }
    expect(leaves).toBe(8);
  });

  it('am Haus: Kränze nur auf Wand, nie vor Glas oder in der Tür-Freihaltung', () => {
    let placed = 0;
    for (const style of ['rustic', 'nordic', 'modern', 'fantasy', 'medieval', 'mediterranean'] as const)
      for (const seed of [1, 2, 3, 4]) {
        const r = generateBuildingWithReport(spec({ style, seed, size: 'large' }));
        const bow = FESTIVE_KITS[style].wreathBow;
        if (bow) placed += count(r.model, (id) => id === `minecraft:${bow}`) > 0 ? 1 : 0;
        expect(lintHouse(r.model, r.house!), `${style} ${seed}`).toEqual([]);
      }
    expect(placed).toBeGreaterThan(12);
  });
});

describe('Kerzen-Ordnung (Bericht 18 Empf. 7, 14 L1)', () => {
  it('je Fassade eine Farbe und eine Anzahl', () => {
    for (const style of STYLE_IDS)
      for (const theme of ['christmas', 'winter'] as const) {
        const r = generateBuildingWithReport(spec({ style, theme, size: 'large', seed: 2 }));
        const m = r.model;
        const byFacade = new Map<string, Set<string>>();
        for (let y = 1; y < m.dimensions.height; y++)
          for (let z = 0; z < m.dimensions.length; z++)
            for (let x = 0; x < m.dimensions.width; x++) {
              const s = blockAt(m, x, y, z);
              if (definitionOf(s).shape !== 'candle') continue;
              // Candles on the grass are farolitos; sill candles stand in front of a window.
              if (blockIdOf(blockAt(m, x, y - 1, z)) === 'minecraft:grass_block') continue;
              const glass = (
                [
                  [0, 1, 'n'],
                  [0, -1, 's'],
                  [1, 0, 'w'],
                  [-1, 0, 'e'],
                ] as const
              ).find(([dx, dz]) => blockIdOf(blockAt(m, x + dx, y, z + dz)).includes('glass'));
              if (!glass) continue;
              const side = glass[2];
              const k = `${side}|${side === 'n' || side === 's' ? z : x}`;
              const set = byFacade.get(k) ?? new Set<string>();
              set.add(`${blockIdOf(s)}×${propsOf(s).candles}`);
              byFacade.set(k, set);
            }
        for (const [k, set] of byFacade) expect([...set], `${style} ${theme} ${k}`).toHaveLength(1);
        if (theme === 'winter') for (const set of byFacade.values()) expect([...set][0]!.startsWith('minecraft:white_candle'), style).toBe(true);
      }
  });
});

describe('Fest-Kits je Stil', () => {
  it('Japanisch und Kirschblüte: kein Baum, keine Geschenke, keine Girlande – Kadomatsu-Paar und Laternen', () => {
    for (const style of ['japanese', 'cherry'] as const)
      for (const seed of [1, 2]) {
        const r = generateBuildingWithReport(spec({ style, seed, size: 'medium' }));
        const m = r.model;
        expect(count(m, (id) => /_wool$/.test(id)), `${style} ${seed}`).toBe(0);
        // No christmas tree: its star is made of end rods (a garden pine may still stand there).
        expect(count(m, (id) => id === 'minecraft:end_rod'), `${style} ${seed}`).toBe(0);
        expect(count(m, (id) => id === 'minecraft:bamboo_block'), `${style} ${seed}`).toBeGreaterThanOrEqual(2);
        expect(count(m, (id, s) => id === 'minecraft:lantern' && propsOf(s).hanging === 'true'), `${style} ${seed}`).toBeGreaterThanOrEqual(4);
        expect(r.repairs).toEqual([]);
      }
    // An explicit wish still works.
    const wished = generateBuilding(spec({ style: 'japanese', size: 'large' }, { christmasTree: true, presents: true }));
    expect(count(wished, (id) => id === 'minecraft:spruce_log')).toBeGreaterThan(0);
    expect(festiveChoices('japanese', 'christmas', 3, {})).toEqual({ tree: false, presents: false, garland: false });
    expect(festiveChoices('japanese', 'christmas', 3, { garland: true }).garland).toBe(true);
  });

  it('Mittelalter: Holzstapel und rote Kerzen statt Woll-Geschenken', () => {
    let piles = 0;
    for (const seed of [1, 2, 3]) {
      const m = generateBuilding(spec({ style: 'medieval', seed, size: 'medium' }));
      expect(ids(m).has('minecraft:red_candle'), String(seed)).toBe(true);
      // Logs lying across the wall at ground level (axis x or z) are the woodpile.
      if (count(m, (id, s) => id === 'minecraft:spruce_log' && propsOf(s).axis !== 'y') >= 3) piles++;
    }
    expect(piles).toBeGreaterThanOrEqual(2);
  });

  it('Nordisch: Julenek, Julbock (ab mittel) und höchstens zwei Geschenke', () => {
    for (const seed of [1, 2]) {
      const m = generateBuilding(spec({ style: 'nordic', seed, size: 'medium' }));
      expect(count(m, (id) => id === 'minecraft:hay_block'), String(seed)).toBeGreaterThanOrEqual(5);
      expect(ids(m).has('minecraft:birch_fence'), String(seed)).toBe(true);
      // Julenek: a hay sheaf on a spruce pole.
      let julenek = 0;
      for (let y = 2; y < m.dimensions.height; y++)
        for (let z = 0; z < m.dimensions.length; z++)
          for (let x = 0; x < m.dimensions.width; x++)
            if (blockIdOf(blockAt(m, x, y, z)) === 'minecraft:hay_block' && blockIdOf(blockAt(m, x, y - 1, z)) === 'minecraft:spruce_fence' && blockIdOf(blockAt(m, x, y - 2, z)) === 'minecraft:spruce_fence') julenek++;
      expect(julenek, String(seed)).toBe(1);
    }
  });

  it('Modern: Lichtband in der Attika, keine Hängelaternen an Ketten', () => {
    const r = generateBuildingWithReport(spec({ style: 'modern', size: 'medium', seed: 1 }));
    expect(count(r.model, (id) => id === 'minecraft:pearlescent_froglight')).toBeGreaterThanOrEqual(6);
    expect(r.repairs).toEqual([]);
  });

  it('Mediterran: Farolitos – mindestens sechs Kerzen am Weg', () => {
    for (const seed of [1, 2]) {
      const m = generateBuilding(spec({ style: 'mediterranean', seed, size: 'medium' }));
      expect(count(m, (id, s) => id === 'minecraft:white_candle' && propsOf(s).candles === '2'), String(seed)).toBeGreaterThanOrEqual(6);
    }
  });

  it('Fantasy: ein Paar Zuckerstangen am Weg, Haken zum Weg', () => {
    let pairs = 0;
    for (const seed of [1, 2, 3]) {
      const r = generateBuildingWithReport(spec({ style: 'fantasy', seed, size: 'medium' }));
      const m = r.model;
      // Shaft: white, red, white, red (bottom up) standing on the ground.
      const shafts: [number, number][] = [];
      for (let z = 0; z < m.dimensions.length; z++)
        for (let x = 0; x < m.dimensions.width; x++) {
          const col = [1, 2, 3, 4].map((y) => blockIdOf(blockAt(m, x, y, z)));
          if (col.join() === 'minecraft:white_concrete,minecraft:red_concrete,minecraft:white_concrete,minecraft:red_concrete') shafts.push([x, z]);
        }
      if (shafts.length === 2) pairs++;
      expect(r.repairs).toEqual([]);
      expect(lintHouse(m, r.house!), String(seed)).toEqual([]);
    }
    expect(pairs).toBeGreaterThanOrEqual(2);
  });

  it('Winter und Weihnachten mit Schnee: alle Stile ohne Reparatur und Lint-Befund, nichts schwebt', () => {
    for (const style of STYLE_IDS)
      for (const theme of ['winter', 'christmas'] as const)
        for (const snow of [false, true]) {
          const r = generateBuildingWithReport(spec({ style, theme, size: 'medium', seed: 3 }, { snow }));
          expect(r.repairs, `${style} ${theme} ${snow}`).toEqual([]);
          expect(lintHouse(r.model, r.house!), `${style} ${theme} ${snow}`).toEqual([]);
        }
    for (const kind of ['tree', 'market_stall', 'station', 'tower'] as const)
      for (const theme of ['winter', 'christmas'] as const) {
        const r = generateBuildingWithReport(spec({ kind, theme, size: 'large' }, { snow: true }));
        expect(r.repairs, `${kind} ${theme}`).toEqual([]);
        expect(floatingBlocks(r.model), `${kind} ${theme}`).toBe(0);
      }
  });

  it('keine Eiszapfen in irgendeiner Form (keine nach unten zeigenden Endstäbe, kein Tropfstein)', () => {
    for (const style of STYLE_IDS)
      for (const kind of ['house', 'tree'] as const) {
        const m = generateBuilding(spec({ style, kind, size: 'large' }, { snow: true }));
        expect(count(m, (id, s) => (id === 'minecraft:end_rod' && propsOf(s).facing === 'down') || id.includes('dripstone') || id.includes('icicle')), `${style} ${kind}`).toBe(0);
      }
  });
});
