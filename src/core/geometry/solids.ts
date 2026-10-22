import { assertInt, circle, disc } from './circles';
import { maskFrom, spanX, type Mask2D } from './mask';

/**
 * Layered 3D shapes: one plan-view mask per layer, `layers[y]` from bottom (y = 0) to top, all on
 * the same width × depth grid with a common centre.
 */
export interface LayeredShape {
  readonly width: number;
  readonly depth: number;
  readonly height: number;
  readonly layers: readonly Mask2D[];
  /** Total number of cells. */
  readonly count: number;
}

/**
 * `solid` = every cell; `shell` = cells with at least one empty neighbour among the 4 horizontal ones
 * and the one above (open bottom, as for a roof that sits on a wall; the top layer is always kept).
 */
export type VolumeMode = 'solid' | 'shell';

function shape(layers: Mask2D[]): LayeredShape {
  const first = layers[0];
  return {
    width: first?.width ?? 0,
    depth: first?.depth ?? 0,
    height: layers.length,
    layers,
    count: layers.reduce((n, l) => n + l.count, 0),
  };
}

/** Hull of a stack of layers; with `closedBottom` the cell below counts too (6-neighbour test). */
function hull(layers: Mask2D[], closedBottom: boolean): Mask2D[] {
  return layers.map((layer, y) => {
    const above = layers[y + 1];
    const below = layers[y - 1];
    return maskFrom(
      layer.width,
      layer.depth,
      (x, z) =>
        layer.has(x, z) &&
        (!layer.has(x + 1, z) ||
          !layer.has(x - 1, z) ||
          !layer.has(x, z + 1) ||
          !layer.has(x, z - 1) ||
          !above?.has(x, z) ||
          (closedBottom && !below?.has(x, z))),
    );
  });
}

/** Smallest squared diameter that still keeps the centre cell (odd) or the 2×2 centre (even). */
const tipSq = (n: number): number => (n % 2 === 1 ? 0 : 2);

/**
 * Sphere of diameter `d`: (i-c)² + (j-c)² + (k-c)² ≤ (d/2)². `hollow` keeps the cells with at least
 * one empty face neighbour (6-test), which reproduces the pixelcircles counts (D15: 530 hollow / 1791 solid).
 */
export function sphere(d: number, hollow = false): LayeredShape {
  assertInt(d, 'Durchmesser');
  const layers = Array.from({ length: d }, (_, y) => disc(d, d * d - (2 * y - d + 1) ** 2));
  return shape(hollow ? hull(layers, true) : layers);
}

/**
 * Dome = upper half of the sphere as a stack of shrinking circles (each layer is evaluated with the 3D
 * formula, so it is not the standard circle of the same width). Default height ceil(d/2) includes the
 * equator layer for odd d. Another height stretches the dome into a half-ellipsoid (e.g. d/4 = saucer).
 * `shell` reproduces the pixelcircles dome counts (D15: 285 blocks).
 */
export function dome(d: number, height = Math.ceil(d / 2), mode: VolumeMode = 'solid'): LayeredShape {
  assertInt(d, 'Durchmesser');
  assertInt(height, 'Höhe');
  const scale = Math.ceil(d / 2) / height;
  const layers = Array.from({ length: height }, (_, y) => {
    // Doubled height of the layer centre above the sphere centre: 2y (odd d) or 2y + 1 (even d).
    const dy = (2 * y + 1 - (d % 2)) * scale;
    return disc(d, Math.max(d * d - dy * dy, tipSq(d)));
  });
  return shape(mode === 'shell' ? hull(layers, false) : layers);
}

/** Radius profile of a cone: linear (classic spire), concave (needle; layers get taller towards the tip) or convex (bell). */
export type ConeProfile = 'linear' | 'concave' | 'convex';

const CONE_EXPONENT: Record<ConeProfile, number> = { linear: 1, concave: 1.75, convex: 0.6 };

export interface ConeOptions {
  profile?: ConeProfile;
  /** Overrides the profile: diameter_i = d · (1 − i/(h−1))^exponent. */
  exponent?: number;
}

/**
 * Cone / spire of base diameter `d` and `h` layers: layer i has radius (d/2)·(1 − i/(h−1)) (linear
 * profile; D15/H15 solid = 919 as published by pixelcircles), never smaller than the single centre block
 * (odd d) or the 2×2 centre (even d). `shell` gives 290 for D15/H15 (pixelcircles' own sealing rule, 302,
 * is not reproduced).
 */
export function cone(d: number, h: number, mode: VolumeMode = 'solid', options: ConeOptions = {}): LayeredShape {
  assertInt(d, 'Durchmesser');
  assertInt(h, 'Höhe');
  const p = options.exponent ?? CONE_EXPONENT[options.profile ?? 'linear'];
  if (!(p > 0)) throw new RangeError(`Exponent muss positiv sein (erhalten: ${p})`);
  const layers = Array.from({ length: h }, (_, i) => {
    // d·(h−1−i)/(h−1) is exact whenever the true value is an integer or half-integer.
    const diameter = h === 1 ? d : p === 1 ? (d * (h - 1 - i)) / (h - 1) : d * ((h - 1 - i) / (h - 1)) ** p;
    return disc(d, Math.max(diameter * diameter, tipSq(d)));
  });
  return shape(mode === 'shell' ? hull(layers, false) : layers);
}

/**
 * Solid of revolution from standard filled circles, one diameter per layer (bottom → top), centred
 * on a grid of the largest diameter. All diameters must share its parity, otherwise a layer could not be centred.
 */
export function revolve(diameters: readonly number[], mode: VolumeMode = 'solid'): LayeredShape {
  if (diameters.length === 0) throw new RangeError('revolve() braucht mindestens eine Schicht');
  diameters.forEach((d) => assertInt(d, 'Durchmesser'));
  const n = Math.max(...diameters);
  if (diameters.some((d) => (n - d) % 2 !== 0)) throw new RangeError(`Alle Durchmesser brauchen dieselbe Parität wie ${n}`);
  const layers = diameters.map((d) => {
    const c = circle(d, 'filled');
    const o = (n - d) / 2;
    return maskFrom(n, n, (x, z) => c.has(x - o, z - o));
  });
  return shape(mode === 'shell' ? hull(layers, false) : layers);
}

/**
 * Experimental onion-dome profile (not documented by any builder source; own construction from the
 * notes): bulge to 1.5× the drum radius at a quarter of the height, then a concave taper
 * (cos^1.6) to the tip; total height round(1.7·d). Diameters keep the parity of `baseD`.
 * baseD = 7 gives 7, 9, 11, 11, 11, 9, 7, 5, 3, 3, 1, 1 (the example in the notes). Use with `revolve`.
 */
export function onionProfile(baseD: number): number[] {
  assertInt(baseD, 'Durchmesser', 3);
  const k = 1.5;
  const tb = 0.25;
  const height = Math.round((17 * baseD) / 10);
  const r0 = baseD / 2;
  return Array.from({ length: height }, (_, i) => {
    const t = i / (height - 1);
    const r =
      t <= tb
        ? r0 * (1 + (k - 1) * Math.sin(((Math.PI / 2) * t) / tb))
        : k * r0 * Math.cos(((Math.PI / 2) * (t - tb)) / (1 - tb)) ** 1.6;
    return Math.max(baseD + 2 * Math.round(r - baseD / 2), baseD % 2 === 1 ? 1 : 2);
  });
}

/** Width (x extent) of every layer, bottom → top. */
export function layerDiameters(s: LayeredShape): number[] {
  return s.layers.map(spanX);
}
