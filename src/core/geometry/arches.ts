import { assertInt } from './circles';
import { maskFrom, type Mask2D } from './mask';

/**
 * Arches in the facade plane: x runs across the clear opening (0..width-1, the jambs are outside),
 * y runs up, (0, 0) is the bottom-left cell of the opening. A cell is open (air) when its centre lies
 * inside the arch curve. Every solid cell with air directly below and air on the side towards the
 * arch centre becomes an upside-down stair ("stair-corner rule" of the notes).
 */
export type ArchCell =
  | { readonly x: number; readonly y: number; readonly kind: 'solid' }
  | {
      readonly x: number;
      readonly y: number;
      readonly kind: 'stair';
      readonly half: 'top';
      /**
       * Side whose high (full) half the stair shows, always away from the opening centre: 'left' for the
       * left half of the arch. On a west–east wall seen from the south: left = facing west, right = facing east.
       */
      readonly side: 'left' | 'right';
    };

export interface Arch {
  /** Clear width of the opening. */
  readonly width: number;
  /** Rows from the opening floor up to and including the highest open row; everything above is wall. */
  readonly height: number;
  /** Air cells of the width × height rectangle, `open.has(x, y)`. */
  readonly open: Mask2D;
  /** Non-air cells of the rectangle (plain solid or stair); cells outside it are wall. */
  readonly cells: readonly ArchCell[];
  /**
   * 1-wide slit at the crown (an open cell, odd widths only): close it with a top slab for a round
   * look or leave it open for a pointed one. Null if the crown is wider.
   */
  readonly keystone: { readonly x: number; readonly y: number } | null;
}

export interface ArchOptions {
  /** Full-width rows below the curve (straight jambs), default 0. */
  jamb?: number;
}

/** `inCurve(px, py)` tests a point in curve coordinates: px across 0..width, py up from the springing line. */
function buildArch(width: number, jamb: number, inCurve: (px: number, py: number) => boolean): Arch {
  const inOpening = (x: number, y: number) => y < jamb || inCurve(x + 0.5, y - jamb + 0.5);
  const xs = Array.from({ length: width }, (_, x) => x);
  let height = jamb;
  while (xs.some((x) => inOpening(x, height))) height++;
  const open = maskFrom(width, height, inOpening);
  const cells: ArchCell[] = [];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      if (open.has(x, y)) continue;
      const toCentre = 2 * x + 1 < width ? 1 : 2 * x + 1 > width ? -1 : 0;
      const stair = toCentre !== 0 && open.has(x, y - 1) && open.has(x + toCentre, y);
      cells.push(stair ? { x, y, kind: 'stair', half: 'top', side: toCentre > 0 ? 'left' : 'right' } : { x, y, kind: 'solid' });
    }
  const [crown, ...rest] = xs.filter((x) => open.has(x, height - 1));
  const keystone = width >= 3 && crown !== undefined && rest.length === 0 ? { x: crown, y: height - 1 } : null;
  return { width, height, open, cells, keystone };
}

function checkArgs(width: number, opts: ArchOptions): number {
  assertInt(width, 'Bogenweite');
  const jamb = opts.jamb ?? 0;
  assertInt(jamb, 'Leibungshöhe', 0);
  return jamb;
}

export interface RoundArchOptions extends ArchOptions {
  /**
   * Height of the circle centre: `grid` = circle-generator convention (middle of row 0 for odd widths,
   * springing line for even ones, i.e. the opening is the upper half of `circle(width, 'filled')`;
   * the curve is ceil(width/2) rows tall, e.g. 8 rows for width 15); `springLine` = always on the
   * springing line (lower crown, 1-wide keystone slit for odd widths); `auto` (default) = `grid`
   * unless that gives a flat lintel (width 3), then `springLine`.
   */
  centre?: 'auto' | 'grid' | 'springLine';
}

/** Round (semicircular) arch of clear width `width`, radius width/2. */
export function roundArch(width: number, opts: RoundArchOptions = {}): Arch {
  const jamb = checkArgs(width, opts);
  const r = width / 2;
  const make = (cy: number) => buildArch(width, jamb, (px, py) => (px - r) ** 2 + (py - cy) ** 2 <= r * r);
  const mode = opts.centre ?? 'auto';
  if (mode === 'springLine') return make(0);
  const grid = make(width % 2 === 1 ? 0.5 : 0);
  if (mode === 'grid') return grid;
  return grid.cells.length === 0 ? make(0) : grid; // no solid cell below the crown = flat lintel
}

/**
 * Equilateral pointed (Gothic) arch: two arcs with radius = width, centred on the opposite springing
 * points; about 87 % of the width tall. Odd widths end in a 1-wide keystone slit, even widths in two cells.
 */
export function pointedArch(width: number, opts: ArchOptions = {}): Arch {
  const jamb = checkArgs(width, opts);
  const w2 = width * width;
  return buildArch(width, jamb, (px, py) => px * px + py * py <= w2 && (px - width) ** 2 + py * py <= w2);
}

/**
 * Segmental (flat) arch with rise `rise` (0 < rise ≤ width/2, fractional allowed): radius
 * r = (w²/4 + rise²)/(2·rise), centre rise − r below the springing line. Use `jamb ≥ 1` so the cells
 * where the curve springs get stairs.
 */
export function segmentalArch(width: number, rise: number, opts: ArchOptions = {}): Arch {
  const jamb = checkArgs(width, opts);
  if (!(rise > 0 && rise <= width / 2)) throw new RangeError(`Stich muss in (0, ${width / 2}] liegen (erhalten: ${rise})`);
  const r = (width * width / 4 + rise * rise) / (2 * rise);
  const cy = rise - r;
  return buildArch(width, jamb, (px, py) => (px - width / 2) ** 2 + (py - cy) ** 2 <= r * r);
}
