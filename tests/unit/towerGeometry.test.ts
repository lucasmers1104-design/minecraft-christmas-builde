import { describe, expect, it } from 'vitest';
import {
  battlementLayout,
  battlementRuns,
  circle,
  notchCells,
  ring,
  sectorBattlements,
  spireDiameters,
  witchHatLayers,
  type Mask2D,
} from '@/core/geometry';

/**
 * Geometry for round towers after research report 16 ("Bauqualitaet 2026-10"): merlons by
 * angular sectors, notch cells for posts and pilasters, spire and witch-hat profiles.
 */

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** D4 invariance via its two generators (mirror x, transpose). */
const isD4 = (m: Mask2D) => m.cells().every(([x, z]) => m.has(m.width - 1 - x, z) && m.has(z, x));

describe('Turm-Geometrie (Bericht 16)', () => {
  it('Zinnen über Winkelsektoren sind für jeden Durchmesser D4-symmetrisch und ohne Zahnlücken', () => {
    for (const d of range(5, 31))
      for (const r of [ring(d + 2, 1), circle(d, 'thick'), circle(d, 'thin')]) {
        const { merlons, share } = battlementLayout(r);
        expect(merlons % 4, `D${d}`).toBe(0);
        const m = sectorBattlements(r, merlons, share);
        expect(isD4(m), `D${d}`).toBe(true);
        expect(m.cells().every(([x, z]) => r.has(x, z))).toBe(true);
        const runs = battlementRuns(r, m);
        // Merlons and crenels 1–3 / 1–2 blocks wide along the silhouette, no lonely tooth gaps.
        expect(Math.min(...runs.merlons), `D${d}`).toBeGreaterThanOrEqual(1);
        expect(Math.max(...runs.merlons), `D${d}`).toBeLessThanOrEqual(3);
        expect(Math.max(...runs.crenels), `D${d}`).toBeLessThanOrEqual(2);
      }
    // "wide" gives merlons wider than crenels where the ring allows it (D 9: 8 merlons of 2–3).
    const k9 = ring(11, 1);
    const wide = battlementLayout(k9, 'wide');
    const runs = battlementRuns(k9, sectorBattlements(k9, wide.merlons, wide.share));
    expect(runs.merlons.reduce((a, b) => a + b, 0)).toBeGreaterThan(runs.crenels.reduce((a, b) => a + b, 0));
    expect(() => sectorBattlements(k9, 6)).toThrow(RangeError);
    expect(() => sectorBattlements(k9, 8, 1)).toThrow(RangeError);
  });

  it('Kerbzellen liegen in den Pixelstufen (zwei Wandflächen) und symmetrisch', () => {
    for (const d of range(5, 25)) {
      const n = notchCells(d);
      const wall = circle(d);
      expect(n.count, `D${d}`).toBeGreaterThanOrEqual(4);
      expect(isD4(n), `D${d}`).toBe(true);
      for (const [x, z] of n.cells()) {
        expect(wall.has(x - 1, z - 1)).toBe(false);
        const faces = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dz]) => wall.has(x - 1 + dx!, z - 1 + dz!)).length;
        expect(faces, `D${d} ${x},${z}`).toBe(2);
      }
    }
    // D 13: one notch per diagonal at (±5, ±5) from the axis.
    expect(notchCells(13).cells()).toEqual([[2, 2], [12, 2], [2, 12], [12, 12]]);
  });

  it('Turmhelm-Profil: Parität, höchstens 2 schmaler je Schicht, schlanke Spitze statt Säule', () => {
    expect(spireDiameters(9, 10)).toEqual([9, 9, 7, 7, 5, 5, 3, 3, 1, 1]);
    expect(spireDiameters(9, 10, 1, 1)).toEqual([9, 9, 7, 7, 5, 5, 3, 3, 1]);
    for (const base of range(5, 23))
      for (const h of [3, 6, 10, 15, 25])
        for (const p of [0.6, 1, 1.75]) {
          const s = spireDiameters(base, h, p);
          expect(s[0], `${base}/${h}/${p}`).toBe(base);
          expect(s.every((w, i) => w % 2 === base % 2 && (i === 0 || [0, 2].includes(s[i - 1]! - w)))).toBe(true);
          const min = base % 2 === 1 ? 1 : 2;
          expect(s.filter((w) => w === min).length).toBeLessThanOrEqual(2);
          expect(s.at(-1)).toBe(min);
        }
  });

  it('Hexenhut: Lagenlisten aus Bericht 09, Krempe D + 4, Hutband, Knick mit Überlappung', () => {
    const show = (d: number) => witchHatLayers(d).map((l) => `${l.d}${l.shift ? `@${l.shift}` : ''}`).join(',');
    expect(show(5)).toBe('9,7,7,5,5,5,3,3,3@1,3@1,1@2,1@2');
    expect(show(7)).toBe('11,9,9,7,7,7,5,5,5,5,3,3,3@1,3@1,3@1,1@2,1@2');
    for (const d of range(5, 21).filter((n) => n % 2 === 1)) {
      const hat = witchHatLayers(d);
      expect(hat[0]).toEqual({ d: d + 4, shift: 0 });
      expect(hat[1]!.d).toBe(d + 2);
      expect(hat[2]!.d).toBe(d + 2);
      expect(hat.slice(-2).every((l) => l.d === 1)).toBe(true);
      expect(hat.every((l, i) => i === 0 || (l.shift - hat[i - 1]!.shift <= 1 && l.d <= hat[i - 1]!.d))).toBe(true);
      const ratio = hat.length / (d + 4);
      expect(ratio, `D${d}`).toBeGreaterThan(1.2);
      expect(ratio, `D${d}`).toBeLessThan(1.8);
      expect(witchHatLayers(d, false).every((l) => l.shift === 0)).toBe(true);
    }
    expect(() => witchHatLayers(6)).toThrow(RangeError);
  });
});

