import { describe, expect, it } from 'vitest';
import {
  battlementPattern,
  battlementSymmetric,
  circle,
  cone,
  dome,
  ellipse,
  facingRing,
  layerDiameters,
  onionProfile,
  pointedArch,
  renderMask,
  revolve,
  ring,
  ringFacing,
  roundArch,
  rowWidths,
  segmentalArch,
  sphere,
  straightRun,
  taperDiameters,
  type Arch,
  type LayeredShape,
  type Mask2D,
} from '@/core/geometry';

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** D4 invariance via its two generators (mirror x, transpose); independent of the library's own helper. */
function isDihedralSymmetric(m: Mask2D): boolean {
  const n = m.width;
  if (m.depth !== n) return false;
  return m.cells().every(([x, z]) => m.has(n - 1 - x, z) && m.has(z, x));
}

const isMirrorSymmetric = (m: Mask2D) =>
  m.cells().every(([x, z]) => m.has(m.width - 1 - x, z) && m.has(x, m.depth - 1 - z));

const sameCells = (a: Mask2D, b: Mask2D) => expect(a.cells()).toEqual(b.cells());

/** Rows top → bottom with the notes' tokens (wall columns left out): tW/tE stairs, Ts keystone slit, .. air, ## solid. */
function archRows(a: Arch): string[] {
  const token = new Map(a.cells.map((c) => [`${c.x},${c.y}`, c.kind === 'stair' ? (c.side === 'left' ? 'tW' : 'tE') : '##']));
  return range(0, a.height - 1)
    .reverse()
    .map((y) =>
      range(0, a.width - 1)
        .map((x) => (a.keystone?.x === x && a.keystone.y === y ? 'Ts' : (token.get(`${x},${y}`) ?? '..')))
        .join(' '),
    );
}

const full = (w: number) => Array.from({ length: w }, () => '..').join(' ');

/** Lengths of runs of equal consecutive values, e.g. [5, 5, 3] -> [2, 1]. */
function runLengths(values: number[]): number[] {
  const out: number[] = [];
  values.forEach((v, i) => out.push(i > 0 && v === values[i - 1] ? (out.pop() ?? 0) + 1 : 1));
  return out;
}

describe('Kreise nach „Blockmitte im Kreis“', () => {
  it('trifft die veröffentlichten Blockzahlen dünn/dick/gefüllt (pixelcircles)', () => {
    const published: Record<number, [number, number, number]> = {
      5: [12, 16, 21],
      7: [16, 24, 37],
      9: [24, 32, 69],
      11: [28, 40, 97],
      15: [40, 56, 177],
      21: [56, 80, 349],
    };
    for (const [d, counts] of Object.entries(published)) {
      expect([circle(+d, 'thin').count, circle(+d, 'thick').count, circle(+d, 'filled').count]).toEqual(counts);
    }
    // D13 is not published, but computed in the notes (36/48/137).
    expect([circle(13, 'thin').count, circle(13, 'thick').count, circle(13, 'filled').count]).toEqual([36, 48, 137]);
  });

  it('stimmt für D 5–21 mit dem Referenzskript circ.py überein', () => {
    // Output of skripte/circ.py (Python 3.12), first block: D -> [thin, thick, filled].
    const ref: Array<[number, number, number]> = [
      [12, 16, 21], [16, 20, 32], [16, 24, 37], [20, 28, 52], [24, 32, 69], [28, 36, 80], [28, 40, 97], [32, 44, 112],
      [36, 48, 137], [36, 52, 156], [40, 56, 177], [44, 60, 208], [48, 64, 225], [48, 68, 256], [52, 72, 293],
      [56, 76, 316], [56, 80, 349],
    ];
    expect(range(5, 21).map((d) => [circle(d, 'thin').count, circle(d, 'thick').count, circle(d, 'filled').count])).toEqual(ref);
  });

  it('liefert die Zeilenbreiten-Tabelle und die geraden Achsstrecken der Notizen', () => {
    const table: Record<number, number[]> = {
      5: [3, 5, 5],
      6: [4, 6, 6],
      7: [3, 5, 7, 7],
      8: [4, 6, 8, 8],
      9: [5, 7, 9, 9, 9],
      10: [4, 8, 8, 10, 10],
      11: [5, 7, 9, 11, 11, 11],
      12: [4, 8, 10, 10, 12, 12],
      13: [5, 9, 11, 11, 13, 13, 13],
      14: [6, 8, 10, 12, 14, 14, 14],
      15: [5, 9, 11, 13, 13, 15, 15, 15],
      16: [6, 10, 12, 14, 14, 16, 16, 16],
      17: [5, 9, 13, 13, 15, 15, 17, 17, 17],
      18: [6, 10, 12, 14, 16, 16, 18, 18, 18],
      19: [7, 11, 13, 15, 17, 17, 19, 19, 19, 19],
      20: [6, 10, 14, 16, 16, 18, 18, 20, 20, 20],
      21: [7, 11, 13, 15, 17, 19, 19, 21, 21, 21, 21],
    };
    for (const [d, widths] of Object.entries(table)) expect(rowWidths(+d)).toEqual(widths);
    const run = (ds: number[]) => ds.map(straightRun);
    expect(run([5, 7])).toEqual([3, 3]);
    expect(run([9, 11, 13, 15, 17])).toEqual([5, 5, 5, 5, 5]);
    expect(run([19, 21])).toEqual([7, 7]);
    expect(run([6, 8, 10, 12])).toEqual([4, 4, 4, 4]);
    expect(run([14, 16, 18, 20])).toEqual([6, 6, 6, 6]);
  });

  it('reproduziert die Diagramme D7/D9/D13 dünn und D15 dünn/dick', () => {
    expect(renderMask(circle(7, 'thin'))).toEqual(['..###..', '.#...#.', '#.....#', '#.....#', '#.....#', '.#...#.', '..###..']);
    expect(renderMask(circle(9, 'thin'))).toEqual([
      '..#####..', '.#.....#.', '#.......#', '#.......#', '#.......#', '#.......#', '#.......#', '.#.....#.', '..#####..',
    ]);
    expect(renderMask(circle(13, 'thin')).slice(0, 5)).toEqual(['....#####....', '..##.....##..', '.#.........#.', '.#.........#.', '#...........#']);
    expect(renderMask(circle(15, 'thin')).slice(0, 6)).toEqual([
      '.....#####.....', '...##.....##...', '..#.........#..', '.#...........#.', '.#...........#.', '#.............#',
    ]);
    expect(renderMask(circle(15, 'thick')).slice(0, 7)).toEqual([
      '.....#####.....', '...###...###...', '..##.......##..', '.##.........##.', '.#...........#.', '##...........##', '#.............#',
    ]);
  });

  it('ist für alle Modi und D 1–25 unter der Diedergruppe symmetrisch und deterministisch', () => {
    for (const d of range(1, 25))
      for (const mode of ['thin', 'thick', 'filled'] as const) {
        expect(isDihedralSymmetric(circle(d, mode))).toBe(true);
        sameCells(circle(d, mode), circle(d, mode));
      }
    for (const d of range(3, 25)) for (const t of [1, 2, 3]) expect(isDihedralSymmetric(ring(d, t))).toBe(true);
  });

  it('Ellipse: Spezialfall Kreis, Spiegelsymmetrie und Referenzwerte aus circ.py', () => {
    for (const d of range(1, 21)) for (const mode of ['thin', 'thick', 'filled'] as const) sameCells(ellipse(d, d, mode), circle(d, mode));
    // circ.grid(H, mode, W) for W×H, Python 3.12: [thin, thick, filled].
    const ref: Array<[number, number, [number, number, number]]> = [
      [9, 5, [20, 24, 37]],
      [5, 9, [20, 24, 37]],
      [11, 7, [24, 32, 61]],
      [15, 9, [32, 44, 107]],
      [8, 5, [18, 22, 32]],
      [12, 6, [24, 32, 56]],
      [21, 11, [44, 60, 183]],
    ];
    for (const [w, h, counts] of ref) {
      const e = (['thin', 'thick', 'filled'] as const).map((m) => ellipse(w, h, m));
      expect(e.map((m) => m.count)).toEqual(counts);
      expect(e.every(isMirrorSymmetric)).toBe(true);
      expect([e[0]?.width, e[0]?.depth]).toEqual([w, h]);
    }
  });

  it('Ring der Dicke t ist filled(D) minus filled(D−2t)', () => {
    expect(ring(11, 2).count).toBe(60); // notes / extra.py
    // circ.py cross-check: ring t=1 equals thin for D 11/15/21, equals thick for D 9, and is neither for D 13 (40 cells).
    sameCells(ring(11, 1), circle(11, 'thin'));
    sameCells(ring(15, 1), circle(15, 'thin'));
    sameCells(ring(21, 1), circle(21, 'thin'));
    sameCells(ring(9, 1), circle(9, 'thick'));
    expect(ring(13, 1).count).toBe(40);
    sameCells(ring(5, 3), circle(5, 'filled'));
  });

  it('lehnt ungültige Durchmesser ab', () => {
    expect(() => circle(0)).toThrow(RangeError);
    expect(() => circle(2.5)).toThrow(RangeError);
    expect(() => ring(9, 0)).toThrow(RangeError);
  });
});

describe('Kugel, Kuppel, Kegel und Rotationskörper', () => {
  const symmetricLayers = (s: LayeredShape) => s.layers.every(isDihedralSymmetric);

  it('trifft die veröffentlichten Kugel- und Kuppelzahlen (pixelcircles sphere chart)', () => {
    // D -> [hollow, solid, dome layers, dome blocks]
    const published: Record<number, [number, number, number, number]> = {
      5: [54, 81, 3, 33],
      7: [98, 179, 4, 57],
      9: [186, 389, 5, 105],
      11: [278, 739, 6, 153],
      13: [414, 1189, 7, 225],
      15: [530, 1791, 8, 285],
      17: [690, 2553, 9, 369],
      19: [894, 3695, 10, 473],
      21: [1082, 4945, 11, 569],
    };
    for (const [key, [hollow, solid, layers, blocks]] of Object.entries(published)) {
      const d = +key;
      expect(sphere(d, true).count).toBe(hollow);
      expect(sphere(d).count).toBe(solid);
      const shell = dome(d, undefined, 'shell');
      expect([shell.height, shell.count]).toEqual([layers, blocks]);
    }
    expect([dome(16, undefined, 'shell').height, dome(16, undefined, 'shell').count]).toEqual([8, 316]);
    // Even diameters, computed with the formulas of skripte/sph.py (Python 3.12): [solid, hollow, dome].
    for (const [d, solid, hollow, domeCount] of [[6, 136, 80, 40], [8, 280, 144, 72], [16, 2176, 632, 316]] as const) {
      expect([sphere(d).count, sphere(d, true).count, dome(d, undefined, 'shell').count]).toEqual([solid, hollow, domeCount]);
    }
  });

  it('liefert die Kuppel-Schichtbreiten der Notizen (Tabelle 2b, sph.py)', () => {
    const table: Record<number, number[]> = {
      5: [5, 5, 3],
      7: [7, 7, 5, 3],
      9: [9, 9, 9, 7, 5],
      11: [11, 11, 11, 9, 7, 5],
      13: [13, 13, 13, 11, 11, 9, 5],
      15: [15, 15, 15, 13, 13, 11, 9, 5],
      17: [17, 17, 17, 15, 15, 13, 13, 9, 5],
      19: [19, 19, 19, 19, 17, 17, 15, 13, 11, 7],
      21: [21, 21, 21, 21, 19, 19, 17, 15, 13, 11, 7],
      25: [25, 25, 25, 25, 23, 23, 21, 21, 19, 17, 15, 11, 7],
      31: [31, 31, 31, 31, 29, 29, 29, 27, 27, 25, 23, 21, 19, 17, 13, 7],
      8: [8, 8, 6, 4],
      12: [12, 12, 10, 10, 8, 4],
      16: [16, 16, 16, 14, 14, 12, 10, 6],
      20: [20, 20, 20, 18, 18, 16, 16, 14, 10, 6],
    };
    for (const [d, widths] of Object.entries(table)) expect(layerDiameters(dome(+d))).toEqual(widths);
  });

  it('Kuppel mit eigener Höhe bleibt geschlossen und schrumpft monoton', () => {
    for (const [d, h] of [[15, 4], [15, 16], [12, 3], [9, 12]] as const) {
      const s = dome(d, h);
      const widths = layerDiameters(s);
      expect(s.height).toBe(h);
      expect(widths[0]).toBe(d);
      expect(widths.every((w, i) => i === 0 || w <= (widths[i - 1] ?? 0))).toBe(true);
      expect(s.layers[h - 1]?.count).toBeGreaterThan(0);
      expect(symmetricLayers(s)).toBe(true);
    }
  });

  it('Kegel: D15/H15 massiv = 919 und die Schichtbreiten der Notizen', () => {
    expect(cone(15, 15).count).toBe(919);
    expect(cone(15, 15, 'shell').count).toBe(290); // cone.py variant c ("ring4 | visible from above")
    const widths: Array<[number, number, number[]]> = [
      [7, 7, [7, 5, 5, 3, 3, 1, 1]],
      [9, 9, [9, 7, 7, 5, 5, 3, 3, 1, 1]],
      [9, 14, [9, 9, 7, 7, 7, 5, 5, 5, 3, 3, 3, 1, 1, 1]],
      [11, 11, [11, 9, 9, 7, 7, 5, 5, 3, 3, 1, 1]],
      [11, 22, [11, 11, 9, 9, 9, 9, 7, 7, 7, 7, 5, 5, 5, 5, 3, 3, 3, 3, 1, 1, 1, 1]],
      [13, 13, [13, 11, 11, 9, 9, 7, 7, 5, 5, 3, 3, 1, 1]],
      [15, 15, [15, 13, 13, 11, 11, 9, 9, 7, 7, 5, 5, 3, 3, 1, 1]],
      [11, 9, [11, 9, 9, 7, 5, 5, 3, 1, 1]], // extra.py
    ];
    for (const [d, h, w] of widths) expect(layerDiameters(cone(d, h))).toEqual(w);
    expect(cone(8, 8).layers[7]?.count).toBe(4); // even diameters end in a 2×2 tip
    expect(cone(9, 9).layers[8]?.count).toBe(1);
  });

  it('Kegelprofile: konkav liegt innerhalb, konvex außerhalb des linearen Kegels', () => {
    for (const [d, h] of [[15, 15], [11, 22], [10, 12]] as const) {
      const lin = cone(d, h);
      const concave = cone(d, h, 'solid', { profile: 'concave' });
      const convex = cone(d, h, 'solid', { profile: 'convex' });
      for (let y = 0; y < h; y++) {
        const [l, cc, cv] = [lin.layers[y], concave.layers[y], convex.layers[y]];
        expect(cc?.cells().every(([x, z]) => l?.has(x, z))).toBe(true);
        expect(l?.cells().every(([x, z]) => cv?.has(x, z))).toBe(true);
      }
      expect(concave.count).toBeLessThan(lin.count);
      expect(convex.count).toBeGreaterThan(lin.count);
      expect(symmetricLayers(concave) && symmetricLayers(convex)).toBe(true);
    }
    // Concave = layer bands grow towards the tip (minecraft.wiki); the band at the tip is the tallest.
    const bands = runLengths(layerDiameters(cone(15, 15, 'solid', { profile: 'concave' })));
    expect(bands.at(-1)).toBe(Math.max(...bands));
    expect(bands.at(-1)).toBeGreaterThan(runLengths(layerDiameters(cone(15, 15))).at(-1) ?? 0);
  });

  it('alle Schichten sind symmetrisch; die Kugel auch vertikal', () => {
    for (const d of range(3, 17)) {
      const s = sphere(d, true);
      expect(symmetricLayers(s)).toBe(true);
      s.layers.forEach((layer, y) => {
        const mirror = s.layers[d - 1 - y];
        if (mirror) sameCells(layer, mirror);
      });
      expect(symmetricLayers(dome(d, undefined, 'shell'))).toBe(true);
      expect(symmetricLayers(cone(d, d, 'shell'))).toBe(true);
    }
  });

  it('Rotationskörper aus Standardkreisen und Zwiebelprofil', () => {
    expect(onionProfile(7)).toEqual([7, 9, 11, 11, 11, 9, 7, 5, 3, 3, 1, 1]); // example of the notes
    for (const d of range(3, 25)) {
      const p = onionProfile(d);
      expect(p[0]).toBe(d);
      expect(p.at(-1)).toBe(d % 2 === 1 ? 1 : 2);
      expect(p.every((w) => (w - d) % 2 === 0)).toBe(true);
      expect(Math.max(...p)).toBeGreaterThan(d);
      expect(symmetricLayers(revolve(p, 'shell'))).toBe(true);
    }
    const r = revolve([5, 3, 1]);
    expect(r.count).toBe(21 + 9 + 1);
    sameCells(r.layers[0] as Mask2D, circle(5));
    expect(renderMask(r.layers[1] as Mask2D)).toEqual(['.....', '.###.', '.###.', '.###.', '.....']);
    // Open-bottom shell of a cylinder: walls on the lower layers, closed top.
    expect(revolve([7, 7, 7], 'shell').count).toBe(16 + 16 + 37);
    expect(() => revolve([6, 3])).toThrow(RangeError);
    expect(() => revolve([])).toThrow(RangeError);
  });
});

describe('Turm-Helfer', () => {
  it('Zinnen sind nur bei D 7, 9, 15, 17, 21 (und 23) voll symmetrisch', () => {
    const symmetric = range(5, 25).filter(battlementSymmetric);
    // Notes (D 5–21): {7, 9, 15, 17, 21}; D 23 is new and was confirmed with the notes' method in Python.
    expect(symmetric.filter((d) => d <= 21)).toEqual([7, 9, 15, 17, 21]);
    expect(symmetric).toEqual([7, 9, 15, 17, 21, 23]);
    for (const d of range(5, 25)) expect(battlementPattern(d).count).toBe(circle(d, 'thin').count / 2);
  });

  it('Zinnenmuster D15 entspricht dem Diagramm der Notizen', () => {
    const merlons = battlementPattern(15);
    const thin = circle(15, 'thin');
    const rows = range(0, 14).map((z) =>
      range(0, 14)
        .map((x) => (merlons.has(x, z) ? 'M' : thin.has(x, z) ? 'o' : '.'))
        .join(''),
    );
    expect(rows).toEqual([
      '.....oMoMo.....',
      '...oM.....Mo...',
      '..M.........M..',
      '.o...........o.',
      '.M...........M.',
      'o.............o',
      'M.............M',
      'o.............o',
      'M.............M',
      'o.............o',
      '.M...........M.',
      '.o...........o.',
      '..M.........M..',
      '...oM.....Mo...',
      '.....oMoMo.....',
    ]);
  });

  it('Verjüngung erhält die Parität', () => {
    expect(taperDiameters(13, 2)).toEqual([13, 11, 9]); // lighthouse 13 -> 9
    expect(taperDiameters(6, 4)).toEqual([6, 4, 2, 2, 2]);
    for (const d of range(5, 25))
      for (const steps of range(0, 12)) {
        const t = taperDiameters(d, steps);
        expect(t).toHaveLength(steps + 1);
        expect(t.every((w) => w % 2 === d % 2 && w >= 1)).toBe(true);
        expect(t.every((w, i) => i === 0 || [0, 2].includes((t[i - 1] ?? 0) - w))).toBe(true);
      }
  });

  it('Treppenrichtung zeigt zur Turmmitte (dominante Achse, Gleichstand → z)', () => {
    const c = { x: 7, z: 7 };
    expect(ringFacing(0, 7, c)).toBe('east');
    expect(ringFacing(14, 7, c)).toBe('west');
    expect(ringFacing(7, 0, c)).toBe('south');
    expect(ringFacing(7, 14, c)).toBe('north');
    expect(ringFacing(0, 0, c)).toBe('south');
    expect(ringFacing(14, 14, c)).toBe('north');
    expect(ringFacing(0, 1, { x: 2.5, z: 2.5 })).toBe('east');
    const step = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] } as const;
    for (const d of range(3, 21)) {
      const disc = circle(d);
      const ringCells = facingRing(disc);
      expect(ringCells).toHaveLength(circle(d, 'thick').count);
      for (const { x, z, facing } of ringCells) expect(disc.has(x + step[facing][0], z + step[facing][1])).toBe(true);
    }
  });
});

describe('Bögen mit Treppen-Glättung', () => {
  it('Rundbogen Weite 3 und 7 wie in den Notizen', () => {
    expect(archRows(roundArch(3))).toEqual(['tW Ts tE', '.. .. ..']);
    expect(archRows(roundArch(7))).toEqual(['## tW .. .. .. tE ##', 'tW .. .. .. .. .. tE', full(7), full(7)]);
  });

  it('weitere Rund-, Spitz- und Segmentbögen wie arch2.py', () => {
    // skripte/arch2.py (Python 3.12), wall columns removed; segmental arches with a jamb row below as in the notes.
    expect(archRows(roundArch(4))).toEqual(['tW .. .. tE', full(4)]);
    expect(archRows(roundArch(5))).toEqual(['tW .. .. .. tE', full(5), full(5)]);
    expect(archRows(roundArch(6))).toEqual(['tW .. .. .. .. tE', full(6), full(6)]);
    expect(archRows(roundArch(9))).toEqual(['## tW .. .. .. .. .. tE ##', 'tW .. .. .. .. .. .. .. tE', full(9), full(9), full(9)]);
    expect(archRows(roundArch(11))).toEqual([
      '## ## tW .. .. .. .. .. tE ## ##',
      '## tW .. .. .. .. .. .. .. tE ##',
      'tW .. .. .. .. .. .. .. .. .. tE',
      full(11),
      full(11),
      full(11),
    ]);
    expect(archRows(pointedArch(3))).toEqual(['tW Ts tE', full(3), full(3)]);
    expect(archRows(pointedArch(5))).toEqual(['## .. .. .. ##', 'tW .. .. .. tE', full(5), full(5)]);
    expect(archRows(pointedArch(7))).toEqual(['## ## tW Ts tE ## ##', '## tW .. .. .. tE ##', 'tW .. .. .. .. .. tE', full(7), full(7), full(7)]);
    expect(archRows(pointedArch(9))).toEqual([
      '## ## ## tW Ts tE ## ## ##',
      '## ## tW .. .. .. tE ## ##',
      '## tW .. .. .. .. .. tE ##',
      '## .. .. .. .. .. .. .. ##',
      'tW .. .. .. .. .. .. .. tE',
      full(9),
      full(9),
      full(9),
    ]);
    expect(archRows(segmentalArch(5, 1, { jamb: 1 }))).toEqual(['tW .. .. .. tE', full(5)]);
    expect(archRows(segmentalArch(7, 1.5, { jamb: 1 }))).toEqual(['## ## tW Ts tE ## ##', 'tW .. .. .. .. .. tE', full(7)]);
    expect(archRows(segmentalArch(9, 2, { jamb: 1 }))).toEqual(['## tW .. .. .. .. .. tE ##', 'tW .. .. .. .. .. .. .. tE', full(9)]);
  });

  it('Proportionen: Rundbogen steigt um die halbe Breite, Spitzbogen etwa 87 %', () => {
    expect(roundArch(15).height).toBe(8); // "a 15-wide arch has a curve 8 rows tall"
    for (const w of range(4, 25)) expect(roundArch(w, { centre: 'grid' }).height).toBe(Math.ceil(w / 2));
    for (const w of range(7, 25)) expect(Math.abs(pointedArch(w).height / w - Math.sqrt(3) / 2)).toBeLessThan(0.07);
    const lifted = roundArch(7, { jamb: 2 });
    expect(lifted.height).toBe(6);
    expect(archRows(lifted).slice(0, 2)).toEqual(archRows(roundArch(7)).slice(0, 2));
    expect(roundArch(5, { centre: 'springLine' }).keystone).toEqual({ x: 2, y: 2 });
  });

  it('Treppenregel exakt, Rechteck vollständig und spiegelsymmetrisch', () => {
    const arches: Arch[] = range(1, 21).flatMap((w) => [
      roundArch(w),
      roundArch(w, { centre: 'springLine', jamb: 1 }),
      pointedArch(w),
      ...(w >= 2 ? [segmentalArch(w, w / 4, { jamb: 2 })] : []),
    ]);
    for (const a of arches) {
      expect(a.open.count + a.cells.length).toBe(a.width * a.height);
      for (const c of a.cells) {
        const toCentre = 2 * c.x + 1 < a.width ? 1 : 2 * c.x + 1 > a.width ? -1 : 0;
        const rule = toCentre !== 0 && a.open.has(c.x, c.y - 1) && a.open.has(c.x + toCentre, c.y);
        expect(c.kind === 'stair').toBe(rule);
        if (c.kind === 'stair') expect(c.side).toBe(toCentre > 0 ? 'left' : 'right');
      }
      const rows = archRows(a);
      const mirrored = rows.map((r) => r.split(' ').reverse().map((t) => (t === 'tW' ? 'tE' : t === 'tE' ? 'tW' : t)).join(' '));
      expect(mirrored).toEqual(rows);
      expect(a.open.has(0, 0)).toBe(true);
    }
  });

  it('lehnt ungültige Bogenmaße ab', () => {
    expect(() => roundArch(0)).toThrow(RangeError);
    expect(() => segmentalArch(7, 4)).toThrow(RangeError);
    expect(() => segmentalArch(7, 0)).toThrow(RangeError);
    expect(() => pointedArch(5, { jamb: -1 })).toThrow(RangeError);
  });
});
