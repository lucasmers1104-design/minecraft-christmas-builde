import { describe, expect, it } from 'vitest';
import { lintHouse } from '@/core/analysis/buildingLints';
import { blockIdOf, checkBlockState, definitionOf, propsOf } from '@/core/blocks/registry';
import { generateBuilding, generateBuildingWithReport } from '@/core/generator/generateBuilding';
import { resolveHouseInput } from '@/core/generator/house/resolveInput';
import { createSeededRandom } from '@/core/generator/seededRandom';
import { buildStation, columnPositions, type StationLayout } from '@/core/generator/station';
import { DEFAULT_HOUSE_SPEC, STYLE_IDS, type BuildSpec } from '@/core/schema/buildSpec';
import { blockAt, type VoxelModel } from '@/core/schema/voxelModel';

const SIZES = ['small', 'medium', 'large', 'huge'] as const;
const spec = (over: Partial<BuildSpec> = {}): BuildSpec => ({ ...DEFAULT_HOUSE_SPEC, kind: 'station', ...over, options: {} });
const AIR = 'minecraft:air';

/** The station exactly as generateBuilding builds it (checked by hash), plus its layout. */
function station(s: BuildSpec): { model: VoxelModel; layout: StationLayout } {
  const rng = createSeededRandom(s.seed);
  const width = { small: 9, medium: 11, large: 15, huge: 19 }[s.size];
  const depth = { small: 7, medium: 9, large: 11, huge: 13 }[s.size];
  const wishes = { width, depth, floorHeight: 6, chimney: false, wings: 'none', annex: 'none', porch: false, dormers: 0 } as const;
  const input = resolveHouseInput(s.style, s.theme, s.size, s.detailLevel, s.seed, s.targetMinecraftVersion, wishes, rng);
  const { builder, layout } = buildStation(input, rng.fork('station'));
  return { model: builder.finalize(s).model, layout };
}

describe('Bahnhof: alle Stile, Größen und Themen', () => {
  it.each(STYLE_IDS.map((s) => [s]))('%s: gültig, ohne Reparaturen und ohne Lint-Befund', (style) => {
    for (const size of SIZES)
      for (const theme of ['none', 'christmas'] as const) {
        const r = generateBuildingWithReport(spec({ style, size, theme }));
        const label = `${style} ${size} ${theme}`;
        expect(r.repairs, label).toEqual([]);
        expect(lintHouse(r.model, r.house!), label).toEqual([]);
        for (const state of r.model.palette) expect(checkBlockState(state, '1.21.11').ok, state).toBe(true);
      }
  });

  it('Detailgrad 1 und Winter ohne Reparaturen; Profil 1.21.1 mit chain', () => {
    for (const style of STYLE_IDS) {
      expect(generateBuildingWithReport(spec({ style, detailLevel: 1, theme: 'winter' })).repairs, style).toEqual([]);
      const old = generateBuildingWithReport(spec({ style, targetMinecraftVersion: '1.21.1' }));
      expect(old.repairs, style).toEqual([]);
      expect(old.model.palette.some((s) => blockIdOf(s) === 'minecraft:chain'), style).toBe(true);
    }
  });

  it('ist deterministisch, und die Testhilfe baut genau das Modell von generateBuilding', () => {
    for (const style of ['medieval', 'modern'] as const) {
      const s = spec({ style, size: 'large', seed: 4 });
      expect(generateBuilding(s).hash).toBe(generateBuilding(s).hash);
      expect(station(s).model.hash).toBe(generateBuilding(s).hash);
    }
  });
});

describe('Hausbahnsteig und Kante (Bericht 17, Empfehlungen 7 und 10)', () => {
  it('kein Gras zwischen Gebäude und Bahnsteig; Kante als Kopfüber-Treppe, Sicherheitslinie einen Block dahinter', () => {
    for (const style of STYLE_IDS)
      for (const size of SIZES) {
        const { model, layout } = station(spec({ style, size }));
        const label = `${style} ${size}`;
        const p = layout.platform;
        const masses = layout.plan.masses;
        const bx0 = Math.min(...masses.map((m) => m.rect.x0));
        const bx1 = Math.max(...masses.map((m) => m.rect.x1));
        for (let x = bx0; x <= bx1; x++)
          for (let z = p.z0; z <= layout.edgeZ; z++) {
            expect(blockAt(model, x, 0, z), `${label} ${x},${z}`).not.toBe('minecraft:grass_block');
            expect(blockAt(model, x, 1, z), `${label} ${x},${z}`).not.toBe(AIR);
          }
        for (let x = p.x0; x <= p.x1; x++) {
          const edge = blockAt(model, x, 1, layout.edgeZ);
          expect(definitionOf(edge).shape, label).toBe('stairs');
          expect(propsOf(edge).half, label).toBe('top');
          expect(propsOf(edge).facing, label).toBe('north');
          expect(blockAt(model, x, 1, layout.lineZ), label).toBe('minecraft:white_concrete');
        }
        expect(layout.lineZ).toBe(layout.edgeZ - 1);
        expect(model.palette.some((s) => s.includes('yellow_concrete')), label).toBe(false);
        // The platform is at least as long as the building plus 4 on each side.
        expect(bx0 - p.x0, label).toBeGreaterThanOrEqual(4);
        expect(p.x1 - bx1, label).toBeGreaterThanOrEqual(4);
      }
  });
});

describe('Bahnsteigdach (Bericht 17, Empfehlung 7)', () => {
  it('Säulenabstand 4–6 und symmetrisch zur Halle, für alle Längen', () => {
    for (let x0 = 0; x0 < 2; x0++)
      for (let length = 20; length <= 60; length += 2) {
        const axis = x0 + length / 2;
        const cols = columnPositions(x0, x0 + length, axis);
        for (let i = 1; i < cols.length; i++) {
          expect(cols[i]! - cols[i - 1]!, `${length}: ${cols.join(',')}`).toBeGreaterThanOrEqual(4);
          expect(cols[i]! - cols[i - 1]!, `${length}: ${cols.join(',')}`).toBeLessThanOrEqual(6);
        }
        for (const c of cols) expect(cols, `${length}`).toContain(2 * axis - c);
        expect(cols, `${length}`).not.toContain(axis);
      }
  });

  it('jede Säule mit Kapitell und zwei Konsolen, lichte Höhe ≥ 3, Pultdach am Gebäude', () => {
    for (const style of STYLE_IDS)
      for (const size of SIZES) {
        const { model, layout } = station(spec({ style, size }));
        const c = layout.canopy;
        const label = `${style} ${size}`;
        expect(c.capitalY, label).toBeGreaterThanOrEqual(5);
        for (const x of c.columns) {
          for (let y = 2; y < c.capitalY; y++) expect(blockAt(model, x, y, c.columnZ), `${label} Säule ${x}`).not.toBe(AIR);
          expect(definitionOf(blockAt(model, x, c.capitalY, c.columnZ)).shape, `${label} Kapitell ${x}`).not.toBe('stairs');
          for (const [dx, facing] of [
            [-1, 'east'],
            [1, 'west'],
          ] as const) {
            const k = blockAt(model, x + dx, c.capitalY, c.columnZ);
            expect(definitionOf(k).shape, `${label} Konsole ${x + dx}`).toBe('stairs');
            expect(propsOf(k), `${label} Konsole ${x + dx}`).toMatchObject({ half: 'top', facing });
          }
        }
        // Roof over every platform row up to the edge; nothing lower than y = 5 at the edge.
        const xm = c.columns[0]! + 2;
        for (let z = c.z0; z <= c.z1; z++) {
          let roof = -1;
          for (let y = 9; y >= 2 && roof < 0; y--) if (['slab', 'stairs'].includes(definitionOf(blockAt(model, xm, y, z)).shape)) roof = y;
          expect(roof, `${label} Reihe ${z}`).toBeGreaterThanOrEqual(5);
        }
        for (let y = 2; y <= 3; y++) expect(blockAt(model, xm, y, c.z1), `${label} lichte Höhe an der Kante`).toBe(AIR);
      }
  });

  it('Volant an der Gleisseite ab Detailgrad 2, nicht bei Detailgrad 1', () => {
    for (const style of ['medieval', 'nordic', 'fantasy', 'rustic'] as const) {
      for (const detailLevel of [1, 2, 3] as const) {
        const { model, layout } = station(spec({ style, detailLevel }));
        const c = layout.canopy;
        let valance = 0;
        for (let x = c.x0; x <= c.x1; x++) {
          const s = blockAt(model, x, 4, c.z1);
          if (['trapdoor', 'pane'].includes(definitionOf(s).shape)) valance++;
        }
        if (detailLevel === 1) expect(valance, `${style} ${detailLevel}`).toBe(0);
        else expect(valance, `${style} ${detailLevel}`).toBeGreaterThan((c.x1 - c.x0) / 2);
      }
    }
  });
});

describe('Gleisbett (Bericht 17, Empfehlung 8)', () => {
  it('Kante 1,5 Blöcke von der Gleismitte, kein Gras im Bett, Schwellen quer über drei Blöcke, gemischter Schotter', () => {
    for (const style of STYLE_IDS)
      for (const size of ['small', 'large'] as const) {
        const { model, layout } = station(spec({ style, size }));
        const label = `${style} ${size}`;
        // Edge face at z = edgeZ + 1, rail centre at trackZ + 0.5.
        expect(layout.trackZ + 0.5 - (layout.edgeZ + 1), label).toBe(1.5);
        const { width } = model.dimensions;
        let sleepers = 0;
        let cells = 0;
        for (let x = 0; x < width; x++) {
          expect(blockIdOf(blockAt(model, x, 1, layout.trackZ)), label).toBe('minecraft:rail');
          for (let z = layout.trackZ - 1; z <= layout.trackZ + 1; z++) {
            const s = blockAt(model, x, 0, z);
            cells++;
            expect(s, `${label} ${x},${z}`).not.toBe('minecraft:grass_block');
            if (blockIdOf(s).startsWith('minecraft:stripped_') && propsOf(s).axis === 'z') sleepers++;
            else {
              // Ballast: never the same stone as the ballast two blocks further (sleepers between).
              if (x >= 2) expect(blockAt(model, x - 2, 0, z), `${label} ${x},${z}`).not.toBe(s);
            }
          }
        }
        expect(sleepers / cells, label).toBeGreaterThanOrEqual(0.45);
        // Sleepers run across all three bed rows.
        for (let x = 0; x < width; x += 2) {
          const ids = [-1, 0, 1].map((dz) => blockAt(model, x, 0, layout.trackZ + dz));
          expect(new Set(ids).size, `${label} Schwelle ${x}`).toBe(1);
        }
      }
  });
});

describe('Bahnhofsuhr (Bericht 17, Empfehlung 9)', () => {
  it('runder Rahmen, weißes Blatt, Zeiger aus Ketten vor dem Blatt, keine Vollblock-Zeiger', () => {
    for (const style of STYLE_IDS)
      for (const size of SIZES) {
        const { model, layout } = station(spec({ style, size }));
        const label = `${style} ${size}`;
        const c = layout.clock!;
        expect(c, label).not.toBeNull();
        const r = (c.d - 1) / 2;
        // Round: framed at the four edge midpoints, the diagonal corners of the square stay wall.
        const ring = blockAt(model, c.x, c.y + r, c.z);
        for (const [dx, dy] of [
          [r, 0],
          [-r, 0],
          [0, -r],
        ] as const)
          expect(blockAt(model, c.x + dx, c.y + dy, c.z), label).toBe(ring);
        expect(ring, label).not.toBe('minecraft:white_concrete');
        for (const [dx, dy] of [
          [-r, -r],
          [r, -r],
          [-r, r],
          [r, r],
        ] as const)
          expect(blockAt(model, c.x + dx, c.y + dy, c.z), label).not.toBe(ring);
        expect(blockAt(model, c.x, c.y, c.z), label).toBe('minecraft:white_concrete');
        // Hands one block in front of the face, made of chains.
        expect(definitionOf(blockAt(model, c.x, c.y, c.z - 1)).shape, label).toBe('chain');
        if (c.d >= 5) {
          expect(propsOf(blockAt(model, c.x, c.y + 1, c.z - 1)).axis, label).toBe('y');
          expect(propsOf(blockAt(model, c.x + 1, c.y, c.z - 1)).axis, label).toBe('x');
        }
      }
    // Wide halls get at least a D5 dial (D7 only where the gable leaves room under the rise cap);
    // the low Mediterranean tile roof (about 27°) leaves room for a D3 dial only.
    for (const style of STYLE_IDS) expect(station(spec({ style, size: 'large' })).layout.clock!.d, style).toBeGreaterThanOrEqual(style === 'mediterranean' ? 3 : 5);
  });
});

describe('Laternen am Bahnhof (Bericht 18, Empfehlung 13)', () => {
  it('T-Pfähle an beiden Bahnsteigenden und ein Paar am Portal, Laternen mit Kopffreiheit', () => {
    for (const style of STYLE_IDS) {
      const { model, layout } = station(spec({ style }));
      const platform = layout.lampPosts.filter((p) => p.kind === 'platform');
      const portal = layout.lampPosts.filter((p) => p.kind === 'portal');
      expect(platform, style).toHaveLength(2);
      expect(portal, style).toHaveLength(2);
      expect(Math.min(...platform.map((p) => p.x)) - layout.platform.x0, style).toBeLessThanOrEqual(2);
      expect(layout.platform.x1 - Math.max(...platform.map((p) => p.x)), style).toBeLessThanOrEqual(2);
      for (const p of platform)
        for (const dx of [-1, 1]) {
          const l = blockAt(model, p.x + dx, 4, p.z);
          expect(blockIdOf(l).endsWith('lantern'), style).toBe(true);
          expect(propsOf(l).hanging, style).toBe('true');
          // Two free cells above the platform under the lantern.
          expect(blockAt(model, p.x + dx, 2, p.z), style).toBe(AIR);
          expect(blockAt(model, p.x + dx, 3, p.z), style).toBe(AIR);
        }
    }
  });
});

describe('Bahnsteigausstattung nach Größe (Bericht 17, C4, C7, C8)', () => {
  it('Wasserkran ab medium, zwei Formsignale ab large, beides neben dem Gleis', () => {
    const count = (layout: StationLayout, kind: string) => layout.extras.filter((e) => e.kind === kind).length;
    expect(station(spec({ size: 'small' })).layout.extras).toEqual([]);
    expect(count(station(spec({ size: 'medium' })).layout, 'water_crane')).toBe(1);
    for (const size of ['large', 'huge'] as const)
      for (const style of STYLE_IDS) {
        const { model, layout } = station(spec({ style, size }));
        expect(count(layout, 'water_crane'), `${style} ${size}`).toBe(1);
        expect(count(layout, 'signal'), `${style} ${size}`).toBe(2);
        for (const e of layout.extras.filter((x) => x.kind !== 'goods_shed')) {
          expect(e.z - layout.trackZ, `${style} ${size}`).toBe(2);
          if (e.kind === 'signal') {
            // Beyond the platform end, the arm across the track at the top of the mast.
            expect(e.x < layout.platform.x0 - 5 || e.x > layout.platform.x1 + 5, `${style} ${size}`).toBe(true);
            expect(definitionOf(blockAt(model, e.x, 6, e.z - 1)).shape).toBe('trapdoor');
            expect(blockIdOf(blockAt(model, e.x, 7, e.z))).toContain('lightning_rod');
          }
        }
      }
  });

  it('Bahnsteiguhr unter dem Dach im mittleren Feld ab Detailgrad 2', () => {
    for (const style of STYLE_IDS) {
      const { model, layout } = station(spec({ style }));
      const c = layout.platformClock!;
      expect(c, style).not.toBeNull();
      expect(blockAt(model, c.x, c.y, c.z), style).toBe('minecraft:white_concrete');
      expect(definitionOf(blockAt(model, c.x, c.y + 1, c.z)).shape, style).toBe('chain');
      for (const dz of [-1, 1]) expect(definitionOf(blockAt(model, c.x, c.y, c.z + dz)).shape, style).toBe('button');
    }
    expect(station(spec({ detailLevel: 1 })).layout.platformClock).toBeNull();
  });
});

describe('Bahnhof mit gewünschter Geschosshöhe', () => {
  it('Geschosshöhe 4 und 5: gültig, ohne Reparaturen und ohne Lint-Befund, Dach bleibt über dem Bahnsteig', () => {
    for (const style of STYLE_IDS)
      for (const floorHeight of [4, 5]) {
        const r = generateBuildingWithReport({ ...spec({ style, size: 'medium' }), options: { floorHeight } });
        expect(r.repairs, `${style} ${floorHeight}`).toEqual([]);
        expect(lintHouse(r.model, r.house!), `${style} ${floorHeight}`).toEqual([]);
      }
  });
});

describe('Güterschuppen (Bericht 17, C6)', () => {
  it('ab medium ein Schuppen mit Rampen auf Wagenbodenhöhe, Tor zur Gleisseite und Dach; Rampenkante 1,5 von der Gleismitte', () => {
    expect(station(spec({ size: 'small' })).layout.extras.some((e) => e.kind === 'goods_shed')).toBe(false);
    for (const style of STYLE_IDS)
      for (const size of ['medium', 'large'] as const) {
        const { model, layout } = station(spec({ style, size }));
        const label = `${style} ${size}`;
        const shed = layout.extras.find((e) => e.kind === 'goods_shed')!;
        expect(shed, label).toBeDefined();
        // Beyond the platform's east end, south wall two rows behind the edge line.
        expect(shed.x, label).toBeGreaterThan(layout.platform.x1);
        expect(shed.z, label).toBe(layout.edgeZ - 2);
        // Ramp edge (top slab) in the edge row, ramp at platform height.
        const s = blockAt(model, shed.x + 1, 1, layout.edgeZ);
        expect(definitionOf(s).shape, label).toBe('slab');
        expect(propsOf(s).type, label).toBe('top');
        // A gate (air) in the track-side wall and a roof above the shed.
        let gate = false;
        for (let x = shed.x; x < shed.x + 11; x++) if (blockAt(model, x, 2, shed.z) === AIR && blockAt(model, x, 4, shed.z) === AIR) gate = true;
        expect(gate, label).toBe(true);
        let roof = false;
        for (let y = 5; y < model.dimensions.height; y++) if (blockAt(model, shed.x + 2, y, shed.z - 2) !== AIR) roof = true;
        expect(roof, label).toBe(true);
      }
  });
});
