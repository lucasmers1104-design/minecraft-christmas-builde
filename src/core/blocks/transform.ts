import { clockwise, isHorizontal, type HorizontalDirection } from '@/core/blocks/directions';
import { blockIdOf, formatBlockState, propsOf } from '@/core/blocks/registry';

/**
 * Rotation and mirroring of block states (for templates designed facing south, and for the
 * editor). Rotates `facing`, `axis`, the connection properties north/east/south/west and rail
 * shapes; mirroring also swaps door `hinge` and stairs `*_left` / `*_right`. Connection and
 * stairs-shape values are recomputed by the resolver afterwards anyway; transforming them too
 * keeps a transformed template correct on its own.
 */

const RAIL_ROTATE: Readonly<Record<string, string>> = {
  north_south: 'east_west',
  east_west: 'north_south',
  ascending_north: 'ascending_east',
  ascending_east: 'ascending_south',
  ascending_south: 'ascending_west',
  ascending_west: 'ascending_north',
  north_east: 'south_east',
  south_east: 'south_west',
  south_west: 'north_west',
  north_west: 'north_east',
};

const RAIL_MIRROR_X: Readonly<Record<string, string>> = {
  ascending_east: 'ascending_west',
  ascending_west: 'ascending_east',
  north_east: 'north_west',
  north_west: 'north_east',
  south_east: 'south_west',
  south_west: 'south_east',
};

const RAIL_MIRROR_Z: Readonly<Record<string, string>> = {
  ascending_north: 'ascending_south',
  ascending_south: 'ascending_north',
  north_east: 'south_east',
  south_east: 'north_east',
  north_west: 'south_west',
  south_west: 'north_west',
};

const SIDE_KEYS: readonly HorizontalDirection[] = ['north', 'east', 'south', 'west'];

/** Rotates a block state clockwise (seen from above) by `quarterTurns` × 90°. */
export function rotateState(state: string, quarterTurns: number): string {
  const turns = ((quarterTurns % 4) + 4) % 4;
  if (turns === 0 || !state.includes('[')) return state;
  const p = propsOf(state);
  const out: Record<string, string> = { ...p };
  if (p.facing && isHorizontal(p.facing)) out.facing = clockwise(p.facing, turns);
  if (p.axis && p.axis !== 'y' && turns % 2 === 1) out.axis = p.axis === 'x' ? 'z' : 'x';
  if (SIDE_KEYS.every((k) => k in p)) for (const k of SIDE_KEYS) out[clockwise(k, turns)] = p[k]!;
  if (p.shape && p.shape in RAIL_ROTATE) {
    let shape = p.shape;
    for (let i = 0; i < turns; i++) shape = RAIL_ROTATE[shape] ?? shape;
    out.shape = shape;
  }
  return formatBlockState(blockIdOf(state), out);
}

const SWAP_HANDED: Readonly<Record<string, string>> = {
  inner_left: 'inner_right',
  inner_right: 'inner_left',
  outer_left: 'outer_right',
  outer_right: 'outer_left',
};

/** Mirrors a block state across a plane: 'x' swaps east/west, 'z' swaps north/south. */
export function mirrorState(state: string, axis: 'x' | 'z'): string {
  if (!state.includes('[')) return state;
  const p = propsOf(state);
  const out: Record<string, string> = { ...p };
  const swap: Record<string, string> = axis === 'x' ? { east: 'west', west: 'east' } : { north: 'south', south: 'north' };
  if (p.facing && swap[p.facing]) out.facing = swap[p.facing]!;
  if (SIDE_KEYS.every((k) => k in p)) for (const k of SIDE_KEYS) out[swap[k] ?? k] = p[k]!;
  if (p.hinge) out.hinge = p.hinge === 'left' ? 'right' : 'left';
  if (p.shape && SWAP_HANDED[p.shape]) out.shape = SWAP_HANDED[p.shape]!;
  if (p.shape) out.shape = (axis === 'x' ? RAIL_MIRROR_X : RAIL_MIRROR_Z)[out.shape!] ?? out.shape!;
  return formatBlockState(blockIdOf(state), out);
}
