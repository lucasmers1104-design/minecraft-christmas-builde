import { describe, expect, it } from 'vitest';
import { countMaterials } from '@/core/analysis/materialCounts';
import { floatingBlocks, lintHouse } from '@/core/analysis/buildingLints';
import { blockIdOf, checkBlockState, propsOf } from '@/core/blocks/registry';
import { generateBuilding, generateBuildingWithReport, generateVariants } from '@/core/generator/generateBuilding';
import { floorY, storeyRect } from '@/core/generator/house/plan';
import { DEFAULT_HOUSE_SPEC, STYLE_IDS, type BuildSpec } from '@/core/schema/buildSpec';
import { blockAt, MAX_DIMENSIONS, type VoxelModel } from '@/core/schema/voxelModel';

const spec = (over: Partial<BuildSpec> = {}, options: BuildSpec['options'] = {}): BuildSpec => ({ ...DEFAULT_HOUSE_SPEC, ...over, options });
const ids = (m: VoxelModel) => new Set(countMaterials(m).byBlock.map((b) => b.blockId));
const has = (m: VoxelModel, fragment: string) => [...ids(m)].some((id) => id.includes(fragment));

describe('Haus: alle Stile, Größen und Themen', () => {
  it.each(STYLE_IDS.flatMap((style) => (['small', 'medium', 'large'] as const).flatMap((size) => (['none', 'christmas'] as const).map((theme) => [style, size, theme] as const))))(
    '%s / %s / %s: gültig, ohne Reparaturen und ohne Lint-Befund',
    (style, size, theme) => {
      for (const seed of [1, 2]) {
        const r = generateBuildingWithReport(spec({ style, size, theme, seed }));
        expect(r.repairs, `${style} ${size} ${theme} ${seed}`).toEqual([]);
        for (const state of r.model.palette) expect(checkBlockState(state, '1.21.11').ok, state).toBe(true);
        expect(lintHouse(r.model, r.house!), `${style} ${size} ${theme} ${seed}`).toEqual([]);
      }
    },
  );

  it('riesige Häuser und viele Geschosse passen in die Grenzen und bleiben gültig', () => {
    for (const style of ['medieval', 'modern', 'japanese'] as const) {
      const r = generateBuildingWithReport(spec({ style, size: 'huge', seed: 5 }));
      expect(r.repairs).toEqual([]);
      expect(lintHouse(r.model, r.house!)).toEqual([]);
      const d = r.model.dimensions;
      expect(d.width <= MAX_DIMENSIONS.width && d.height <= MAX_DIMENSIONS.height && d.length <= MAX_DIMENSIONS.length).toBe(true);
    }
    const tall = generateBuildingWithReport(spec({ style: 'rustic', seed: 2 }, { floors: 6, width: 15, depth: 13 }));
    expect(tall.repairs).toEqual([]);
    expect(lintHouse(tall.model, tall.house!)).toEqual([]);
  });

  it('ist deterministisch; Seeds ergeben verschiedene Varianten', () => {
    expect(generateBuilding(DEFAULT_HOUSE_SPEC).hash).toBe(generateBuilding(DEFAULT_HOUSE_SPEC).hash);
    const hashes = generateVariants(DEFAULT_HOUSE_SPEC).map((m) => m.hash);
    expect(new Set(hashes).size).toBe(3);
  });

  it('jeder Stil sieht anders aus (andere Hauptmaterialien)', () => {
    const signatures = STYLE_IDS.map((style) => {
      const m = generateBuilding(spec({ style, theme: 'none', seed: 1 }));
      return countMaterials(m)
        .byBlock.slice(0, 6)
        .map((b) => b.blockId)
        .sort()
        .join(',');
    });
    expect(new Set(signatures).size).toBe(STYLE_IDS.length);
  });
});

describe('Haus: Bauteile und Feinparameter wirken', () => {
  const base = spec({ style: 'medieval', size: 'medium', seed: 4 });
  const options: [string, BuildSpec['options']][] = [
    ['Breite', { width: 15 }],
    ['Tiefe', { depth: 11 }],
    ['Geschosse', { floors: 3 }],
    ['Dachform Walm', { roofType: 'hip' }],
    ['Dachform Mansard', { roofType: 'mansard' }],
    ['Überstand', { overhang: 2 }],
    ['ohne Gauben', { dormers: 0 }],
    ['Flügel L', { wings: 'L' }],
    ['Flügel U', { wings: 'U' }],
    ['Anbau rechts', { annex: 'right' }],
    ['Fensterfamilie Bogen', { windowFamily: 'arched' }],
    ['Fensterfamilie Läden', { windowFamily: 'shuttered' }],
    ['Türfamilie Oberlicht', { doorFamily: 'transom' }],
    ['Turm', { tower: 'square', towerPosition: 'front_left' }],
    ['Rundturm', { tower: 'round', towerPosition: 'back_right' }],
    ['verwinkelt', { symmetry: 'rambling' }],
    ['Veranda', { porch: true }],
    ['Schornstein aus', { chimney: false }],
    ['viele Laternen', { lanternDensity: 'many' }],
    ['Seelenlaternen', { soulLanterns: true }],
    ['ohne Garten', { garden: false }],
    ['Palette', { palette: 'medieval_tudor' }],
    ['Material Wand', { materials: { wall: 'bricks' } }],
  ];
  it.each(options)('%s verändert das Modell und bleibt gültig', (_name, o) => {
    const a = generateBuildingWithReport({ ...base, options: o });
    expect(a.model.hash).not.toBe(generateBuilding(base).hash);
    expect(a.repairs).toEqual([]);
    expect(lintHouse(a.model, a.house!)).toEqual([]);
  });

  it('Dachprofil verändert ein Satteldach; bei Dachformen mit festem Querschnitt gibt es einen Hinweis', () => {
    const gable = generateBuilding({ ...base, options: { roofType: 'gable' } });
    for (const roofProfile of ['bell', 'standard', 'shallow'] as const) {
      const r = generateBuildingWithReport({ ...base, options: { roofType: 'gable', roofProfile } });
      expect(r.model.hash, roofProfile).not.toBe(gable.hash);
      expect(r.repairs).toEqual([]);
      expect(lintHouse(r.model, r.house!)).toEqual([]);
    }
    const gambrel = generateBuildingWithReport({ ...base, options: { roofType: 'gambrel', roofProfile: 'bell' } });
    expect(gambrel.notes.some((n) => n.startsWith('Dachprofil ohne Wirkung'))).toBe(true);
  });

  it('gewählte Fenster- und Türfamilie erscheint am Haus', () => {
    const r = generateBuildingWithReport({ ...base, options: { windowFamily: 'arched', doorFamily: 'transom' } });
    const templates = r.house!.openings.templates;
    expect(templates.some((id) => id.startsWith('W07') || id.startsWith('W17'))).toBe(true);
    expect(templates[0]).toBe('T02');
  });

  it('Erker und Balkon im Obergeschoss in allen Stilen, ohne Reparatur und Lint-Befund', () => {
    for (const style of STYLE_IDS)
      for (const size of ['small', 'large'] as const) {
        const r = generateBuildingWithReport(spec({ style, size, seed: 3 }, { oriel: true, balcony: true, floors: 2 }));
        const placed = r.house!.openings.templates;
        expect(placed, `${style} ${size}`).toContain('W09');
        expect(placed.some((id) => id.startsWith('B01')), `${style} ${size}`).toBe(true);
        expect(r.repairs).toEqual([]);
        expect(lintHouse(r.model, r.house!), `${style} ${size}`).toEqual([]);
      }
    // The wish implies an upper storey; with one storey fixed there is a note.
    expect(generateBuildingWithReport(spec({}, { oriel: true })).house!.plan.input.floors).toBe(2);
    expect(generateBuildingWithReport(spec({}, { oriel: true, floors: 1 })).notes.some((n) => n.includes('Obergeschoss'))).toBe(true);
  });

  it('echte Geschossdecken: jedes Geschoss hat einen Boden, Treppe oder Leiter verbindet sie', () => {
    const r = generateBuildingWithReport({ ...base, options: { floors: 3, width: 13, depth: 11 } });
    const plan = r.house!.plan;
    const main = plan.masses[0]!;
    for (let k = 1; k < 3; k++) {
      const rect = storeyRect(main, k);
      const y = floorY(plan, k);
      let floor = 0;
      for (let x = rect.x0 + 1; x < rect.x1; x++) for (let z = rect.z0 + 1; z < rect.z1; z++) if (blockAt(r.model, x, y, z) !== 'minecraft:air') floor++;
      expect(floor).toBeGreaterThan((rect.x1 - rect.x0 - 1) * (rect.z1 - rect.z0 - 1) * 0.6);
    }
    expect(has(r.model, '_stairs') || has(r.model, 'ladder')).toBe(true);
  });

  it('Mittelalter: Obergeschoss kragt auf Konsolen aus (Jetty)', () => {
    const r = generateBuildingWithReport(spec({ style: 'medieval', size: 'medium', seed: 1 }, { floors: 2, jetty: true }));
    const main = r.house!.plan.masses[0]!;
    const lower = storeyRect(main, 0);
    const upper = storeyRect(main, 1);
    expect(upper.z0).toBe(lower.z0 - 1);
  });

  it('Dächer bestehen aus Treppen und Stufen mit Innen- und Außenecken', () => {
    const m = generateBuilding(spec({ style: 'japanese', size: 'medium', seed: 1 }, { roofType: 'hip' }));
    const shapes = new Set(m.palette.filter((s) => s.includes('_stairs[')).map((s) => propsOf(s).shape));
    expect(shapes).toContain('outer_left');
    expect(shapes).toContain('straight');
    // Valleys of a T plan: roof stairs (bottom half) turn into inner corners.
    const t = generateBuilding(spec({ style: 'medieval', size: 'large', seed: 1 }, { wings: 'T' }));
    expect(t.palette.some((s) => s.includes('_stairs[') && propsOf(s).half === 'bottom' && /inner_/.test(propsOf(s).shape ?? ''))).toBe(true);
  });

  it('eine Dachneigung je Haus: Flügel und Quergiebel folgen dem Hauptdach, nie flacher als die Mindestneigung des Stils', () => {
    for (const style of ['medieval', 'nordic', 'rustic'] as const)
      for (const wings of ['L', 'T'] as const) {
        const r = generateBuildingWithReport(spec({ style, size: 'large', seed: 2 }, { wings, roofType: 'gable', roofProfile: 'steep' }));
        const massIds = new Set(r.house!.plan.masses.map((m) => m.id));
        const pitches = new Set(r.house!.sections.filter((s) => massIds.has(s.id) && s.type !== 'shed').map((s) => s.pitch));
        expect(pitches.size, `${style} ${wings}`).toBe(1);
        // Never flatter than the style's minimum pitch (45° for the steep styles).
        expect(style === 'rustic' ? ['P37', 'P45', 'P53', 'P56', 'P63'] : ['P45', 'P53', 'P56', 'P63'], `${style} ${wings}`).toContain([...pitches][0]);
      }
  });
});

describe('Thema: Weihnachten und Winter', () => {
  it('Weihnachten: Girlanden aus persistentem Laub mit Lichtern und Schleifen, Laternen an Ketten', () => {
    const m = generateBuilding(spec({ style: 'nordic', theme: 'christmas', detailLevel: 3 }));
    expect(has(m, 'spruce_leaves')).toBe(true);
    expect(m.palette.filter((s) => s.includes('_leaves[')).every((s) => propsOf(s).persistent === 'true')).toBe(true);
    expect(has(m, 'red_wool')).toBe(true);
    expect(has(m, 'froglight') || has(m, 'glowstone')).toBe(true);
    expect(has(m, 'iron_chain')).toBe(true);
  });

  it('Winter: keine roten Schleifen, aber Laternen; kein Schnee auf Dächern und keine Eiszapfen', () => {
    const m = generateBuilding(spec({ style: 'nordic', theme: 'winter' }));
    expect(has(m, 'red_wool')).toBe(false);
    expect(has(m, 'lantern')).toBe(true);
    for (const s of ['minecraft:snow', 'minecraft:snow_block', 'minecraft:pointed_dripstone']) expect(ids(m).has(s)).toBe(false);
    expect(m.palette.some((s) => blockIdOf(s) === 'minecraft:end_rod' && propsOf(s).facing === 'down')).toBe(false);
  });

  it('Schnee nur auf ausdrücklichen Wunsch – dann Bodenfläche und Schneeschichten, wo sie im Spiel liegen bleiben', () => {
    expect(ids(generateBuilding(spec())).has('minecraft:snow_block')).toBe(false);
    expect(ids(generateBuilding(spec())).has('minecraft:snow')).toBe(false);
    for (const style of STYLE_IDS) {
      const r = generateBuildingWithReport(spec({ style, theme: 'winter' }, { snow: true }));
      expect(ids(r.model).has('minecraft:snow_block'), style).toBe(true);
      expect(ids(r.model).has('minecraft:snow'), style).toBe(true);
      // No layer melts or falls off: the validator had nothing to repair.
      expect(r.repairs, style).toEqual([]);
      expect(lintHouse(r.model, r.house!), style).toEqual([]);
    }
    for (const kind of ['tree', 'market_stall', 'station', 'tower'] as const) expect(generateBuildingWithReport({ ...spec({ kind }, { snow: true }) }).repairs, kind).toEqual([]);
  });

  it('ohne Thema: keine Weihnachtsdeko', () => {
    const m = generateBuilding(spec({ style: 'medieval', theme: 'none' }));
    expect(has(m, 'red_wool')).toBe(false);
    expect(has(m, 'froglight')).toBe(false);
  });

  it('Profil 1.21.1 nutzt chain statt iron_chain', () => {
    const r = generateBuildingWithReport(spec({ targetMinecraftVersion: '1.21.1', theme: 'christmas', style: 'nordic' }));
    expect(r.repairs).toEqual([]);
    expect(ids(r.model).has('minecraft:chain')).toBe(true);
    expect(ids(r.model).has('minecraft:iron_chain')).toBe(false);
  });
});

describe('Leistung', () => {
  it('ein normales Haus entsteht in unter 2 Sekunden', () => {
    const start = performance.now();
    generateBuilding(spec({ style: 'medieval', size: 'large' }));
    expect(performance.now() - start).toBeLessThan(2000);
  });

  it('nichts schwebt (auch nicht mit allen Bauteilen)', () => {
    const m = generateBuilding(spec({ style: 'fantasy', size: 'large' }, { tower: 'square', annex: 'right', porch: true, dormers: 3, symmetry: 'rambling' }));
    expect(floatingBlocks(m)).toBe(0);
  });
});

describe('Giebelfelder und Firstzier', () => {
  const gableHouse = (style: BuildSpec['style'], over: Partial<BuildSpec> = {}) =>
    generateBuildingWithReport(spec({ style, size: 'large', seed: 3, ...over }, { roofType: 'gable', chimney: false }));

  it('Fachwerkgiebel: zurückgesetzte Füllung, davor Firstständer und Kehlbalken, Fenster neben dem Ständer', () => {
    const r = gableHouse('medieval');
    const { roof, sections } = r.house!;
    const main = sections.find((s) => s.id === 'main')!;
    expect(main.gableRecess).toBe(true);
    // King post: an upright log in front of the recessed gable on the ridge axis.
    const cells = roof.gableCells.filter((c) => c.section === 'main');
    expect(cells.length).toBeGreaterThan(10);
    const c = cells[0]!;
    const out = c.side === 'west' ? -1 : c.side === 'east' ? 1 : 0;
    const zc = Math.round((main.z0 + main.z1) / 2);
    const xc = Math.round((main.x0 + main.x1) / 2);
    const front = (y: number) => (main.ridgeAxis === 'x' ? blockAt(r.model, c.x + out, y, zc) : blockAt(r.model, xc, y, c.z + (c.side === 'north' ? -1 : 1)));
    const logs = Array.from({ length: 6 }, (_, i) => front(main.wallTop + 1 + i)).filter((s) => /_(log|wood)\[/.test(s));
    expect(logs.length).toBeGreaterThanOrEqual(3);
    expect(r.house!.openings.windows).toBeGreaterThan(0);
    expect(lintHouse(r.model, r.house!)).toEqual([]);
  });

  it('Giebel ohne Fachwerk bekommen Fenster auf der Firstachse', () => {
    for (const style of ['rustic', 'nordic'] as const) {
      const r = gableHouse(style);
      const panes = r.house!.roof.gableCells.filter((c) => blockIdOf(blockAt(r.model, c.x, c.y, c.z)).endsWith('_pane'));
      expect(panes.length, style).toBeGreaterThanOrEqual(2);
      expect(r.repairs, style).toEqual([]);
    }
  });

  it('Firstzier je Stil: Blitzableiter, Endstab, gekreuzte Windbretter; bei Schnee kein Endstab', () => {
    expect(has(gableHouse('medieval').model, 'lightning_rod')).toBe(true);
    expect(has(gableHouse('fantasy').model, 'end_rod')).toBe(true);
    const snowy = generateBuildingWithReport(spec({ style: 'fantasy', size: 'large', seed: 3, theme: 'winter' }, { roofType: 'gable', snow: true }));
    expect(has(snowy.model, 'end_rod')).toBe(false);
    expect(snowy.repairs).toEqual([]);
    expect(has(gableHouse('modern').model, 'lightning_rod')).toBe(false);
  });
});

describe('Blockhauswand', () => {
  it('Stammwände liegen als Lagen mit Kreuzecken, ohne Pfosten davor; der Giebel liegt mit', () => {
    const r = generateBuildingWithReport(spec({ style: 'rustic', size: 'medium', seed: 2 }, { palette: 'rustic_logs', roofType: 'gable' }));
    const m = r.model;
    const plan = r.house!.plan;
    const main = plan.masses[0]!;
    let lying = 0;
    let upright = 0;
    for (let k = 0; k < main.floors; k++) {
      const rect = storeyRect(main, k);
      for (let y = floorY(plan, k) + 1; y < floorY(plan, k + 1); y++)
        for (let x = rect.x0; x <= rect.x1; x++)
          for (const z of [rect.z0, rect.z1]) {
            const s = blockAt(m, x, y, z);
            if (blockIdOf(s) !== `minecraft:${plan.input.materials.wall}`) continue;
            if (propsOf(s).axis === 'y') upright++;
            else lying++;
          }
    }
    expect(lying).toBeGreaterThan(10);
    expect(upright / (lying + upright)).toBeLessThan(0.1);
    // Saddle notch: logs stick out beyond the corner.
    const rect = main.rect;
    const y = floorY(plan, 0) + 1;
    const ends = [blockAt(m, rect.x0 - 1, y, rect.z0), blockAt(m, rect.x0, y, rect.z0 - 1), blockAt(m, rect.x0 - 1, y + 1, rect.z0), blockAt(m, rect.x0, y + 1, rect.z0 - 1)];
    expect(ends.filter((s) => s.includes('_log[')).length).toBeGreaterThanOrEqual(2);
    expect(r.repairs).toEqual([]);
    expect(lintHouse(m, r.house!)).toEqual([]);
  });
});

describe('Irimoya', () => {
  it('japanisches Dach: Walm unten rundum, eingerückter Giebel oben, ohne Lücken und Reparaturen', () => {
    const r = generateBuildingWithReport(spec({ style: 'japanese', size: 'large', seed: 1 }, { roofType: 'irimoya' }));
    const ids = r.house!.sections.map((s) => `${s.id}:${s.type}`);
    expect(ids).toContain('main:hip');
    expect(ids).toContain('main-gable:gable');
    // The gable triangle stands on the hip: gable cells of the inner section exist.
    expect(r.house!.roof.gableCells.some((c) => c.section === 'main-gable')).toBe(true);
    expect(r.repairs).toEqual([]);
    expect(lintHouse(r.model, r.house!)).toEqual([]);
    expect(floatingBlocks(r.model)).toBe(0);
  });

  it('der Stil japanisch wählt Irimoya statt Krüppelwalm; „Irimoya“ im Text wird erkannt', () => {
    const types = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => generateBuildingWithReport(spec({ style: 'japanese', seed })).house!.plan.masses[0]!.roofType);
    expect(types).not.toContain('half_hip');
    expect(types).toContain('irimoya');
  });
});
