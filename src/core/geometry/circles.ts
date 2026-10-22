import { maskFrom, outline, type Mask2D, type OutlineMode } from './mask';

/**
 * Pixel circles with the builders' "block centre inside the circle" criterion (donatstudios /
 * pixelcircles), NOT Bresenham: with c = (D-1)/2 a cell (i, j) is inside iff
 * (i-c)² + (j-c)² ≤ (D/2)². All tests are evaluated in doubled integer coordinates, so they are exact.
 */
export type CircleMode = OutlineMode | 'filled';

/** Throws unless `value` is an integer ≥ `min`. */
export function assertInt(value: number, name: string, min = 1): void {
  if (!Number.isInteger(value) || value < min) throw new RangeError(`${name} muss eine ganze Zahl ≥ ${min} sein (erhalten: ${value})`);
}

/** Squared doubled distance of cell (x, z) from the centre of an n×n grid: 4·((x-c)² + (z-c)²). */
export function centreDistSq(x: number, z: number, n: number): number {
  return (2 * x - n + 1) ** 2 + (2 * z - n + 1) ** 2;
}

/**
 * Disc on an n×n grid, centred on the grid, containing every cell whose centre lies inside a circle
 * of the given diameter (passed as its square; fractional values allowed). `disc(n, n * n)` is the
 * standard filled circle; layers of cones and domes use non-standard diameters.
 */
export function disc(n: number, diameterSq: number): Mask2D {
  return maskFrom(n, n, (x, z) => centreDistSq(x, z, n) <= diameterSq);
}

/** Circle of diameter `d` (cells 0..d-1 on both axes): thin, thick or filled. */
export function circle(d: number, mode: CircleMode = 'filled'): Mask2D {
  assertInt(d, 'Durchmesser');
  const filled = disc(d, d * d);
  return mode === 'filled' ? filled : outline(filled, mode);
}

/**
 * Axis-aligned ellipse, `w` cells along x and `h` cells along z:
 * ((x-cx)/(w/2))² + ((z-cz)/(h/2))² ≤ 1 (equivalent to donatj's `ratio = W/H`).
 */
export function ellipse(w: number, h: number, mode: CircleMode = 'filled'): Mask2D {
  assertInt(w, 'Breite');
  assertInt(h, 'Tiefe');
  const filled = maskFrom(w, h, (x, z) => (2 * x - w + 1) ** 2 * h * h + (2 * z - h + 1) ** 2 * w * w <= w * w * h * h);
  return mode === 'filled' ? filled : outline(filled, mode);
}

/**
 * Concentric wall ring of thickness `t`: filled(d) \ filled(d − 2t), centred (same parity).
 * For t = 1 this is not always the thin circle (D = 9 gives the thick one); prefer `circle(d, 'thin'|'thick')`
 * for one-block walls and this for t ≥ 2. If d − 2t ≤ 0 the result is the filled disc.
 */
export function ring(d: number, thickness: number): Mask2D {
  assertInt(d, 'Durchmesser');
  assertInt(thickness, 'Wandstärke');
  const outer = circle(d, 'filled');
  const innerD = d - 2 * thickness;
  if (innerD <= 0) return outer;
  const inner = circle(innerD, 'filled');
  return maskFrom(d, d, (x, z) => outer.has(x, z) && !inner.has(x - thickness, z - thickness));
}

/** Width of the filled circle per row, from the top row to the middle row (ceil(d/2) entries); the rest is mirrored. */
export function rowWidths(d: number): number[] {
  const filled = circle(d, 'filled');
  return Array.from({ length: Math.ceil(d / 2) }, (_, z) => {
    let n = 0;
    for (let x = 0; x < d; x++) if (filled.has(x, z)) n++;
    return n;
  });
}

/**
 * Length of the straight run on each axis of the circle (= width of the top row): the space for a
 * centred door or window in a round wall. Odd D: 3 (D 5–7), 5 (D 9–17), 7 (D 19–21); even D: 4 (6–12), 6 (14–20).
 */
export function straightRun(d: number): number {
  return rowWidths(d)[0] ?? 0;
}
