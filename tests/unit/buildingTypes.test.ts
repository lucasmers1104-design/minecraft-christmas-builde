import { describe, expect, it } from 'vitest';
import { countMaterials } from '@/core/analysis/materialCounts';
import { floatingBlocks, resolverChanges } from '@/core/analysis/buildingLints';
import { blockIdOf, propsOf } from '@/core/blocks/registry';
import { generateBuilding, generateBuildingWithReport } from '@/core/generator/generateBuilding';
import { DEFAULT_HOUSE_SPEC, STYLE_IDS, type BuildSpec } from '@/core/schema/buildSpec';
import { blockAt } from '@/core/schema/voxelModel';
import { lintHouse } from '@/core/analysis/buildingLints';
import { circle, dihedralImages, maskFrom, ring } from '@/core/geometry';
import { towerCentre } from '@/core/generator/house/roundTower';
import { wallTopOf } from '@/core/generator/house/plan';

const spec = (kind: BuildSpec['kind'], over: Partial<BuildSpec> = {}): BuildSpec => ({ ...DEFAULT_HOUSE_SPEC, kind, ...over, options: {} });
const ids = (s: BuildSpec) => new Set(countMaterials(generateBuilding(s)).byBlock.map((b) => b.blockId));

describe.each(['tree', 'market_stall', 'station', 'tower'] as const)('Bauwerkstyp %s', (kind) => {
  it.each(['small', 'medium', 'large'] as const)('Größe %s: gültig, ohne Reparaturen, nichts schwebt, Resolver-Fixpunkt', (size) => {
    for (const theme of ['none', 'christmas'] as const) {
      const r = generateBuildingWithReport(spec(kind, { size, theme, style: 'rustic' }));
      expect(r.repairs, `${kind} ${size} ${theme}`).toEqual([]);
      expect(floatingBlocks(r.model), `${kind} ${size} ${theme}`).toBe(0);
      expect(resolverChanges(r.model)).toBe(0);
    }
  });

  it('funktioniert in allen Stilen', () => {
    for (const style of STYLE_IDS) expect(generateBuildingWithReport(spec(kind, { style })).repairs, style).toEqual([]);
  });
});

describe('Weihnachtsbaum', () => {
  it('Stufenprofil mit Stamm, Stern aus Gold, Kugeln und Lichtern im persistenten Laub', () => {
    const m = generateBuilding(spec('tree', { size: 'large', detailLevel: 3 }));
    const set = new Set(m.palette.map(blockIdOf));
    for (const id of ['minecraft:spruce_log', 'minecraft:gold_block', 'minecraft:end_rod', 'minecraft:ochre_froglight']) expect(set, id).toContain(id);
    expect(m.palette.filter((s) => s.includes('_leaves[')).every((s) => propsOf(s).persistent === 'true')).toBe(true);
    // The radius grows towards the bottom: the widest leaf layer is in the lower half.
    const { width, height, length } = m.dimensions;
    let widestY = 0;
    let widest = 0;
    for (let y = 1; y < height; y++) {
      let n = 0;
      for (let x = 0; x < width; x++) for (let z = 0; z < length; z++) if (blockAt(m, x, y, z).includes('spruce_leaves')) n++;
      if (n > widest) {
        widest = n;
        widestY = y;
      }
    }
    expect(widestY).toBeLessThan(height / 2);
  });

  it('ohne Thema ist der Baum natürlich (keine Kugeln, kein Stern)', () => {
    const set = ids(spec('tree', { theme: 'none' }));
    expect(set.has('minecraft:red_wool')).toBe(false);
    expect(set.has('minecraft:gold_block')).toBe(false);
  });
});

describe('Marktstand', () => {
  it('Holzhütten mit Satteldach, Auslage-Falltür, Waren, Innenlaternen, Tannengrün und Lichterketten', () => {
    const set = ids(spec('market_stall', { size: 'large' }));
    for (const id of ['minecraft:lantern', 'minecraft:barrel', 'minecraft:spruce_leaves', 'minecraft:iron_chain', 'minecraft:spruce_log']) expect(set, id).toContain(id);
    expect([...set].some((id) => id.endsWith('_trapdoor')), 'Auslage').toBe(true);
    expect([...set].some((id) => id.endsWith('_door')), 'Tür').toBe(true);
    expect([...set].some((id) => id.includes('red_nether_brick')), 'kein Steindach').toBe(false);
  });
});

describe('Bahnhof', () => {
  it('Gleis auf Schwellen und Schotter, Bahnsteigkante mit Sicherheitslinie, Bahnsteigdach mit Laternen, Uhr mit Kettenzeigern, Abschnittsdächer', () => {
    const r = generateBuildingWithReport(spec('station', { size: 'large', style: 'medieval' }));
    const m = r.model;
    expect(m.palette.filter((s) => blockIdOf(s) === 'minecraft:rail')).toEqual(['minecraft:rail[shape=east_west,waterlogged=false]']);
    const set = new Set(m.palette.map(blockIdOf));
    for (const id of ['minecraft:lantern', 'minecraft:white_concrete', 'minecraft:iron_chain', 'minecraft:stripped_spruce_log', 'minecraft:stone_brick_stairs', 'minecraft:andesite']) expect(set, id).toContain(id);
    // No garish edge line and no solid clock hands any more (research 17, S3 and S6).
    for (const id of ['minecraft:yellow_concrete', 'minecraft:black_concrete']) expect(set, id).not.toContain(id);
    // Section roofs: a hall and two lower wings instead of one giant roof.
    expect(r.house!.sections.filter((s) => ['main', 'wing_left', 'wing_right'].includes(s.id))).toHaveLength(3);
    expect(r.house!.roof.ridgeY.main!).toBeGreaterThan(r.house!.roof.ridgeY.wing_left!);
  });
});

describe('Turm', () => {
  it('ist deutlich höher als ein Haus', () => {
    const m = generateBuilding(spec('tower', { size: 'large', style: 'medieval' }));
    expect(m.dimensions.height).toBeGreaterThan(24);
  });

  it('alle Stile und Größen: ohne Reparaturen und ohne Lint-Befund (Tür komplett, Laterne am Eingang)', () => {
    for (const style of STYLE_IDS)
      for (const size of ['small', 'medium', 'large', 'huge'] as const) {
        const r = generateBuildingWithReport(spec('tower', { style, size }));
        expect(r.repairs, `${style} ${size}`).toEqual([]);
        expect(lintHouse(r.model, r.house!), `${style} ${size}`).toEqual([]);
        expect(r.house!.openings.doors, `${style} ${size}`).toHaveLength(1);
      }
  });

  it('Rundturm: Wandring ist der dicke Kreis der Geometriebibliothek, Zinnen bei jedem Durchmesser symmetrisch', () => {
    for (const size of ['small', 'medium', 'large', 'huge'] as const) {
      const r = generateBuildingWithReport(spec('tower', { style: 'medieval', size, theme: 'none' }));
      const mass = r.house!.plan.masses[0]!;
      const { cx, cz, r: radius, spec: round } = towerCentre(mass);
      // Merlons by angular sectors on the ring that carries them: battlements for every
      // diameter, symmetric under all 8 symmetries of the square in the built model.
      expect(round.roof, size).toBe('battlement');
      const top = wallTopOf(r.house!.plan, mass);
      const n = round.d + 2;
      const crown = ring(n, 1);
      const merlons = maskFrom(n, n, (x, z) => crown.has(x, z) && blockAt(r.model, cx - radius - 1 + x, top + 2, cz - radius - 1 + z) !== 'minecraft:air');
      expect(merlons.count, size).toBeGreaterThan(0);
      expect(merlons.cells().every(([x, z]) => dihedralImages(x, z, n).every(([a, b]) => merlons.has(a, b))), size).toBe(true);
      // A storey row between bands: every ring cell is wall or a set-back window (an opening on
      // an axis with the pane right behind it).
      const y = r.house!.plan.plinth + 2;
      const wall = circle(round.d, 'thick');
      for (let x = cx - radius; x <= cx + radius; x++)
        for (let z = cz - radius; z <= cz + radius; z++) {
          if (!wall.has(x - cx + radius, z - cz + radius)) continue;
          const s = blockAt(r.model, x, y, z);
          if (s !== 'minecraft:air') continue;
          expect(x === cx || z === cz, `${size} ${x},${z}`).toBe(true);
          expect(blockAt(r.model, x - Math.sign(x - cx), y, z - Math.sign(z - cz)), `${size} ${x},${z}`).toContain('pane');
        }
    }
  });

  it('echte Böden und eine Leiter, die an der Wand lehnt', () => {
    const r = generateBuildingWithReport(spec('tower', { style: 'rustic', size: 'medium', theme: 'none' }));
    expect(r.model.palette.some((s) => s.startsWith('minecraft:ladder['))).toBe(true);
    const { cx, cz } = towerCentre(r.house!.plan.masses[0]!);
    const plan = r.house!.plan;
    for (let k = 1; k < plan.masses[0]!.floors; k++) expect(blockAt(r.model, cx, plan.plinth + k * plan.floorHeight, cz)).not.toBe('minecraft:air');
  });
});

describe('Haus mit Rundturm', () => {
  it('alle Stile: der Turm steht an einer Ecke, ohne Reparaturen und ohne Lint-Befund', () => {
    for (const style of STYLE_IDS)
      for (const towerPosition of ['front_left', 'back_right'] as const) {
        const t = generateBuildingWithReport({ ...spec('house', { style, size: 'large', seed: 2 }), options: { tower: 'round', towerPosition } });
        expect(t.house!.plan.masses.some((m) => m.round), style).toBe(true);
        expect(t.repairs, style).toEqual([]);
        expect(lintHouse(t.model, t.house!), `${style} ${towerPosition}`).toEqual([]);
      }
  });

  it('eine belegte Ecke wird mit Hinweis gewechselt', () => {
    const r = generateBuildingWithReport({ ...spec('house', { style: 'rustic', size: 'small', seed: 1 }), options: { tower: 'round', towerPosition: 'front_left' } });
    expect(r.house!.plan.masses.some((m) => m.round)).toBe(true);
    expect(r.notes.some((n) => n.startsWith('Rundturm an eine freie Ecke verschoben'))).toBe(true);
  });
});
