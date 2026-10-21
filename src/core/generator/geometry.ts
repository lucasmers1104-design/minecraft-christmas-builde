import { AIR } from '@/core/blocks/registry';
import type { BuildSpec } from '@/core/schema/buildSpec';
import {
  createVoxelModel,
  isInside,
  linearIndex,
  volumeOf,
  checkDimensions,
  type Dimensions,
  type VoxelModel,
} from '@/core/schema/voxelModel';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Write priorities. A write only succeeds if its priority is >= the priority already stored
 * in the cell, so e.g. decoration can never fill a door clearance or replace a window.
 */
export const Priority = {
  DECOR: 10,
  ROOF_COVER: 20,
  ROOF: 30,
  STRUCTURE: 50,
  CHIMNEY: 60,
  /** Attached building parts (tower, annex) replace house walls/windows where they join. */
  ANNEX: 70,
  OPENING: 80,
  CLEARANCE: 100,
} as const;
export type PriorityValue = (typeof Priority)[keyof typeof Priority];

export class GeometryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeometryError';
  }
}

/** Mutable voxel grid used while generating; frozen into a canonical VoxelModel at the end. */
export class VoxelBuilder {
  readonly dimensions: Dimensions;
  private readonly cells: Uint16Array;
  private readonly priorities: Uint8Array;
  private readonly palette: string[] = [AIR];
  private readonly paletteLookup = new Map<string, number>([[AIR, 0]]);

  constructor(dimensions: Dimensions) {
    const issues = checkDimensions(dimensions);
    if (issues.length > 0) throw new GeometryError(issues.join('; '));
    this.dimensions = { ...dimensions };
    this.cells = new Uint16Array(volumeOf(dimensions));
    this.priorities = new Uint8Array(volumeOf(dimensions));
  }

  private paletteIndex(state: string): number {
    let index = this.paletteLookup.get(state);
    if (index === undefined) {
      index = this.palette.length;
      this.palette.push(state);
      this.paletteLookup.set(state, index);
    }
    return index;
  }

  private assertInside(x: number, y: number, z: number): void {
    if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(z) || !isInside(this.dimensions, x, y, z)) {
      const d = this.dimensions;
      throw new GeometryError(`Koordinate (${x}, ${y}, ${z}) außerhalb des Volumens ${d.width}x${d.height}x${d.length}`);
    }
  }

  inside(x: number, y: number, z: number): boolean {
    return isInside(this.dimensions, x, y, z);
  }

  /** Returns true if the block was written. */
  setBlock(x: number, y: number, z: number, state: string, priority: PriorityValue): boolean {
    this.assertInside(x, y, z);
    const i = linearIndex(this.dimensions, x, y, z);
    if (priority < this.priorities[i]!) return false;
    this.cells[i] = this.paletteIndex(state);
    this.priorities[i] = priority;
    return true;
  }

  getBlock(x: number, y: number, z: number): string {
    this.assertInside(x, y, z);
    return this.palette[this.cells[linearIndex(this.dimensions, x, y, z)]!]!;
  }

  isAir(x: number, y: number, z: number): boolean {
    return this.getBlock(x, y, z) === AIR;
  }

  /** Reserve a cell as air so no lower-priority operation can fill it later. */
  clear(x: number, y: number, z: number, priority: PriorityValue = Priority.CLEARANCE): boolean {
    return this.setBlock(x, y, z, AIR, priority);
  }

  fillBox(from: Vec3, to: Vec3, state: string, priority: PriorityValue): void {
    const [min, max] = orderedCorners(from, to);
    this.assertInside(min.x, min.y, min.z);
    this.assertInside(max.x, max.y, max.z);
    for (let y = min.y; y <= max.y; y++)
      for (let z = min.z; z <= max.z; z++) for (let x = min.x; x <= max.x; x++) this.setBlock(x, y, z, state, priority);
  }

  /** Only the four vertical side faces of the box (walls), no top or bottom. */
  hollowBox(from: Vec3, to: Vec3, state: string, priority: PriorityValue): void {
    const [min, max] = orderedCorners(from, to);
    this.assertInside(min.x, min.y, min.z);
    this.assertInside(max.x, max.y, max.z);
    for (let y = min.y; y <= max.y; y++)
      for (let z = min.z; z <= max.z; z++)
        for (let x = min.x; x <= max.x; x++) {
          if (x === min.x || x === max.x || z === min.z || z === max.z) this.setBlock(x, y, z, state, priority);
        }
  }

  /** Straight or diagonal line (3D DDA with integer steps). */
  line(from: Vec3, to: Vec3, state: string, priority: PriorityValue): void {
    const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y), Math.abs(to.z - from.z));
    for (let s = 0; s <= steps; s++) {
      const t = steps === 0 ? 0 : s / steps;
      this.setBlock(
        Math.round(from.x + (to.x - from.x) * t),
        Math.round(from.y + (to.y - from.y) * t),
        Math.round(from.z + (to.z - from.z) * t),
        state,
        priority,
      );
    }
  }

  /** Places the block and its mirror image across the plane x = mirrorX (mirrorX may be *.5). */
  placeSymmetric(x: number, y: number, z: number, mirrorX: number, state: string, priority: PriorityValue): void {
    this.setBlock(x, y, z, state, priority);
    const mx = 2 * mirrorX - x;
    if (mx !== x) this.setBlock(mx, y, z, state, priority);
  }

  /** Lowest y >= fromY at (x, z) that is not air, or null if the column above is free. */
  firstSolidAbove(x: number, fromY: number, z: number): number | null {
    for (let y = fromY; y < this.dimensions.height; y++) if (!this.isAir(x, y, z)) return y;
    return null;
  }

  countState(state: string): number {
    const index = this.paletteLookup.get(state);
    if (index === undefined) return 0;
    let n = 0;
    for (const cell of this.cells) if (cell === index) n++;
    return n;
  }

  toModel(spec: BuildSpec): VoxelModel {
    return createVoxelModel(spec, this.dimensions, this.palette, this.cells);
  }
}

function orderedCorners(a: Vec3, b: Vec3): [Vec3, Vec3] {
  return [
    { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), z: Math.min(a.z, b.z) },
    { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y), z: Math.max(a.z, b.z) },
  ];
}

export interface GableRoofOptions {
  /** Roof spans x in [xFrom, xTo] (including overhang). */
  xFrom: number;
  xTo: number;
  /** Outer eave positions (including overhang) on the front and back side. */
  zFront: number;
  zBack: number;
  /** y of the lowest roof layer. */
  baseY: number;
  /** Vertical rise per one-block step inwards (1 = 45°, 2 = steep). */
  rise: 1 | 2;
  roof: string;
  /** Optional covering placed on every exposed step tread (e.g. snow). */
  cover?: string;
  /** Gable infill for the end walls at these x positions. */
  gable?: { state: string; xs: readonly number[] };
}

export interface GableRoofResult {
  /** y of the topmost roof block (ridge). */
  ridgeY: number;
  /** z of the ridge (first ridge block if the ridge is two blocks wide). */
  ridgeZ: number;
  /** Interior gable cells per end wall x (for windows etc.). */
  gableCells: Vec3[];
}

/**
 * Symmetric stepped gable roof from full blocks. Each step is two blocks deep, so the roof
 * is closed (no diagonal gaps). Ridge runs along X.
 */
export function roofGable(builder: VoxelBuilder, o: GableRoofOptions): GableRoofResult {
  const gableCells: Vec3[] = [];
  let ridgeY = o.baseY;
  let ridgeZ = o.zFront;
  for (let k = 0; ; k++) {
    const left = o.zFront + k;
    const right = o.zBack - k;
    if (left > right) break;
    const zs = new Set<number>([left, right]);
    if (left + 1 <= right) zs.add(left + 1);
    if (right - 1 >= left) zs.add(right - 1);
    for (let r = 0; r < o.rise; r++) {
      const y = o.baseY + k * o.rise + r;
      for (let x = o.xFrom; x <= o.xTo; x++) for (const z of zs) builder.setBlock(x, y, z, o.roof, Priority.ROOF);
      if (o.gable) {
        for (let z = left + 2; z <= right - 2; z++) {
          for (const gx of o.gable.xs) {
            builder.setBlock(gx, y, z, o.gable.state, Priority.STRUCTURE);
            gableCells.push({ x: gx, y, z });
          }
        }
      }
      ridgeY = y;
    }
    ridgeZ = left;
    if (o.cover) {
      const coverY = o.baseY + k * o.rise + o.rise;
      for (let x = o.xFrom; x <= o.xTo; x++) {
        builder.setBlock(x, coverY, left, o.cover, Priority.ROOF_COVER);
        builder.setBlock(x, coverY, right, o.cover, Priority.ROOF_COVER);
        // On the top layer the whole ridge is exposed.
        if (right - left <= 1) for (const z of zs) builder.setBlock(x, coverY, z, o.cover, Priority.ROOF_COVER);
      }
    }
  }
  return { ridgeY, ridgeZ, gableCells };
}

export interface HipRoofOptions {
  /** Roof footprint including overhang. */
  xFrom: number;
  xTo: number;
  zFrom: number;
  zTo: number;
  baseY: number;
  rise: 1 | 2;
  roof: string;
  cover?: string;
  priority?: PriorityValue;
}

/**
 * Stepped hip roof (Walmdach) / pyramid roof: every layer shrinks by one block on all four
 * sides, each step two blocks deep so the roof stays closed. Works for any rectangle.
 */
export function roofHip(builder: VoxelBuilder, o: HipRoofOptions): GableRoofResult {
  const priority = o.priority ?? Priority.ROOF;
  const coverPriority = priority === Priority.ROOF ? Priority.ROOF_COVER : priority;
  let ridgeY = o.baseY;
  for (let k = 0; ; k++) {
    const xa = o.xFrom + k;
    const xb = o.xTo - k;
    const za = o.zFrom + k;
    const zb = o.zTo - k;
    if (xa > xb || za > zb) break;
    const isTop = xb - xa <= 1 || zb - za <= 1;
    for (let r = 0; r < o.rise; r++) {
      const y = o.baseY + k * o.rise + r;
      for (let x = xa; x <= xb; x++)
        for (let z = za; z <= zb; z++) {
          const ring = x <= xa + 1 || x >= xb - 1 || z <= za + 1 || z >= zb - 1;
          if (ring || isTop) builder.setBlock(x, y, z, o.roof, priority);
        }
      ridgeY = y;
    }
    if (o.cover) {
      const coverY = o.baseY + k * o.rise + o.rise;
      for (let x = xa; x <= xb; x++)
        for (let z = za; z <= zb; z++) {
          const outer = x === xa || x === xb || z === za || z === zb;
          if (outer || isTop) builder.setBlock(x, coverY, z, o.cover, coverPriority);
        }
    }
    if (isTop) break;
  }
  return { ridgeY, ridgeZ: Math.floor((o.zFrom + o.zTo) / 2), gableCells: [] };
}

/** Number of layers a hip roof needs (for volume planning). */
export function hipRoofLayers(spanX: number, spanZ: number): number {
  // Layer k exists while both ranges are non-empty; stops early once one side is <= 2 wide.
  let k = 0;
  for (;;) {
    const w = spanX - 2 * k;
    const d = spanZ - 2 * k;
    if (w <= 0 || d <= 0) return k;
    if (w <= 2 || d <= 2) return k + 1;
    k++;
  }
}
