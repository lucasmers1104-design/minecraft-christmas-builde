import { describe, expect, it } from 'vitest';
import { AIR, blockIdOf, definitionOf, propsOf } from '@/core/blocks/registry';
import { lintHouse } from '@/core/analysis/buildingLints';
import { measureHouse } from '@/core/analysis/buildQuality';
import { generateBuildingWithReport } from '@/core/generator/generateBuilding';
import { floorY, storeyRect } from '@/core/generator/house/plan';
import { nicheDoor, revealWindow } from '@/core/generator/house/reveal';
import { facadeOf, facadePos } from '@/core/generator/house/walls';
import { buildRoofs, type RoofSectionSpec } from '@/core/generator/roof/roofEngine';
import { VoxelBuilder } from '@/core/generator/geometry';
import { DEFAULT_HOUSE_SPEC, type BuildSpec } from '@/core/schema/buildSpec';
import { blockAt } from '@/core/schema/voxelModel';
import { getTemplate } from '@/core/templates/catalog';
import { STYLE_IDS } from '@/core/style/styles';

/**
 * Phase 3 of "Profi-Builds": depth in every facade (reveal, door niche, shutters or window boxes)
 * and roofs with shaped edges and light at the corners.
 */

const build = (over: Partial<BuildSpec>, options: BuildSpec['options'] = {}) => generateBuildingWithReport({ ...DEFAULT_HOUSE_SPEC, theme: 'none', ...over, options });

describe('Laibung: Glas und Tür eine Ebene zurück', () => {
  it('die Vorlage bekommt Glas in d = −1, eine offene Wandebene und Futter aus der Wandrolle', () => {
    const t = revealWindow(getTemplate('W02'), 'wall');
    const glass = t.cells.filter((c) => c.role === 'glass');
    expect(glass.every((c) => c.d === -1)).toBe(true);
    for (const g of glass) expect(t.cells.some((c) => c.role === 'air' && c.d === 0 && c.x === g.x && c.y === g.y)).toBe(true);
    expect(t.cells.filter((c) => c.role === 'wall' && c.d === -1).length).toBeGreaterThanOrEqual(4);
    // Shoji and glass-block windows stay flush.
    expect(revealWindow(getTemplate('W15'), 'wall')).toBe(getTemplate('W15'));
    const door = nicheDoor(getTemplate('T01'), 'wall');
    expect(door.cells.some((c) => c.role === 'door' && c.d === -1)).toBe(true);
  });

  it('am Haus: zurückgesetzte Scheiben mit Futter, Tür in der Nische, Hauptfassaden mit drei Tiefenebenen', () => {
    for (const style of STYLE_IDS) {
      const r = build({ style, size: 'medium', seed: 2 });
      const { plan, openings } = r.house!;
      const main = plan.masses[0]!;
      let recessed = 0;
      for (let k = 0; k < main.floors; k++) {
        const f = facadeOf(storeyRect(main, k), 'east');
        for (let u = 0; u < f.length; u++)
          for (let y = floorY(plan, k) + 1; y < floorY(plan, k + 1); y++) {
            const back = facadePos(f, u, -1);
            const wall = facadePos(f, u, 0);
            if (blockIdOf(blockAt(r.model, back.x, y, back.z)).includes('glass') && blockAt(r.model, wall.x, y, wall.z) === AIR) recessed++;
          }
      }
      if (style !== 'japanese' && style !== 'cherry') expect(recessed, style).toBeGreaterThan(0);
      if (style !== 'japanese' && style !== 'cherry') expect(openings.doors.some((d) => d.niche), style).toBe(true);
      expect(measureHouse(r.model, r.house!).depth.minLevelsMain, style).toBeGreaterThanOrEqual(style === 'japanese' || style === 'cherry' ? 2 : 3);
      expect(r.repairs, style).toEqual([]);
      expect(lintHouse(r.model, r.house!), style).toEqual([]);
    }
  });

  it('Blumen in Kästen und Töpfen werden im Winter zu Farn und Tannen', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const r = build({ style: 'rustic', size: 'medium', seed, theme: 'winter' }, { windowFamily: 'auto' });
      const ids = new Set(r.model.palette.map(blockIdOf));
      for (const flower of ['red_tulip', 'oxeye_daisy', 'poppy', 'cornflower', 'potted_red_tulip']) expect(ids.has(`minecraft:${flower}`), `${seed} ${flower}`).toBe(false);
    }
  });

  it('japanisches Fachwerk ohne europäische Kopfbänder', () => {
    for (const seed of [1, 2, 3]) {
      const r = build({ style: 'japanese', size: 'large', seed });
      const { plan } = r.house!;
      const main = plan.masses[0]!;
      const f = facadeOf(storeyRect(main, 0), 'south');
      for (let u = 0; u < f.length; u++)
        for (let y = floorY(plan, 0) + 1; y < floorY(plan, 1); y++) {
          const p = facadePos(f, u, 1);
          const s = blockAt(r.model, p.x, y, p.z);
          // Braces are frame stairs facing along the facade inside a panel.
          if (definitionOf(s).shape === 'stairs' && ['east', 'west'].includes(propsOf(s).facing ?? '')) expect.fail(`Kopfband bei ${p.x},${y},${p.z}`);
        }
    }
  });
});

describe('Dachkanten mit Schwung', () => {
  const section = (edge: RoofSectionSpec['edge']): RoofSectionSpec => ({
    id: 'main',
    x0: 4,
    z0: 4,
    x1: 14,
    z1: 10,
    wallTop: 6,
    type: 'gable',
    ridgeAxis: 'x',
    profile: 'standard',
    overhang: 1,
    materials: { roof: 'spruce_planks', trim: 'dark_oak_planks', ridge: 'dark_oak_planks', soffit: 'spruce_planks', gable: 'oak_planks' },
    ridgeStyle: 'slab',
    soffit: true,
    ...(edge ? { edge } : {}),
  });
  const top = (b: VoxelBuilder, x: number, z: number) => {
    for (let y = b.dimensions.height - 1; y >= 0; y--) if (!b.isAir(x, y, z)) return y;
    return -1;
  };

  it('erhöhter Ortgang: das Brett steht über der Dachfläche, die Spitze über dem First', () => {
    const plain = new VoxelBuilder({ width: 20, height: 20, length: 16 });
    const raised = new VoxelBuilder({ width: 20, height: 20, length: 16 });
    const a = buildRoofs(plain, [section(undefined)]);
    const b = buildRoofs(raised, [section({ verge: 'raised', kick: 1 })]);
    // Verge column (x = 3) one block higher along the slope, the apex above the ridge.
    expect(top(raised, 3, 6)).toBe(top(plain, 3, 6) + 1);
    expect(b.topY).toBeGreaterThan(a.topY);
    // Kicked foot: the lowest verge cell carries a stair facing outwards (north at the front).
    const foot = raised.getBlock(3, top(raised, 3, 3), 3);
    expect(definitionOf(foot).shape).toBe('stairs');
    expect(propsOf(foot).facing).toBe('north');
  });

  it('japanische Ecken: die äußerste Ecke eines Walmdachs mit geschwungener Traufe hebt sich', () => {
    const r = build({ style: 'japanese', size: 'medium', seed: 2 }, { composition: 'pagoda' });
    const { sections, roof } = r.house!;
    const main = sections.find((s) => s.id === 'main')!;
    const cx = main.x0 - main.overhang;
    const cz = main.z0 - main.overhang;
    const corner = roof.surface.get(`${cx},${cz}`)!;
    const beside = roof.surface.get(`${cx + 3},${cz}`)!;
    expect(corner).toBeGreaterThan(beside);
    expect(r.repairs).toEqual([]);
  });

  it('Laternen an den Traufecken, Kapellenturm mit gestaffelter Haube und Licht', () => {
    const r = build({ style: 'rustic', size: 'large', seed: 1 }, { composition: 'chapel' });
    const m = measureHouse(r.model, r.house!);
    expect(m.light.eaveCorners).toBeGreaterThanOrEqual(0.5);
    expect(m.light.tower).toBe(true);
    expect(r.house!.sections.some((s) => s.id === 'tower-tier1')).toBe(true);
    expect(r.repairs).toEqual([]);
    expect(lintHouse(r.model, r.house!)).toEqual([]);
  });

  it('lebendes Dach auf dem Häuschen: Moos und Azaleen, ohne Reparatur', () => {
    const r = build({ style: 'fantasy', size: 'small', seed: 3 }, { composition: 'cottage' });
    const ids = new Set(r.model.palette.map(blockIdOf));
    expect(ids.has('minecraft:moss_block')).toBe(true);
    expect(ids.has('minecraft:azalea_leaves') || ids.has('minecraft:flowering_azalea_leaves') || ids.has('minecraft:moss_carpet')).toBe(true);
    expect(r.repairs).toEqual([]);
  });
});
