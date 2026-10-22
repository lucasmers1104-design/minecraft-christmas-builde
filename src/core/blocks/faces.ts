import type { Direction } from '@/core/blocks/directions';
import { AIR, definitionOf, propsOf } from '@/core/blocks/registry';
import { shapeBoxes, supportBoxes, type Box } from '@/core/blocks/shapes';

/**
 * Face coverage derived from the shape geometry, as 16×16 pixel masks per block face.
 *
 * - "support" faces use the support shape (leaves have none): fences, panes and walls connect
 *   to full support faces, lanterns and candles need the face centre (vanilla `isFaceSturdy` /
 *   `canSupportCenter`).
 * - "collision" faces use the visual shape: snow layers survive on a full top collision face,
 *   which includes leaves.
 */

export type FaceMode = 'support' | 'collision';

const SIZE = 16;
const cache = new Map<string, Uint16Array>();

function rasterize(boxes: readonly Box[], dir: Direction): Uint16Array {
  // rows[j] has bit i set if pixel (i, j) is covered. Axes per face: up/down → (x, z),
  // north/south → (x, y), east/west → (z, y).
  const rows = new Uint16Array(SIZE);
  for (const [x0, y0, z0, x1, y1, z1] of boxes) {
    let a0: number, a1: number, b0: number, b1: number;
    switch (dir) {
      case 'up':
        if (y1 < 16) continue;
        [a0, a1, b0, b1] = [x0, x1, z0, z1];
        break;
      case 'down':
        if (y0 > 0) continue;
        [a0, a1, b0, b1] = [x0, x1, z0, z1];
        break;
      case 'north':
        if (z0 > 0) continue;
        [a0, a1, b0, b1] = [x0, x1, y0, y1];
        break;
      case 'south':
        if (z1 < 16) continue;
        [a0, a1, b0, b1] = [x0, x1, y0, y1];
        break;
      case 'west':
        if (x0 > 0) continue;
        [a0, a1, b0, b1] = [z0, z1, y0, y1];
        break;
      case 'east':
        if (x1 < 16) continue;
        [a0, a1, b0, b1] = [z0, z1, y0, y1];
        break;
    }
    const iStart = Math.max(0, Math.ceil(a0));
    const iEnd = Math.min(SIZE, Math.floor(a1));
    const jStart = Math.max(0, Math.ceil(b0));
    const jEnd = Math.min(SIZE, Math.floor(b1));
    if (iEnd <= iStart) continue;
    const bits = ((1 << iEnd) - 1) & ~((1 << iStart) - 1);
    for (let j = jStart; j < jEnd; j++) rows[j] = rows[j]! | bits;
  }
  return rows;
}

export function faceMask(state: string, dir: Direction, mode: FaceMode = 'support'): Uint16Array {
  const key = `${mode}|${dir}|${state}`;
  let mask = cache.get(key);
  if (!mask) {
    if (state === AIR) mask = new Uint16Array(SIZE);
    else {
      const def = definitionOf(state);
      const props = propsOf(state);
      const boxes = mode === 'support' ? supportBoxes(def.shape, props) : shapeBoxes(def.shape, props).map((b) => b.box);
      mask = rasterize(boxes, dir);
    }
    cache.set(key, mask);
  }
  return mask;
}

/** Pixel rectangle [i0, j0, i1, j1) in face coordinates is completely covered. */
export function faceCovers(state: string, dir: Direction, rect: readonly [number, number, number, number], mode: FaceMode = 'support'): boolean {
  const rows = faceMask(state, dir, mode);
  const [i0, j0, i1, j1] = rect;
  const bits = ((1 << i1) - 1) & ~((1 << i0) - 1);
  for (let j = j0; j < j1; j++) if ((rows[j]! & bits) !== bits) return false;
  return true;
}

/** Vanilla SupportType.FULL: the whole face is solid. */
export function isFaceFull(state: string, dir: Direction, mode: FaceMode = 'support'): boolean {
  return faceCovers(state, dir, [0, 0, 16, 16], mode);
}

/** Vanilla SupportType.CENTER (box 7..9 × 7..9), used by lanterns and candles. */
export function supportsCenter(state: string, dir: Direction): boolean {
  return faceCovers(state, dir, [7, 7, 9, 9], 'support');
}
