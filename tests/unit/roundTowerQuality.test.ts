import { describe, expect, it } from 'vitest';
import { lintHouse } from '@/core/analysis/buildingLints';
import { AIR, blockIdOf, definitionOf, propsOf } from '@/core/blocks/registry';
import { generateBuildingWithReport } from '@/core/generator/generateBuilding';
import { designRoundTower, towerCentre } from '@/core/generator/house/roundTower';
import { TOWER_DIAMETERS } from '@/core/generator/tower';
import { circle, notchCells, ring, type Mask2D } from '@/core/geometry';
import { DEFAULT_HOUSE_SPEC, STYLE_IDS, type BuildSpec } from '@/core/schema/buildSpec';
import { blockAt } from '@/core/schema/voxelModel';
import { getMaterial } from '@/core/style/materials';
import type { StyleId } from '@/core/style/styles';

/**
 * Round towers after research report 16 ("Bauqualitaet 2026-10") in generated models: crown,
 * bands, wall zones and weathering, helms, windows, interior light – together with the hard
 * rules (no validator repairs, no lint finding, free doors, determinism). The geometry behind it
 * is tested in towerGeometry.test.ts.
 */

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const SIZES = ['small', 'medium', 'large', 'huge'] as const;

function build(kind: BuildSpec['kind'], style: StyleId, size: BuildSpec['size'], extra: Partial<BuildSpec> = {}, options: BuildSpec['options'] = {}) {
  return generateBuildingWithReport({ ...DEFAULT_HOUSE_SPEC, kind, style, size, theme: 'none', ...extra, options });
}

/** Free tower: model, its mass, centre, design. */
function tower(style: StyleId, size: BuildSpec['size'], extra: Partial<BuildSpec> = {}, options: BuildSpec['options'] = {}) {
  const r = build('tower', style, size, extra, options);
  const plan = r.house!.plan;
  const mass = plan.masses[0]!;
  const { cx, cz } = towerCentre(mass);
  return { r, plan, mass, cx, cz, design: designRoundTower(plan, mass) };
}

/** World cells of a mask centred on the tower axis. */
function cellsAround(m: Mask2D, cx: number, cz: number): Array<[number, number]> {
  const o = (m.width - 1) / 2;
  return m.cells().map(([x, z]) => [cx - o + x, cz - o + z]);
}

const id = (s: string) => blockIdOf(s).replace('minecraft:', '');

describe('Rundturm im Modell', () => {
  it('Durchmesserleiter frei stehender Türme: keine achteckig wirkenden 11, 14, 22 …', () => {
    const ds = SIZES.map((s) => TOWER_DIAMETERS[s]);
    expect(ds.every((d, i) => d % 2 === 1 && (i === 0 || d > ds[i - 1]!))).toBe(true);
    for (const d of ds) expect([11, 14, 22, 24, 27, 30]).not.toContain(d);
    expect(ds.filter((d) => d >= 13).length).toBeGreaterThanOrEqual(2);
  });

  it('Krone: Konsolen tragen die Brüstung, Zinnen stehen auf ihr, Maschikulis ab D 11', () => {
    for (const size of SIZES)
      for (const seed of [1, 2, 3]) {
        const t = tower('medieval', size, { seed });
        const { r, cx, cz, design } = t;
        expect(design.crown).toBe('battlement');
        const T = design.top;
        let corbels = 0;
        for (const [x, z] of cellsAround(ring(design.d + 2, 1), cx, cz)) {
          const at = (y: number) => blockAt(r.model, x, y, z);
          expect(at(T), `${size} ${x},${z}`).not.toBe(AIR);
          expect(at(T + 1), `${size} ${x},${z}`).not.toBe(AIR);
          const below = at(T - 1);
          const isCorbel = definitionOf(below).shape === 'stairs' && propsOf(below).half === 'top';
          if (isCorbel) corbels++;
          // Every parapet cell rests on a corbel – or, on machicolations, over an open hole.
          if (!design.machicolation) expect(isCorbel, `${size} ${x},${z}`).toBe(true);
          else expect(isCorbel || below === AIR || id(below).endsWith('lantern'), `${size} ${x},${z} ${below}`).toBe(true);
        }
        expect(corbels).toBeGreaterThan(0);
        expect(design.machicolation).toBe(design.d >= 11);
      }
  });

  it('höchstens ein auskragendes Band je 8 Blöcke Schaft, nie zweimal dasselbe Profil', () => {
    for (const style of STYLE_IDS)
      for (const size of SIZES) {
        const { r, cx, cz, design } = tower(style, size);
        const shaft = design.corbelY - design.plinthTop;
        expect(design.bands.length, `${style} ${size}`).toBeLessThanOrEqual(Math.floor(shaft / 8));
        design.bands.forEach((b, i) => {
          if (i > 0) {
            expect(b.kind, `${style} ${size}`).not.toBe(design.bands[i - 1]!.kind);
            expect(b.y - design.bands[i - 1]!.y).toBeGreaterThanOrEqual(6);
          }
        });
        // In the model: rows of the ring outside the wall that project (upside-down stairs or top
        // slabs on most of the circumference) are exactly the planned bands.
        const k1 = cellsAround(ring(design.d + 2, 1), cx, cz);
        for (let y = design.plinthTop + 2; y < design.corbelY; y++) {
          const projecting = k1.filter(([x, z]) => {
            const s = blockAt(r.model, x, y, z);
            const p = propsOf(s);
            return (definitionOf(s).shape === 'stairs' && p.half === 'top') || (definitionOf(s).shape === 'slab' && p.type === 'top');
          }).length;
          const planned = design.bands.some((b) => b.y === y);
          if (!planned) expect(projecting, `${style} ${size} y=${y}`).toBeLessThan(k1.length / 2);
        }
      }
  });

  it('Turmwand über dem Sockel aus der Wandrolle, verwittert über die ganze Höhe ohne Sedimentstreifen', () => {
    let shaftWeathered = 0;
    let shaftCells = 0;
    let crownWeathered = 0;
    let crownCells = 0;
    for (const seed of range(1, 6)) {
      const { r, plan, cx, cz, design } = tower('medieval', 'huge', { seed });
      const wallMat = getMaterial(plan.input.materials.wall);
      const levels = new Set([wallMat.forms.block ?? wallMat.id, ...(wallMat.weathering ?? [])]);
      const clean = wallMat.weathering?.[0] ?? wallMat.forms.block ?? wallMat.id;
      // Wall ring cells in angular order (runs along the circumference).
      const ringCells = cellsAround(circle(design.d, 'thick'), cx, cz).sort(([ax, az], [bx, bz]) => Math.atan2(az - cz, ax - cx) - Math.atan2(bz - cz, bx - cx));
      const wallIds = new Set<string>();
      for (let y = design.plinthTop + 1; y < design.corbelY; y++) {
        const row = ringCells.map(([x, z]) => id(blockAt(r.model, x, y, z))).filter((s) => s !== 'air' && !s.includes('pane') && s !== 'ladder');
        // Above the plinth zone only the wall material and its weathering variants.
        for (const s of row) expect(levels.has(s), `${seed} y=${y} ${s}`).toBe(true);
        row.forEach((s) => wallIds.add(s));
        // No sandwiching: no variant covers more than half of the circumference in one run.
        for (const variant of levels) {
          if (variant === clean) continue;
          let run = 0;
          let longest = 0;
          for (const s of [...row, ...row]) {
            run = s === variant ? run + 1 : 0;
            longest = Math.max(longest, Math.min(run, row.length));
          }
          expect(longest, `${seed} y=${y} ${variant}`).toBeLessThanOrEqual(row.length / 2);
        }
        const weathered = row.filter((s) => s !== clean).length;
        if (y >= design.corbelY - 2) {
          crownWeathered += weathered;
          crownCells += row.length;
        } else if (y > design.plinthTop + 3) {
          shaftWeathered += weathered;
          shaftCells += row.length;
        }
      }
      // A wall of 20+ blocks shows at least three block ids (where the material has three variants).
      expect(design.top).toBeGreaterThanOrEqual(20);
      expect(wallIds.size, `${seed}`).toBeGreaterThanOrEqual(Math.min(3, levels.size));
    }
    // Weathering everywhere in the shaft, clearly more under the crown (report 16, recommendation 3).
    expect(shaftWeathered / shaftCells).toBeGreaterThan(0.08);
    expect(crownWeathered / crownCells).toBeGreaterThanOrEqual(1.5 * (shaftWeathered / shaftCells));
  });

  it('Fachwerkstile: Turm über dem Sockel aus der Wandrolle mit Pfosten in den Kerben', () => {
    for (const style of ['fantasy', 'rustic', 'nordic'] as const) {
      const { r, plan, cx, cz, design } = tower(style, 'large');
      const wall = id(blockAt(r.model, cx + (design.d - 1) / 2, design.plinthTop + 3, cz + 1));
      expect(getMaterial(plan.input.materials.wall).weathering ?? [getMaterial(plan.input.materials.wall).forms.block], style).toContain(wall);
      for (const [x, z] of cellsAround(notchCells(design.d), cx, cz)) expect(definitionOf(blockAt(r.model, x, design.plinthTop + 3, z)).shape, style).toBe('pillar');
    }
  });

  it('Kegel mit Traufknick aus Stufen und schlanker Spitze (keine Säule aus Dachblöcken)', () => {
    for (const style of ['fantasy', 'nordic', 'rustic', 'japanese', 'cherry'] as const)
      for (const size of SIZES) {
        const { r, plan, cx, cz, design } = tower(style, size);
        expect(['kick', 'witch'], `${style} ${size}`).toContain(design.helm.kind);
        const roof = getMaterial(plan.input.materials.roof);
        const roofBlock = roof.forms.block!;
        // Eave two in front of the wall: the ring K2 on the first helm layer is all bottom slabs.
        for (const [x, z] of cellsAround(ring(design.d + 4, 1), cx, cz)) {
          const s = blockAt(r.model, x, design.top + 1, z);
          expect(definitionOf(s).shape, `${style} ${size} ${x},${z}`).toBe('slab');
          expect(propsOf(s).type).toBe('bottom');
        }
        // Tip: at most two layers of a single roof block, then thin elements.
        const { width, length } = r.model.dimensions;
        let singles = 0;
        let lastRoofY = 0;
        for (let y = design.top + 1; y <= design.topY; y++) {
          let roofCells = 0;
          let full = 0;
          for (let x = 0; x < width; x++)
            for (let z = 0; z < length; z++) {
              const s = id(blockAt(r.model, x, y, z));
              if (s === roofBlock) full++;
              if (s === roofBlock || s === roof.forms.stairs || s === roof.forms.slab) roofCells++;
            }
          if (roofCells > 0) lastRoofY = y;
          if (roofCells === 1 && full === 1) singles++;
        }
        expect(singles, `${style} ${size}`).toBeLessThanOrEqual(2);
        let thin = false;
        for (let x = 0; x < width; x++)
          for (let z = 0; z < length; z++) {
            const shape = definitionOf(blockAt(r.model, x, lastRoofY + 1, z)).shape;
            if (['fence', 'wall', 'lightning_rod', 'end_rod'].includes(shape)) thin = true;
          }
        expect(thin, `${style} ${size}`).toBe(true);
      }
  });

  it('Hexenhut für Fantasy: Krempe aus Stufen, Hutband im Kontrast, leuchtende Spitze', () => {
    for (const size of SIZES) {
      const { r, plan, cx, cz, design } = tower('fantasy', size);
      expect(design.helm.kind).toBe('witch');
      const trim = getMaterial(plan.input.materials.roofTrim).forms.block;
      // The visible band ring (the silhouette of D + 2) on the layer above the brim.
      for (const [x, z] of cellsAround(circle(design.d + 2, 'thin'), cx, cz)) expect(id(blockAt(r.model, x, design.top + 2, z)), size).toBe(trim);
      expect(r.model.palette.some((s) => blockIdOf(s) === 'minecraft:end_rod'), size).toBe(true);
    }
  });

  it('Zwiebelhelm (Fantasy, frei stehend ab D 9): Kupfer, breiter als der Tambour, Bauch aus Kopfüber-Treppen', () => {
    let onions = 0;
    for (const seed of range(1, 12))
      for (const size of ['medium', 'large'] as const) {
        const { r, cx, cz, design } = tower('fantasy', size, { seed });
        if (design.helm.kind !== 'onion') continue;
        onions++;
        expect(design.drumD).toBe(design.d - 2);
        const widths = design.helm.layers.map((l) => l.mask.width);
        expect(widths[0]).toBe(design.drumD);
        expect(Math.max(...widths)).toBeGreaterThanOrEqual(design.drumD + 4);
        expect(widths.length).toBeGreaterThan(Math.max(...widths));
        expect(widths.filter((w) => w === 1).length).toBeLessThanOrEqual(2);
        // Every cell of a widening layer that overhangs the layer below is an upside-down stair.
        design.helm.layers.forEach((layer, i) => {
          if (i === 0 || layer.mask.width <= widths[i - 1]!) return;
          const below = design.helm.layers[i - 1]!.mask;
          const ob = (below.width - 1) / 2;
          for (const [x, z] of cellsAround(circle(layer.mask.width, 'thin'), cx, cz)) {
            if (below.has(x - cx + ob, z - cz + ob)) continue;
            const s = blockAt(r.model, x, design.helm.y0 + i, z);
            expect(id(s), `${seed} ${size} layer ${i}`).toBe('waxed_oxidized_cut_copper_stairs');
            expect(propsOf(s).half).toBe('top');
          }
        });
        expect(id(blockAt(r.model, cx, design.topY, cz))).toBe('waxed_lightning_rod');
      }
    expect(onions).toBeGreaterThan(0);
  });

  it('Kuppel mit dem Durchmesser des Turms auf einem Tambour, Laterne ab D 9', () => {
    for (const size of SIZES) {
      const { r, plan, cx, cz, design } = tower('mediterranean', size);
      expect(design.helm.kind).toBe('dome');
      expect(design.drum).toBeGreaterThanOrEqual(2);
      const roof = getMaterial(plan.input.materials.roof);
      const disk = circle(design.d);
      const o = (design.d - 1) / 2;
      const { width, length } = r.model.dimensions;
      for (let y = design.helm.y0; y <= design.topY; y++)
        for (let x = 0; x < width; x++)
          for (let z = 0; z < length; z++) {
            const s = id(blockAt(r.model, x, y, z));
            if ([roof.forms.block, roof.forms.stairs, roof.forms.slab].includes(s)) expect(disk.has(x - cx + o, z - cz + o), `${size} ${x},${y},${z}`).toBe(true);
          }
      // Lowest dome layer = the tower's diameter.
      expect(design.helm.layers[0]!.mask.width).toBe(design.d);
      const lanterns = [];
      for (let y = design.helm.y0; y <= design.topY; y++) if (id(blockAt(r.model, cx, y, cz)).endsWith('lantern')) lanterns.push(y);
      expect(lanterns.length, size).toBe(1);
    }
  });

  it('Fenster mit Tiefe: Öffnung in der Wand, Scheibe einen Block dahinter', () => {
    for (const style of STYLE_IDS)
      for (const size of SIZES) {
        const { r, plan, cx, cz, design, mass } = tower(style, size);
        let windows = 0;
        const rr = (design.d - 1) / 2;
        for (const [vx, vz] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const)
          for (let y = 1; y < design.corbelY; y++) {
            // The entrance (north axis, ground storey) belongs to the door template (transom).
            if (vz === -1 && y <= plan.plinth + plan.floorHeight) continue;
            const wall = blockAt(r.model, cx + vx * rr, y, cz + vz * rr);
            const inner = blockAt(r.model, cx + vx * (rr - 1), y, cz + vz * (rr - 1));
            expect(wall.includes('pane'), `${style} ${size} no pane flush in the wall`).toBe(false);
            if (inner.includes('pane')) {
              windows++;
              expect(wall, `${style} ${size} y=${y}`).toBe(AIR);
            }
          }
        expect(windows, `${style} ${size}`).toBeGreaterThanOrEqual(mass.floors);
      }
  });

  it('Fensterhierarchie: ab D 13 Bogenfenster mit drei Öffnungen im obersten Geschoss', () => {
    for (const style of ['medieval', 'mediterranean', 'nordic'] as const)
      for (const size of ['large', 'huge'] as const) {
        const { r, plan, mass, cx, cz, design } = tower(style, size);
        expect(design.d).toBeGreaterThanOrEqual(13);
        const rr = (design.d - 1) / 2;
        const yb = plan.plinth + (mass.floors - 1) * plan.floorHeight + (plan.floorHeight - 1 >= 4 ? 2 : 1);
        let arched = 0;
        for (const side of ['north', 'east', 'south', 'west'] as const) {
          if (side === mass.round!.ladder) continue;
          const [vx, vz] = ({ north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] } as const)[side];
          const [wx, wz] = [-vz, vx];
          const at = (s: number, dd: number, y: number) => blockAt(r.model, cx + vx * (rr + dd) + wx * s, y, cz + vz * (rr + dd) + wz * s);
          if (!at(0, -1, yb).includes('pane')) continue;
          arched++;
          for (const s of [-1, 0, 1]) {
            expect(at(s, 0, yb), `${style} ${size} ${side}`).toBe(AIR);
            expect(at(s, -1, yb + 1), `${style} ${size} ${side}`).toContain('pane');
          }
          const springer = at(-1, 0, yb + 2);
          expect(definitionOf(springer).shape).toBe('stairs');
          expect(propsOf(springer).half).toBe('top');
          expect(propsOf(at(0, 0, yb + 2)).type).toBe('top');
        }
        expect(arched, `${style} ${size}`).toBeGreaterThanOrEqual(2);
      }
  });

  it('Steintürme ab D 13: Rundstäbe aus der Wandmauer in den Diagonalkerben', () => {
    for (const size of ['large', 'huge'] as const) {
      const { r, cx, cz, design } = tower('medieval', size);
      for (const [x, z] of cellsAround(notchCells(design.d), cx, cz))
        for (let y = design.plinthTop + 3; y < design.corbelY; y++) {
          const s = blockAt(r.model, x, y, z);
          if (s !== AIR) expect(definitionOf(s).shape, `${size} ${x},${y},${z}`).toBe('wall');
        }
    }
    // Small towers stay plain (the notch would fill the step of a small circle).
    const small = tower('medieval', 'medium');
    for (const [x, z] of cellsAround(notchCells(small.design.d), small.cx, small.cz)) expect(blockAt(small.r.model, x, small.design.plinthTop + 3, z)).toBe(AIR);
  });

  it('eine Laterne hängt in jedem Geschoss, sonst bleiben die Räume leer', () => {
    for (const style of ['medieval', 'fantasy', 'nordic'] as const) {
      const { r, plan, mass, cx, cz, design } = tower(style, 'large');
      for (let k = 0; k < mass.floors; k++) {
        const y = plan.plinth + (k + 1) * plan.floorHeight - 1;
        const s = blockAt(r.model, cx, y, cz);
        expect(id(s), `${style} ${k}`).toMatch(/lantern$/);
        expect(propsOf(s).hanging).toBe('true');
      }
      // Inside the ring only air, floors, the ladder, lanterns and the window niches.
      const wallMat = getMaterial(plan.input.materials.wall);
      const allowed = new Set(['air', 'ladder', plan.input.lantern, getMaterial(plan.input.materials.floor).forms.block, wallMat.forms.block, ...(wallMat.weathering ?? [])]);
      const inner = circle(design.d);
      const ringCells = circle(design.d, 'thick');
      const o = (design.d - 1) / 2;
      for (const [mx, mz] of inner.cells()) {
        if (ringCells.has(mx, mz)) continue;
        for (let y = plan.plinth; y <= design.top; y++) {
          const s = id(blockAt(r.model, cx - o + mx, y, cz - o + mz));
          if (!s.includes('pane') && !s.endsWith('_door')) expect(allowed.has(s), `${style} ${mx},${y},${mz} ${s}`).toBe(true);
        }
      }
      // Without lanterns wished: none in the tower (the door template brings its own).
      const none = tower(style, 'large', {}, { lanternDensity: 'none' });
      for (const [mx, mz] of inner.cells())
        for (let y = 0; y <= none.design.topY; y++) expect(id(blockAt(none.r.model, none.cx - o + mx, y, none.cz - o + mz))).not.toMatch(/lantern$/);
    }
  });

  it('Turmhöhe aus dem Entwurf stimmt mit dem Modell überein', () => {
    for (const style of STYLE_IDS)
      for (const size of SIZES) {
        const { r, design } = tower(style, size);
        const { width, length, height } = r.model.dimensions;
        let highest = 0;
        for (let y = 0; y < height; y++)
          for (let x = 0; x < width; x++) for (let z = 0; z < length; z++) if (blockAt(r.model, x, y, z) !== AIR) highest = y;
        expect(highest, `${style} ${size}`).toBe(design.topY);
      }
  });
});

describe('Rundtürme: harte Regeln', () => {
  const clean = (r: ReturnType<typeof build>, label: string) => {
    expect(r.repairs, label).toEqual([]);
    expect(lintHouse(r.model, r.house!), label).toEqual([]);
  };

  // Winter with snow on request (the only case where snow is built).
  const THEMES = ['none', 'winter', 'christmas'] as const;

  it.each(THEMES)('frei stehende Türme, Thema %s: alle Stile × Größen ohne Reparaturen und ohne Lint-Befund', (theme) => {
    for (const style of STYLE_IDS)
      for (const size of SIZES) {
        const r = build('tower', style, size, { theme, seed: 7 }, theme === 'winter' ? { snow: true } : {});
        clean(r, `${style} ${size} ${theme}`);
        expect(r.house!.openings.doors).toHaveLength(1);
      }
  });

  it.each(THEMES)('Haus mit Rundturm, Thema %s: alle Stile × Größen ohne Reparaturen und ohne Lint-Befund', (theme) => {
    for (const style of STYLE_IDS)
      for (const size of SIZES) {
        const r = build('house', style, size, { theme, seed: 3 }, { tower: 'round', ...(theme === 'winter' ? { snow: true } : {}) });
        clean(r, `${style} ${size} ${theme}`);
      }
  });

  it('deterministisch: gleicher Seed ergibt ein bitgleiches Modell', () => {
    for (const style of ['medieval', 'fantasy', 'mediterranean'] as const) {
      const a = build('tower', style, 'large', { seed: 11 });
      const b = build('tower', style, 'large', { seed: 11 });
      expect(a.model.hash).toBe(b.model.hash);
      const h1 = build('house', style, 'large', { seed: 5 }, { tower: 'round' });
      const h2 = build('house', style, 'large', { seed: 5 }, { tower: 'round' });
      expect(h1.model.hash).toBe(h2.model.hash);
    }
  });

  it('Turmspitzen verschiedener Seeds: Knick und Turmhelm variieren deterministisch', () => {
    const bends = new Set<string>();
    const spires = new Set<string>();
    for (const seed of range(1, 12)) {
      const f = tower('fantasy', 'medium', { seed });
      bends.add(f.design.helm.bend);
      spires.add(tower('medieval', 'large', { seed }).design.helm.kind);
    }
    expect(bends.size).toBeGreaterThan(1);
    expect([...spires].sort()).toEqual(['none', 'spire']);
  });
});
