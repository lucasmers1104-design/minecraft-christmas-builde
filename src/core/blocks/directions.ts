/**
 * Minecraft directions in world space: +X = east, +Y = up, +Z = south (same as the game and
 * as Sponge v3 / the VoxelModel index order).
 */
export type HorizontalDirection = 'north' | 'east' | 'south' | 'west';
export type Direction = HorizontalDirection | 'up' | 'down';
export type Axis = 'x' | 'y' | 'z';

/** Clockwise order seen from above. */
export const HORIZONTAL: readonly HorizontalDirection[] = ['north', 'east', 'south', 'west'];
export const DIRECTIONS: readonly Direction[] = ['north', 'east', 'south', 'west', 'up', 'down'];

export const VECTOR: Readonly<Record<Direction, readonly [number, number, number]>> = {
  north: [0, 0, -1],
  south: [0, 0, 1],
  east: [1, 0, 0],
  west: [-1, 0, 0],
  up: [0, 1, 0],
  down: [0, -1, 0],
};

export const OPPOSITE: Readonly<Record<Direction, Direction>> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
  up: 'down',
  down: 'up',
};

export function isHorizontal(value: string): value is HorizontalDirection {
  return value === 'north' || value === 'east' || value === 'south' || value === 'west';
}

export function clockwise(d: HorizontalDirection, quarterTurns = 1): HorizontalDirection {
  const i = HORIZONTAL.indexOf(d);
  return HORIZONTAL[(((i + quarterTurns) % 4) + 4) % 4]!;
}

export function counterClockwise(d: HorizontalDirection): HorizontalDirection {
  return clockwise(d, -1);
}

export function oppositeHorizontal(d: HorizontalDirection): HorizontalDirection {
  return clockwise(d, 2);
}

export function axisOf(d: Direction): Axis {
  return d === 'east' || d === 'west' ? 'x' : d === 'up' || d === 'down' ? 'y' : 'z';
}

/** Horizontal direction whose vector is (dx, dz); null for anything else. */
export function directionFromDelta(dx: number, dz: number): HorizontalDirection | null {
  if (dx === 0 && dz === -1) return 'north';
  if (dx === 0 && dz === 1) return 'south';
  if (dx === 1 && dz === 0) return 'east';
  if (dx === -1 && dz === 0) return 'west';
  return null;
}
